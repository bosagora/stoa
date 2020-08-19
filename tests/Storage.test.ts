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
import { Block } from '../src/modules/data';
import { PreImageInfo } from '../src/modules/data';
import { sample_data, sample_preImageInfo } from "./SampleData.test";

/**
 * Run LedgerStorageTest
 */
function runLedgerStorageTest (doneIt: () => void)
{
    let ledger_storage: LedgerStorage = new LedgerStorage(":memory:", (err1: Error | null) =>
    {
        assert.ok(!err1, err1?.message);

        assert.doesNotThrow(async () =>
        {
            await runBlockTest(ledger_storage);
            await runTransactionsTest(ledger_storage);
            await runEnrollmentsTest(ledger_storage);
            await runValidatorsAPITest(ledger_storage);
            ledger_storage.close();
            doneIt();
        });
    });
}

/**
 * Puts all data
 */
function runBlockTest (ledger_storage: LedgerStorage): Promise<void>
{
    return new Promise<void>((resolve, reject) =>
    {
        putAllBlockData(ledger_storage)
            .then(() =>
            {
                ledger_storage.getBlocks(1)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows.length, 1);
                        assert.strictEqual(rows[0].height, 1);
                        assert.strictEqual(rows[0].merkle_root,
                            '0x9c4a20550ac796274f64e93872466ebb551ba2cd3f2f051533d07a478d2402b' +
                            '59e5b0f0a2a14e818b88007ec61d4a82dc9128851f43799d6c1dc0609fca1537d');
                        resolve();
                    })
                    .catch((err) =>
                    {
                        assert.ok(!err, err);
                        reject(err);
                    });
            })
            .catch((err) =>
            {
                assert.ok(!err, err);
                reject(err);
            });
    });
}

/**
 * Puts all data
 */
function putAllBlockData (ledger_storage: LedgerStorage): Promise<void>
{
    return new Promise<void>(async (resolve, reject) =>
    {
        try
        {
            for (let block of sample_data)
                await ledger_storage.putBlocks(block);
        }
        catch (error)
        {
            reject(error);
            return;
        }
        resolve();
    });
}

/**
 *  Run the test of the Enrollments
 */
function runEnrollmentsTest (ledger_storage: LedgerStorage): Promise<void>
{
    return new Promise<void>((resolve, reject) =>
    {
        let height: number = 0;
        ledger_storage.getEnrollments(height)
            .then((rows: any[]) =>
            {
                assert.strictEqual(rows.length, 3);
                assert.strictEqual(rows[0].block_height, height);
                assert.strictEqual(rows[0].utxo_key,
                '0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3b' +
                'fc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a');

                ledger_storage.getValidators(height)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows.length, 3);
                        assert.strictEqual(rows[0].enrolled_at, height);
                        assert.strictEqual(rows[0].utxo_key,
                        '0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3b' +
                        'fc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a');
                        assert.strictEqual(rows[0].address,
                        'GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN');
                        resolve();
                    })
                    .catch((err) =>
                    {
                        assert.ok(!err, err);
                        reject(err);
                    });
            })
            .catch((err) =>
            {
                assert.ok(!err, err);
                reject(err);
            });
    });
}

/**
 * Run the test of the Transactions
 */
function runTransactionsTest (ledger_storage: LedgerStorage): Promise<void>
{
    return new Promise<void>((resolve, reject) =>
    {
        ledger_storage.getTransactions(0)
            .then((rows3: any[]) =>
            {
                assert.strictEqual(rows3.length, 4);
                assert.strictEqual(rows3[0].tx_hash,
                    '0x3a245017fee266f2aeacaa0ca11171b5825d34814bf1e33fae76cca50751e5c' +
                    'fb010896f009971a8748a1d3720e33404f5a999ae224b54f5d5c1ffa345c046f7');

                ledger_storage.getTxInputs(1, 0)
                    .then((rows4: any[]) =>
                    {
                        assert.strictEqual(rows4.length, 1);
                        assert.strictEqual(rows4[0].previous,
                            '0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd223671' +
                            '3dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73');

                        ledger_storage.getTxOutputs(0, 1)
                            .then((rows5: any[]) =>
                            {
                                assert.strictEqual(rows5.length, 8);
                                assert.strictEqual(rows5[0].utxo_key,
                                    '0xef81352c7436a19d376acf1eb8f832a28c6229885aaa4e3bd8c11d5d072e160' +
                                    '798a4ff3a7565b66ca2d0ff755f8cc0f1f97e049ca23b615c85f77fb97d7919b4');
                                assert.strictEqual(rows5[0].tx_hash,
                                    '0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd223671' +
                                    '3dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73');
                                assert.strictEqual(rows5[0].address, 'GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ');
                                assert.strictEqual(rows5[0].used, 1);
                                resolve();
                            })
                            .catch((err) =>
                            {
                                assert.ok(!err, err);
                                reject(err);
                            });
                    })
                    .catch((err) =>
                    {
                        assert.ok(!err, err);
                        reject(err);
                    });
            })
            .catch((err) =>
            {
                assert.ok(!err, err);
                reject(err);
            });
    });
}


