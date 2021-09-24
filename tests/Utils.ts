/*******************************************************************************

    Utilities and sample data that can be used within the test suitea

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import express, { NextFunction, Request, response, Response } from "express";
import * as fs from "fs";
import * as http from "http";
import { Schema } from "mongoose";
import { URL } from "url";

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import {
    BitMask,
    Block,
    BlockHeader,
    handleNetworkError,
    Hash,
    hashFull,
    hashMulti,
    Height,
    JSBI,
    PreImageInfo,
    Signature,
    Transaction,
} from "boa-sdk-ts";
import { FullNodeAPI } from "../src/modules/agora/AgoraClient";
import { IDatabaseConfig } from "../src/modules/common/Config";
import Stoa from "../src/Stoa";

import sinon from "sinon";
import { CoinMarketService } from "../src/modules/service/CoinMarketService";
import { VoteraService } from "../src/modules/service/VoteraService";

export const sample_data_raw = (() => {
    return [
        fs.readFileSync("tests/data/Block.0.sample1.json", "utf-8"),
        fs.readFileSync("tests/data/Block.1.sample1.json", "utf-8"),
    ];
})();
export const block1_sample_updated_header_data_raw = (() => {
    return [fs.readFileSync("tests/data/Block.1.updated_header.sample.json", "utf-8")];
})();
export const marketcap_sample_data_raw = (() => {
    return [fs.readFileSync("tests/data/marketcap.sample1.json", "utf-8")];
})();
export const market_cap_history_sample_data_raw = (() => {
    return [fs.readFileSync("tests/data/Recovery.marketcap.sample1.json", "utf-8")];
})();

export const block1_sample_updated_header_data = (() => {
    const record = [];
    for (const elem of block1_sample_updated_header_data_raw) record.push(JSON.parse(elem));
    return record;
})();

export const market_cap_sample_data = (() => {
    const record = [];
    for (const elem of marketcap_sample_data_raw) record.push(JSON.parse(elem));
    return record;
})();

export const market_cap_history_sample_data = (() => {
    const record = [];
    for (const elem of market_cap_history_sample_data_raw) record.push(JSON.parse(elem));
    return record;
})();

export const sample_data = (() => {
    const record = [];
    for (const elem of sample_data_raw) record.push(JSON.parse(elem));
    return record;
})();

export const sample_data2 = (() => {
    const data: string = fs.readFileSync("tests/data/Block.2.sample1.json", "utf-8");
    return JSON.parse(data);
})();
export const sample_data3 = (() => {
    const data: string = fs.readFileSync("tests/data/Block.3.sample1.json", "utf-8");
    return JSON.parse(data);
})();
export const sample_data4 = (() => {
    const data: string = fs.readFileSync("tests/data/Block.4.sample1.json", "utf-8");
    return JSON.parse(data);
})();

export const recovery_sample_data = (() => {
    const data: string = fs.readFileSync("tests/data/Recovery.blocks.sample10.json", "utf-8");
    return JSON.parse(data);
})();

export const sample_preImageInfo = {
    utxo: "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f",
    hash: "0x790ab7c8f8ddbf012561e70c944c1835fd1a873ca55c973c828164906f8b35b924df7bddcafade688ad92cfb4414b2cf69a02d115dc214bbd00d82167f645e7e",
    height: "6",
};

export const sample_reEnroll_preImageInfo = {
    utxo: "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f",
    hash: "0xe51e1cc8dfdcdcd02586c9648c6977504eade2dffc8f3289e7ae7e501c2879f99af6a199ccad499be02a66d409ca4ab51b35f1c3a06a82464ce4efcfeb3ade33",
    height: "12",
};

/**
 * This is an Agora node for testing.
 * The test code allows the Agora node to be started and shut down.
 */
