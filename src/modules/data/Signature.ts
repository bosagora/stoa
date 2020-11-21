/*******************************************************************************

    Contains definition for the signature

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Utils, Endian } from '../utils/Utils';

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
     * Construct a new instance of this class
     *
     * @param data   The string or binary representation of the Signature
     * @param endian The byte order
     */
    constructor (data: Buffer | string, endian: Endian = Endian.Big)
    {
        if (typeof data === 'string')
            this.data = Utils.readFromString(data, Buffer.alloc(Signature.Width));
        else
        {
            this.data = Buffer.alloc(Signature.Width);
            this.fromBinary(data, endian);
        }
        assert.ok(this.data.length == Signature.Width);
    }

    /**
     * Reads from the hex string
     * @param hex The hex string
     * @returns The instance of Signature
     */
    public fromString (hex: string): Signature
    {
        Utils.readFromString(hex, this.data);
        return this;
    }

    /**
     * Writes to the hex string
     * @returns The hex string
     */
    public toString (): string
    {
        return Utils.writeToString(this.data);
    }

    /**
     * Set binary data
     * @param bin    The binary data of the signature
     * @param endian The byte order
     * @returns The instance of Signature
     */
    public fromBinary (bin: Buffer, endian: Endian = Endian.Big): Signature
    {
        assert.strictEqual(bin.length, Signature.Width);

        bin.copy(this.data);
        if (endian === Endian.Little)
            this.data.reverse();

        return this;
    }

    /**
     * Get binary data
     * @param endian The byte order
     * @returns The binary data of the signature
     */
    public toBinary (endian: Endian = Endian.Big): Buffer
    {
        if (endian === Endian.Little)
            return Buffer.from(this.data).reverse();
        else
            return this.data;
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON (key?: string): string
    {
        return this.toString();
    }

    /**
     * The signature consisting of zero values for all bytes.
     * @returns The instance of Signature
     */
    static get init(): Signature
    {
        return new Signature(Buffer.alloc(Signature.Width));
    }
}
