/*******************************************************************************

    The class that insert and read the enrollments into the database.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Storages } from './Storages';

/**
 * The class that insert and read the enrollments into the database.
 */
export class EnrollmentsStorage extends Storages
{
    /**
     * Create a table. table name is `enrollments`.
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public createTable (callback?: any)
    {
        var sql =
        `CREATE TABLE IF NOT EXISTS enrollments
        (
            block_height INTEGER NOT NULL,
            enrollment_index INTEGER NOT NULL,
            utxo_key TEXT NOT NULL,
            random_seed TEXT NOT NULL,
            cycle_length INTEGER NOT NULL,
            enroll_sig TEXT NOT NULL,
            PRIMARY KEY("block_height","enrollment_index")
        )`;
        this.db.run(sql, (err?: any) =>
        {
            if (callback != null)
                callback(err);
        });
    }

    /**
     * Put a enrollment to database
     * @param data a enrollment data
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public put (data: any, callback?: any)
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
            if (callback != undefined)
                callback("Parameter validation failed.");
            return;
        }

        var sql =
        `INSERT INTO enrollments
            (block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig)
        VALUES
            (?, ?, ?, ?, ?, ?)
        ON CONFLICT(block_height, enrollment_index) DO UPDATE SET
            block_height = block_height,
            enrollment_index = enrollment_index,
            utxo_key = utxo_key,
            random_seed = random_seed,
            cycle_length = cycle_length,
            enroll_sig = enroll_sig
            `;
        this.db.run(sql,
            [
                data.block_height,
                data.enrollment_index,
                data.utxo_key,
                data.random_seed,
                data.cycle_length,
                data.enroll_sig
            ], (err : any) =>
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
    public putAllEnrollments (header: any, callback?: any)
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

            this.put(enrollment, (err?: any) =>
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
    public get (height: any, callback?: any)
    {
        var sql =
        `SELECT
            block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig
        FROM
            enrollments
        WHERE block_height = ?`;
        this.db.all(sql, [height], (err: any, rows: any) =>
        {
            if (callback != null)
                callback(err, rows);
            else
                console.log(callback);
        });
    }
}
