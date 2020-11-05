/*******************************************************************************

    Test API Server Stoa

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    BitField, Block, BlockHeader, Enrollment, Height, Hash, Signature
} from '../src/modules/data';
import {
    sample_data,
    sample_preImageInfo,
    sample_reEnroll_preImageInfo,
    TestAgora,
    TestStoa,
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

    before ('Start Stoa API Server and a fake Agora', () =>
    {
        let prom = new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", sample_data, resolve);
        });
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        return prom.then(() => { return stoa_server.start() });
    });

    after ('Stop Stoa and Agora server instances', () =>
    {
        return stoa_server.stop().then(() => { return agora_server.stop() });
    });

    it ('Test of the path /block_externalized', (doneIt: () => void) =>
    {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();
        assert.doesNotThrow(async () =>
        {
            await client.post(url, {block: sample_data[0]});
            await client.post(url, {block: sample_data[1]});
            setTimeout(() =>
            {
                doneIt();
            }, 100);
        });
    });

    it ('Test of the path /validators', (doneIt: () => void) =>
    {
        let uri = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "10");

        client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 6);
                assert.strictEqual(response.data[0].address,
                    "GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY");
                assert.strictEqual(response.data[0].preimage.distance, null);
            })
            .catch((error) =>
            {
                assert.ok(!error, error);
            })
            .finally(doneIt);
    });

    it ('Test of the path /validator', (doneIt: () => void) =>
    {
        let uri = URI(host)
            .port(port)
            .directory("validator")
            .filename("GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY")
            .setSearch("height", "10");

        client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 1);
                assert.strictEqual(response.data[0].address,
                    "GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY");
                assert.strictEqual(response.data[0].preimage.distance, null);
            })
            .catch((error) =>
            {
                assert.ok(!error, error);
            })
            .finally(doneIt);
    });

    it ('Tests that sending a pre-image with get /validator and /validators', (doneIt: () => void) =>
    {
        (async () =>
        {
            let uri = URI(host)
                .port(port)
                .directory("preimage_received");
            let response = await client.post (uri.toString(), { preimage: sample_preImageInfo });
            assert.strictEqual(response.status, 200);
        })();

        // Wait for the data added to the pool to be processed.
        setTimeout(async () =>
        {
            let uri2 = URI(host)
                .port(port)
                .directory("validator")
                .filename("GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY")
                .setSearch("height", "7");

            let response = await client.get (uri2.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 6);
            assert.strictEqual(response.data[0].preimage.hash,
                "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328");

            let uri3 = URI(host)
                .port(port)
                .directory("validator")
                .filename("GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY")
                .setSearch("height", "1");
            response = await client.get (uri3.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 0);
            assert.strictEqual(response.data[0].preimage.hash,
                "0x00b72d857beb3f5b3dd378fed5df1f20dad68a3710082b10d48d47d1ac09fabfd0d4463ee1a34ef499d7c0dd09f644e32fc1f315f68f67c35b9d99b228be6377");

            let uri4 = URI(host)
                .port(port)
                .directory("validator")
                .filename("GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY")
                .setSearch("height", "8");
            response = await client.get (uri4.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, null);
            assert.strictEqual(response.data[0].preimage.hash, Hash.NULL.toString());

            let uri5 = URI(host)
                .port(port)
                .directory("validators");
            response = await client.get (uri5.toString());
            assert.strictEqual(response.data.length, 6);
            assert.strictEqual(response.data[0].preimage.distance, 0);
            assert.strictEqual(response.data[0].preimage.hash,
                "0x00b72d857beb3f5b3dd378fed5df1f20dad68a3710082b10d48d47d1ac09fabfd0d4463ee1a34ef499d7c0dd09f644e32fc1f315f68f67c35b9d99b228be6377");

            // re-enrollment
            const enroll_sig =
                new Signature("0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8125cf6b04274cc4db34bfd");
            const utxo_key =
                new Hash("0x46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac");
            const random_seed =
                new Hash("0xe0c04a5bd47ffc5b065b7d397e251016310c43dc77220bf803b73f1183da00b0e67602b1f95cb18a0059aa1cdf2f9adafe979998364b38cd5c15d92b9b8fd815");
            const enrollment = new Enrollment(utxo_key, random_seed, 20, enroll_sig);
            const header = new BlockHeader(
                Hash.NULL, new Height(20n), Hash.NULL, new BitField([]),
                new Signature(Buffer.alloc(Signature.Width)), [ enrollment ]);
            const block = new Block(header, [], []);

            // put the re-enrollment
            await stoa_server.ledger_storage.putEnrollments(block);

            let uri6 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "20");

            response = await client.get (uri6.toString());
            assert.strictEqual(response.data.length, 6);

            assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            assert.strictEqual(response.data[0].enrolled_at, "0");

            let uri7 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "21");

            response = await client.get (uri7.toString());
            assert.strictEqual(response.data.length, 1);

            assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            assert.strictEqual(response.data[0].enrolled_at, "20");

            let uri8 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "40");

            response = await client.get (uri8.toString());
            assert.strictEqual(response.data.length, 1);

            assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            assert.strictEqual(response.data[0].enrolled_at, "20");

            let uri9 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "41");

            response = await client.get (uri9.toString());
            assert.strictEqual(response.data.length, 0);

            doneIt();
        }, 200);

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
});
