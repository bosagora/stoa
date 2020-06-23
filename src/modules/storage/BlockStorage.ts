/*******************************************************************************

    The class that insert and read the block into the database.

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
 * The class that insert and read the block into the database.
 */
export class BlockStorage extends Storages
{
    /**
     * Constructor
     * @param callback : If provided, this function will be called when
     * the database was opened successfully or when an error occurred.
     * The first argument is an error object.
     */
    constructor (callback?: any)
    {
        super(callback);
    }

    /**
     * Creates a table. table name is `block`.
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public createTable (callback?: any)
    {
        var sql =
        `CREATE TABLE IF NOT EXISTS blocks
        (
            height INTEGER PRIMARY KEY,
            prev_block TEXT,
            validators TEXT,
            merkle_root TEXT,
            signature TEXT
        )`;
        this.db.run(sql, (err: any) =>
        {
            if (callback != undefined)
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
    public put (data: any, callback?: any)
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
                (data.header.signature == undefined)
        ) {
            if (callback != undefined)
                callback("Parameter validation failed.");
            return;
        }

        var sql =
        `INSERT INTO blocks
            (height, prev_block, validators, merkle_root, signature)
        VALUES
            (?, ?, ?, ?, ?)
        ON CONFLICT(height) DO UPDATE SET
            prev_block = prev_block,
            validators = validators,
            merkle_root = merkle_root,
            signature = signature`;
        this.db.run(sql,
            [
                data.header.height.value,
                data.header.prev_block,
                JSON.stringify(data.header.validators._storage),
                data.header.merkle_root,
                data.header.signature
            ], (err: any) =>
        {
            if (callback != undefined)
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
    public get (height: any, callback?: any)
    {
        var sql =
        `SELECT
            height, prev_block, validators, merkle_root, signature
        FROM
            blocks
        WHERE height = ?`;
        this.db.all(sql, [height], (err: any, rows: any) =>
        {
            if (callback != undefined)
                callback(err, rows);
            else
                console.log(callback);
        });
    }

}
