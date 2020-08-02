/*******************************************************************************

    Contains definition for the signature

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { readFromString, writeToString } from "../utils/buffer"
import * as assert from "assert";

/**
 * Define the signature
 */
export class Signature
{
    /**
     * Buffer containing signature values
     */
    public readonly data: Buffer;

    /**
     * The number of byte of the signature
     */
    public static Width: number = 64;

    /**
     * Constructor
     * @param bin {Buffer | undefined} Raw signature
     */
    constructor (bin?: Buffer)
    {
        this.data = Buffer.alloc(Signature.Width);
        if (bin != undefined)
        {
            assert.strictEqual(bin.length, Signature.Width);
            bin.copy(this.data);
        }
    }

    /**
     * Reads from hex string
     * @param hex {string} Hex string
     */
    public fromString (hex: string)
    {
        readFromString(hex, this.data);
    }

    /**
     * Writes to hex string
     * @returns {string}
     */
    public toString (): string
    {
        return writeToString(this.data);
    }

    /**
     * Creates from hex string
     * @param hex Hex string
     */
    public static createFromString (hex: string): Signature
    {
        let s = new Signature();
        s.fromString(hex);
        return s;
    }
}
