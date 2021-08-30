/*******************************************************************************

    The superclass of storages.

    This has a DB instance.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as mysql from "mysql2";
import { IDatabaseConfig } from "../common/Config";
import { logger, Logger } from "../common/Logger";
import { Operation } from "../common/LogOperation";

export class Storages {
    /**
     *  The instance of mysql Connection Pool.
     */
    protected pool: mysql.Pool;

    /**
     * Constructor
     * @param databaseConfig Valid value is of type IDatabaseConfig,
     * @param callback If provided, this function will be called when
     * the database was opened successfully or when an error occurred.
     * The first argument is an error object. If there is no error, this value is null.
     */
    constructor(databaseConfig: IDatabaseConfig, callback: (err: Error | null) => void) {
        const dbconfig: IDatabaseConfig = {
            host: databaseConfig.host,
            user: databaseConfig.user,
            password: databaseConfig.password,
            multipleStatements: databaseConfig.multipleStatements,
            port: Number(databaseConfig.port),
            waitForConnections: databaseConfig.waitForConnections,
            connectionLimit: Number(databaseConfig.connectionLimit),
            queueLimit: Number(databaseConfig.queueLimit),
        };
        this.pool = mysql.createPool(dbconfig);

        this.query(`CREATE DATABASE IF NOT EXISTS \`${databaseConfig.database}\`;`, [])
            .then(async (result) => {
                await this.query(`SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,"ONLY_FULL_GROUP_BY",""));`, []);
                dbconfig.database = databaseConfig.database;
                this.pool = mysql.createPool(dbconfig);
                this.createTables()
                    .then(() => {
                        if (callback != null) callback(null);
                    })
                    .catch((err: any) => {
                        if (callback != null) callback(err);
                    });
            })
            .catch((err) => {
                if (callback != null) callback(err);
            });
    }

    /**
     * Returns the DB connection of the Connection Pool.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */

    public getConnection(): Promise<mysql.PoolConnection> {
        return new Promise<mysql.PoolConnection>((resolve, reject) => {
            this.pool.getConnection((err, conn) => {
                if (!err) resolve(conn);
                else reject(err);
            });
        });
    }

    /**
     * The main thread waits until the database is accessed.
     * The maximum waiting time is about 50 seconds.
     * @param databaseConfig Valid value is of type IDatabaseConfig,
     */
    public static waiteForConnection(databaseConfig: IDatabaseConfig) {
        const connection_config: mysql.ConnectionOptions = {
            host: databaseConfig.host,
            user: databaseConfig.user,
            password: databaseConfig.password,
            multipleStatements: databaseConfig.multipleStatements,
            port: Number(databaseConfig.port),
        };

        return new Promise<void>((resolve) => {
            let try_count = 0;
            const check_connection = () => {
                try_count++;
                const connection = mysql.createConnection(connection_config);
                connection.connect(function (err) {
                    if (!err) {
                        return resolve();
                    } else {
                        if (try_count < 10) {
                            setTimeout(() => {
                                check_connection();
                            }, 5000);
                        } else {
                            return resolve();
                        }
                    }
                });
            };
            check_connection();
        });
    }

    /**
     * Creates tables.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public createTables(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            resolve();
        });
    }

    /**
     * Close the database
     */
    public close() {
        this.pool.end();
    }

    /**
     * Execute SQL to query the database for data.
     * @param sql The SQL query to run.
     * @param params When the SQL statement contains placeholders,
     * you can pass them in here.
     * @param conn Use this if it are providing a db connection.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public query(sql: string, params: any, conn?: mysql.PoolConnection): Promise<any[]> {
        return new Promise<any[]>(async (resolve, reject) => {
            let connection: mysql.PoolConnection;
            try {
                if (!conn) connection = await this.getConnection();
                else connection = conn;
            } catch (err) {
                return reject(err);
            }
            connection.query(sql, params, (err: Error | null, rows: any[]) => {
                if (!conn) connection.release();
                if (!err) resolve(rows);
                else reject(err);
            });
        });
    }

    /**
     * Executes the SQL query
     * @param sql The SQL query to run.
     * @param conn Use this if it are providing a db connection.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    protected exec(sql: string, conn?: mysql.PoolConnection): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            let connection: mysql.PoolConnection;
            try {
                if (!conn) connection = await this.getConnection();
                else connection = conn;
            } catch (err) {
                return reject(err);
            }
            connection.query(sql, (err: Error | null, rows: any[]) => {
                if (!conn) connection.release();
                if (!err) resolve();
                else reject(err);
            });
        });
    }

    /**
     * Mysql transaction statement
     * To start a transaction explicitly,
     * Open a transaction by issuing the begin function
     * the transaction is open until it is explicitly
     * committed or rolled back.
     * @param conn Use this if it are providing a db connection
     * Connection must be released after transaction end.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    protected begin(conn: mysql.PoolConnection): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            conn.beginTransaction((err: Error | null) => {
                if (err == null) resolve();
                else reject(err);
            });
        });
    }

    /**
     * Mysql transaction statement
     * Commit the changes to the database by using this.
     * @param conn Use this if it are providing a db connection
     * Connection must be released after transaction end.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    protected commit(conn: mysql.PoolConnection): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            conn.commit((err: Error | null) => {
                if (err == null) resolve();
                else reject(err);
            });
        });
    }

    /**
     * Mysql transaction statement
     * If it do not want to save the changes,
     * it can roll back using this.
     * @param conn Use this if it are providing a db connection
     * Connection must be released after transaction end.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    protected rollback(conn: mysql.PoolConnection): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            conn.rollback(() => {
                resolve();
            });
        });
    }
}
