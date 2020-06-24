/*******************************************************************************

    The class that create and insert and read the ledger into the database.

    Now only block header are stored.
    Transactions and other data will be managed by different classes.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as sqlite from 'sqlite3';
import { Hash }  from '../common/Hash'
import { Storages } from './Storages';

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
            "address"  TEXT(56) NOT NULL,
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
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public putBlocks (data: any, callback?: (err: Error | null) => void)
    {
        if (
                (data == null) ||
                (data.header == undefined) ||
                (data.header.height == undefined) ||
                (data.header.height.value == undefined) ||
                (data.header.prev_block == undefined) ||
                (data.header.validators == undefined) ||
                (data.header.validators._storage == undefined) ||
                (data.header.merkle_root == undefined) ||
                (data.header.signature == undefined) ||
                (data.txs == undefined)
        ) {
            if (callback != undefined)
                callback(new Error("Parameter validation failed."));
            return;
        }

        var tx_count: number = data.txs.length;
        var enrollment_count: number = data.enrollments? data.enrollments.length: 0;

        var sql =
            `INSERT INTO blocks
                (height, prev_block, validators, merkle_root, signature, tx_count, enrollment_count)
            VALUES
                (?, ?, ?, ?, ?, ?, ?)`;
        this.db.run(sql,
            [
                data.header.height.value,
                data.header.prev_block,
                JSON.stringify(data.header.validators._storage),
                data.header.merkle_root,
                data.header.signature,
                tx_count,
                enrollment_count
            ], (err: Error | null) =>
        {
            this.putTransactions(data, (err1: Error | null) =>
            {
                if (err1)
                {
                    if (callback != undefined)
                        callback(err1);
                    return;
                }

                this.putAllEnrollments(data.header, callback);
            });
        });
    }

    /**
     * Gets a block data
     * @param height the height of the block to get
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getBlocks (height: any, callback: (err: Error | null, rows: any[]) => void)
    {
        var sql =
        `SELECT
            height, prev_block, validators, merkle_root, signature, tx_count, enrollment_count
        FROM
            blocks
        WHERE height = ?`;
        this.db.all(sql, [height], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Put a enrollment to database
     * @param data a enrollment data
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public putEnrollment (data: any, callback?: (err: Error | null) => void)
    {
        if (
                (data == null) ||
                (data.block_height == undefined) ||
                (data.enrollment_index == undefined) ||
                (data.utxo_key == undefined) ||
                (data.random_seed == undefined) ||
                (data.cycle_length == undefined) ||
                (data.enroll_sig == undefined)
        ) {
            if (callback != null)
                callback(new Error("Parameter validation failed."));
            return;
        }

        var sql =
        `INSERT INTO enrollments
            (block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig)
        VALUES
            (?, ?, ?, ?, ?, ?)`;
        this.db.run(sql,
            [
                data.block_height,
                data.enrollment_index,
                data.utxo_key,
                data.random_seed,
                data.cycle_length,
                data.enroll_sig
            ], (err: Error | null) =>
        {
            if (callback != undefined)
                callback(err);
        });
    }

    /**
     * Put a validator to database
     * @param data a enrollment data
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public putValidator (data: any, callback?: (err: Error | null) => void)
    {
        if (
            (data == null) ||
            (data.block_height == undefined) ||
            (data.utxo_key == undefined)
        ) {
            if (callback != null)
                callback(new Error("Parameter validation failed."));
            return;
        }

        var sql: string =
        `INSERT INTO validators
            (enrolled_at, utxo_key, address, amount, preimage_distance, preimage_hash)
        SELECT ?, utxo_key, address, amount, ?, ?
            FROM tx_outputs
        WHERE
            tx_outputs.utxo_key = ?`;
        this.db.run(sql,
            [
                data.block_height,
                0,
                '0x0000000000000000',
                data.utxo_key
            ], (err: Error | null) =>
        {
            if (callback != undefined)
                callback(err);
        });
    }

    /**
     * Puts all enrollments
     * @param data: block header JSON object
     * @param Callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     */
    public putAllEnrollments (header: any, callback?: (err: Error | null) => void)
    {
        var idx: number = 0;
        var doPut = () =>
        {
            if (idx >= header.enrollments.length)
            {
                if (callback != undefined)
                    callback(null);
                return;
            }

            let enrollment: any = header.enrollments[idx];
            enrollment.block_height = header.height.value;
            enrollment.enrollment_index = idx;

            this.putEnrollment(enrollment, (err: Error | null) =>
            {
                if (!err)
                {
                    this.putValidator(enrollment, (err2: Error | null) =>
                    {
                        if (err2 == null)
                        {
                            idx++;
                            doPut();
                        }
                        else
                        {
                            if (callback != undefined)
                                callback(err);
                            else
                                return;

                        }
                    });
                }
                else
                {
                    if (callback != undefined)
                        callback(err);
                    else
                        return;
                }
            });
        }
        doPut();
    }

    /**
     * Get enrollments
     * @param Corresponding block height of enrollments
     * @param Callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getEnrollments (height: any, callback: (err: Error | null, rows: any[]) => void)
    {
        var sql =
        `SELECT
            block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig
        FROM
            enrollments
        WHERE block_height = ?`;
        this.db.all(sql, [height], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Get validators
     * @param height block height of enrollments
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getValidators (height: number, callback: (err: Error | null, rows: any[]) => void)
    {
        var sql: string =
        `SELECT
            enrolled_at, utxo_key, address, amount, preimage_distance, preimage_hash
        FROM
            validators
        WHERE enrolled_at = ?`;
        this.db.all(sql, [height], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Put a transaction to database
     * @param data a transaction data
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    private putTransaction (block_height: number, tx: any, tx_index: number,
        tx_hash: string, callback?: (err: Error | null) => void)
    {
        if (tx == undefined) {
            if (callback != undefined)
                callback(new Error("Parameter validation failed."));
            return;
        }

        let sql: string =
        `INSERT INTO transactions
            (block_height, tx_index, tx_hash, type, inputs_count, outputs_count)
        VALUES
            (?, ?, ?, ?, ?, ?)`;
        this.db.run(sql,
            [
                block_height,
                tx_index,
                tx_hash,
                tx.type,
                tx.inputs.length,
                tx.outputs.length
            ], (err: Error | null) =>
        {
            if (err)
            {
                if (callback != undefined)
                    callback(err);
                return;
            }

            this.putInputs(block_height, tx, tx_index, tx_hash, (err2: Error | null) =>
            {
                if (err2)
                {
                    if (callback != undefined)
                        callback(err2);
                    return;
                }

                this.putOutputs(block_height, tx, tx_index, tx_hash, (err3: Error | null) =>
                {
                    if (callback != undefined)
                        callback(err3);
                });
            })
        });
    }

    /**
     * Puts all transactions
     * @param block: block Json data
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public putTransactions (block: any, callback?: (err: Error | null) => void)
    {
        let idx: number = 0;
        let doPut = () =>
        {
            if (idx >= block.txs.length)
            {
                if (callback != undefined)
                    callback(null);
                return;
            }

            this.putTransaction(block.header.height.value, block.txs[idx],
                idx, block.merkle_tree[idx], (err: Error | null) =>
                {
                    if (!err)
                    {
                        idx++;
                        doPut();
                    }
                    else
                    {
                        if (callback != undefined)
                            callback(err);
                        else
                            return;
                    }
                }
            );
        }
        doPut();
    }

    /**
     * Store the inputs of the transaction.
     * @param block_height The height of the block
     * @param tx a transaction
     * @param tx_index The index of transaction in the block
     * @param tx_hash The hash of transaction
     * @param callback
     */
    public putInputs (block_height: number, tx: any, tx_index: number, tx_hash: string, callback?: (err: Error | null) => void)
    {
        let putInput = function (
            db: sqlite.Database,
            block_height: any,
            tx_index: number,
            in_index: number,
            input: any,
            cb?: (err: Error | null) => void)
        {
            if (
                (input == undefined) ||
                (input.previous == undefined) ||
                (input.index == undefined)
            ) {
                if (cb != undefined)
                    cb(new Error("Parameter validation failed."));
                return;
            }

            let sql: string =
            `INSERT INTO tx_inputs
                (block_height, tx_index, in_index, previous, out_index)
            VALUES
                (?, ?, ?, ?, ?)`;
            db.run(sql,
                [
                    block_height,
                    tx_index,
                    in_index,
                    input.previous,
                    input.index
                ], (err: Error | null) =>
            {
                if (cb != undefined)
                    cb(err);
            });
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

            putInput(this.db, block_height, tx_index, idx, tx.inputs[idx], (err: Error | null) =>
                {
                    if (!err)
                    {
                        idx++;
                        doPut();
                    }
                    else
                    {
                        if (callback != undefined)
                            callback(err);
                        return;
                    }
                }
            );
        }


        let check = function (
            db: sqlite.Database,
            input: any,
            cb?: (err: Error | null) => void)
        {
            if (
                (input == undefined) ||
                (input.previous == undefined) ||
                (input.index == undefined)
            ) {
                if (cb != undefined)
                    cb(new Error("Parameter validation failed."));
                return;
            }

            let sql: string = `UPDATE tx_outputs SET used = 1 WHERE tx_hash = ? and output_index = ?`;
            db.run(sql, [input.previous, input.index], (err: Error | null) =>
            {
                if (cb != undefined)
                    cb(err);
            });
        }

        let doCheck = () =>
        {
            if (checking_idx >= tx.inputs.length)
            {
                if (callback != undefined)
                    callback(null);
                return;
            }

            check(this.db, tx.inputs[checking_idx], (err: Error | null) =>
                {
                    if (!err)
                    {
                        checking_idx++;
                        doCheck();
                    }
                    else
                    {
                        if (callback != undefined)
                            callback(err);
                        else
                            return;
                    }
                }
            );
        }

        doPut();
    }

    /**
     * Store the outputs of the transaction.
     * @param block_height The height of the block
     * @param tx a transaction
     * @param tx_index The index of transaction in the block
     * @param tx_hash The hash of transaction
     * @param callback
     */
    public putOutputs (block_height: number, tx: any, tx_index: number, tx_hash: string, callback?: (err: Error | null) => void)
    {
        let putOutput = function (
            db: sqlite.Database,
            hash: Hash,
            block_height: number,
            tx_index: number,
            out_index: number,
            output: any,
            cb?: (err: Error | null) => void)
        {
            if (
                (output == undefined) ||
                (output.address == undefined)||
                (output.value == undefined)
            ) {
                if (cb != undefined)
                    cb(new Error("Parameter validation failed."));
                return;
            }

            hash.makeUTXOKey(tx_hash, BigInt(out_index));

            let sql: string =
            `INSERT INTO tx_outputs
                (block_height, tx_index, output_index, tx_hash, utxo_key, address, amount)
            VALUES
                (?, ?, ?, ?, ?, ?, ?)`;
            db.run(sql,
                [
                    block_height,
                    tx_index,
                    out_index,
                    tx_hash,
                    hash.toHexString(),
                    output.address,
                    output.value
                ], (err: Error | null) =>
            {
                if (cb != undefined)
                    cb(err);
            });
        }

        let idx = 0;
        let doPut = () =>
        {
            if (idx >= tx.outputs.length)
            {
                if (callback != undefined)
                    callback(null);
                return;
            }

            putOutput(this.db, this.hash, block_height, tx_index, idx, tx.outputs[idx], (err: Error | null) =>
                {
                    if (!err)
                    {
                        idx++;
                        doPut();
                    }
                    else
                    {
                        if (callback != undefined)
                            callback(err);
                        else
                            return;
                    }
                }
            );
        }
        doPut();
    }

    /**
     * Gets a transaction data
     * @param height the height of the block to get
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getTransactions (height: number,
        callback: (err: Error | null, rows: any[]) => void)
    {
        var sql: string =
        `SELECT
            block_height, tx_index, tx_hash, type, inputs_count, outputs_count
        FROM
            transactions
        WHERE block_height = ?`;
        this.db.all(sql, [height], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Gets a transaction inputs data
     * @param height The height of the block to get
     * @param tx_index The index of the transaction in the block
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getTxInputs (height: number, tx_index: number,
        callback: (err: Error | null, rows: any[]) => void)
    {
        var sql: string =
        `SELECT
            block_height, tx_index, in_index, previous, "out_index"
        FROM
            tx_inputs
        WHERE block_height = ? AND tx_index = ?`;
        this.db.all(sql, [height, tx_index], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Gets a transaction outputs data
     * @param height The height of the block to get
     * @param tx_index The index of the transaction in the block
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getTxOutputs (height: number, tx_index: number,
        callback: (err: Error | null, rows: any[]) => void)
    {
        var sql: string =
        `SELECT
            block_height, tx_index, output_index, tx_hash, utxo_key, address, amount, used
        FROM
            tx_outputs
        WHERE block_height = ? AND tx_index = ?`;
        this.db.all(sql, [height, tx_index], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Get validators
     * @param height: The height parameter is optional.
     * validators based on the block height if there is a height.
     * if height null the most up to date state is expected.
     * if the height is null then current valid validators.
     * @param Callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     */
    public getValidatorsAPI (height: number, address: string | null,
        callback: (err: Error | null, rows: any[]) => void)
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
                (` + cur_height + ` - (enrollments.block_height + 1)) as distance,
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

        this.db.all(sql, [], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }
}
