/*******************************************************************************

    The class that defines the transaction of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { TxInputs } from './TxInputs';
import { TxOutputs } from './TxOutputs';
import { DataPayload } from './DataPayload';
import { Validator, ITransaction } from './validator'

import { SmartBuffer } from 'smart-buffer';

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
     * The data payload to store
     */
    public payload: DataPayload;

    /**
     * Constructor
     * @param type - The type of the transaction
     * @param inputs - The array of references to the unspent output of the previous transaction
     * @param outputs - The array of newly created outputs
     * @param payload - The data payload to store
     */
    constructor (type: number, inputs: TxInputs[], outputs: TxOutputs[], payload: DataPayload)
    {
        this.type = type;
        this.inputs = inputs;
        this.outputs = outputs;
        this.payload = payload;
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `Transaction` if `key == ""`, `value` otherwise.
     */
    public static reviver (key: string, value: any): any
    {
        if (key !== "")
            return value;

        Validator.isValidOtherwiseThrow<ITransaction>('Transaction', value);

        return new Transaction(
            Number(value.type),
            value.inputs.map((elem: any) => TxInputs.reviver("", elem)),
            value.outputs.map((elem: any) => TxOutputs.reviver("", elem)),
            DataPayload.reviver("", value.payload));
    }

    /**
     * Collects data to create a hash.
     * @param buffer - The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        buffer.writeUInt8(this.type);
        for (let elem of this.inputs)
            elem.computeHash(buffer);
        for (let elem of this.outputs)
            elem.computeHash(buffer);
        this.payload.computeHash(buffer);
    }
}
