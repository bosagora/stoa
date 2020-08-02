/*******************************************************************************

    The class that defines and parses the transaction's inputs of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, ITxInputs } from "./validator";
import { Hash } from "./Hash";
import { Signature } from "./Signature";

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
    constructor (previous?: Hash, index?: number, signature?: Signature)
    {
        if (previous != undefined)
            this.previous = new Hash(previous.data);
        else
            this.previous = new Hash();

        if (index != undefined)
            this.index = index;
        else
            this.index = 0;

        if (signature != undefined)
            this.signature = new Signature(signature.data);
        else
            this.signature = new Signature();
    }

    /**
     * Reads from JSON.
     * @param json - The JSON data
     */
    public fromJSON (json: any)
    {
        Validator.isValidOtherwiseThrow<ITxInputs>('TxInputs', json);

        this.previous.fromString(json.previous);

        this.index = Number(json.index);

        this.signature.fromString(json.signature);
    }
}
