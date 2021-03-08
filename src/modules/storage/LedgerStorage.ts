/*******************************************************************************

    The class that create and insert and read the ledger into the database.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    Block, Enrollment, Hash, Height, PreImageInfo, Transaction,
    TxInput, TxOutput, makeUTXOKey, hashFull, TxType,
    Utils, Endian, Unlock, PublicKey, DataPayload, TxPayloadFee
} from 'boa-sdk-ts';
import { Storages } from './Storages';

import JSBI from 'jsbi';

/**
 * The class that insert and read the ledger into the database.
 */
export class LedgerStorage extends Storages
{
    /**
     * Construct an instance of `LedgerStorage`, exposes callback API
     */
    constructor (filename: string, callback: (err: Error | null) => void)
    {
        super(filename, callback);
    }

    /**
     * Construct an instance of `LedgerStorage` using `Promise` API.
     */
    public static make (filename: string) : Promise<LedgerStorage>
    {
        return new Promise<LedgerStorage>((resolve, reject) => {
            let result = new LedgerStorage(filename, (err: Error | null) => {
                if (err)
                    reject(err);
                else
                    resolve(result);
            });
            return result;
        });
    }

    /**
     * Creates tables related to the ledger.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public createTables (): Promise<void>
    {
        let sql =
        `CREATE TABLE IF NOT EXISTS blocks
        (
            height              INTEGER NOT NULL,
            hash                BLOB    NOT NULL,
            prev_block          BLOB    NOT NULL,
            validators          TEXT    NOT NULL,
            merkle_root         BLOB    NOT NULL,
            signature           BLOB    NOT NULL,
            tx_count            INTEGER NOT NULL,
            enrollment_count    INTEGER NOT NULL,
            time_stamp          INTEGER NOT NULL,
            PRIMARY KEY(height)
        );

        CREATE TABLE IF NOT EXISTS enrollments
        (
            block_height        INTEGER NOT NULL,
            enrollment_index    INTEGER NOT NULL,
            utxo_key            BLOB    NOT NULL,
            random_seed         BLOB    NOT NULL,
            cycle_length        INTEGER NOT NULL,
            enroll_sig          BLOB    NOT NULL,
            PRIMARY KEY(block_height, enrollment_index)
        );

        CREATE TABLE IF NOT EXISTS transactions
        (
            block_height        INTEGER NOT NULL,
            tx_index            INTEGER NOT NULL,
            tx_hash             BLOB    NOT NULL,
            type                INTEGER NOT NULL,
            unlock_height       INTEGER NOT NULL,
            lock_height         INTEGER NOT NULL,
            tx_fee              INTEGER NOT NULL,
            payload_fee         INTEGER NOT NULL,
            tx_size             INTEGER NOT NULL,
            inputs_count        INTEGER NOT NULL,
            outputs_count       INTEGER NOT NULL,
            payload_size        INTEGER NOT NULL,
            PRIMARY KEY(block_height, tx_index)
        );

        CREATE TABLE IF NOT EXISTS tx_inputs
        (
            block_height        INTEGER NOT NULL,
            tx_index            INTEGER NOT NULL,
            in_index            INTEGER NOT NULL,
            tx_hash             BLOB    NOT NULL,
            utxo                BLOB    NOT NULL,
            unlock_bytes        BLOB    NOT NULL,
            unlock_age          INTEGER NOT NULL,
            PRIMARY KEY(block_height, tx_index, in_index, utxo)
        );

        CREATE TABLE IF NOT EXISTS tx_outputs
        (
            block_height        INTEGER NOT NULL,
            tx_index            INTEGER NOT NULL,
            output_index        INTEGER NOT NULL,
            tx_hash             BLOB    NOT NULL,
            utxo_key            BLOB    NOT NULL,
            amount              NUMERIC NOT NULL,
            lock_type           INTEGER NOT NULL,
            lock_bytes          BLOB    NOT NULL,
            address             TEXT    NOT NULL,
            PRIMARY KEY(block_height, tx_index, output_index)
        );

        CREATE TABLE IF NOT EXISTS utxos
        (
            utxo_key            BLOB    NOT NULL,
            tx_hash             BLOB    NOT NULL,
            type                INTEGER NOT NULL,
            unlock_height       INTEGER NOT NULL,
            amount              NUMERIC NOT NULL,
            lock_type           INTEGER NOT NULL,
            lock_bytes          BLOB    NOT NULL,
            address             TEXT    NOT NULL,
            PRIMARY KEY(utxo_key)
        );
        
        CREATE TABLE IF NOT EXISTS payloads (
            tx_hash             BLOB    NOT NULL,
            payload             BLOB    NOT NULL,
            PRIMARY KEY("tx_hash")
        );

        CREATE TABLE IF NOT EXISTS validators
        (
            enrolled_at         INTEGER NOT NULL,
            utxo_key            BLOB    NOT NULL,
            address             TEXT    NOT NULL,
            amount              NUMERIC NOT NULL,
            preimage_distance   INTEGER NOT NULL,
            preimage_hash       BLOB    NOT NULL,
            PRIMARY KEY(enrolled_at, utxo_key)
        );

        CREATE TABLE IF NOT EXISTS information
        (
            key                 TEXT    NOT NULL,
            value               TEXT    NOT NULL,
            PRIMARY KEY(key)
        );

        CREATE TABLE IF NOT EXISTS transaction_pool (
            tx_hash             BLOB    NOT NULL,
            type                INTEGER NOT NULL,
            payload             BLOB    NOT NULL,
            lock_height         INTEGER NOT NULL,
            time                INTEGER NOT NULL,
            tx_fee              INTEGER NOT NULL,
            payload_fee         INTEGER NOT NULL,
            tx_size             INTEGER NOT NULL,
            PRIMARY KEY(tx_hash)
        );

        CREATE TABLE IF NOT EXISTS tx_input_pool (
            tx_hash             BLOB    NOT NULL,
            input_index         INTEGER NOT NULL,
            utxo                BLOB    NOT NULL,
            unlock_bytes        BLOB    NOT NULL,
            unlock_age          INTEGER NOT NULL,
            PRIMARY KEY(tx_hash, input_index)
        );

        CREATE TABLE IF NOT EXISTS tx_output_pool (
            tx_hash             BLOB    NOT NULL,
            output_index        INTEGER NOT NULL,
            amount              NUMERIC NOT NULL,
            lock_type           INTEGER NOT NULL,
            lock_bytes          BLOB    NOT NULL,
            address             TEXT    NOT NULL,
            PRIMARY KEY(tx_hash, output_index)
        );

        CREATE TRIGGER IF NOT EXISTS tx_trigger AFTER INSERT ON transactions
        BEGIN
            DELETE FROM transaction_pool WHERE tx_hash = NEW.tx_hash;
            DELETE FROM tx_input_pool WHERE tx_hash = NEW.tx_hash;
            DELETE FROM tx_output_pool WHERE tx_hash = NEW.tx_hash;
        END;
        `;

        return this.exec(sql);
    }

    /**
     * Puts a block to database
     * @param block a block data
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putBlocks (block: Block): Promise<void>
    {
        function saveBlock (storage: LedgerStorage, block: Block): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                let block_hash = hashFull(block.header);
                storage.query(
                    `INSERT INTO blocks
                        (height, hash, prev_block, validators, merkle_root, signature, tx_count, enrollment_count, time_stamp)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        block.header.height.toString(),
                        block_hash.toBinary(Endian.Little),
                        block.header.prev_block.toBinary(Endian.Little),
                        JSON.stringify(block.header.validators.storage),
                        block.header.merkle_root.toBinary(Endian.Little),
                        block.header.signature.toBinary(Endian.Little),
                        block.txs.length,
                        block.header.enrollments.length,
                        block.header.timestamp,
                    ]
                )
                    .then(() =>
                    {
                        resolve();
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    });
            });
        }

        return new Promise<void>((resolve, reject) =>
        {
            (async () => {
                try
                {
                    await this.begin();
                    await saveBlock(this, block);
                    await this.putTransactions(block);
                    await this.putEnrollments(block);
                    await this.putBlockHeight(block.header.height);
                    await this.commit();
                }
                catch (error)
                {
                    await this.rollback();
                    reject(error);
                    return;
                }
                resolve();
            })();
        });
    }

    /**
     * Gets a block data
     * @param height the height of the block to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getBlock (height: Height): Promise<any[]>
    {
        let sql =
        `SELECT
            height, hash, prev_block, validators, merkle_root, signature, tx_count, enrollment_count, time_stamp
        FROM
            blocks
        WHERE height = ?`;
        return this.query(sql, [height.toString()]);
    }

    /**
     * Get the highest block height in this Stoa DB
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public getBlockHeight (): Promise<Height | null>
    {
        return new Promise<Height | null>((resolve, reject) =>
        {
            let sql = `SELECT MAX(height) as height FROM blocks`;
            this.query(sql, [])
                .then((row: any[]) =>
                {
                    if (row[0].height !== null)
                        resolve(new Height(JSBI.BigInt(row[0].height)));
                    else
                        resolve(null);
                })
                .catch((err) =>
                {
                    reject(err);
                });
        });
    }

    /**
     * Puts all enrollments
     * @param block: The instance of the `Block`
     */
    public putEnrollments (block: Block): Promise<void>
    {
        function save_enrollment (storage: LedgerStorage, height: Height,
            enroll_idx: number, enroll: Enrollment): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                storage.query(
                    `INSERT INTO enrollments
                        (block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig)
                    VALUES
                        (?, ?, ?, ?, ?, ?)`,
                    [
                        height.toString(),
                        enroll_idx,
                        enroll.utxo_key.toBinary(Endian.Little),
                        enroll.random_seed.toBinary(Endian.Little),
                        enroll.cycle_length,
                        enroll.enroll_sig.toBinary(Endian.Little)
                    ])
                    .then(() => {
                        resolve();
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    });
            });
        }

        function save_validator (storage: LedgerStorage, height: Height, enroll: Enrollment): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                storage.run(
                    `INSERT INTO validators
                        (enrolled_at, utxo_key, address, amount, preimage_distance, preimage_hash)
                    SELECT ?, utxo_key, address, amount, ?, ?
                        FROM tx_outputs
                    WHERE
                        tx_outputs.utxo_key = ?`,
                    [
                        height.toString(),
                        0,
                        enroll.random_seed.toBinary(Endian.Little),
                        enroll.utxo_key.toBinary(Endian.Little)
                    ])
                    .then(() =>
                    {
                        resolve();
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    });
            });
        }

        return new Promise<void>((resolve, reject) =>
        {
            (async () =>
            {
                for (let enroll_idx = 0; enroll_idx < block.header.enrollments.length; enroll_idx++)
                {
                    try
                    {
                        await save_enrollment(this, block.header.height, enroll_idx,
                            block.header.enrollments[enroll_idx]);
                        await save_validator(this, block.header.height,
                            block.header.enrollments[enroll_idx]);
                    }
                    catch (err)
                    {
                        reject(err);
                        return;
                    }
                }
                resolve();
            })();
        });
    }

    /**
     * Update a preImage to database
     */
    public updatePreImage (pre_image: PreImageInfo): Promise<number>
    {
        let enroll_key = pre_image.enroll_key.toBinary(Endian.Little);
        return new Promise<number>((resolve, reject) =>
        {
            this.run(
                `UPDATE validators
                    SET preimage_distance = ?,
                        preimage_hash = ?
                    WHERE
                    EXISTS
                        (SELECT 1
                        FROM enrollments
                        WHERE enrollments.utxo_key = ?
                        ORDER BY block_height DESC
                        LIMIT 1)
                    AND validators.utxo_key = ?
                    AND validators.enrolled_at =
                        (SELECT block_height
                        FROM enrollments
                        WHERE enrollments.utxo_key = ?
                            AND ? < enrollments.cycle_length
                        ORDER BY block_height DESC
                        LIMIT 1)
                    AND ? > validators.preimage_distance`,
                [
                    pre_image.distance,
                    pre_image.hash.toBinary(Endian.Little),
                    enroll_key,
                    enroll_key,
                    enroll_key,
                    pre_image.distance,
                    pre_image.distance
                ])
                .then((result) =>
                {
                    resolve(result.changes);
                })
                .catch((err) =>
                {
                    reject(err);
                });
        });
    }

    /**
     * Get enrollments
     * @param height The height of the block
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getEnrollments (height: Height): Promise<any[]>
    {
        let sql =
        `SELECT
            block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig
        FROM
            enrollments
        WHERE block_height = ?`;
        return this.query(sql, [height.toString()]);
    }

    /**
     * Get validators
     * @param height The height of the block
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getValidators (height: Height): Promise<any[]>
    {
        let sql =
        `SELECT
            enrolled_at, utxo_key, address, amount, preimage_distance, preimage_hash
        FROM
            validators
        WHERE enrolled_at = ?`;
        return this.query(sql, [height.toString()]);
    }

    public getTransactionFee(tx: Transaction):  Promise<[JSBI, JSBI, JSBI]>
    {
        return new Promise<[JSBI, JSBI, JSBI]>((resolve, reject) =>
        {
            if (tx.inputs.length == 0)
            {
                resolve([JSBI.BigInt(0), JSBI.BigInt(0), JSBI.BigInt(0)]);
                return;
            }

            let utxo = tx.inputs
                .map(m => `x'${m.utxo.toBinary(Endian.Little).toString("hex")}'`);

            let sql =
                `SELECT
                    SUM(O.amount) as sum_inputs
                FROM
                    utxos O
                WHERE
                    O.utxo_key in (${utxo.join(',')}); `;

            this.query(sql, [])
                .then((rows: any) =>
                {
                    if (rows.length > 0)
                    {
                        let SumOfInput = JSBI.BigInt(rows[0].sum_inputs);
                        let SumOfOutput = tx.outputs.reduce<JSBI>((sum, n) => {
                            return JSBI.add(sum, n.value);
                        }, JSBI.BigInt(0));

                        let total_fee = JSBI.subtract(SumOfInput, SumOfOutput);
                        let payload_fee = TxPayloadFee.getFee(tx.payload.data.length);
                        let tx_fee = JSBI.subtract(total_fee, payload_fee);

                        resolve([total_fee, tx_fee, payload_fee]);
                    }
                    else {
                        resolve([JSBI.BigInt(0), JSBI.BigInt(0), JSBI.BigInt(0)]);
                    }
                })
                .catch((err) =>
                {
                    reject(err);
                });
        });
    }

    /**
     * Puts all transactions
     * @param block: The instance of the `Block`
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putTransactions (block: Block): Promise<void>
    {
        function save_transaction (storage: LedgerStorage, height: Height, tx_idx:
            number, hash: Hash, tx: Transaction): Promise<void>
        {
            return new Promise<void>(async (resolve, reject) =>
            {
                let fees = await storage.getTransactionFee(tx);
                let tx_size = tx.getNumberOfBytes();

                let unlock_height_query: string;
                if ((tx.type == TxType.Payment) && (tx.inputs.length > 0))
                {
                    let utxo = tx.inputs
                        .map(m => `x'${m.utxo.toBinary(Endian.Little).toString("hex")}'`);

                    unlock_height_query =
                        `(
                            SELECT '${JSBI.add(height.value, JSBI.BigInt(2016)).toString()}' AS unlock_height WHERE EXISTS
                            (
                                SELECT
                                    *
                                FROM
                                    tx_outputs AS a,
                                    transactions AS b
                                WHERE
                                    a.tx_hash = b.tx_hash
                                    and b.type = 1
                                    and a.utxo_key in (${utxo.join(',')})
                            )
                            UNION ALL
                            SELECT '${JSBI.add(height.value, JSBI.BigInt(1)).toString()}' AS unlock_height
                            LIMIT 1
                        )`;
                }
                else
                {
                    unlock_height_query = `( SELECT '${JSBI.add(height.value, JSBI.BigInt(1)).toString()}' AS unlock_height )`;
                }

                storage.run(
                    `INSERT INTO transactions
                        (block_height, tx_index, tx_hash, type, unlock_height, lock_height, tx_fee, payload_fee, tx_size, inputs_count, outputs_count, payload_size)
                    VALUES
                        (?, ?, ?, ?, ${unlock_height_query}, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        height.toString(),
                        tx_idx,
                        hash.toBinary(Endian.Little),
                        tx.type,
                        tx.lock_height.toString(),
                        fees[1].toString(),
                        fees[2].toString(),
                        tx_size,
                        tx.inputs.length,
                        tx.outputs.length,
                        tx.payload.data.length
                    ]
                )
                    .then(() =>
                    {
                        resolve();
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    })
            });
        }

        function save_input (storage: LedgerStorage, height: Height, tx_idx: number,
            in_idx: number, hash: Hash, input: TxInput): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                storage.run(
                    `INSERT INTO tx_inputs
                        (block_height, tx_index, in_index, tx_hash, utxo, unlock_bytes, unlock_age)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        height.toString(),
                        tx_idx,
                        in_idx,
                        hash.toBinary(Endian.Little),
                        input.utxo.toBinary(Endian.Little),
                        input.unlock.bytes,
                        input.unlock_age
                    ]
                )
                    .then(() =>
                    {
                        resolve();
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    })
            });
        }

        function delete_spend_output (storage: LedgerStorage, input: TxInput): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                storage.run(
                    `DELETE FROM utxos WHERE utxo_key = ?`,
                    [
                        input.utxo.toBinary(Endian.Little)
                    ])
                    .then(() => {
                        resolve();
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    })
            });
        }

        function save_output (storage: LedgerStorage, height: Height, tx_idx: number,
            out_idx: number, hash: Hash, utxo_key: Hash,
            output: TxOutput): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                let address: string = (output.lock.type == 0)
                    ? (new PublicKey(output.lock.bytes)).toString()
                    : "";

                storage.run(
                    `INSERT INTO tx_outputs
                        (block_height, tx_index, output_index, tx_hash, utxo_key, address, amount, lock_type, lock_bytes)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        height.toString(),
                        tx_idx,
                        out_idx,
                        hash.toBinary(Endian.Little),
                        utxo_key.toBinary(Endian.Little),
                        address,
                        output.value.toString(),
                        output.lock.type,
                        output.lock.bytes
                    ]
                )
                    .then(() =>
                    {
                        resolve();
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    })
            });
        }

        function is_melting (storage: LedgerStorage, tx: Transaction): Promise<boolean>
        {
            return new Promise<boolean>((resolve, reject) =>
            {
                if ((tx.type == TxType.Payment) && (tx.inputs.length > 0))
                {
                    let utxo = tx.inputs
                        .map(m => `x'${m.utxo.toBinary(Endian.Little).toString("hex")}'`);

                    let sql =
                        `SELECT
                            count(*) as count
                        FROM
                            utxos O
                        WHERE
                            O.type = 1
                            AND O.utxo_key in (${utxo.join(',')})
                        `;

                    storage.query(sql, [])
                        .then((rows: any[]) =>
                        {
                            resolve(rows[0].count > 0);
                        })
                        .catch((err) =>
                        {
                            reject(err);
                        });
                }
                else
                {
                    resolve(false);
                }
            });
        }

        function save_utxo (storage: LedgerStorage, melting: boolean, height: Height, tx: Transaction,
            out_idx: number, tx_hash: Hash, utxo_key: Hash, output: TxOutput): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                let address: string = (output.lock.type == 0)
                    ? (new PublicKey(output.lock.bytes)).toString()
                    : "";

                let unlock_height: JSBI;
                let tx_type: TxType;
                if (melting && address != TxPayloadFee.CommonsBudgetAddress)
                {
                    tx_type = tx.type;
                    unlock_height = JSBI.add(height.value, JSBI.BigInt(2016));
                }
                else if (tx.type == TxType.Freeze && tx.outputs.length >= 2 &&
                    (out_idx == 0 && JSBI.lessThan(output.value, JSBI.BigInt(400_000_000_000))))
                {
                    tx_type = TxType.Payment;
                    unlock_height = JSBI.add(height.value, JSBI.BigInt(1));
                }
                else
                {
                    tx_type = tx.type;
                    unlock_height = JSBI.add(height.value, JSBI.BigInt(1));
                }

                storage.run(
                    `INSERT INTO utxos
                        (
                            utxo_key, 
                            tx_hash,  
                            type, 
                            unlock_height, 
                            amount, 
                            lock_type, 
                            lock_bytes, 
                            address
                        )
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        utxo_key.toBinary(Endian.Little),
                        tx_hash.toBinary(Endian.Little),
                        tx_type,
                        unlock_height.toString(),
                        output.value.toString(),
                        output.lock.type,
                        output.lock.bytes,
                        address
                    ]
                )
                    .then(() =>
                    {
                        resolve();
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    })
            });
        }

        function save_payload (storage: LedgerStorage, tx_hash: Hash, tx: Transaction): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                if (tx.payload.data.length == 0)
                    resolve();

                storage.run(
                    `INSERT INTO payloads
                        (tx_hash, payload)
                    VALUES
                        (?, ?)`,
                    [
                        tx_hash.toBinary(Endian.Little),
                        tx.payload.toBinary(Endian.Little)
                    ]
                )
                    .then(() =>
                    {
                        resolve();
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    });
            });
        }

        return new Promise<void>((resolve, reject) =>
        {
            (async () =>
            {
                try
                {
                    for (let tx_idx = 0; tx_idx < block.txs.length; tx_idx++)
                    {
                        let melting = await is_melting(this, block.txs[tx_idx]);

                        await save_transaction(this, block.header.height, tx_idx, block.merkle_tree[tx_idx], block.txs[tx_idx]);

                        if (block.txs[tx_idx].payload.data.length > 0)
                            await save_payload(this, block.merkle_tree[tx_idx], block.txs[tx_idx]);

                        for (let in_idx = 0; in_idx < block.txs[tx_idx].inputs.length; in_idx++)
                        {
                            await save_input(this, block.header.height, tx_idx, in_idx, block.merkle_tree[tx_idx], block.txs[tx_idx].inputs[in_idx]);
                            await delete_spend_output(this, block.txs[tx_idx].inputs[in_idx]);
                        }

                        for (let out_idx = 0; out_idx < block.txs[tx_idx].outputs.length; out_idx++)
                        {
                            let utxo_key = makeUTXOKey(block.merkle_tree[tx_idx], JSBI.BigInt(out_idx));
                            await save_output(this, block.header.height, tx_idx, out_idx,
                                block.merkle_tree[tx_idx], utxo_key, block.txs[tx_idx].outputs[out_idx]);
                            await save_utxo(this, melting, block.header.height, block.txs[tx_idx], out_idx,
                                block.merkle_tree[tx_idx], utxo_key, block.txs[tx_idx].outputs[out_idx]);
                        }
                    }
                }
                catch (err)
                {
                    reject(err);
                    return;
                }
                resolve();
            })();
        });
    }

        /**
     * Put a transaction on transactionPool
     * @param tx: The instance of the `Transaction`
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putTransactionPool (tx: Transaction): Promise<number>
    {
        function save_transaction_pool (storage: LedgerStorage, tx: Transaction,
            hash: Hash): Promise<number>
        {
            return new Promise<number>(async (resolve, reject) =>
            {
                let fees = await storage.getTransactionFee(tx);
                let tx_size = tx.getNumberOfBytes();

                storage.run(
                    `INSERT INTO transaction_pool
                        (tx_hash, type, payload, lock_height, time, tx_fee, payload_fee, tx_size)
                    VALUES
                        (?, ?, ?, ?, strftime('%s', 'now', 'UTC'), ?, ?, ?)`,
                    [
                        hash.toBinary(Endian.Little),
                        tx.type,
                        tx.payload.toBinary(Endian.Little),
                        tx.lock_height.toString(),
                        fees[1].toString(),
                        fees[2].toString(),
                        tx_size
                    ])
                    .then((result) =>
                    {
                        resolve(result.changes);
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    })
            });
        }

        function save_input_pool (storage: LedgerStorage, hash: Hash,
            in_idx: number, input: TxInput): Promise<number>
        {
            return new Promise<number>((resolve, reject) =>
            {
                storage.run(
                    `INSERT INTO tx_input_pool
                        (tx_hash, input_index, utxo, unlock_bytes, unlock_age)
                    VALUES
                        (?, ?, ?, ?, ?)`,
                    [
                        hash.toBinary(Endian.Little),
                        in_idx,
                        input.utxo.toBinary(Endian.Little),
                        input.unlock.bytes,
                        input.unlock_age
                    ]
                )
                    .then((result) =>
                    {
                        resolve(result.changes);
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    })
            });
        }

        function save_output_pool (storage: LedgerStorage, hash: Hash,
            out_idx: number, output: TxOutput): Promise<number>
        {
            return new Promise<number>((resolve, reject) =>
            {
                let address: string = (output.lock.type == 0)
                    ? (new PublicKey(output.lock.bytes)).toString()
                    : "";

                storage.run(
                    `INSERT INTO tx_output_pool
                        (tx_hash, output_index, amount, address, lock_type, lock_bytes)
                    VALUES
                        (?, ?, ?, ?, ?, ?)`,
                    [
                        hash.toBinary(Endian.Little),
                        out_idx,
                        output.value.toString(),
                        address,
                        output.lock.type,
                        output.lock.bytes
                    ]
                )
                    .then((result) =>
                    {
                        resolve(result.changes);
                    })
                    .catch((err) =>
                    {
                        reject(err);
                    })
            });
        }

        return new Promise<number>((resolve, reject) =>
        {
            (async () =>
            {
                let tx_changes, in_changes, out_changes;
                try
                {
                    await this.begin();
                    let hash = hashFull(tx);
                    tx_changes = await save_transaction_pool(this, tx, hash);
                    if (tx_changes !== 1)
                        throw new Error('Failed to save a transaction.');

                    for (let in_idx = 0; in_idx < tx.inputs.length; in_idx++)
                    {
                        in_changes = await save_input_pool(this, hash, in_idx, tx.inputs[in_idx]);
                        if (in_changes !== 1)
                            throw new Error('Failed to save a input on transactionPool.');
                    }

                    for (let out_idx = 0; out_idx < tx.outputs.length; out_idx++)
                    {
                        out_changes = await save_output_pool(this, hash, out_idx, tx.outputs[out_idx]);
                        if (out_changes !== 1)
                            throw new Error('Failed to save a output on transactionPool.');
                    }
                }
                catch (err)
                {
                    await this.rollback();
                    reject(err);
                    return;
                }

                await this.commit();
                resolve(tx_changes);
            })();
        });
    }

    /**
     * Gets a transaction data
     * @param height The height of the block to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTransactions (height: Height): Promise<any[]>
    {
        let sql =
        `SELECT
            block_height, tx_index, tx_hash, type, unlock_height, lock_height, inputs_count, outputs_count, payload_size
        FROM
            transactions
        WHERE block_height = ?`;
        return this.query(sql, [height.toString()]);
    }

    /**
     * Gets a transaction data payload
     * @param tx_hash The hash of the transaction to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getPayload (tx_hash: Hash): Promise<any[]>
    {
        let sql =
            `SELECT
                tx_hash, payload
            FROM
                payloads
            WHERE hex(tx_hash) = ?`;
        return this.query(sql, [tx_hash.toString().substring(2).toUpperCase()]);
    }

    /**
     * Gets a transaction inputs data
     * @param height The height of the block to get
     * @param tx_index The index of the transaction in the block
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTxInputs (height: Height, tx_index: number): Promise<any[]>
    {
        let sql =
        `SELECT
            block_height, tx_index, in_index, utxo, unlock_bytes, unlock_age
        FROM
            tx_inputs
        WHERE block_height = ? AND tx_index = ?`;
        return this.query(sql, [height.toString(), tx_index]);
    }

    /**
     * Gets a transaction outputs data
     * @param height The height of the block to get
     * @param tx_index The index of the transaction in the block
     */
    public getTxOutputs (height: Height, tx_index: number): Promise<any[]>
    {
        let sql =
        `SELECT
            block_height, tx_index, output_index, tx_hash, utxo_key, amount, lock_type, lock_bytes, address
        FROM
            tx_outputs
        WHERE block_height = ? AND tx_index = ?`;
        return this.query(sql, [height.toString(), tx_index]);
    }

    /**
     * Gets transaction pool data
     * @param height The height of the block to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTransactionPool (): Promise<any[]>
    {
        let sql =
        `SELECT
            tx_hash, type, payload, lock_height, time
        FROM
            transaction_pool
        `;
        return this.query(sql,[]);
    }

    /**
     * Get validators
     * @param height If present, the height at which the returned list of
     * validators will apply. If absent, the highest height this stoa
     * instance is aware of is assumed.
     * @param address If present, only returns a single validator (or none if not enrolled).
     * If null, all available validators are returned.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getValidatorsAPI (height: Height | null, address: string | null): Promise<any[]>
    {
        let cur_height: string;

        if (height !== null)
            cur_height = height.toString();
        else
            cur_height = `(SELECT MAX(height) as height FROM blocks)`;

        let sql =
        `SELECT utxos.address,
                enrollments.enrolled_at,
                enrollments.utxo_key as stake,
                enrollments.random_seed,
                enrollments.avail_height,
                ` + cur_height + ` as height,
                validators.preimage_distance,
                validators.preimage_hash
        FROM (SELECT MAX(block_height) as enrolled_at,
                (CASE WHEN block_height = 0 THEN
                      block_height
                 ELSE
                      block_height + 1
                 END) as avail_height,
                enrollment_index,
                utxo_key,
                random_seed,
                cycle_length,
                enroll_sig
             FROM enrollments
             WHERE avail_height <= ` + cur_height + `
               AND ` + cur_height + ` < (avail_height + cycle_length)
             GROUP BY utxo_key) as enrollments
        INNER JOIN utxos
            ON enrollments.utxo_key = utxos.utxo_key
        LEFT JOIN validators
            ON enrollments.enrolled_at = validators.enrolled_at
            AND enrollments.utxo_key = validators.utxo_key
        WHERE 1 = 1
        `;

        if (address != null)
            sql += ` AND utxos.address = '` + address + `'`;

        sql += ` ORDER BY enrollments.enrolled_at ASC, enrollments.utxo_key ASC;`;

        return this.query(sql, []);
    }

    /**
     * Puts the height of the block to database
     * @param height The height of the block
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putBlockHeight (height: Height): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            let sql = `INSERT OR REPLACE INTO information (key, value) VALUES (?, ?);`;
            this.run(sql, ["height", height.toString()])
                .then(() =>
                {
                    resolve();
                })
                .catch((err) =>
                {
                    reject(err);
                });
        });
    }

    /**
     * Returns the height of the block to be added next
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public getExpectedBlockHeight(): Promise<Height>
    {
        return new Promise<Height>((resolve, reject) =>
        {
            let sql = `SELECT value FROM information WHERE key = 'height';`;
            this.query(sql, [])
                .then((rows: any[]) =>
                {
                    if ((rows.length > 0) && (rows[0].value !== undefined) &&
                        Utils.isPositiveInteger(rows[0].value))
                    {
                        resolve(new Height(JSBI.add(JSBI.BigInt(rows[0].value), JSBI.BigInt(1)).toString()));
                    }
                    else
                    {
                        resolve(new Height("0"));
                    }
                })
                .catch((err) =>
                {
                    reject(err);
                });
        });
    }

    /**
     * Returns the UTXO of the address.
     * @param address The public address to receive UTXO
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the array of UTXO
     * and if an error occurs the `.catch` is called with an error.
     */
    public getUTXO (address: string): Promise<any[]>
    {
        let sql_utxo =
            `SELECT
                O.utxo_key as utxo,
                O.amount,
                O.lock_type,
                O.lock_bytes,
                T.block_height,
                B.time_stamp as block_time,
                O.type,
                O.unlock_height
            FROM
                utxos O
                INNER JOIN transactions T ON (T.tx_hash = O.tx_hash)
                INNER JOIN blocks B ON (B.height = T.block_height)
            WHERE
                O.address = ?
            ORDER BY T.block_height, O.amount
            `;

        let sql_pending =
            `SELECT
                S.utxo_key as utxo
            FROM
                utxos S
                INNER JOIN tx_input_pool I ON (I.utxo = S.utxo_key)
                INNER JOIN transaction_pool T ON (T.tx_hash = I.tx_hash)
            WHERE
                S.address = ?;
           `;

        let result: any[];
        return new Promise<any[]>((resolve, reject) => {
            this.query(sql_utxo, [address])
                .then((utxos: any[]) => {
                    result = utxos;
                    return this.query(sql_pending, [address]);
                })
                .then((pending: any[]) => {
                    resolve(result.filter(n => pending.find(m => (Buffer.compare(n.utxo, m.utxo) === 0)) === undefined));
                })
                .catch(reject);
        });
    }

    /**
     * Provides a history of transactions.
     * Returns data sorted in descending order by block height.
     * The most recent transaction is located at the front.
     *
     * @param address   An address that want to be inquired.
     * @param page_size Maximum record count that can be obtained from one query
     * @param page      The number on the page, this value begins with 1
     * @param type      The parameter `type` is the type of transaction to query.
     * @param begin     The start date of the range of dates to look up.
     * @param end       The end date of the range of dates to look up.
     * @param peer      This is used when users want to look up only specific
     * Peer is the withdrawal address in the inbound transaction and a deposit address
     * in the outbound transaction address of their counterparts.
     */
    public getWalletTransactionsHistory (address: string, page_size: number, page: number,
        type: Array<number>, begin?: number, end?: number, peer?: string) : Promise<any[]>
    {
        let filter_type = 'AND FTX.display_tx_type in (' + type.map(n =>`${n}`).join(',') + ')'
        let filter_date = ((begin !== undefined) && (end !== undefined))
            ? `AND B.time_stamp BETWEEN ${begin} AND ${end}`
            : ``;
        let filter_peer_field;
        let filter_peer_condition;
        if (peer !== undefined)
        {
            filter_peer_field = `,
                    CASE
                        WHEN (SUM(TX.income) - SUM(TX.spend)) > 0 THEN
                        (
                            SELECT COUNT(S.address) FROM tx_inputs I, tx_outputs S WHERE TX.tx_hash = I.tx_hash AND I.utxo = S.utxo_key
                            AND S.address LIKE '${peer}%'
                        )
                        ELSE
                        (
                            SELECT COUNT(O.address) FROM tx_outputs O WHERE TX.tx_hash = O.tx_hash
                            AND O.address LIKE '${peer}%'
                        )
                    END AS peer_filter
            `;
            filter_peer_condition = 'AND FTX.peer_filter > 0'
        }
        else
        {
            filter_peer_field = '';
            filter_peer_condition = '';
        }

        let sql =
            `SELECT
                FTX.display_tx_type,
                FTX.address,
                FTX.height,
                FTX.block_time,
                FTX.amount,
                FTX.unlock_height,
                FTX.unlock_time,
                FTX.peer,
                FTX.peer_count,
                FTX.tx_hash,
                FTX.type
            FROM
            (
                SELECT
                    TX.address,
                    TX.block_height as height,
                    TX.time_stamp as block_time,
                    TX.tx_hash,
                    TX.type,
                    TX.unlock_height,
                    (TX.time_stamp + (TX.unlock_height - TX.block_height) * 10 * 60) as unlock_time,
                    (SUM(TX.income) - SUM(TX.spend)) as amount,
                    IFNULL(CASE
                        WHEN (SUM(TX.income) - SUM(TX.spend)) > 0 THEN
                        (
                            SELECT S.address FROM tx_inputs I, tx_outputs S
                            WHERE TX.tx_hash = I.tx_hash AND I.utxo = S.utxo_key AND S.address != TX.address
                            ORDER BY S.amount DESC LIMIT 1
                        )
                        ELSE
                        (
                            SELECT O.address FROM tx_outputs O
                            WHERE TX.tx_hash = O.tx_hash AND O.address != TX.address
                            ORDER BY O.amount DESC LIMIT 1
                        )
                    END, TX.address) AS peer,
                    CASE
                        WHEN (SUM(TX.income) - SUM(TX.spend)) > 0 THEN
                        (
                            SELECT COUNT(S.address) FROM tx_inputs I, tx_outputs S WHERE TX.tx_hash = I.tx_hash AND I.utxo = S.utxo_key
                        )
                        ELSE
                        (
                            SELECT COUNT(O.address) FROM tx_outputs O WHERE TX.tx_hash = O.tx_hash
                        )
                    END AS peer_count,
                    CASE
                        WHEN (TX.type = 1) THEN 2
                        WHEN (TX.payload_size) > 0 THEN 3
                        WHEN (SUM(TX.income) - SUM(TX.spend)) > 0 THEN 0
                        ELSE 1
                    END AS display_tx_type
                    ${filter_peer_field}
                FROM
                (
                    SELECT
                        S.address,
                        T.block_height,
                        B.time_stamp,
                        T.tx_hash,
                        T.tx_index,
                        T.type,
                        T.unlock_height,
                        T.payload_size,
                        0 as income,
                        IFNULL(SUM(S.amount), 0) AS spend
                    FROM
                        tx_outputs S
                        INNER JOIN tx_inputs I ON (I.utxo = S.utxo_key)
                        INNER JOIN transactions T ON (T.tx_hash = I.tx_hash)
                        INNER JOIN blocks B ON (B.height = T.block_height)
                    WHERE
                        S.address = '${address}'
                        ${filter_date}
                    GROUP BY T.tx_hash, S.address

                    UNION ALL

                    SELECT
                        O.address,
                        T.block_height,
                        B.time_stamp,
                        T.tx_hash,
                        T.tx_index,
                        T.type,
                        T.unlock_height,
                        T.payload_size,
                        IFNULL(SUM(O.amount), 0) AS income,
                        0 as spend
                    FROM
                        tx_outputs O
                        INNER JOIN transactions T ON (T.tx_hash = O.tx_hash)
                        INNER JOIN blocks B ON (B.height = T.block_height)
                    WHERE
                        O.address = '${address}'
                        ${filter_date}
                    GROUP BY T.tx_hash, O.address
                ) AS TX
                GROUP BY TX.block_height, TX.tx_hash, TX.address, TX.type
                ORDER BY TX.block_height DESC, TX.tx_index DESC
            ) FTX
            WHERE 1 = 1
                ${filter_type}
                ${filter_peer_condition}
            LIMIT ? OFFSET ?;`;
        return this.query(sql, [page_size, page_size*(page-1)]);
    }

    /**
     * Provides a overview of a transaction.
     * @param tx_hash The hash of the transaction
     */
    public getWalletTransactionOverview (tx_hash: Hash): Promise<any[]>
    {
        let hash = tx_hash.toBinary(Endian.Little);

        let sql_tx =
            `SELECT
                T.block_height as height,
                B.time_stamp as block_time,
                T.tx_hash,
                T.type,
                T.unlock_height,
                (B.time_stamp + (T.unlock_height - T.block_height) * 10 * 60) as unlock_time,
                P.payload,
                T.tx_fee,
                T.payload_fee
            FROM
                blocks B
                INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?)
                LEFT OUTER JOIN payloads P ON (T.tx_hash = P.tx_hash);`;

        let sql_sender =
            `SELECT
                S.address,
                S.amount,
                S.utxo_key as utxo
            FROM
                blocks B
                INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?)
                INNER JOIN tx_inputs I ON (T.tx_hash = I.tx_hash)
                INNER JOIN tx_outputs S ON (I.utxo = S.utxo_key);`;

        let sql_receiver =
            `SELECT
                O.address,
                O.amount,
                O.utxo_key as utxo
            FROM
                blocks B
                INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?)
                INNER JOIN tx_outputs O ON (T.tx_hash = O.tx_hash);`;

        let result: any = {};
        return new Promise<any[]>((resolve, reject) => {
            this.query(sql_tx, [hash])
                .then((rows: any[]) => {
                    result.tx = rows;
                    return this.query(sql_sender, [hash]);
                })
                .then((rows: any[]) => {
                    result.senders = rows;
                    return this.query(sql_receiver, [hash]);
                })
                .then((rows: any[]) => {
                    result.receivers = rows;
                    resolve(result);
                })
                .catch(reject);
        });
    }

    /**
     * Provides pending of transactions.
     * Lists the total by output address of the pending transactions.
     * @param address The input address of the pending transaction
     */
    public getWalletTransactionsPending (address: string): Promise<any[]>
    {
        let sql =
            `SELECT
                T.tx_hash,
                T.time,
                O.address,
                IFNULL(SUM(O.amount), 0) as amount
            FROM
                transaction_pool T
                LEFT OUTER JOIN tx_output_pool O
                    ON T.tx_hash = O.tx_hash
            WHERE
                T.tx_hash = IFNULL(
                (
                    SELECT
                            I.tx_hash
                    FROM
                        utxos O
                        INNER JOIN tx_input_pool I
                            ON O.utxo_key = I.utxo
                    WHERE
                        O.address = ?
                ), NULL)
            GROUP BY T.tx_hash, O.address;`;

        return this.query(sql, [address]);
    }

    /**
     * Provides a status of a transaction.
     * @param tx_hash The hash of the transaction
     */
    public getTransactionStatus (tx_hash: Hash): Promise<any>
    {
        let hash = tx_hash.toBinary(Endian.Little);

        let sql_tx =
            `SELECT
                B.hash,
                T.block_height as height,
                T.tx_hash
            FROM
                blocks B
                INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?);`;

        let sql_tx_pending =
            `SELECT
                T.tx_hash
            FROM
                transaction_pool T
            WHERE
                T.tx_hash = ?;`;

        let result: any = {};
        return new Promise<any>(async (resolve, reject) =>
        {
            try
            {
                let rows = await this.query(sql_tx_pending, [hash])
                if (rows.length > 0)
                {
                    result.status = "pending";
                    result.tx_hash = rows[0].tx_hash;
                    resolve(result);
                }
                else
                {
                    rows = await this.query(sql_tx, [hash]);
                    if (rows.length > 0)
                    {
                        result.status = "confirmed";
                        result.tx_hash = rows[0].tx_hash;
                        result.block = { hash: rows[0].hash, height: rows[0].height };
                        resolve(result);
                    }
                    else
                    {
                        result.status = "not found";
                        result.tx_hash = hash;
                        resolve(result);
                    }
                }
            }
            catch (error)
            {
                reject(error);
            }
        });
    }

    /**
     * Gets a transaction data
     * @param tx_hash The hash of the transaction to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTransactionPending (tx_hash: Hash): Promise<Transaction | null>
    {
        return new Promise<Transaction | null>(async (resolve, reject) =>
        {
            try {
                let hash = tx_hash.toBinary(Endian.Little);
                let rows = await this.query("SELECT tx_hash, type, payload, time FROM transaction_pool WHERE tx_hash = ?;", [hash]);
                if (rows.length > 0)
                {
                    let input_rows = await this.query("SELECT tx_hash, utxo, unlock_bytes, unlock_age FROM tx_input_pool WHERE tx_hash = ? ORDER BY input_index;", [hash]);
                    let output_rows = await this.query("SELECT tx_hash, amount, address FROM tx_output_pool WHERE tx_hash = ? ORDER BY output_index;", [hash]);

                    let inputs:Array<TxInput> = [];
                    for (let input_row of input_rows)
                        inputs.push(new TxInput(new Hash(input_row.utxo, Endian.Little), new Unlock(input_row.unlock_bytes), input_row.unlock_age));
                    let outputs:Array<TxOutput> = [];
                    for (let output_row of output_rows)
                        outputs.push(new TxOutput(output_row.amount, new PublicKey(output_row.address)));
                    resolve(new Transaction(rows[0].type, inputs, outputs, new DataPayload(rows[0].payload, Endian.Little)));
                }
                else
                {
                    resolve(null);
                }
            }
            catch (error)
            {
                reject(error);
            }
        });
    }

    /**
     * Gets the information of block header
     * @param height The height of the block,
     *      If this is null, then the last block header is specified.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getWalletBlocksHeaderInfo (height: Height | null): Promise<any[]>
    {
        let cur_height: string;

        if (height !== null)
            cur_height = height.toString();
        else
            cur_height = `(SELECT MAX(height) as height FROM blocks)`;

        let sql =
            `SELECT
                height, hash, merkle_root, time_stamp 
            FROM
                blocks
            WHERE height = ${cur_height};`;
        return this.query(sql, []);
    }
}
