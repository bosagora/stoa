/*******************************************************************************

    The class that defines and parses the block.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, IBlock } from "./validator";
import { BlockHeader } from './BlockHeader';
import { Transaction } from './Transaction';

/**
 * The class that defines and parses the block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Block
{
    header: BlockHeader = new BlockHeader();
    txs: Transaction[] = [];
    merkle_tree: string[] = [];

    /**
     * This parses JSON.
     * @param json The object of the JSON
     */
    public parseJSON (json: any)
    {
        Validator.isValidOtherwiseThrow<IBlock>('Block', json);

        this.header.parseJSON(json.header);

        for (let idx = 0; idx < json.txs.length; idx++)
        {
            let tx = new Transaction();
            tx.parseJSON(json.txs[idx]);
            this.txs.push(tx);
        }

        for (let idx = 0; idx < json.merkle_tree.length; idx++)
            this.merkle_tree.push(json.merkle_tree[idx]);
    }
}
