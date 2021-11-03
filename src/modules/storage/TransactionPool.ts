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
import { LedgerStorage } from "./LedgerStorage";

/**
 * It was added to remove double-spending transactions that use the same input.
 */
export class TransactionPool {
    /**
     * Keeps track of which TXs spend which inputs
     */
    private spenders: Map<string, Set<string>>;

    /**
     * The instance of LedgerStorage
     */
    private storage: LedgerStorage;

    /**
     * Constructor
     */
    constructor(storage: LedgerStorage) {
        this.spenders = new Map<string, Set<string>>();
        this.storage = storage;
    }

    /**
     * Add a transaction to the pool
     * @param conn MySQL connection
     * @param tx the transaction to add
     */
    public async add(conn: mysql.PoolConnection, tx: Transaction) {
        this.updateSpenderList(tx);

        const buffer = new SmartBuffer();
        tx.serialize(buffer);

        const tx_hash = hashFull(tx);
        await this.storage.query(
            "INSERT INTO tx_pool (`key`, `val`) VALUES (?, ?);",
            [tx_hash.toBinary(Endian.Little), buffer.toBuffer()],
            conn
        );
    }

    /**
     * Remove the transaction with the given key from the pool
     * @param connection MySQL pool connection
     * @param key the transaction to remove
     * @param rm_double_spent  remove the TXs that use the same utxo
     */
    public async remove(conn: mysql.PoolConnection, key: Transaction | Hash, rm_double_spent: boolean = true) {
        if (key instanceof Transaction) {
            const tx_hash = hashFull(key);
            const tx_hash_data = tx_hash.toBinary(Endian.Little);
            await this.storage.query(
                `
                DELETE FROM tx_pool WHERE \`key\` = ?;
                DELETE FROM transaction_pool WHERE tx_hash = ?;
                DELETE FROM tx_input_pool WHERE tx_hash = ?;
                DELETE FROM tx_output_pool WHERE tx_hash = ?;`,
                [tx_hash_data, tx_hash_data, tx_hash_data, tx_hash_data],
                conn
            );

            if (rm_double_spent) {
                const inv_txs = new Set<string>();
                this.gatherDoubleSpentTXs(key, inv_txs);
                for (const input of key.inputs) this.spenders.delete(input.utxo.toString());
                for (const inv_tx_hash_string of inv_txs) await this.remove(conn, new Hash(inv_tx_hash_string), false);
            } else {
                const tx_hash_string = tx_hash.toString();
                for (const input of key.inputs) {
                    const utxo_string = input.utxo.toString();
                    const set = this.spenders.get(utxo_string);
                    if (set !== undefined && set.has(tx_hash_string)) set.delete(tx_hash_string);
                }
            }
        } else {
            const rows = await this.storage.query(
                `SELECT \`val\` FROM tx_pool WHERE \`key\` = ?;`,
                [key.toBinary(Endian.Little)],
                conn
            );
            if (rows.length !== 0) {
                const tx = Transaction.deserialize(SmartBuffer.fromBuffer(rows[0].val));
                await this.remove(conn, tx, rm_double_spent);
            }
        }
    }

    /**
     * Load transactions and make the spender list
     */
    public async loadSpenderList() {
        this.spenders.clear();
        const rows = await this.storage.query("SELECT `key`, `val` FROM tx_pool;", []);
        for (const row of rows) {
            const tx = Transaction.deserialize(SmartBuffer.fromBuffer(row.val));
            await this.updateSpenderList(tx);
        }
    }

    /**
     * Add the given TX to `spenders` list
     * @param tx the transaction to add
     */
    public updateSpenderList(tx: Transaction) {
        const tx_hash_string = hashFull(tx).toString();

        // insert each input information of the transaction
        for (const input of tx.inputs) {
            const utxo_string = input.utxo.toString();

            // Update the spenders list
            let set = this.spenders.get(utxo_string);
            if (set === undefined) {
                set = new Set<string>();
                this.spenders.set(utxo_string, set);
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
            const utxo_string = input.utxo.toString();
            const set = this.spenders.get(utxo_string);
            if (set !== undefined) {
                for (const spender of set) if (spender !== tx_hash_string) double_spent_txs.add(spender);
            }
        }

        return double_spent_txs.size > 0;
    }

    /**
     * Return the number of transactions in the pool
     * @param connection MySQL connection
     */
    public getLength(conn: mysql.PoolConnection): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.storage
                .query(`SELECT count(*) as value FROM tx_pool;`, [], conn)
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
}
