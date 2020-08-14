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
     * @param bin The binary data of the signature
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
     * Reads from the hex string
     * @param hex The hex string
     * @returns The instance of Signature
     */
    public fromString (hex: string): Signature
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
     * @returns The instance of Signature
     */
    public static createFromString (hex: string): Signature
    {
        return (new Signature()).fromString(hex);
    }
}
