/*******************************************************************************

    The class that defines the transaction of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, ITransaction } from './validator'
import { TxInputs } from './TxInputs';
import { TxOutputs } from './TxOutputs';

/**
 * The transaction type constant
 */
export enum TxType
{
    Payment = 0,
    Freeze = 1
}

/**
 * The class that defines the transaction of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Transaction
{
    /**
     * The type of the transaction
     */
    public type: TxType;

    /**
     * The array of references to the unspent output of the previous transaction
     */
    public inputs: TxInputs[];

    /**
     * The array of newly created outputs
     */
    public outputs: TxOutputs[];

    /**
     * Constructor
     * @param type - The type of the transaction
     * @param inputs - The array of references to the unspent output of the previous transaction
     * @param outputs - The array of newly created outputs
     */
    constructor (type?: number, inputs?: TxInputs[], outputs?: TxOutputs[])
    {
        if (type !== undefined)
            this.type = type;
        else
            this.type = 0;

        if (inputs !== undefined)
            this.inputs = inputs;
        else
            this.inputs = [];

        if (outputs !== undefined)
            this.outputs = outputs;
        else
            this.outputs = [];
    }

    /**
     * This parses JSON.
     * @param json The object of the JSON
     * @returns The instance of Transaction
     */
    public parseJSON (json: any): Transaction
    {
        Validator.isValidOtherwiseThrow<ITransaction>('Transaction', json);

        this.type = json.type;

        for (let elem of json.inputs)
            this.inputs.push((new TxInputs()).parseJSON(elem));

        for (let elem of json.outputs)
            this.outputs.push((new TxOutputs()).parseJSON(elem));

        return this;
    }
}
