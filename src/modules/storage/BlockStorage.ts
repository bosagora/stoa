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

import * as sqlite from 'sqlite3';

/**
 * The class that insert and read the block into the database.
 */
class BlockStorage
{
    /**
     *  The instance of sqlite3
     */
    private db: sqlite.Database;

    /**
     * Constructor
     * @param filename Valid values are filenames,
     * ":memory:" for an anonymous in-memory database and
     * an empty string for an anonymous disk-based database
     * @param callback : If provided, this function will be called when
     * the database was opened successfully or when an error occurred.
     * The first argument is an error object.
     */
    constructor (filename : string, callback : any = null)
    {
        this.db = new sqlite.Database(filename,
            sqlite.OPEN_CREATE | sqlite.OPEN_READWRITE |
            sqlite.OPEN_SHAREDCACHE);
        this.db.configure("busyTimeout", 1000);
        this.createTable(callback);
    }

    /**
     * Creates a table. table name is `block`.
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public createTable (callback : any = null)
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
        this.db.run(sql, (err : any) =>
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
    public put (data : any, callback : any = null)
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
            if (callback != null)
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
            ], (err : any) =>
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
    public get (height : number, callback : any = null)
    {
        var sql =
        `SELECT
            height, prev_block, validators, merkle_root, signature
        FROM
            blocks
        WHERE height = ?`;
        this.db.all(sql, [height], (err : any, rows : any) =>
        {
            if (callback != null)
                callback(err, rows);
        });
    }

    /**
     * Closes database
     */
    public close ()
    {
        this.db.close();
    }
}

export default BlockStorage;
