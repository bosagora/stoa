/*******************************************************************************

    Utilities and sample data that can be used within the test suitea

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import { URL } from 'url';

import Stoa from '../src/Stoa';


export const sample_data_raw = (() => {
    return [
        fs.readFileSync('tests/data/Block.0.sample1.json', 'utf-8'),
        fs.readFileSync('tests/data/Block.1.sample1.json', 'utf-8'),
    ];
})();

export const sample_data =
    (() => {
        let record = [];
        for (let elem of sample_data_raw)
            record.push(JSON.parse(elem));
        return record;
    })();

export const sample_data2 =
    (() => {
        let data: string = fs.readFileSync('tests/data/Block.2.sample1.json', 'utf-8');
        return JSON.parse(data);
    })();

export const sample_preImageInfo =
    {
        "enroll_key": "0x46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac",
        "hash": "0x790ab7c8f8ddbf012561e70c944c1835fd1a873ca55c973c828164906f8b35b924df7bddcafade688ad92cfb4414b2cf69a02d115dc214bbd00d82167f645e7e",
        "distance": 6
    };

export const sample_reEnroll_preImageInfo =
    {
        "enroll_key": "0x46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac",
        "hash": "0xe51e1cc8dfdcdcd02586c9648c6977504eade2dffc8f3289e7ae7e501c2879f99af6a199ccad499be02a66d409ca4ab51b35f1c3a06a82464ce4efcfeb3ade33",
        "distance": 6
    };

/**
 * This is an Agora node for testing.
 * The test code allows the Agora node to be started and shut down.
 */
export class TestAgora
{
    public server: http.Server;

    public agora: express.Application;

    // Add latency to induce new blocks to arrive during write of the previous block.
    public delay: number = 0;

    /**
     * The blocks that this Agora instance will serve
     */
    private blocks: any[];

    constructor (port: string, blocks: any[], done: () => void)
    {
        this.agora = express();

        this.blocks = blocks;

        this.agora.get("/block_height",
            (req: express.Request, res: express.Response) =>
        {
            res.status(200).send(JSON.stringify(Number(this.blocks.length - 1)));
        });

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

            block_height = Math.min(block_height, this.blocks.length - 1);
            max_blocks = Math.min(max_blocks, 1000);

            let data = this.blocks.slice(
                block_height,
                Math.min(block_height + max_blocks, this.blocks.length)
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

    public stop (): Promise<void>
    {
        return new Promise<void>((resolve, reject) => {
            this.server.close((err?) => { err === undefined ? resolve() : reject(err); });
        });
    }
}

/**
 * This is an API server for testing and inherited from Stoa.
 * The test code allows the API server to be started and shut down.
 */
export class TestStoa extends Stoa
{
    constructor (agora_endpoint: URL, port: number | string)
    {
        super(":memory:", agora_endpoint, port, "127.0.0.1");
    }

    public stop (): Promise<void>
    {
        return new Promise<void>((resolve, reject) => {
            if (this.server != null)
                this.server.close((err?) => { err === undefined ? resolve() : reject(err); });
            else
                resolve();
        });
    }
}
