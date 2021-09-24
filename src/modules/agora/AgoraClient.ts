/*******************************************************************************

    The class that recovers data

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Block, handleNetworkError, Hash, hashMulti, Height, PreImageInfo } from "boa-sdk-ts";

import axios, { AxiosInstance, AxiosResponse } from "axios";
import URI from "urijs";
import { URL } from "url";

/**
 * The interface exposed by a full node
 *
 * See_Also: https://github.com/bosagora/agora/blob/v0.x.x/source/agora/api/FullNode.d
 */
export interface FullNodeAPI {
    // getNodeInfo (): NodeInfo;
    // getLocalTime (): bigint;

    getBlockHeight(): Promise<Height>;
    getBlocksFrom(height: Height, max_blocks: number): Promise<Block[]>;
    getMerklePath(height: Height, hash: Hash): Promise<Hash[]>;
    // hasTransactionHash (tx: Hash): boolean;
    // putTransaction (tx: Transaction): void;

    // enrollValidator (enroll: Enrollment): void;
    // getEnrollment (enroll_hash: Hash): Enrollment;
    getPreimage(enroll_key: Hash): Promise<PreImageInfo>;
    // receivePreimage (preimage: PreImageInfo): void;
}

/**
 * The class that recovers data
 */
export class AgoraClient implements FullNodeAPI {
    /**
     * The network endpoint to connect to Agora
     */
    private endpoint: URL;

    /**
     * The instance of the axios
     */
    private client: AxiosInstance;

    /**
     * Constructor
     * @param endpoint - The network endpoint to connect to Agora
     */
    constructor(endpoint: URL) {
        this.endpoint = endpoint;
        this.client = axios.create({
            baseURL: endpoint.toString(),
            // Timeout is in ms
            timeout: 10000,
        });
    }

    /**
     * Request an Agora node's current block height.
     */
    public getBlockHeight(): Promise<Height> {
        return this.client.get(URI("/block_height").toString()).then((res) => {
            return new Height(res.data);
        });
    }

    /**
     * Requests and receives data needed for recovery from Agora.
     * @param height - The height of the block
     * @param max_blocks - The maximum number of block to request
     */
    public getBlocksFrom(height: Height, max_blocks: number): Promise<Block[]> {
        return new Promise<Block[]>((resolve, reject) => {
            const uri = URI("/blocks_from").addSearch("height", height.toString()).addSearch("max_blocks", max_blocks);

            this.client
                .get(uri.toString())
                .then((response: AxiosResponse) => {
                    if (response.status === 200) resolve(response.data.map((entry: any) => Block.reviver("", entry)));
                    else reject(handleNetworkError({ response }));
                })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });
        });
    }

    /**
     * Requests and receives the Merkle path.
     * @param height - The height of the block
     * @param hash - The hash of the transaction
     */
    public getMerklePath(height: Height, hash: Hash): Promise<Hash[]> {
        return new Promise<Hash[]>((resolve, reject) => {
            const uri = URI("/merkle_path").addSearch("height", height.toString()).addSearch("hash", hash.toString());

            this.client.get(uri.toString()).then((response: AxiosResponse) => {
                if (response.status === 200) resolve(response.data.map((entry: any) => new Hash(entry)));
                else reject(handleNetworkError({ response }));
            });
        });
    }

    /**
     * Request the latest PreImageInfo for an enrollment key.
     *
     * @param enroll_key Hash of the UTXO used by the validator
     * @returns A `PreImageInfo` matching this `enroll_key`
     */
    public getPreimage(enroll_key: Hash): Promise<PreImageInfo> {
        return new Promise<PreImageInfo>((resolve, reject) => {
            const uri = URI("/preimage").addSearch("enroll_key", enroll_key);

            this.client
                .get(uri.toString())
                .then((response: AxiosResponse) => {
                    if (response.status === 200) resolve(PreImageInfo.reviver("", response.data));
                    else reject(handleNetworkError({ response }));
                })
                .catch((reason: any) => {
                    reject(handleNetworkError(reason));
                });
        });
    }

    public static checkMerklePath(merkle_path: Hash[], tx_hash: Hash, tx_index: number): Hash {
        let root: Hash = tx_hash;
        for (const otherside of merkle_path) {
            if (tx_index & 1) root = hashMulti(otherside, root);
            else root = hashMulti(root, otherside);

            tx_index >>= 1;
        }
        return root;
    }
}
