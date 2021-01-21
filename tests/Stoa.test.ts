/*******************************************************************************

    Test API Server Stoa

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    BitField, Block, BlockHeader, Enrollment, Height, Hash, Signature, SodiumHelper
} from 'boa-sdk-ts';
import {
    sample_data,
    sample_data2,
    sample_preImageInfo,
    sample_reEnroll_preImageInfo,
    TestAgora,
    TestStoa,
    delay
} from './Utils';

import * as assert from 'assert';
import axios from 'axios';
import URI from 'urijs';
import { URL } from 'url';

describe ('Test of Stoa API Server', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = axios.create();

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
            "GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY");
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
            {message: "Request failed with status code 400"}
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
            assert.strictEqual(response.data.length, 6);
            assert.strictEqual(response.data[0].preimage.distance, 1);
            assert.strictEqual(response.data[0].preimage.hash,
                "0x314e30482fd0b498361e8537961d875e52b7e82edb8260cd548d3edacb451c80f41dd0ba9c5700adfb646066d41b0031120b65cba2df91def9bd83263fb306bd");

            // re-enrollment
            const enroll_sig =
                new Signature("0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8125cf6b04274cc4db34bfd");
            const utxo_key =
                new Hash("0x46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac");
            const random_seed =
                new Hash("0xe0c04a5bd47ffc5b065b7d397e251016310c43dc77220bf803b73f1183da00b0e67602b1f95cb18a0059aa1cdf2f9adafe979998364b38cd5c15d92b9b8fd815");
            const enrollment = new Enrollment(utxo_key, random_seed, 20, enroll_sig);
            const header = new BlockHeader(
                new Hash(Buffer.alloc(Hash.Width)), new Height(19n), new Hash(Buffer.alloc(Hash.Width)), new BitField([]),
                new Signature(Buffer.alloc(Signature.Width)), [ enrollment ], new Hash(Buffer.alloc(Hash.Width)), [], 0);
            const block = new Block(header, [], []);

            // put the re-enrollment
            await stoa_server.ledger_storage.putEnrollments(block);

            let uri6 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "19");

            response = await client.get (uri6.toString());
            assert.strictEqual(response.data.length, 6);

            assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            assert.strictEqual(response.data[0].enrolled_at, "0");

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
                {message: "Request failed with status code 400"}
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

    it ('Test of the path /transaction_received', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("transaction_received");

        let url = uri.toString();
        const block = Block.reviver("", sample_data2);
        await client.post(url, {transaction: block.txs[0]})
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
        assert.strictEqual(response.data[0].tx_hash, '0x42febd46e93ace' +
            'bfc7f81e7a8b0228c5c4fed42de29bb5b4872b09699c28bb3b29e8dbb' +
            'c65eb3a46b60ccb688e8a6d4ffbc341a0d59f7de13d28de2fede5566d');
        assert.strictEqual(response.data[0].address, 'GCOMMONBGUXXP4RFCYGEF74JDJVPUW2GUENGTKKJECDNO6AGO32CUWGU');
        assert.strictEqual(response.data[0].amount, '1663400000');
        assert.strictEqual(response.data[0].fee, '0');
    });

    it ('Test of the path /wallet/transactions/pending/:address - partial address', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/pending")
            .filename("GDAGR22X4IWNEO6FHNY3PYU");

        let response = await client.get (uri.toString())
        assert.strictEqual(response.data.length, 2);
        assert.strictEqual(response.data[0].tx_hash, '0x42febd46e93ace' +
            'bfc7f81e7a8b0228c5c4fed42de29bb5b4872b09699c28bb3b29e8dbb' +
            'c65eb3a46b60ccb688e8a6d4ffbc341a0d59f7de13d28de2fede5566d');
        assert.strictEqual(response.data[0].address, 'GCOMMONBGUXXP4RFCYGEF74JDJVPUW2GUENGTKKJECDNO6AGO32CUWGU');
        assert.strictEqual(response.data[0].amount, '1663400000');
        assert.strictEqual(response.data[0].fee, '0');
    });
});

describe ('Test of the path /utxo', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = axios.create();

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
                utxo: '0xd9482016835acc6defdfd060216a5890e00cf8f0a79ab0b83d3385fc723cd45bfea66eb3587a684518ff1756951d38bf4f07abda96dcdea1c160a4f83e377c32',
                amount: '24400000000000',
                height: '1',
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
        await client.post(url, { transaction: Block.reviver("", sample_data2).txs[0] });
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
});
