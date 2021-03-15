/*******************************************************************************

    Test API Server Stoa

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    BitField, Block, BlockHeader, Enrollment, Height, Hash, Signature, SodiumHelper,
    Transaction, TxType, TxInput, TxOutput, DataPayload, PublicKey, JSBI
} from 'boa-sdk-ts';
import {
    sample_data,
    sample_data2,
    sample_preImageInfo,
    sample_reEnroll_preImageInfo,
    TestAgora,
    TestStoa,
    TestClient,
    delay,
    createBlock
} from './Utils';

import * as assert from 'assert';
import URI from 'urijs';
import { URL } from 'url';

describe ('Test of Stoa API Server', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();

    before ('Wait for the package libsodium to finish loading', async () =>
    {
        await SodiumHelper.init();
    });

    before ('Start a fake Agora', () =>
    {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", sample_data, resolve);
        });
    });

    before ('Create TestStoa', async () =>
    {
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
    });

    before ('Start TestStoa', async () =>
    {
        await stoa_server.start();
    });

    after ('Stop Stoa and Agora server instances', async () =>
    {
        await stoa_server.stop();
        await agora_server.stop();
    });

    it ('Test of the path /block_externalized', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();
        await client.post(url, {block: sample_data[0]});
        await client.post(url, {block: sample_data[1]});
        // Wait for the block to be stored in the database for the next test.
        await delay(100);
    });

    it ('Test of the path /block_height', async () =>
    {
        let uri = URI(host)
            .port(port)
            .filename("block_height");

        let url = uri.toString();
        let response = await client.get (url);
        assert.strictEqual(response.data, '1');
    });

    it ('Test of the path /validators', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "10");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 6);
        assert.strictEqual(response.data[0].address,
            "GDNODE6ZXW2NNOOQIGN24MBEZRO5226LSMHGQA3MUAMYQSTJVR7XT6GH");
        assert.strictEqual(response.data[0].preimage.distance, null);
    });

    it ('Test of the path /validator', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("validator")
            .filename("GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY")
            .setSearch("height", "10");

        let fail_uri = URI(host)
            .port(port)
            .directory("validator")
            .filename("GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY")
            .setSearch("height", "99");

        await assert.rejects(
            client.get(fail_uri.toString()),
            {statusMessage: "The validator data not found.'address': (GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY), 'height': (99)"}
        );

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].address,
            "GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY");
        assert.strictEqual(response.data[0].preimage.distance, null);
    });

    it ('Tests that sending a pre-image with get /validator and /validators', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("preimage_received");
        let response1 = await client.post (uri.toString(), { preimage: sample_preImageInfo });
        assert.strictEqual(response1.status, 200);

        await delay(200);

        // Wait for the data added to the pool to be processed.
            let uri1 = URI(host)
            .port(port)
            .directory("validator")
            .filename("GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY")
            .setSearch("height", "0");

            let response = await client.get (uri1.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 0);
            assert.strictEqual(response.data[0].preimage.hash,
            "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328");

            let uri2 = URI(host)
                .port(port)
                .directory("validator")
                .filename("GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY")
                .setSearch("height", "6");

            response = await client.get (uri2.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 6);
            assert.strictEqual(response.data[0].preimage.hash,
                "0x790ab7c8f8ddbf012561e70c944c1835fd1a873ca55c973c828164906f8b35b924df7bddcafade688ad92cfb4414b2cf69a02d115dc214bbd00d82167f645e7e");

            let uri3 = URI(host)
                .port(port)
                .directory("validator")
                .filename("GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY")
                .setSearch("height", "1");
            response = await client.get (uri3.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 1);
            assert.strictEqual(response.data[0].preimage.hash,
                "0x314e30482fd0b498361e8537961d875e52b7e82edb8260cd548d3edacb451c80f41dd0ba9c5700adfb646066d41b0031120b65cba2df91def9bd83263fb306bd");

            let uri4 = URI(host)
                .port(port)
                .directory("validator")
                .filename("GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY")
                .setSearch("height", "8");
            response = await client.get (uri4.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, null);
            assert.strictEqual(response.data[0].preimage.hash, new Hash(Buffer.alloc(Hash.Width)).toString());

            let uri5 = URI(host)
                .port(port)
                .directory("validators");
            response = await client.get (uri5.toString());
            let validators: Array<any> = response.data;
            assert.strictEqual(response.data.length, 6);
            let validator = validators.find(n => n.address === "GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY");
            assert.ok(validator !== undefined);
            assert.strictEqual(validator.preimage.distance, 1);
            assert.strictEqual(validator.preimage.hash,
                "0x314e30482fd0b498361e8537961d875e52b7e82edb8260cd548d3edacb451c80f41dd0ba9c5700adfb646066d41b0031120b65cba2df91def9bd83263fb306bd");

            // re-enrollment
            const enroll_sig =
                new Signature("0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8125cf6b04274cc4db34bfd");
            const utxo_key =
                new Hash("0xbf150033f0c3123f0b851c3a97b6cf5335b2bc2f4e9f0c2f3d44b863b10c261614d79f72c2ec0b1180c9135893c3575d4a1e1951a0ba24a1a25bfe8737db0aef");
            const random_seed =
                new Hash("0xe0c04a5bd47ffc5b065b7d397e251016310c43dc77220bf803b73f1183da00b0e67602b1f95cb18a0059aa1cdf2f9adafe979998364b38cd5c15d92b9b8fd815");
            const enrollment = new Enrollment(utxo_key, random_seed, 20, enroll_sig);
            const header = new BlockHeader(
                new Hash(Buffer.alloc(Hash.Width)), new Height("19"), new Hash(Buffer.alloc(Hash.Width)), new BitField([]),
                new Signature(Buffer.alloc(Signature.Width)), [ enrollment ], new Hash(Buffer.alloc(Hash.Width)), [], 0);
            const block = new Block(header, [], []);

            // put the re-enrollment
            await stoa_server.ledger_storage.putEnrollments(block);

            let uri6 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "19");

            response = await client.get (uri6.toString());
            validators = response.data;
            assert.strictEqual(response.data.length, 6);

            validator = validators.find(n => n.address === "GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY");
            assert.ok(validator !== undefined);
            assert.strictEqual(validator.stake, enrollment.utxo_key.toString());
            assert.strictEqual(validator.enrolled_at, "0");

            let uri7 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "20");

            response = await client.get (uri7.toString());
            assert.strictEqual(response.data.length, 1);

            assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            assert.strictEqual(response.data[0].enrolled_at, "19");

            let uri8 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "39");

            response = await client.get (uri8.toString());
            assert.strictEqual(response.data.length, 1);

            assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            assert.strictEqual(response.data[0].enrolled_at, "19");

            let uri9 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "40");

            await assert.rejects(
                client.get(uri9.toString()),
                {statusMessage: "No validator exists for block height."}
            );

        /**
         * To do
         * The preimage_reserved service requires improvement and modification.
         * See Stoa.ts putPreImage(req, res);
         *
        // Wait for the data added to the pool to be processed.
        setTimeout(async () =>
        {
            // push the re-enroll's preImage
            let uri10 = URI(host)
            .port(port)
            .directory("preimage_received");
            let response = await client.post (uri10.toString(), {preimage: sample_reEnroll_preImageInfo});
            assert.strictEqual(response.status, 200);
        }, 200);

        // Wait for the data added to the pool to be processed.
        setTimeout(async () =>
        {
            let uri11 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "21");

            let response = await client.get (uri11.toString());
            assert.strictEqual(response.data.length, 1);
            console.log(response.data);
            assert.strictEqual(response.data[0].preimage.distance, 1);
            assert.strictEqual(response.data[0].preimage.hash, sample_reEnroll_preImageInfo.hash);
        }, 300);
        **/

    });

    it ('Test of the path /wallet/blocks/header', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/blocks/header");

        let response = await client.get (uri.toString())
        assert.strictEqual(response.data.height, '1');
        assert.strictEqual(response.data.hash,
            '0x8fe0ba63553a5c2ac7d91d346894674bea11a706a211817f5b400743ba87d9f' +
            'a31753e008ba6ab970be3b2da29f25732abdc440f934903bfc4a4f12bcf886a7c');
        assert.strictEqual(response.data.merkle_root,
            '0x911890b2ff4429e1beccb4ab5ba7458cc469e8fc455c5df67291ada2c5818cc' +
            '65a3d11220e877b746a284c95294488d4c7e8ed47b02213e3ce74389c442d9cc1');
        assert.strictEqual(response.data.time_stamp, 1596753600);

        uri = URI(host)
            .port(port)
            .directory("/wallet/blocks/header")
            .setSearch("height", "0");

        response = await client.get (uri.toString())
        assert.strictEqual(response.data.height, '0');
        assert.strictEqual(response.data.hash,
            '0x0bf4809ece9fcfa27910c9326e7d1093dee605ffac9cd6591de0dbdb3bf5a83' +
            '44db9917b5c672f26d1fd8ce74df4a87f44b9d18010a6e66fa014c8ad9eeabe98');
        assert.strictEqual(response.data.merkle_root,
            '0xb12632add7615e2c4203f5ec5747c26e4fc7f333f95333ddfa4121a66b84499' +
            'd35e5ce022ab667791549654b97a26e86054b0764ec23ee0cd3830de8f3f73364');
        assert.strictEqual(response.data.time_stamp, 1596153600);
    });

    it ('Test of the path /transaction_received', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("transaction_received");

        let url = uri.toString();
        const block = Block.reviver("", sample_data2);
        await client.post(url, {tx: block.txs[0]})
        await delay(100);
    });

    it ('Test of the path /wallet/transactions/pending/:address', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/pending")
            .filename("GDAGR22X4IWNEO6FHNY3PYUJDXPUCRCKPNGACETAUVGE3GAWVFPS7VUJ");

        let response = await client.get (uri.toString())
        assert.strictEqual(response.data.length, 2);
        assert.strictEqual(response.data[0].tx_hash, '0xcf8e55b5102734' +
            '2537ebbdfc503146033fcd8091054913e78d6a858125f892a24b0734a' +
            'fce7154fdde85688ab1700307b999b2e5a17a724990bb83d3785e89da');
        assert.strictEqual(response.data[0].address, 'GCOMMONBGUXXP4RFCYGEF74JDJVPUW2GUENGTKKJECDNO6AGO32CUWGU');
        assert.strictEqual(response.data[0].amount, '1663400000');
        assert.strictEqual(response.data[0].fee, '0');
        assert.strictEqual(response.data[0].block_delay, 0);
    });

    it ('Test of the path /transaction/status/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction/status")
            .filename("0xcf8e55b51027342537ebbdfc503146033fcd8091054913e78d6a858125f892a24b0734afce7154fdde85688ab1700307b999b2e5a17a724990bb83d3785e89da");

        let response_pending = await client.get(uri.toString());
        let expected_pending = {
            status: 'pending',
            tx_hash: '0xcf8e55b51027342537ebbdfc503146033fcd8091054913e78d6a858125f892a24b0734afce7154fdde85688ab1700307b999b2e5a17a724990bb83d3785e89da'
        }
        assert.deepStrictEqual(response_pending.data, expected_pending);

        uri = URI(host)
            .port(port)
            .directory("/transaction/status")
            .filename("0x535b358337d919474f3043db1f292a1ac44a4f4dbbaa6d89226c7abd96c38bf96018e67828ec539623e475d480af99499368780ae346dfb6cb048b377cbc92d0");

        let response_confirmed = await client.get(uri.toString());
        let expected_confirmed = {
            status: "confirmed",
            tx_hash: "0x535b358337d919474f3043db1f292a1ac44a4f4dbbaa6d89226c7abd96c38bf96018e67828ec539623e475d480af99499368780ae346dfb6cb048b377cbc92d0",
            block: {
                height: 1,
                hash: "0x8fe0ba63553a5c2ac7d91d346894674bea11a706a211817f5b400743ba87d9fa31753e008ba6ab970be3b2da29f25732abdc440f934903bfc4a4f12bcf886a7c"
            }
        };
        assert.deepStrictEqual(response_confirmed.data, expected_confirmed);
    });

    it ('Test of the path /transaction/pending/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction/pending")
            .filename("0xcf8e55b51027342537ebbdfc503146033fcd8091054913e78d6a858125f892a24b0734afce7154fdde85688ab1700307b999b2e5a17a724990bb83d3785e89da");

        let response = await client.get (uri.toString());
        let expected = {
            "type": 0,
            "inputs": [
                {
                    "utxo": "0x831e492f4401df05832b5958e54a7d248b69b7366e1e5723e36da97559a8213ac313ac32526001e4ae72f83f3bb7553d616049838b91f31be1daeab935eee82e",
                    "unlock": {
                        "bytes": "wIfYJe+CcV2OTtmubkl0AFqxH8NKYw/CenZgU7/TRxxNC5XuYEc8N+GIdSzp79lsOI6dqrtMlHvf7nfSyWIrAA=="
                    },
                    "unlock_age": 0
                }
            ],
            "outputs": [
                {
                    "value": "1663400000",
                    "lock": {
                        "type": 0,
                        "bytes": "nMY5oTUvd/IlFgxC/4kaavpbRqEaaalJIIbXeAZ29Co="
                    }
                },
                {
                    "value": "24398336600000",
                    "lock": {
                        "type": 0,
                        "bytes": "0D1r5Jne5i4rQeo0ybJNVjlwfANw6h7vYbVrEy3qXc8="
                    }
                }
            ],
            "payload": "0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff",
            "lock_height": "0"
        };
        assert.deepStrictEqual(expected, response.data);
    });

    it ('Test of the path /transaction/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction")
            .filename("0x535b358337d919474f3043db1f292a1ac44a4f4dbbaa6d89226c7abd96c38bf96018e67828ec539623e475d480af99499368780ae346dfb6cb048b377cbc92d0");

        let response = await client.get (uri.toString());
        let expected = {
            "type": 0,
            "inputs": [
                {
                    "utxo": "0x3909833e3755e875f03032ae8a3af30b40722fc09c52743005e4dcdc617964b8c436ce244cb217a1b34ceddad4378c8ea7311739ba15e5a6c427e6a371acc173",
                    "unlock": {
                        "bytes": "gjO50AaHWccrKwYprzeYKoJwDQoNNKoC4U4CHImmtyjAHFw4LA0/VLZ9519HtcRQ8mW9K6a/rHhQmMRKnUWMAQ=="
                    },
                    "unlock_age": 0
                }
            ],
            "outputs": [
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGjrV+Is0jvFO3G34okd30FESntMARJgpUxNmBapXy8="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGlrT6zKPO3AY0LQTqA3ms5aIoLsLLr6YZxfZrN/BSg="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGnrXnkyzT35mFen3/nqGNzT5svngjvOzd0nPmp48z8="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGprVwVfsXegFnyoVOJ8NxRVKo6Ax90/tCJlnWPocnE="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGrrWiwuetWzdbkJuFubVLDvjIG2Tvf2lDotIbo+Jmc="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGtrT1owyvl3vVOM97cAf7hltS63C3RPXEHV6ywb+pk="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGvrTYjTUR3sebormKmd13CgwNR8zS2cIQpz2sO8FDw="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGxrQsxC6ombUfbuZhXYChQ5f46XwKlSC/8D6f/ypVw="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGzrVKDyZFQE6f1aPlcoVU+RNNoFb8T7TkaGCRHPhtI="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHBrVjAvEqU7dm5AtE3Uox39TBx2nEGCLMIkZ1Xd4Uk="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHDrVgxbWlsCtUZoAqS9AGhNSjeCL9H2s3e9MeWCiwI="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHFrTSziv5rQMyz9yfQv2wLfzNDuyjuGQxoWj7si2EM="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHHrSfy5aeBzHAmyG3I3DZeW3wP3mC1okuPIuxjaszY="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHJrSoE54aAlhbQLmcPFLOk9fDfEzfbBaP+OoPd8pl0="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHLrSdeJEF0X5T1pUkSB+OWOCW9INnrSMISEndtylk0="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHNrTFrOd+j3EJi+57NgxKoJ7J3l1vx0cEee/LWD55c="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHPrVzsBsCF1rHGV2p6L92Q1HsaYAjnbpEw7t4QvE3M="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHRrXM8RrndOyNLLtNcuiKAiDDQuTMSr6X3iYAOHpaA="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHTrRIB3PHtY+F6zaxBzfrhce7YYsGN+PgOCxLRlTCI="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHVrSXW2MO24NZb5jWmDzfkk0LRhO04O06Pq3rTc6Xo="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHXrQU4rpleVE2aYwa6oOH3ZT3vzHTJQDREip9eSguI="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHZrR5nE94DsZIqjMkWebdCcpnKWVYrSlEl6K0DuviM="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHbrVGymRp87UbYbPN9GkgACniCge/RD2FA+N2bqsgI="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHdrXb8NxrKxXd3gy7mn5wli/+Y2KtHRiNzGIFsK4j4="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHfrSQ/MofR+HHmqtrgsriOnQQGwb3U16HbFnTtGhoc="
                    }
                }
            ],
            "payload": "",
            "lock_height": "0"
        };
        assert.deepStrictEqual(response.data, expected);
    });
});

