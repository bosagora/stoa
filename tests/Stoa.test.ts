/*******************************************************************************

    Test API Server Stoa

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
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

import { AgoraClient } from '../src/modules/agora/AgoraClient';
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
            "boa1xrdwry6fpk7a57k4gwyj3mwnf59w808nygtuxsgdrpmv4p7ua2hqx78z5en");
        assert.strictEqual(response.data[0].preimage.distance, null);
    });

    it ('Test of the path /validator', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("validator")
            .filename("boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp")
            .setSearch("height", "10");

        let fail_uri = URI(host)
            .port(port)
            .directory("validator")
            .filename("boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp")
            .setSearch("height", "99");

        await assert.rejects(
            client.get(fail_uri.toString()),
            {statusMessage: "The validator data not found.'address': (boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp), 'height': (99)"}
        );

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].address,
            "boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp");
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
            .filename("boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp")
            .setSearch("height", "0");

            let response = await client.get (uri1.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 0);
            assert.strictEqual(response.data[0].preimage.hash,
            "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328");

            let uri2 = URI(host)
                .port(port)
                .directory("validator")
                .filename("boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp")
                .setSearch("height", "6");

            response = await client.get (uri2.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 6);
            assert.strictEqual(response.data[0].preimage.hash,
                "0x790ab7c8f8ddbf012561e70c944c1835fd1a873ca55c973c828164906f8b35b924df7bddcafade688ad92cfb4414b2cf69a02d115dc214bbd00d82167f645e7e");

            let uri3 = URI(host)
                .port(port)
                .directory("validator")
                .filename("boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp")
                .setSearch("height", "1");
            response = await client.get (uri3.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 1);
            assert.strictEqual(response.data[0].preimage.hash,
                "0x314e30482fd0b498361e8537961d875e52b7e82edb8260cd548d3edacb451c80f41dd0ba9c5700adfb646066d41b0031120b65cba2df91def9bd83263fb306bd");

            let uri4 = URI(host)
                .port(port)
                .directory("validator")
                .filename("boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp")
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
            let validator = validators.find(n => n.address === "boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp");
            assert.ok(validator !== undefined);
            assert.strictEqual(validator.preimage.distance, 1);
            assert.strictEqual(validator.preimage.hash,
                "0x314e30482fd0b498361e8537961d875e52b7e82edb8260cd548d3edacb451c80f41dd0ba9c5700adfb646066d41b0031120b65cba2df91def9bd83263fb306bd");

            // re-enrollment
            const enroll_sig =
                new Signature("0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8125cf6b04274cc4db34bfd");
            const utxo_key =
                new Hash("0x6100ee7a7e00e18e06b743a7ae90e91781c09e0f1791ee2849ce15caf4c6ee1f3aebc23768f98153d8e3fb10ac66267e06acc31dccbfdbe671294a7fded22432");
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

            validator = validators.find(n => n.address === "boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp");
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
            '0xc4d0f4a5734c90e13b90635aeca16b06accfad3161fc77207b5d7cb21d4a428' +
            '6da3f033fa4692091880e6b0b1b1a4253f69fa372e3492a987253dc203e62e4b8');
        assert.strictEqual(response.data.merkle_root,
            '0x1d3d908cb9bab19fcb6ac006b6eff772969a1b822cb0acbe9cadabce8b9fcb3' +
            '34f2d3867239a80da7a3172193589469e4fe1fb9bbf472b82709ffa50f7cc46cd');
        assert.strictEqual(response.data.time_stamp, 1609459800);

        uri = URI(host)
            .port(port)
            .directory("/wallet/blocks/header")
            .setSearch("height", "0");

        response = await client.get (uri.toString())
        assert.strictEqual(response.data.height, '0');
        assert.strictEqual(response.data.hash,
            '0xe2357870cef6f690c5672293aba4e910dc3e120ab83cbfff24cf6b824af0588' +
            'caa294900abdd46f3453229dea8680343e89f7ef06f47a2db1ec2a214553f4281');
        assert.strictEqual(response.data.merkle_root,
            '0x0d453b87856c9faaf75cfac3dc993cd75c34fc1d5329d3c38e8b4757586fd54' +
            '40cd9ed466f7c2259e5af4f8fe7f45cb997504542efd56d6bd7853fa9596d6bc2');
        assert.strictEqual(response.data.time_stamp, 1609459200);
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
            .filename("boa1xrqx366yn8xktzhtsj83gj0nnj35cv8lrk7xhszj0dfemlacumgujs595mr");

        let response = await client.get (uri.toString())
        assert.strictEqual(response.data.length, 2);
        assert.strictEqual(response.data[0].tx_hash,
            '0x5faca8a9851cf3a6229c9b7998d26cacb26a2483efa209aaf94ce95d34ca93e' +
            'fa24f4d9d0c00bf158f43c597facb2aa71c725a670332cc3608bd470ec6420edc');
        assert.strictEqual(response.data[0].address, 'boa1xrgr66gdm5je646x70l5ar6qkhun0hg3yy2eh7tf8xxlmlt9fgjd2q0uj8p');
        assert.strictEqual(response.data[0].amount, '24398336600000');
        assert.strictEqual(response.data[0].fee, '0');
        assert.strictEqual(response.data[0].block_delay, 0);
    });

    it ('Test of the path /transaction/status/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction/status")
            .filename("0x5faca8a9851cf3a6229c9b7998d26cacb26a2483efa209aaf94ce95d34ca93efa24f4d9d0c00bf158f43c597facb2aa71c725a670332cc3608bd470ec6420edc");

        let response_pending = await client.get(uri.toString());
        let expected_pending = {
            status: 'pending',
            tx_hash: '0x5faca8a9851cf3a6229c9b7998d26cacb26a2483efa209aaf94ce95d34ca93efa24f4d9d0c00bf158f43c597facb2aa71c725a670332cc3608bd470ec6420edc'
        }
        assert.deepStrictEqual(response_pending.data, expected_pending);

        uri = URI(host)
            .port(port)
            .directory("/transaction/status")
            .filename("0xbbcdd3a1fe3c8942ad1523068d3cdf0fb0e29a50f96e89a1e75efc42654835552a4fe6d15648a1cb48b4ab376270374579d32a1b167df4334f668289e61e85ef");

        let response_confirmed = await client.get(uri.toString());
        let expected_confirmed = {
            status: "confirmed",
            tx_hash: "0xbbcdd3a1fe3c8942ad1523068d3cdf0fb0e29a50f96e89a1e75efc42654835552a4fe6d15648a1cb48b4ab376270374579d32a1b167df4334f668289e61e85ef",
            block: {
                height: 1,
                hash: "0xc4d0f4a5734c90e13b90635aeca16b06accfad3161fc77207b5d7cb21d4a4286da3f033fa4692091880e6b0b1b1a4253f69fa372e3492a987253dc203e62e4b8"
            }
        };
        assert.deepStrictEqual(response_confirmed.data, expected_confirmed);
    });

    it ('Test of the path /transaction/pending/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction/pending")
            .filename("0x5faca8a9851cf3a6229c9b7998d26cacb26a2483efa209aaf94ce95d34ca93efa24f4d9d0c00bf158f43c597facb2aa71c725a670332cc3608bd470ec6420edc");

        let response = await client.get (uri.toString());
        let expected = {
            "type": 0,
            "inputs": [
                {
                    "utxo": "0x79170f924260def767d30e9eb606379c59b26ab5b575097f760507e889ba097e458a19aead724e10cf15313a1da7094c5c7e708c12e91a58f1f922bd6a5da0a5",
                    "unlock": {
                        "bytes": "NdOAVgrduZXM4DZrhCz3/g5H9UJtQcIpd+kj6pVJ0KlxyFfuDj6Cp7bSP14qJ1dO9RpsBG7MqbRoS+6rYKHbAg=="
                    },
                    "unlock_age": 0
                }
            ],
            "outputs": [
                {
                    "value": "1663400000",
                    "lock": {
                        "type": 0,
                        "bytes": "xOYx2v6aWx69nACIFINcMrCytXJmcWy99/N+ZlGEIWM="
                    }
                },
                {
                    "value": "24398336600000",
                    "lock": {
                        "type": 0,
                        "bytes": "0D1pDd0lnVdG8/9Oj0C1+TfdESEVm/lpOY39/WVKJNU="
                    }
                }
            ],
            "payload": "0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff",
            "lock_height": "0"
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it ('Test of the path /transaction/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction")
            .filename("0xbbcdd3a1fe3c8942ad1523068d3cdf0fb0e29a50f96e89a1e75efc42654835552a4fe6d15648a1cb48b4ab376270374579d32a1b167df4334f668289e61e85ef");

        let response = await client.get (uri.toString());
        let expected = {
            "type": 0,
            "inputs": [
                {
                    "utxo": "0x0db044a4bd0df5e6e31ddc2b5878b0da5c4c651a1efb74747254823107ce8f420f2fe9a53a7bc547974f7d4b7b2413a0d5d574862420294102ef426e775f83ef",
                    "unlock": {
                        "bytes": "0fRuFuz34sG1TQvLXONVDjUvQ8FPCzR88uWgp1vvNPkR51NZWEU7kHeqsqwNCYMkexUyx/519fLjdGJlUngECw=="
                    },
                    "unlock_age": 0
                }
            ],
            "outputs": [
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGjrRJnNZYrrhI8USfOco0ww/x28a8BSe1Od/7jm0ck="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGlrWqlGoU9MQUB3prLJ5qodlJE71cStwPMgOfCQF88="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGnrUsPwhONyTthG3B9Fma7hSQcLdjdyoVE/TZfR3vM="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGprRx3N5zamxgowEcce7NjUVvg6Fzv69pqMasf1s90="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGrrS9h77jSNyovwURQqsd9pYD5H8k2qKew9dgTgHBE="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGtrR30uw7pjLZBFxqcug7JxaFgc3E+J1JK695XsKbo="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGvrS/fbcHPDPdK8bQqfwQJbsxhhGgHNddf0ZaHeBz8="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGxrX4Lrf3VRCr/uVmNeTxL3XsoPZbzikfIBlrOxWPM="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wGzrVr7AhXpk/Kt9i7ugbNkafe7rO+Q2Deqc+rcEcxE="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHBrV2j/6od9XCuzR+iLcShjy2heW6FsLmyuuVVeCqY="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHDrVwHJFzCbGU0dj4NCb+VN5zyDCOMz/60Ix6TdNNM="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHFrVTSm3Y5qjJJVytL33eZPEj3/AX/qqQFk19qplYk="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHHrVk01Z83OmTipdReCQHznwBnx4Gq0Hef+OCurST0="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHJrUPh22DnCj57JSE5J76Y9pgIDJ1ndwTQIhKlKSto="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHLrWwjKZ6ltVjIRslnqv3Z/H4w+2jzjwilZDxj4cPs="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHNrTn7xHDTc/7Z38ExANbk0GxAWwxRfD67iuR05dTs="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHPrUL9XFGZiFEh+8TZSN2r8Qhdgo4uvZSGpfSFgMs4="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHRrRkN0rCu7soCou/draapYwRdbv25tvp3OkHyt7so="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHTrR8mOre/mL3d0eatso4i0uIv3sRC9aZcwZsg2DJs="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHVrUSmlC/RcC6j3J6LsJnIWk5EK5WKYlBEiDWGXAC0="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHXrWdJNnhuUr/m2iP+sjo/8ONpUzuzkbAm5M7Bd5+c="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHZrQidEWjiE1C8dj8MSzvIAhR28JI56RU0yI2WG75U="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHbrWPkA+u4mOKsGwnOwydjpj3BE5CRxQCcWt/09Cec="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHdrQNUsHL9NM0fNfqQu95dMTu65sDUYFkS1G5mp6Gs="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "wHfrR7XwBCK1GWWLu4fkULHa9qOEaoVtm/n5oHk3x88="
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
            .filename("boa1xrqx366yn8xktzhtsj83gj0nnj35cv8lrk7xhszj0dfemlacumgujs595mr");

        let response = await client.get (uri.toString());
        let expected = [
            {
                type: 0,
                utxo: '0x79170f924260def767d30e9eb606379c59b26ab5b575097f760507e889ba097e458a19aead724e10cf15313a1da7094c5c7e708c12e91a58f1f922bd6a5da0a5',
                amount: '24400000000000',
                height: '1',
                lock_bytes: "wGjrRJnNZYrrhI8USfOco0ww/x28a8BSe1Od/7jm0ck=",
                lock_type: 0,
                time: 1609459800,
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
            .filename("boa1xrqx366yn8xktzhtsj83gj0nnj35cv8lrk7xhszj0dfemlacumgujs595mr");

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
            .filename("boa1xrqx366yn8xktzhtsj83gj0nnj35cv8lrk7xhszj0dfemlacumgujs595mr");

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
                new TxOutput(JSBI.BigInt(  "100000000000"), new PublicKey("boa1xrqx366yn8xktzhtsj83gj0nnj35cv8lrk7xhszj0dfemlacumgujs595mr")),
                new TxOutput(JSBI.BigInt("24300000000000"), new PublicKey("boa1xrqx366yn8xktzhtsj83gj0nnj35cv8lrk7xhszj0dfemlacumgujs595mr"))
            ],
            DataPayload.init
        );

        uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("boa1xrqxj66649r2zn6vg9q80f4je8n258v5jyaat39dcrejqw0sjqtu7xfsxn9");

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
                new TxOutput(JSBI.BigInt(  "400000000000"), new PublicKey("boa1xrqxj66649r2zn6vg9q80f4je8n258v5jyaat39dcrejqw0sjqtu7xfsxn9")),
                new TxOutput(JSBI.BigInt("24000000000000"), new PublicKey("boa1xrqxj66649r2zn6vg9q80f4je8n258v5jyaat39dcrejqw0sjqtu7xfsxn9"))
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
            .filename("boa1xrqx366yn8xktzhtsj83gj0nnj35cv8lrk7xhszj0dfemlacumgujs595mr");

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
            .filename("boa1xrqxj66649r2zn6vg9q80f4je8n258v5jyaat39dcrejqw0sjqtu7xfsxn9");

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

describe ('Test of the path /merkle_path', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let agora_host: string = 'http://localhost';
    let agora_port: string = '2826';
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
            agora_server = new TestAgora(agora_port, sample_data, resolve);
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

    it ('Test of the path /merkle_path', async () =>
    {
        let uri = URI(agora_host)
            .port(agora_port)
            .directory("merkle_path")
            .setSearch("block_height", "1")
            .setSearch("hash", "0xbbcdd3a1fe3c8942ad1523068d3cdf0fb0e29a50f96e89a1e75efc42654835552a4fe6d15648a1cb48b4ab376270374579d32a1b167df4334f668289e61e85ef");

        let response = await client.get(uri.toString());

        let expected =
            [
                "0x161c713d23d71a0cf54f35b5fe5fb7423aefbd11de4ece83efde37ed1a0bc5d25a6c25a3535c2e4e35993b56120fbd0e021500e2111c7bee22162f487a5c633e",
                "0xd4adadb3d59cb56ba050efd03c5c06243158242fd19a5d2481f6f6d75bd9702bb57ed023035f070e993de7a01f0537bb6a0da75a652184474ed1b966bb93c6ef",
                "0xc7cb35254606aad46756d1cf297242c42965a1849b1eb70c408d30c6568f438de604c069cea2751229ee34002d60d2cb4a17724d5bff3ab86b66ce79db7c3889",
            ];

        assert.deepStrictEqual(response.data, expected);
    });

    it ('Test of the path /merkle_path by AgoraClient', async () =>
    {
        const agora_addr: URL = new URL('http://localhost:2826');
        let agora_client = new AgoraClient(agora_addr);
        let merkle_path: Array<Hash> = await agora_client.getMerklePath(new Height("1"),
            new Hash("0xbbcdd3a1fe3c8942ad1523068d3cdf0fb0e29a50f96e89a1e75efc42654835552a4fe6d15648a1cb48b4ab376270374579d32a1b167df4334f668289e61e85ef"))

        let expected =
            [
                new Hash("0x161c713d23d71a0cf54f35b5fe5fb7423aefbd11de4ece83efde37ed1a0bc5d25a6c25a3535c2e4e35993b56120fbd0e021500e2111c7bee22162f487a5c633e"),
                new Hash("0xd4adadb3d59cb56ba050efd03c5c06243158242fd19a5d2481f6f6d75bd9702bb57ed023035f070e993de7a01f0537bb6a0da75a652184474ed1b966bb93c6ef"),
                new Hash("0xc7cb35254606aad46756d1cf297242c42965a1849b1eb70c408d30c6568f438de604c069cea2751229ee34002d60d2cb4a17724d5bff3ab86b66ce79db7c3889"),
            ];

        assert.deepStrictEqual(merkle_path, expected);
    });

    it ('Test of the path /spv with a Merkle path transaction', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("spv")
            .filename("0xbbcdd3a1fe3c8942ad1523068d3cdf0fb0e29a50f96e89a1e75efc42654835552a4fe6d15648a1cb48b4ab376270374579d32a1b167df4334f668289e61e85ef");

        let response = await client.get(uri.toString());

        let expected = {
            result: true,
            message: "Success"
        }

        assert.deepStrictEqual(response.data, expected);
    })

    it ('Test of the path /spv with a non-Merkle path transaction', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("spv")
            .filename("0x161c713d23d71a0cf54f35b5fe5fb7423aefbd11de4ece83efde37ed1a0bc5d25a6c25a3535c2e4e35993b56120fbd0e021500e2111c7bee22162f487a5c633e");

        let response = await client.get(uri.toString());

        let expected = {
            result: false,
            message: "Verification failed"
        }

        assert.deepStrictEqual(response.data, expected);
    })

    it ('Test of the path /spv with an invalid transaction ', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("spv")
            .filename("0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000");

        let response = await client.get(uri.toString());

        let expected = {
            result: false,
            message: "Transaction does not exist in block"
        }

        assert.deepStrictEqual(response.data, expected);
    })
});
