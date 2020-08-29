/*******************************************************************************

    Includes classes and functions associated with hash.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as sodium from 'sodium-native'
import { readFromString, writeToString } from "../utils/buffer"

/**
 * The Class for creating hash
 */
export class Hash
{
    /**
     * Buffer containing calculated hash values
     */
    public readonly data: Buffer;

    /**
     * The number of byte of the Hash
     */
    public static Width: number = 64;

    /**
     * The hash consisting of zero values for all bytes.
     * @returns The instance of Hash
     */
    static get NULL(): Hash
    {
        return new Hash();
    }

    /**
     * Constructor
     * @param bin The binary data of the hash
     */
    constructor (bin?: Buffer)
    {
        this.data = Buffer.alloc(Hash.Width);
        if (bin != undefined)
            bin.copy(this.data);
    }

    /**
     * Reads from the hex string
     * @param hex The hex string
     * @returns The instance of Hash
     */
    public fromString (hex: string): Hash
    {
        readFromString(hex, this.data);
        return this;
    }

    /**
     * Writes to the hex string
     * @returns The hex string
     */
    public toString (): string
    {
        return writeToString(this.data);
    }

    /**
     * Creates from the hex string
     * @param hex The hex string
     * @returns The instance of Hash
     */
    public static createFromString (hex: string): Hash
    {
        return (new Hash()).fromString(hex);
    }
}

/**
 * Creates a hash and stores it in buffer.
 * @param source Original for creating hash
 * @returns Instance of Hash
 */
export function hash (source: Buffer): Hash
{
    let temp = Buffer.alloc(Hash.Width);
    sodium.crypto_generichash(temp, source);
    return new Hash(temp);
}

/**
 * Creates a hash of the two buffer combined.
 * @param source1 The original for creating hash
 * @param source2 The original for creating hash
 * @returns The instance of Hash
 * See_Also https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/Hash.d#L239-L255
 */
export function hashMulti (source1: Buffer, source2: Buffer): Hash
{
    let merge = Buffer.alloc(source1.length + source2.length);
    source1.copy(merge);
    source2.copy(merge, source1.length);

    let temp = Buffer.alloc(Hash.Width);
    sodium.crypto_generichash(temp, merge);
    return new Hash(temp);
}

/**
 * Makes a UTXOKey
 * @param h The instance of transaction's Hash
 * @param index The index of the output
 * @returns The instance of Hash
 * See_Also https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/consensus/data/UTXOSetValue.d#L50-L53
 */
export function makeUTXOKey (h: Hash, index: bigint): Hash
{
    let idx = Buffer.alloc(8);
    idx.writeBigUInt64LE(index);

    return hashMulti(h.data, idx);
}