describe ('Test of the path /utxo', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();

    before ('Wait for the package libsodium to finish loading', async () =>
    {
        await SodiumHelper.init();
    });

    before('Start a fake Agora', () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before ('Create TestStoa', async () =>
    {
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
    });

    before ('Start TestStoa', async () =>
    {
        await stoa_server.start();
    });

    after('Stop Stoa and Agora server instances', async () => {
        await stoa_server.stop();
        await agora_server.stop();
    });

    it ('Store two blocks', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();
        await client.post(url, {block: sample_data[0]});
        await client.post(url, {block: sample_data[1]});
        // Wait for the block to be stored in the database for the next test.
        await delay(100);
    });

    it ('Test of the path /utxo no pending transaction ', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("GDAGR22X4IWNEO6FHNY3PYUJDXPUCRCKPNGACETAUVGE3GAWVFPS7VUJ");

        let response = await client.get (uri.toString());
        let expected = [
            {
                type: 0,
                utxo: '0x831e492f4401df05832b5958e54a7d248b69b7366e1e5723e36da97559a8213ac313ac32526001e4ae72f83f3bb7553d616049838b91f31be1daeab935eee82e',
                amount: '24400000000000',
                height: '1',
                lock_bytes: "wGjrV+Is0jvFO3G34okd30FESntMARJgpUxNmBapXy8=",
                lock_type: 0,
                time: 1596753600,
                unlock_height: '2'
            }];
        assert.deepStrictEqual(response.data, expected);
    });

    it ('Store one pending transaction', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("transaction_received");

        let url = uri.toString();
        await client.post(url, { tx: Block.reviver("", sample_data2).txs[0] });
        await delay(100);
    });

    it ('Test of the path /utxo with pending transaction ', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("GDAGR22X4IWNEO6FHNY3PYUJDXPUCRCKPNGACETAUVGE3GAWVFPS7VUJ");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 0);
    });

    it ('Test getting fees of the transaction', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("transaction/fees")
            .filename("1000");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.medium, "200000");
        assert.strictEqual(response.data.low, "180000");
        assert.strictEqual(response.data.high, "220000");
    });
});

