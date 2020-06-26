/*******************************************************************************

    The class that defines and parses the transaction's inputs of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { validateJSON } from '../utils';

/**
 * The class that defines and parses the transaction's inputs of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class TxInputs
{
    previous: string = "";
    index: number = 0;
    signature: string = "";

    /**
     * This parses JSON.
     * @param json The object of the JSON
     */
    public parseJSON (json: any)
    {
        validateJSON(this, json);

        this.previous = json.previous;

        this.index = json.index;

        this.signature = json.signature;
    }
}
