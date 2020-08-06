/*******************************************************************************

    Recovery test by constructing a virtual agora node that provides
    only block data

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

 *******************************************************************************/

import * as assert from 'assert';
import { Block } from "../src/modules/data";
import { AgoraClient } from "../src/modules/agora/AgoraClient";
import { recovery_sample_data } from "./RecoveryData.test";

import express from "express";
import * as http from "http";

/**
 * This is an Agora node for testing.
 * The test code allows the Agora node to be started and shut down.
 */
class TestAgora
{
    public server: http.Server;

    public agora: express.Application;

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

            res.status(200).send(JSON.stringify(data));
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

describe ('Test of Recovery', () =>
{
    let agora_host: string = 'http://localhost';
    let agora_port: string = '2820';
    let agora_node: TestAgora;

    before ('Start TestAgora', (doneIt: () => void) =>
    {
        agora_node = new TestAgora(agora_port, doneIt);
    });

    after ('Stop TestAgora', (doneIt: () => void) =>
    {
        agora_node.stop(() => {
            doneIt();
        });
    });

    it ('Test a function requestBlocks', async () =>
    {
        let agora_client = new AgoraClient(agora_host, agora_port);

        await assert.doesNotReject(async () =>
        {
            await agora_client.requestBlocks(1, 3)
                .then((response) =>
                {
                    // The number of blocks is three.
                    assert.strictEqual(response.length, 3);
                    let expected_height = 1;
                    for (let elem of response)
                    {
                        let block = new Block();
                        block.parseJSON(elem);
                        // Make sure that the received block height is equal to the expected value.
                        assert.strictEqual(block.header.height.value, expected_height);
                        expected_height++;
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
            let response = await agora_client.requestBlocks(8, 3);
            // The number of blocks is two.
            // Because the total number is 10. The last block height is 9.
            assert.strictEqual(response.length, 2);
            let expected_height = 8;
            for (let elem of response)
            {
                let block = new Block();
                block.parseJSON(elem);
                // Make sure that the received block height is equal to the expected value.
                assert.strictEqual(block.header.height.value, expected_height);
                expected_height++;
            }
            doneIt();
        });
    });
});
