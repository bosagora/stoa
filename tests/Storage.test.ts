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
            '0xa82a2d19ae115b521f0d65690e78f66260f5886da76508b72eee62a45cb8cfb' +
            '5a7b8e300e0042faeb7b28fffc050cceb6c00ef4a326d992ef182969b1857f3d0');
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
            '0xff66ffde4ed3b91c5bce28907dd68f7ecabe776c1dc7d797e5f69fc349d2834' +
            '2348c778cd42c49ef2c29199f374289d44f5b4d2d149f0b8081a1077eca30f7ce');

        let rows4 = await ledger_storage.getTxInputs(new Height("1"), 0);
        assert.strictEqual(rows4.length, 1);
        assert.strictEqual(new Hash(rows4[0].utxo, Endian.Little).toString(),
            '0x57d4bdc5e60ac4b25f7a6502b15b66394ce4d45b48694518e09d382b9fbc990' +
            '5be211e45973102609621773daac68357fe0dc0a6092a28920d33ef3194c9aed5');

        let rows5 = await ledger_storage.getTxOutputs(new Height("0"), 1);
        assert.strictEqual(rows5.length, 8);
        assert.strictEqual(new Hash(rows5[0].utxo_key, Endian.Little).toString(),
            '0x57d4bdc5e60ac4b25f7a6502b15b66394ce4d45b48694518e09d382b9fbc990' +
            '5be211e45973102609621773daac68357fe0dc0a6092a28920d33ef3194c9aed5');
        assert.strictEqual(new Hash(rows5[0].tx_hash, Endian.Little).toString(),
            '0x9384e68e59382a256d2598251758d3c44f6b48f9a6aa405272e7b5f536dc0f2' +
            'd3b3fd76b9352ddbf199a4862b05e4300a484ebd3e591abd1df596854debb4d5e');
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
            '0xf8751862d61a28fb878cd4b583ceaf39a59a5f2ff1fa78a169e56811c33b5c3' +
            'eed80f83074cfb98ab5095ed563ebc6a96320ef59080628c4961f586dbf2e7d2f');

        rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].enrolled_at, height_value);
        assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
            '0x6c87312f75478d515c5dc2bc8beb3ac5686aacbdedc8219baaf9cb62e41b1b3' +
            '1f00233321b3c42f9966ee47916123191f49caf0dc761d3a7fcd69198aa63f2aa');
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
            '0xf8751862d61a28fb878cd4b583ceaf39a59a5f2ff1fa78a169e56811c33b5c3' +
            'eed80f83074cfb98ab5095ed563ebc6a96320ef59080628c4961f586dbf2e7d2f');

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
            '0xff66ffde4ed3b91c5bce28907dd68f7ecabe776c1dc7d797e5f69fc349d2834' +
            '2348c778cd42c49ef2c29199f374289d44f5b4d2d149f0b8081a1077eca30f7ce');
        assert.strictEqual(new Hash(rows[1].merkle_hash, Endian.Little).toString(),
            '0x9384e68e59382a256d2598251758d3c44f6b48f9a6aa405272e7b5f536dc0f2' +
            'd3b3fd76b9352ddbf199a4862b05e4300a484ebd3e591abd1df596854debb4d5e');
    });

    it ('Test for LedgerStorage.getWalletBlocksHeaderInfo()', async () =>
    {
        let rows = await ledger_storage.getWalletBlocksHeaderInfo(null);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(rows[0].time_stamp, 1609459800);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0xa82a2d19ae115b521f0d65690e78f66260f5886da76508b72eee62a45cb8cfb' +
            '5a7b8e300e0042faeb7b28fffc050cceb6c00ef4a326d992ef182969b1857f3d0');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0x04348b962dac4423cd9ae48b4932ee1607fb1101a690d2583bbad909e8c3f22' +
            'b12a6d65d1e1494d38681afc7bea61c3d81251800b8adbf1d31f52889df6d7e09');

        rows = await ledger_storage.getWalletBlocksHeaderInfo(new Height("0"));
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 0);
        assert.strictEqual(rows[0].time_stamp, 1609459200);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x4cadc4d240a26ebf8a01ae1c53a4793fec40c92d36d9f8755311420c9594a9f' +
            'bb827fb974b75774723acbd13b4d0589e957bf8f14da24633be6ae299446ddca7');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0xba54155d042d03a722dc9234f7de5b304e9efbc896091e28fb3b19b908ee782' +
            '653b5e6ef44566e19c728ff0eebf65ede6cc485337d5a473b819e86eeb2f7baf8');
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
            '0x4c70c322620c40dc9a0954c82a20df9088ee3560783b1489be73713beb0841e' +
            '96921ce9275ae44d01b3c9d6cc6787f81da332082f4291132217200c53b23ad05');
    });

    it ('Test for UTXO in melting', async () => {
        let address: string = 'boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 5);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2018);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('4000000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0x229e36211d70510608b8b6cc1796a9dd47fbf2c54627a960e7894292e9ef78c' +
            'e895807bca132e0e91823553ac13ea36b4bd37ec29cf285098346b967b497571d');
    });

    it ('Test for getting block height and merkle root with transaction hash', async () => {
        let tx_hash = new Hash(
            '0x067d37b7f625baccc66186f0426fa7eb61b1657e6bf520b7bfeab0b4759a282' +
            'c7604a4eac5509ba78e2a71224983237da2c75657a38a22c5f42419fd3ba2eb2b');
        let rows = await ledger_storage.getBlockHeaderByTxHash(tx_hash);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0xa82a2d19ae115b521f0d65690e78f66260f5886da76508b72eee62a45cb8cfb' +
            '5a7b8e300e0042faeb7b28fffc050cceb6c00ef4a326d992ef182969b1857f3d0');
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
