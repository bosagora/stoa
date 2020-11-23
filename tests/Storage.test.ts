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
import { Block, Hash, Height, DataPayload } from '../src/modules/data';
import { PreImageInfo } from '../src/modules/data';
import { sample_data, sample_preImageInfo } from "./Utils";
import { Endian } from "../src/modules/utils/Utils";

import * as fs from 'fs';

describe ('Test ledger storage and inquiry function.', () =>
{
    let ledger_storage: LedgerStorage;

    before ('Prepare Storage', () =>
    {
        return LedgerStorage.make(":memory:").then((result) => { ledger_storage = result; });
    });

    after ('Close Storage', () =>
    {
        ledger_storage.close();
    });

    it ('Test for saving of all blocks', () =>
    {
        return new Promise<void>(async (resolve, reject) =>
        {
            try
            {
                for (let elem of sample_data)
                {
                    await ledger_storage.putBlocks(Block.reviver("", elem));
                }
            }
            catch (error)
            {
                reject(error);
                return;
            }
            resolve();
        }).then(() => {
            let height_value = 1;
            let height = new Height(BigInt(height_value));
            ledger_storage.getBlock(height)
                .then((rows: any[]) =>
                {
                    assert.strictEqual(rows.length, 1);
                    assert.strictEqual(rows[0].height, height_value);
                    assert.strictEqual(new Hash(rows[0].merkle_root, Endian.Little).toString(),
                        '0x85367aedf5cb99ca54510464fa6af150c836539c457229f6bad4c838ddf52fb' +
                        '3b793e256a1f258ba7810236c426645ad357abc265c5a3e1ed836250c23706dd4');
                })
        });
    });

    it ('Test for transaction', (doneIt: () => void) =>
    {
        ledger_storage.getTransactions(new Height(0n))
            .then((rows3: any[]) =>
            {
                assert.strictEqual(rows3.length, 2);
                assert.strictEqual(new Hash(rows3[0].tx_hash, Endian.Little).toString(),
                    '0x6314ce9bc41a7f5b98309c3a3d824647d7613b714c4e3ddbc1c5e9ae46db297' +
                    '15c83127ce259a3851363bff36af2e1e9a51dfa15c36a77c9f8eba6826ff975bc');

                ledger_storage.getTxInputs(new Height(1n), 0)
                    .then((rows4: any[]) =>
                    {
                        assert.strictEqual(rows4.length, 1);
                        assert.strictEqual(new Hash(rows4[0].utxo, Endian.Little).toString(),
                            '0x6d85d61fd9d7bb663349ca028bd023ad1bd8fa65c68b4b1363a9c7406b4d663' +
                            'fd73fd386195ba2389100b5cd5fc06b440f053fe513f739844e2d72df302e8ad0');

                        ledger_storage.getTxOutputs(new Height(0n), 1)
                            .then((rows5: any[]) =>
                            {
                                assert.strictEqual(rows5.length, 8);
                                assert.strictEqual(new Hash(rows5[0].utxo_key, Endian.Little).toString(),
                                    '0xfca92fe76629311c6208a49e89cb26f5260777278cd8b272e7bb3021adf4299' +
                                    '57fd6844eb3b8ff64a1f6074126163fd636877fa92a1f4329c5116873161fbaf8');
                                assert.strictEqual(new Hash(rows5[0].tx_hash, Endian.Little).toString(),
                                    '0x7a5bfeb96f9caefa377cb9a7ffe3ea3dd59ea84d4a1c66304ab8c307a4f4770' +
                                    '6fe0aec2a73ce2b186a9f45641620995f8c7e4c157cee7940872d96d9b2f0f95c');
                                assert.strictEqual(rows5[0].address, 'GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ');
                                assert.strictEqual(rows5[0].used, 1);
                                doneIt();
                            })
                            .catch((err) =>
                            {
                                assert.ok(!err, err);
                                doneIt();
                            });
                    })
                    .catch((err) =>
                    {
                        assert.ok(!err, err);
                        doneIt();
                    });
            })
            .catch((err) =>
            {
                assert.ok(!err, err);
                doneIt();
            });
    });

    it ('Test for enrollment', (doneIt: () => void) =>
    {
        let height_value = 0;
        let height = new Height(BigInt(height_value));
        ledger_storage.getEnrollments(height)
            .then((rows: any[]) =>
            {
                assert.strictEqual(rows.length, 6);
                assert.strictEqual(rows[0].block_height, height_value);
                assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
                    '0x46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e' +
                    '9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac');

                ledger_storage.getValidators(height)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows.length, 6);
                        assert.strictEqual(rows[0].enrolled_at, height_value);
                        assert.strictEqual(new Hash(rows[0].utxo_key, Endian.Little).toString(),
                            '0x46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e' +
                            '9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac');
                        assert.strictEqual(rows[0].address,
                            'GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY');
                        doneIt();
                    })
                    .catch((err) =>
                    {
                        assert.ok(!err, err);
                        doneIt();
                    });
            })
            .catch((err) =>
            {
                assert.ok(!err, err);
                doneIt();
            });
    });

    it ('Test for validator', (doneIt: () => void) =>
    {
        let address: string = 'GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY';
        ledger_storage.getValidatorsAPI(new Height(1n), null)
            .then((rows: any[]) =>
            {
                assert.strictEqual(rows[0].address, address);
                assert.strictEqual(rows[0].enrolled_at, 0);
                assert.strictEqual(rows[0].distance, undefined);

                ledger_storage.getValidatorsAPI(new Height(1n), address)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows.length, 1);
                        assert.strictEqual(rows[0].address, address);
                        assert.strictEqual(new Hash(rows[0].stake, Endian.Little).toString(),
                            '0x46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e9b' +
                            'c7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac');

                        ledger_storage.getValidatorsAPI(null, null)
                            .then((rows: any[]) =>
                            {
                                assert.strictEqual(rows.length, 6);
                                assert.strictEqual(rows[0].distance, undefined);
                                doneIt();
                            })
                            .catch((err) =>
                            {
                                assert.ok(!err, err);
                                doneIt();
                            });
                    })
                    .catch((err) =>
                    {
                        assert.ok(!err, err);
                        doneIt();
                    });
            })
            .catch((err) =>
            {
                assert.ok(!err, err);
                doneIt();
            });
    });

    it ('Test for saving of a block with transaction data payload', () =>
    {
        let data: string = fs.readFileSync('tests/data/Block.2.sample1.json', 'utf-8');
        let block: Block = Block.reviver("", JSON.parse(data))
        return new Promise<void>(async (resolve, reject) =>
        {
            try
            {
                await ledger_storage.putBlocks(block);
            }
            catch (error)
            {
                reject(error);
                return;
            }
            resolve();
        }).then(() => {
            ledger_storage.getPayload(block.merkle_tree[0])
                .then((rows: any[]) =>
                {
                    assert.strictEqual(rows.length, 1);
                    assert.deepStrictEqual(new DataPayload(rows[0].payload, Endian.Little), block.txs[0].payload);
                })
        });
    });

    it ('Test for UTXO', async () => {
        let address: string = 'GDML22LKP3N6S37CYIBFRANXVY7KMJMINH5VFADGDFLGIWNOR3YU7T6I';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('24400000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0x2e04f355ab7fbc0b495f8267e362b6914b756a60e8c4627142b6a6bd85a20b59' +
            '86838aaa7fc40f18b7c9601ccdba06cada0d7cb28e098b08605e21324e4bbd1d');
    });

    it ('Test for UTXO in melting', async () => {
        let address: string = 'GDNODE7J5EUK7T6HLEO2FDUBWZEXVXHJO7C4AF5VZAKZENGQ4WR3IX2U';
        let rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 5);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2018);
        assert.strictEqual(BigInt(rows[0].amount), BigInt('4000000000000'));
        assert.strictEqual(new Hash(rows[0].utxo, Endian.Little).toString(),
            '0xfb73e18075a842a889db153cf12d7633967841d54346076b586fe9f319c1735' +
            'a4bde8473ca9ed9114dad3a9e78152c0c6ddbc6875947793096d246a740b3022c');
    });
});

