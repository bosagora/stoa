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

import { Storages } from './Storages';

/**
 * The class that insert and read the ledger into the database.
 */
export class LedgerStorage extends Storages
{
    /**
     * Creates tables related to the ledger.
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public createTables (callback: (err: Error | null) => void)
    {
        var sql =
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
        );`;
        this.db.run(sql, (err: Error | null) =>
        {
            if (callback != null)
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
    public putBlocks (data: any, callback: (err: Error | null) => void)
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
            if (callback != null)
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
            if (callback != null)
                callback(err);
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
    public putEnrollment (data: any, callback: (err: Error | null) => void)
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
            if (callback != null)
                callback(err);
        });
    }

    /**
     * Puts all enrollments
     * @param data: block header JSON object
     * @param Callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     */
    public putAllEnrollments (header: any, callback: (err: Error | null) => void)
    {
        var idx: number = 0;
        var doPut = () =>
        {
            if (idx >= header.enrollments.length)
            {
                return;
            }

            let enrollment: any = header.enrollments[idx];
            enrollment.block_height = header.height.value;
            enrollment.enrollment_index = idx;

            this.putEnrollment(enrollment, (err: Error | null) =>
            {
                if (err != null)
                {
                    idx++;
                    doPut();
                }
                else
                {
                    if (callback != null)
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
}