/**
* Run Validators API tests
*/
function runValidatorsAPITest (ledger_storage: LedgerStorage): Promise<void>
{
    return new Promise<void>((resolve, reject) =>
    {
        let address: string = 'GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN';
        ledger_storage.getValidatorsAPI(1, null)
            .then((rows: any[]) =>
            {
                assert.strictEqual(rows[0].address, address);
                assert.strictEqual(rows[0].enrolled_at, 0);
                assert.strictEqual(rows[0].distance, undefined);

                ledger_storage.getValidatorsAPI(1, address)
                    .then((rows: any[]) =>
                    {
                        assert.strictEqual(rows.length, 1);
                        assert.strictEqual(rows[0].address, address);
                        assert.strictEqual(rows[0].stake, '0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad'+
                        '1cc3bfc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a');

                        ledger_storage.getValidatorsAPI(Number.NaN, null)
                            .then((rows: any[]) =>
                            {
                                assert.strictEqual(rows.length, 3);
                                assert.strictEqual(rows[0].distance, undefined);
                                resolve();
                            })
                            .catch((err) =>
                            {
                                assert.ok(!err, err);
                                reject(err);
                            });
                    })
                    .catch((err) =>
                    {
                        assert.ok(!err, err);
                        reject(err);
                    });
            })
            .catch((err) =>
            {
                assert.ok(!err, err);
                reject(err);
            });
    });
}

describe('LedgerStorage', () =>
{
    it('Test ledger storage and inquiry function.', (doneIt: () => void) =>
    {
        runLedgerStorageTest(doneIt);
    });

    it('Error-handling test when writing a transaction.', () =>
    {
        let ledger_storage = new LedgerStorage(":memory:", async (err1: Error | null) =>
        {
            assert.ok(!err1, err1?.message);

            let block = new Block();
            block.parseJSON(sample_data[0]);

            await ledger_storage.putTransactions(block);
            assert.rejects(ledger_storage.putTransactions(block),
                {
                    message: "SQLITE_CONSTRAINT: UNIQUE constraint failed:" +
                        " transactions.block_height, transactions.tx_index"
                });

        });
    });

    it('Error-handling test when writing a enrollment.', () =>
    {
        let ledger_storage = new LedgerStorage(":memory:", async (err1: Error | null) =>
        {
            assert.ok(!err1, err1?.message);

            let block = new Block();
            block.parseJSON(sample_data[0]);

            await ledger_storage.putEnrollments(block);
            assert.rejects(ledger_storage.putEnrollments(block),
                {
                    message: "SQLITE_CONSTRAINT: UNIQUE constraint failed:" +
                        " enrollments.block_height, enrollments.enrollment_index"
                });
        });
    });

    it('Error-handling test when writing a block.', () =>
    {
        let ledger_storage = new LedgerStorage(":memory:", async (err1: Error | null) =>
        {
            assert.ok(!err1, err1?.message);

            await ledger_storage.putBlocks(sample_data[0]);
            assert.rejects(ledger_storage.putBlocks(sample_data[0]),
                {
                    message: "SQLITE_CONSTRAINT: UNIQUE constraint failed: blocks.height"
                });
        });
    });

    it('DB transaction test when writing a block', () =>
    {
        let ledger_storage = new LedgerStorage(":memory:", async (err1: Error | null) =>
        {
            assert.ok(!err1, err1?.message);

            let block = new Block();
            block.parseJSON(sample_data[0]);

            await ledger_storage.putEnrollments(block);
            await assert.rejects(ledger_storage.putBlocks(sample_data[0]),
                {
                    message: "SQLITE_CONSTRAINT: UNIQUE constraint failed:" +
                        " enrollments.block_height, enrollments.enrollment_index"
                });

            let rows0: any[] = await ledger_storage.getBlocks(0);
            assert.strictEqual(rows0.length, 0);

            await ledger_storage.putTransactions(block);
            let rows1:any[] = await ledger_storage.getTransactions(0);
            assert.strictEqual(rows1.length, 4);
        });
    });
});

describe('Tests that sending a pre-image', () =>
{
    let ledger_storage: LedgerStorage;
    let height: number = 0;

    before ('Start sending a pre-image', (doneIt: () => void) =>
    {
        ledger_storage = new LedgerStorage(":memory:", (err1: Error | null) =>
        {
            assert.ok(!err1, err1?.message);

            putAllBlockData(ledger_storage)
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
                        assert.strictEqual(rows[0].preimage_hash, sample_preImageInfo.hash);
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
                        assert.strictEqual(rows[0].preimage_hash, sample_preImageInfo.hash);
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
                        assert.strictEqual(rows[0].preimage_hash, sample_preImageInfo.hash);
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
