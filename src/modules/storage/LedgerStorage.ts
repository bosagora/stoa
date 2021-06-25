/*******************************************************************************

    The class that creates, inserts and reads the ledger into the database.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    Block,
    Endian,
    Enrollment,
    Hash,
    hashFull,
    Height,
    Lock,
    makeUTXOKey,
    OutputType,
    PreImageInfo,
    PublicKey,
    Transaction,
    TxInput,
    TxOutput,
    TxPayloadFee,
    Unlock,
    Utils,
} from "boa-sdk-ts";
import { IMarketCap } from "../../Types";
import { IDatabaseConfig } from "../common/Config";
import { FeeManager } from "../common/FeeManager";
import { logger } from "../common/Logger";
import { Storages } from "./Storages";
import { TransactionPool } from "./TransactionPool";

import JSBI from "jsbi";

/**
 * The class that inserts and reads the ledger into the database.
 */
export class LedgerStorage extends Storages {
    /**
     * The genesis timestamp
     */
    private genesis_timestamp: number;

    /**
     * The pool of transactions to manage double-spent transactions.
     */
    private _transaction_pool: TransactionPool | null = null;

    /**
     * Construct an instance of `LedgerStorage`, exposes callback API.
     */
    constructor(databaseConfig: IDatabaseConfig, genesis_timestamp: number, callback: (err: Error | null) => void) {
        super(databaseConfig, callback);
        this.genesis_timestamp = genesis_timestamp;
    }

    /**
     * Construct an instance of `LedgerStorage` using `Promise` API.
     */
    public static make(databaseConfig: IDatabaseConfig, genesis_timestamp: number): Promise<LedgerStorage> {
        return new Promise<LedgerStorage>((resolve, reject) => {
            let result = new LedgerStorage(databaseConfig, genesis_timestamp, async (err: Error | null) => {
                if (err) reject(err);
                else {
                    result._transaction_pool = new TransactionPool();
                    await result.transaction_pool.loadSpenderList(result.connection);
                    resolve(result);
                }
            });
            return result;
        });
    }

    /**
     * Returns the instance of TransactionPool
     * @returns If `_transaction_pool` is not null, return `_transaction_pool`.
     * Otherwise, terminate the process.
     */
    public get transaction_pool(): TransactionPool {
        if (this._transaction_pool !== null) return this._transaction_pool;
        else {
            logger.error("TransactionPool is not ready yet.");
            process.exit(1);
        }
    }

