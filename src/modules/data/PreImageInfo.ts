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
    /**
     * UTXO used to enroll
     */
    public enroll_key: Hash;

    /**
     * Value of the pre-image
     */
    public hash: Hash;

    /**
     * Distance from the enrollment, 0 based
     */
    public distance: number;

    /**
     * Construct a new instance of this object
     *
     * @param enroll_key The UTXO used to enroll
     * @param hash       The value of the pre-image
     * @param distance   The distance from the Enrollment
     */
    constructor (enroll_key: Hash, hash: Hash, distance: number)
    {
        this.enroll_key = enroll_key;
        this.hash = hash;
        this.distance = distance;
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
