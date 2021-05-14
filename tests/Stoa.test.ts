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
import { BOASodium } from 'boa-sodium-ts';

describe ('Test of Stoa API Server', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();

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
            '0xa2073ce83b58f87d3c684bd62c1d037531edd85f7ed11d006f97af95ca65f8a' +
            'e2ed8cf10f5843c8cc3f4295b787f1413acc92f449d42a587df608f5ef6d1fb7f');
        assert.strictEqual(response.data[0].address, 'boa1xqcmmns5swnm03zay5wjplgupe65uw4w0dafzsdsqtwq6gv3h3lcz24a8ch');
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
        await delay(500);
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
        await delay(500);
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
