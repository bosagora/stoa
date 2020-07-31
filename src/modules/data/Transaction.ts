/*******************************************************************************

    The class that defines and parses the transaction of a block.

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
 * The class that defines and parses the transaction of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Transaction
{
    type: number = 0;
    inputs: TxInputs[] = [];
    outputs: TxOutputs[] = [];

    /**
     * This parses JSON.
     * @param json The object of the JSON
     */
    public parseJSON (json: any)
    {
        Validator.isValidOtherwiseThrow<ITransaction>('Transaction', json);

        this.type = json.type;

        for (let idx = 0; idx < json.inputs.length; idx++)
        {
            let input = new TxInputs();
            input.parseJSON(json.inputs[idx]);
            this.inputs.push(input);
        }

        for (let idx = 0; idx < json.outputs.length; idx++)
        {
            let output = new TxOutputs();
            output.parseJSON(json.outputs[idx]);
            this.outputs.push(output);
        }
    }
}
