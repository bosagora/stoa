/*******************************************************************************

    The class that defines the transaction's outputs of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { PublicKey } from './PublicKey';
import { Utils } from '../utils/Utils';
import { Validator, ITxOutputs } from './validator';

import { SmartBuffer } from 'smart-buffer';

/**
 * The class that defines the transaction's outputs of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class TxOutputs
{
    /**
     * The monetary value of this output, in 1/10^7
     */
    public value: bigint;

    /**
     * The public key that can spend this output
     */
    public address: PublicKey;

    /**
     * Constructor
     * @param value - The monetary value
     * @param address - The public key
     */
    constructor (value?: bigint, address?: PublicKey)
    {
        if (value !== undefined)
            this.value = value;
        else
            this.value = 0n;

        if (address !== undefined)
            this.address = address;
        else
            this.address = new PublicKey();
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `TxOutputs` if `key == ""`, `value` otherwise.
     */
    public static reviver (key: string, value: any): any
    {
        if (key !== "")
            return value;

        Validator.isValidOtherwiseThrow<ITxOutputs>('TxOutputs', value);
        return new TxOutputs(BigInt(value.value), new PublicKey(value.address));
    }

    /**
     * Collects data to create a hash.
     * @param buffer - The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        const buf = Buffer.allocUnsafe(8);
        buf.writeBigUInt64LE(this.value);
        buffer.writeBuffer(buf);
        this.address.computeHash(buffer);
    }
}
