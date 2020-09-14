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
     * @param callback If provided, this function will be called when
     * the database was opened successfully or when an error occurred.
     * The first argument is an error object. If there is no error, this value is null.
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
                this.createTables()
                    .then(() =>
                    {
                        if (callback != null)
                            callback(null);
                    })
                    .catch((err) => {
                        if (callback != null)
                            callback(err);
                    });
            });
    }

    /**
     * Creates tables.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public createTables (): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            resolve();
        });
    }

    /**
     * Close the database
     */
    public close ()
    {
        this.db.close();
    }

    /**
     * Execute SQL to query the database for data.
     * @param sql The SQL query to run.
     * @param params When the SQL statement contains placeholders,
     * you can pass them in here.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    protected query (sql: string, params: any): Promise<any[]>
    {
        return new Promise<any[]>((resolve, reject) =>
        {
            this.db.all(sql, params, (err: Error | null, rows: any[]) =>
            {
                if (!err)
                    resolve(rows);
                else
                    reject(err);
            });
        });
    }

    /**
     * Execute SQL to enter data into the database.
     * @param sql The SQL query to run.
     * @param params When the SQL statement contains placeholders,
     * you can pass them in here.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the result
     * and if an error occurs the `.catch` is called with an error.
     */
    protected run (sql: string, params: any): Promise<sqlite.RunResult>
    {
        return new Promise<sqlite.RunResult>((resolve, reject) =>
        {
            this.db.run(sql, params, (err: Error | null, result: sqlite.RunResult) =>
            {
                if (!err)
                    resolve(result);
                else
                    reject(err);
            });
        });
    }

    /**
     * Executes the SQL query
     * @param sql The SQL query to run.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    protected exec (sql: string): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.db.exec(sql, (err: Error | null) =>
            {
                if (!err)
                    resolve();
                else
                    reject(err);
            });
        });
    }

    /**
     * SQLite transaction statement
     * To start a transaction explicitly,
     * Open a transaction by issuing the begin function
     * the transaction is open until it is explicitly
     * committed or rolled back.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
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
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
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
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
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
