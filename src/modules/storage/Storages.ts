/*******************************************************************************

    The superclass of storages.

    This has a DB instance.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as sqlite from 'sqlite3';

export class Storages
{
    /**
     *  The instance of sqlite
     */
    protected db: sqlite.Database;

    /**
     * Constructor
     * @param filename Valid values are filenames,
     * ":memory:" for an anonymous in-memory database and
     * an empty string for an anonymous disk-based database
     */
    constructor (filename: string, callback: (err: Error | null) => void)
    {
        this.db = new sqlite.Database(filename,
            sqlite.OPEN_CREATE | sqlite.OPEN_READWRITE |
            sqlite.OPEN_SHAREDCACHE, (err: Error | null) =>
            {
                if (err != null)
                    callback(err);

                this.db.configure("busyTimeout", 1000);
                this.createTables((err: Error | null) => {
                    if (callback != null)
                        callback(err);
                });
            });
    }

    /**
     * Creates tables.
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public createTables (callback: (err: Error | null) => void)
    {
    }

    /**
     * Close the database
     */
    public close ()
    {
        this.db.close();
    }

    /**
     * SQLite transaction statement
     * To start a transaction explicitly,
     * Open a transaction by issuing the begin function
     * the transaction is open until it is explicitly
     * committed or rolled back.
     */
    protected begin (): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.db.run('BEGIN', (err: Error | null) =>
            {
                if (err == null)
                    resolve();
                else
                    reject(err);
            });
        });
    }
    
    /**
     * SQLite transaction statement
     * Commit the changes to the database by using this.
     */
    protected commit (): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.db.run('COMMIT', (err: Error | null) =>
            {
                if (err == null)
                    resolve();
                else
                    reject(err);
            });
        });
    }

    /**
     * SQLite transaction statement
     * If it do not want to save the changes,
     * it can roll back using this.
     */
    protected rollback (): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.db.run('ROLLBACK', (err: Error | null) =>
            {
                if (err == null)
                    resolve();
                else
                    reject(err);
            });
        });
    }
}