describe ('Test for storing block data in the database', () =>
{
    let ledger_storage: LedgerStorage;

    beforeEach ('Prepare Storage', () =>
    {
        return LedgerStorage.make(":memory:").then((result) => { ledger_storage = result; });
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

        let rows0: any[] = await ledger_storage.getBlock(new Height(0n));
        assert.strictEqual(rows0.length, 0);

        await ledger_storage.putTransactions(block);
        let rows1: any[] = await ledger_storage.getTransactions(new Height(0n));
        assert.strictEqual(rows1.length, 2);
    });

    it ('Test for writing the block hash', async () =>
    {
        const block0 = Block.reviver("", sample_data[0]);
        const block1 = Block.reviver("", sample_data[1]);

        // Write the Genesis block.
        await ledger_storage.putBlocks(block0);

        // The block is read from the database.
        let rows = await ledger_storage.getBlock(new Height(0n));
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
    const height = new Height(0n);

    before ('Start sending a pre-image', () =>
    {
        return LedgerStorage.make(":memory:")
            // Store it first
            .then((result) => { ledger_storage = result; return result; })
            // Then fill it with sample data
            .then(async (result) => {
                for (let elem of sample_data)
                {
                    await result.putBlocks(Block.reviver("", elem));
                }
                return result;
            })
            // Then wait until it's ready (returns enrollments)
            .then(() => { return ledger_storage.getEnrollments(height); });
    });

    after ('Close Storage', () =>
    {
        ledger_storage.close();
    });

    it ('Tests that sending a pre-image with a distance of 6 works', (doneIt: () => void) =>
    {
        let pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        ledger_storage.updatePreImage(pre_image)
            .then(() =>
            {
                ledger_storage.getValidators(height)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows[0].preimage_distance, sample_preImageInfo.distance);
                        assert.strictEqual(new Hash(rows[0].preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
                        doneIt();
                    })
                    .catch((err) =>
                    {
                        assert.ok(!err, err);
                        doneIt();
                    });
            })
            .catch((err) =>
            {
                assert.ok(!err, err);
                doneIt();
            });
    });

    it ('Fail tests that sending a pre-image with a distance of 5 works', (doneIt: () => void) =>
    {
        sample_preImageInfo.distance = 5;
        let pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        ledger_storage.updatePreImage(pre_image)
            .then(() =>
            {
                ledger_storage.getValidators(height)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows[0].preimage_distance, 6);
                        assert.strictEqual(new Hash(rows[0].preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
                        doneIt();
                    })
                    .catch((err) =>
                    {
                        assert.ok(!err, err);
                        doneIt();
                    });
            })
            .catch((err) =>
            {
                assert.ok(!err, err);
                doneIt();
            });
    });

    it ('Fail tests that sending a pre-image with a distance of 1008 works', (doneIt: () => void) =>
    {
        // Distance test out of cycle_length range Test
        sample_preImageInfo.distance = 1008;
        let pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        ledger_storage.updatePreImage(pre_image)
            .then(() =>
            {
                ledger_storage.getValidators(height)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows[0].preimage_distance, 6);
                        assert.strictEqual(new Hash(rows[0].preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
                        doneIt();
                    })
                    .catch((err) =>
                    {
                        assert.ok(!err, err);
                        doneIt();
                    });
            })
            .catch((err) =>
            {
                assert.ok(!err, err);
                doneIt();
            });
    });
});