export class TestAgora implements FullNodeAPI {
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
     * This constructs a new instance of `TestAgora` and sets up the handlers.
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
    constructor(port: string, blocks: any[], done: () => void) {
        this.agora = express();

        this.blocks = blocks;

        this.agora.get("/block_height", (req: express.Request, res: express.Response, next) => {
            return this.getBlockHeight().then((result) => {
                res.json(result);
            }, next);
        });

        this.agora.get("/blocks_from", (req: express.Request, res: express.Response, next) => {
            if (req.query.height === undefined || Number.isNaN(req.query.height)) {
                res.status(400).json({ statusText: "Missing or invalid block_height query parameter" });
                return;
            }
            if (req.query.max_blocks === undefined || Number.isNaN(req.query.max_blocks)) {
                res.status(400).json({ statusText: "Missing or invalid max_blocks query parameter" });
                return;
            }

            const height = new Height(JSBI.BigInt(req.query.height.toString()));
            if (JSBI.lessThan(height.value, JSBI.BigInt(0))) {
                res.status(400).json({ statusText: "Query parameter block_height must not be negative" });
                return;
            }

            // Slightly stricter requirement than Agora (strictly positive instead of positive)
            // as we don't want Stoa to request 0 blocks
            const max_blocks = Number(req.query.max_blocks);
            if (max_blocks <= 0) {
                res.status(400).json({ statusText: "Query parameter max_block must be strictly positive" });
                return;
            }

            this.getBlocksFrom(height, max_blocks).then((result) => {
                // Adds an artificial delay to our responses
                if (this.delay > 0)
                    setTimeout(() => {
                        res.json(result);
                    }, this.delay);
                else res.json(result);
            }, next);
        });

        this.agora.get("/merkle_path", (req: express.Request, res: express.Response, next) => {
            if (req.query.height === undefined || Number.isNaN(req.query.height)) {
                res.status(400).json({ statusText: "Missing or invalid block_height query parameter" });
                return;
            }

            if (req.query.hash === undefined) {
                res.status(400).json({ statusText: "Missing or invalid hash query parameter" });
                return;
            }

            const block_height = new Height(JSBI.BigInt(req.query.height.toString()));
            if (JSBI.lessThan(block_height.value, JSBI.BigInt(0))) {
                res.status(400).json({ statusText: "Query parameter block_height must not be negative" });
                return;
            } else
                return this.getMerklePath(block_height, new Hash(req.query.hash.toString())).then((result) => {
                    res.json(result);
                }, next);
        });

        this.agora.get("/preimage", (req: express.Request, res: express.Response, next) => {
            if (req.query.enroll_key === undefined)
                return Promise.reject(new Error("Missing query parameter enroll_key"));
            else
                return this.getPreimage(new Hash(req.query.enroll_key.toString())).then((result) => {
                    res.json(result);
                }, next);
        });

        // Shut down
        this.agora.get("/stop", (req: express.Request, res: express.Response) => {
            res.send("The test server is stopped.");
            this.server.close();
        });

        // Start to listen
        this.server = this.agora.listen(port, () => {
            done();
        });
    }

    /// Implements FullNodeAPI.getBlockHeight
    public getBlockHeight(): Promise<Height> {
        return Promise.resolve(new Height(JSBI.BigInt(this.blocks.length - 1)));
    }

    /// Implements FullNodeAPI.getBlocksFrom
    public getBlocksFrom(height: Height, max_blocks: number): Promise<Block[]> {
        // Follow what Agora is doing
        max_blocks = Math.min(max_blocks, 1000);

        if (JSBI.greaterThanOrEqual(height.value, JSBI.BigInt(this.blocks.length))) return Promise.resolve([]);

        // FIXME: Should handle > 2^53 but we're safe for the time being
        const block_height_ = JSBI.toNumber(height.value);

        return Promise.resolve(
            this.blocks.slice(block_height_, Math.min(block_height_ + max_blocks, this.blocks.length))
        );
    }

    /// Implements FullNodeAPI.getMerklePath
    public getMerklePath(block_height: Height, hash: Hash): Promise<Hash[]> {
        const sample_merkle_tree = this.blocks[1].merkle_tree;

        return Promise.resolve([
            new Hash(sample_merkle_tree[1]),
            new Hash(sample_merkle_tree[9]),
            new Hash(sample_merkle_tree[13]),
        ]);
    }

