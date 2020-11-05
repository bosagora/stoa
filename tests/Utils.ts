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

export const sample_preImageInfo =
    {
        "enroll_key": "0x46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac",
        "hash": "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328",
        "distance": 6
    };

export const sample_reEnroll_preImageInfo =
    {
        "enroll_key": "0x46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac",
        "hash": "0x25677ee5a05590d68276d1967cbe37e3cf3e731502afd043fafc82b0181cd120cef6272e5aea2dafaca0236a4ce7c1edd4fe21ae770930a8e206bd7080066a4c",
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
