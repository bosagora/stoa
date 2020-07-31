/*******************************************************************************

    The class that defines and parses the header of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, IBlockHeader } from "./validator";
import { BitField } from './BitField';
import { Enrollment } from './Enrollment';
import { Height } from './Height';

/**
 * The class that defines and parses the header of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class BlockHeader
{
    prev_block: string = "";
    height: Height = new Height();
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
        Validator.isValidOtherwiseThrow<IBlockHeader>('BlockHeader', json);

        this.prev_block = json.prev_block;

        this.height.parseJSON(json.height);

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
