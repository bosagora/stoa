/*******************************************************************************

    The class that defines and parses the BitField of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { validateJSON } from '../utils';

/**
 * The class that defines and parses the BitField of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property are not present.
 */
export class BitField
{
    _storage: number[] = [];

    /**
     * This parses JSON.
     * @param json The object of the JSON
     */
    public parseJSON (json: any)
    {
        validateJSON(this, json);

        for (let idx = 0; idx < json._storage.length; idx++)
            this._storage.push(Number(json._storage[idx]));
    }
}
