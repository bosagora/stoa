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
import { TestAgora } from './Utils'
import Stoa from '../src/Stoa';
import { Utils } from '../src/modules/utils/Utils';

import * as assert from 'assert';
import axios from 'axios';
import express from 'express';
import URI from 'urijs';
import { URL } from 'url';

/**
 * This is an API server for testing and inherited from Stoa.
 * The test code allows the API server to be started and shut down.
 */
class TestStoa extends Stoa
{
    constructor (file_name: string, agora_endpoint: URL, port: string)
    {
        super(file_name, agora_endpoint, port);

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
    }

    public stop () : Promise<void>
    {
        return new Promise<void>((resolve, reject) => {
            if (this.server != null)
                this.server.close((err?) => { err === undefined ? resolve() : reject(err); });
            else
                resolve();
        });
    }
}

describe ('Test of Recovery', () =>
{
    const agora_addr: URL = new URL('http://localhost:2820');
    const stoa_addr: URL = new URL('http://localhost:3837/');
    let agora_node: TestAgora;
    let stoa_server : TestStoa;

    let client = axios.create();

    // Changed test agora to run only once.
    before ('Start TestAgora', (doneIt: () => void) =>
    {
        agora_node = new TestAgora(agora_addr.port, recovery_sample_data, doneIt);
    });

    after ('Stop TestAgora', () =>
    {
        return agora_node.stop();
    });

    beforeEach ('Start TestStoa', () =>
    {
        stoa_server = new TestStoa(":memory:", agora_addr, stoa_addr.port);
        return stoa_server.start();
    });

    afterEach ('Stop TestStoa', () =>
    {
        return stoa_server.stop();
    });

    it ('Test `getBlocksFrom`', async () =>
    {
        let agora_client = new AgoraClient(agora_addr);

        await assert.doesNotReject(async () =>
        {
            await agora_client.getBlocksFrom(new Height(1n), 3)
                .then((response) =>
                {
                    // The number of blocks is three.
                    assert.strictEqual(response.length, 3);
                    let expected_height : Height = new Height(1n);
                    for (let elem of response)
                    {
                        let block = new Block();
                        block.parseJSON(elem);
                        // Make sure that the received block height is equal to the expected value.
                        assert.deepEqual(block.header.height, expected_height);
                        expected_height.value += 1n;
                    }
                })
                .catch((error) =>
                {
                    assert.ok(false, error);
                });
        });
    });

    it ('Test a `getBlocksFrom` using async, await', (doneIt: () => void) =>
    {
        let agora_client = new AgoraClient(agora_addr);

        assert.doesNotThrow(async () =>
        {
            let response = await agora_client.getBlocksFrom(new Height(8n), 3);
            // The number of blocks is two.
            // Because the total number is 10. The last block height is 9.
            assert.strictEqual(response.length, 2);
            let expected_height : Height = new Height(8n);
            for (let elem of response)
            {
                let block = new Block();
                block.parseJSON(elem);
                // Make sure that the received block height is equal to the expected value.
                assert.deepEqual(block.header.height, expected_height);
                expected_height.value += 1n;
            }
            doneIt();
        });
    });

    it ('Test for continuous write', (doneIt: () => void) =>
    {
        (async () =>
        {
            const url = URI(stoa_addr).directory("block_externalized")
                .toString();

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
                    const uri = URI(stoa_addr)
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
            let uri = URI(stoa_addr)
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
                    let uri = URI(stoa_addr)
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

            let uri = URI(stoa_addr)
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
                    let uri = URI(stoa_addr)
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

            let uri = URI(stoa_addr)
                .directory("block_externalized");

            let url = uri.toString();

            await client.post(url, {block: recovery_sample_data[0]});
            await client.post(url, {block: recovery_sample_data[9]});

            setTimeout(async () =>
            {
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

                doneIt();

            }, 300);
        })();
    });
});
