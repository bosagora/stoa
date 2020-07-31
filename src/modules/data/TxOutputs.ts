/*******************************************************************************

    The class that defines and parses the transaction's outputs of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, ITxOutputs } from "./validator";

/**
 * The class that defines and parses the transaction's outputs of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class TxOutputs
{
    value: number = 0;
    address: string = "";

    /**
     * This parses JSON.
     * @param json The object of the JSON
     */
    public parseJSON (json: any)
    {
        Validator.isValidOtherwiseThrow<ITxOutputs>('TxOutputs', json);

        this.value = json.value;

        this.address = json.address;
    }
}
