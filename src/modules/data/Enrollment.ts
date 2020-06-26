/*******************************************************************************

    The class that defines and parses the enrollment of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { validateJSON } from '../utils';

/**
 * The class that defines and parses the enrollment of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Enrollment
{
    utxo_key: string = "";
    random_seed: string = "";
    cycle_length: number = 0;
    enroll_sig: string = "";

    /**
     * This parses JSON.
     * @param json The object of the JSON
     */
    public parseJSON (json: any)
    {
        validateJSON(this, json);

        this.utxo_key = json.utxo_key;
        this.random_seed = json.random_seed;
        this.cycle_length = json.cycle_length;
        this.enroll_sig = json.enroll_sig;
    }
}
