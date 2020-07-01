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
import { Block, Enrollment, BlockHeader, Transaction,
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
        var sql: string =
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

        var sql =
            `INSERT INTO blocks
                (height, prev_block, validators, merkle_root, signature, tx_count, enrollment_count)
            VALUES
                (?, ?, ?, ?, ?, ?, ?)`;
        this.db.run(sql,
            [
                block.header.height,
                block.header.prev_block,
                JSON.stringify(block.header.validators._storage),
                block.header.merkle_root,
                block.header.signature,
                block.txs.length,
                block.header.enrollments.length
            ], (err: Error | null) =>
        {
            this.putTransactions(block,
            () =>
            {
                this.putAllEnrollments(block, onSuccess, onError);
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
        var sql =
        `SELECT
            height, prev_block, validators, merkle_root, signature, tx_count, enrollment_count
        FROM
            blocks
        WHERE height = ?`;
        this.query(sql, [height], onSuccess, onError);
    }

    /**
     * Put a enrollment to database
     * @param data The enrollment data
     * @param height The height of the block
     * @param enrollment_index The index of the enrollment
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public putEnrollment (data: Enrollment, height: number, enrollment_index: number,
        onSuccess: () => void, onError: (err: Error) => void)
    {
        var sql =
        `INSERT INTO enrollments
            (block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig)
        VALUES
            (?, ?, ?, ?, ?, ?)`;
        this.query(sql,
            [
                height,
                enrollment_index,
                data.utxo_key,
                data.random_seed,
                data.cycle_length,
                data.enroll_sig
            ], onSuccess, onError);
    }

    /**
     * Put a validator to database
     * @param enrollment The enrollment data
     * @param height The height of the block
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public putValidator (enrollment: Enrollment, height: number,
        onSuccess: () => void, onError: (err: Error) => void)
    {
        var sql: string =
        `INSERT INTO validators
            (enrolled_at, utxo_key, address, amount, preimage_distance, preimage_hash)
        SELECT ?, utxo_key, address, amount, ?, ?
            FROM tx_outputs
        WHERE
            tx_outputs.utxo_key = ?`;
        this.query(sql,
            [
                height,
                0,
                '0x0000000000000000',
                enrollment.utxo_key
            ], onSuccess, onError);
    }

    /**
     * Puts all enrollments
     * @param block: The instance of the `Block`
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public putAllEnrollments (block: Block,
        onSuccess: () => void, onError: (err: Error) => void)
    {
        var idx: number = 0;
        var doPut = () =>
        {
            if (idx >= block.header.enrollments.length)
            {
                onSuccess();
                return;
            }

            this.putEnrollment(block.header.enrollments[idx], block.header.height, idx,
                () =>
                {
                    this.putValidator(block.header.enrollments[idx], block.header.height,
                        () =>
                        {
                            idx++;
                            doPut();
                        },
                        (err2: Error) =>
                        {
                            onError(err2);
                            return;
                        }
                    );
                },
                (err1: Error) =>
                {
                    onError(err1);
                    return;
                }
            );
        }
        doPut();
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
        var sql =
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
        var sql: string =
        `SELECT
            enrolled_at, utxo_key, address, amount, preimage_distance, preimage_hash
        FROM
            validators
        WHERE enrolled_at = ?`;
        this.query(sql, [height], onSuccess, onError);
    }

    /**
     * Put a transaction to database
     * @param height  The height of the block
     * @param tx The transaction
     * @param tx_index The index of the transaction in the block
     * @param tx_hash The hash of the transaction
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    private putTransaction (height: number, tx: Transaction, tx_index: number, tx_hash: string,
        onSuccess: () => void, onError: (err: Error) => void)
    {
        let sql: string =
        `INSERT INTO transactions
            (block_height, tx_index, tx_hash, type, inputs_count, outputs_count)
        VALUES
            (?, ?, ?, ?, ?, ?)`;
        this.query(sql,
            [
                height,
                tx_index,
                tx_hash,
                tx.type,
                tx.inputs.length,
                tx.outputs.length
            ],
            () =>
            {
                this.putInputs(height, tx, tx_index, tx_hash,
                    () =>
                    {
                        this.putOutputs(height, tx, tx_index, tx_hash,
                            onSuccess, onError);
                    },
                    onError
                );
            },
            onError
        );
    }

    /**
     * Puts all transactions
     * @param block: The instance of the `Block`
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public putTransactions (block: Block,
        onSuccess: () => void, onError: (err: Error) => void)
    {
        let idx: number = 0;
        let doPut = () =>
        {
            if (idx >= block.txs.length)
            {
                onSuccess();
                return;
            }

            this.putTransaction(block.header.height, block.txs[idx],
                idx, block.merkle_tree[idx],
                () =>
                {
                    idx++;
                    doPut();
                },
                (err: Error) =>
                {
                    onError(err);
                    return;
                }
            );
        }
        doPut();
    }

    /**
     * Store the inputs of the transaction.
     * @param height The height of the block
     * @param tx The transaction
     * @param tx_index The index of transaction in the block
     * @param tx_hash The hash of transaction
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public putInputs (height: number, tx: Transaction, tx_index: number, tx_hash: string,
        onSuccess: () => void, onError: (err: Error) => void)
    {
        let putInput = function (
            storage: LedgerStorage,
            height: number,
            tx_index: number,
            in_index: number,
            input: TxInputs,
            onSuccess: () => void,
            onError: (err: Error) => void)
        {
            let sql: string =
            `INSERT INTO tx_inputs
                (block_height, tx_index, in_index, previous, out_index)
            VALUES
                (?, ?, ?, ?, ?)`;
            storage.query(sql,
                [
                    height,
                    tx_index,
                    in_index,
                    input.previous,
                    input.index
                ], onSuccess, onError);
        }

        let idx = 0;
        let checking_idx = 0;
        let doPut = () =>
        {
            if (idx >= tx.inputs.length)
            {
                doCheck();
                return;
            }

            putInput(this, height, tx_index, idx, tx.inputs[idx],
                () =>
                {
                    idx++;
                    doPut();
                },
                (err: Error) =>
                {
                    onError(err);
                    return;
                }
            );
        }


        let check = function (
            storage: LedgerStorage,
            input: TxInputs,
            onSuccess: () => void,
            onError: (err: Error) => void)
        {
            let sql: string = `UPDATE tx_outputs SET used = 1 WHERE tx_hash = ? and output_index = ?`;
            storage.query(sql, [input.previous, input.index], onSuccess, onError);
        }

        let doCheck = () =>
        {
            if (checking_idx >= tx.inputs.length)
            {
                onSuccess();
                return;
            }

            check(this, tx.inputs[checking_idx],
                () =>
                {
                    checking_idx++;
                    doCheck();
                },
                (err: Error) =>
                {
                    onError(err);
                    return;
                }
            );
        }

        doPut();
    }

    /**
     * Store the outputs of the transaction.
     * @param height The height of the block
     * @param tx The transaction
     * @param tx_index The index of the transaction in the block
     * @param tx_hash The hash of the transaction
     * @param onSuccess This function will be called when
     * the database was finished successfully
     * @param onError This function will be called when
     * an error occurred.
     */
    public putOutputs (height: number, tx: Transaction, tx_index: number, tx_hash: string,
        onSuccess: () => void, onError: (err: Error) => void)
    {
        let putOutput = function (
            storage: LedgerStorage,
            hash: Hash,
            height: number,
            tx_index: number,
            out_index: number,
            output: TxOutputs,
            onSuccess: () => void,
            onError: (err: Error) => void)
        {
            hash.makeUTXOKey(tx_hash, BigInt(out_index));

            let sql: string =
            `INSERT INTO tx_outputs
                (block_height, tx_index, output_index, tx_hash, utxo_key, address, amount)
            VALUES
                (?, ?, ?, ?, ?, ?, ?)`;
            storage.query(sql,
                [
                    height,
                    tx_index,
                    out_index,
                    tx_hash,
                    hash.toHexString(),
                    output.address,
                    output.value
                ], onSuccess, onError);
        }

        let idx = 0;
        let doPut = () =>
        {
            if (idx >= tx.outputs.length)
            {
                onSuccess();
                return;
            }

            putOutput(this, this.hash, height, tx_index, idx, tx.outputs[idx],
                () =>
                {
                    idx++;
                    doPut();
                },
                (err: Error) =>
                {
                    onError(err);
                    return;
                }
            );
        }
        doPut();
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
        var sql: string =
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
        var sql: string =
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
        var sql: string =
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
        var cur_height: string;

        if (!Number.isNaN(height))
            cur_height = height.toString();
        else
            cur_height = `(SELECT MAX(height) as height FROM blocks)`;

        var sql =
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
