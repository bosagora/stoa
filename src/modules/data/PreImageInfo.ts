/*******************************************************************************

    The class that defines the preImageInfo.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, IPreImageInfo } from './validator'
import { Hash } from "./Hash";

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
     * This parses JSON.
     * @param json The object of the JSON
     * @returns The instance of PreImageInfo
     */
    public parseJSON (json: any): PreImageInfo
    {
        Validator.isValidOtherwiseThrow<IPreImageInfo>('PreImageInfo', json);

        this.enroll_key.fromString(json.enroll_key);
        this.hash.fromString(json.hash);
        this.distance = Number(json.distance);

        return this;
    }
}
