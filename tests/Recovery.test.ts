/*******************************************************************************

    Recovery test by constructing a virtual agora node that provides
    only block data

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { AgoraClient } from '../src/modules/agora/AgoraClient';
import { Block, Height, SodiumHelper, Utils } from 'boa-sdk-ts';
import { TestAgora, TestStoa, TestClient, delay, recovery_sample_data } from './Utils'

import * as assert from 'assert';
import express from 'express';
import JSBI from 'jsbi';
import URI from 'urijs';
import { URL } from 'url';
import { IDatabaseConfig } from '../src/modules/common/Config';
import { MockDBConfig } from "./TestConfig"

/**
 * This is an API server for testing and inherited from Stoa.
 * The test code allows the API server to be started and shut down.
 */
class TestRecoveryStoa extends TestStoa
{
    constructor (testDBConfig :IDatabaseConfig,agora_endpoint: URL, port: number | string)
    {
        super(testDBConfig,agora_endpoint, port);

        this.app.get("/block",
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

                let block_height = new Height(req.query.block_height.toString());

                try
                {
                    let rows = await this.ledger_storage.getBlock(block_height);
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
    }
}

describe ('Test of Recovery', () =>
{
    const agora_addr: URL = new URL('http://localhost:2820');
    const stoa_addr: URL = new URL('http://localhost:3837/');
    let agora_node: TestAgora;
    let stoa_server: TestRecoveryStoa;
    let testDBConfig : IDatabaseConfig;

    let client = new TestClient();

    before('Wait for the package libsodium to finish loading', async () =>
    {
        await SodiumHelper.init();
    });

    // Changed test agora to run only once.
    before ('Start TestAgora', (doneIt: () => void) =>
    {
        agora_node = new TestAgora(agora_addr.port, recovery_sample_data, doneIt);
    });

    after ('Stop TestAgora', async () =>
    {
        await agora_node.stop();
    });

    before ('Create TestStoa and start it', async () =>
    {   
         testDBConfig = await MockDBConfig();
        stoa_server = new TestRecoveryStoa(testDBConfig,agora_addr, stoa_addr.port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });
    after ('Stop TestStoa', async () =>
    {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
    });
    it ('Test `getBlocksFrom`', async () =>
    {
        let agora_client = new AgoraClient(agora_addr);

        let blocks: Array<Block> = await agora_client.getBlocksFrom(new Height("1"), 3);
        // The number of blocks is three.
        assert.strictEqual(blocks.length, 3);
        let expected_height : Height = new Height("1");
        for (let block of blocks)
        {
            // Make sure that the received block height is equal to the expected value.
            assert.deepEqual(block.header.height, expected_height);
            expected_height.value = JSBI.add(expected_height.value, JSBI.BigInt(1));
        }
    });

    it ('Test for continuous write', async () =>
    {
        const url = URI(stoa_addr).directory("block_externalized")
            .toString();

        await client.post(url, {block: recovery_sample_data[0]});
        await client.post(url, {block: recovery_sample_data[1]});
        await client.post(url, {block: recovery_sample_data[2]});
        await client.post(url, {block: recovery_sample_data[3]});
        await client.post(url, {block: recovery_sample_data[4]});

        await delay(300);

        // Verifies that all sent blocks are wrote
        for (let idx = 0; idx <= 4; idx++)
        {
            const uri = URI(stoa_addr)
                .directory("block")
                .addSearch("block_height", idx);

            let response = await client.get(uri.toString());
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.height, idx);
        }
    });

    it ('Test for continuous recovery and write', async () =>
    {
        let uri = URI(stoa_addr)
            .directory("block_externalized");

        let url = uri.toString();

        await client.post(url, {block: recovery_sample_data[2]});
        await client.post(url, {block: recovery_sample_data[4]});
        await client.post(url, {block: recovery_sample_data[6]});
        await client.post(url, {block: recovery_sample_data[8]});

        await delay(300);

        // Verifies that all sent blocks are wrote
        for (let idx = 0; idx <= 8; idx++)
        {
            let uri = URI(stoa_addr)
                .directory("block")
                .addSearch("block_height", idx);

            let response = await client.get(uri.toString());
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.height, idx);
        }
    });

    it ('Test for ignoring already wrote block data', async () =>
    {
        agora_node.delay = 100;

        let uri = URI(stoa_addr)
            .directory("block_externalized");

        let url = uri.toString();

        await client.post(url, {block: recovery_sample_data[0]});
        await client.post(url, {block: recovery_sample_data[1]});
        // Blocks 2 is recovered, Block 3 is saved
        await client.post(url, {block: recovery_sample_data[3]});
        await client.post(url, {block: recovery_sample_data[4]});

        // Block 3 is ignored.
        // If Block 3 was not ignored and attempted to write
        // to the database, an error would occur.
        await client.post(url, {block: recovery_sample_data[3]});
        await delay(300);

        // Verifies that all sent blocks are wrote
        for (let idx = 0; idx <= 4; idx++)
        {
            let uri = URI(stoa_addr)
                .directory("block")
                .addSearch("block_height", idx);

            let response = await client.get(uri.toString());
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.height, idx);
        }
    });

    it ('Test recovery of more blocks than the maximum number of blocks that can be recovered at a time', async () =>
    {
        stoa_server.max_count_on_recovery = 2;
        agora_node.delay = 0;

        let uri = URI(stoa_addr)
            .directory("block_externalized");

        let url = uri.toString();

        await client.post(url, {block: recovery_sample_data[0]});
        await client.post(url, {block: recovery_sample_data[9]});
        await delay(300);

        // Verifies that all sent blocks are wrote
        for (let idx = 0; idx <= 9; idx++)
        {
            let uri = URI(stoa_addr)
                .directory("block")
                .addSearch("block_height", idx);

            let response = await client.get(uri.toString());
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.height, idx);
        }
    });
});
