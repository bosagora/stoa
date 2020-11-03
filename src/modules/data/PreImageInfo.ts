/*******************************************************************************

    The class that defines the preImageInfo.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Hash } from './Hash';
import { Validator, IPreImageInfo } from './validator'

/**
 * The class that defines the preImageInfo.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class PreImageInfo
{
    public enroll_key: Hash;
    public hash: Hash;
    public distance: number = 0;

    constructor (enroll_key?: Hash, hash?: Hash, distance?: number)
    {
        if (enroll_key !== undefined)
            this.enroll_key = enroll_key;
        else
            this.enroll_key = new Hash();

        if (hash !== undefined)
            this.hash = hash;
        else
            this.hash = new Hash();

        if (distance !== undefined)
            this.distance = distance;
        else
            this.distance = 0;
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `PreImageInfo` if `key == ""`, `value` otherwise.
     */
    public static reviver (key: string, value: any): any
    {
        if (key !== "")
            return value;

        Validator.isValidOtherwiseThrow<IPreImageInfo>('PreImageInfo', value);

        return new PreImageInfo(
            new Hash(value.enroll_key), new Hash(value.hash), Number(value.distance));
    }
}
