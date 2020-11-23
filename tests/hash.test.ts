/*******************************************************************************

    Test that create hash.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Block, Hash, hash, hashFull, hashMulti, makeUTXOKey } from '../src/modules/data'
import { Transaction, TxInput, TxOutput, TxType, DataPayload } from "../src/modules/data";
import { SodiumHelper } from '../src/modules/utils/SodiumHelper'
import { sample_data } from './Utils';

import * as assert from 'assert';

describe('Hash', () =>
{
    before('Wait for the package libsodium to finish loading', () =>
    {
        return SodiumHelper.init();
    });

    // Buffer has the same content. However, when printed with hex strings,
    // the order of output is different.
    // This was treated to be the same as D language.
    it('Test of reading and writing hex string', () => {
        // Read from hex string
        let h = new Hash('0x5d7f6a7a30f7ff591c8649f61eb8a35d034' +
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
        let hash = makeUTXOKey(new Hash('0x5d7f6a7a30f7ff591c86' +
            '49f61eb8a35d034824ed5cd252c2c6f10cdbd2236713dc369ef2a44b62ba113' +
            '814a9d819a276ff61582874c9aee9c98efa2aa1f10d73'), BigInt(1));

        assert.strictEqual(hash.toString(),
            '0x7c95c29b184e47fbd32e58e5abd42c6e22e8bd5a7e934ab049d21df545e09' +
            'c2e33bb2b89df2e59ee01eb2519b1508284b577f66a76d42546b65a6813e592' +
            'bb84');
    });

    // See_Also: https://github.com/bpfkorea/agora/blob/dac8b3ea6500af68a99c0248c3ade8ab821ee9ef/source/agora/consensus/data/Transaction.d#L203-L229
    it ('Test for hash value of transaction data', () =>
    {
        let payment_tx = new Transaction(
            TxType.Payment,
            [
                new TxInput(Hash.init, BigInt(0))
            ],
            [
                TxOutput.init
            ],
            DataPayload.init
        );

        assert.strictEqual(hashFull(payment_tx).toString(),
            "0x35927f79ab7f2c8273f5dc24bb1efa5ebe3ac050fd4fd84d014b51124d0322ed" +
            "709225b92ba28b3ee6b70144d4acafb9a5289fc48ecb4a4f273b537837c78cb0");

        let freeze_tx = new Transaction(
            TxType.Freeze,
            [
                new TxInput(Hash.init, BigInt(0))
            ],
            [
                TxOutput.init
            ],
            DataPayload.init
        );

        assert.strictEqual(hashFull(freeze_tx).toString(),
            "0x0277044f0628605485a8f8a999f9a2519231e8c59c1568ef2dac2f241ce569d8" +
            "54e15f950e0fd3d88460309d3e0ef3fbd57b8f5af998f8bacbe391ddb9aea328");
    });
});

describe ('Test for hash value of block data', () =>
{
    let blocks: Array<Block> = [];

    before ('Prepare test for block data hash', () =>
    {
        blocks.push(Block.reviver("", sample_data[0]));
        blocks.push(Block.reviver("", sample_data[1]));
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
