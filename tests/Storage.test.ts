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
import { BOASodium } from 'boa-sodium-ts';
import { IDatabaseConfig } from '../src/modules/common/Config';
import { MockDBConfig } from "./TestConfig"

describe ('Test ledger storage and inquiry function.', () =>
{
    let ledger_storage: LedgerStorage;
    let testDBConfig: IDatabaseConfig;

    before('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before ('Prepare Storage', async() =>
    {
        testDBConfig = await MockDBConfig();
        return LedgerStorage.make(testDBConfig, 1609459200).then((result) => { ledger_storage = result; });
    });

    after ('Close Storage', async () =>
    {
       await ledger_storage.dropTestDB(testDBConfig.database);
       await ledger_storage.close();
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
            '0x928f5789a97f75dff9aa070cb761d2ae70c6566556739509b495c2d7b899181' +
            '119d31f37160212f7ea38358eb671520595178a8aad17f12e00f4119d0b662888');
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
            '0xd37793e642273aeccbcbfc6be8e19a6007c5147e1116123e44a5e42e4be1149' +
            '5561e535484a2922120c556161f7ae55433bd124bedbf935f3f5b9a414b7af34e');

        let rows4 = await ledger_storage.getTxInputs(new Height("1"), 0);
        assert.strictEqual(rows4.length, 1);
        assert.strictEqual(new Hash(rows4[0].utxo, Endian.Little).toString(),
            '0x14f9627aac2ca6fea7c8ee66c8967c68aaf524f6d5b120bc80014e505f5c723' +
            '501215d715fa64295aa2baa8647e4c1776e3fa50a2d644a346630e57cd59eb522');

        let rows5 = await ledger_storage.getTxOutputs(new Height("0"), 1);
        assert.strictEqual(rows5.length, 8);
        assert.strictEqual(new Hash(rows5[0].utxo_key, Endian.Little).toString(),
            '0x6313b9c616f9eac76b11c50885ff32076f49eaca3c58f30eca846a365bc006e' +
            '5afa0521787d0f984306c1cc8d48a918a8885ea2d4d3449538445f7b25411dcd4');
        assert.strictEqual(new Hash(rows5[0].tx_hash, Endian.Little).toString(),
            '0xd4b2011f46b7de32e6a3f51eae35c97440b7adf427df7725d19575b8a9a8256' +
            '552939656f8b5d4087b9bcbbe9219504e31f91a85fb1709683cbefc3962639ecd');
        assert.strictEqual(rows5[0].address, 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67');
    });

    it ('Test for enrollment', async () =>
    {
        let height_value = 0;
        let height = new Height(JSBI.BigInt(height_value));
        let rows = await ledger_storage.getEnrollments(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].block_height, height_value);
        assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
            '0x2f8b231aa4fd35c6a5c68a97fed32120da48cf6d40ccffc93d8dc41a3016eb5' +
            '6434b2c44144a38efe459f98ddc2660b168f1c92a48fe65711173385fb4a269e1');

        rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].enrolled_at, height_value);
        assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
            '0x096b57f1c92133073e432102d24b00148f5874fbb63f7fff216d832cb3cbed2' +
            'b26d8017ba878c9d191bc2934ad742fd7830fe90a42c12faba550de4c25f77e64');
        assert.strictEqual(rows[0].address,
            'boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn');
    });

    it ('Test for validator', async () =>
    {
        let address: string = 'boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku';

        let rows = await ledger_storage.getValidatorsAPI(new Height("1"), null);
        assert.ok(rows.length > 0);
        let validator = rows.find(n => n.address === address);
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.address, address);
        assert.strictEqual(validator.enrolled_at, 0);
        assert.strictEqual(validator.height, 1);

        rows = await ledger_storage.getValidatorsAPI(new Height("1"), address);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].address, address);
        assert.strictEqual(new Hash(rows[0].stake, Endian.Little).toString(),
            '0x2f8b231aa4fd35c6a5c68a97fed32120da48cf6d40ccffc93d8dc41a3016eb5' +
            '6434b2c44144a38efe459f98ddc2660b168f1c92a48fe65711173385fb4a269e1');

        rows = await ledger_storage.getValidatorsAPI(null, null);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].height, 1);
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
            '0xd37793e642273aeccbcbfc6be8e19a6007c5147e1116123e44a5e42e4be1149' +
            '5561e535484a2922120c556161f7ae55433bd124bedbf935f3f5b9a414b7af34e');
        assert.strictEqual(new Hash(rows[1].merkle_hash, Endian.Little).toString(),
            '0xd4b2011f46b7de32e6a3f51eae35c97440b7adf427df7725d19575b8a9a8256' +
            '552939656f8b5d4087b9bcbbe9219504e31f91a85fb1709683cbefc3962639ecd');
    });

    it ('Test for LedgerStorage.getWalletBlocksHeaderInfo()', async () =>
    {
        let rows = await ledger_storage.getWalletBlocksHeaderInfo(null);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(rows[0].time_stamp, 1609459800);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x928f5789a97f75dff9aa070cb761d2ae70c6566556739509b495c2d7b899181' +
            '119d31f37160212f7ea38358eb671520595178a8aad17f12e00f4119d0b662888');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0xe0609c900848dffd7bbf7112301b4a3ce47fc9ea4810bb7ce6d4ad4d9f0f0ad' +
            '18c324b822127f3564f33efee8228662e02755ea49452f6a5832447e5cf495a8f');

        rows = await ledger_storage.getWalletBlocksHeaderInfo(new Height("0"));
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 0);
        assert.strictEqual(rows[0].time_stamp, 1609459200);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x94747147a0ca093d1099d1b2e0d9e2de9d89e0b887a56ffafb17f473cd0317d' +
            'e36ab7ecd2bdc1148d542bce9501aa1b978c722822a281e45034088286700059e');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0x8ea91eafb2555f93ce0b0335d8454cdd052646dd1ef4a9029f026d08cdd081b' +
            '9fb3e736903a119cce4beec1814b05c29b70243e0d1bbc096cf99c90b93f0b9a2');
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
        let address: string = 'boa1xzrf00m4sh4xh7ey8t8zrnknu27yhjrt0qqjffvn3kd3cacp9vm22fc2d2d';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('24400000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0x7c05dc7317af50ba2e7601d2532335caff2f8460326ab4d6a3690581c00c3a1' +
            '111b288c101d54d66cc581807f1d487fa8bb1acd49ba6893ebbdc16c4bc0124be');
    });

    it ('Test for UTXO in melting', async () => {
        let address: string = 'boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 5);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2018);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('4000000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0x30ba190e9d97f0c0c603d2b215cd05bff69b9adf52bfdc383650228c1336107' +
            'e90395a6da7c82d116658fdc0911eba7705eb923f04799c1a5e4d01ddb59db2e6');
    });

    it ('Test for getting block height and merkle root with transaction hash', async () => {
        let tx_hash = new Hash(
            '0x06c2e8b1098afe7dc264703fd72ae86c6dc109123491a69b1799166a95fcc9b' +
            '8795d80e84778cd3d81964467798b8d6a3c1ff54d42c3f8b415e05f39a645b9e4');
        let rows = await ledger_storage.getBlockHeaderByTxHash(tx_hash);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x928f5789a97f75dff9aa070cb761d2ae70c6566556739509b495c2d7b899181' +
            '119d31f37160212f7ea38358eb671520595178a8aad17f12e00f4119d0b662888');
    });
});

