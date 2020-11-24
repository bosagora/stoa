/*******************************************************************************

    The class that defines the transaction's outputs of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { PublicKey } from './PublicKey';
import { Validator, ITxOutput } from './validator';

import { SmartBuffer } from 'smart-buffer';

/**
 * The class that defines the transaction's outputs of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class TxOutput
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
     * @param value   The monetary value
     * @param address The public key
     */
    constructor (value: bigint, address: PublicKey)
    {
        if (value <= 0n)
            throw new Error(`[Output][${address.toString()}] Positive amount expected, not ${value.toString()}`);
        this.value = value;
        this.address = address;
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

        Validator.isValidOtherwiseThrow<ITxOutput>('TxOutput', value);
        return new TxOutput(BigInt(value.value), new PublicKey(value.address));
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        const buf = Buffer.allocUnsafe(8);
        buf.writeBigUInt64LE(this.value);
        buffer.writeBuffer(buf);
        this.address.computeHash(buffer);
    }

    /**
     * The instance consisting of zero values for all bytes.
     * @returns The instance of TxOutput
     */
    static get init(): TxOutput
    {
        let res = new TxOutput(BigInt(1), PublicKey.init);
        res.value = BigInt(0);
        return res;
    }
}
