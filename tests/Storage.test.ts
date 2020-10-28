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
import { Block, Hash, Height } from '../src/modules/data';
import { PreImageInfo } from '../src/modules/data';
import { sample_data_raw, sample_preImageInfo } from "./SampleData.test";
import { Endian } from "../src/modules/utils/buffer";

describe ('Test ledger storage and inquiry function.', () =>
{
    let ledger_storage: LedgerStorage;

    before ('Prepare Storage', (doneIt: () => void) =>
    {
        ledger_storage = new LedgerStorage(":memory:", (err: Error | null) =>
        {
            if (err)
                assert.fail(err.message);
            doneIt();
        });
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
                for (let elem of sample_data_raw)
                {
                    let sample_data_item = JSON.parse(elem.replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3"));
                    await ledger_storage.putBlocks(sample_data_item);
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
            ledger_storage.getBlocks(height)
                .then((rows: any[]) =>
                {
                    assert.strictEqual(rows.length, 1);
                    assert.strictEqual(rows[0].height, height_value);
                    assert.strictEqual(Hash.createFromBinary(rows[0].merkle_root, Endian.Little).toString(),
                        '0x9c4a20550ac796274f64e93872466ebb551ba2cd3f2f051533d07a478d2402b' +
                        '59e5b0f0a2a14e818b88007ec61d4a82dc9128851f43799d6c1dc0609fca1537d');
                })
        });
    });

    it ('Test for transaction', (doneIt: () => void) =>
    {
        ledger_storage.getTransactions(new Height(0n))
            .then((rows3: any[]) =>
            {
                assert.strictEqual(rows3.length, 4);
                assert.strictEqual(Hash.createFromBinary(rows3[0].tx_hash, Endian.Little).toString(),
                    '0x3a245017fee266f2aeacaa0ca11171b5825d34814bf1e33fae76cca50751e5c' +
                    'fb010896f009971a8748a1d3720e33404f5a999ae224b54f5d5c1ffa345c046f7');

                ledger_storage.getTxInputs(new Height(1n), 0)
                    .then((rows4: any[]) =>
                    {
                        assert.strictEqual(rows4.length, 1);
                        assert.strictEqual(Hash.createFromBinary(rows4[0].previous, Endian.Little).toString(),
                            '0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd223671' +
                            '3dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73');

                        ledger_storage.getTxOutputs(new Height(0n), 1)
                            .then((rows5: any[]) =>
                            {
                                assert.strictEqual(rows5.length, 8);
                                assert.strictEqual(Hash.createFromBinary(rows5[0].utxo_key, Endian.Little).toString(),
                                    '0xef81352c7436a19d376acf1eb8f832a28c6229885aaa4e3bd8c11d5d072e160' +
                                    '798a4ff3a7565b66ca2d0ff755f8cc0f1f97e049ca23b615c85f77fb97d7919b4');
                                assert.strictEqual(Hash.createFromBinary(rows5[0].tx_hash, Endian.Little).toString(),
                                    '0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd223671' +
                                    '3dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73');
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
                assert.strictEqual(rows.length, 3);
                assert.strictEqual(rows[0].block_height, height_value);
                assert.strictEqual(Hash.createFromBinary(rows[0].utxo_key, Endian.Little).toString(),
                    '0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3b' +
                    'fc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a');

                ledger_storage.getValidators(height)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows.length, 3);
                        assert.strictEqual(rows[0].enrolled_at, height_value);
                        assert.strictEqual(Hash.createFromBinary(rows[0].utxo_key, Endian.Little).toString(),
                            '0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3b' +
                            'fc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a');
                        assert.strictEqual(rows[0].address,
                            'GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN');
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
        let address: string = 'GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN';
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
                        assert.strictEqual(Hash.createFromBinary(rows[0].stake, Endian.Little).toString(),
                            '0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3bfc1f3f' +
                            '5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a');

                        ledger_storage.getValidatorsAPI(null, null)
                            .then((rows: any[]) =>
                            {
                                assert.strictEqual(rows.length, 3);
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
});

describe ('Test for storing block data in the database', () =>
{
    let ledger_storage: LedgerStorage;

    beforeEach ('Prepare Storage', (doneIt: () => void) =>
    {
        ledger_storage = new LedgerStorage(":memory:", (err: Error | null) =>
        {
            if (err)
                assert.fail(err.message);
            doneIt();
        });
    });

    afterEach ('Close Storage', () =>
    {
        ledger_storage.close();
    });

    it ('Error-handling test when writing a transaction.', async () =>
    {
        let block = new Block();
        let sample_data0 = JSON.parse(sample_data_raw[0].replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3"));
        block.parseJSON(sample_data0);

        await ledger_storage.putTransactions(block);
        await assert.rejects(ledger_storage.putTransactions(block),
            {
                message: "SQLITE_CONSTRAINT: UNIQUE constraint failed:" +
                    " transactions.block_height, transactions.tx_index"
            });
    });

    it ('Error-handling test when writing a enrollment.', async () =>
    {
        let block = new Block();
        let sample_data0 = JSON.parse(sample_data_raw[0].replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3"));
        block.parseJSON(sample_data0);

        await ledger_storage.putEnrollments(block);
        await assert.rejects(ledger_storage.putEnrollments(block),
            {
                message: "SQLITE_CONSTRAINT: UNIQUE constraint failed:" +
                    " enrollments.block_height, enrollments.enrollment_index"
            });
    });

    it ('Error-handling test when writing a block.', async () =>
    {
        let sample_data0 = JSON.parse(sample_data_raw[0].replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3"));
        await ledger_storage.putBlocks(sample_data0);
        await assert.rejects(ledger_storage.putBlocks(sample_data0),
            {
                message: "SQLITE_CONSTRAINT: UNIQUE constraint failed: blocks.height"
            });
    });

    it ('DB transaction test when writing a block', async () =>
    {
        let block = new Block();
        let sample_data0 = JSON.parse(sample_data_raw[0].replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3"));
        block.parseJSON(sample_data0);

        await ledger_storage.putEnrollments(block);
        await assert.rejects(ledger_storage.putBlocks(sample_data0),
            {
                message: "SQLITE_CONSTRAINT: UNIQUE constraint failed:" +
                    " enrollments.block_height, enrollments.enrollment_index"
            });

        let rows0: any[] = await ledger_storage.getBlocks(new Height(0n));
        assert.strictEqual(rows0.length, 0);

        await ledger_storage.putTransactions(block);
        let rows1: any[] = await ledger_storage.getTransactions(new Height(0n));
        assert.strictEqual(rows1.length, 4);
    });

    it ('Test for writing the block hash', async () =>
    {
        let sample_data0 = JSON.parse(sample_data_raw[0].replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3"));
        let sample_data1 = JSON.parse(sample_data_raw[1].replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3"));

        // Write the Genesis block.
        await ledger_storage.putBlocks(sample_data0);

        // The block is read from the database.
        let rows = await ledger_storage.getBlocks(new Height(0n));
        if (rows.length > 0)
        {
            // Check that the `prev_block` of block1 is the same as the hash value of the database.
            let block1 = (new Block()).parseJSON(sample_data1);

            assert.deepStrictEqual(block1.header.prev_block, Hash.createFromBinary(rows[0].hash, Endian.Little));
        }
    });
});

describe ('Tests that sending a pre-image', () =>
{
    let ledger_storage: LedgerStorage;
    let height = new Height(0n);

    before ('Start sending a pre-image', (doneIt: () => void) =>
    {
        ledger_storage = new LedgerStorage(":memory:", (err: Error | null) =>
        {
            if (err)
                assert.fail(err.message);

            (() => {
                return new Promise<void>(async (resolve, reject) =>
                {
                    try
                    {
                        for (let elem of sample_data_raw)
                        {
                            let sample_data_item = JSON.parse(elem.replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3"));
                            await ledger_storage.putBlocks(sample_data_item);
                        }
                    }
                    catch (error)
                    {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            })()
                .then(() =>
                {
                    ledger_storage.getEnrollments(height)
                        .then(() =>
                        {
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
    });

    after ('Close Storage', () =>
    {
        ledger_storage.close();
    });

    it ('Tests that sending a pre-image with a distance of 6 works', (doneIt: () => void) =>
    {
        let pre_image: PreImageInfo = new PreImageInfo();
        pre_image.parseJSON(sample_preImageInfo);
        ledger_storage.updatePreImage(pre_image)
            .then(() =>
            {
                ledger_storage.getValidators(height)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows[0].preimage_distance, sample_preImageInfo.distance);
                        assert.strictEqual(Hash.createFromBinary(rows[0].preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
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
        let pre_image: PreImageInfo = new PreImageInfo();
        pre_image.parseJSON(sample_preImageInfo);
        ledger_storage.updatePreImage(pre_image)
            .then(() =>
            {
                ledger_storage.getValidators(height)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows[0].preimage_distance, 6);
                        assert.strictEqual(Hash.createFromBinary(rows[0].preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
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
        let pre_image: PreImageInfo = new PreImageInfo();
        pre_image.parseJSON(sample_preImageInfo);
        ledger_storage.updatePreImage(pre_image)
            .then(() =>
            {
                ledger_storage.getValidators(height)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows[0].preimage_distance, 6);
                        assert.strictEqual(Hash.createFromBinary(rows[0].preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
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
