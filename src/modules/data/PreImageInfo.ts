/*******************************************************************************

    The class that defines and parses the preImageInfo.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, IPreImageInfo } from './validator'

/**
 * The class that defines and parses the preImageInfo.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class PreImageInfo
{
    enroll_key: string = "";
    hash: string = "";
    distance: number = 0;

    /**
     * This parses JSON.
     * @param json The object of the JSON
     */
    public parseJSON (json: any)
    {
        Validator.isValidOtherwiseThrow<IPreImageInfo>('PreImageInfo', json);

        this.enroll_key = json.enroll_key;
        this.hash = json.hash;
        this.distance = json.distance;
    }
}
