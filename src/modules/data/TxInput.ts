/*******************************************************************************

    The class that defines the transaction's inputs of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Hash, hashFull, makeUTXOKey } from './Hash';
import { Signature } from './Signature';
import { Transaction } from './Transaction';
import { Validator, ITxInput } from './validator';

import { SmartBuffer } from 'smart-buffer';

/**
 * The class that defines the transaction's inputs of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class TxInput
{
    /**
     * The hash of the UTXO to be spent
     */
    public utxo: Hash;

    /**
     * A signature that should be verified using public key of the output in the previous transaction
     */
    public signature: Signature;

    /**
     * Constructor
     * @param first  The hash of the UTXO or the hash of the transaction
     * @param second The instance of Signature or output index
     * in the previous transaction
     * If the type of the second parameter is bigint,
     * the first parameter is considered the hash of the transaction
     * otherwise, the first parameter is considered the hash of the UTXO.
     */
    constructor (first: Hash, second: Signature | bigint)
    {
        if (typeof second == "bigint") {
            this.utxo = makeUTXOKey(first, second);
            this.signature = Signature.init;
        } else {
            this.utxo = first;
            this.signature = second;
        }
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

        Validator.isValidOtherwiseThrow<ITxInput>('TxInput', value);
        return new TxInput(
            new Hash(value.utxo), new Signature(value.signature));
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        this.utxo.computeHash(buffer);
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON (key?: string): object
    {
        return {
            "utxo": this.utxo,
            "signature": this.signature
        }
    }

    /**
     * The instance consisting of zero values for all bytes.
     * @returns The instance of TxInput
     */
    static get init(): TxInput
    {
        return new TxInput(Hash.init, Signature.init);
    }
}
