/*******************************************************************************

    The class that defines the block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, IBlock } from "./validator";
import { BlockHeader } from './BlockHeader';
import { Transaction } from './Transaction';
import { Hash } from "./Hash";
import { SmartBuffer } from "smart-buffer";
import { NumberWriter } from '../utils/NumberWriter';

/**
 * The class that defines the block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Block
{
    /**
     * The header of the block
     */
    public header: BlockHeader;

    /**
     * The array of the transaction
     */
    public txs: Transaction[];

    /**
     * The merkle tree
     */
    public merkle_tree: Hash[];

    /**
     * Constructor
     * @param header - The header of the block
     * @param txs - The array of the transaction
     * @param merkle_tree - The merkle tree
     */
    constructor (header?: BlockHeader, txs?: Transaction[], merkle_tree?: Hash[])
    {
        if (header !== undefined)
            this.header = header;
        else
            this.header = new BlockHeader();

        if (txs !== undefined)
            this.txs = txs;
        else
            this.txs = [];

        if (merkle_tree !== undefined)
            this.merkle_tree = merkle_tree;
        else
            this.merkle_tree = [];
    }

    /**
     * This parses JSON.
     * @param json - The JSON data
     * @returns The instance of Block
     */
    public parseJSON (json: any): Block
    {
        Validator.isValidOtherwiseThrow<IBlock>('Block', json);

        this.header.parseJSON(json.header);

        for (let elem of json.txs)
            this.txs.push((new Transaction()).parseJSON(elem));

        for (let elem of json.merkle_tree)
            this.merkle_tree.push(Hash.createFromString(elem));

        return this;
    }

    /**
     * Serialize as binary data.
     * @param buffer - The buffer where serialized data is stored
     */
    public serialize (buffer: SmartBuffer)
    {
        this.header.serialize(buffer);

        NumberWriter.serialize(this.txs.length, buffer);
        for (let tx of this.txs)
            tx.serialize(buffer);

        NumberWriter.serialize(this.merkle_tree.length, buffer);
        for (let h of this.merkle_tree)
            h.serialize(buffer);
    }

    /**
     * Deserialize as binary data.
     * @param buffer - The buffer to be deserialized
     */
    public deserialize (buffer: SmartBuffer)
    {
        this.header.deserialize(buffer);

        let length = NumberWriter.deserialize(buffer);
        for (let idx = 0; idx < length; idx++)
        {
            let elem = new Transaction();
            elem.deserialize(buffer);
            this.txs.push(elem);
        }

        length = NumberWriter.deserialize(buffer);
        for (let idx = 0; idx < length; idx++)
        {
            let elem = new Hash();
            elem.deserialize(buffer);
            this.merkle_tree.push(elem);
        }
    }
}
