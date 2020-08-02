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
     * Constructor
     * @param bin Raw hash
     */
    constructor (bin?: Buffer)
    {
        this.data = Buffer.alloc(Hash.Width);
        if (bin != undefined)
            bin.copy(this.data);
    }

    /**
     * Reads from hex string
     * @param hex Hex string
     */
    public fromString (hex: string)
    {
        readFromString(hex, this.data);
    }

    /**
     * Writes to hex string
     * @returns hex string
     */
    public toString (): string
    {
        return writeToString(this.data);
    }

    /**
     * Creates from hex string
     * @param hex Hex string
     */
    public static createFromString (hex: string): Hash
    {
        let h = new Hash();
        h.fromString(hex);
        return h;
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
 * @param source1 Original for creating hash
 * @param source2 Original for creating hash
 * @returns Instance of Hash
 * See_Also https://github.com/bpfkorea/agora/blob/v0.x.x/source/agora/common/Hash.d#L239-L255
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
 * @param h Hash of transaction
 * @param index Index of the output
 * @returns Instance of Hash
 * See_Also https://github.com/bpfkorea/agora/blob/v0.x.x/source/agora/consensus/data/UTXOSetValue.d#L50-L53
 */
export function makeUTXOKey (h: Hash, index: bigint): Hash
{
    let idx = Buffer.alloc(8);
    idx.writeBigUInt64LE(index);

    return hashMulti(h.data, idx);
}
