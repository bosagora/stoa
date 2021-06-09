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
    Transaction, OutputType, TxInput, TxOutput, PublicKey, JSBI, Sig
} from 'boa-sdk-ts';
import {
    sample_data,
    sample_data2,
    sample_preImageInfo,
    sample_reEnroll_preImageInfo,
    market_cap_history_sample_data,
    market_cap_sample_data,
    TestAgora,
    TestStoa,
    TestClient,
    TestGeckoServer,
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
import { CoinMarketService } from '../src/modules/service/CoinMaketService';
import { CoinGeckoMaket } from '../src/modules/coinmarket/CoinGeckoMaket';

describe ('Test of Stoa API Server', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();
    let testDBConfig : IDatabaseConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMaket;
    let coinMarketService: CoinMarketService;

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
     before('Start a fake TestCoinGecko', () => {
        return new Promise<void>((resolve, reject) => {
                gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
                gecko_market = new CoinGeckoMaket(gecko_server);
        });
    });
    before('Start a fake coinMarketService', () => {
             coinMarketService = new CoinMarketService(gecko_market)
    });

    before ('Create TestStoa', async () =>
    {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, new URL("http://127.0.0.1:2826"), port, coinMarketService);
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
        await gecko_server.stop();
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
            "boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t");
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
                new Hash("0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f");
            const commitment =
                new Hash("0xe0c04a5bd47ffc5b065b7d397e251016310c43dc77220bf803b73f1183da00b0e67602b1f95cb18a0059aa1cdf2f9adafe979998364b38cd5c15d92b9b8fd815");
            const enrollment = new Enrollment(utxo_key, commitment, 20, Sig.fromSignature(enroll_sig));
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
            '0x8161cb00f6d95e4c42c8aa8d752a378ff2de671e4dfc1edba3b53704d8dd124' +
            '1077c1df1c3c0bb8f63dc4f0645cd86ccb17d932cc7a796f9e1c221abafe8b0d7');
        assert.strictEqual(response.data.merkle_root,
            '0x2a8158ee049c459e32912f426b0f4ebaea9d017455efd3e20c27954f22066a1' +
            '0a4cb676254e9a011906ac8cb6855add4d314eb96d583d1a1828ff7f05d04ebd0');
        assert.strictEqual(response.data.time_stamp, 1609459800);

        uri = URI(host)
            .port(port)
            .directory("/wallet/blocks/header")
            .setSearch("height", "0");

        response = await client.get (uri.toString())
        assert.strictEqual(response.data.height, '0');
        assert.strictEqual(response.data.hash,
            '0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364e' +
            'abbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99');
        assert.strictEqual(response.data.merkle_root,
            '0x67218493be437c25dc5884abdc8ee40e61f0af79aa9af8ab9bd8b0632eaaca2' +
            '38b4c054f114b046da0d5911b1b205ba540d07c5dc01560beafe564e5f3d101c9');
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
            '0xc438670a649a4593b35d922023ca959b6dfb630e8d4cfc5783aaffe21f85988' +
            '2b71f59890ee889abf32d00df4bab872c91da13e9fc961bceeb3d91643ee2d0d9');
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
            .filename("0xc438670a649a4593b35d922023ca959b6dfb630e8d4cfc5783aaffe21f859882b71f59890ee889abf32d00df4bab872c91da13e9fc961bceeb3d91643ee2d0d9");

        let response_pending = await client.get(uri.toString());
        let expected_pending = {
            status: 'pending',
            tx_hash: '0xc438670a649a4593b35d922023ca959b6dfb630e8d4cfc5783aaffe21f859882b71f59890ee889abf32d00df4bab872c91da13e9fc961bceeb3d91643ee2d0d9'
        }
        assert.deepStrictEqual(response_pending.data, expected_pending);

        uri = URI(host)
            .port(port)
            .directory("/transaction/status")
            .filename("0x9e6d1b023eed4b4a7141c18b585e8aebc4955d5e279698e96086eca689daa8cebfef63deb816749445bf4a82af43958f44d90357488a5a3681fb6e3b4bc9789a");

        let response_confirmed = await client.get(uri.toString());
        let expected_confirmed = {
            status: "confirmed",
            tx_hash: "0x9e6d1b023eed4b4a7141c18b585e8aebc4955d5e279698e96086eca689daa8cebfef63deb816749445bf4a82af43958f44d90357488a5a3681fb6e3b4bc9789a",
            block: {
                height: 1,
                hash: "0x8161cb00f6d95e4c42c8aa8d752a378ff2de671e4dfc1edba3b53704d8dd1241077c1df1c3c0bb8f63dc4f0645cd86ccb17d932cc7a796f9e1c221abafe8b0d7"
            }
        };
        assert.deepStrictEqual(response_confirmed.data, expected_confirmed);
    });

    it ('Test of the path /transaction/pending/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction/pending")
            .filename("0xc438670a649a4593b35d922023ca959b6dfb630e8d4cfc5783aaffe21f859882b71f59890ee889abf32d00df4bab872c91da13e9fc961bceeb3d91643ee2d0d9");

        let response = await client.get (uri.toString());
        let expected = {
            "inputs": [
                {
                    "utxo": "0x75283072696d82d8bca2fe45471906a26df1dbe0736e41a9f78e02a14e2bfced6e0cb671f023626f890f28204556aca217f3023c891fe64b9f4b3450cb3e80ad",
                    "unlock": {
                        "bytes": "Vgaf0GGK33970wp7R/6W3/JlNQpKBF7/MTaN+uB+TgVPASyuXB4IukGgLaLrzrscbgOVYqP0E2angseh/qV0Tg=="
                    },
                    "unlock_age": 0
                }
            ],
            "outputs": [
                {
                    "type": 0,
                    "value": "1663400000",
                    "lock": {
                        "type": 0,
                        "bytes": "Mb3OFIOnt8RdJR0g/RwOdU46rnt6kUGwAtwNIZG8f4E="
                    }
                },
                {
                    "type": 0,
                    "value": "24398336600000",
                    "lock": {
                        "type": 0,
                        "bytes": "/ye9nnESViX42pd20OsHAGDIpltHdV7pIPfUVw228yo="
                    }
                }
            ],
            "payload": "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==",
            "lock_height": "0"
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it ('Test of the path /transaction/:hash', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/transaction")
            .filename("0x9e6d1b023eed4b4a7141c18b585e8aebc4955d5e279698e96086eca689daa8cebfef63deb816749445bf4a82af43958f44d90357488a5a3681fb6e3b4bc9789a");

        let response = await client.get (uri.toString());
        let expected = {
            "inputs": [
                {
                    "utxo": "0xb9794167a781561298bcb0f634346c85e56fba3f26c641e52dbf0066e8fb0b96d278cdd4c22c7e9885fceb307368e4130aaebd7800905c27c6a6e09870d8d9ca",
                    "unlock": {
                        "bytes": "CLJuoUgDcq/0c1TR1ooUOkWoAKvJPUMnu6wqws44vQrrv8MLiGzEBdnRv8dIjhucXYeQ8BEbWwMaBnp+Vb6E3Q=="
                    },
                    "unlock_age": 0
                }
            ],
            "outputs": [
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "OjG98m16c26s8H7QSu3taAZmpkXXldHS35/RN1PJI0E="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "Ojk96+0F1fNfmtl039XW7LafwCw77dYDvo7G7NIFnLs="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "Oju9/YiKHC70YvTKMXbeqIujoLe+deR16FlKxIJOAIw="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ejI9/X5zwED6yXnwiZ0dhihufi8wqU+iRPaACqGcsP8="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ejW9+kZ1tu6JdMV3LRzEYY9cD5tAjnnO4nGYF6+zam4="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ejc98/bE1PYSXYLssjNOFJ5wxMgCZlhe1UHVrZQtecs="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ejw94GMKeuLPesbtpNxgN7+6BnCTHv3rgCllDdrrqq8="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ej295eI1Empe2oz1Sx4EtYKtyyHkyGyXu1myj6BBbMw="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ej+96L75IWIDWeXcSfqDQPeqEYV5+WMgmU/XMJVkCdo="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ewa97U1wMlSffch4BHNpepAZ2bNMrkb3mRjjwfp6P5Y="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "eww9+9QkOYbvvLSy6hQedwcPqncK+a3mSHPdr+lJyEw="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ew699nDzRZB+ACW4a70WakpM2RX8RaZ6Yw6BXu7073M="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ujM9/CrfXmdQsQuC4ji1APZB1yWvRL+W0XExjfCmB/c="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ujQ95gz90DDVs6WlhtMlFsQOmEGu44BLTT9BHyVR3dE="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "ujS989FoU5AN3sVNiTxtO0VJ75IS03mXraj6yZ47ixE="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "uj496a3T/CmS/lSA+eBLsnBTWYOU6tH3oaUL0HDKoQw="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jA99UOtdwtOBmftagyTGmnOJdNHEj27r+ys/cdyRvw="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jC98n7qANALrxKKKHyuisgsOjhz+Y5mAMsKfLSK/h0="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jE95blgPL0nc3KT9gXlXV1q4VWgZnvy64gzUZoJkLs="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jY9+XHS4Nj510Ezlw2bIG91kR9x+jLUH4tuLl6jZSY="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+ja9+iX6EamiWvodERH7xsoRJa3bPe0yoKzr3I474S8="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jg95K/C2cKhYo+ORjdoFubre9be/Cd+wQNHIixGokw="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jm9+y2/Uj+Kzu2J3v0S/ccaIAt/SVdLNlw7Cjk/xbs="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+js9+6BmXaLLEIfa1QuhF75/wviB9cXlHq6jFk33vGk="
                    }
                },
                {
                    "type": 0,
                    "value": "24400000000000",
                    "lock": {
                        "type": 0,
                        "bytes": "+jy99QRsbfDR6l/NzPF2cICQ2uYXpzzh54KU7XbfQhk="
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
    let testDBConfig : IDatabaseConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMaket;
    let coinMarketService: CoinMarketService;

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
    before('Start a fake TestCoinGecko', () => {
        return new Promise<void>((resolve, reject) => {
                    gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
                    gecko_market = new CoinGeckoMaket(gecko_server);
        });
    });
    before('Start a fake coinMarketService', () => {
             coinMarketService = new CoinMarketService(gecko_server)
    });
    before ('Create TestStoa', async () =>
    {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig,new URL("http://127.0.0.1:2826"), port, coinMarketService);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after('Stop Stoa and Agora server instances', async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
        await gecko_server.stop();
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
                utxo: '0x75283072696d82d8bca2fe45471906a26df1dbe0736e41a9f78e02a14e2bfced6e0cb671f023626f890f28204556aca217f3023c891fe64b9f4b3450cb3e80ad',
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
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMaket;
    let coinMarketService: CoinMarketService;

    let blocks: Array<Block> = [];

    before ('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();

        blocks.push(Block.reviver("", sample_data[0]));
        blocks.push(Block.reviver("", sample_data[1]));
    });

    before('Start a fake Agora', () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });
    before('Start a fake TestCoinGecko', () => {
        return new Promise<void>((resolve, reject) => {
                gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
                gecko_market = new CoinGeckoMaket(gecko_server);
        });
    });
    before('Start a fake coinMarketService', () => {
             coinMarketService = new CoinMarketService(gecko_market)
    });
    before ('Create TestStoa', async () =>
    {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig,new URL("http://127.0.0.1:2826"), port, coinMarketService);
        await stoa_server.createStorage();
        await stoa_server.start();
    });
    after('Stop Stoa and Agora server instances', async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
        await gecko_server.stop();
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
            [
                new TxInput(new Hash(response.data[0].utxo))
            ],
            [
                new TxOutput(OutputType.Payment, JSBI.BigInt(  "100000000000"), new PublicKey("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj")),
                new TxOutput(OutputType.Freeze, JSBI.BigInt("24300000000000"), new PublicKey("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj"))
            ],
            Buffer.alloc(0)
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
            [
                new TxInput(new Hash(response.data[0].utxo))
            ],
            [
                new TxOutput(OutputType.Payment, JSBI.BigInt(  "400000000000"), new PublicKey("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs")),
                new TxOutput(OutputType.Freeze, JSBI.BigInt("24000000000000"), new PublicKey("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs"))
            ],
            Buffer.alloc(0)
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
        assert.strictEqual(freeze_utxo.type, OutputType.Freeze);

        // It was not frozen because the amount of the refund was less than 40,000 BOA.
        let refund_utxo = utxo_array.find(m => (m.amount === "100000000000"));
        assert.strictEqual(refund_utxo.type, OutputType.Payment);
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
        assert.strictEqual(freeze_utxo.type, OutputType.Freeze);

        // It was frozen because the amount of the refund was larger than 40,000 BOA.
        let refund_utxo = utxo_array.find(m => (m.amount === "400000000000"));
        assert.strictEqual(refund_utxo.type, OutputType.Payment);
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
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMaket;
    let coinMarketService: CoinMarketService;

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
    before('Start a fake TestCoinGecko', () => {
        return new Promise<void>((resolve, reject) => {
                gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
                gecko_market = new CoinGeckoMaket(gecko_server);
        });
    });
    before('Start a fake coinMarketService', () => {
            coinMarketService = new CoinMarketService(gecko_market)
    });
    before ('Create TestStoa', async () =>
    {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig,new URL("http://127.0.0.1:2826"), port, coinMarketService);
        await stoa_server.createStorage();
        await stoa_server.start();
    });
    after ('Stop Stoa and Agora server instances', async () =>
    {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
        await gecko_server.stop();
    });

    it ('Test of the path /merkle_path', async () =>
    {
        let uri = URI(agora_host)
            .port(agora_port)
            .directory("merkle_path")
            .setSearch("height", "1")
            .setSearch("hash", "0xa4ce8dd85f51340bdae780db580e21acacfc94eec3305d83275ff2ea2d5583d75b8c400e1807952e04f243c4ef80d821e2537a59f20e12857c910bc2e4028bf7");

        let response = await client.get(uri.toString());

        let expected =
            [
                "0xd7cdd350d885c2f15a91b6b927de0e79d2cddecf4b8d02825978f026cecae23482252d8d04e57114aeb3fe5048fc1297d65824abe0696d9dc982153a64a4c6ac",
                "0x23aebb377939f6a968dcf9d3d8f04111a734df988046efa6cc26fe4257ef01a3411c44b4c569af2934d99e488191f43a0ca9ef3aa2e200bdffffe5163901eca4",
                "0xdd25e52d046a2bb2a95d44da736be7cab09affecad513de30a68aaecedcbb50fcc12078fb7858c37d0164430b5d58d1898c6d26250952d5d5bcc1646863dea9a",
            ];

        assert.deepStrictEqual(response.data, expected);
    });

    it ('Test of the path /merkle_path by AgoraClient', async () =>
    {
        const agora_addr: URL = new URL('http://localhost:2826');
        let agora_client = new AgoraClient(agora_addr);
        let merkle_path: Array<Hash> = await agora_client.getMerklePath(new Height("1"),
            new Hash("0xdd75be9a8b2778deb99734dfb17f70c3635afff654342cc1c306ba0fc69eb72494c9e3c4543eaa6974757204ff19a521989b6ab4c6d41de535b8e634faf66183"))

        let expected =
            [
                new Hash("0xd7cdd350d885c2f15a91b6b927de0e79d2cddecf4b8d02825978f026cecae23482252d8d04e57114aeb3fe5048fc1297d65824abe0696d9dc982153a64a4c6ac"),
                new Hash("0x23aebb377939f6a968dcf9d3d8f04111a734df988046efa6cc26fe4257ef01a3411c44b4c569af2934d99e488191f43a0ca9ef3aa2e200bdffffe5163901eca4"),
                new Hash("0xdd25e52d046a2bb2a95d44da736be7cab09affecad513de30a68aaecedcbb50fcc12078fb7858c37d0164430b5d58d1898c6d26250952d5d5bcc1646863dea9a"),
            ];

        assert.deepStrictEqual(merkle_path, expected);
    });

    it ('Test of the path /spv with a Merkle path transaction', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("spv")
            .filename("0x9e6d1b023eed4b4a7141c18b585e8aebc4955d5e279698e96086eca689daa8cebfef63deb816749445bf4a82af43958f44d90357488a5a3681fb6e3b4bc9789a");

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
            .filename("0xd7cdd350d885c2f15a91b6b927de0e79d2cddecf4b8d02825978f026cecae23482252d8d04e57114aeb3fe5048fc1297d65824abe0696d9dc982153a64a4c6ac ");

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