    /// Implements FullNodeAPI.getPreimage
    public getPreimage(enroll_key: Hash): Promise<PreImageInfo> {
        return Promise.reject("Not implemented");
    }

    public stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.server.close((err?) => {
                err === undefined ? resolve() : reject(err);
            });
        });
    }
}

/**
 * This is an API server for testing and inherited from Stoa.
 * The test code allows the API server to be started and shut down.
 */
export class TestStoa extends Stoa {
    constructor(
        testDBConfig: IDatabaseConfig,
        agora_endpoint: URL,
        port: number | string,
        testVoteraService?: VoteraService,
        testCoinMarketService?: CoinMarketService
    ) {
        super(
            testDBConfig,
            agora_endpoint,
            port,
            Number(port) + 1000,
            "127.0.0.1",
            1609459200,
            20,
            testVoteraService,
            testCoinMarketService
        );
    }

    public stop(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (this.server != null) {
                if (this.coinMarketService !== undefined) await this.coinMarketService.stop();
                this.server.close((err?) => {
                    if (err) reject(err);
                    if (this.private_server != null) {
                        this.private_server.close((error?) => {
                            error === undefined ? resolve() : reject(err);
                        });
                    } else resolve();
                });
            } else resolve();
        });
    }
}

/**
 * This is an API server for testing and inherited from Stoa.
 * The test code allows the API server to be started and shut down.
 */
export class TestVoteraServer {
    private server: http.Server;

    private app: express.Application;

    constructor(port: number, votera_endpoint: URL, done: () => void) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.server.listen(port, () => {
            done();
        });
        this.app.get("/votera-proposal/ID1234567890", (req: Request, res: Response) => {
            const response = {
                proposalId: "1234567890",
                proposer_address: "boa1xrval7gwhjz4k9raqukcnv2n4rl4fxt74m2y9eay6l5mqdf4gntnzhhscrh",
                name: "Make better world!",
                type: "BUSINESS",
                status: "closed",
                votePeriod: { begin: "2021-07-26", end: "2021-08-02" },
                createdAt: "2021-07-23T04:49:26.634Z",
                description: "Description Make better world!",
                proposal_fee_tx_hash:
                    "0x11c6b0395c8e1716978c41958eab84e869755c09f7131b3bbdc882a647cb3f2c46c450607c6da71d34d1eab28fbfdf14376b444ef46ed1d0a7d2237ab430ebf5",
                vote_fee: 100,
                fundingAmount: 100000,
                voting_start_height: 3,
                voting_end_height: 6,
                tx_hash_vote_fee:
                    "0x8b6a2e1ecc3616ad63c73d606c4019407ebfd06a122519e7bd88d99af92d19d9621323d7c2e68593053a570522b6bc8575d1ee45a74ee38726f297a5ce08e33d",
                assessResult: {
                    average: 7,
                    nodeCount: 2,
                    completeness: 6,
                    realization: 6.5,
                    profitability: 7,
                    attractiveness: 7.5,
                    expansion: 8,
                },
                assessPeriod: { begin: "2021-08-18", end: "2021-08-18" },
                creator: { username: "test" },
                attachment: [
                    {
                        id: "61f6724251k789",
                        name: "Make the world better",
                        url: "https://s3.ap-northeast-2.amazonaws.com/com.kosac.defora.beta.upload-image/BOASCAN_Requirements_Documentation_Version1_0_EN_copy_fb69a8a7d5.pdf",
                        mime: "application/pdf",
                        doc_hash: "5b5073302c8570a269a5d028cc256d80b7d5d22aaa05e279fac7ced94d7df7c9",
                    },
                ],
            };
            return res.status(200).send(response);
        });
    }

    // Shut down
    public stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.server.close((err?) => {
                err === undefined ? resolve() : reject(err);
            });
        });
    }
}

/**
 * This is an Agora node for testing.
 * The test code allows the Agora node to be started and shut down.
 */
export class TestGeckoServer {
    private server: http.Server;

