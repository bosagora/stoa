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
    public value: bigint;

    /**
     * Construct
     * @param value - The block height
     */
    constructor (value?: bigint)
    {
        if (value != undefined)
            this.value = value;
        else
            this.value = BigInt(0);
    }

    /**
     * This parses JSON.
     * @param json The object of the JSON
     */
    public fromJSON (json: any)
    {
        Validator.isValidOtherwiseThrow<IHeight>('Height', json);

        this.value = BigInt(json.value);
    }
}
