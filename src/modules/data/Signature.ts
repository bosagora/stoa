/*******************************************************************************

    Contains definition for the signature

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { readFromString, writeToString, Endian, reverse } from '../utils/buffer';

import * as assert from 'assert';

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
     * @param endian The byte order
     */
    constructor (bin?: Buffer, endian?: Endian)
    {
        this.data = Buffer.alloc(Signature.Width);
        if (bin != undefined)
            this.fromBinary(bin, endian);
    }

    /**
     * Reads from the hex string
     * @param hex The hex string
     * @param endian The byte order
     * @returns The instance of Signature
     */
    public fromString (hex: string, endian?: Endian): Signature
    {
        if (endian === undefined)
            endian = Endian.Little;

        readFromString(hex, this.data, endian);
        return this;
    }

    /**
     * Writes to the hex string
     * @param endian The byte order
     * @returns The hex string
     */
    public toString (endian?: Endian): string
    {
        if (endian === undefined)
            endian = Endian.Little;

        return writeToString(this.data, endian);
    }

    /**
     * Set binary data
     * @param bin The binary data of the signature
     * @param endian The byte order
     * @returns The instance of Signature
     */
    public fromBinary (bin: Buffer, endian?: Endian): Signature
    {
        assert.strictEqual(bin.length, Signature.Width);

        if (endian === undefined)
            endian = Endian.Big;

        if (endian === Endian.Little)
            reverse(bin, this.data);
        else
            bin.copy(this.data);

        return this;
    }

    /**
     * Get binary data
     * @param endian The byte order
     * @returns The binary data of the signature
     */
    public toBinary (endian?: Endian): Buffer
    {
        if (endian === undefined)
            endian = Endian.Big;

        if (endian === Endian.Little)
            return reverse(this.data);
        else
            return this.data;
    }

    /**
     * Creates from the hex string
     * @param hex The hex string
     * @param endian The byte order
     * @returns The instance of Signature
     */
    public static createFromString (hex: string, endian?: Endian): Signature
    {
        return (new Signature()).fromString(hex, endian);
    }

    /**
     * Creates from Buffer
     * @param bin The binary data of the signature
     * @param endian The byte order
     * @returns The instance of Signature
     */
    public static createFromBinary (bin: Buffer, endian?: Endian): Signature
    {
        return new Signature(bin, endian);
    }
}