    private app: express.Application;

    private coinMarketCap: any[];

    private latest_data: any;

    constructor(port: string, latest_data: any[], coinMarketCap: any[], done: () => void) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.latest_data = latest_data[0];
        this.coinMarketCap = coinMarketCap;
        this.server.listen(port, () => {
            done();
        });
    }
    public ping(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (this.server) {
                return resolve(true);
            }
            reject(`Test gecko server not running`);
        });
    }
    public simplePrice(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            return resolve(this.latest_data);
        });
    }
    public coinIdMarketChartRange(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            resolve(this.coinMarketCap);
        });
    }
    // Shut down
    public stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.server.close((err?) => {
                err === undefined ? resolve() : reject(err);
            });
        });
    }
}

/**
 * This is a client for testing.
 * Test codes can easily access error messages received from the server.
 */
export class TestClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create();
    }

    public get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return new Promise<AxiosResponse>((resolve, reject) => {
            this.client
                .get(url, config)
                .then((response: AxiosResponse) => {
                    resolve(response);
                })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });
        });
    }

    public delete(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return new Promise<AxiosResponse>((resolve, reject) => {
            this.client
                .delete(url, config)
                .then((response: AxiosResponse) => {
                    resolve(response);
                })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });
        });
    }

    public post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return new Promise<AxiosResponse>((resolve, reject) => {
            this.client
                .post(url, data, config)
                .then((response: AxiosResponse) => {
                    resolve(response);
                })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });
        });
    }

    public put(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return new Promise<AxiosResponse>((resolve, reject) => {
            this.client
                .put(url, data, config)
                .then((response: AxiosResponse) => {
                    resolve(response);
                })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });
        });
    }
}

export function delay(interval: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(resolve, interval);
    });
}

/**
 * Build the merkle tree
 * @param tx_hash_list The array of the transactions hash
 */
export function buildMerkleTree(tx_hash_list: Hash[]): Hash[] {
    const merkle_tree: Hash[] = [];
    merkle_tree.push(...tx_hash_list);

    if (merkle_tree.length === 1) {
        merkle_tree.push(hashMulti(merkle_tree[0], merkle_tree[0]));
        return merkle_tree;
    }

    let offset = 0;
    for (let length = merkle_tree.length; length > 1; length = Math.floor((length + 1) / 2)) {
        for (let left = 0; left < length; left += 2) {
            const right = Math.min(left + 1, length - 1);
            merkle_tree.push(hashMulti(merkle_tree[offset + left], merkle_tree[offset + right]));
        }
        offset += length;
    }
    return merkle_tree;
}

/**
 * Create Block
 * @param prev_block The previous block
 * @param txs The array of the transactions
 */
export function createBlock(prev_block: Block, txs: Transaction[]): Block {
    const tx_hash_list = txs.map((tx) => hashFull(tx));
    const merkle_tree = buildMerkleTree(tx_hash_list);
    const merkle_root =
        merkle_tree.length > 0 ? merkle_tree[merkle_tree.length - 1] : new Hash(Buffer.alloc(Hash.Width));
    const block_header = new BlockHeader(
        hashFull(prev_block.header),
        new Height(JSBI.add(prev_block.header.height.value, JSBI.BigInt(1))),
        merkle_root,
        BitMask.fromString(""),
        new Signature(Buffer.alloc(Signature.Width)),
        [],
        new Hash(Buffer.alloc(Hash.Width)),
        [],
        prev_block.header.time_offset + 10 * 60
    );

    return new Block(block_header, txs, merkle_tree);
}

const blacklistMiddleware = require("../src/modules/middleware/blacklistMiddleware");
export class FakeBlacklistMiddleware {
    private static already_assigned = false;
    public static assign() {
        if (!FakeBlacklistMiddleware.already_assigned) {
            FakeBlacklistMiddleware.already_assigned = true;
            sinon
                .stub(blacklistMiddleware, "isBlackList")
                .callsFake(async (req: Request, res: Response, next: NextFunction) => {
                    next();
                });
        }
    }
}
