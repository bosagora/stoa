/*******************************************************************************

    Recovery test by constructing a virtual agora node that provides
    only block data

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { AgoraClient } from '../src/modules/agora/AgoraClient';
import { Block, Height } from '../src/modules/data';
import { recovery_sample_data } from './RecoveryData.test';
import Stoa from '../src/Stoa';
import { Utils } from '../src/modules/utils/Utils';

import * as assert from 'assert';
import axios from 'axios';
import express from 'express';
import * as http from 'http';
import { UInt64 } from 'spu-integer-math';
import URI from 'urijs';

/**
 * This is an Agora node for testing.
 * The test code allows the Agora node to be started and shut down.
 */
class TestAgora
{
    public server: http.Server;

    public agora: express.Application;

    // Add latency to induce new blocks to arrive during write of the previous block.
    public delay: number = 0;

    constructor (port: string, done: () => void)
    {
        this.agora = express();

        this.agora.get("/blocks_from",
            (req: express.Request, res: express.Response) =>
        {
            if  (
                    (req.query.block_height === undefined) ||
                    (req.query.max_blocks === undefined) ||
                    Number.isNaN(req.query.block_height) ||
                    Number.isNaN(req.query.max_blocks)
                )
            {
                res.status(200).send(JSON.stringify([]));
                return;
            }

            let block_height = Math.max(Number(req.query.block_height), 0);
            let max_blocks = Math.max(Number(req.query.max_blocks), 0);

            block_height = Math.min(block_height, recovery_sample_data.length - 1);
            max_blocks = Math.min(max_blocks, 1000);

            let data = recovery_sample_data.slice(
                block_height,
                Math.min(block_height + max_blocks, recovery_sample_data.length)
            );

            if (this.delay > 0)
            {
                setTimeout(() =>
                {
                    res.status(200).send(JSON.stringify(data));
                }, this.delay);
            }
            else
            {
                res.status(200).send(JSON.stringify(data));
            }
        });

        // Shut down
        this.agora.get("/stop",
            (req: express.Request, res: express.Response) =>
        {
            res.send("The test server is stopped.");
            this.server.close();
        });

        // Start to listen
        this.server = this.agora.listen(port, () =>
        {
            done();
        });
    }

