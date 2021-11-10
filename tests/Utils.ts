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
    Amount,
    BallotData,
    BitMask,
    Block,
    BlockHeader,
    BOA,
    BOAClient,
    Encrypt,
    Enrollment,
    handleNetworkError,
    Hash,
    hashFull,
    hashMulti,
    Height,
    iota,
    JSBI,
    KeyPair,
    Lock,
    makeUTXOKey,
    OutputType,
    PreImageInfo,
    PublicKey,
    Scalar,
    SecretKey,
    Signature,
    SodiumHelper,
    Transaction,
    TxBuilder,
    UnspentTxOutput,
    Utils,
    UTXOProvider,
    VoterCard,
} from "boa-sdk-ts";

import { FullNodeAPI } from "../src/modules/agora/AgoraClient";
import { IDatabaseConfig } from "../src/modules/common/Config";
import Stoa from "../src/Stoa";

import sinon from "sinon";
import { CoinMarketService } from "../src/modules/service/CoinMarketService";
import { VoteraService } from "../src/modules/service/VoteraService";
import { SmartBuffer } from "smart-buffer";

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

export const sample_data5 = (() => {
    const data: string = fs.readFileSync("tests/data/Block.5.sample1.json", "utf-8");
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
        this.app.get("/votera-proposal/469008972006", (req: Request, res: Response) => {
            const response = {
                proposalId: "469008972006",
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
        this.app.get("/votera-proposal/469008972001", (req: Request, res: Response) => {
            const response = {
                proposalId: "469008972001",
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
        merkle_root,
        new Signature(Buffer.alloc(Signature.Width)),
        BitMask.fromString(""),
        new Height(JSBI.add(prev_block.header.height.value, JSBI.BigInt(1))),
        [],
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

/**
 * Key pairs to be used by test validator
 */
export class ValidatorKey {
    public static _keys: KeyPair[] = [];
    public static _map: Map<string, KeyPair> = new Map<string, KeyPair>();

    public static made: boolean = false;

    public static make() {
        if (ValidatorKey.made) return;
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAUHVPR7O7F2QGLDVXG3DQTVHXESE3ZAWHIIGKT35LCHIPLZBZTAFXJA"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD4WCOUL6E4V5YHV4JA7EGACFSF6KAR5LVQTK5ORYYKP5VPCWT7A5NEX"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBROEMDNXHIHXMX7QFEYGI7NFXG2K7Z3YGKEN23GJ6EUS5BVILTQ7I7N"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDOX5RMF4NUIPD2RUDSDNSHRV55QFKVFAIDX66R3A4RS3NEMGGTAWA44"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBWDAH52EYMTSIJ42LCJOZR5U4EGJADI3TGBWJ2DMVBSW5Y6DEPAJNQX"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB3GZ445DHGSA7BS4ZVFGEOOKS7JDTJZE5ZDCNKSJ3ZMVMTT4U7QR6W6"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB7G2NAJGHPWUWNL27PRSPVER24S6DRT5RYVQQP2B5S3MVBIPL2QCXKY"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAZHPW75V3GT6OY6NS7GOYVUBGX7S6ZUHVWQM3T2LP37S37XWP2A2NIS"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD75IU477S2WFRNR4VYELK2RWFDBIU4SX5R7WF7ERJYN3MC2ADEQHR2P"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBXJ5NCNRC7TE4DRPKEY6AXQQ4765ENGH64LMXRPTQN72R54Y2UADJBO"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBJFMOAEW5CUTHKTIRLCAX77AONO6P2X4NBB3EYUZ6LUGKXWI27A5VP7"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDZ7I6DWGTGSURGCG6JNYAEMMLPR2HHBDTIADETBTYGEPIVHGDIAQSKQ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAOEUODAXTCSQTXIZ6GWFN6ON5WMOUAMBDPCWIQSUDL7M6P2ARMAY72W"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB6RPM6S5TLZF45NGNRVO6STJ7K655XCYZ52FYYLAGXLFHFD5DVQV2E5"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDSWXFZLO2QUR6BQC4HMOYLIPQ45ASB3JRVMOMEFANDV3SXZUMIAF2ST"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCVZLEFGWBISIF6BFP33UTWP6SRXPX6K3I5I74FQHPPDT6XUG3FASDRI"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDZPVOOKPQ5XLGS23IQDQN54XPPLYTE6N54LPTE6DVLJ7SZIUM5QIKIK"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAFRBB3OU33NJNCNRC3HYB4MY4HBK2EE6VF53MH3KMVXAO5JZOWQ4LX7"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SANTKPQFBOL7FLHO45BXHR2MIBWLWACBVVFNRROEXYEELRHYYWVQU4Y6"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB3V2QGPKWEAJRADCNFRBO5ZFEZ7GS4HDCXLQIFFGB2IK4IVTMRQUIFL"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SA4WM4VNFVLXR4P7XWN64F6RSONCVC2YHNJTOVFRH74C7YZ5WP2ASBVO"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBRQ2U4PLPLOO2OKZOR6MUNA7DBOBKMR4L3JWRDPROKLYKKRJQAQZQCZ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAK3AQLQOFLHKZMSU4GY6KZHP46BP7LEZMO6CZLNFLI7DPNZF32Q7MH3"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDOLKFDQQSW7F2JO35IHIUBAC57RCHDDDU4BX4NPEKZYB45NEE5QOPVX"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAOJ33ZQDKZJ4Z3GQGZHGEV3JOHODQUFL5THNR4UBE7UKQVEDOTAMPJR"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC5T2N76MQHUYB3UHHIBNWRFEC3PJLLNMJX7YVCCMZTK5IYI5GZAPFRU"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDDDKDFULA2NGF4YK5ABNDXXDDMASJ4RUOT7KDHOKY2FHUWXNFGQHN4S"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCX6RKXQYDTJ3HJ2PZPZRIZXF6E2DCZIKF5O74K7VVNYYN6JEGSQLNX5"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAE3GB5KCOOJSHLHJ7665U24OLLEHXCIMVGCRXYFZ466ITWENNAAGGKY"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAFCE42XELADSJWIJNNAOHVSNVCUNQ62KP4W66DXKZ3REDQZAPIAOU5V"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SATSHEI77SXMJUCIQTXW5BDRMNDZFBPLVVMCFEUMXIL6CTHG6AFQBLMJ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDAOSEFMFRLVIXXU7N6M43WJEX7Z2ZRGNJ6LB47OJIFAWGVQOAGQ7ODM"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBVI5P4SBTVOSKXVKJSSO7IR6O4EM3M7ZPAPE6SCKYJEGXVJGTRQVIXL"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCHYAXCV2U62PRQB7PHSAZXH45MK2DLF4DV7HVMTVWWUHONNCH3QBIRQ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAOPG2IAKWSJ4SSJDKXX4ZABTTQPNR3NBIKFQ3JWKI5NBVW4E4VQI3TC"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SASM5RVXBO6AOFP4ISZWHPGUK2GPC27Q7HMLYA5ZGJJNJX4OVO7AJFQV"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCASPTC2CKPWL2VO7KP7T6W225T6NOBDCPRDVM7TORYUX3OCRE4Q6KDS"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB3BOPTOV2UJUYFVYG76L7WMTF22GNXGSI2632L2CGHSOXVZOLLQ6DM6"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAUJWMWDOP6A4CZ5VJYRLQQPRBWWPF7JUL466JXOOBL7MNZHOUVQVB76"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDEEOIDBTKBVKZG4TAJDYYYUTOTSR7BZI4KVWIHDSDBOCG4MIO5A5ACX"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCEHDFUN425HAZGVQA3WB6VLEZSF6XN2PVHJWXCJ5WGKHHWVTCYAGSOP"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SA57SGAUIY35NG5OYCEYKRWZNHV7QBJFFZYWGS7WLNIEAGYIACOABREB"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAFRCMPV7SE26HJ5BMXCHRW2SSXZDGIUYFOHVDOK6R3NWL2BERZATS5H"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAPWXA5TZKQHGGP7JRHTLLFXFH4LXZLHDLSAGOSGA2XXK3ASV2JAAVG5"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAFQ7Y7DONF35KJQTNDXYED7P6POOYT2DWUBBBYDZDWGOFXKJ4CQZC2Q"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SA3I5275ZHIHXJWTPKE7DGSKFXHNDKKN33F35QQMO735O7KF2K3ADBYA"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAYBVJ6TL7DORDMXMTA6HAMP7JMMVAX5T7Q46IZ2BD4GYMXFOFIA4GWB"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD5XZQXMN22PHP4XHEKRUK2NWSU7252SESCH56QNCZRK5XXFKN3QKATZ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCSA2DRRE5OJQZHYJ4DTLK46GG5UVX5X32ONKLYZOAXXRF3CRA6A55AL"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD3IIHLTLP54I4LF33EYYLZ57WQK4DSEBZTU7HXTO6DJKSVTT4YQUXEC"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCXL2SF2EH2SSVBNPNPA5FNFPMGPZHFDVLGYWFPVMCHNEA4TJ3LA35BJ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SA5SYQF4GMBZA7F5W4U7MS74ZIVIQN3ZPX6EUZZ6GTBY3EHYRVNQTLGW"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAX26GATW6YWHCIQFFUC54IBK4MR77DKI3WW2IRTPPXYWY3WAFBAODY4"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCOXEOTC7KGHDTQTVD5ARNQ7R3W3PNIEHNBHD2LBO3TVPR2GKRMAVH55"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB4WE3Q4GKCKCNSM7522HR3CMNCXCRCY5MOY3S2WW47TQS2Y4IGAHUTB"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SADVYLQZHTKL7OPR7QSRXAXXS4WFWQ72CECL3HFKI5Y3TLWIRMHQOKW7"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD7SD7LBL53X3CXPQBPU5BUPSZ32AEQWCBJQ5MANW3QW22LQCB4AVZR3"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD6WWAJXM65OXXW3FSK5CUDDQBSAS3EV5TT5JUJYYYKVOJXLYSAAJQFT"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDAKJXQB5PL3JJ6BENYZ4KN2ZFKN5364ZRZ7MTQGU4EI42GZVI3AFLFI"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD4XZ2EYMYNQQAC2OAD7G3U223PRUEJHQCG3XL4P46O2SOW4A3IQPDHS"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB3NSRMODSSKSBMFK225ZCEO4D6I2V45DLWTQCUDPILVMQKV6ZZQNRXT"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBSM24G6BK7YZNSZXW2LS65W6ZLX4V3PIW2OCJRP76Q2ZNWMSVBAKF5W"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SADNREC5XPVZ2QNYEBD4H7EH25WICJZRH3HMGWPOP3AOO4W7FYLQFCMK"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCEO3VEHFK4YJE6ESXSGSUBS4CFLAACYPR5R3R2K6EOORL6KLNJAB4BJ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAGXU3UFFLDIRFLHVK5XFN4UQLYM5FXI23GXV35FBZA2JVIK7VCAYY3Y"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAMPN5LGR7ZI6DVEL6XKZYWQKUHKDB2YIASOJCT2F2PBVQJ43HBQGV24"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDJEA25XF4K5MEK2PJOUGTVITEYY4SU3PAMOM5PCWDI6WDPNC2UAS4XC"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD4SJF5K7NNAFYDASHIQP3VQEIPPQCFOWQK42JLEJ2GYBOU6CKDA5EUC"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC4UAENR2U5R3WIGCC7F6SKYGJRJ65NVG7OISGYZYPKFHYYPBM5AMPP6"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCNA6NHTWG6NNMPLPDOL53CAAZ6XYYLYTYZHUJVETUTSMOH32PEAVTRT"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBWQYD5QOAANXPZWPTWEILKYFEYHOL6OYBMX4QKX54VEWCBEGJ2QOQRP"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBONILSZCY2GMN5JIE7AF5HW7MPDRLA32SS4YXWZQPYBNYQZWACA5YKQ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCRA4TEDKG6MDUHEXKKGTU5IH6JWWQLUM4TOCLSBM3GZ6T5NXDMQQNBM"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDBMZWAFLZEJFYLCO3GIOR3OYFF3ZORDBAUGT4JUF46KD5CBTSVQDNJR"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDTW45VW4Q5Y6ERKPPU7D4CRAFV5FYCDE3Y4LAOWRDSJICA3TEMQ3M75"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SASC6QS4FEYK3NRNU44Y65BMFU4RB3NW55EX4BMFLE5WEZZSRMFAA7IJ"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBHMHVWR6VKB5FPMTJOK3B6ORGSHOLWY55Z3UO5S5ZE2TM6IKCUACVHX"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBXTLFJRKVFJNEV75HAZIGNLLR3C6R4JYFSL2DQAORSWM3ZH7C6AUV5F"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBMVOKUU4SBD2X6NGBW2VDZHQ3MFL5LWIV6GIMO5IZHEL7D3PQ7QTP2Y"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC6FZ75K75NQJTJILR63DZLNYJ4JTPSKSIFIJOMQPR4FNKWQ3FLAJQRS"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCEPL3ERUGJKPGVLX6ELB7MHYKVZTOGNY6AVZD35AMJ4RVW74FKQG3TW"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAGXEJJDKD36BIXDI2ANT2H32UAVMHSVHXCOL7XGXW42H2IWNADALVBO"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBVLQBYO4AZQIFJ3SDVEJGTG5YA64D7RPEUR2EB6LPB2ALCENPKQSFU4"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAQ7BXAC5FGFIKQKS2DMDQH5DZL7O27ATYLYARLQW4F3W7YK3U5QG4SL"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC5QUWO43FKMRBQJQ3UFOT6DVFFS5CWZGWOM5JIIZNIQFOKJNQNAFV7M"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDDHJQXTV75OUQARVGOP2DTVH7QAGMRXZDCQG35DO22EHAQO4NFANO3W"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAVAWDLVWY72KQEOLMKUFG5HN2Q3SFZK4DKWNL2WN6M36EEIQ7JAKQ2F"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCTFT533NPUFZSFNCMDP3HNE73WVNTW5RTQARN3OVUTEGFPUEPZQPNC5"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBADIHCAG253EHQCN5JTJOTHCEUE5VNPLUTRA2NWH3R7PPC4A5RQZ4QJ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCZS4Y2LG2L5KT2P2N4K4ACAPISAJRGHOTHAQT4USPSGHHRZ3ZCA675U"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC5CTWXMRKAJ2N72P5QJ2A7U7A75B4HSL3RBEJ2IL5USTN5W43AQKLU3"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC37ANTNKFA6E4AENCJISUMMZBPU2ZMARZWVAKI66LYCL2QBVLTAO5CX"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDAXD5PHZUH62YDPRVVWX3HQM4I2GL3FJQDNELUTJJMRBHA6ATKA73P3"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCIVGPWSDI73DAPBUH6OGX2OALP3BOMJZPB5PQ44W443NSQ2UGKACP77"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCT43NR5NTOUFSHBRXK6UY3DK3ITLTPGCV46FRPAN5G4JR3JW6PQKWLG"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCICCMCDZR7EFDBRVBRBBM4Y6OIVCQHXSJHIOVS4ND5WJKTLPNTAVTCG"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDSWV6FXOZC72C5NNXKWY3Q6FWUFLXSRMHY74S4IGU2KHPOMKLVQP73U"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDI6H4RSVQ6GOPYJRFHB37FHS3CWSDDEOSIQI3TKDN3XVHECB64AQSNB"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBT3Q3VPOS2FULLWSM7OSE64L5KZEPTLNQQKUEBMGCCR3VPBGCDAKMEL"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAVST7CLFPOALYJP34FSARL4TRUXGKUHVTIRPAX7TMYDCBPKZX6QZT67"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCT2CNS4EGXBP3NG6WUIU4EAU5TXUVHNT577QRSKXAU6TE6TCQPA4C4Z"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB3YYKKYUJO53UN2S3RVUGP3LA75UTLRW226PHIQBHNCWHSBXYWA6XT6"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBRLS65AW3MXSS2ZLJHGYZBZTBKHJ5XNFM3GQ7SAAOSI2MWFGD2A3Y3Q"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD36S3XPF22BO5HL2XJE6MKTQ4N2RLUEYVJ2QJ57GWOSDVNP4FFAOWPP"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB5AJOH6N4LJD7F2DZ7NOWRRAIMV54WTAKXOKVFL7K3KXW42REHQHCGJ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDPKW3MLWVHY6GUS3MBMXN2T72ZCG64UC4BUKOJIF7GT75SFUDJQZXQH"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAQ7ZG6CAXB4VDUEZUH2RQL5F2N77TTMCUEYMI7SLFFJIDVIHNLAJPXS"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBDQGVCRYYMBDHEMDPJXWVCCIQSCAD7BDFJLGREJPBM3OOXS4Y7A7YXG"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCSTIYVPDVX4VECIRPQI74N6SIQ2C2ADYZXL6T44WYW7FHXUN3JQGZL2"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAOBS3MG3XVFKVNSML35ALOLR2YI22SZMGGNBYI5G76NOIBXMYQARVLC"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBD7QXIWW2JMXDMN2VVCWJNOPS2HG7H5BQ5LQKHLJLYNG23KZJZQ2LKI"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB74IB6MOX6PDPZ25SL3T54LYQWO32STSVX5X62IPZLOHWZIWJJQ5MZR"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCCPXMBZWWCRER26W4O7Q467EYTGYPN5KBGO32HOFE5YOMKBGSQAVW6Y"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDLQQTH55RPJ3FB57CBKBXZWDYY2WU7HROZT3WPJ2YCMDPXR3ZVQK7KY"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAE5J6SNURA4GHGKLM4IRROFAJ2TOA4FUBYUKQC34VK3W4ESQNNQQJAV"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCDUG4VTZMH2O6YKCNJ2I7RW5UWZ6U5OAMKTCUGIZFLMFREPGPVASMEC"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDZVBBB3G5XZMUF6JEGHQ3SWR7FA2NQAIDMOIRMETUXTJVFISCUAULL2"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD42QYTX76OR5L7ND3QK3D7U43GSOOZ75T3XP53G4X7RQ3XNPTXASVE5"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDJSSABLESH4OON5XUH2YHWEJ5DUE7XEAKJOKPER6QJPBOWCE6MQN5DK"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDK33WNPDFM6T4R4QOFPAEMV3QR3LRSKXK4OAQ7ZS33YFRA22DDQBIN3"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDOJGO6CUCXIVNPNUDEESK3J3FXSTERF7M24TRMA4NJCVETOSWSAGAD6"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAGCBFAO5A3MPKKKI2IG5BCX522VIPEMPOXCGFRDIDPWNDJ3MXAA2B4T"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAVPPZTF3XXFODSMHZ62JTARPDGPCRFA77TMCBALWC3SD5OLZHYQWG5I"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SARBV2CQ3MXQNZNUJ65RVFZQQTRBE3SZLSZCYURVLEBHFUVLFWCAQ53M"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAHU2IHCUPNQBHIEX4JNQLMQD6EPCXFUJK4CJTH6RF44FXN3IY3A45JN"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBMT243TGPZZCE54GI2HK3IINNYSS4ZLUEQACROTQ4ADAHJ4AVPALNJY"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SASSDTAXG5SSMIWBBXJMIOMXVAIR2H27ZD2UTP7EMXW3DWQT63NQ5TRZ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAMW3CRTEP7D2ENWPDYMMA36TSENKUO3TRK4K6P4SJYJSHGQCUVAHYSI"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDVMP6L3QU3GGOG5MPVJJCKMUB4EDPSGHUUJ77BHDG3DEA5ZZCLAVIWU"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCK4CJGN2YV7TQPVQ7ASPLFB6R6XRF4ATYJV4CVTIIIOYOGIG3BQBJYY"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDMTNBSK75X2ZP5WQ5PLLBW5SVNNFHDYCHX2AP5WZFYM5NSFMVRAMIMM"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDWXDMJBS3TI5F6JQ7ERJBD76LZG4CDRK4PZYWLCQTQRNO5S6M5ASAL3"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDUNBLLJEMHXKSDQR3GDFOMBIDPAWYEFZ7RKEJ44M4MN77JSKSRALYLO"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SA2I7Q7L3A6O4X6EWRXDEA3AYWCSHUMQTV3KJZUI4FWP5J57TFAAFMN5"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBEJKS3DGFBI3OLJLH5VA3YPXAMFYXCMSPP5CPRAJOPOUWR75EQA5FGB"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAENB2WSN4G6XADYHBDS3YG43NGFR6D5LTVO3LRYZSWECINQ2B5AF6X7"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB6KGRGV7KWASPNPQMGASY7SWVTHSDK5ZX25VAWZGSPLOQPLQNZAUE53"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDGEBKNFAEWECBKKPVXFBU76NTGSCAB7TBKALFQXILUKT5RUK42QLJ2R"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBNMH66XTFTAWOSBKTBRBSOVIM4LMSGB5A5U5CRU25LIV7AALN6A42YN"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDEKX7EIQSX7U4F3MKHYWQ7OQNYHMFALZ3IVGKLC7T2CN6V4N5SA7MSF"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBCXKEAPK2EDGTKTBJGJLOA3OPMKPKFFSZKTADPQWPTYM47HMFOAWL5D"))
        );

        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDR34Q4DA33V4GLII22VBSVNRMZKWNVEYTJMQKSHHYEHIUT2IIIALOGQ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC42ZRSCVIAAUYVD36N6FF4IFC3CU2YOBAP2E535OM6NVAYAZ6DQO3FU"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDUKU43J6RX5A47Z5FDA6C4JFZNXWB4FN4ESLAPNDW5BBZBFJTXQ4G5P"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCUXDEFLA5VHCEEK3QQTVLXCY262HRPFQPUQ3F2JST5TQMXFP7ZQTQ6D"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAAAMUVLPUWZDIBNEUPR4LZ6SVZ2FSTLRCOIH2GSACWI6S4KDWLQP7QJ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAT7GFQY6D3MMHCVFP5GV522IRQJDSHQF6WPT3S56JSB3T3S27HQV6LW"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDFEHZN5YDWH35DG4W6JWTBRCQEBYGUF5FS2UH7QBCYYZRGOOKMA52FW"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDCIXJKA77FBI5CPKU76BUXGDCE5QQ327UXHWSUGMQ7HOB5WSKFA7ZZY"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB2JEACRNOMBKGF5CB6QVIAP525ZLZNMLGPIHN6GQ5PGXA2YT5DQL4OM"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAQPD4Q352N2F6DBLFIJ7HC4JM37HWDB5SNSHBT7CQHHGRBRTF3AMHQF"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCPFNLDWPF2YSM4RKC4HIPL4UNUGKDSBPFUUPN6UVUDLKAVCTGRACAF7"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SASPHWOL5GL6O7T5FEJCGRAGQF3ODH5ES4D6UCJBDCMYZLAO7UEQV5CM"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SANFAOILLGW37WCZBU3NH3YGHICHUH4E7JFNXCHCQPKUIWTHJD4QDKQ4"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBNFTCWVHIOCWYPFCI7JEKUHMEB5YO23NJMB6U67HLA6UBTBX43AFUFB"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC24TNOENVYYXYHZAMWGLSWX3QG3LT3WR4VRDGAQW4YVM6L3YG4AD6SP"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBARNAUJVRK6CQMRX3FLBZIJX6LJWBQ2CJKDFFS6DKZN7VFFYBEQVQ2T"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCCEVEXPPNJXUVFV5TCSKZIVKR5UZUYWKWGXGVS4HDMRMTY4TRSQ2N4R"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBYAFEYQ5PBF34JIGQOBLZGFH6F7AHDBG6CAIQE6IEKWM4IZRPAA775E"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDG3T245E4I4JZ62F66EWW4S4522JAPSUZIW2TA54H5EEVZLNGSQKORE"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDTOPHWQN275OJB5PSXVX3DWKKFSMESA65XOJEED3WYPSZSFULVQ6LYG"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD53D6DSPLDH7TH7UNAVFTMMZWGJORYECMMGAU6F5VWPGJZBRMYAGR3X"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDMPEVDQ6KMT7PE75PDDBVDDCEOQSP4N44BGKNNLAELG4SMF3BGQ6ANL"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDW76MDQKSOWZPKP2S27BNZG5YZQOXULNAEIKYQNADBP3TZHLX2ABP4V"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAATMTG5PNOJVB6IH377HIPT4GJNKUEUT7OMQMXSP6LCEGLN4USQXGIK"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBQBFLV7E6EM4ONLF3QMXBPQJQZAF6B7KGIENWQ7KL5IEI3IMZDA7MVC"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD6BDA77TZPI46QS4F5ZQBKSXPQVIVASNWD4752E6DJYRJHZF6IA23EB"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCVEPESMEKFKNFSNHODPYYCHW6FPK3A2XJN5FIOBQRJ3XK7KXDKANFJ6"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCMXX7ZZIY2VPGOJ4XE5S25TC3GFPGVDIR7D77AQUYIFOLDBORZABTBM"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDM676W5OYZ6XVEEBB7WU3MZZR2KWLRRATXTI2SKB7LHJTKC5JVQKIDW"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDKEOMFPO3SK2E2G5VFONLGL6UYDISXY47UJPIYWT27EJAH6EOYQWW2B"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBYHHERXTGBQDUHRGS7IFOXCGUHAV2WI6FPOHYELJSQ5SPTLJM7QEK3T"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBONEBOKAKISBZSBWRCVUZIUF2SQKTBD2RLSSO77KCFPKQV4TXYQPSQV"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDGZDQDXAKLFGB4CCFHVF2YE4WIRFK75CC7EWS6LF6C7ZD4BFQMAIQGV"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SB3KOUK2FBTPUK5RCJNQ32Q5JBDRD77JZ3AXDEFBXLCPDLTY2T4AU7AK"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBS7T36LSECIQCPGUFEM53NYACZIQJH63XMFF3IHPBLFEB2F7FTQKSRS"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAAHYDIV5JQO6EBK44JGIBIME5R2RUI7VCD4IAG5MG3PDUCMQFMANSUN"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC2KRVLZJISLWFBECWHFJYWXN6LMBOGM3D4XPRUB7DN5F2NF6N3QV5C5"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC662MGXMS2PFRXARBBWV664VAMWUYOGKXSJQQFJ47JTHOHVZHGAMXKK"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAGRSQODPI5TD4B7QXDQHXDBLGYEMTAGDFSNJK7ZPDJSA6OBFGTQOJDU"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBDVRQGZPV63BIIWDDMQ5N6YJPIRHPPYTYWRAIVT4MRAH7OJHO7Q7PFN"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDBM5UWPDWLZ2YQHEX3H7W4LEH2RHBQK63HQEIFGBDN3BOJS3VUQW4NB"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCQAZUQJ2OWDF4763KGTNGTSLV62RAVQTN3L23MNSZC54G36U7EAGVDM"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDDLDYLQHGKBKX5LHHINR52C62GSVXBFB6FU7GQ2VYLZ2QC5H66AT2XJ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCSTQYOQ6CZYMME6XZRPVB2Z6EAUZLYKGWC6LWCBYZ2BZ22TPRWQLXF3"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD5XEB6Q7X5TSL4PP54JQ4AWP2TP5CHWTQ2BF4EVXZXNRDUYJXPQ77CZ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBHOEDUIQS34HP2LIHCBEMNIF7762FNHX5AJWTAM3UP2MYPCDOAAONJB"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAA3Q7PDCTRRYEXG3ICVEWWSPKOVABEGA5BAAFXFWXWA3QETS3PQNS5V"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBF7MCDPSYJSR7S6WBJMKM44AEGWY2D54LJGJDVV4M2KZT4TPOBQWZYM"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBX3MB4HAWFSDZC7YOHJGWOWZWAAKHSM3U22I46ZPFCR4RZSJJHQHCXF"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SA7ZF7GEPPN5SOUBOCR4DTN63GFOUNYJQAYOBH5SENEKFJS3PPHQCA24"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAKHRSMOKZPSQ27OHQ465NSBQ4UYWAJ6KSOZIKR6NRMEBCG3IAXQB5FV"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDKD6W4HELWKZTIJSMOGTIIMLSGCRVV3PV4N7AVYAPECW5S7VPEAAOY2"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDOYLR57PWULHCYUKTPZBCXOWYUOLSBRHF2NMRURPKDZ655VUI5AQOWQ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBPHZILRODWR5UOA4TUQ2ISV2BUNNYU23TTP566Y5FKEY7CC3FXQP6WN"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCDKNZRIWCGYKUWJPXEPD55WN5PC4VUMWIFBQQT6XCPW7ZQ3LFLAYWPE"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDHHMLFJ2JEAYYPQ5YVBZOCWJDDMIMBOFEVPTTKITSXVY5JGTQUAXCMV"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBPHPDPABAY4K3WT4NYR2DGKAKGMIFWCNEOJ2W3M6QTDFP55CMBALGN2"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCNHKUQBSOTM2ALKYPHRMZHADE27PIKYGW2IAVQBYBXDNY3MVDNAPGUS"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD6DM63E7ITRQVB4T3TTCDEAAOEYP4Q6AP77PMVMK6NNYVCU5ZZALAUB"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBEIJO37T65AUWOXXNVT2TNUGCQIQB7WRZYKBU3ETPPYUDIAMFCQKOLD"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCBMPUA3437SSEAHUIKNSCXGJUA6DYOFFALTUSI4PGJ6JOACQG2A7FFL"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDJUOMOCSTUGKVS43PLHUVVZP6PP2RNC7YCLMAGX5COEP2C4AWKAVW7L"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBWGHCXYLO5I24OHDERHU2ZJJNMTZLGHOWSA2A3GDDQZTW7JLXHA5HCM"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDNKHDRSQ4YSFDQL3VIXYFETG3VQHS5RZUM2CXLFCUAR5F3VS6GQZSHA"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SD4CNBBMQU4GDSLN2PNZKRE3FVFQ64UCAZ7ONUJQYFAWJIJOWY4QF7JC"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBLKZHYNIMGJEPH5Y6TZNJW2LOKM6CVZBUEO22BMHOVQ64WGZEEA5VJF"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAQACKJ3RCMM4Y3TPLUR23HOVK3ZVLBDSRLKHWYAXS2VN34FZUSQD5J7"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SA5UFCC5VQXPB5HPC46NGFIA6F6VA3NKRR6MPKBHBCWGTRHXX4UQ2JFY"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAOJYH6JJZ26SRVWRLJ54ODJWWXICQYQFD3MHN3O3UYSLFPTABMQS5Q7"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCLK6IK7CCYO6JFC2APW2C3GJBAYOSQIVAZY6UAEVHJMAJRISOUQLXDQ"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SC3OE5YVXR5QOOAM5J4Y63B7DFK6FHYVQBZFKROX7EO6VM3HDVFQCJ3A"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDF7YRKKPEP35AQ5EPBE5ZBPD3HFXHA72PCLJ5OTQD5E5FAHTSOAJX2A"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SBAXCDQRRX2B5KJVXIIG7RFVZZIVLHRTFLXETHR3GEKKBCJ3DBRQBI3M"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SADTLZID2VZACHLLLOEVFFYSGSP2ILIXL3XVAESCHQNEOSICWK6AO3WT"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCX3XQF6OS4GHZ2U3ZZCZ6UUV2PFCK4EMNDB4FQRL7XCVBC7T7HAASUU"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SCNZOINRO2EKM3YKIQKEPINTV7AMMSZXQQNFHYI76C2ZFXZ4UPJQTI5A"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SDBPK5KMKHQRMOIGZZ6QH4567MVW7I2PUMZKUUCAEQCMZNUH624ADBPC"))
        );
        ValidatorKey._keys.push(
            KeyPair.fromSeed(new SecretKey("SAMXHXSLEVGJYAPVWA7MRNZ5EKFF6BPMM2KK6JFTBTFEJHGNGPNAH2QK"))
        );
        for (const key of ValidatorKey._keys) ValidatorKey._map.set(key.address.toString(), key);
        ValidatorKey.made = true;
    }

    public static keys(key: number | string): KeyPair {
        if (ValidatorKey._keys.length === 0) ValidatorKey.make();

        if (typeof key === "number") {
            if (key >= 0 && key < ValidatorKey._keys.length) return ValidatorKey._keys[key];
            else {
                console.error("Can't found KeyPair in WK");
                process.exit(1);
            }
        } else {
            const keypair = ValidatorKey._map.get(key);
            if (keypair !== undefined) return keypair;
            else {
                console.error("Can't found KeyPair in WK");
                process.exit(1);
            }
        }
    }
}

export interface IEnrollment {
    utxo_key: Hash;
    commitment: Hash;
    enroll_sig: Signature;
    amount: Amount;
    enrolled_at: number;
}

export interface IPreImage {
    utxo: Hash;
    hash: Hash;
    height: number;
}

export enum ValidatorAction {
    ALREADY_EXIST,
    ADD,
    SLASHING,
    REMOVE,
}

export interface IValidatorAggregate {
    validator: KeyPair;
    action: ValidatorAction;
}

/**
 * Enrollment information for each validator.
 */
export class EnrollmentStorage {
    public storage: Map<string, IEnrollment>;
    constructor() {
        this.storage = new Map<string, IEnrollment>();
        const enrollment_genesis = [
            {
                address: "boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn",
                data: {
                    utxo_key:
                        "0x7fa36630b0d4a6be729fcab6db70c9b603f2da4c28feaa754f178b5cedb0174a9647fe8c08cdbfd244c6a5d23a7fdf89f1990e002c5565e1babbdb53193e95bc",
                    commitment:
                        "0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4",
                    enroll_sig:
                        "0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31",
                    amount: "20000000000000",
                    enrolled_at: 0,
                },
            },
            {
                address: "boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308",
                data: {
                    utxo_key:
                        "0xe0ea82fd0ab9c57b068123927c002750181366f417c30a6ded05a23aca99c2c98b508bba9ba7c496eee36d78eeb7b71f330f81633372a712010036c4dc506b07",
                    commitment:
                        "0xdd1b9c62d4c62246ea124e5422d5a2e23d3ca9accb0eba0e46cd46708a4e7b417f46df34dc2e3cba9a57b1dc35a66dfc2d5ef239ebeaaa00299232bc7e3b7bfa",
                    enroll_sig:
                        "0x0e0070e5951ef5be897cb593c4c57ce28b7529463f7e5644b1314ab7cc69fd625c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa74fe2",
                    amount: "20000000000000",
                    enrolled_at: 0,
                },
            },
            {
                address: "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku",
                data: {
                    utxo_key:
                        "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f",
                    commitment:
                        "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328",
                    enroll_sig:
                        "0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422",
                    amount: "20000000000000",
                    enrolled_at: 0,
                },
            },
            {
                address: "boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq",
                data: {
                    utxo_key:
                        "0xd935b5f1b616e6ec5c96502395e4b89683f526bdb8845f93a67bd329d44b1c2e5c185492e9610c0e3648609b3a9a5b21a35ee1a16f234c6415099803a97306ca",
                    commitment:
                        "0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc",
                    enroll_sig:
                        "0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634",
                    amount: "20000000000000",
                    enrolled_at: 0,
                },
            },
            {
                address: "boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t",
                data: {
                    utxo_key:
                        "0x00bac393977fbd1e0edc70a34c7ca802dafe57f2b4a2aabf1adaac54892cb1cbae72cdeeb212904101382690d18d2d2c6ac99b83227ca73b307fde0807c4af03",
                    commitment:
                        "0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb",
                    enroll_sig:
                        "0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304",
                    amount: "20000000000000",
                    enrolled_at: 0,
                },
            },
            {
                address: "boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq",
                data: {
                    utxo_key:
                        "0x6fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673",
                    commitment:
                        "0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1",
                    enroll_sig:
                        "0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01",
                    amount: "20000000000000",
                    enrolled_at: 0,
                },
            },
        ];
        this.load(enrollment_genesis);
    }

    public add(address: PublicKey, data: IEnrollment) {
        this.storage.set(address.toString(), data);
    }

    public remove(address: PublicKey) {
        const key = address.toString();
        if (this.storage.has(key)) {
            this.storage.delete(key);
        }
    }

    public load(data: any[]) {
        data.forEach((value, idx) => {
            const pk = new PublicKey(value.address);
            const enroll = {
                utxo_key: new Hash(value.data.utxo_key),
                commitment: new Hash(value.data.commitment),
                enroll_sig: new Signature(value.data.enroll_sig),
                amount: Amount.make(value.data.amount),
                enrolled_at: value.data.enrolled_at,
            };
            this.add(pk, enroll);
        });
    }
}

/**
 * Pre-images for each validator.
 */
export class PreImageStorage {
    public storage: Map<string, IPreImage[]>;

    constructor() {
        this.storage = new Map<string, IPreImage[]>();
        const frozen_storage = new FrozenUTXOStorage();
        iota(6).forEach((value) => {
            const keys = ValidatorKey.keys(value);
            const utxo = frozen_storage.get(keys.address);
            if (utxo !== undefined) this.createPreImages(keys, utxo);
        });
    }

    public createPreImages(key: KeyPair, utxo: Hash) {
        const max_height = 100;
        const values: Hash[] = [];
        let seed: Hash = new Hash(Buffer.from(SodiumHelper.sodium.crypto_generichash(Hash.Width, key.secret.data)));
        for (let idx = max_height - 1; idx >= 0; idx--) {
            values[idx] = new Hash(seed.data);
            seed = hashFull(seed);
        }
        const res: IPreImage[] = [];
        for (let height = 0; height < max_height; height++) {
            res.push({ utxo, hash: values[height], height });
        }
        this.storage.set(key.address.toString(), res);
        return res;
    }

    public getImage(address: PublicKey, height: number): IPreImage | undefined {
        if (height < 0) return undefined;
        const images = this.storage.get(address.toString());
        if (images !== undefined) {
            return images.find((m) => m.height === height);
        } else {
            return undefined;
        }
    }
}

/**
 * Frozen UTXO for each validator.
 */
export class FrozenUTXOStorage {
    public storage: Map<string, Hash>;
    constructor() {
        this.storage = new Map<string, Hash>();
        const frozen_utxo_genesis = [
            {
                address: "boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn",
                utxo_key:
                    "0x7fa36630b0d4a6be729fcab6db70c9b603f2da4c28feaa754f178b5cedb0174a9647fe8c08cdbfd244c6a5d23a7fdf89f1990e002c5565e1babbdb53193e95bc",
            },
            {
                address: "boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308",
                utxo_key:
                    "0xe0ea82fd0ab9c57b068123927c002750181366f417c30a6ded05a23aca99c2c98b508bba9ba7c496eee36d78eeb7b71f330f81633372a712010036c4dc506b07",
            },
            {
                address: "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku",
                utxo_key:
                    "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f",
            },
            {
                address: "boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq",
                utxo_key:
                    "0xd935b5f1b616e6ec5c96502395e4b89683f526bdb8845f93a67bd329d44b1c2e5c185492e9610c0e3648609b3a9a5b21a35ee1a16f234c6415099803a97306ca",
            },
            {
                address: "boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t",
                utxo_key:
                    "0x00bac393977fbd1e0edc70a34c7ca802dafe57f2b4a2aabf1adaac54892cb1cbae72cdeeb212904101382690d18d2d2c6ac99b83227ca73b307fde0807c4af03",
            },
            {
                address: "boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq",
                utxo_key:
                    "0x6fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673",
            },
        ];

        this.load(frozen_utxo_genesis);
    }

    public add(address: PublicKey, data: Hash) {
        this.storage.set(address.toString(), data);
    }

    public get(address: PublicKey): Hash {
        const utxo = this.storage.get(address.toString());
        if (utxo === undefined) throw new Error("Not found frozen utxo");
        return utxo;
    }

    public remove(address: PublicKey) {
        const key = address.toString();
        if (this.storage.has(key)) {
            this.storage.delete(key);
        }
    }

    public load(data: any[]) {
        data.forEach((value, idx) => {
            const pk = new PublicKey(value.address);
            this.add(pk, new Hash(value.utxo_key));
        });
    }
}

export class ValidatorAtHeight {
    private map: Map<number, KeyPair[]>;
    constructor() {
        this.map = new Map<number, KeyPair[]>();
    }

    public add(height: number, validator: KeyPair) {
        const list = this.map.get(height);
        if (list === undefined) {
            this.map.set(height, [validator]);
            return;
        }
        const found = list.find((m) => SecretKey.equal(m.secret, validator.secret));
        if (found === undefined) list.push(validator);
    }

    public remove(height: number, validator: KeyPair) {
        const list = this.map.get(height);
        if (list === undefined) {
            return;
        }
        const found = list.findIndex((m) => SecretKey.equal(m.secret, validator.secret));
        if (found >= 0) list.splice(found, 1);
    }

    public get(height: number): KeyPair[] {
        const list = this.map.get(height);
        if (list === undefined) return [];
        else return list;
    }

    public set(height: number, validators: KeyPair[]) {
        this.map.set(height, validators);
    }
}

/**
 * Creation of blocks, addition of validators (building freeze transaction, creation enrollment),
 * deletion of validators, and creation of pre-images of registered validators.
 */
export class BlockManager {
    public static ENROLLMENT_CYCLE: number = 20;
    public enrollments: EnrollmentStorage;
    public validators: ValidatorAtHeight;
    public height: number;
    public blocks: Block[] = [];

    private new_enrollments: IEnrollment[];
    private re_enrollments: IEnrollment[];
    private pre_images: PreImageStorage;
    private frozen_utxos: FrozenUTXOStorage;
    private lastedValidators: KeyPair[];

    private enrolled_validators: ValidatorAtHeight;
    private added_validators: ValidatorAtHeight;
    private slashed_validators: ValidatorAtHeight;
    private removed_validators: ValidatorAtHeight;

    constructor() {
        this.enrollments = new EnrollmentStorage();
        this.pre_images = new PreImageStorage();
        this.frozen_utxos = new FrozenUTXOStorage();
        this.validators = new ValidatorAtHeight();
        this.lastedValidators = [];
        this.height = 0;
        this.new_enrollments = [];
        this.re_enrollments = [];
        this.blocks = [Block.reviver("", sample_data[0])];

        this.enrolled_validators = new ValidatorAtHeight();
        this.added_validators = new ValidatorAtHeight();
        this.slashed_validators = new ValidatorAtHeight();
        this.removed_validators = new ValidatorAtHeight();

        iota(0, 6).forEach((n) => {
            const validator = ValidatorKey.keys(n);
            this.enrolled_validators.add(0, validator);
            this.added_validators.add(1, validator);
        });

        const validators = iota(0, 6).map((m) => ValidatorKey.keys(m));
        validators.sort((a, b) => {
            return Hash.compare(this.frozen_utxos.get(a.address), this.frozen_utxos.get(b.address));
        });

        this.validators.set(this.height, validators);
        this.lastedValidators = this.validators.get(this.height).map((m) => m);
    }

    private createReEnrollments() {
        this.enrollments.storage.forEach((value, key) => {
            const found = this.lastedValidators.find((m) => key === m.address.toString());
            if (found !== undefined) {
                if (this.height + 1 - value.enrolled_at >= BlockManager.ENROLLMENT_CYCLE) {
                    const enrollment = {
                        utxo_key: value.utxo_key,
                        commitment: value.commitment,
                        enroll_sig: new Signature(Buffer.alloc(Signature.Width)),
                        amount: value.amount,
                        enrolled_at: this.height + 1,
                    };
                    this.re_enrollments.push(enrollment);
                    this.enrollments.add(new PublicKey(key), enrollment);
                }
            }
        });
    }

    /**
     * Add validators
     * Create a freeze transaction and create enrollment.
     */
    public addValidators(validators: KeyPair[], utxos: UnspentTxOutput[], key: KeyPair): Transaction {
        const enabled_validators = validators.filter(
            (m) => this.lastedValidators.find((v) => v.address.toString() === m.address.toString()) === undefined
        );
        const builder = new TxBuilder(key);
        utxos.forEach((m) => {
            builder.addInput(m.utxo, m.amount);
        });
        enabled_validators.forEach((k) => {
            builder.addOutput(k.address, BOA(40_000));
        });
        const tx = builder.sign(OutputType.Freeze, BOA(5));
        const tx_hash = hashFull(tx);
        enabled_validators.forEach((k) => {
            const pk = k.address;
            const lock = Lock.fromPublicKey(pk);
            const found_idx = tx.outputs.findIndex((m) => Buffer.compare(m.lock.bytes, lock.bytes) === 0);
            if (found_idx >= 0) {
                const utxo_key = makeUTXOKey(tx_hash, JSBI.BigInt(found_idx));
                this.frozen_utxos.add(pk, utxo_key);
            }
        });

        enabled_validators.forEach((k) => {
            const utxo_key = this.frozen_utxos.get(k.address);
            if (utxo_key !== undefined) {
                const enrollment = {
                    utxo_key,
                    commitment: hashFull(Scalar.random()),
                    enroll_sig: new Signature(Buffer.alloc(Signature.Width)),
                    amount: BOA(40_000),
                    enrolled_at: this.height + 1,
                };
                this.new_enrollments.push(enrollment);
                this.enrollments.add(k.address, enrollment);
                this.pre_images.createPreImages(k, utxo_key);

                this.enrolled_validators.add(this.getNextBlockHeight(), k);
                this.added_validators.add(this.getNextBlockHeight(), k);
            }
        });

        this.createReEnrollments();

        return tx;
    }

    public removeValidator(validator: KeyPair) {
        const found = this.lastedValidators.findIndex((m) => PublicKey.equal(m.address, validator.address));
        if (found >= 0) {
            this.slashed_validators.add(this.getLastBlockHeight(), validator);
            this.removed_validators.add(this.getLastBlockHeight() + 1, validator);
        }
    }

    /**
     * Store in the block and increase the height by 1.
     */
    public saveBlock(txs: Transaction[], enrollments: Enrollment[]): Block {
        const tx_hash_list = txs.map((tx) => hashFull(tx));
        const merkle_tree = buildMerkleTree(tx_hash_list);
        const merkle_root =
            merkle_tree.length > 0 ? merkle_tree[merkle_tree.length - 1] : new Hash(Buffer.alloc(Hash.Width));

        const pre_images: Hash[] = [];
        const new_validators = this.getValidatorsAtNextBlock(this.height).filter(
            (m) => m.action !== ValidatorAction.REMOVE
        );
        const bits = new BitMask(new_validators.length);

        new_validators.sort((prev, next) => {
            return Hash.compare(
                this.frozen_utxos.get(prev.validator.address),
                this.frozen_utxos.get(next.validator.address)
            );
        });

        new_validators.forEach((validator, idx) => {
            if (validator.action === ValidatorAction.ADD || validator.action === ValidatorAction.ALREADY_EXIST) {
                const pre_image = this.pre_images.getImage(validator.validator.address, this.getNextBlockHeight());
                if (pre_image !== undefined) {
                    pre_images.push(pre_image.hash);
                    bits.set(idx, true);
                } else {
                    throw new Error("Not found pre image");
                    pre_images.push(new Hash(Buffer.alloc(Hash.Width)));
                    bits.set(idx, false);
                }
            } else if (validator.action === ValidatorAction.SLASHING) {
                pre_images.push(new Hash(Buffer.alloc(Hash.Width)));
                bits.set(idx, false);
            }
        });

        const block_header = new BlockHeader(
            hashFull(this.blocks[this.blocks.length - 1].header),
            merkle_root,
            new Signature(Buffer.alloc(Signature.Width)),
            bits,
            new Height(JSBI.BigInt(this.height + 1)),
            pre_images,
            enrollments,
            this.blocks[this.blocks.length - 1].header.time_offset + 10 * 60
        );
        const new_block = new Block(block_header, txs, merkle_tree);
        this.blocks.push(new_block);
        this.saveValidatorsAtNextBlock(this.height);
        this.height = JSBI.toNumber(new_block.header.height.value);
        this.new_enrollments.length = 0;
        this.re_enrollments.length = 0;

        this.lastedValidators = this.validators.get(this.height).map((m) => m);

        return new_block;
    }

    public getValidatorsAtNextBlock(height?: number): IValidatorAggregate[] {
        if (height === undefined) height = this.height;
        if (height > this.height) height = this.height;
        const res: IValidatorAggregate[] = [];

        // Get previous validators
        const validators = this.validators.get(height);
        if (validators !== undefined) {
            res.push(
                ...validators.map((m) => {
                    return { validator: m, action: ValidatorAction.ALREADY_EXIST };
                })
            );
        }

        // Check removed validators
        const slashed_validator = this.slashed_validators.get(height);
        if (slashed_validator !== undefined) {
            slashed_validator.forEach((r) => {
                const found = res.find((m) => SecretKey.equal(m.validator.secret, r.secret));
                if (found !== undefined) {
                    found.action = ValidatorAction.SLASHING;
                }
            });
        }

        // Check removed validators
        const remove_validator = this.removed_validators.get(height);
        if (remove_validator !== undefined) {
            remove_validator.forEach((r) => {
                const found = res.find((m) => SecretKey.equal(m.validator.secret, r.secret));
                if (found !== undefined) {
                    found.action = ValidatorAction.REMOVE;
                }
            });
        }

        this.added_validators.get(height).forEach((added) => {
            const found = res.find((m) => SecretKey.equal(m.validator.secret, added.secret));
            if (found === undefined) {
                res.push({ validator: added, action: ValidatorAction.ADD });
            }
        });

        res.sort((a, b) => {
            return Hash.compare(this.frozen_utxos.get(a.validator.address), this.frozen_utxos.get(b.validator.address));
        });

        return res;
    }

    public saveValidatorsAtNextBlock(height?: number) {
        if (height === undefined) height = this.height;
        const res = this.getValidatorsAtNextBlock(height);
        const validators: KeyPair[] = [];

        for (const elem of res) {
            if (elem.action !== ValidatorAction.REMOVE) {
                validators.push(elem.validator);
            }
        }
        validators.sort((a, b) => {
            return Hash.compare(this.frozen_utxos.get(a.address), this.frozen_utxos.get(b.address));
        });

        this.validators.set(height + 1, validators);
    }

    /**
     * Return the information that needs to be enrolled in this block.
     */
    public getNewEnrollment(): Enrollment[] {
        return this.new_enrollments.map((m) => {
            return new Enrollment(m.utxo_key, m.commitment, m.enroll_sig);
        });
    }

    /**
     * Return the information that needs to be re-enrolled in this block.
     */
    public getReEnrollment(): Enrollment[] {
        return this.re_enrollments.map((m) => {
            return new Enrollment(m.utxo_key, m.commitment, m.enroll_sig);
        });
    }

    /**
     * Return bitmasks for valid validators of this block.
     */
    public getBitMask(height?: number): BitMask {
        if (height === undefined) height = this.height;
        if (height > this.height) height = this.height;

        const validators = this.getValidatorsAtNextBlock(height).filter((m) => m.action !== ValidatorAction.REMOVE);

        const bits = new BitMask(validators.length);
        validators.forEach((validator, idx) => {
            if (validator.action === ValidatorAction.ALREADY_EXIST || validator.action === ValidatorAction.ADD)
                bits.set(idx, true);
            else bits.set(idx, false);
        });
        return bits;
    }

    /**
     * Return valid validators of this block. Validators will be included from the next block.
     */
    public getValidators(height?: number): PublicKey[] {
        if (height === undefined) height = this.height;
        const validators = this.validators.get(height);

        return validators.map((m) => m.address);
    }

    /**
     * Return pre-image of the validator at the height
     */
    public getPreImage(address: PublicKey, height: number): IPreImage | undefined {
        return this.pre_images.getImage(address, height);
    }

    /**
     * Returns the height of the new block
     */
    public getNextBlockHeight(): number {
        return this.height + 1;
    }

    /**
     * Return the height of the last block
     */
    public getLastBlockHeight(): number {
        return this.height;
    }

    /**
     * Wait until the height of the block reaches.
     */
    public async waitFor(height: number, client: BOAClient) {
        while (true) {
            const h = await client.getBlockHeight();
            if (JSBI.toNumber(h) === height) break;
            await delay(100);
        }
    }
}

export class Vote {
    private boa_client: BOAClient;

    private block_manager: BlockManager;

    private validator_key: KeyPair;

    private app_name: string;

    private proposal_id: string;

    private ballot_answer: number;

    private sequence: number;

    private preimage_height: number;

    constructor(
        boa_client: BOAClient,
        block_manager: BlockManager,
        validator_key: KeyPair,
        app_name: string,
        proposal_id: string,
        ballot_answer: number,
        sequence: number,
        preimage_height: number
    ) {
        this.boa_client = boa_client;
        this.block_manager = block_manager;
        this.validator_key = validator_key;
        this.app_name = app_name;
        this.proposal_id = proposal_id;
        this.ballot_answer = ballot_answer;
        this.sequence = sequence;
        this.preimage_height = preimage_height;
    }

    public async CreateVote() {
        let validator_utxo_provider: UTXOProvider = new UTXOProvider(this.validator_key.address, this.boa_client);
        const res = this.createVoterCard(this.validator_key);

        const pre_image = this.block_manager.getPreImage(this.validator_key.address, this.preimage_height);
        if (!pre_image) return;

        const key_agora_admin = hashMulti(pre_image.hash, Buffer.from(this.app_name));
        const key_encrypt = Encrypt.createKey(key_agora_admin.data, this.proposal_id);
        const ballot = Encrypt.encrypt(Buffer.from([this.ballot_answer]), key_encrypt);
        const ballot_data = new BallotData(this.app_name, this.proposal_id, ballot, res.card, this.sequence);
        ballot_data.signature = res.temporary_key.secret.sign<BallotData>(ballot_data);

        const buffer = new SmartBuffer();
        ballot_data.serialize(buffer);
        const payload = buffer.toBuffer();

        const utxos = await validator_utxo_provider.getUTXO(BOA(5));
        const builder = new TxBuilder(this.validator_key);
        utxos.forEach((m) => {
            builder.addInput(m.utxo, m.amount);
        });
        builder.assignPayload(payload);

        const tx = builder.sign(OutputType.Payment, BOA(5));

        return tx;
    }

    public createVoterCard(validator: KeyPair): { card: VoterCard; temporary_key: KeyPair } {
        const temporary_key = KeyPair.random();
        const card = new VoterCard(validator.address, temporary_key.address, new Date().toString());
        card.signature = validator.secret.sign<VoterCard>(card);
        return {
            card,
            temporary_key,
        };
    }
}
