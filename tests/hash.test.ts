/*******************************************************************************

    Test that create hash.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Block, Hash, hash, hashFull, hashMulti, makeUTXOKey } from '../src/modules/data'
import { sample_data_raw } from './Utils';

import * as assert from 'assert';

describe('Hash', () => {
    // Buffer has the same content. However, when printed with hex strings,
    // the order of output is different.
    // This was treated to be the same as D language.
    it('Test of reading and writing hex string', () => {
        // Read from hex string
        let h = Hash.createFromString('0x5d7f6a7a30f7ff591c8649f61eb8a35d034' +
            '824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819a276ff' +
            '61582874c9aee9c98efa2aa1f10d73');

        // Check
        assert.strictEqual(h.toString(),
            '0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236' +
            '713dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f1' +
            '0d73');
    });

    it('Test of hash', () => {
        // Create Hash class
        let h = hash(Buffer.from("abc"));

        // Check
        assert.strictEqual(h.toString(),
            '0x239900d4ed8623b95a92f1dba88ad31895cc3345ded552c22d79ab2a39c58' +
            '77dd1a2ffdb6fbb124bb7c45a68142f214ce9f6129fb697276a0d4d1c983fa5' +
            '80ba');
    });

    // https://github.com/bpfkorea/agora/blob/2d758a693f9df376f9b873f7c7897c0787b582f1/source/agora/common/Hash.d#L260-L265
    it('Test of multi hash', () => {
        // Source 1 : "foo"
        let foo = hash(Buffer.from("foo"));

        // Source 2 : "bar"
        let bar = hash(Buffer.from("bar"));

        // Hash Multi
        let h = hashMulti(foo.data, bar.data);

        // Check
        assert.strictEqual(h.toString(),
            '0xe0343d063b14c52630563ec81b0f91a84ddb05f2cf05a2e4330ddc79bd3a0' +
            '6e57c2e756f276c112342ff1d6f1e74d05bdb9bf880abd74a2e512654e12d17' +
            '1a74');
    });

    it('Test of utxo key, using makeUTXOKey', () => {
        let hash = makeUTXOKey(Hash.createFromString('0x5d7f6a7a30f7ff591c86' +
            '49f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113' +
            '814a9d819a276ff61582874c9aee9c98efa2aa1f10d73'), BigInt(1));

        assert.strictEqual(hash.toString(),
            '0x7c95c29b184e47fbd32e58e5abd42c6e22e8bd5a7e934ab049d21df545e09' +
            'c2e33bb2b89df2e59ee01eb2519b1508284b577f66a76d42546b65a6813e592' +
            'bb84');
    });
});

describe ('Test for hash value of block data', () =>
{
    let blocks: Array<Block> = [];

    before ('Prepare test for block data hash', () =>
    {
        let sample_data0 = JSON.parse(sample_data_raw[0].replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3"));
        let sample_data1 = JSON.parse(sample_data_raw[1].replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3"));

        blocks.push((new Block()).parseJSON(sample_data0));
        blocks.push((new Block()).parseJSON(sample_data1));
    });

    it ('Test that hash of block header', () =>
    {
        assert.deepStrictEqual(blocks[1].header.prev_block, hashFull(blocks[0].header));
    });

    it ('Test that hash of transactions', () =>
    {
        for (let idx = 0; idx < blocks[0].txs.length; idx++)
        {
            assert.deepStrictEqual(blocks[0].merkle_tree[idx], hashFull(blocks[0].txs[idx]));
        }
    });
});
