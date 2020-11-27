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
import { FullNodeAPI } from '../src/modules/agora/AgoraClient';
import { Block, Hash, Height, PreImageInfo } from 'boa-sdk-ts';

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
export class TestAgora implements FullNodeAPI
{
    public server: http.Server;

    public agora: express.Application;

    // Add latency to induce new blocks to arrive during write of the previous block.
    public delay: number = 0;

    /**
     * The blocks that this Agora instance will serve
     */
    private blocks: any[];

    /**
     * Construct an instance of this class
     *
     * @param port   The port to bind to
     * @param blocks The initial state of the blockchain
     * @param done   A delegate to forward to express' `listen` method
     *
     * This construct a new instance of `TestAgora` and sets up the handlers.
     * Note that the handlers will do parameter validation and deserialization,
     * then forward to the appropriate methods, which are implementation of the
     * `FullNodeAPI` interface.
     *
     * There are two kind of handlers that can be written: regular and `Promise`-based.
     * - For `Promise`-based handlers, if parameter validation fails,
     *   the handler will return using `Promise.reject`,
     *   or otherwise `return` the result of the method it forwards to directly.
     * - For "regular" method, the handler will call a method on `res`,
     *   using `then` on the result of the method it wraps.
     *
     * When possible, prefer using the `Promise`-based approach.
     */
    constructor (port: string, blocks: any[], done: () => void)
    {
        this.agora = express();

        this.blocks = blocks;

        this.agora.get("/block_height",
            (req: express.Request, res: express.Response, next) =>
        {
            return this.getBlockHeight().then((result) => { res.json(result); }, next);
        });

        this.agora.get("/blocks_from",
            (req: express.Request, res: express.Response, next) =>
        {
            if (req.query.block_height === undefined || Number.isNaN(req.query.block_height))
            {
                res.status(400).json({ statusText: 'Missing or invalid block_height query parameter' });
                return;
            }
            if (req.query.max_blocks === undefined || Number.isNaN(req.query.max_blocks))
            {
                res.status(400).json({ statusText: 'Missing or invalid max_blocks query parameter' });
                return;
            }

            let block_height = new Height(BigInt(req.query.block_height));
            if (block_height.value < 0n)
            {
                res.status(400).json({ statusText: 'Query parameter block_height must not be negative' });
                return;
            }

            // Slightly stricter requirement than Agora (strictly positive instead of positive)
            // as we don't want Stoa to request 0 blocks
            let max_blocks = Number(req.query.max_blocks);
            if (max_blocks <= 0)
            {
                res.status(400).json({ statusText: 'Query parameter max_block must be strictly positive' });
                return;
            }

            this.getBlocksFrom(block_height, max_blocks).then((result) => {
                // Adds an artificial delay to our responses
                if (this.delay > 0)
                    setTimeout(() => { res.json(result); }, this.delay);
                else
                    res.json(result);
            }, next);
        });

        this.agora.get("/preimage", (req: express.Request, res: express.Response, next) => {
            if (req.query.enroll_key === undefined)
                return Promise.reject(new Error('Missing query parameter enroll_key'));
            else
                return this.getPreimage(new Hash(req.query.enroll_key.toString()))
                    .then((result) => { res.json(result); }, next);
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

    /// Implements FullNodeAPI.getBlockHeight
    public getBlockHeight (): Promise<Height>
    {
        return Promise.resolve(new Height(BigInt(this.blocks.length - 1)));
    }

    /// Implements FullNodeAPI.getBlocksFrom
    public getBlocksFrom (block_height: Height, max_blocks: number): Promise<Block[]>
    {
        // Follow what Agora is doing
        max_blocks = Math.min(max_blocks, 1000);

        if (block_height.value >= BigInt(this.blocks.length))
            return Promise.resolve([]);

        // FIXME: Should handle > 2^53 but we're safe for the time being
        const block_height_ = Number(BigInt.asUintN(64, block_height.value));

        return Promise.resolve(
            this.blocks.slice(
                block_height_,
                Math.min(block_height_ + max_blocks, this.blocks.length)
            )
        );
    }

    /// Implements FullNodeAPI.getPreimage
    public getPreimage (enroll_key: Hash): Promise<PreImageInfo>
    {
        return Promise.reject("Not implemented");
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
