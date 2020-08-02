/*******************************************************************************

    The class that defines and parses the enrollment of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, IEnrollment } from "./validator";
import { Hash } from "./Hash";
import { Signature } from "./Signature";
import { SmartBuffer } from "smart-buffer";

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
     * @param key - A hash of a frozen UTXO
     * @param seed - The nth image of random value
     * @param cycle - The number of rounds a validator will participate in
     * @param sig - A signature for the message H(K, X, n, R) and the key K, using R
     */
    constructor (key?: Hash, seed?: Hash, cycle?: number, sig?: Signature)
    {
        if (key != undefined)
            this.utxo_key = key;
        else
            this.utxo_key = new Hash();

        if (seed != undefined)
            this.random_seed = seed;
        else
            this.random_seed = new Hash();

        if (cycle != undefined)
            this.cycle_length = cycle;
        else
            this.cycle_length = 0;

        if (sig != undefined)
            this.enroll_sig = sig;
        else
            this.enroll_sig = new Signature();
    }

    /**
     * Reads from JSON.
     * @param json - The JSON data
     */
    public fromJSON (json: any)
    {
        Validator.isValidOtherwiseThrow<IEnrollment>('Enrollment', json);

        this.utxo_key.fromString(json.utxo_key);
        this.random_seed.fromString(json.random_seed);
        this.cycle_length = Number(json.cycle_length);
        this.enroll_sig.fromString(json.enroll_sig);
    }

    /**
     * Serialize as binary data.
     * @param buffer - The buffer where serialized data is stored
     */
    public serialize (buffer: SmartBuffer)
    {
        this.utxo_key.serialize(buffer);
        this.random_seed.serialize(buffer);
        buffer.writeInt32LE(this.cycle_length);
        this.enroll_sig.serialize(buffer);
    }

    /**
     * Deserialize as binary data.
     * @param buffer - The buffer where serialized data is stored
     */
    public deserialize (buffer: SmartBuffer)
    {
        this.utxo_key.deserialize(buffer);
        this.random_seed.deserialize(buffer);
        this.cycle_length = buffer.readInt32LE();
        this.enroll_sig.deserialize(buffer);
    }
}
