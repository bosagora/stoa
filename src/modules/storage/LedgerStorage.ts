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
    TxInputs, TxOutputs, makeUTXOKey, hashFull, TxType
} from '../data';
import { Storages } from './Storages';
import { Utils, Endian } from '../utils/Utils';

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
            inputs_count        INTEGER NOT NULL,
            outputs_count       INTEGER NOT NULL,
            PRIMARY KEY(block_height, tx_index)
        );

        CREATE TABLE IF NOT EXISTS tx_inputs
        (
            block_height        INTEGER NOT NULL,
            tx_index            INTEGER NOT NULL,
            in_index            INTEGER NOT NULL,
            utxo                BLOB    NOT NULL,
            signature           BLOB    NOT NULL,
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
            address             TEXT    NOT NULL,
            used                INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(block_height, tx_index, output_index)
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
                        (height, hash, prev_block, validators, merkle_root, signature, tx_count, enrollment_count)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        block.header.height.toString(),
                        block_hash.toBinary(Endian.Little),
                        block.header.prev_block.toBinary(Endian.Little),
                        JSON.stringify(block.header.validators.storage),
                        block.header.merkle_root.toBinary(Endian.Little),
                        block.header.signature.toBinary(Endian.Little),
                        block.txs.length,
                        block.header.enrollments.length
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
            height, hash, prev_block, validators, merkle_root, signature, tx_count, enrollment_count
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
                        resolve(new Height(BigInt(row[0].height)));
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
    public updatePreImage (pre_image: PreImageInfo): Promise<void>
    {
        let enroll_key = pre_image.enroll_key.toBinary(Endian.Little);
        return new Promise<void>((resolve, reject) =>
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
            return new Promise<void>((resolve, reject) =>
            {
                let unlock_height_query: string;
                if ((tx.type == TxType.Payment) && (tx.inputs.length > 0))
                {
                    let utxo: Array<string> = [];
                    for (let input of tx.inputs)
                        utxo.push(`'${input.utxo.toString().substring(2).toUpperCase()}'`);

                    unlock_height_query =
                        `(
                            SELECT '${(height.value + 2016n).toString()}' AS unlock_height WHERE EXISTS  
                            (
                                SELECT
                                    *
                                FROM 
                                    tx_outputs AS a, 
                                    transactions AS b 
                                WHERE 
                                    a.tx_hash = b.tx_hash
                                    and b.type = 1
                                    and hex(a.utxo_key) in (${utxo.join(',')})
                            )
                            UNION ALL
                            SELECT '${(height.value + 1n).toString()}' AS unlock_height
                            LIMIT 1 
                        )`;
                }
                else
                {
                    unlock_height_query = `( SELECT '${(height.value + 1n).toString()}' AS unlock_height )`;
                }

                storage.run(
                    `INSERT INTO transactions
                        (block_height, tx_index, tx_hash, type, unlock_height, inputs_count, outputs_count)
                    VALUES
                        (?, ?, ?, ?, ${unlock_height_query}, ?, ?)`,
                    [
                        height.toString(),
                        tx_idx,
                        hash.toBinary(Endian.Little),
                        tx.type,
                        tx.inputs.length,
                        tx.outputs.length
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
            in_idx: number, input: TxInputs): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                storage.run(
                    `INSERT INTO tx_inputs
                        (block_height, tx_index, in_index, utxo, signature)
                    VALUES
                        (?, ?, ?, ?, ?)`,
                    [
                        height.toString(),
                        tx_idx,
                        in_idx,
                        input.utxo.toBinary(Endian.Little),
                        input.signature.toBinary(Endian.Little)
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

        function update_spend_output (storage: LedgerStorage,
            input: TxInputs): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                storage.run(
                    `UPDATE tx_outputs SET used = 1 WHERE utxo_key = ?`,
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
            output: TxOutputs): Promise<void>
        {
            return new Promise<void>((resolve, reject) =>
            {
                storage.run(
                    `INSERT INTO tx_outputs
                        (block_height, tx_index, output_index, tx_hash, utxo_key, address, amount)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        height.toString(),
                        tx_idx,
                        out_idx,
                        hash.toBinary(Endian.Little),
                        utxo_key.toBinary(Endian.Little),
                        output.address.toString(),
                        output.value.toString(),
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
                        await save_transaction(this, block.header.height, tx_idx, block.merkle_tree[tx_idx], block.txs[tx_idx]);

                        if (block.txs[tx_idx].payload.data.length > 0)
                            await save_payload(this, block.merkle_tree[tx_idx], block.txs[tx_idx]);

                        for (let in_idx = 0; in_idx < block.txs[tx_idx].inputs.length; in_idx++)
                        {
                            await save_input(this, block.header.height, tx_idx, in_idx, block.txs[tx_idx].inputs[in_idx]);
                            await update_spend_output(this, block.txs[tx_idx].inputs[in_idx]);
                        }

                        for (let out_idx = 0; out_idx < block.txs[tx_idx].outputs.length; out_idx++)
                        {
                            let utxo_key = makeUTXOKey(block.merkle_tree[tx_idx], BigInt(out_idx));
                            await save_output(this, block.header.height, tx_idx, out_idx,
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
            block_height, tx_index, tx_hash, type, inputs_count, outputs_count
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
            block_height, tx_index, in_index, utxo, signature
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
            block_height, tx_index, output_index, tx_hash, utxo_key, address, amount, used
        FROM
            tx_outputs
        WHERE block_height = ? AND tx_index = ?`;
        return this.query(sql, [height.toString(), tx_index]);
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
        `SELECT tx_outputs.address,
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
        INNER JOIN tx_outputs
            ON enrollments.utxo_key = tx_outputs.utxo_key
            AND tx_outputs.used = 0
        LEFT JOIN validators
            ON enrollments.enrolled_at = validators.enrolled_at
            AND enrollments.utxo_key = validators.utxo_key
        WHERE 1 = 1
        `;

        if (address != null)
            sql += ` AND tx_outputs.address = '` + address + `'`;

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
                        resolve(new Height(BigInt(rows[0].value) + 1n));
                    }
                    else
                    {
                        resolve(new Height(0n));
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
        let sql =
            `SELECT 
                tx_outputs.utxo_key AS utxo,
                transactions.type,
                transactions.unlock_height,
                tx_outputs.amount
            FROM
                tx_outputs, 
                transactions
            WHERE 
                tx_outputs.tx_hash = transactions.tx_hash 
                AND tx_outputs.address = ?
                AND tx_outputs.used != 1;`;
        return this.query(sql, [address]);
    }
}
