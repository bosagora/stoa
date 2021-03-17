/*******************************************************************************

    Test that inserts and reads the block into the database.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
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
            '0x911890b2ff4429e1beccb4ab5ba7458cc469e8fc455c5df67291ada2c5818cc' +
            '65a3d11220e877b746a284c95294488d4c7e8ed47b02213e3ce74389c442d9cc1');
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
            '0x5208f03b3b95e90b3bff5e0daa1d657738839624d6605845d6e2ef3cf73d0d0' +
            'ef5aff7d58bde1e00e1ccd5a502b26f569021324a4b902b7e66594e94f05e074c');

        let rows4 = await ledger_storage.getTxInputs(new Height("1"), 0);
        assert.strictEqual(rows4.length, 1);
        assert.strictEqual(new Hash(rows4[0].utxo, Endian.Little).toString(),
            '0x3909833e3755e875f03032ae8a3af30b40722fc09c52743005e4dcdc617964b' +
            '8c436ce244cb217a1b34ceddad4378c8ea7311739ba15e5a6c427e6a371acc173');

        let rows5 = await ledger_storage.getTxOutputs(new Height("0"), 1);
        assert.strictEqual(rows5.length, 8);
        assert.strictEqual(new Hash(rows5[0].utxo_key, Endian.Little).toString(),
            '0x533f664df20aa5f3f657bea7073c9fdbe930c3887db8c57ddb2efd258c3bfdd' +
            'f644b645f3c399996bd4d97dbb17138e1b670d254d3518959d97793ef27c55e2e');
        assert.strictEqual(new Hash(rows5[0].tx_hash, Endian.Little).toString(),
            '0xb3aaf405f53560a6f6d5dd9dd83d7b031da480c0640a2897f2e2562c4670dfe' +
            '84552d84daf5b1b7c63ce249d06bf54747cc5fdc98178a932fff99ab1372e873b');
        assert.strictEqual(rows5[0].address, 'GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ');
    });

    it ('Test for enrollment', async () =>
    {
        let height_value = 0;
        let height = new Height(JSBI.BigInt(height_value));
        let rows = await ledger_storage.getEnrollments(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].block_height, height_value);
        assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
            '0xbf150033f0c3123f0b851c3a97b6cf5335b2bc2f4e9f0c2f3d44b863b10c261' +
            '614d79f72c2ec0b1180c9135893c3575d4a1e1951a0ba24a1a25bfe8737db0aef');

        rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].enrolled_at, height_value);
        assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
            '0x1a1ae2be7afbe367e8e588474d93806b66b773c741b184dc5b4c59640e99864' +
            '4d2ebb0b866ac25dc053b06fd815a86d11c718f77c9e4d0fce1bdbb58486ee751');
        assert.strictEqual(rows[0].address,
            'GDNODE6ZXW2NNOOQIGN24MBEZRO5226LSMHGQA3MUAMYQSTJVR7XT6GH');
    });

    it ('Test for validator', async () =>
    {
        let address: string = 'GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY';

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
            '0xbf150033f0c3123f0b851c3a97b6cf5335b2bc2f4e9f0c2f3d44b863b10c261' +
            '614d79f72c2ec0b1180c9135893c3575d4a1e1951a0ba24a1a25bfe8737db0aef');

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
            '0x5208f03b3b95e90b3bff5e0daa1d657738839624d6605845d6e2ef3cf73d0d0' +
            'ef5aff7d58bde1e00e1ccd5a502b26f569021324a4b902b7e66594e94f05e074c');
        assert.strictEqual(new Hash(rows[1].merkle_hash, Endian.Little).toString(),
            '0xb3aaf405f53560a6f6d5dd9dd83d7b031da480c0640a2897f2e2562c4670dfe' +
            '84552d84daf5b1b7c63ce249d06bf54747cc5fdc98178a932fff99ab1372e873b');
    });

    it ('Test for LedgerStorage.getWalletBlocksHeaderInfo()', async () =>
    {
        let rows = await ledger_storage.getWalletBlocksHeaderInfo(null);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(rows[0].time_stamp, 1609459800);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0x911890b2ff4429e1beccb4ab5ba7458cc469e8fc455c5df67291ada2c5818cc' +
            '65a3d11220e877b746a284c95294488d4c7e8ed47b02213e3ce74389c442d9cc1');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0x10cb20b4310ac086da53eb0aa075fae4d956f3f95b0982af96cd2632286be27' +
            '896aade2c5a8d929fef6d057c6cd8d711b4b466243b3156b00c7f97255ffa9fd0');

        rows = await ledger_storage.getWalletBlocksHeaderInfo(new Height("0"));
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 0);
        assert.strictEqual(rows[0].time_stamp, 1609459200);
        assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
            '0xb12632add7615e2c4203f5ec5747c26e4fc7f333f95333ddfa4121a66b84499' +
            'd35e5ce022ab667791549654b97a26e86054b0764ec23ee0cd3830de8f3f73364');
        assert.strictEqual(new Hash(rows[0].hash, Endian.Little).toString(),
            '0x357c0ba09ce530b7472c00e741cfc1cb2a17424488cf7e13bffc9602ed2e3b9' +
            'b68517138ccb0b95a3e4d3da842a7f21b986ef1f00f2aa0774d92b55642e017e4');
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
        let address: string = 'GDML22LKP3N6S37CYIBFRANXVY7KMJMINH5VFADGDFLGIWNOR3YU7T6I';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('24400000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0x45d28faef4045ccc36ada79db3c6370446136d7ce9bdfd2cab06de60fe4ea0f' +
            'afd893d6d42470a88de3fe42eb8f0670501909c4359289411e1645fa471ea6433');
    });

    it ('Test for UTXO in melting', async () => {
        let address: string = 'GDNODE7J5EUK7T6HLEO2FDUBWZEXVXHJO7C4AF5VZAKZENGQ4WR3IX2U';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 5);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2018);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('4000000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0x245286d66621523ea08aba56a34526a5cad5d9ddff367f52268ddcba57f7ae9' +
            'a83a1fdb101d87fdebccdf2b5039003e3c162232a15c50528d82ab34f8d8f5f17');
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
        let validator = rows.find(n => n.address === "GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY");
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
        let validator = rows.find(n => n.address === "GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY");
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
        let validator = rows.find(n => n.address === "GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY");
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