describe ('Test of the path /utxo for freezing', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();

    let blocks: Array<Block> = [];
    blocks.push(Block.reviver("", sample_data[0]));
    blocks.push(Block.reviver("", sample_data[1]));

    before ('Wait for the package libsodium to finish loading', async () =>
    {
        await SodiumHelper.init();
    });

    before('Start a fake Agora', () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before ('Create TestStoa', async () =>
    {
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
    });

    before ('Start TestStoa', async () =>
    {
        await stoa_server.start();
    });

    after('Stop Stoa and Agora server instances', async () => {
        await stoa_server.stop();
        await agora_server.stop();
    });

    it ('Store two blocks', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();
        await client.post(url, {block: sample_data[0]});
        await client.post(url, {block: sample_data[1]});
        // Wait for the block to be stored in the database for the next test.
        await delay(100);
    });

    it ('Create a block with a freeze transaction', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("GDAGR22X4IWNEO6FHNY3PYUJDXPUCRCKPNGACETAUVGE3GAWVFPS7VUJ");

        let response = await client.get (uri.toString());

        //  First Transaction
        //  Refund amount is      10,000 BOA
        //  Freezing amount is 2,430,000 BOA
        let tx1 = new Transaction(
            TxType.Freeze,
            [
                new TxInput(new Hash(response.data[0].utxo))
            ],
            [
                new TxOutput(JSBI.BigInt(  "100000000000"), new PublicKey("GDAGR22X4IWNEO6FHNY3PYUJDXPUCRCKPNGACETAUVGE3GAWVFPS7VUJ")),
                new TxOutput(JSBI.BigInt("24300000000000"), new PublicKey("GDAGR22X4IWNEO6FHNY3PYUJDXPUCRCKPNGACETAUVGE3GAWVFPS7VUJ"))
            ],
            DataPayload.init
        );

        uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("GDAGS22PVTFDZ3OAMNBNATVAG6NM4WRCQLWCZOX2MGOF6ZVTP4CSR62B");

        response = await client.get (uri.toString());

        //  Second Transaction
        //  Refund amount is      40,000 BOA
        //  Freezing amount is 2,400,000 BOA
        let tx2 = new Transaction(
            TxType.Freeze,
            [
                new TxInput(new Hash(response.data[0].utxo))
            ],
            [
                new TxOutput(JSBI.BigInt(  "400000000000"), new PublicKey("GDAGS22PVTFDZ3OAMNBNATVAG6NM4WRCQLWCZOX2MGOF6ZVTP4CSR62B")),
                new TxOutput(JSBI.BigInt("24000000000000"), new PublicKey("GDAGS22PVTFDZ3OAMNBNATVAG6NM4WRCQLWCZOX2MGOF6ZVTP4CSR62B"))
            ],
            DataPayload.init
        );

        // Create block with two transactions
        blocks.push(createBlock(blocks[1], [tx1, tx2]));
        uri = URI(host)
            .port(port)
            .directory("block_externalized");
        await client.post(uri.toString(), {block: blocks[2]});
        await delay(100);
    });

    it ('Check the height of the block', async () => {
        let uri = URI(host)
            .port(port)
            .filename("block_height");

        let url = uri.toString();
        let response = await client.get(url);
        assert.strictEqual(response.data, '2');
    });

    it ('Check the UTXO included in the freeze transaction, when refund amount less then 40,000 BOA', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("GDAGR22X4IWNEO6FHNY3PYUJDXPUCRCKPNGACETAUVGE3GAWVFPS7VUJ");

        let response = await client.get (uri.toString());
        let utxo_array: Array<any> = response.data;
        assert.strictEqual(utxo_array.length, 2);

        let freeze_utxo = utxo_array.find(m => (m.amount === "24300000000000"));
        assert.strictEqual(freeze_utxo.type, TxType.Freeze);

        // It was not frozen because the amount of the refund was less than 40,000 BOA.
        let refund_utxo = utxo_array.find(m => (m.amount === "100000000000"));
        assert.strictEqual(refund_utxo.type, TxType.Payment);
    });

    it ('Check the UTXO included in the freeze transaction, when refund amount greater or equal then 40,000 BOA', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("GDAGS22PVTFDZ3OAMNBNATVAG6NM4WRCQLWCZOX2MGOF6ZVTP4CSR62B");

        let response = await client.get(uri.toString());
        let utxo_array: Array<any> = response.data;
        assert.strictEqual(utxo_array.length, 2);

        let freeze_utxo = utxo_array.find(m => (m.amount === "24000000000000"));
        assert.strictEqual(freeze_utxo.type, TxType.Freeze);

        // It was frozen because the amount of the refund was larger than 40,000 BOA.
        let refund_utxo = utxo_array.find(m => (m.amount === "400000000000"));
        assert.strictEqual(refund_utxo.type, TxType.Freeze);
    });
});
