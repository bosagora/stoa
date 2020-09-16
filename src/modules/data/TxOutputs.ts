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
import { UInt64 } from 'spu-integer-math';

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
    public value: UInt64;

    /**
     * The public key that can spend this output
     */
    public address: PublicKey;

    /**
     * Constructor
     * @param value - The monetary value
     * @param address - The public key
     */
    constructor (value?: UInt64, address?: PublicKey)
    {
        if (value !== undefined)
            this.value = new UInt64(value);
        else
            this.value = new UInt64(0);

        if (address !== undefined)
            this.address = address;
        else
            this.address = new PublicKey();
    }

    /**
     * This parses JSON.
     * @param json The object of the JSON
     * @returns The instance of TxOutputs
     */
    public parseJSON (json: any): TxOutputs
    {
        Validator.isValidOtherwiseThrow<ITxOutputs>('TxOutputs', json);

        if (Utils.isPositiveInteger(json.value))
            this.value = UInt64.fromString(json.value);
        else
            throw new Error ("Amount is not a positive number.");

        this.address.fromString(json.address);

        return this;
    }

    /**
     * Collects data to create a hash.
     * @param buffer - The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        buffer.writeInt32LE(this.value.lo);
        buffer.writeInt32LE(this.value.hi);
        this.address.computeHash(buffer);
    }
}
