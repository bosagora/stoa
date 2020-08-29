/*******************************************************************************

    The class that defines the transaction's outputs of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, ITxOutputs } from "./validator";
import { PublicKey } from "./PublicKey";
import { SmartBuffer } from "smart-buffer";

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
    public value: number;

    /**
     * The public key that can spend this output
     */
    public address: PublicKey;

    /**
     * Constructor
     * @param value - The monetary value
     * @param address - The public key
     */
    constructor (value?: number, address?: PublicKey)
    {
        if (value !== undefined)
            this.value = value;
        else
            this.value = 0;

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

        this.value = Number(json.value);
        this.address.fromString(json.address);

        return this;
    }

    /**
     * Collects data to create a hash.
     * @param buffer - The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        buffer.writeBigUInt64LE(BigInt(this.value));
        this.address.computeHash(buffer);
    }
}
