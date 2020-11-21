/*******************************************************************************

    The class that defines the enrollment of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Hash } from './Hash';
import { Validator, IEnrollment } from './validator';
import { Signature } from './Signature';

import { SmartBuffer } from 'smart-buffer';

/**
 * The class that defines the enrollment of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Enrollment
{
    /**
     * K: A hash of a frozen UTXO
     */
    public utxo_key: Hash;

    /**
     * X: The nth image of random value
     */
    public random_seed: Hash;

    /**
     * n: The number of rounds a validator will participate in
     */
    public cycle_length: number;

    /**
     * S: A signature for the message H(K, X, n, R) and the key K, using R
     */
    public enroll_sig: Signature;

    /**
     * Constructor
     * @param key   A hash of a frozen UTXO
     * @param seed  The nth image of random value
     * @param cycle The number of rounds a validator will participate in
     * @param sig A signature for the message H(K, X, n, R) and the key K, using R
     */
    constructor (key: Hash, seed: Hash, cycle: number, sig: Signature)
    {
        this.utxo_key = key;
        this.random_seed = seed;
        this.cycle_length = cycle;
        this.enroll_sig = sig;
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `Enrollment` if `key == ""`, `value` otherwise.
     */
    public static reviver (key: string, value: any): any
    {
        if (key !== "")
            return value;

        Validator.isValidOtherwiseThrow<IEnrollment>('Enrollment', value);

        return new Enrollment(
            new Hash(value.utxo_key), new Hash(value.random_seed),
            Number(value.cycle_length), new Signature(value.enroll_sig));
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        this.utxo_key.computeHash(buffer);
        this.random_seed.computeHash(buffer);
        buffer.writeUInt32LE(this.cycle_length);
    }
}
