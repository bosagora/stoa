/*******************************************************************************

    The class that defines the BitField of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, IBitField } from './validator';

/**
 * The class that defines the BitField of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property are not present.
 */
export class BitField
{
    /**
     * The storage with bit data
     */
    public storage: number[];

    /**
     * Constructor
     * @param storage The source storage with bit data
     */
    constructor (storage: number[])
    {
        this.storage = storage;
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `BitField` if `key == ""`, `value` otherwise.
     */
    public static reviver (key: string, value: any): any
    {
        if (key != "")
            return value;

        let storage = JSON.parse(value);
        Validator.isValidOtherwiseThrow<IBitField>('BitField', storage);

        return new BitField(storage);
    }
}
