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
import { Block, Hash, Height, PreImageInfo, SodiumHelper, Endian } from 'boa-sdk-ts';
import { sample_data, sample_data2, sample_preImageInfo } from "./Utils";

import * as fs from 'fs';
import JSBI from 'jsbi';
import { IDatabaseConfig } from '../src/modules/common/Config';
import { MockDBConfig } from "./TestConfig"
import {Config} from "../src/modules/common/Config";
import { BOASodium } from 'boa-sodium-ts';

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
            '0x2a8158ee049c459e32912f426b0f4ebaea9d017455efd3e20c27954f22066a1' +
            '0a4cb676254e9a011906ac8cb6855add4d314eb96d583d1a1828ff7f05d04ebd0');
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
            '0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2' +
            'd7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f');

        let rows4 = await ledger_storage.getTxInputs(new Height("1"), 0);
        assert.strictEqual(rows4.length, 1);
        assert.strictEqual(new Hash(rows4[0].utxo, Endian.Little).toString(),
            '0xb9794167a781561298bcb0f634346c85e56fba3f26c641e52dbf0066e8fb0b9' +
            '6d278cdd4c22c7e9885fceb307368e4130aaebd7800905c27c6a6e09870d8d9ca');

        let rows5 = await ledger_storage.getTxOutputs(new Height("0"), 1);
        assert.strictEqual(rows5.length, 8);
        assert.strictEqual(new Hash(rows5[0].utxo_key, Endian.Little).toString(),
            '0xb9794167a781561298bcb0f634346c85e56fba3f26c641e52dbf0066e8fb0b9' +
            '6d278cdd4c22c7e9885fceb307368e4130aaebd7800905c27c6a6e09870d8d9ca');
        assert.strictEqual(new Hash(rows5[0].tx_hash, Endian.Little).toString(),
            '0x26866bb263593d024a92103646c48cf35a2b1bfcc49b087915b85db14a432b3' +
            '73569d56f576242354328a31bf0102a0a78cb806cf6e25d88d7981367833631b7');
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
            '0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c' +
            '3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f');

        rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].enrolled_at, height_value);
        assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
            '0x00bac393977fbd1e0edc70a34c7ca802dafe57f2b4a2aabf1adaac54892cb1c' +
            'bae72cdeeb212904101382690d18d2d2c6ac99b83227ca73b307fde0807c4af03');
        assert.strictEqual(rows[0].address,
            'boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t');
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
            '0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c' +
            '3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f');

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
            '0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2' +
            'd7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f');
        assert.strictEqual(new Hash(rows[1].merkle_hash, Endian.Little).toString(),
            '0x26866bb263593d024a92103646c48cf35a2b1bfcc49b087915b85db14a432b3' +
            '73569d56f576242354328a31bf0102a0a78cb806cf6e25d88d7981367833631b7');
    });

    it ('Test for LedgerStorage.getWalletBlocksHeaderInfo()', async () =>
    {
        let rows = await ledger_storage.getWalletBlocksHeaderInfo(null);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(rows[0].time_stamp, 1609459800);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x2a8158ee049c459e32912f426b0f4ebaea9d017455efd3e20c27954f22066a1' +
            '0a4cb676254e9a011906ac8cb6855add4d314eb96d583d1a1828ff7f05d04ebd0');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0x8161cb00f6d95e4c42c8aa8d752a378ff2de671e4dfc1edba3b53704d8dd124' +
            '1077c1df1c3c0bb8f63dc4f0645cd86ccb17d932cc7a796f9e1c221abafe8b0d7');

        rows = await ledger_storage.getWalletBlocksHeaderInfo(new Height("0"));
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 0);
        assert.strictEqual(rows[0].time_stamp, 1609459200);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x67218493be437c25dc5884abdc8ee40e61f0af79aa9af8ab9bd8b0632eaaca2' +
            '38b4c054f114b046da0d5911b1b205ba540d07c5dc01560beafe564e5f3d101c9');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364e' +
            'abbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99');
    });

    it ('Test for saving of a block with transaction data payload', async () =>
    {
        let data: string = fs.readFileSync('tests/data/Block.2.sample1.json', 'utf-8');
        let block: Block = Block.reviver("", JSON.parse(data));
        await ledger_storage.putBlocks(block);
        let rows = await ledger_storage.getPayload(block.merkle_tree[0]);
        assert.strictEqual(rows.length, 1);
        assert.deepStrictEqual(rows[0].payload, block.txs[0].payload);
    });

    it ('Test for UTXO', async () => {
        let address: string = 'boa1xzrf00m4sh4xh7ey8t8zrnknu27yhjrt0qqjffvn3kd3cacp9vm22fc2d2d';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('24400000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0x7d6ca6ced50e581dd344fbf24f64af13bf51e8f3e924680283971a1df246c8d' +
            'c9b2a08423a513fd9ac11b0832c273543a7776e3a160a93e9971e780be4ba8a1f');
    });

    it ('Test for UTXO in melting', async () => {
        let address: string = 'boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 5);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2018);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('4000000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0x065ca81e255d984a7476b80a14173b4c716d6615908cbfa39ebef845ecad904' +
            'bbd594fd417dd08d9d2fa388fcc922b267988756a4cb7d14ae5369a0d114702ae');
    });

    it ('Test for getting block height and merkle root with transaction hash', async () => {
        let tx_hash = new Hash(
            '0x1a94390f4dac13b28c6a13c36a99aa02c4feb45bb7af3f18a047e1441fc2c85' +
            '74d565bdb18ae05685877a6f32d8a12ee989e24a51bb84395c496b37b3cba0343');
        let rows = await ledger_storage.getBlockHeaderByTxHash(tx_hash);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x2a8158ee049c459e32912f426b0f4ebaea9d017455efd3e20c27954f22066a1' +
            '0a4cb676254e9a011906ac8cb6855add4d314eb96d583d1a1828ff7f05d04ebd0');
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
