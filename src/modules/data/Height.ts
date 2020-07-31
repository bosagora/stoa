/*******************************************************************************

    The class that defines the Height.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, IHeight } from "./validator";

/**
 * The class that defines the Height.
 */
export class Height
{
    public value: number = 0;

    /**
     * This parses JSON.
     * @param json The object of the JSON
     */
    public parseJSON (json: any)
    {
        Validator.isValidOtherwiseThrow<IHeight>('Height', json);

        this.value = Number(json.value);
    }
}