describe ('Test for storing block data in the database', () =>
{
    let ledger_storage: LedgerStorage;
    let testDBConfig: IDatabaseConfig;

    before('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    beforeEach('Prepare Storage', async() =>
    {
        testDBConfig = await MockDBConfig();
        ledger_storage = await LedgerStorage.make(testDBConfig, 1609459200);
    });

    afterEach('Close Storage', () =>
    {   ledger_storage.dropTestDB(testDBConfig.database)
        ledger_storage.close();
    });

    it ('Error-handling test when writing a transaction.', async () =>
    {
        let block = Block.reviver("", sample_data[0]);

        await ledger_storage.putTransactions(block);
        await assert.rejects(ledger_storage.putTransactions(block),
            {
                message: "Duplicate entry '0-0' for key 'transactions.PRIMARY'"
            });
    });

    it ('Error-handling test when writing a enrollment.', async () =>
    {
        let block = Block.reviver("", sample_data[0]);

        await ledger_storage.putEnrollments(block);
        await assert.rejects(ledger_storage.putEnrollments(block),
            {
                message: "Duplicate entry '0-0' for key 'enrollments.PRIMARY'"
            });
    });

    it ('Error-handling test when writing a block.', async () =>
    {
        const block = Block.reviver("", sample_data[0]);
        await ledger_storage.putBlocks(block);
        await assert.rejects(ledger_storage.putBlocks(block),
            {
                message: "Duplicate entry '0' for key 'blocks.PRIMARY'"
            });
    });

    it ('DB transaction test when writing a block', async () =>
    {
        const block = Block.reviver("", sample_data[0]);

        await ledger_storage.putEnrollments(block);
        await assert.rejects(ledger_storage.putBlocks(block),
            {
                message: "Duplicate entry '0-0' for key 'enrollments.PRIMARY'"
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
    let testDBConfig: IDatabaseConfig;
    const height = new Height("0");

    before('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before ('Start sending a pre-image', async () =>
    {
        testDBConfig = await MockDBConfig();
        ledger_storage = await LedgerStorage.make(testDBConfig, 1609459200);
        for (let elem of sample_data)
            await ledger_storage.putBlocks(Block.reviver("", elem));
        await ledger_storage.getEnrollments(height);
    });

    after ('Close Storage', () =>
    {
        ledger_storage.dropTestDB(testDBConfig.database)
        ledger_storage.close();
    });


    it ('Tests that sending a pre-image with a height of 6 works', async () =>
    {
        let pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        return ledger_storage.updatePreImage(pre_image);

        let rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        let validator = rows.find(n => n.address === "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku");
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.preimage_height, '6');
        assert.strictEqual(new Hash(validator.preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
    });

    it ('Fail tests that sending a pre-image with a height of 5 works', async () =>
    {
        sample_preImageInfo.height = "5";
        let pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        await ledger_storage.updatePreImage(pre_image);

        let rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        let validator = rows.find(n => n.address === "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku");
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.preimage_height, 6);
        assert.strictEqual(new Hash(validator.preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
    });

    it ('Fail tests that sending a pre-image with a height of 1008 works', async () =>
    {
        // Pre-image height test out of cycle_length range Test
        sample_preImageInfo.height = "1008";
        let pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        await ledger_storage.updatePreImage(pre_image);

        let rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        let validator = rows.find(n => n.address === "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku");
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.preimage_height, 6);
        assert.strictEqual(new Hash(validator.preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
    });
});

describe ('Tests storing transaction pools of a transaction', () =>
{
    let ledger_storage: LedgerStorage;
    let testDBConfig: IDatabaseConfig;

    before('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before ('Preparation the ledgerStorage',async () =>
    {
        testDBConfig = await MockDBConfig();
        return LedgerStorage.make(testDBConfig, 1609459200)
            .then((result) => { ledger_storage = result })
    });

    after ('Close Storage', () =>
    {
        ledger_storage.dropTestDB(testDBConfig.database)
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
