/*******************************************************************************

    The class that defines the transaction's inputs of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Hash } from './Hash';
import { Signature } from './Signature';
import { Validator, ITxInputs } from './validator';

import { SmartBuffer } from 'smart-buffer';

/**
 * The class that defines the transaction's inputs of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class TxInputs
{
    /**
     * The hash of the previous transaction containing the output to spend
     */
    public previous: Hash;

    /**
     * The index of the output in the previous transaction
     */
    public index: number;

    /**
     * A signature that should be verified using public key of the output in the previous transaction
     */
    public signature: Signature;

    /**
     * Constructor
     * @param previous - The hash of the previous transaction containing the output to spend
     * @param index - The index of the output in the previous transaction
     * @param signature - A signature that should be verified using public key of the output in the previous transaction
     */
    constructor (previous: Hash, index: number, signature: Signature)
    {
        this.previous = previous;
        this.index = index;
        this.signature = signature;
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `TxInputs` if `key == ""`, `value` otherwise.
     */
    public static reviver (key: string, value: any): any
    {
        if (key !== "")
            return value;

        Validator.isValidOtherwiseThrow<ITxInputs>('TxInputs', value);
        return new TxInputs(
            new Hash(value.previous), Number(value.index), new Signature(value.signature));
    }

    /**
     * Collects data to create a hash.
     * @param buffer - The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        this.previous.computeHash(buffer);
        buffer.writeUInt32LE(this.index);
    }
}
