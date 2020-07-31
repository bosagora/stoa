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
import { Enrollment } from '../src/modules/data';
import {sample_data} from "./SampleData.test";

/**
 * Run LedgerStorageTest
 */
function runLedgerStorageTest (doneIt: () => void)
{
    let ledger_storage: LedgerStorage = new LedgerStorage(":memory:", (err1: Error | null) =>
    {
        assert.ok(!err1, err1?.message);

        runBlockTest(ledger_storage, () =>
        {
            runTransactionsTest(ledger_storage, () =>
            {
                runEnrollmentsTest(ledger_storage, () =>
                {
                    runValidatorsAPITest(ledger_storage, () =>
                    {
                        ledger_storage.close();
                        doneIt();
                    });
                });
            });
        });
    });
}

/**
 * Puts all data
 */
function runBlockTest (ledger_storage: LedgerStorage, callback: () => void)
{
    putAllBlockData(ledger_storage, (err2: Error | null) =>
    {
        assert.ok(!err2, err2?.message);

        ledger_storage.getBlocks(1,
            (rows: any[]) =>
            {
                assert.strictEqual(rows.length, 1);
                assert.strictEqual(rows[0].height, 1);
                assert.strictEqual(rows[0].merkle_root,
                    '0x9c4a20550ac796274f64e93872466ebb551ba2cd3f2f051533d07a478d2402b' +
                    '59e5b0f0a2a14e818b88007ec61d4a82dc9128851f43799d6c1dc0609fca1537d');
                    callback();
            },
            (err: Error) =>
            {
                assert.ok(!err, err?.message);
                callback();
            });
        });
}

/**
 * Puts all data
 */
function putAllBlockData (ledger_storage: LedgerStorage,
    callback: (err: Error | null) => void)
{
    let idx = 0;
    let doPut = () =>
    {
        if (idx >= sample_data.length)
        {
            callback(null);
            return;
        }

        ledger_storage.putBlocks(sample_data[idx],
            () =>
            {
                idx++;
                doPut();
            },
            (err: Error) =>
            {
                callback(err);
            }
        );
    };
    doPut();
}

/**
 *  Run the test of the Enrollments
 */
function runEnrollmentsTest (ledger_storage: LedgerStorage, onDone: () => void)
{
    let height: number = 0;
    ledger_storage.getEnrollments(height,
        (rows: any[]) =>
        {
            assert.strictEqual(rows.length, 3);
            assert.strictEqual(rows[0].block_height, height);
            assert.strictEqual(rows[0].utxo_key,
              '0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3b' +
              'fc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a');

            ledger_storage.getValidators(height,
                (rows: any[]) =>
                {
                    assert.strictEqual(rows.length, 3);
                    assert.strictEqual(rows[0].enrolled_at, height);
                    assert.strictEqual(rows[0].utxo_key,
                      '0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3b' +
                      'fc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a');
                    assert.strictEqual(rows[0].address,
                      'GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN');
                      onDone();
                },
                (err4: Error) =>
                {
                    assert.ok(!err4, err4?.message);
                    onDone();
                });
        },
        (err3: Error) =>
        {
            assert.ok(!err3, err3?.message);
            onDone();
        });
}

/**
 * Run the test of the Transactions
 */
function runTransactionsTest (ledger_storage: LedgerStorage, onDone: () => void)
{
  ledger_storage.getTransactions(0,
      (rows3: any[]) =>
      {
          assert.strictEqual(rows3.length, 4);
          assert.strictEqual(rows3[0].tx_hash,
              '0x3a245017fee266f2aeacaa0ca11171b5825d34814bf1e33fae76cca50751e5c' +
              'fb010896f009971a8748a1d3720e33404f5a999ae224b54f5d5c1ffa345c046f7');

          ledger_storage.getTxInputs(1, 0,
              (rows4: any[]) =>
              {
                  assert.strictEqual(rows4.length, 1);
                  assert.strictEqual(rows4[0].previous,
                      '0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd223671' +
                      '3dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73');

                  ledger_storage.getTxOutputs(0, 1,
                      (rows5: any[]) =>
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
                          onDone();
                      },
                      (err5: Error) =>
                      {
                          assert.ok(!err5, err5?.message);
                          onDone();
                      });
              },
              (err4: Error) =>
              {
                  assert.ok(!err4, err4?.message);
                  onDone();
              });
      },
      (err3: Error) =>
      {
          assert.ok(!err3, err3?.message);
          onDone();
      });
}


/**
* Run Validators API tests
*/
function runValidatorsAPITest (ledger_storage: LedgerStorage, onDone: () => void)
{
    let address: string = 'GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2OKDM2VJ235GN';
    ledger_storage.getValidatorsAPI(1, null,
        (rows: any[]) =>
        {
            assert.strictEqual(rows[0].address, address);
            assert.strictEqual(rows[0].enrolled_at, 0);
            assert.strictEqual(rows[0].distance, 1);

            ledger_storage.getValidatorsAPI(1, address,
                (rows: any[]) =>
                {
                    assert.strictEqual(rows.length, 1);
                    assert.strictEqual(rows[0].address, address);
                    assert.strictEqual(rows[0].stake, '0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad'+
                    '1cc3bfc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a');

                    ledger_storage.getValidatorsAPI(Number.NaN, null,
                        (rows: any[]) =>
                        {
                            assert.strictEqual(rows.length, 3);
                            assert.strictEqual(rows[0].distance, 1);
                            onDone();
                        },
                        (err3: Error) =>
                        {
                            assert.ok(!err3, err3?.message);
                            onDone();
                        }
                    );
                },
                (err2: Error) =>
                {
                    assert.ok(!err2, err2?.message);
                    onDone();
                }
            );
          },
          (err1: Error) =>
          {
              assert.ok(!err1, err1?.message);
              onDone();
          }
      );
}

describe('LedgerStorage', () =>
{
    it('Test ledger storage and inquiry function.', (doneIt: () => void) =>
    {
        runLedgerStorageTest(doneIt);
    });
    it ('Test validation of JSON data', (doneIt: () => void) =>
    {
        TestOfValidation(doneIt);
    });
});


function TestOfValidation(doneIt: () => void)
{
    let enrollment: Enrollment;

    let error = null;
    try
    {
        // An error not occurs because the attribute `utxo_key` is present.
        let json = {
          "utxo_key": "0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3bfc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a",
          "random_seed": "0xfb05e20321ae11b2f799a71a736fd172c5dec39540f53d6213cd1b7522898c8bfb86445c6b6db9437899f5917bb5f9c9be7358ba0ecaa37675692f7d08766950",
          "cycle_length": 1008,
          "enroll_sig": "0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8125cf6b04274cc4db34bfd"
        };
        enrollment = new Enrollment();
        enrollment.parseJSON(json );
        assert.strictEqual(enrollment.utxo_key, "0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3bfc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a");
    }
    catch (err)
    {
      error = err;
    }
    assert.ok(!error);

    error = null;
    try
    {
        // An error occurs because the attribute `utxo_key` is not present.
        let json = {
          "random_seed": "0xfb05e20321ae11b2f799a71a736fd172c5dec39540f53d6213cd1b7522898c8bfb86445c6b6db9437899f5917bb5f9c9be7358ba0ecaa37675692f7d08766950",
          "cycle_length": 1008,
          "enroll_sig": "0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8125cf6b04274cc4db34bfd"
        };
        enrollment = new Enrollment();
        enrollment.parseJSON(json );
    }
    catch (err)
    {
      error = err;
    }
    assert.ok(error);
    assert.strictEqual(error.message, "Validation failed: Enrollment - should have required property 'utxo_key'");
    doneIt();
}
