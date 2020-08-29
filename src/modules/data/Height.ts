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
    /**
     * the block height
     */
    public value: number;

    /**
     * Construct
     * @param value - The block height
     */
    constructor (value?: number)
    {
        if (value !== undefined)
            this.value = value;
        else
            this.value = 0;
    }

    /**
     * This parses JSON.
     * @param json The object of the JSON
     * @returns The instance of Height
     */
    public parseJSON (json: any): Height
    {
        Validator.isValidOtherwiseThrow<IHeight>('Height', json);

        this.value = Number(json.value);

        return this;
    }
}
