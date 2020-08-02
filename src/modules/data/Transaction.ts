/*******************************************************************************

    The class that defines and parses the transaction of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, ITransaction } from './validator'
import { TxIn } from './TxIn';
import { TxOut } from './TxOut';
import { SmartBuffer } from "smart-buffer";

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
    public inputs: TxIn[];

    /**
     * The array of newly created outputs
     */
    public outputs: TxOut[];

    /**
     * Constructor
     * @param type - The type of the transaction
     * @param inputs - The array of references to the unspent output of the previous transaction
     * @param outputs - The array of newly created outputs
     */
    constructor (type?: number, inputs?: TxIn[], outputs?: TxOut[])
    {
        if (type != undefined)
            this.type = type;
        else
            this.type = 0;

        if (inputs != undefined)
            this.inputs = inputs;
        else
            this.inputs = [];

        if (outputs != undefined)
            this.outputs = outputs;
        else
            this.outputs = [];
    }

    /**
     * Reads form JSON.
     * @param json - The JSON data
     */
    public fromJSON (json: any)
    {
        Validator.isValidOtherwiseThrow<ITransaction>('Transaction', json);

        this.type = json.type;

        for (let elem of json.inputs)
        {
            let input = new TxIn();
            input.fromJSON(elem);
            this.inputs.push(input);
        }

        for (let elem of json.outputs)
        {
            let output = new TxOut();
            output.fromJSON(elem);
            this.outputs.push(output);
        }
    }

    /**
     * Serialize as binary data.
     * @param buffer - The buffer where serialized data is stored
     */
    public serialize (buffer: SmartBuffer)
    {
        buffer.writeUInt8(this.type);
        buffer.writeBigUInt64LE(BigInt(this.inputs.length));
        for (let elem of this.inputs)
            elem.serialize(buffer);

        buffer.writeBigUInt64LE(BigInt(this.outputs.length));
        for (let elem of this.outputs)
            elem.serialize(buffer);
    }

    /**
     * Deserialize as binary data.
     * @param buffer - The buffer where serialized data is stored
     */
    public deserialize (buffer: SmartBuffer)
    {
        this.type = buffer.readUInt8();

        let length = Number(buffer.readBigUInt64LE());
        for (let idx = 0; idx < length; idx++)
        {
            let elem = new TxIn();
            elem.deserialize(buffer);
            this.inputs.push(elem);
        }

        length = Number(buffer.readBigUInt64LE());
        for (let idx = 0; idx < length; idx++)
        {
            let elem = new TxOut();
            elem.deserialize(buffer);
            this.outputs.push(elem);
        }
    }
}
