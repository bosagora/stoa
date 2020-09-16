/*******************************************************************************

    Test API Server Stoa

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Block, Enrollment, Height, Hash, Signature } from '../src/modules/data';
import {
    sample_data,
    sample_preImageInfo,
    sample_reEnroll_preImageInfo
} from './SampleData.test';
import Stoa from '../src/Stoa';
import { TaskManager } from '../src/modules/task/TaskManager';

import * as assert from 'assert';
import axios from 'axios';
import express from 'express';
import * as http from 'http';
import { UInt64 } from 'spu-integer-math';
import URI from 'urijs';

/**
 * This is an API server for testing and inherited from Stoa.
 * The test code allows the API server to be started and shut down.
 */
class TestStoa extends Stoa
{
    public server: http.Server;

    constructor (file_name: string, agora_address: string, agora_port: string, port: string, done: () => void)
    {
        super(file_name, agora_address, agora_port);

        // Shut down
        this.stoa.get("/stop", (req: express.Request, res: express.Response) =>
        {
            res.send("The test server is stopped.");
            this.server.close();
        });

        // Start to listen
        this.server = this.stoa.listen(port, () =>
        {
            done();
        });
    }

    public stop (callback?: (err?: Error) => void)
    {
        this.task_manager.terminate();
        this.server.close(callback);
    }
}

describe ('Test of Stoa API Server', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server : TestStoa;
    let client = axios.create();

    before ('Start Stoa API Server', (doneIt: () => void) =>
    {
        stoa_server = new TestStoa(":memory:", "127.0.0.1", "2826", port, doneIt);
    });

    after ('Stop Stoa API Server', (doneIt: () => void) =>
    {
        stoa_server.stop(() =>
        {
            doneIt();
        });
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
                assert.strictEqual(response.data.length, 3);
                assert.strictEqual(response.data[0].address,
                    "GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN");
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
            .filename("GBJABNUCDJCIL5YJQMB5OZ7VCFPKYLMTUXM2ZKQJACT7PXL7EVOMEKNZ")
            .setSearch("height", "10");

        client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 1);
                assert.strictEqual(response.data[0].address,
                    "GBJABNUCDJCIL5YJQMB5OZ7VCFPKYLMTUXM2ZKQJACT7PXL7EVOMEKNZ");
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
            let response = await client.post (uri.toString(), {pre_image: sample_preImageInfo});
            assert.strictEqual(response.status, 200);
        })();

        // Wait for the data added to the pool to be processed.
        setTimeout(async () =>
        {
            let uri2 = URI(host)
                .port(port)
                .directory("validator")
                .filename("GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN")
                .setSearch("height", "7");

            let response = await client.get (uri2.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 6);
            assert.strictEqual(response.data[0].preimage.hash,
                "0x4869b90d82af612dac15b6f152700b2e0f0b4a198fa09d83853d4ac3be4032b051c48806692b37776534f2ae7b404c9221ae1c9616fe50e3585d63e607d0afc6");

            let uri3 = URI(host)
                .port(port)
                .directory("validator")
                .filename("GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN")
                .setSearch("height", "1");
            response = await client.get (uri3.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 0);
            assert.strictEqual(response.data[0].preimage.hash,
                "0xba665738077b352ed93c2d30882bd0505cf1147ed7610fd43d8bfe72cb29eee3b9b95a81bb3550c23dfa811bde4a7290d1dba85097b064de3557878fe62fd6ab");

            let uri4 = URI(host)
                .port(port)
                .directory("validator")
                .filename("GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN")
                .setSearch("height", "8");
            response = await client.get (uri4.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, null);
            assert.strictEqual(response.data[0].preimage.hash, Hash.NULL.toString());

            let uri5 = URI(host)
                .port(port)
                .directory("validators");
            response = await client.get (uri5.toString());
            assert.strictEqual(response.data.length, 3);
            assert.strictEqual(response.data[0].preimage.distance, 0);
            assert.strictEqual(response.data[0].preimage.hash,
                "0xba665738077b352ed93c2d30882bd0505cf1147ed7610fd43d8bfe72cb29eee3b9b95a81bb3550c23dfa811bde4a7290d1dba85097b064de3557878fe62fd6ab");

            let block = new Block();
            let height = new Height();
            let enrollment = new Enrollment();
            height.value = UInt64.fromNumber(1008);
            block.header.height = height;

            // re-enrollment
            enrollment.cycle_length = 1008;
            enrollment.utxo_key =
                Hash.createFromString("0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3bfc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a");
            enrollment.enroll_sig =
                Signature.createFromString("0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8125cf6b04274cc4db34bfd");
            enrollment.random_seed =
                Hash.createFromString("0xe0c04a5bd47ffc5b065b7d397e251016310c43dc77220bf803b73f1183da00b0e67602b1f95cb18a0059aa1cdf2f9adafe979998364b38cd5c15d92b9b8fd815");
            block.header.enrollments.push(enrollment);

            // put the re-enrollment
            await stoa_server.ledger_storage.putEnrollments(block);

            let uri6 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "1008");

            response = await client.get (uri6.toString());
            assert.strictEqual(response.data.length, 3);

            assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            assert.strictEqual(response.data[0].enrolled_at, 0);

            let uri7 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "1009");

            response = await client.get (uri7.toString());
            assert.strictEqual(response.data.length, 1);

            assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            assert.strictEqual(response.data[0].enrolled_at, 1008);

            let uri8 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "2016");

            response = await client.get (uri8.toString());
            assert.strictEqual(response.data.length, 1);

            assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
            assert.strictEqual(response.data[0].enrolled_at, 1008);

            let uri9 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "2017");

            response = await client.get (uri9.toString());
            assert.strictEqual(response.data.length, 0);
        }, 100);

        // Wait for the data added to the pool to be processed.
        setTimeout(async () =>
        {
            // push the re-enroll's preImage
            let uri10 = URI(host)
            .port(port)
            .directory("preimage_received");
            let response = await client.post (uri10.toString(), {pre_image: sample_reEnroll_preImageInfo});
            assert.strictEqual(response.status, 200);
        }, 200);

        // Wait for the data added to the pool to be processed.
        setTimeout(async () =>
        {
            let uri11 = URI(host)
            .port(port)
            .directory("validators")
            .setSearch("height", "1015");

            let response = await client.get (uri11.toString());
            assert.strictEqual(response.data.length, 1);
            assert.strictEqual(response.data[0].preimage.distance, 6);
            assert.strictEqual(response.data[0].preimage.hash, sample_reEnroll_preImageInfo.hash);
            doneIt();
        }, 300);
    });
});

describe ('Test of TaskManager', () =>
{
    // If the task is not finished, it does not restart.
    it ('Test that only the expected number of times is running', (doneIt: () => void) =>
    {
        let storage: number[] = [];
        let idx = 0;

        function task (): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                setTimeout(() =>
                {
                    storage.push(idx++);
                    resolve();
                }, 50);
            });
        }

        let task_manager = new TaskManager(task, 10);

        setTimeout(() =>
        {
            task_manager.terminate();
            assert.deepStrictEqual(storage, [0, 1]);
            doneIt();
        }, 150);
    });
});
