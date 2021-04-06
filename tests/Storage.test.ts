/*******************************************************************************

    Test that inserts and reads the block into the database.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as assert from 'assert';
import { LedgerStorage } from '../src/modules/storage/LedgerStorage';
import { Block, Hash, Height, DataPayload, PreImageInfo, SodiumHelper, Endian } from 'boa-sdk-ts';
import { sample_data, sample_data2, sample_preImageInfo } from "./Utils";

import * as fs from 'fs';
import JSBI from 'jsbi';
import {Config} from "../src/modules/common/Config";

describe ('Test ledger storage and inquiry function.', () =>
{
    let ledger_storage: LedgerStorage;

    before('Wait for the package libsodium to finish loading', async () =>
    {
        await SodiumHelper.init();
    });

    before ('Prepare Storage', () =>
    {
        return LedgerStorage.make(":memory:", 1609459200).then((result) => { ledger_storage = result; });
    });

    after ('Close Storage', () =>
    {
        ledger_storage.close();
    });

    it ('Test for saving of all blocks', async () =>
    {
        for (let elem of sample_data)
            await ledger_storage.putBlocks(Block.reviver("", elem));

        let height_value = 1;
        let height = new Height(JSBI.BigInt(height_value));
        let rows = await ledger_storage.getBlock(height);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, height_value);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x1d3d908cb9bab19fcb6ac006b6eff772969a1b822cb0acbe9cadabce8b9fcb3' +
            '34f2d3867239a80da7a3172193589469e4fe1fb9bbf472b82709ffa50f7cc46cd');
        assert.strictEqual(new Hash(rows[0].random_seed, Endian.Little).toString(),
            '0x691775809b9498f45a2c5ef8b8d552e318ebaf0b1b2fb15dcc39e0ec962ae98' +
            '12d7edffa5f053590a895c9ff72c1b0838ce8f5c709579d4529f9f4caf0fab13d');
        assert.strictEqual(rows[0].missing_validators, '');
    });

    it ('Test for transaction', async () =>
    {
        let rows3 = await ledger_storage.getTransactions(new Height("0"));
        assert.strictEqual(rows3.length, 2);
        assert.strictEqual(new Hash(rows3[0].tx_hash, Endian.Little).toString(),
            '0xb8f5a5f4544e75b5837a370d0070361aaaf97d3b02070d3d9845598c5f55105' +
            'b6bd9ac8e9c53e74679db77cb512ffd88a9916754744f6b5eb2a812929651f84f');

        let rows4 = await ledger_storage.getTxInputs(new Height("1"), 0);
        assert.strictEqual(rows4.length, 1);
        assert.strictEqual(new Hash(rows4[0].utxo, Endian.Little).toString(),
            '0x0db044a4bd0df5e6e31ddc2b5878b0da5c4c651a1efb74747254823107ce8f4' +
            '20f2fe9a53a7bc547974f7d4b7b2413a0d5d574862420294102ef426e775f83ef');

        let rows5 = await ledger_storage.getTxOutputs(new Height("0"), 1);
        assert.strictEqual(rows5.length, 8);
        assert.strictEqual(new Hash(rows5[0].utxo_key, Endian.Little).toString(),
            '0x14262986aaf584199a9aa606c067ddbc6743021e4ed137b81943e16fcfd5648' +
            'd3192851acb39d81ec0b405c63aeb816a895f81ec5a3427167790cd16f9569ce5');
        assert.strictEqual(new Hash(rows5[0].tx_hash, Endian.Little).toString(),
            '0x4ef4f7195db2e20f36b46cb3cda1f529b77e2cd8423241d1a4a779f3d7845d4' +
            'f6543a6147956bf4fe52d5f5925a04102de59b2854f90fb3e8cc1a0e85fe9b11d');
        assert.strictEqual(rows5[0].address, 'boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt');
    });

    it ('Test for enrollment', async () =>
    {
        let height_value = 0;
        let height = new Height(JSBI.BigInt(height_value));
        let rows = await ledger_storage.getEnrollments(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].block_height, height_value);
        assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
            '0x6100ee7a7e00e18e06b743a7ae90e91781c09e0f1791ee2849ce15caf4c6ee1' +
            'f3aebc23768f98153d8e3fb10ac66267e06acc31dccbfdbe671294a7fded22432');

        rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].enrolled_at, height_value);
        assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
            '0x1da29910b5ed5b9ea3bd4207016f485f763b44bd289444a4cef77faa96480d6' +
            '833ce0b215c3ed6e00e9119352e49bb3e04054e0fca5fef35aeb47a9e425d7ddf');
        assert.strictEqual(rows[0].address,
            'boa1xrdwry6fpk7a57k4gwyj3mwnf59w808nygtuxsgdrpmv4p7ua2hqx78z5en');
    });

    it ('Test for validator', async () =>
    {
        let address: string = 'boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp';

        let rows = await ledger_storage.getValidatorsAPI(new Height("1"), null);
        assert.ok(rows.length > 0);
        let validator = rows.find(n => n.address === address);
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.address, address);
        assert.strictEqual(validator.enrolled_at, 0);
        assert.strictEqual(validator.distance, undefined);

        rows = await ledger_storage.getValidatorsAPI(new Height("1"), address);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].address, address);
        assert.strictEqual(new Hash(rows[0].stake, Endian.Little).toString(),
            '0x6100ee7a7e00e18e06b743a7ae90e91781c09e0f1791ee2849ce15caf4c6ee1' +
            'f3aebc23768f98153d8e3fb10ac66267e06acc31dccbfdbe671294a7fded22432');

        rows = await ledger_storage.getValidatorsAPI(null, null);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].distance, undefined);
    });

    it ('Test for merkle tree', async () =>
    {
        let height_value = 0;
        let height = new Height(JSBI.BigInt(height_value));
        let rows = await ledger_storage.getMerkleTree(height);
        assert.strictEqual(rows.length, 3);
        assert.strictEqual(rows[0].block_height, height_value);
        assert.strictEqual(rows[0].merkle_index, 0);
        assert.strictEqual(new Hash(rows[0].merkle_hash, Endian.Little).toString(),
            '0xb8f5a5f4544e75b5837a370d0070361aaaf97d3b02070d3d9845598c5f55105' +
            'b6bd9ac8e9c53e74679db77cb512ffd88a9916754744f6b5eb2a812929651f84f');
        assert.strictEqual(new Hash(rows[1].merkle_hash, Endian.Little).toString(),
            '0x4ef4f7195db2e20f36b46cb3cda1f529b77e2cd8423241d1a4a779f3d7845d4' +
            'f6543a6147956bf4fe52d5f5925a04102de59b2854f90fb3e8cc1a0e85fe9b11d');
    });

    it ('Test for LedgerStorage.getWalletBlocksHeaderInfo()', async () =>
    {
        let rows = await ledger_storage.getWalletBlocksHeaderInfo(null);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(rows[0].time_stamp, 1609459800);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x1d3d908cb9bab19fcb6ac006b6eff772969a1b822cb0acbe9cadabce8b9fcb3' +
            '34f2d3867239a80da7a3172193589469e4fe1fb9bbf472b82709ffa50f7cc46cd');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0xc4d0f4a5734c90e13b90635aeca16b06accfad3161fc77207b5d7cb21d4a428' +
            '6da3f033fa4692091880e6b0b1b1a4253f69fa372e3492a987253dc203e62e4b8');

        rows = await ledger_storage.getWalletBlocksHeaderInfo(new Height("0"));
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 0);
        assert.strictEqual(rows[0].time_stamp, 1609459200);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x0d453b87856c9faaf75cfac3dc993cd75c34fc1d5329d3c38e8b4757586fd54' +
            '40cd9ed466f7c2259e5af4f8fe7f45cb997504542efd56d6bd7853fa9596d6bc2');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0xe2357870cef6f690c5672293aba4e910dc3e120ab83cbfff24cf6b824af0588' +
            'caa294900abdd46f3453229dea8680343e89f7ef06f47a2db1ec2a214553f4281');
    });

    it ('Test for saving of a block with transaction data payload', async () =>
    {
        let data: string = fs.readFileSync('tests/data/Block.2.sample1.json', 'utf-8');
        let block: Block = Block.reviver("", JSON.parse(data));
        await ledger_storage.putBlocks(block);
        let rows = await ledger_storage.getPayload(block.merkle_tree[0]);
        assert.strictEqual(rows.length, 1);
        assert.deepStrictEqual(new DataPayload(rows[0].payload, Endian.Little), block.txs[0].payload);
    });

    it ('Test for UTXO', async () => {
        let address: string = 'boa1xrvt66n33l4udhxqmem3t952h6z62ynmsnctmdllx628vxl48g6lj4ldwvl';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('24400000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0xa3e90c15f3334abfb9f2393d8fbdae43b03ab7cff08450e11c10be4616f5ad7' +
            '5c3c771d1189aa6c50ec4bc52cecc3b36f5d76c54e4412845b7cf21ca9220ba31');
    });

    it ('Test for UTXO in melting', async () => {
        let address: string = 'boa1xrdwryl0ajdd86c45w4zrjf8spmrt7u4l7s5jy64ac3dc78x2ucd7wkakac';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 5);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2018);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('4000000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0x07febf063cf30766cafc2a28a7553a568ae953326acb5adebd3a129b5ca4613' +
            'a50604cafb600c85128df65aac86bb5425ffb1494433b5b1c94de6a0de8d58ea3');
    });

    it ('Test for getting block height and merkle root with transaction hash', async () => {
        let tx_hash = new Hash(
            '0xfe64dddee486f417b76da9ed1edea75829f5be8197b29e4984f1bd6d3b681e5' +
            '2e8f9f06eda825e2445deccefa8fe51900944a0b1c71be7f022dee92e12d3e8fd');
        let rows = await ledger_storage.getBlockHeaderByTxHash(tx_hash);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x1d3d908cb9bab19fcb6ac006b6eff772969a1b822cb0acbe9cadabce8b9fcb3' +
            '34f2d3867239a80da7a3172193589469e4fe1fb9bbf472b82709ffa50f7cc46cd');
    });
});

describe ('Test for storing block data in the database', () =>
{
    let ledger_storage: LedgerStorage;

    before('Wait for the package libsodium to finish loading', async () =>
    {
        await SodiumHelper.init();
    });

    beforeEach ('Prepare Storage', async() =>
    {
        ledger_storage = await LedgerStorage.make(":memory:", 1609459200);
    });

    afterEach ('Close Storage', () =>
    {
        ledger_storage.close();
    });

    it ('Error-handling test when writing a transaction.', async () =>
    {
        let block = Block.reviver("", sample_data[0]);

        await ledger_storage.putTransactions(block);
        await assert.rejects(ledger_storage.putTransactions(block),
            {
                message: "SQLITE_CONSTRAINT: UNIQUE constraint failed:" +
                    " transactions.block_height, transactions.tx_index"
            });
    });

    it ('Error-handling test when writing a enrollment.', async () =>
    {
        let block = Block.reviver("", sample_data[0]);

        await ledger_storage.putEnrollments(block);
        await assert.rejects(ledger_storage.putEnrollments(block),
            {
                message: "SQLITE_CONSTRAINT: UNIQUE constraint failed:" +
                    " enrollments.block_height, enrollments.enrollment_index"
            });
    });

    it ('Error-handling test when writing a block.', async () =>
    {
        const block = Block.reviver("", sample_data[0]);
        await ledger_storage.putBlocks(block);
        await assert.rejects(ledger_storage.putBlocks(block),
            {
                message: "SQLITE_CONSTRAINT: UNIQUE constraint failed: blocks.height"
            });
    });

    it ('DB transaction test when writing a block', async () =>
    {
        const block = Block.reviver("", sample_data[0]);

        await ledger_storage.putEnrollments(block);
        await assert.rejects(ledger_storage.putBlocks(block),
            {
                message: "SQLITE_CONSTRAINT: UNIQUE constraint failed:" +
                    " enrollments.block_height, enrollments.enrollment_index"
            });

        let rows0: any[] = await ledger_storage.getBlock(new Height("0"));
        assert.strictEqual(rows0.length, 0);

        await ledger_storage.putTransactions(block);
        let rows1: any[] = await ledger_storage.getTransactions(new Height("0"));
        assert.strictEqual(rows1.length, 2);
    });

    it ('Test for writing the block hash', async () =>
    {
        const block0 = Block.reviver("", sample_data[0]);
        const block1 = Block.reviver("", sample_data[1]);

        // Write the Genesis block.
        await ledger_storage.putBlocks(block0);

        // The block is read from the database.
        let rows = await ledger_storage.getBlock(new Height("0"));
        if (rows.length > 0)
        {
            // Check that the `prev_block` of block1 is the same as the hash value of the database.
            assert.deepStrictEqual(block1.header.prev_block, new Hash(rows[0].hash, Endian.Little));
        }
    });
});

describe ('Tests that sending a pre-image', () =>
{
    let ledger_storage: LedgerStorage;
    const height = new Height("0");

    before('Wait for the package libsodium to finish loading', async () =>
    {
        await SodiumHelper.init();
    });

    before ('Start sending a pre-image', async () =>
    {
        ledger_storage = await LedgerStorage.make(":memory:", 1609459200);
        for (let elem of sample_data)
            await ledger_storage.putBlocks(Block.reviver("", elem));
        await ledger_storage.getEnrollments(height);
    });

    after ('Close Storage', () =>
    {
        ledger_storage.close();
    });


    it ('Tests that sending a pre-image with a distance of 6 works', async () =>
    {
        let pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        return ledger_storage.updatePreImage(pre_image);

        let rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        let validator = rows.find(n => n.address === "boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp");
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.preimage_distance, 6);
        assert.strictEqual(new Hash(validator.preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
    });

    it ('Fail tests that sending a pre-image with a distance of 5 works', async () =>
    {
        sample_preImageInfo.distance = 5;
        let pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        await ledger_storage.updatePreImage(pre_image);

        let rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        let validator = rows.find(n => n.address === "boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp");
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.preimage_distance, 6);
        assert.strictEqual(new Hash(validator.preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
    });

    it ('Fail tests that sending a pre-image with a distance of 1008 works', async () =>
    {
        // Distance test out of cycle_length range Test
        sample_preImageInfo.distance = 1008;
        let pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        await ledger_storage.updatePreImage(pre_image);

        let rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        let validator = rows.find(n => n.address === "boa1xrdwryuhc2tw2j97wqe3ahh37qnjya59n5etz88n9fvwyyt9jyvrvfq5ecp");
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.preimage_distance, 6);
        assert.strictEqual(new Hash(validator.preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
    });
});

describe ('Tests storing transaction pools of a transaction', () =>
{
    let ledger_storage: LedgerStorage;

    before('Wait for the package libsodium to finish loading', async () =>
    {
        await SodiumHelper.init();
    });

    before ('Preparation the ledgerStorage', () =>
    {
        return LedgerStorage.make(":memory:", 1609459200)
            .then((result) => { ledger_storage = result })
    });

    after ('Close Storage', () =>
    {
        ledger_storage.close();
    });

    it ('Tests to store a transaction on the transaction pool', async () =>
    {
        const block0 = Block.reviver("", sample_data[0]);
        const block1 = Block.reviver("", sample_data[1]);

        // Write the Genesis block.
        await ledger_storage.putBlocks(block0);

        let changes = await ledger_storage.putTransactionPool(block1.txs[0]);
        assert.strictEqual(changes, 1);
    });

    it ('Test to transaction pool deletion trigger', async () =>
    {
        let before_pool_rows = await ledger_storage.getTransactionPool();
        assert.deepStrictEqual(before_pool_rows.length, 1);

         // Write the block 1.
        const block1 = Block.reviver("", sample_data[1]);
        await ledger_storage.putBlocks(block1);

        // The block is read from the database.
        let rows = await ledger_storage.getBlock(new Height("1"));
        assert.deepStrictEqual(rows.length, 1);

        // Check the transaction on the transaction pool is cleared
        let after_pool_rows = await ledger_storage.getTransactionPool();
        assert.deepStrictEqual(after_pool_rows.length, 0);
    });
});
