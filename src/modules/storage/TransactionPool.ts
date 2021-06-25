/*******************************************************************************

    Contains a transaction pool that is serializable to disk,
    using MySQL as a store.
    It was added to remove double-spending transactions that use the same input.

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Endian, Hash, hashFull, Transaction } from "boa-sdk-ts";
import { SmartBuffer } from "smart-buffer";

import * as mysql from "mysql2";

/**
 * It was added to remove double-spending transactions that use the same input.
 */
export class TransactionPool {
    /**
     * Keeps track of which TXs spend which inputs
     */
    private spenders: Map<string, Set<string>>;

    /**
     * Constructor
     */
    constructor() {
        this.spenders = new Map<string, Set<string>>();
    }

    /**
     * Add a transaction to the pool
     * @param connection MySQL connection
     * @param tx the transaction to add
     */
    public async add(connection: mysql.Connection, tx: Transaction) {
        this.updateSpenderList(tx);

        let buffer = new SmartBuffer();
        tx.serialize(buffer);

        let tx_hash = hashFull(tx);
        await this.query(connection, "INSERT INTO tx_pool (`key`, `val`) VALUES (?, ?);", [
            tx_hash.toBinary(Endian.Little),
            buffer.toBuffer(),
        ]);
    }

    /**
     * Remove the transaction with the given key from the pool
     * @param connection MySQL connection
     * @param key the transaction to remove
     * @param rm_double_spent  remove the TXs that use the same inputs
     */
    public async remove(connection: mysql.Connection, key: Transaction | Hash, rm_double_spent: boolean = true) {
        if (key instanceof Transaction) {
            let tx_hash = hashFull(key);
            let tx_hash_data = tx_hash.toBinary(Endian.Little);
            await this.query(
                connection,
                `
                DELETE FROM tx_pool WHERE \`key\` = ?;
                DELETE FROM transaction_pool WHERE tx_hash = ?;
                DELETE FROM tx_input_pool WHERE tx_hash = ?;
                DELETE FROM tx_output_pool WHERE tx_hash = ?;`,
                [tx_hash_data, tx_hash_data, tx_hash_data, tx_hash_data]
            );

            if (rm_double_spent) {
                let inv_txs = new Set<string>();
                this.gatherDoubleSpentTXs(key, inv_txs);
                for (const input of key.inputs) this.spenders.delete(hashFull(input).toString());
                for (const inv_tx_hash_string of inv_txs)
                    await this.remove(connection, new Hash(inv_tx_hash_string), false);
            } else {
                let tx_hash_string = tx_hash.toString();
                for (const input of key.inputs) {
                    let in_hash_string = hashFull(input).toString();
                    let set = this.spenders.get(in_hash_string);
                    if (set !== undefined && set.has(tx_hash_string)) set.delete(tx_hash_string);
                }
            }
        } else {
            let rows = await this.query(connection, `SELECT \`val\` FROM tx_pool WHERE \`key\` = ?;`, [
                key.toBinary(Endian.Little),
            ]);
            if (rows.length !== 0) {
                let tx = Transaction.deserialize(SmartBuffer.fromBuffer(rows[0].val));
                await this.remove(connection, tx, rm_double_spent);
            }
        }
    }

    /**
     * Load transactions and make the spender list
     * @param connection MySQL connection
     */
    public async loadSpenderList(connection: mysql.Connection) {
        this.spenders.clear();
        let rows = await this.query(connection, "SELECT `key`, `val` FROM tx_pool;", []);
        for (let row of rows) {
            let tx = Transaction.deserialize(SmartBuffer.fromBuffer(row.tx));
            await this.updateSpenderList(tx);
        }
    }

    /**
     * Add the given TX to `spenders` list
     * @param tx the transaction to add
     */
    public updateSpenderList(tx: Transaction) {
        let tx_hash_string = hashFull(tx).toString();

        // insert each input information of the transaction
        for (const input of tx.inputs) {
            const in_hash_string = hashFull(input).toString();

            // Update the spenders list
            let set = this.spenders.get(in_hash_string);
            if (set === undefined) {
                set = new Set<string>();
                this.spenders.set(in_hash_string, set);
            }
            set.add(tx_hash_string);
        }
    }

    /**
     * Gather TXs that share inputs with the given TX
     * @param tx a transaction
     * @param double_spent_txs container to write the double-spend TXs
     * @return true if double-spend TXs where found, false otherwise
     */
    public gatherDoubleSpentTXs(tx: Transaction, double_spent_txs: Set<string>): boolean {
        double_spent_txs.clear();

        const tx_hash_string = hashFull(tx).toString();
        for (const input of tx.inputs) {
            const in_hash_string = hashFull(input).toString();
            let set = this.spenders.get(in_hash_string);
            if (set !== undefined) {
                for (let spender of set) if (spender != tx_hash_string) double_spent_txs.add(spender);
            }
        }

        return double_spent_txs.size > 0;
    }

    /**
     * Return the number of transactions in the pool
     * @param connection MySQL connection
     */
    public getLength(connection: mysql.Connection): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.query(connection, `SELECT count(*) as value FROM tx_pool;`, [])
                .then((rows: any[]) => {
                    if (rows.length > 0 && rows[0].value !== undefined) {
                        resolve(rows[0].value);
                    } else {
                        resolve(0);
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Execute SQL to query the database for data.
     * @param connection MySQL connection
     * @param sql The SQL query to run.
     * @param params When the SQL statement contains placeholders,
     * you can pass them in here.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    protected query(connection: mysql.Connection, sql: string, params: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            connection.query(sql, params, (err: Error | null, rows: any) => {
                if (!err) resolve(rows);
                else reject(err);
            });
        });
    }
}
