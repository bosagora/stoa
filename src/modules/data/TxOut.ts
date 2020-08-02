/*******************************************************************************

    The class that defines and parses the transaction's outputs of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, ITxOutputs } from "./validator";
import { PublicKey } from "./PublicKey";

/**
 * The class that defines the transaction's outputs of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class TxOut
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
        if (value != undefined)
            this.value = value;
        else
            this.value = BigInt(0);

        if (address != undefined)
            this.address = address;
        else
            this.address = new PublicKey();
    }

    /**
     * Reads form JSON.
     * @param json - The JSON data
     */
    public fromJSON (json: any)
    {
        Validator.isValidOtherwiseThrow<ITxOutputs>('TxOutputs', json);

        this.value = BigInt(json.value);
        this.address.fromString(json.address);
    }
}
