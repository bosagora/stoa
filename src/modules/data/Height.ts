/*******************************************************************************

    The class that defines the Height.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Utils } from '../utils/Utils';

import { SmartBuffer } from 'smart-buffer';

/**
 * The class that defines the Height.
 */
export class Height
{
    /**
     * the block height
     */
    public value: bigint;

    /**
     * Construct
     * @param value The block height
     */
    constructor (value: bigint | string)
    {
        this.value = BigInt(value);
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        let buf = Buffer.allocUnsafe(8);
        buf.writeBigUInt64LE(this.value);
        buffer.writeBuffer(buf);
    }

    /**
     * Writes to the string
     * @param value The height of the block
     */
    public fromString (value: string)
    {
        this.value = BigInt(value);
    }

    /**
     * Writes to the string
     */
    public toString ()
    {
        return this.value.toString();
    }

    /**
     * Converts this object to its JSON representation
     *
     * Use `string` as primitive types, as JS is only precise up to
     * `2 ** 53 - 1` but we can get numbers up to `2 ** 64 - 1`.
     */
    public toJSON (key?: string): string
    {
        return this.toString();
    }
}