    /**
     * Creates tables related to the ledger.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public createTables(): Promise<void> {
        let sql = `CREATE TABLE IF NOT EXISTS blocks
        (
            height              INTEGER  NOT NULL,
            hash                TINYBLOB NOT NULL,
            prev_block          TINYBLOB NOT NULL,
            validators          TEXT     NOT NULL,
            merkle_root         TINYBLOB NOT NULL,
            signature           TINYBLOB NOT NULL,
            random_seed         TINYBLOB NOT NULL,
            missing_validators  TEXT     NULL,
            tx_count            INTEGER  NOT NULL,
            enrollment_count    INTEGER  NOT NULL,
            time_offset         INTEGER  NOT NULL,
            time_stamp          INTEGER  NOT NULL,
            PRIMARY KEY(height)
        );

        CREATE TABLE IF NOT EXISTS enrollments
        (
            block_height        INTEGER  NOT NULL,
            enrollment_index    INTEGER  NOT NULL,
            utxo_key            TINYBLOB NOT NULL,
            commitment          TINYBLOB NOT NULL,
            cycle_length        INTEGER  NOT NULL,
            enroll_sig          TINYBLOB NOT NULL,
            PRIMARY KEY(block_height, enrollment_index)
        );

        CREATE TABLE IF NOT EXISTS transactions
        (
            block_height        INTEGER  NOT NULL,
            tx_index            INTEGER  NOT NULL,
            tx_hash             TINYBLOB NOT NULL,
            type                INTEGER  NOT NULL,
            unlock_height       INTEGER  NOT NULL,
            lock_height         INTEGER  NOT NULL,
            tx_fee              INTEGER  NOT NULL,
            payload_fee         INTEGER  NOT NULL,
            tx_size             INTEGER  NOT NULL,
            calculated_tx_fee   INTEGER  NOT NULL,
            inputs_count        INTEGER  NOT NULL,
            outputs_count       INTEGER  NOT NULL,
            payload_size        INTEGER  NOT NULL,
            PRIMARY KEY(block_height, tx_index)
        );

        CREATE TABLE IF NOT EXISTS tx_inputs
        (
            block_height        INTEGER  NOT NULL,
            tx_index            INTEGER  NOT NULL,
            in_index            INTEGER  NOT NULL,
            tx_hash             TINYBLOB NOT NULL,
            utxo                TINYBLOB NOT NULL,
            unlock_bytes        TINYBLOB NOT NULL,
            unlock_age          INTEGER  NOT NULL,
            PRIMARY KEY(block_height, tx_index, in_index, utxo(64))
        );

        CREATE TABLE IF NOT EXISTS tx_outputs
        (
            block_height        INTEGER     NOT NULL,
            tx_index            INTEGER     NOT NULL,
            output_index        INTEGER     NOT NULL,
            tx_hash             TINYBLOB    NOT NULL,
            utxo_key            TINYBLOB    NOT NULL,
            type                INTEGER     NOT NULL,
            amount              BIGINT(20)  UNSIGNED NOT NULL,
            lock_type           INTEGER NOT NULL,
            lock_bytes          TINYBLOB    NOT NULL,
            address             TEXT        NOT NULL,
            PRIMARY KEY(block_height, tx_index, output_index)
        );

        CREATE TABLE IF NOT EXISTS utxos
        (
            utxo_key            TINYBLOB    NOT NULL,
            tx_hash             TINYBLOB    NOT NULL,
            type                INTEGER     NOT NULL,
            unlock_height       INTEGER     NOT NULL,
            amount              BIGINT(20)  UNSIGNED NOT NULL,
            lock_type           INTEGER     NOT NULL,
            lock_bytes          TINYBLOB    NOT NULL,
            address             TEXT        NOT NULL,
            PRIMARY KEY(utxo_key(64))
        );

        CREATE TABLE IF NOT EXISTS validators
        (
            enrolled_at         INTEGER     NOT NULL,
            utxo_key            TINYBLOB    NOT NULL,
            address             TEXT        NOT NULL,
            amount              BIGINT(20)  UNSIGNED NOT NULL,
            preimage_height     INTEGER      NOT NULL,
            preimage_hash       TINYBLOB    NOT NULL,
            PRIMARY KEY(enrolled_at, utxo_key(64))
        );

        CREATE TABLE IF NOT EXISTS payloads (
            tx_hash             TINYBLOB    NOT NULL,
            payload             BLOB        NOT NULL,
            PRIMARY KEY(tx_hash(64))
        );

        CREATE TABLE IF NOT EXISTS merkle_trees
        (
            block_height        INTEGER     NOT NULL,
            merkle_index        INTEGER     NOT NULL,
            merkle_hash         TINYBLOB    NOT NULL,
            PRIMARY KEY(block_height, merkle_index)
        );

        CREATE TABLE IF NOT EXISTS information
        (
            keyname             TEXT       NOT NULL,
            value               TEXT       NOT NULL,
            PRIMARY KEY(keyname(64))
        );

        CREATE TABLE IF NOT EXISTS transaction_pool (
            tx_hash             TINYBLOB   NOT NULL,
            type                INTEGER    NOT NULL,
            payload             BLOB   NOT NULL,
            lock_height         INTEGER    NOT NULL,
            received_height     INTEGER    NOT NULL,
            time                INTEGER    NOT NULL,
            tx_fee              INTEGER    NOT NULL,
            payload_fee         INTEGER    NOT NULL,
            tx_size             INTEGER    NOT NULL,
            PRIMARY KEY(tx_hash(64))
        );

        CREATE TABLE IF NOT EXISTS tx_input_pool (
            tx_hash             TINYBLOB   NOT NULL,
            input_index         INTEGER    NOT NULL,
            utxo                TINYBLOB   NOT NULL,
            unlock_bytes        TINYBLOB   NOT NULL,
            unlock_age          INTEGER    NOT NULL,
            PRIMARY KEY(tx_hash(64), input_index)
        );

        CREATE TABLE IF NOT EXISTS tx_output_pool (
            tx_hash             TINYBLOB   NOT NULL,
            output_index        INTEGER    NOT NULL,
            type                INTEGER    NOT NULL,
            amount              BIGINT(20) UNSIGNED NOT NULL,
            lock_type           INTEGER    NOT NULL,
            lock_bytes          TINYBLOB   NOT NULL,
            address             TEXT       NOT NULL,
            PRIMARY KEY(tx_hash(64), output_index)
        );

       CREATE TABLE IF NOT EXISTS blocks_stats(
            block_height        INTEGER,
            total_sent          BIGINT(20)  UNSIGNED NOT NULL,
            total_received      BIGINT(20)  UNSIGNED NOT NULL,
            total_reward        BIGINT(20)  UNSIGNED NOT NULL,
            total_fee           BIGINT(20)  NOT NULL,
            total_size          BIGINT(20)  UNSIGNED NOT NULL,
            PRIMARY KEY(block_height)
        );

        CREATE TABLE IF NOT EXISTS marketcap (
            last_updated_at INTEGER NOT NULL,
            price           DECIMAL(14,6)  NOT NULL,
            market_cap      BIGINT(20) UNSIGNED NOT NULL,
            vol_24h         BIGINT(20) UNSIGNED NOT NULL,
            change_24h      BIGINT(20),
            PRIMARY KEY (last_updated_at)
        );

        CREATE TABLE IF NOT EXISTS fee_mean_disparity (
            height      INTEGER    NOT NULL,
            disparity   INTEGER    NOT NULL,
            PRIMARY KEY (height)
        );

        CREATE TABLE IF NOT EXISTS tx_pool
        (
            \`key\`     TINYBLOB    NOT NULL,
            \`val\`     BLOB        NOT NULL,
            PRIMARY KEY(\`key\`(64))
        );

       DROP TRIGGER IF EXISTS tx_trigger;
       CREATE TRIGGER tx_trigger AFTER INSERT
       ON transactions
       FOR EACH ROW
        BEGIN
            DELETE FROM transaction_pool WHERE tx_hash = NEW.tx_hash;
            DELETE FROM tx_input_pool WHERE tx_hash = NEW.tx_hash;
            DELETE FROM tx_output_pool WHERE tx_hash = NEW.tx_hash;
        END;
        `;

        return this.exec(sql);
    }

    /**
     * Puts a block to database
     * @param block a block data
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putBlocks(block: Block): Promise<void> {
        let genesis_timestamp: number = this.genesis_timestamp;

        function saveBlock(storage: LedgerStorage, block: Block, genesis_timestamp: number): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                let block_hash = hashFull(block.header);
                storage
                    .query(
                        `INSERT INTO blocks
                        (height, hash, prev_block, validators, merkle_root, signature,
                         random_seed, missing_validators, tx_count, enrollment_count, time_offset, time_stamp)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            block.header.height.toString(),
                            block_hash.toBinary(Endian.Little),
                            block.header.prev_block.toBinary(Endian.Little),
                            JSON.stringify(block.header.validators.storage),
                            block.header.merkle_root.toBinary(Endian.Little),
                            block.header.signature.toBinary(Endian.Little),
                            block.header.random_seed.toBinary(Endian.Little),
                            block.header.missing_validators.toString(),
                            block.txs.length,
                            block.header.enrollments.length,
                            block.header.time_offset,
                            block.header.time_offset + genesis_timestamp,
                        ]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        return new Promise<void>((resolve, reject) => {
            (async () => {
                try {
                    await this.begin();
                    for (let tx of block.txs) await this.transaction_pool.remove(this.connection, tx);
                    await saveBlock(this, block, genesis_timestamp);
                    await this.putTransactions(block);
                    await this.putEnrollments(block);
                    await this.putBlockHeight(block.header.height);
                    await this.putMerkleTree(block);
                    await this.putBlockstats(block);
                    await this.putFeeDisparity(block);
                    await this.commit();
                } catch (error) {
                    await this.rollback();
                    reject(error);
                    return;
                }
                resolve();
            })();
        });
    }

    /**
     * Gets a block data
     * @param height the height of the block to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getBlock(height: Height): Promise<any[]> {
        let sql = `SELECT
            height, hash, prev_block, validators, merkle_root, signature, random_seed,
            missing_validators,  tx_count, enrollment_count, time_offset, time_stamp
        FROM
            blocks
        WHERE height = ?`;
        return this.query(sql, [height.toString()]);
    }

    /**
     * Get the highest block height in this Stoa DB
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public getBlockHeight(): Promise<Height | null> {
        return new Promise<Height | null>((resolve, reject) => {
            let sql = `SELECT MAX(height) as height FROM blocks`;
            this.query(sql, [])
                .then((row: any[]) => {
                    if (row[0].height !== null) resolve(new Height(JSBI.BigInt(row[0].height)));
                    else resolve(null);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Puts all enrollments
     * @param block: The instance of the `Block`
     */
    public putEnrollments(block: Block): Promise<void> {
        function save_enrollment(
            storage: LedgerStorage,
            height: Height,
            enroll_idx: number,
            enroll: Enrollment
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO enrollments
                        (block_height, enrollment_index, utxo_key, commitment, cycle_length, enroll_sig)
                    VALUES
                        (?, ?, ?, ?, ?, ?)`,
                        [
                            height.toString(),
                            enroll_idx,
                            enroll.utxo_key.toBinary(Endian.Little),
                            enroll.commitment.toBinary(Endian.Little),
                            enroll.cycle_length,
                            enroll.enroll_sig.toSignature().toBinary(Endian.Little),
                        ]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function save_validator(storage: LedgerStorage, height: Height, enroll: Enrollment): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .run(
                        `INSERT INTO validators
                        (enrolled_at, utxo_key, address, amount, preimage_height, preimage_hash)
                    SELECT ?, utxo_key, address, amount, ?, ?
                        FROM tx_outputs
                    WHERE
                        tx_outputs.utxo_key = ?`,
                        [
                            height.toString(),
                            0,
                            enroll.commitment.toBinary(Endian.Little),
                            enroll.utxo_key.toBinary(Endian.Little),
                        ]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        return new Promise<void>((resolve, reject) => {
            (async () => {
                for (let enroll_idx = 0; enroll_idx < block.header.enrollments.length; enroll_idx++) {
                    try {
                        await save_enrollment(
                            this,
                            block.header.height,
                            enroll_idx,
                            block.header.enrollments[enroll_idx]
                        );
                        await save_validator(this, block.header.height, block.header.enrollments[enroll_idx]);
                    } catch (err) {
                        reject(err);
                        return;
                    }
                }
                resolve();
            })();
        });
    }

    /**
     * Gets a Merkle tree
     * @param height the height of the block to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getMerkleTree(height: Height): Promise<any[]> {
        let sql = `SELECT
                block_height, merkle_index, merkle_hash
             FROM
                merkle_trees
             WHERE block_height = ?
             ORDER BY merkle_index ASC`;
        return this.query(sql, [height.toString()]);
    }

    /**
     * Puts merkle tree
     * @param block: The instance of the `Block`
     */
    public putMerkleTree(block: Block): Promise<void> {
        function save_merkle(
            storage: LedgerStorage,
            height: Height,
            merkle_index: number,
            merkle_hash: Hash
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO merkle_trees
                        (block_height, merkle_index, merkle_hash)
                    VALUES
                        (?, ?, ?)`,
                        [height.toString(), merkle_index, merkle_hash.toBinary(Endian.Little)]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        return new Promise<void>((resolve, reject) => {
            (async () => {
                for (let merkle_index = 0; merkle_index < block.merkle_tree.length; merkle_index++) {
                    try {
                        await save_merkle(this, block.header.height, merkle_index, block.merkle_tree[merkle_index]);
                    } catch (err) {
                        reject(err);
                        return;
                    }
                }
                resolve();
            })();
        });
    }

    /**
     * Puts merkle tree
     * @param block: The instance of the `Block`
     */
    public putBlockstats(block: Block): Promise<void> {
        function save_blockstats(
            storage: LedgerStorage,
            height: Height,
            total_sent: JSBI,
            total_received: JSBI,
            total_size: JSBI,
            total_fee: JSBI
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO blocks_stats
                        (block_height, total_sent, total_received, total_size, total_fee,total_reward)
                    VALUES
                        (?, ?, ?, ?, ?, ?)`,
                        [
                            height.toString(),
                            total_sent.toString(),
                            total_received.toString(),
                            total_size.toString(),
                            total_fee.toString(),
                            "0",
                        ]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        return new Promise<void>((resolve, reject) => {
            (async () => {
                let total_received = JSBI.BigInt(0);
                let total_sent = JSBI.BigInt(0);
                let total_fee = JSBI.BigInt(0);
                let total_size = JSBI.BigInt(0);
                let total_received_sql = `SELECT
                                                SUM(IFNULL(O.amount,0)) as total_received
                                                FROM
                                                tx_outputs O
                                                    INNER JOIN blocks B ON (O.block_height = B.height)
                                                WHERE
                                                    block_height = ?;`;
                let transaction_stats = `SELECT
                                                SUM(IFNULL(T.tx_fee,0)) as tx_fee,
                                            SUM(IFNULL(T.payload_fee,0)) as payload_fee, SUM(IFNULL(T.tx_size,0)) as total_size
                                            FROM
                                            transactions T
                                                Inner join blocks B ON (T.block_height = B.height)
                                            WHERE
                                                block_height =?;`;

                this.query(total_received_sql, [block.header.height.toString()])
                    .then(async (row: any) => {
                        total_received = JSBI.BigInt(row[0].total_received);
                        return this.query(transaction_stats, [block.header.height.toString()]);
                    })
                    .then((row: any) => {
                        total_fee = JSBI.ADD(JSBI.BigInt(row[0].tx_fee), JSBI.BigInt(row[0].payload_fee));
                        total_size = JSBI.BigInt(row[0].total_size);
                        total_sent = JSBI.ADD(total_received, total_fee);
                        save_blockstats(this, block.header.height, total_sent, total_received, total_size, total_fee);
                        resolve();
                    });
            })();
        });
    }

    /**
     * Puts the average of disparity from the calculated transaction fee.
     * @param block: The instance of the `Block`
     */
    public putFeeDisparity(block: Block): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const range = 100;
            const start = JSBI.subtract(block.header.height.value, JSBI.BigInt(range - 1));
            const end = block.header.height.value;
            const select_sql = `SELECT (tx_fee - calculated_tx_fee) as disparity
                FROM
                    transactions
                WHERE
                    inputs_count > 0
                    AND type != 2
                    AND block_height BETWEEN ? AND ?;`;
            this.query(select_sql, [start.toString(), end.toString()])
                .then((rows: any[]) => {
                    const insert_sql = `INSERT INTO fee_mean_disparity (height, disparity) VALUES (?, ?);`;
                    return this.query(insert_sql, [
                        end.toString(),
                        FeeManager.calculateTrimmedMeanDisparity(rows.map((m) => m.disparity)),
                    ]);
                })
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Gets the mean of disparity from the calculated transaction fee.
     */
    public getFeeMeanDisparity(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const sql = `SELECT disparity FROM fee_mean_disparity ORDER BY height DESC LIMIT 1;`;
            this.query(sql, [])
                .then((rows: any[]) => {
                    if (rows.length > 0) resolve(rows[0].disparity);
                    else resolve(0);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Update a preImage to database
     */
    public updatePreImage(pre_image: PreImageInfo): Promise<number> {
        let enroll_key = pre_image.utxo.toBinary(Endian.Little);
        return new Promise<number>((resolve, reject) => {
            this.run(
                `UPDATE validators
                    SET preimage_height = ?,
                        preimage_hash = ?
                    WHERE
                    EXISTS
                        (SELECT 1
                        FROM enrollments
                        WHERE enrollments.utxo_key = ?
                        ORDER BY block_height DESC
                        LIMIT 1)
                    AND validators.utxo_key = ?
                    AND validators.enrolled_at =
                        (SELECT block_height
                        FROM enrollments
                        WHERE enrollments.utxo_key = ?
                            AND ? < enrollments.cycle_length
                        ORDER BY block_height DESC
                        LIMIT 1)
                    AND ? > validators.preimage_height`,
                [
                    pre_image.height.toString(),
                    pre_image.hash.toBinary(Endian.Little),
                    enroll_key,
                    enroll_key,
                    enroll_key,
                    pre_image.height.toString(),
                    pre_image.height.toString(),
                ]
            )
                .then((result) => {
                    resolve(result.affectedRows);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
    /**
     * Store the CoinMarketcap data
     * @param data IMarketCap
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     *
     */
    public storeCoinMarket(data: IMarketCap): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            let sql = `INSERT IGNORE INTO marketcap (last_updated_at, price, market_cap, change_24h, vol_24h)
            VALUES (?, ?, ?, ?, ?)
            `;

            this.run(sql, [data.last_updated_at, data.price, data.market_cap, data.change_24h, data.vol_24h])
                .then((result: any) => {
                    resolve(result);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Get enrollments
     * @param height The height of the block
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getEnrollments(height: Height): Promise<any[]> {
        let sql = `SELECT
            block_height, enrollment_index, utxo_key, commitment, cycle_length, enroll_sig
        FROM
            enrollments
        WHERE block_height = ?`;
        return this.query(sql, [height.toString()]);
    }

    /**
     * Get validators
     * @param height The height of the block
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getValidators(height: Height): Promise<any[]> {
        let sql = `SELECT
            enrolled_at, utxo_key, address, amount, preimage_height, preimage_hash
        FROM
            validators
        WHERE enrolled_at = ?`;
        return this.query(sql, [height.toString()]);
    }

    public getTransactionFee(tx: Transaction): Promise<[JSBI, JSBI, JSBI]> {
        return new Promise<[JSBI, JSBI, JSBI]>((resolve, reject) => {
            if (tx.inputs.length == 0) {
                resolve([JSBI.BigInt(0), JSBI.BigInt(0), JSBI.BigInt(0)]);
                return;
            }

            let utxo = tx.inputs.map((m) => `x'${m.utxo.toBinary(Endian.Little).toString("hex")}'`);

            let sql = `SELECT
                    IFNULL(SUM(O.amount), 0) as sum_inputs
                FROM
                    utxos O
                WHERE
                    O.utxo_key in (${utxo.join(",")}); `;

            this.query(sql, [])
                .then((rows: any) => {
                    if (rows.length > 0) {
                        let SumOfInput = JSBI.BigInt(rows[0].sum_inputs);
                        let SumOfOutput = tx.outputs.reduce<JSBI>((sum, n) => {
                            return JSBI.add(sum, n.value);
                        }, JSBI.BigInt(0));

                        let total_fee: JSBI;
                        let payload_fee: JSBI;
                        let tx_fee: JSBI;

                        if (JSBI.equal(SumOfInput, JSBI.BigInt(0))) {
                            total_fee = JSBI.BigInt(0);
                            payload_fee = JSBI.BigInt(0);
                            tx_fee = JSBI.BigInt(0);
                        } else {
                            total_fee = JSBI.subtract(SumOfInput, SumOfOutput);
                            payload_fee = TxPayloadFee.getFee(tx.payload.length);
                            tx_fee = JSBI.subtract(total_fee, payload_fee);
                        }

                        resolve([total_fee, tx_fee, payload_fee]);
                    } else {
                        resolve([JSBI.BigInt(0), JSBI.BigInt(0), JSBI.BigInt(0)]);
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Puts all transactions
     * @param block: The instance of the `Block`
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putTransactions(block: Block): Promise<void> {
        function save_transaction(
            storage: LedgerStorage,
            height: Height,
            tx_idx: number,
            hash: Hash,
            tx: Transaction
        ): Promise<void> {
            return new Promise<void>(async (resolve, reject) => {
                let fees = await storage.getTransactionFee(tx);
                let tx_size = tx.getNumberOfBytes();
                let calculated_fee = FeeManager.getTxFee(tx_size, 0)[1];

                let unlock_height_query: string;
                if (tx.isPayment() && tx.inputs.length > 0) {
                    let utxo = tx.inputs.map((m) => `x'${m.utxo.toBinary(Endian.Little).toString("hex")}'`);

                    unlock_height_query = `(
                            SELECT '${JSBI.add(
                                height.value,
                                JSBI.BigInt(2016)
                            ).toString()}' AS unlock_height WHERE EXISTS
                            (
                                SELECT
                                    *
                                FROM
                                    tx_outputs AS a,
                                    transactions AS b
                                WHERE
                                    a.tx_hash = b.tx_hash
                                    and a.type = 1
                                    and a.utxo_key in (${utxo.join(",")})
                            )
                            UNION ALL
                            SELECT '${JSBI.add(height.value, JSBI.BigInt(1)).toString()}' AS unlock_height
                            LIMIT 1
                        )`;
                } else {
                    unlock_height_query = `( SELECT '${JSBI.add(
                        height.value,
                        JSBI.BigInt(1)
                    ).toString()}' AS unlock_height )`;
                }

                let tx_type: number;
                if (tx.isFreeze()) tx_type = OutputType.Freeze;
                else if (tx.isCoinbase()) tx_type = OutputType.Coinbase;
                else tx_type = OutputType.Payment;

                storage
                    .run(
                        `INSERT INTO transactions
                        (block_height, tx_index, tx_hash, type, unlock_height, lock_height, tx_fee, payload_fee, tx_size, calculated_tx_fee, inputs_count, outputs_count, payload_size)
                    VALUES
                        (?, ?, ?, ?, ${unlock_height_query}, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            height.toString(),
                            tx_idx,
                            hash.toBinary(Endian.Little),
                            tx_type,
                            tx.lock_height.toString(),
                            fees[1].toString(),
                            fees[2].toString(),
                            tx_size,
                            calculated_fee,
                            tx.inputs.length,
                            tx.outputs.length,
                            tx.payload.length,
                        ]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function save_input(
            storage: LedgerStorage,
            height: Height,
            tx_idx: number,
            in_idx: number,
            hash: Hash,
            input: TxInput
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .run(
                        `INSERT INTO tx_inputs
                        (block_height, tx_index, in_index, tx_hash, utxo, unlock_bytes, unlock_age)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            height.toString(),
                            tx_idx,
                            in_idx,
                            hash.toBinary(Endian.Little),
                            input.utxo.toBinary(Endian.Little),
                            input.unlock.bytes,
                            input.unlock_age,
                        ]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function delete_spend_output(storage: LedgerStorage, input: TxInput): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .run(`DELETE FROM utxos WHERE utxo_key = ?`, [input.utxo.toBinary(Endian.Little)])
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function save_output(
            storage: LedgerStorage,
            height: Height,
            tx_idx: number,
            out_idx: number,
            hash: Hash,
            utxo_key: Hash,
            output: TxOutput
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                let address: string = output.lock.type == 0 ? new PublicKey(output.lock.bytes).toString() : "";

                storage
                    .run(
                        `INSERT INTO tx_outputs
                        (block_height, tx_index, output_index, tx_hash, utxo_key, address, type, amount, lock_type, lock_bytes)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            height.toString(),
                            tx_idx,
                            out_idx,
                            hash.toBinary(Endian.Little),
                            utxo_key.toBinary(Endian.Little),
                            address,
                            output.type,
                            output.value.toString(),
                            output.lock.type,
                            output.lock.bytes,
                        ]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function is_melting(storage: LedgerStorage, tx: Transaction): Promise<boolean> {
            return new Promise<boolean>((resolve, reject) => {
                if (tx.isPayment() && tx.inputs.length > 0) {
                    let utxo = tx.inputs.map((m) => `x'${m.utxo.toBinary(Endian.Little).toString("hex")}'`);

                    let sql = `SELECT
                            count(*) as count
                        FROM
                            utxos O
                        WHERE
                            O.type = 1
                            AND O.utxo_key in (${utxo.join(",")})
                        `;

                    storage
                        .query(sql, [])
                        .then((rows: any[]) => {
                            resolve(rows[0].count > 0);
                        })
                        .catch((err) => {
                            reject(err);
                        });
                } else {
                    resolve(false);
                }
            });
        }

        function save_utxo(
            storage: LedgerStorage,
            melting: boolean,
            height: Height,
            tx: Transaction,
            out_idx: number,
            tx_hash: Hash,
            utxo_key: Hash,
            output: TxOutput
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                let address: string = output.lock.type == 0 ? new PublicKey(output.lock.bytes).toString() : "";

                let unlock_height: JSBI;
                if (melting && address != TxPayloadFee.CommonsBudgetAddress) {
                    unlock_height = JSBI.add(height.value, JSBI.BigInt(2016));
                } else {
                    unlock_height = JSBI.add(height.value, JSBI.BigInt(1));
                }

                storage
                    .run(
                        `INSERT INTO utxos
                        (
                            utxo_key,
                            tx_hash,
                            type,
                            unlock_height,
                            amount,
                            lock_type,
                            lock_bytes,
                            address
                        )
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            utxo_key.toBinary(Endian.Little),
                            tx_hash.toBinary(Endian.Little),
                            output.type,
                            unlock_height.toString(),
                            output.value.toString(),
                            output.lock.type,
                            output.lock.bytes,
                            address,
                        ]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function save_payload(storage: LedgerStorage, tx_hash: Hash, tx: Transaction): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                if (tx.payload.length == 0) resolve();

                storage
                    .run(
                        `INSERT INTO payloads
                        (tx_hash, payload)
                    VALUES
                        (?, ?)`,
                        [tx_hash.toBinary(Endian.Little), tx.payload]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        return new Promise<void>((resolve, reject) => {
            (async () => {
                try {
                    for (let tx_idx = 0; tx_idx < block.txs.length; tx_idx++) {
                        let melting = await is_melting(this, block.txs[tx_idx]);

                        await save_transaction(
                            this,
                            block.header.height,
                            tx_idx,
                            block.merkle_tree[tx_idx],
                            block.txs[tx_idx]
                        );

                        if (block.txs[tx_idx].payload.length > 0)
                            await save_payload(this, block.merkle_tree[tx_idx], block.txs[tx_idx]);

                        for (let in_idx = 0; in_idx < block.txs[tx_idx].inputs.length; in_idx++) {
                            await save_input(
                                this,
                                block.header.height,
                                tx_idx,
                                in_idx,
                                block.merkle_tree[tx_idx],
                                block.txs[tx_idx].inputs[in_idx]
                            );
                            await delete_spend_output(this, block.txs[tx_idx].inputs[in_idx]);
                        }

                        for (let out_idx = 0; out_idx < block.txs[tx_idx].outputs.length; out_idx++) {
                            let utxo_key = makeUTXOKey(block.merkle_tree[tx_idx], JSBI.BigInt(out_idx));
                            await save_output(
                                this,
                                block.header.height,
                                tx_idx,
                                out_idx,
                                block.merkle_tree[tx_idx],
                                utxo_key,
                                block.txs[tx_idx].outputs[out_idx]
                            );
                            await save_utxo(
                                this,
                                melting,
                                block.header.height,
                                block.txs[tx_idx],
                                out_idx,
                                block.merkle_tree[tx_idx],
                                utxo_key,
                                block.txs[tx_idx].outputs[out_idx]
                            );
                        }
                    }
                } catch (err) {
                    reject(err);
                    return;
                }
                resolve();
            })();
        });
    }

    /**
     * Put a transaction on transactionPool
     * @param tx: The instance of the `Transaction`
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putTransactionPool(tx: Transaction): Promise<number> {
        function save_transaction_pool(storage: LedgerStorage, tx: Transaction, hash: Hash): Promise<number> {
            return new Promise<number>(async (resolve, reject) => {
                let fees = await storage.getTransactionFee(tx);
                let tx_size = tx.getNumberOfBytes();

                let tx_type: number;
                if (tx.isFreeze()) tx_type = OutputType.Freeze;
                else if (tx.isCoinbase()) tx_type = OutputType.Coinbase;
                else tx_type = OutputType.Payment;

                storage
                    .run(
                        `INSERT INTO transaction_pool
                        (tx_hash, type, payload, lock_height, received_height, time, tx_fee, payload_fee, tx_size)
                    VALUES
                        (?, ?, ?, ?, (SELECT IFNULL(MAX(height), 0) as height FROM blocks), DATE_FORMAT(now(),'%s'), ?, ?, ?)`,
                        [
                            hash.toBinary(Endian.Little),
                            tx_type,
                            tx.payload,
                            tx.lock_height.toString(),
                            fees[1].toString(),
                            fees[2].toString(),
                            tx_size,
                        ]
                    )
                    .then((result) => {
                        resolve(result.affectedRows);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function save_input_pool(storage: LedgerStorage, hash: Hash, in_idx: number, input: TxInput): Promise<number> {
            return new Promise<number>((resolve, reject) => {
                storage
                    .run(
                        `INSERT INTO tx_input_pool
                        (tx_hash, input_index, utxo, unlock_bytes, unlock_age)
                    VALUES
                        (?, ?, ?, ?, ?)`,
                        [
                            hash.toBinary(Endian.Little),
                            in_idx,
                            input.utxo.toBinary(Endian.Little),
                            input.unlock.bytes,
                            input.unlock_age,
                        ]
                    )
                    .then((result) => {
                        resolve(result.affectedRows);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function save_output_pool(
            storage: LedgerStorage,
            hash: Hash,
            out_idx: number,
            output: TxOutput
        ): Promise<number> {
            return new Promise<number>((resolve, reject) => {
                let address: string = output.lock.type == 0 ? new PublicKey(output.lock.bytes).toString() : "";

                storage
                    .run(
                        `INSERT INTO tx_output_pool
                        (tx_hash, output_index, type, amount, address, lock_type, lock_bytes)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            hash.toBinary(Endian.Little),
                            out_idx,
                            output.type,
                            output.value.toString(),
                            address,
                            output.lock.type,
                            output.lock.bytes,
                        ]
                    )
                    .then((result) => {
                        resolve(result.affectedRows);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        return new Promise<number>((resolve, reject) => {
            (async () => {
                let tx_changes, in_changes, out_changes;
                try {
                    await this.begin();

                    // Remove pending transactions using the same input.
                    await this.transaction_pool.remove(this.connection, tx, true);
                    await this.transaction_pool.add(this.connection, tx);

                    let hash = hashFull(tx);
                    tx_changes = await save_transaction_pool(this, tx, hash);
                    if (tx_changes !== 1) throw new Error("Failed to save a transaction.");

                    for (let in_idx = 0; in_idx < tx.inputs.length; in_idx++) {
                        in_changes = await save_input_pool(this, hash, in_idx, tx.inputs[in_idx]);
                        if (in_changes !== 1) throw new Error("Failed to save a input on transactionPool.");
                    }

                    for (let out_idx = 0; out_idx < tx.outputs.length; out_idx++) {
                        out_changes = await save_output_pool(this, hash, out_idx, tx.outputs[out_idx]);
                        if (out_changes !== 1) throw new Error("Failed to save a output on transactionPool.");
                    }
                } catch (err) {
                    await this.rollback();
                    reject(err);
                    return;
                }

                await this.commit();
                resolve(tx_changes);
            })();
        });
    }

    /**
     * Gets a transaction data
     * @param height The height of the block to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTransactions(height: Height): Promise<any[]> {
        let sql = `SELECT
            block_height, tx_index, tx_hash, type, unlock_height, lock_height, inputs_count, outputs_count, payload_size
        FROM
            transactions
        WHERE block_height = ?`;
        return this.query(sql, [height.toString()]);
    }

    /**
     * Gets a transaction data payload
     * @param tx_hash The hash of the transaction to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getPayload(tx_hash: Hash): Promise<any[]> {
        let sql = `SELECT
                tx_hash, payload
            FROM
                payloads
            WHERE hex(tx_hash) = ?`;
        return this.query(sql, [tx_hash.toString().substring(2).toUpperCase()]);
    }

    /**
     * Gets a transaction inputs data
     * @param height The height of the block to get
     * @param tx_index The index of the transaction in the block
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTxInputs(height: Height, tx_index: number): Promise<any[]> {
        let sql = `SELECT
            block_height, tx_index, in_index, utxo, unlock_bytes, unlock_age
        FROM
            tx_inputs
        WHERE block_height = ? AND tx_index = ?`;
        return this.query(sql, [height.toString(), tx_index]);
    }

    /**
     * Gets a transaction outputs data
     * @param height The height of the block to get
     * @param tx_index The index of the transaction in the block
     */
    public getTxOutputs(height: Height, tx_index: number): Promise<any[]> {
        let sql = `SELECT
            block_height, tx_index, output_index, tx_hash, utxo_key, amount, lock_type, lock_bytes, address
        FROM
            tx_outputs
        WHERE block_height = ? AND tx_index = ?`;
        return this.query(sql, [height.toString(), tx_index]);
    }

    /**
     * Gets transaction pool data
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTransactionPool(): Promise<any[]> {
        let sql = `SELECT
            tx_hash, type, payload, lock_height, time
        FROM
            transaction_pool
        `;
        return this.query(sql, []);
    }

    /**
     * Get validators
     * @param height If present, the height at which the returned list of
     * validators will apply. If absent, the highest height this stoa
     * instance is aware of is assumed.
     * @param address If present, only returns a single validator (or none if not enrolled).
     * If null, all available validators are returned.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getValidatorsAPI(height: Height | null, address: string | null): Promise<any[]> {
        let cur_height: string;

        if (height !== null) cur_height = height.toString();
        else cur_height = `(SELECT MAX(height) as height FROM blocks)`;

        let sql =
            `SELECT validators.address,
                enrollments.enrolled_at,
                enrollments.utxo_key as stake,
                enrollments.commitment,
                enrollments.avail_height,
                ` +
            cur_height +
            ` as height,
                validators.preimage_height,
                validators.preimage_hash
        FROM (SELECT MAX(block_height) as enrolled_at,
                (CASE WHEN block_height = 0 THEN
                      block_height
                 ELSE
                      block_height + 1
                 END) as avail_height,
                enrollment_index,
                utxo_key,
                commitment,
                cycle_length,
                enroll_sig
             FROM enrollments
        GROUP BY utxo_key HAVING avail_height <= ` +
            cur_height +
            `
         AND ` +
            cur_height +
            ` < (avail_height + cycle_length)) as enrollments
        LEFT JOIN validators
            ON enrollments.enrolled_at = validators.enrolled_at
            AND enrollments.utxo_key = validators.utxo_key
        WHERE 1 = 1
        `;

        if (address != null) sql += ` AND validators.address = '` + address + `'`;

        sql += ` ORDER BY enrollments.enrolled_at ASC, enrollments.utxo_key ASC;`;

        return this.query(sql, []);
    }

    /**
     * Puts the height of the block to database
     * @param height The height of the block
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putBlockHeight(height: Height): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let sql = `INSERT INTO information (keyname, value) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE keyname = VALUES(keyname) , value = VALUES(value);`;
            this.run(sql, ["height", height.toString()])
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Returns the height of the block to be added next
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public getExpectedBlockHeight(): Promise<Height> {
        return new Promise<Height>((resolve, reject) => {
            let sql = `SELECT value FROM information WHERE keyname = 'height';`;
            this.query(sql, [])
                .then((rows: any[]) => {
                    if (rows.length > 0 && rows[0].value !== undefined && Utils.isPositiveInteger(rows[0].value)) {
                        resolve(new Height(JSBI.add(JSBI.BigInt(rows[0].value), JSBI.BigInt(1)).toString()));
                    } else {
                        resolve(new Height("0"));
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Returns the UTXO of the address.
     * @param address The public address to receive UTXO
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the array of UTXO
     * and if an error occurs the `.catch` is called with an error.
     */
    public getUTXO(address: string): Promise<any[]> {
        let sql_utxo = `SELECT
                O.utxo_key as utxo,
                O.amount,
                O.lock_type,
                O.lock_bytes,
                T.block_height,
                B.time_stamp as block_time,
                O.type,
                O.unlock_height
            FROM
                utxos O
                INNER JOIN transactions T ON (T.tx_hash = O.tx_hash)
                INNER JOIN blocks B ON (B.height = T.block_height)
            WHERE
                O.address = ?
            ORDER BY T.block_height, O.amount
            `;

        let sql_pending = `SELECT
                S.utxo_key as utxo
            FROM
                utxos S
                INNER JOIN tx_input_pool I ON (I.utxo = S.utxo_key)
                INNER JOIN transaction_pool T ON (T.tx_hash = I.tx_hash)
            WHERE
                S.address = ?;
           `;

        let result: any[];
        return new Promise<any[]>((resolve, reject) => {
            this.query(sql_utxo, [address])
                .then((utxos: any[]) => {
                    result = utxos;
                    return this.query(sql_pending, [address]);
                })
                .then((pending: any[]) => {
                    resolve(
                        result.filter((n) => pending.find((m) => Buffer.compare(n.utxo, m.utxo) === 0) === undefined)
                    );
                })
                .catch(reject);
        });
    }

    /**
     * Returns UTXO's information about the UTXO hash array.
     * @param utxos The array of UTXO hash
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the array of UTXO
     * and if an error occurs the `.catch` is called with an error.
     */
    public getUTXOs(utxos: Array<Hash>): Promise<any[]> {
        let u = utxos.map((m) => `x'${m.toBinary(Endian.Little).toString("hex")}'`);
        let sql_utxo = `SELECT
                O.utxo_key as utxo,
                O.amount,
                O.lock_type,
                O.lock_bytes,
                T.block_height,
                B.time_stamp as block_time,
                O.type,
                O.unlock_height
            FROM
                utxos O
                INNER JOIN transactions T ON (T.tx_hash = O.tx_hash)
                INNER JOIN blocks B ON (B.height = T.block_height)
            WHERE
                O.utxo_key in (${u.join(",")})
            ORDER BY T.block_height, O.amount;`;

        return new Promise<any[]>((resolve, reject) => {
            this.query(sql_utxo, [])
                .then((result: any[]) => {
                    return resolve(result);
                })
                .catch(reject);
        });
    }

    /**
     * Provides a history of transactions.
     * Returns data sorted in descending order by block height.
     * The most recent transaction is located at the front.
     *
     * @param address   An address that want to be inquired.
     * @param page_size Maximum record count that can be obtained from one query
     * @param page      The number on the page, this value begins with 1
     * @param type      The parameter `type` is the type of transaction to query.
     * @param begin     The start date of the range of dates to look up.
     * @param end       The end date of the range of dates to look up.
     * @param peer      This is used when users want to look up only specific
     * Peer is the withdrawal address in the inbound transaction and a deposit address
     * in the outbound transaction address of their counterparts.
     */
    public getWalletTransactionsHistory(
        address: string,
        page_size: number,
        page: number,
        type: Array<number>,
        begin?: number,
        end?: number,
        peer?: string
    ): Promise<any[]> {
        let filter_type = "AND FTX.display_tx_type in (" + type.map((n) => `${n}`).join(",") + ")";
        let filter_date =
            begin !== undefined && end !== undefined ? `AND B.time_stamp BETWEEN ${begin} AND ${end}` : ``;
        let filter_peer_field;
        let filter_peer_condition;
        if (peer !== undefined) {
            filter_peer_field = `,
                    CASE
                        WHEN (SUM(TX.income) - SUM(TX.spend)) > 0 THEN
                        (
                            SELECT COUNT(S.address) FROM tx_inputs I, tx_outputs S WHERE TX.tx_hash = I.tx_hash AND I.utxo = S.utxo_key
                            AND S.address LIKE '${peer}%'
                        )
                        ELSE
                        (
                            SELECT COUNT(O.address) FROM tx_outputs O WHERE TX.tx_hash = O.tx_hash
                            AND O.address LIKE '${peer}%'
                        )
                    END AS peer_filter
            `;
            filter_peer_condition = "AND FTX.peer_filter > 0";
        } else {
            filter_peer_field = "";
            filter_peer_condition = "";
        }

        let sql = `SELECT
                FTX.display_tx_type,
                FTX.address,
                FTX.height,
                FTX.block_time,
                FTX.amount,
                FTX.unlock_height,
                FTX.unlock_time,
                FTX.peer,
                FTX.peer_count,
                FTX.tx_hash,
                FTX.type
            FROM
            (
                SELECT
                    TX.address,
                    TX.block_height as height,
                    TX.time_stamp as block_time,
                    TX.tx_hash,
                    TX.type,
                    TX.unlock_height,
                    (TX.time_stamp + (TX.unlock_height - TX.block_height) * 10 * 60) as unlock_time,
                    (SUM(TX.income) - SUM(TX.spend)) as amount,
                    IFNULL(CASE
                        WHEN (SUM(TX.income) - SUM(TX.spend)) > 0 THEN
                        (
                            SELECT S.address FROM tx_inputs I, tx_outputs S
                            WHERE TX.tx_hash = I.tx_hash AND I.utxo = S.utxo_key AND S.address != TX.address
                            ORDER BY S.amount DESC LIMIT 1
                        )
                        ELSE
                        (
                            SELECT O.address FROM tx_outputs O
                            WHERE TX.tx_hash = O.tx_hash AND O.address != TX.address
                            ORDER BY O.amount DESC LIMIT 1
                        )
                    END, TX.address) AS peer,
                    CASE
                        WHEN (SUM(TX.income) - SUM(TX.spend)) > 0 THEN
                        (
                            SELECT COUNT(S.address) FROM tx_inputs I, tx_outputs S WHERE TX.tx_hash = I.tx_hash AND I.utxo = S.utxo_key
                        )
                        ELSE
                        (
                            SELECT COUNT(O.address) FROM tx_outputs O WHERE TX.tx_hash = O.tx_hash
                        )
                    END AS peer_count,
                    CASE
                        WHEN (TX.type = 1) THEN 2
                        WHEN (TX.payload_size) > 0 THEN 3
                        WHEN (SUM(TX.income) - SUM(TX.spend)) > 0 THEN 0
                        ELSE 1
                    END AS display_tx_type
                    ${filter_peer_field}
                FROM
                (
                    SELECT
                        S.address,
                        T.block_height,
                        B.time_stamp,
                        T.tx_hash,
                        T.tx_index,
                        T.type,
                        T.unlock_height,
                        T.payload_size,
                        0 as income,
                        IFNULL(SUM(S.amount), 0) AS spend
                    FROM
                        tx_outputs S
                        INNER JOIN tx_inputs I ON (I.utxo = S.utxo_key)
                        INNER JOIN transactions T ON (T.tx_hash = I.tx_hash)
                        INNER JOIN blocks B ON (B.height = T.block_height)
                    WHERE
                        S.address = '${address}'
                        ${filter_date}
                    GROUP BY T.tx_hash, S.address

                    UNION ALL

                    SELECT
                        O.address,
                        T.block_height,
                        B.time_stamp,
                        T.tx_hash,
                        T.tx_index,
                        T.type,
                        T.unlock_height,
                        T.payload_size,
                        IFNULL(SUM(O.amount), 0) AS income,
                        0 as spend
                    FROM
                        tx_outputs O
                        INNER JOIN transactions T ON (T.tx_hash = O.tx_hash)
                        INNER JOIN blocks B ON (B.height = T.block_height)
                    WHERE
                        O.address = '${address}'
                        ${filter_date}
                    GROUP BY T.tx_hash, O.address
                ) AS TX
                GROUP BY TX.block_height, TX.tx_hash, TX.address, TX.type
                ORDER BY TX.block_height DESC, TX.tx_index DESC
            ) FTX
            WHERE 1 = 1
                ${filter_type}
                ${filter_peer_condition}
            LIMIT ? OFFSET ?;`;
        return this.query(sql, [page_size, page_size * (page - 1)]);
    }

    /**
     * Provides a overview of a transaction.
     * @param tx_hash The hash of the transaction
     */
    public getWalletTransactionOverview(tx_hash: Hash): Promise<any[]> {
        let hash = tx_hash.toBinary(Endian.Little);

        let sql_tx = `SELECT
                T.block_height as height,
                B.time_stamp as block_time,
                T.tx_hash,
                T.tx_size,
                T.type,
                T.unlock_height,
                T.lock_height,
                (B.time_stamp + (T.unlock_height - T.block_height) * 10 * 60) as unlock_time,
                P.payload,
                T.tx_fee,
                T.payload_fee
            FROM
                blocks B
                INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?)
                LEFT OUTER JOIN payloads P ON (T.tx_hash = P.tx_hash);`;

        let sql_sender = `SELECT
                S.address,
                S.amount,
                S.utxo_key as utxo,
				B.signature,
				I.in_index,
				I.unlock_age,
				I.unlock_bytes as bytes
            FROM
                blocks B
                INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?)
                INNER JOIN tx_inputs I ON (T.tx_hash = I.tx_hash)
                INNER JOIN tx_outputs S ON (I.utxo = S.utxo_key);`;

        let sql_receiver = `SELECT
                O.output_index,
                O.type,
                O.amount,
				O.lock_type,
				O.lock_bytes as bytes,
                O.utxo_key as utxo,
                O.address
            FROM
                blocks B
                INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?)
                INNER JOIN tx_outputs O ON (T.tx_hash = O.tx_hash);`;

        let result: any = {};
        return new Promise<any[]>((resolve, reject) => {
            this.query(sql_tx, [hash])
                .then((rows: any[]) => {
                    result.tx = rows;
                    return this.query(sql_sender, [hash]);
                })
                .then((rows: any[]) => {
                    result.senders = rows;
                    return this.query(sql_receiver, [hash]);
                })
                .then((rows: any[]) => {
                    result.receivers = rows;
                    resolve(result);
                })
                .catch(reject);
        });
    }

    /**
     * Provides pending of transactions.
     * Lists the total by output address of the pending transactions.
     * @param address The input address of the pending transaction
     */
    public getWalletTransactionsPending(address: string): Promise<any[]> {
        let sql = `SELECT
                T.tx_hash,
                T.time,
                O.address,
                IFNULL(SUM(O.amount), 0) as amount,
                T.tx_fee,
                T.payload_fee,
                T.received_height,
                (SELECT IFNULL(MAX(height), 0) as height FROM blocks) as current_height
            FROM
                transaction_pool T
                LEFT OUTER JOIN tx_output_pool O
                    ON T.tx_hash = O.tx_hash
            WHERE
                T.tx_hash = IFNULL(
                (
                    SELECT
                            I.tx_hash
                    FROM
                        utxos O
                        INNER JOIN tx_input_pool I
                            ON O.utxo_key = I.utxo
                    WHERE
                        O.address = ?
                ), NULL)
            GROUP BY T.tx_hash, O.address;`;

        return this.query(sql, [address]);
    }

    /**
     * Provides a status of a transaction.
     * @param tx_hash The hash of the transaction
     */
    public getTransactionStatus(tx_hash: Hash): Promise<any> {
        let hash = tx_hash.toBinary(Endian.Little);

        let sql_tx = `SELECT
                B.hash,
                T.block_height as height,
                T.tx_hash
            FROM
                blocks B
                INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?);`;

        let sql_tx_pending = `SELECT
                T.tx_hash
            FROM
                transaction_pool T
            WHERE
                T.tx_hash = ?;`;

        let result: any = {};
        return new Promise<any>(async (resolve, reject) => {
            try {
                let rows = await this.query(sql_tx_pending, [hash]);
                if (rows.length > 0) {
                    result.status = "pending";
                    result.tx_hash = rows[0].tx_hash;
                    resolve(result);
                } else {
                    rows = await this.query(sql_tx, [hash]);
                    if (rows.length > 0) {
                        result.status = "confirmed";
                        result.tx_hash = rows[0].tx_hash;
                        result.block = { hash: rows[0].hash, height: rows[0].height };
                        resolve(result);
                    } else {
                        result.status = "not found";
                        result.tx_hash = hash;
                        resolve(result);
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Gets a transaction data
     * @param tx_hash The hash of the transaction to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTransactionPending(tx_hash: Hash): Promise<Transaction | null> {
        return new Promise<Transaction | null>(async (resolve, reject) => {
            try {
                let hash = tx_hash.toBinary(Endian.Little);
                let rows = await this.query(
                    "SELECT tx_hash, type, payload, lock_height, time FROM transaction_pool WHERE tx_hash = ?;",
                    [hash]
                );
                if (rows.length > 0) {
                    let input_rows = await this.query(
                        "SELECT tx_hash, utxo, unlock_bytes, unlock_age FROM tx_input_pool WHERE tx_hash = ? ORDER BY input_index;",
                        [hash]
                    );
                    let output_rows = await this.query(
                        "SELECT tx_hash, type, amount, lock_type, lock_bytes FROM tx_output_pool WHERE tx_hash = ? ORDER BY output_index;",
                        [hash]
                    );

                    let inputs: Array<TxInput> = [];
                    for (let input_row of input_rows)
                        inputs.push(
                            new TxInput(
                                new Hash(input_row.utxo, Endian.Little),
                                new Unlock(input_row.unlock_bytes),
                                input_row.unlock_age
                            )
                        );
                    let outputs: Array<TxOutput> = [];
                    for (let output_row of output_rows)
                        outputs.push(
                            new TxOutput(
                                output_row.type,
                                output_row.amount,
                                new Lock(output_row.lock_type, output_row.lock_bytes)
                            )
                        );
                    resolve(
                        new Transaction(
                            inputs,
                            outputs,
                            rows[0].payload !== null ? rows[0].payload : Buffer.alloc(0),
                            new Height(rows[0].lock_height)
                        )
                    );
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Gets a transaction data
     * @param tx_hash The hash of the transaction to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTransaction(tx_hash: Hash): Promise<Transaction | null> {
        return new Promise<Transaction | null>(async (resolve, reject) => {
            try {
                let hash = tx_hash.toBinary(Endian.Little);
                let rows = await this.query(
                    `SELECT
                        T.tx_hash, T.lock_height, P.payload FROM
                    transactions T
                    LEFT JOIN payloads P ON (T.tx_hash = P.tx_hash)
                    WHERE
                        T.tx_hash = ?`,
                    [hash]
                );
                if (rows.length > 0) {
                    let input_rows = await this.query(
                        "SELECT tx_hash, utxo, unlock_bytes, unlock_age FROM tx_inputs WHERE tx_hash = ? ORDER BY in_index;",
                        [hash]
                    );
                    let output_rows = await this.query(
                        "SELECT tx_hash, type, amount, lock_type, lock_bytes FROM tx_outputs WHERE tx_hash = ? ORDER BY output_index;",
                        [hash]
                    );

                    let inputs: Array<TxInput> = [];
                    for (let input_row of input_rows)
                        inputs.push(
                            new TxInput(
                                new Hash(input_row.utxo, Endian.Little),
                                new Unlock(input_row.unlock_bytes),
                                input_row.unlock_age
                            )
                        );
                    let outputs: Array<TxOutput> = [];
                    for (let output_row of output_rows)
                        outputs.push(
                            new TxOutput(
                                output_row.type,
                                output_row.amount,
                                new Lock(output_row.lock_type, output_row.lock_bytes)
                            )
                        );
                    resolve(
                        new Transaction(
                            inputs,
                            outputs,
                            rows[0].payload !== null ? rows[0].payload : Buffer.alloc(0),
                            new Height(rows[0].lock_height)
                        )
                    );
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Gets the information of block header
     * @param height The height of the block,
     *      If this is null, then the last block header is specified.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getWalletBlocksHeaderInfo(height: Height | null): Promise<any[]> {
        let cur_height: string;

        if (height !== null) cur_height = height.toString();
        else cur_height = `(SELECT MAX(height) as height FROM blocks)`;

        let sql = `SELECT
                height, hash, merkle_root, time_stamp
            FROM
                blocks
            WHERE height = ${cur_height};`;
        return this.query(sql, []);
    }

    /**
     * Gets block height and merkle root
     * @param tx_hash The hash of the transaction
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getBlockHeaderByTxHash(tx_hash: Hash): Promise<any[]> {
        let sql = `SELECT
            height, merkle_root, T.tx_index
        FROM
            transactions T
            INNER JOIN blocks B ON T.block_height = B.height
        AND
            T.tx_hash = ?`;

        return this.query(sql, [tx_hash.toBinary(Endian.Little)]);
    }

    /**
     *  Get the Latest Blocks
     * @param limit Maximum record count that can be obtained from one query
     * @param page The number on the page, this value begins with 1
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getLatestBlocks(limit: number, page: number): Promise<any[]> {
        let sql = `SELECT
                height, hash, merkle_root, signature, validators, tx_count,
                enrollment_count, time_stamp
            FROM
                blocks
            ORDER BY height DESC
            LIMIT ? OFFSET ?`;

        return this.query(sql, [limit, limit * (page - 1)]);
    }

    /**
     * Get the Latest transactions
     * @param limit Maximum record count that can be obtained from one query
     * @param page The number on the page, this value begins with 1
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getLatestTransactions(limit: number, page: number): Promise<any[]> {
        let sql = `SELECT
                T.block_height, T.tx_hash, T.tx_fee, T.tx_size,
             Sum(IFNULL(O.amount,0)) as amount, B.time_stamp
             FROM
                 tx_outputs O
                 INNER JOIN transactions T ON (T.tx_hash = O.tx_hash)
                 INNER JOIN blocks B ON (B.height = T.block_height)
             GROUP BY O.tx_hash
             ORDER BY T.block_height DESC
             LIMIT ? OFFSET ?;`;
        return this.query(sql, [limit, limit * (page - 1)]);
    }

    /**
     * Get the block overview
     * @param limit Maximum record count that can be obtained from one query
     * @param page The number on the page, this value begins with 1
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     *
     */
    public getBlockSummary(field: string, value: string | Buffer): Promise<any[]> {
        let sql = `SELECT B.height, B.hash, B.merkle_root, B.signature, B.prev_block, B.random_seed,
             B.time_stamp, B.tx_count,
             BS.total_sent, BS.total_received, BS.total_reward, BS.total_fee, BS.total_size
             FROM blocks B
             INNER JOIN blocks_stats BS ON (B.height = BS.block_height)
             WHERE ${field} = ?`;

        return this.query(sql, [value]);
    }

    /**
     * Get enrolled validators of a block
     * @param limit Maximum record count that can be obtained from one query
     * @param page The number on the page, this value begins with 1
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getBlockEnrollments(field: string, value: string | Buffer, limit: number, page: number): Promise<any[]> {
        let sql = `SELECT
                E.block_height, E.utxo_key, E.commitment, E.cycle_length, E.enroll_sig
            FROM
                blocks B
                INNER JOIN enrollments E ON (E.block_height = B.height)
                AND B.${field} = ?
            ORDER BY E.enrollment_index ASC
            LIMIT ? OFFSET ?;`;
        let countsql = `SELECT IFNULL(count(*),0) as total_records
                FROM
                    blocks B
                    INNER JOIN enrollments E ON (E.block_height = B.height)
                    AND B.${field} = ?`;

        let result: any = {};
        return new Promise<any[]>((resolve, reject) => {
            this.query(sql, [value, limit, limit * (page - 1)])
                .then((rows: any[]) => {
                    result.enrollments = rows;
                    return this.query(countsql, [value]);
                })
                .then((rows: any[]) => {
                    result.total_records = rows[0].total_records;
                    resolve(result);
                });
        });
    }

    /**
     * Get transactions of a block
     * @param limit Maximum record count that can be obtained from one query
     * @param page The number on the page, this value begins with 1
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getBlockTransactions(field: string, value: string | Buffer, limit: number, page: number): Promise<any[]> {
        let sql_tx = `SELECT
                T.block_height, T.tx_hash, SUM(IFNULL(O.amount,0)) as amount,
                T.tx_fee, T.tx_size, B.time_stamp,
                JSON_ARRAYAGG(JSON_OBJECT("type", O.type, "address", O.address, "amount", O.amount)) as receiver,
                (SELECT
                   JSON_ARRAYAGG(JSON_OBJECT("address", S.address, "amount", S.amount))
                FROM
                    blocks B
                    INNER JOIN transactions T ON (B.height = T.block_height)
                    INNER JOIN tx_inputs I ON (T.tx_hash = I.tx_hash)
                    INNER JOIN tx_outputs S ON (I.utxo = S.utxo_key)
                WHERE
                    B.${field} = ? ) as sender_address
            FROM
                tx_outputs O
                INNER JOIN transactions T ON (T.tx_hash = O.tx_hash)
                INNER JOIN blocks B ON  (B.height = T.block_height)
            WHERE
                B.${field} = ?
            GROUP BY T.tx_hash
            ORDER BY T.tx_index ASC
            LIMIT ? OFFSET ?;`;

        let sql_count = `SELECT
                    IFNULL(count(*),0) as total_records
                FROM
                    transactions T
                    INNER JOIN blocks B ON (B.height = T.block_height)
                WHERE
                    ${field} = ?;`;

        let result: any = {};
        return new Promise<any[]>((resolve, reject) => {
            this.query(sql_tx, [value, value, limit, limit * (page - 1)])
                .then((rows: any[]) => {
                    result.tx = rows;
                    return this.query(sql_count, [value]);
                })
                .then((rows: any[]) => {
                    result.total_data = rows[0].total_records;
                    resolve(result);
                })
                .catch(reject);
        });
    }

    /**
     * Get statistics of BOA coin
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getBOAStats(): Promise<any[]> {
        let sql = `SELECT max(height) as height,
             (SELECT count(*) from transactions) as transactions,
             (SELECT count(*) from validators) as validators
            FROM
                blocks;`;

        return this.query(sql, []);
    }

    /**
     * Get the latest Coin Market cap data of BOA coin
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getCoinMarketcap(): Promise<any[]> {
        let sql = `SELECT * FROM marketcap WHERE last_updated_at = (SELECT MAX(last_updated_at) as time FROM marketcap)`;

        return this.query(sql, []);
    }

    /**
     * Get the latest Coin Market cap chart of BOA coin
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getCoinMarketChart(from: number, to: number): Promise<any[]> {
        let sql = `SELECT * FROM marketcap WHERE last_updated_at BETWEEN ? AND ?`;

        return this.query(sql, [from, to]);
    }

    /**
     * Drop Database
     * @param database The name of database
     */
    public async dropTestDB(database: any): Promise<any[]> {
        let sql = `DROP DATABASE ${database}`;
        return this.run(sql, []);
    }
}
