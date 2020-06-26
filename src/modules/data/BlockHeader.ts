/*******************************************************************************

    The class that defines and parses the header of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { validateJSON } from '../utils';
import { BitField } from './BitField';
import { Enrollment } from './Enrollment';

/**
 * The class that defines and parses the header of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class BlockHeader
{
    prev_block: string = "";
    height: number = 0;
    merkle_root: string = "";
    validators: BitField = new BitField();
    signature: string = "";
    enrollments: Enrollment[] = [];

    /**
     * This parses JSON.
     * @param json The object of the JSON
     */
    public parseJSON (json: any)
    {
        validateJSON(this, json);

        this.prev_block = json.prev_block;

        if (json.height.value !== undefined)
            this.height = json.height.value;
        else
            throw new Error('Parse error: BlockHeader.height');

        this.merkle_root = json.merkle_root;

        this.validators.parseJSON(json.validators);

        this.signature = json.signature;

        for (let idx = 0; idx < json.enrollments.length; idx++)
        {
            let enrollment = new Enrollment();
            enrollment.parseJSON(json.enrollments[idx]);
            this.enrollments.push(enrollment);
        }
    }
}
