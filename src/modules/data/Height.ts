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
import { UInt64 } from 'spu-integer-math';

/**
 * The class that defines the Height.
 */
export class Height
{
    /**
     * the block height
     */
    public value: UInt64;

    /**
     * Construct
     * @param value - The block height
     */
    constructor (value?: UInt64)
    {
        if (value !== undefined)
            this.value = new UInt64(value);
        else
            this.value = UInt64.fromNumber(0);
    }

    /**
     * Collects data to create a hash.
     * @param buffer - The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        buffer.writeInt32LE(this.value.lo);
        buffer.writeInt32LE(this.value.hi);
    }

    /**
     * Writes to the string
     * @param value - The height of the block
     */
    public fromString (value: string)
    {
        this.value = UInt64.fromString(value);
    }

    /**
     * Writes to the string
     */
    public toString ()
    {
        return Utils.UInt64ToString(this.value);
    }
}
