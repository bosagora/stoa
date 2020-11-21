/*******************************************************************************

    The class that defines the header of a block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { BitField } from './BitField';
import { Enrollment } from './Enrollment';
import { Hash } from "./Hash";
import { Height } from './Height';
import { Signature } from './Signature';
import { Validator, IBlockHeader } from './validator';

import { SmartBuffer } from 'smart-buffer';

/**
 * The class that defines the header of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class BlockHeader
{
    /**
     * The hash of the previous block in the chain of blocks
     */
    public prev_block: Hash;

    /**
     * The block height (genesis is #0)
     */
    public height: Height;

    /**
     * The hash of the merkle root of the transactions
     */
    public merkle_root: Hash;

    /**
     * The bit-field containing the validators' key indices which signed the block
     */
    public validators: BitField;

    /**
     * The Schnorr multisig of all validators which signed this block
     */
    public signature: Signature;

    /**
     * The enrolled validators
     */
    public enrollments: Enrollment[];

    /**
     * Constructor
     * @param prev_block  The Hash of the previous block in the chain of blocks
     * @param height      The block height
     * @param merkle_root The hash of the merkle root of the transactions
     * @param validators  The bit-field containing the validators' key indices which signed the block
     * @param signature   The Schnorr multisig of all validators which signed this block
     * @param enrollments The enrolled validators
     */
    constructor (prev_block: Hash, height: Height, merkle_root: Hash,
        validators: BitField, signature: Signature, enrollments: Enrollment[])
    {
        this.prev_block = prev_block;
        this.height = height;
        this.merkle_root = merkle_root;
        this.validators = validators;
        this.signature = signature;
        this.enrollments = enrollments;
    }

    /**
     * The reviver parameter to give to `JSON.parse`
     *
     * This function allows to perform any necessary conversion,
     * as well as validation of the final object.
     *
     * @param key   Name of the field being parsed
     * @param value The value associated with `key`
     * @returns A new instance of `BlockHeader` if `key == ""`, `value` otherwise.
     */
    public static reviver (key: string, value: any): any
    {
        if (key !== "")
            return value;

        Validator.isValidOtherwiseThrow<IBlockHeader>('BlockHeader', value);

        return new BlockHeader(
            new Hash(value.prev_block), new Height(value.height),
            new Hash(value.merkle_root),
            BitField.reviver("", value.validators),
            new Signature(value.signature),
            value.enrollments.map((elem: any) => Enrollment.reviver("", elem)),
        );
    }

    /**
     * Collects data to create a hash.
     * @param buffer The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        this.prev_block.computeHash(buffer);
        this.height.computeHash(buffer);
        this.merkle_root.computeHash(buffer);
        for (let elem of this.enrollments)
            elem.computeHash(buffer);
    }
}
