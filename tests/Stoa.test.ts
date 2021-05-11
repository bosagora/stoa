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
import { IDatabaseConfig } from '../src/modules/common/Config';
import { MockDBConfig } from "./TestConfig"
import { BOASodium } from 'boa-sodium-ts';

describe ('Test of Stoa API Server', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();
    let testDBConfig : IDatabaseConfig;

    before ('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
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
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
    });

    before ('Start TestStoa', async () =>
    {
        await stoa_server.start();
    });

    after ('Stop Stoa and Agora server instances', async () =>
    {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
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
            "boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn");
        assert.strictEqual(response.data[0].preimage.height, '');
    });

    it ('Test of the path /validator', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("validator")
            .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
            .setSearch("height", "10");

        let fail_uri = URI(host)
            .port(port)
            .directory("validator")
            .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
            .setSearch("height", "99");

        await assert.rejects(
            client.get(fail_uri.toString()),
            {statusMessage: "The validator data not found.'address': (boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku), 'height': (99)"}
        );

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].address,
            "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku");
        assert.strictEqual(response.data[0].preimage.height, '');
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
            .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
            .setSearch("height", "0");

            let response = await client.get (uri1.toString());
           
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.height, '0');
            assert.strictEqual(response.data[0].preimage.hash,
            "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328");

            let uri2 = URI(host)
                .port(port)
                .directory("validator")
                .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
                .setSearch("height", "6");

            response = await client.get (uri2.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.height, '6');
            assert.strictEqual(response.data[0].preimage.hash,
                "0x790ab7c8f8ddbf012561e70c944c1835fd1a873ca55c973c828164906f8b35b924df7bddcafade688ad92cfb4414b2cf69a02d115dc214bbd00d82167f645e7e");

            let uri3 = URI(host)
                .port(port)
                .directory("validator")
                .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
                .setSearch("height", "1");
            response = await client.get (uri3.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.height, '1');
            assert.strictEqual(response.data[0].preimage.hash,
                "0x314e30482fd0b498361e8537961d875e52b7e82edb8260cd548d3edacb451c80f41dd0ba9c5700adfb646066d41b0031120b65cba2df91def9bd83263fb306bd");

            let uri4 = URI(host)
                .port(port)
                .directory("validator")
                .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
                .setSearch("height", "8");
            response = await client.get (uri4.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.height, '');
            assert.strictEqual(response.data[0].preimage.hash, new Hash(Buffer.alloc(Hash.Width)).toString());

            let uri5 = URI(host)
                .port(port)
                .directory("validators");
            response = await client.get (uri5.toString());
            let validators: Array<any> = response.data;
            assert.strictEqual(response.data.length, 6);
            let validator = validators.find(n => n.address === "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku");
            assert.ok(validator !== undefined);
            assert.strictEqual(validator.preimage.height, '1');
            assert.strictEqual(validator.preimage.hash,
                "0x314e30482fd0b498361e8537961d875e52b7e82edb8260cd548d3edacb451c80f41dd0ba9c5700adfb646066d41b0031120b65cba2df91def9bd83263fb306bd");

            // re-enrollment
            const enroll_sig =
                new Signature("0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8125cf6b04274cc4db34bfd");
            const utxo_key =
                new Hash("0x2f8b231aa4fd35c6a5c68a97fed32120da48cf6d40ccffc93d8dc41a3016eb56434b2c44144a38efe459f98ddc2660b168f1c92a48fe65711173385fb4a269e1");
            const commitment =
                new Hash("0xe0c04a5bd47ffc5b065b7d397e251016310c43dc77220bf803b73f1183da00b0e67602b1f95cb18a0059aa1cdf2f9adafe979998364b38cd5c15d92b9b8fd815");
            const enrollment = new Enrollment(utxo_key, commitment, 20, enroll_sig);
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

            validator = validators.find(n => n.address === "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku");
            assert.ok(validator !== undefined);
            assert.strictEqual(validator.stake, enrollment.utxo_key.toString());
            assert.strictEqual(validator.enrolled_at, "19");

            // let uri7 = URI(host)
            // .port(port)
            // .directory("validators")
            // .setSearch("height", "20");

            // response = await client.get(uri7.toString());
            // console.log(response);
            // assert.strictEqual(response.data.length, 1);

            // assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            // assert.strictEqual(response.data[0].enrolled_at, "19");

            // let uri8 = URI(host)
            // .port(port)
            // .directory("validators")
            // .setSearch("height", "39");

            // response = await client.get (uri8.toString());
            // assert.strictEqual(response.data.length, 1);

            // assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            // assert.strictEqual(response.data[0].enrolled_at, "19");

            // let uri9 = URI(host)
            // .port(port)
            // .directory("validators")
            // .setSearch("height", "40");

            // await assert.rejects(
            //     client.get(uri9.toString()),
            //     {statusMessage: "No validator exists for block height."}
            // );

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
            assert.strictEqual(response.data[0].preimage.height, 1);
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
            '0xe0609c900848dffd7bbf7112301b4a3ce47fc9ea4810bb7ce6d4ad4d9f0f0ad' +
            '18c324b822127f3564f33efee8228662e02755ea49452f6a5832447e5cf495a8f');
        assert.strictEqual(response.data.merkle_root,
            '0x928f5789a97f75dff9aa070cb761d2ae70c6566556739509b495c2d7b899181' +
            '119d31f37160212f7ea38358eb671520595178a8aad17f12e00f4119d0b662888');
        assert.strictEqual(response.data.time_stamp, 1609459800);

        uri = URI(host)
            .port(port)
            .directory("/wallet/blocks/header")
            .setSearch("height", "0");

        response = await client.get (uri.toString())
        assert.strictEqual(response.data.height, '0');
        assert.strictEqual(response.data.hash,
            '0x8ea91eafb2555f93ce0b0335d8454cdd052646dd1ef4a9029f026d08cdd081b' +
            '9fb3e736903a119cce4beec1814b05c29b70243e0d1bbc096cf99c90b93f0b9a2');
        assert.strictEqual(response.data.merkle_root,
            '0x94747147a0ca093d1099d1b2e0d9e2de9d89e0b887a56ffafb17f473cd0317d' +
            'e36ab7ecd2bdc1148d542bce9501aa1b978c722822a281e45034088286700059e');
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
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

        let response = await client.get (uri.toString())
        assert.strictEqual(response.data.length, 2);
        assert.strictEqual(response.data[0].tx_hash,
<<<<<<< HEAD
            '0x5faca8a9851cf3a6229c9b7998d26cacb26a2483efa209aaf94ce95d34ca93e' +
            'fa24f4d9d0c00bf158f43c597facb2aa71c725a670332cc3608bd470ec6420edc');
        assert.strictEqual(response.data[0].address, 'boa1xrzwvvw6l6d9k84ansqgs9yrtsetpv44wfn8zm9a7lehuej3ssskxth867s');
