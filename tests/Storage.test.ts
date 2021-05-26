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
            '0xc8f96bf274187b0b6fb73c5b609a3fff28bd1fe9e6b712aaa3d9f92351100d7' +
            'ca718a6c85f5f020cdeb13753179432e710576627399a3235ae472e7fe56b27e6');
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
            '0xd7f9204afdc2d41b28a33504d21b3c5384758d851c573dde44da26d7a0c7de0' +
            '6fde6127ec740fbfdfafbed4fb13cff24144054b8ae2ab34582110f0f752316aa');

        let rows4 = await ledger_storage.getTxInputs(new Height("1"), 0);
        assert.strictEqual(rows4.length, 1);
        assert.strictEqual(new Hash(rows4[0].utxo, Endian.Little).toString(),
            '0x6313b9c616f9eac76b11c50885ff32076f49eaca3c58f30eca846a365bc006e' +
            '5afa0521787d0f984306c1cc8d48a918a8885ea2d4d3449538445f7b25411dcd4');

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
            '0xd68cfa6d0457b404d74a0367ace0bd3784110fb55d94692e0859f3b5a15b33f' +
            '990f33e3b4e4b4030945ee0303fabf7b2702f48a31ffdc3d1d6985e3e3dfcc8d7');

        rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].enrolled_at, height_value);
        assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
            '0x765025088610ec9e6ee82c6373306bfe3c15731234195b9c762859ee3becea8' +
            '5d85de44ca5fef6660bdea5add694e12658ea4060c0ac5c76757829147afcc582');
        assert.strictEqual(rows[0].address,
            'boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq');
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
            '0xd68cfa6d0457b404d74a0367ace0bd3784110fb55d94692e0859f3b5a15b33f' +
            '990f33e3b4e4b4030945ee0303fabf7b2702f48a31ffdc3d1d6985e3e3dfcc8d7');

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
            '0xd7f9204afdc2d41b28a33504d21b3c5384758d851c573dde44da26d7a0c7de0' +
            '6fde6127ec740fbfdfafbed4fb13cff24144054b8ae2ab34582110f0f752316aa');
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
            '0xc8f96bf274187b0b6fb73c5b609a3fff28bd1fe9e6b712aaa3d9f92351100d7' +
            'ca718a6c85f5f020cdeb13753179432e710576627399a3235ae472e7fe56b27e6');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0x1b272e34c3df561450a52cf9e2eab4b1dbff4d710cba755ad76e1b2a906645e' +
            '0f2b6650e62369f3f56b04a51c82fb36d33c5ef88b59949d37a81ca614902ff8e');

        rows = await ledger_storage.getWalletBlocksHeaderInfo(new Height("0"));
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 0);
        assert.strictEqual(rows[0].time_stamp, 1609459200);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x8ac592615f23ee726577eb8c305c67558fd08f14120e0f23c2969a3b1d37089' +
            '009159bd42c1d7af53d601b53ccbbad0ebaa54f36f4bc13d473790921ae3dc7fa');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0x217f5b3f53a52c396c3418c0245c2435a90c53978564efac448e1162ec8647d' +
            'de9e5c13263390f73f5d5b74e059b79b5286cf292f3121e6f1654ff452f9296f5');
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
            '0xa4b3128ffca978702fe2ec1e769be0b5d9c560152576251ddb2529433f006cc' +
            '7cbe1b59d719c058503c23d5f833bb41ee4efce9b25abe8e3b6bbc22e1606acd2');
    });

    it ('Test for UTXO in melting', async () => {
        let address: string = 'boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 5);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2018);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('4000000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0x500ec77bd332f5e92107a764fbdbd8145251aa0e45875399cd7887c14314016' +
            '6f1689e39f329e7065862f49cf1fd7864d393cdd4e2b00585821321fc167ea65d');
    });

    it ('Test for getting block height and merkle root with transaction hash', async () => {
        let tx_hash = new Hash(
            '0x3d04887353ad6eed2b61f0be74972d078eb432c5d37555b7e87aefb15a04815' +
            'e4b1bea6b78c566936cbfebf5b4a8d412804881570f87555e423c1b99919c609d');
        let rows = await ledger_storage.getBlockHeaderByTxHash(tx_hash);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0xc8f96bf274187b0b6fb73c5b609a3fff28bd1fe9e6b712aaa3d9f92351100d7' +
            'ca718a6c85f5f020cdeb13753179432e710576627399a3235ae472e7fe56b27e6');
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