    public stop (callback?: (err?: Error) => void)
    {
        this.server.close(callback);
    }
}

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

        this.stoa.get("/block",
            async (req: express.Request, res: express.Response) =>
            {
                if  (
                    (req.query.block_height === undefined) ||
                    !Utils.isPositiveInteger(req.query.block_height.toString())
                )
                {
                    res.status(204).send();
                    return;
                }

                let block_height = new Height(UInt64.fromString(req.query.block_height.toString()));

                try
                {
                    let rows = await this.ledger_storage.getBlocks(block_height);
                    if (rows.length > 0)
                        res.status(200).send(rows[0]);
                    else
                        res.status(400).send();
                }
                catch (error)
                {
                    res.status(500).send();
                }
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

describe ('Test of Recovery', () =>
{
    let agora_host: string = 'http://localhost';
    let agora_port: string = '2820';
    let agora_node: TestAgora;

    let stoa_host: string = 'http://localhost';
    let stoa_port: string = '3837';
    let stoa_server : TestStoa;

    let client = axios.create();

    beforeEach ('Start TestAgora', (doneIt: () => void) =>
    {
        agora_node = new TestAgora(agora_port, () =>
        {
            stoa_server = new TestStoa(":memory:", agora_host, agora_port, stoa_port, () =>
            {
                doneIt();
            });
        });
    });

    afterEach ('Stop TestAgora', (doneIt: () => void) =>
    {
        stoa_server.stop(() =>
        {
            agora_node.stop(() =>
            {
                doneIt();
            });
        });
    });

    it ('Test a function requestBlocks', async () =>
    {
        let agora_client = new AgoraClient(agora_host, agora_port);

        await assert.doesNotReject(async () =>
        {
            await agora_client.requestBlocks(new Height(UInt64.fromNumber(1)), 3)
                .then((response) =>
                {
                    // The number of blocks is three.
                    assert.strictEqual(response.length, 3);
                    let expected_height = UInt64.fromNumber(1);
                    for (let elem of response)
                    {
                        let block = new Block();
                        block.parseJSON(elem);
                        // Make sure that the received block height is equal to the expected value.
                        assert.ok(UInt64.compare(block.header.height.value, expected_height) == 0);
                        expected_height = UInt64.add(expected_height, 1);
                    }
                })
                .catch((error) =>
                {
                    assert.ok(false, error);
                });
        });
    });

    it ('Test a function requestBlocks using async, await', (doneIt: () => void) =>
    {
        let agora_client = new AgoraClient(agora_host, agora_port);

        assert.doesNotThrow(async () =>
        {
            let response = await agora_client.requestBlocks(new Height(UInt64.fromNumber(8)), 3);
            // The number of blocks is two.
            // Because the total number is 10. The last block height is 9.
            assert.strictEqual(response.length, 2);
            let expected_height = UInt64.fromNumber(8);
            for (let elem of response)
            {
                let block = new Block();
                block.parseJSON(elem);
                // Make sure that the received block height is equal to the expected value.
                assert.ok(UInt64.compare(block.header.height.value, expected_height) == 0);
                expected_height = UInt64.add(expected_height, 1);
            }
            doneIt();
        });
    });

    it ('Test for continuous write', (doneIt: () => void) =>
    {
        (async () =>
        {

            let uri = URI(stoa_host)
                .port(stoa_port)
                .directory("block_externalized");

            let url = uri.toString();

            await client.post(url, {block: recovery_sample_data[0]});
            await client.post(url, {block: recovery_sample_data[1]});
            await client.post(url, {block: recovery_sample_data[2]});
            await client.post(url, {block: recovery_sample_data[3]});
            await client.post(url, {block: recovery_sample_data[4]});

            setTimeout(async () =>
            {
                // Verifies that all sent blocks are wrote
                for (let idx = 0; idx <= 4; idx++)
                {
                    let uri = URI(stoa_host)
                        .port(stoa_port)
                        .directory("block")
                        .addSearch("block_height", idx);

                    let response = await client.get(uri.toString());
                    assert.strictEqual(response.status, 200);
                    assert.strictEqual(response.data.height, idx);
                }

                doneIt();

            }, 300);
        })();
    });

    it ('Test for continuous recovery and write', (doneIt: () => void) =>
    {
        (async () =>
        {
            let uri = URI(stoa_host)
                .port(stoa_port)
                .directory("block_externalized");

            let url = uri.toString();

            await client.post(url, {block: recovery_sample_data[2]});

            setTimeout(() =>
            {
                client.post(url, {block: recovery_sample_data[4]});
            }, 15);

            setTimeout(() =>
            {
                client.post(url, {block: recovery_sample_data[6]});
            }, 30);

            setTimeout(() =>
            {
                client.post(url, {block: recovery_sample_data[8]});
            }, 45);

            setTimeout(async () =>
            {
                // Verifies that all sent blocks are wrote
                for (let idx = 0; idx <= 8; idx++)
                {
                    let uri = URI(stoa_host)
                        .port(stoa_port)
                        .directory("block")
                        .addSearch("block_height", idx);

                    let response = await client.get(uri.toString());
                    assert.strictEqual(response.status, 200);
                    assert.strictEqual(response.data.height, idx);
                }

                doneIt();

            }, 800);
        })();
    });

    it ('Test for ignoring already wrote block data', (doneIt: () => void) =>
    {
        (async () =>
        {
            agora_node.delay = 100;

            let uri = URI(stoa_host)
                .port(stoa_port)
                .directory("block_externalized");

            let url = uri.toString();

            await client.post(url, {block: recovery_sample_data[0]});

            // Delay to wait for data added to the pool to be processed.
            setTimeout(() =>
            {
                client.post(url, {block: recovery_sample_data[1]});
            }, 15);

            // Blocks 2 is recovered, Block 3 is saved
            setTimeout(() =>
            {
                client.post(url, {block: recovery_sample_data[3]});
            }, 30);

            // Make sure Block 4 arrives during the saving of Block 2, and 3.
            // 100ms - 30ms < 100ms(agora_node.delay)
            setTimeout(() =>
            {
                client.post(url, {block: recovery_sample_data[4]});
            }, 100);

            // Block 3 is ignored.
            // If Block 3 was not ignored and attempted to write
            // to the database, an error would occur.
            setTimeout(() =>
            {
                client.post(url, {block: recovery_sample_data[3]});
            }, 130);

            setTimeout(async () =>
            {
                // Verifies that all sent blocks are wrote
                for (let idx = 0; idx <= 4; idx++)
                {
                    let uri = URI(stoa_host)
                        .port(stoa_port)
                        .directory("block")
                        .addSearch("block_height", idx);

                    let response = await client.get(uri.toString());
                    assert.strictEqual(response.status, 200);
                    assert.strictEqual(response.data.height, idx);
                }

                doneIt();

            }, 300);
        })();
    });

    it ('Test recovery of more blocks than the maximum number of blocks that can be recovered at a time', (doneIt: () => void) =>
    {
        (async () =>
        {
            stoa_server.max_count_on_recovery = 2;
            agora_node.delay = 0;

            let uri = URI(stoa_host)
                .port(stoa_port)
                .directory("block_externalized");

            let url = uri.toString();

            await client.post(url, {block: recovery_sample_data[0]});
            await client.post(url, {block: recovery_sample_data[9]});

            setTimeout(async () =>
            {
                // Verifies that all sent blocks are wrote
                for (let idx = 0; idx <= 9; idx++)
                {
                    let uri = URI(stoa_host)
                        .port(stoa_port)
                        .directory("block")
                        .addSearch("block_height", idx);

                    let response = await client.get(uri.toString());
                    assert.strictEqual(response.status, 200);
                    assert.strictEqual(response.data.height, idx);
                }

                doneIt();

            }, 300);
        })();
    });
});