=======
            '0xa2073ce83b58f87d3c684bd62c1d037531edd85f7ed11d006f97af95ca65f8a' +
            'e2ed8cf10f5843c8cc3f4295b787f1413acc92f449d42a587df608f5ef6d1fb7f');
        assert.strictEqual(response.data[0].address, 'boa1xqcmmns5swnm03zay5wjplgupe65uw4w0dafzsdsqtwq6gv3h3lcz24a8ch');
>>>>>>> Change sample data according to a well-known key change.
        assert.strictEqual(response.data[0].amount, '1663400000');
        assert.strictEqual(response.data[0].fee, '0');
        assert.strictEqual(response.data[0].block_delay, 0);
    });

    it ('Test of the path /transaction/status/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction/status")
            .filename("0xa2073ce83b58f87d3c684bd62c1d037531edd85f7ed11d006f97af95ca65f8ae2ed8cf10f5843c8cc3f4295b787f1413acc92f449d42a587df608f5ef6d1fb7f");

        let response_pending = await client.get(uri.toString());
        let expected_pending = {
            status: 'pending',
            tx_hash: '0xa2073ce83b58f87d3c684bd62c1d037531edd85f7ed11d006f97af95ca65f8ae2ed8cf10f5843c8cc3f4295b787f1413acc92f449d42a587df608f5ef6d1fb7f'
        }
        assert.deepStrictEqual(response_pending.data, expected_pending);

        uri = URI(host)
            .port(port)
            .directory("/transaction/status")
            .filename("0x74c2caf013ffd47440c46536403c1116dbf5276ee736a82db7e2cd9a5b827f7f24dca30951983e0aba92b8d5b813254b447616d2d060845fa0eca3d6b46a09b2");

        let response_confirmed = await client.get(uri.toString());
        let expected_confirmed = {
            status: "confirmed",
            tx_hash: "0x74c2caf013ffd47440c46536403c1116dbf5276ee736a82db7e2cd9a5b827f7f24dca30951983e0aba92b8d5b813254b447616d2d060845fa0eca3d6b46a09b2",
            block: {
                height: 1,
                hash: "0xe0609c900848dffd7bbf7112301b4a3ce47fc9ea4810bb7ce6d4ad4d9f0f0ad18c324b822127f3564f33efee8228662e02755ea49452f6a5832447e5cf495a8f"
            }
        };
        assert.deepStrictEqual(response_confirmed.data, expected_confirmed);
    });

    it ('Test of the path /transaction/pending/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction/pending")
            .filename("0xa2073ce83b58f87d3c684bd62c1d037531edd85f7ed11d006f97af95ca65f8ae2ed8cf10f5843c8cc3f4295b787f1413acc92f449d42a587df608f5ef6d1fb7f");

        let response = await client.get (uri.toString());
        let expected = {
            "type": 0,
            "inputs": [
                {
                    "utxo": "0x2cf1caaeff65a7e2b2f7edff1023881564f2f0cad30161cf42279826e6919d77347df68de6d8eb0da58ebdc6e4f28da7569113002044467fc5cbf599a7ea9037",
                    "unlock": {
                        "bytes": "oNZEIXHc3etqnwHF/GFzst+9UKbA50RP9WY6WgNgbgdooqXHZqRlT8Zgn/wTpTXuIkXgTyj3IewYygldoAMr4Q=="
                    },
                    "unlock_age": 0
                }
            ],
            "outputs": [
                {
                    "value": "1663400000",
                    "lock": {
                        "type": 0,
                        "bytes": "Mb3OFIOnt8RdJR0g/RwOdU46rnt6kUGwAtwNIZG8f4E="
                    }
                },
                {
                    "value": "24398336600000",
                    "lock": {
                        "type": 0,
                        "bytes": "/ye9nnESViX42pd20OsHAGDIpltHdV7pIPfUVw228yo="
                    }
                }
            ],
            "payload": {
                "bytes": "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w=="
            },
            "lock_height": "0"
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it ('Test of the path /transaction/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction")
            .filename("0x74c2caf013ffd47440c46536403c1116dbf5276ee736a82db7e2cd9a5b827f7f24dca30951983e0aba92b8d5b813254b447616d2d060845fa0eca3d6b46a09b2");

        let response = await client.get (uri.toString());
        let expected = {
            "type": 0,
            "inputs": [
                {
                    "utxo": "0x14f9627aac2ca6fea7c8ee66c8967c68aaf524f6d5b120bc80014e505f5c723501215d715fa64295aa2baa8647e4c1776e3fa50a2d644a346630e57cd59eb522",
                    "unlock": {
                        "bytes": "XMSIGh0fNmGPFZw9+jM+UvTsKSabXBUeSmm8LS0e9wG+MsmEclqIIabSZHydmnycoKBAeh/lld9YODAbf/AhiA=="
                    },
                    "unlock_age": 0
                }
            ],
            "outputs": [
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ejw94GMKeuLPesbtpNxgN7+6BnCTHv3rgCllDdrrqq8="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+ja9+iX6EamiWvodERH7xsoRJa3bPe0yoKzr3I474S8="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jy99QRsbfDR6l/NzPF2cICQ2uYXpzzh54KU7XbfQhk="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ujS989FoU5AN3sVNiTxtO0VJ75IS03mXraj6yZ47ixE="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ujQ95gz90DDVs6WlhtMlFsQOmEGu44BLTT9BHyVR3dE="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "Oju9/YiKHC70YvTKMXbeqIujoLe+deR16FlKxIJOAIw="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "Ojk96+0F1fNfmtl039XW7LafwCw77dYDvo7G7NIFnLs="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+js9+6BmXaLLEIfa1QuhF75/wviB9cXlHq6jFk33vGk="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ej+96L75IWIDWeXcSfqDQPeqEYV5+WMgmU/XMJVkCdo="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ej295eI1Empe2oz1Sx4EtYKtyyHkyGyXu1myj6BBbMw="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jm9+y2/Uj+Kzu2J3v0S/ccaIAt/SVdLNlw7Cjk/xbs="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jC98n7qANALrxKKKHyuisgsOjhz+Y5mAMsKfLSK/h0="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jA99UOtdwtOBmftagyTGmnOJdNHEj27r+ys/cdyRvw="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "OjG98m16c26s8H7QSu3taAZmpkXXldHS35/RN1PJI0E="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jg95K/C2cKhYo+ORjdoFubre9be/Cd+wQNHIixGokw="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ejW9+kZ1tu6JdMV3LRzEYY9cD5tAjnnO4nGYF6+zam4="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "uj496a3T/CmS/lSA+eBLsnBTWYOU6tH3oaUL0HDKoQw="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jY9+XHS4Nj510Ezlw2bIG91kR9x+jLUH4tuLl6jZSY="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ejc98/bE1PYSXYLssjNOFJ5wxMgCZlhe1UHVrZQtecs="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ujM9/CrfXmdQsQuC4ji1APZB1yWvRL+W0XExjfCmB/c="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ejI9/X5zwED6yXnwiZ0dhihufi8wqU+iRPaACqGcsP8="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jE95blgPL0nc3KT9gXlXV1q4VWgZnvy64gzUZoJkLs="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ew699nDzRZB+ACW4a70WakpM2RX8RaZ6Yw6BXu7073M="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "eww9+9QkOYbvvLSy6hQedwcPqncK+a3mSHPdr+lJyEw="
                    }
                },
                {
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ewa97U1wMlSffch4BHNpepAZ2bNMrkb3mRjjwfp6P5Y="
                    }
                }
            ],
            "payload": {"bytes": ""},
            "lock_height": "0"
        };
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /latest-blocks', async () => {
        let uri = URI(host)
            .port(port)
            .directory("/latest-blocks")
            .addSearch("page", "1")
            .addSearch("limit", "10");

        let response = await client.get(uri.toString());
        let expected = [
            {
              height: '1',
              hash: '0xc4d0f4a5734c90e13b90635aeca16b06accfad3161fc77207b5d7cb21d4a4286da3f033fa4692091880e6b0b1b1a4253f69fa372e3492a987253dc203e62e4b8',
              merkle_root: '0x1d3d908cb9bab19fcb6ac006b6eff772969a1b822cb0acbe9cadabce8b9fcb334f2d3867239a80da7a3172193589469e4fe1fb9bbf472b82709ffa50f7cc46cd',
              signature: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
              validators: '[252]',
              tx_count: '8',
              enrollment_count: '0',
              time_stamp: 1609459800
            },
            {
              height: '0',
              hash: '0xe2357870cef6f690c5672293aba4e910dc3e120ab83cbfff24cf6b824af0588caa294900abdd46f3453229dea8680343e89f7ef06f47a2db1ec2a214553f4281',
              merkle_root: '0x0d453b87856c9faaf75cfac3dc993cd75c34fc1d5329d3c38e8b4757586fd5440cd9ed466f7c2259e5af4f8fe7f45cb997504542efd56d6bd7853fa9596d6bc2',
              signature: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
              validators: '[0]',
              tx_count: '2',
              enrollment_count: '6',
              time_stamp: 1609459200
            }
          ]
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /latest-transactions', async () => {
        let uri = URI(host)
            .port(port)
            .directory("/latest-transactions")
            .addSearch("page", "1")
            .addSearch("limit", "10");

        let response = await client.get(uri.toString());
        let expected = [
            {
              height: '1',
              tx_hash: '0xbbcdd3a1fe3c8942ad1523068d3cdf0fb0e29a50f96e89a1e75efc42654835552a4fe6d15648a1cb48b4ab376270374579d32a1b167df4334f668289e61e85ef',
              type: 0,
              amount: '610000000000000',
              tx_fee: '0',
              tx_size: '0',
              time_stamp: 1609459800
            },
            {
              height: '1',
              tx_hash: '0x161c713d23d71a0cf54f35b5fe5fb7423aefbd11de4ece83efde37ed1a0bc5d25a6c25a3535c2e4e35993b56120fbd0e021500e2111c7bee22162f487a5c633e',
              type: 0,
              amount: '610000000000000',
              tx_fee: '0',
              tx_size: '0',
              time_stamp: 1609459800
            },
            {
              height: '1',
              tx_hash: '0xd5945117a83d6660d7f9d6baa8eb36e2613d8cc2f28dc04753121d6c5142d4c1e4f47e00b1dc4b34fb956a2ab74d8abc8f91474b4fae5aa458ae2c56438fd53a',
              type: 0,
              amount: '610000000000000',
              tx_fee: '0',
              tx_size: '0',
              time_stamp: 1609459800
            },
            {
              height: '1',
              tx_hash: '0xfb2636847032202491dcb78cf04040a340a213cc9657cc2b9f74931d3d269540e9db50f6041c7e6c32fb9dc439b9008a1d2f51d1eb2e3de189a8325ee88101cd',
              type: 0,
              amount: '610000000000000',
              tx_fee: '0',
              tx_size: '0',
              time_stamp: 1609459800
            },
            {
              height: '1',
              tx_hash: '0xa4e0286cdcade13788d63bc8aa178ec5e97c65e62f7aa731a74a7b60867a1e7bd9abf0d964ad426fea90babfc65d67cfcc382f09b61a2c359b4b6e8021beaf30',
              type: 0,
              amount: '610000000000000',
              tx_fee: '0',
              tx_size: '0',
              time_stamp: 1609459800
            },
            {
              height: '1',
              tx_hash: '0xfe64dddee486f417b76da9ed1edea75829f5be8197b29e4984f1bd6d3b681e52e8f9f06eda825e2445deccefa8fe51900944a0b1c71be7f022dee92e12d3e8fd',
              type: 0,
              amount: '610000000000000',
              tx_fee: '0',
              tx_size: '0',
              time_stamp: 1609459800
            },
            {
              height: '1',
              tx_hash: '0x627b49d69d2ad4fc4f75e4b75368302f50b1906bbce9943dd4de6a55c096673c67b16c30894fcbd9a8218d7696909dc12c7970d27902f8d8af90e0a7f0694f57',
              type: 0,
              amount: '610000000000000',
              tx_fee: '0',
              tx_size: '0',
              time_stamp: 1609459800
            },
            {
              height: '1',
              tx_hash: '0x6d19e35742f9348765a34e083e20ceb5b5cce5afb51a18154f13bd93e49ecf5d555f07b59adf0b843d70f85dbc9721d36647c526d18e32926fa9544bbc93afc3',
              type: 0,
              amount: '610000000000000',
              tx_fee: '0',
              tx_size: '0',
              time_stamp: 1609459800
            },
            {
              height: '0',
              tx_hash: '0xb8f5a5f4544e75b5837a370d0070361aaaf97d3b02070d3d9845598c5f55105b6bd9ac8e9c53e74679db77cb512ffd88a9916754744f6b5eb2a812929651f84f',
              type: 1,
              amount: '120000000000000',
              tx_fee: '0',
              tx_size: '0',
              time_stamp: 1609459200
            },
            {
              height: '0',
              tx_hash: '0x4ef4f7195db2e20f36b46cb3cda1f529b77e2cd8423241d1a4a779f3d7845d4f6543a6147956bf4fe52d5f5925a04102de59b2854f90fb3e8cc1a0e85fe9b11d',
              type: 0,
              amount: '4880000000000000',
              tx_fee: '0',
              tx_size: '0',
              time_stamp: 1609459200
            }
          ];
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-summary with block height', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-summary")
            .addSearch("height", "1");

        let response = await client.get(uri.toString());
        let expected = {
            height: '1',
            total_transactions: 8,
            hash: '0xc4d0f4a5734c90e13b90635aeca16b06accfad3161fc77207b5d7cb21d4a4286da3f033fa4692091880e6b0b1b1a4253f69fa372e3492a987253dc203e62e4b8',
            prev_hash: '0xe2357870cef6f690c5672293aba4e910dc3e120ab83cbfff24cf6b824af0588caa294900abdd46f3453229dea8680343e89f7ef06f47a2db1ec2a214553f4281',
            merkle_root: '0x1d3d908cb9bab19fcb6ac006b6eff772969a1b822cb0acbe9cadabce8b9fcb334f2d3867239a80da7a3172193589469e4fe1fb9bbf472b82709ffa50f7cc46cd',
            signature: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
            random_seed: '0x691775809b9498f45a2c5ef8b8d552e318ebaf0b1b2fb15dcc39e0ec962ae9812d7edffa5f053590a895c9ff72c1b0838ce8f5c709579d4529f9f4caf0fab13d',
            time: 1609459800,
            version: 'v0.x.x',
            total_sent: 4880000000000000,
            total_recieved: 4880000000000000,
            total_reward: 0,
            total_fee: 0,
            total_size: 9328
          }
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-enrollments with block height', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-enrollments")
            .addSearch("height", "0")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            enrollmentElementList: [
              {
                height: '0',
                utxo: '0x6100ee7a7e00e18e06b743a7ae90e91781c09e0f1791ee2849ce15caf4c6ee1f3aebc23768f98153d8e3fb10ac66267e06acc31dccbfdbe671294a7fded22432',
                enroll_sig: '0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422',
                commitment: '0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328',
                cycle_length: 20
              },
              {
                height: '0',
                utxo: '0xac296969fc6c59a53beb080d1d4f62d344779d9877aca1d374918815a424d50176e0c1bd79355ffb0424c43db050ad97bf799027639f1c65a2f44ae5326f5b8a',
                enroll_sig: '0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01',
                commitment: '0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1',
                cycle_length: 20
              },
              {
                height: '0',
                utxo: '0xf86b2a5c800d872737b925df21923eee6eb998c705135e3165f3afd95131e39ec4d74a1b33eb3ea7a54524c183338d01bc79391f44bc6604a8f9e2cd0e324411',
                enroll_sig: '0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304',
                commitment: '0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb',
                cycle_length: 20
              },
              {
                height: '0',
                utxo: '0x3764508f77003808ba8b27ec0c8706ea7b4efdc8211e132dd8f1509643859af5489292694ef14ce1a77f56fd21f7ef3d57e4b013458aea2d915a82ecd4cf3533',
                enroll_sig: '0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634',
                commitment: '0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc',
                cycle_length: 20
              },
              {
                height: '0',
                utxo: '0x1da29910b5ed5b9ea3bd4207016f485f763b44bd289444a4cef77faa96480d6833ce0b215c3ed6e00e9119352e49bb3e04054e0fca5fef35aeb47a9e425d7ddf',
                enroll_sig: '0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31',
                commitment: '0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4',
                cycle_length: 20
              },
              {
                height: '0',
                utxo: '0x740c6279bb59d9d6e098dab2485f5914aa5cea9ba39639f62c81041dacaf12e887de30089d1d887bc6e96eaecd076be9aac5f158af94c73def6ce255d6aad4f1',
                enroll_sig: '0x0e0070e5951ef5be897cb593c4c57ce28b7529463f7e5644b1314ab7cc69fd625c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa74fe2',
                commitment: '0xdd1b9c62d4c62246ea124e5422d5a2e23d3ca9accb0eba0e46cd46708a4e7b417f46df34dc2e3cba9a57b1dc35a66dfc2d5ef239ebeaaa00299232bc7e3b7bfa',
                cycle_length: 20
              }
            ],
            total_data: 6
          }
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-enrollments with block hash', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-enrollments")
            .addSearch("hash", "0xe2357870cef6f690c5672293aba4e910dc3e120ab83cbfff24cf6b824af0588caa294900abdd46f3453229dea8680343e89f7ef06f47a2db1ec2a214553f4281")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            enrollmentElementList: [
              {
                height: '0',
                utxo: '0x6100ee7a7e00e18e06b743a7ae90e91781c09e0f1791ee2849ce15caf4c6ee1f3aebc23768f98153d8e3fb10ac66267e06acc31dccbfdbe671294a7fded22432',
                enroll_sig: '0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422',
                commitment: '0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328',
                cycle_length: 20
              },
              {
                height: '0',
                utxo: '0xac296969fc6c59a53beb080d1d4f62d344779d9877aca1d374918815a424d50176e0c1bd79355ffb0424c43db050ad97bf799027639f1c65a2f44ae5326f5b8a',
                enroll_sig: '0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01',
                commitment: '0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1',
                cycle_length: 20
              },
              {
                height: '0',
                utxo: '0xf86b2a5c800d872737b925df21923eee6eb998c705135e3165f3afd95131e39ec4d74a1b33eb3ea7a54524c183338d01bc79391f44bc6604a8f9e2cd0e324411',
                enroll_sig: '0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304',
                commitment: '0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb',
                cycle_length: 20
              },
              {
                height: '0',
                utxo: '0x3764508f77003808ba8b27ec0c8706ea7b4efdc8211e132dd8f1509643859af5489292694ef14ce1a77f56fd21f7ef3d57e4b013458aea2d915a82ecd4cf3533',
                enroll_sig: '0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634',
                commitment: '0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc',
                cycle_length: 20
              },
              {
                height: '0',
                utxo: '0x1da29910b5ed5b9ea3bd4207016f485f763b44bd289444a4cef77faa96480d6833ce0b215c3ed6e00e9119352e49bb3e04054e0fca5fef35aeb47a9e425d7ddf',
                enroll_sig: '0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31',
                commitment: '0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4',
                cycle_length: 20
              },
              {
                height: '0',
                utxo: '0x740c6279bb59d9d6e098dab2485f5914aa5cea9ba39639f62c81041dacaf12e887de30089d1d887bc6e96eaecd076be9aac5f158af94c73def6ce255d6aad4f1',
                enroll_sig: '0x0e0070e5951ef5be897cb593c4c57ce28b7529463f7e5644b1314ab7cc69fd625c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa74fe2',
                commitment: '0xdd1b9c62d4c62246ea124e5422d5a2e23d3ca9accb0eba0e46cd46708a4e7b417f46df34dc2e3cba9a57b1dc35a66dfc2d5ef239ebeaaa00299232bc7e3b7bfa',
                cycle_length: 20
              }
            ],
            total_data: 6
          }
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-transactions with block height', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-transactions")
            .addSearch("height", "0")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            tx: [
              {
                height: '0',
                tx_hash: '0xb8f5a5f4544e75b5837a370d0070361aaaf97d3b02070d3d9845598c5f55105b6bd9ac8e9c53e74679db77cb512ffd88a9916754744f6b5eb2a812929651f84f',
                amount: '120000000000000',
                type: 1,
                fee: 0,
                size: 255,
                time: 1609459200,
                sender_address: null,
                receiver: [
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwry6fpk7a57k4gwyj3mwnf59w808nygtuxsgdrpmv4p7ua2hqx78z5en'
                    },
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwrymw40ae7kdumk5uf24rf7wj6kxeem0t3mh9yclz6j46rnen6htq9ju'
                    },
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp'
                    },
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwryayr9r3nacx26vwe6ymy2kl7zp7dc03q5h6zk65vnu6mtkkzdqg39f'
                    },
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwry7vltf9mrzf62qgpdh282grqn9nlnvhzp0yt8y0y9zedmgh64s2qjg'
                    },
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwryl0ajdd86c45w4zrjf8spmrt7u4l7s5jy64ac3dc78x2ucd7wkakac'
                    }
                  ]
              },
              {
                height: '0',
                tx_hash: '0x4ef4f7195db2e20f36b46cb3cda1f529b77e2cd8423241d1a4a779f3d7845d4f6543a6147956bf4fe52d5f5925a04102de59b2854f90fb3e8cc1a0e85fe9b11d',
                amount: '4880000000000000',
                type: 0,
                fee: 0,
                size: 337,
                time: 1609459200,
                sender_address: null,
                receiver: [
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    }
                  ]
              }
            ],
            total_data: 2
          }
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-transactions with block hash', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-transactions")
            .addSearch("hash", "0xe2357870cef6f690c5672293aba4e910dc3e120ab83cbfff24cf6b824af0588caa294900abdd46f3453229dea8680343e89f7ef06f47a2db1ec2a214553f4281")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            tx: [
              {
                height: '0',
                tx_hash: '0xb8f5a5f4544e75b5837a370d0070361aaaf97d3b02070d3d9845598c5f55105b6bd9ac8e9c53e74679db77cb512ffd88a9916754744f6b5eb2a812929651f84f',
                amount: '120000000000000',
                type: 1,
                fee: 0,
                size: 255,
                time: 1609459200,
                sender_address: null,
                receiver: [
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwry6fpk7a57k4gwyj3mwnf59w808nygtuxsgdrpmv4p7ua2hqx78z5en'
                    },
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwrymw40ae7kdumk5uf24rf7wj6kxeem0t3mh9yclz6j46rnen6htq9ju'
                    },
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp'
                    },
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwryayr9r3nacx26vwe6ymy2kl7zp7dc03q5h6zk65vnu6mtkkzdqg39f'
                    },
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwry7vltf9mrzf62qgpdh282grqn9nlnvhzp0yt8y0y9zedmgh64s2qjg'
                    },
                    {
                      amount: 20000000000000,
                      address: 'boa1xrdwryl0ajdd86c45w4zrjf8spmrt7u4l7s5jy64ac3dc78x2ucd7wkakac'
                    }
                  ]
              },
              {
                height: '0',
                tx_hash: '0x4ef4f7195db2e20f36b46cb3cda1f529b77e2cd8423241d1a4a779f3d7845d4f6543a6147956bf4fe52d5f5925a04102de59b2854f90fb3e8cc1a0e85fe9b11d',
                amount: '4880000000000000',
                type: 0,
                fee: 0,
                size: 337,
                time: 1609459200,
                sender_address: null,
                receiver: [
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    },
                    {
                      amount: 610000000000000,
                      address: 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt'
                    }
                  ]
              }
            ],
            total_data: 2
          }
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /boa-stats', async () => {
        let uri = URI(host)
            .port(port)
            .directory("boa-stats");
        let response = await client.get(uri.toString());
        let expected = {
                    height: 1,
                    transactions: 10,
                    validators: 7,
                    frozen_coin: 5283595,
                    circulating_supply: 5283535,
                    active_validators: 155055
                }
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
    let testDBConfig : IDatabaseConfig;


    before ('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before('Start a fake Agora', () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before ('Create TestStoa', async () =>
    {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig,new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });
    
    after('Stop Stoa and Agora server instances', async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
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
        await delay(1000);
    });

    it ('Test of the path /utxo no pending transaction ', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

        let response = await client.get (uri.toString());
        let expected = [
            {
                utxo: '0x2cf1caaeff65a7e2b2f7edff1023881564f2f0cad30161cf42279826e6919d77347df68de6d8eb0da58ebdc6e4f28da7569113002044467fc5cbf599a7ea9037',
                type: 0,
                unlock_height: '2',
                amount: '24400000000000',
                height: '1',
                time: 1609459800,
                lock_type: 0,
                lock_bytes: 'ejw94GMKeuLPesbtpNxgN7+6BnCTHv3rgCllDdrrqq8='
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
        await delay(500);
    });

    it ('Test of the path /utxo with pending transaction ', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

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
    let testDBConfig : IDatabaseConfig;

    let blocks: Array<Block> = [];
    blocks.push(Block.reviver("", sample_data[0]));
    blocks.push(Block.reviver("", sample_data[1]));

    before ('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before('Start a fake Agora', () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before ('Create TestStoa', async () =>
    {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig,new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after('Stop Stoa and Agora server instances', async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
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
        await delay(1000);
    });

    it ('Create a block with a freeze transaction', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

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
                new TxOutput(JSBI.BigInt(  "100000000000"), new PublicKey("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj")),
                new TxOutput(JSBI.BigInt("24300000000000"), new PublicKey("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj"))
            ],
            DataPayload.init
        );

        uri = URI(host)
            .port(port)
            .directory("utxo")
            .filename("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs");

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
                new TxOutput(JSBI.BigInt(  "400000000000"), new PublicKey("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs")),
                new TxOutput(JSBI.BigInt("24000000000000"), new PublicKey("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs"))
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
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

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
            .filename("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs");

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
    let testDBConfig : IDatabaseConfig;

    before ('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
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
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig,new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });
    after ('Stop Stoa and Agora server instances', async () =>
    {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    it ('Test of the path /merkle_path', async () =>
    {
        let uri = URI(agora_host)
            .port(agora_port)
            .directory("merkle_path")
            .setSearch("height", "1")
            .setSearch("hash", "0x74c2caf013ffd47440c46536403c1116dbf5276ee736a82db7e2cd9a5b827f7f24dca30951983e0aba92b8d5b813254b447616d2d060845fa0eca3d6b46a09b2");

        let response = await client.get(uri.toString());

        let expected =
            [
                "0x59336788adcb9eb8c7bfbbd40162a74bef6972d1bcd3fdb8f8eb7f464ff11094c3000c08e8da33595482ff4223167f079ce96c8f849ee640f5eb556ab5406839",
                "0x9f64d5d3e951a2a111fb414dd3d8a2dded75cfe953c7502c76682dd8b81f8d8a84cd3cff56c791fe2bbcfdeba23f894f2e0ad7ef7659e0d1ae785b092d2a9302",
                "0xed63eaefef428595e36a38ff8c96d514d9f57968928cebe8ba0161ab434262f2e5099e3942d17d67562428dfa43e98cb5099ca0f4482274dbc6d6b2012b38c85",
            ];

        assert.deepStrictEqual(response.data, expected);
    });

    it ('Test of the path /merkle_path by AgoraClient', async () =>
    {
        const agora_addr: URL = new URL('http://localhost:2826');
        let agora_client = new AgoraClient(agora_addr);
        let merkle_path: Array<Hash> = await agora_client.getMerklePath(new Height("1"),
            new Hash("0x74c2caf013ffd47440c46536403c1116dbf5276ee736a82db7e2cd9a5b827f7f24dca30951983e0aba92b8d5b813254b447616d2d060845fa0eca3d6b46a09b2"))

        let expected =
            [
                new Hash("0x59336788adcb9eb8c7bfbbd40162a74bef6972d1bcd3fdb8f8eb7f464ff11094c3000c08e8da33595482ff4223167f079ce96c8f849ee640f5eb556ab5406839"),
                new Hash("0x9f64d5d3e951a2a111fb414dd3d8a2dded75cfe953c7502c76682dd8b81f8d8a84cd3cff56c791fe2bbcfdeba23f894f2e0ad7ef7659e0d1ae785b092d2a9302"),
                new Hash("0xed63eaefef428595e36a38ff8c96d514d9f57968928cebe8ba0161ab434262f2e5099e3942d17d67562428dfa43e98cb5099ca0f4482274dbc6d6b2012b38c85"),
            ];

        assert.deepStrictEqual(merkle_path, expected);
    });

    it ('Test of the path /spv with a Merkle path transaction', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("spv")
            .filename("0x74c2caf013ffd47440c46536403c1116dbf5276ee736a82db7e2cd9a5b827f7f24dca30951983e0aba92b8d5b813254b447616d2d060845fa0eca3d6b46a09b2");

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
            .filename("0x59336788adcb9eb8c7bfbbd40162a74bef6972d1bcd3fdb8f8eb7f464ff11094c3000c08e8da33595482ff4223167f079ce96c8f849ee640f5eb556ab5406839");

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
