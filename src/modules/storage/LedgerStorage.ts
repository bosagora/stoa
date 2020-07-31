/*******************************************************************************

    The class that create and insert and read the ledger into the database.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Hash }  from '../common/Hash'
import { Storages } from './Storages';
import { Block, Enrollment, Transaction,
    TxInputs, TxOutputs } from '../data';

/**
 * The class that insert and read the ledger into the database.
 */
export class LedgerStorage extends Storages
{
    private hash: Hash;

    constructor (filename: string, callback: (err: Error | null) => void)
    {
        super(filename, callback);
        this.hash = new Hash();
    }

    /**
     * Creates tables related to the ledger.
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public createTables (callback: (err: Error | null) => void)
    {
        let sql: string =
        `CREATE TABLE IF NOT EXISTS blocks
        (
            height INTEGER NOT NULL PRIMARY KEY,
            prev_block TEXT NOT NULL,
            validators TEXT NOT NULL,
            merkle_root TEXT NOT NULL,
            signature TEXT,
            tx_count INTEGER NOT NULL,
            enrollment_count INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS enrollments
        (
            block_height INTEGER NOT NULL,
            enrollment_index INTEGER NOT NULL,
            utxo_key TEXT NOT NULL,
            random_seed TEXT NOT NULL,
            cycle_length INTEGER NOT NULL,
            enroll_sig TEXT NOT NULL,
            PRIMARY KEY("block_height","enrollment_index")
        );

        CREATE TABLE IF NOT EXISTS "transactions"
        (
            "block_height"      INTEGER NOT NULL,
            "tx_index"          INTEGER NOT NULL,
            "tx_hash"           TEXT NOT NULL,
            "type"              INTEGER NOT NULL,
            "inputs_count"      INTEGER NOT NULL,
            "outputs_count"     INTEGER NOT NULL,
            PRIMARY KEY("block_height", "tx_index")
        );

        CREATE TABLE IF NOT EXISTS "tx_inputs"
        (
            "block_height"      INTEGER NOT NULL,
            "tx_index"          INTEGER NOT NULL,
            "in_index"          INTEGER NOT NULL,
            "previous"          TEXT NOT NULL,
            "out_index"         INTEGER NOT NULL,
            PRIMARY KEY("block_height", "tx_index", "in_index")
        );

        CREATE TABLE IF NOT EXISTS "tx_outputs"
        (
            "block_height"  INTEGER NOT NULL,
            "tx_index"      INTEGER NOT NULL,
            "output_index"  INTEGER NOT NULL,
            "tx_hash"       TEXT NOT NULL,
            "utxo_key"      TEXT NOT NULL,
            "amount"        NUMERIC NOT NULL,
            "address"       TEXT NOT NULL,
            "used"          INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY("block_height", "tx_index", "output_index")
        );

        CREATE TABLE IF NOT EXISTS "validators"
        (
            "enrolled_at"  INTEGER NOT NULL,
            "utxo_key"  TEXT NOT NULL,
            "address"  TEXT NOT NULL,
            "amount"  NUMERIC NOT NULL,
            "preimage_distance"  INTEGER NOT NULL,
            "preimage_hash"  TEXT NOT NULL,
            PRIMARY KEY("enrolled_at","utxo_key")
        );
        `;

        this.db.exec(sql, (err: Error | null) =>
        {
            callback(err);
        });
    }

    /**
     * Puts a block to database
     * @param data a block data
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public putBlocks (data: any,
        onSuccess: () => void, onError: (err: Error) => void)
    {
        let block: Block = new Block();
        try
        {
            block.parseJSON(data);
        }
        catch (error)
        {
            onError(error);
            return;
        }

        let sql =
            `INSERT INTO blocks
                (height, prev_block, validators, merkle_root, signature, tx_count, enrollment_count)
            VALUES
                (?, ?, ?, ?, ?, ?, ?)`;
        this.db.run(sql,
            [
                block.header.height.value,
                block.header.prev_block,
                JSON.stringify(block.header.validators._storage),
                block.header.merkle_root,
                block.header.signature,
                block.txs.length,
                block.header.enrollments.length
            ], (err: Error | null) =>
        {
            if (err != null)
            {
                onError(err);
                return;
            }
            this.putTransactionsUseStatement(block,
            () =>
            {
                this.putEnrollmentsUseStatement(block, onSuccess, onError);
            },
            onError);
        });
    }

    /**
     * Gets a block data
     * @param height the height of the block to get
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public getBlocks (height: number,
        onSuccess: (rows: any[]) => void, onError: (err: Error) => void)
    {
        let sql =
        `SELECT
            height, prev_block, validators, merkle_root, signature, tx_count, enrollment_count
        FROM
            blocks
        WHERE height = ?`;
        this.query(sql, [height], onSuccess, onError);
    }

    /**
     * Puts all enrollments
     * @param block: The instance of the `Block`
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public putEnrollmentsUseStatement (block: Block,
        onSuccess: () => void, onError: (err: Error) => void)
    {
        const enroll_stmt = this.db.prepare(
            `INSERT INTO enrollments
                (block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig)
            VALUES
                (?, ?, ?, ?, ?, ?)`
        );

        const validator_stmt = this.db.prepare(
            `INSERT INTO validators
                (enrolled_at, utxo_key, address, amount, preimage_distance, preimage_hash)
            SELECT ?, utxo_key, address, amount, ?, ?
                FROM tx_outputs
            WHERE
                tx_outputs.utxo_key = ?`
        );

        block.header.enrollments.forEach((enroll: Enrollment, enroll_idx: number) =>
        {
            enroll_stmt.run([
                block.header.height.value,
                enroll_idx,
                enroll.utxo_key,
                enroll.random_seed,
                enroll.cycle_length,
                enroll.enroll_sig
            ]);
            validator_stmt.run([
                block.header.height.value,
                0,
                '0x0000000000000000',
                enroll.utxo_key
            ]);
        });

        enroll_stmt.finalize((err1: Error | null) =>
        {
            if (err1)
            {
                onError(err1);
                return;
            }

            validator_stmt.finalize((err2: Error | null) =>
            {
                if (err2)
                    onError(err2);
                else
                    onSuccess();
            });
        });
    }

    /**
     * Get enrollments
     * @param height The height of the block
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public getEnrollments (height: number,
        onSuccess: (rows: any[]) => void, onError: (err: Error) => void)
    {
        let sql =
        `SELECT
            block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig
        FROM
            enrollments
        WHERE block_height = ?`;
        this.query(sql, [height], onSuccess, onError);
    }

    /**
     * Get validators
     * @param height The height of the block
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public getValidators (height: number,
        onSuccess: (rows: any[]) => void, onError: (err: Error) => void)
    {
        let sql: string =
        `SELECT
            enrolled_at, utxo_key, address, amount, preimage_distance, preimage_hash
        FROM
            validators
        WHERE enrolled_at = ?`;
        this.query(sql, [height], onSuccess, onError);
    }

    /**
     * Puts all transactions
     * @param block: The instance of the `Block`
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public putTransactionsUseStatement (block: Block,
        onSuccess: () => void, onError: (err: Error) => void)
    {
        const tx_stmt = this.db.prepare(
            `INSERT INTO transactions
                (block_height, tx_index, tx_hash, type, inputs_count, outputs_count)
            VALUES
                (?, ?, ?, ?, ?, ?)`
        );

        const inputs_stmt = this.db.prepare(
            `INSERT INTO tx_inputs
                (block_height, tx_index, in_index, previous, out_index)
            VALUES
                (?, ?, ?, ?, ?)`
        );

        const outputs_stmt = this.db.prepare(
            `INSERT INTO tx_outputs
                (block_height, tx_index, output_index, tx_hash, utxo_key, address, amount)
            VALUES
                (?, ?, ?, ?, ?, ?, ?)`
        );

        const update_used_stmt = this.db.prepare(
            `UPDATE tx_outputs SET used = 1 WHERE tx_hash = ? and output_index = ?`
        );

        block.txs.forEach((tx: Transaction, tx_idx: number) => {
            tx_stmt.run([
                block.header.height.value,
                tx_idx,
                block.merkle_tree[tx_idx],
                tx.type,
                tx.inputs.length,
                tx.outputs.length
            ]);
            tx.inputs.forEach((input: TxInputs, in_idx: number)  => {
                inputs_stmt.run([
                    block.header.height.value,
                    tx_idx,
                    in_idx,
                    input.previous,
                    input.index]);
                update_used_stmt.run([input.previous, input.index]);
            });
            tx.outputs.forEach((output: TxOutputs, out_idx: number)  => {
                this.hash.makeUTXOKey(block.merkle_tree[tx_idx], BigInt(out_idx));
                outputs_stmt.run([
                    block.header.height.value,
                    tx_idx,
                    out_idx,
                    block.merkle_tree[tx_idx],
                    this.hash.toHexString(),
                    output.address,
                    output.value]);
            });
        });

        tx_stmt.finalize((err1: Error | null) =>
        {
            if (err1)
            {
                onError(err1);
                return;
            }

            inputs_stmt.finalize((err2: Error | null) =>
            {
                if (err2)
                {
                    onError(err2);
                    return;
                }

                outputs_stmt.finalize((err3: Error | null) =>
                {
                    if (err3)
                    {
                        onError(err3);
                        return;
                    }

                    update_used_stmt.finalize((err4: Error | null) =>
                    {
                        if (err4)
                            onError(err4);
                        else
                            onSuccess();
                    });
                });
            });
        });
    }

    /**
     * Gets a transaction data
     * @param height The height of the block to get
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public getTransactions (height: number,
        onSuccess: (rows: any[]) => void, onError: (err: Error) => void)
    {
        let sql: string =
        `SELECT
            block_height, tx_index, tx_hash, type, inputs_count, outputs_count
        FROM
            transactions
        WHERE block_height = ?`;
        this.query(sql, [height], onSuccess, onError);
    }

    /**
     * Gets a transaction inputs data
     * @param height The height of the block to get
     * @param tx_index The index of the transaction in the block
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public getTxInputs (height: number, tx_index: number,
        onSuccess: (rows: any[]) => void, onError: (err: Error) => void)
    {
        let sql: string =
        `SELECT
            block_height, tx_index, in_index, previous, "out_index"
        FROM
            tx_inputs
        WHERE block_height = ? AND tx_index = ?`;
        this.query(sql, [height, tx_index], onSuccess, onError);
    }

    /**
     * Gets a transaction outputs data
     * @param height The height of the block to get
     * @param tx_index The index of the transaction in the block
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public getTxOutputs (height: number, tx_index: number,
        onSuccess: (rows: any[]) => void, onError: (err: Error) => void)
    {
        let sql: string =
        `SELECT
            block_height, tx_index, output_index, tx_hash, utxo_key, address, amount, used
        FROM
            tx_outputs
        WHERE block_height = ? AND tx_index = ?`;
        this.query(sql, [height, tx_index], onSuccess, onError);
    }

    /**
     * Runs the SQL query with the specified parameters and
     * calls the callback onSuccess and onError afterwards
     * @param sql The SQL query to run.
     * @param params When the SQL statement contains placeholders,
     * you can pass them in here.
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    private query (sql: string, params: any,
        onSuccess: (rows: any[]) => void, onError: (err: Error) => void)
    {
        this.db.all(sql, params, (err: Error | null, rows: any[]) =>
        {
            if (!err)
                onSuccess(rows);
            else
                onError(err);
        });
    }

    /**
     * Get validators
     * @param height: The height parameter is optional.
     * validators based on the block height if there is a height.
     * if height null the most up to date state is expected.
     * if the height is null then current valid validators.
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public getValidatorsAPI (height: number, address: string | null,
        onSuccess: (rows: any[]) => void, onError: (err: Error) => void)
    {
        let cur_height: string;

        if (!Number.isNaN(height))
            cur_height = height.toString();
        else
            cur_height = `(SELECT MAX(height) as height FROM blocks)`;

        let sql =
        `SELECT tx_outputs.address,
                enrollments.block_height as enrolled_at,
                enrollments.utxo_key as stake,
                (` + cur_height + ` - enrollments.block_height) as distance,
                enrollments.random_seed,
                (SELECT MAX(height) as height FROM blocks) as height,
                ((SELECT MAX(height) as height FROM blocks) - (enrollments.block_height + 1)) as test
        FROM enrollments
            LEFT JOIN tx_outputs ON enrollments.utxo_key = tx_outputs.utxo_key
        WHERE
            enrollments.block_height >= (` + cur_height + ` - enrollments.cycle_length)
            AND enrollments.block_height <= ` + cur_height + `
        `;

        if (address != null)
            sql += ` AND tx_outputs.address = '` + address + `'`;

        sql += ` ORDER BY enrollments.block_height ASC, enrollments.utxo_key ASC;`;

        this.query(sql, [], onSuccess, onError);
    }
}
