/*******************************************************************************

    The class that defines the header of a block.

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
import { Hash } from "./Hash";
import { Signature } from "./Signature";
import { SmartBuffer } from "smart-buffer";

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
     * @param prev_block - The Hash of the previous block in the chain of blocks
     * @param height - The block height
     * @param merkle_root - The hash of the merkle root of the transactions
     * @param validators - The bit-field containing the validators' key indices which signed the block
     * @param signature - The Schnorr multisig of all validators which signed this block
     * @param enrollments - The enrolled validators
     */
    constructor (prev_block?: Hash, height?: Height, merkle_root?: Hash,
        validators?: BitField, signature?: Signature, enrollments?: Enrollment[])
    {
        if (prev_block !== undefined)
            this.prev_block = prev_block;
        else
            this.prev_block = new Hash();

        if (height !== undefined)
            this.height = height;
        else
            this.height = new Height();

        if (merkle_root !== undefined)
            this.merkle_root = merkle_root;
        else
            this.merkle_root = new Hash();

        if (validators !== undefined)
            this.validators = validators;
        else
            this.validators = new BitField();

        if (signature !== undefined)
            this.signature = signature;
        else
            this.signature = new Signature();

        if (enrollments !== undefined)
            this.enrollments = enrollments;
        else
            this.enrollments = [];
    }

    /**
     * This parses JSON.
     * @param json The object of the JSON
     * @returns The instance of BlockHeader
     */
    public parseJSON (json: any): BlockHeader
    {
        Validator.isValidOtherwiseThrow<IBlockHeader>('BlockHeader', json);

        this.prev_block.fromString(json.prev_block);

        this.height.parseJSON(json.height);

        this.merkle_root.fromString(json.merkle_root);
        this.validators.parseJSON(json.validators);
        this.signature.fromString(json.signature);

        for (let elem of json.enrollments)
            this.enrollments.push((new Enrollment()).parseJSON(elem));

        return this;
    }

    /**
     * Collects data to create a hash.
     * @param buffer - The buffer where collected data is stored
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
