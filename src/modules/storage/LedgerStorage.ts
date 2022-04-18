/*******************************************************************************

    The class that creates, inserts and reads the ledger into the database.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    Amount,
    BallotData,
    BitMask,
    Block,
    BlockHeader,
    Constant,
    Encrypt,
    Endian,
    Enrollment,
    Hash,
    hashFull,
    hashMulti,
    Height,
    JSBI,
    Lock,
    makeUTXOKey,
    OutputType,
    PreImageInfo,
    ProposalData,
    ProposalFeeData,
    PublicKey,
    Transaction,
    TxInput,
    TxOutput,
    TxPayloadFee,
    Unlock,
    UnspentTxOutput,
    Utils,
} from "boa-sdk-ts";
import bigDecimal from "js-big-decimal";
import moment from "moment";
import * as mysql from "mysql2";
import process from "process";
import { SmartBuffer } from "smart-buffer";
import {
    IAccountInformation,
    IBallot,
    IMarketCap,
    IMetaData,
    INodeInformation,
    IPreimage,
    IProposal,
    IProposalAttachment,
    IValidator,
    IValidatorByBlock,
    IVotingResult,
} from "../../Types";
import { Config, IDatabaseConfig } from "../common/Config";
import { DataCollectionStatus, ProposalResult, ProposalStatus, SignStatus, ValidatorStatus } from "../common/enum";
import { FeeManager } from "../common/FeeManager";
import { HeightManager } from "../common/HeightManager";
import { logger } from "../common/Logger";
import { Operation, Status } from "../common/LogOperation";
import { Storages } from "./Storages";
import { TransactionPool } from "./TransactionPool";

/**
 * The class that inserts and reads the ledger into the database.
 */
export class LedgerStorage extends Storages {
    /**
     * The genesis timestamp
     */
    private readonly genesis_timestamp: number;

    private readonly block_interval: number;

    /**
     * The cycle length for a validator
     */
    private readonly validator_cycle: number;

    /**
     * The validator Uptime constant
     */
    static readonly validator_uptime_constant: number = 96.42;

    /**
     * excluded Addresses
     */
    private readonly excluded_addresses?: string[] = [];

    /**
     * The pool of transactions to manage double-spent transactions.
     */
    private _transaction_pool: TransactionPool | null = null;

    /**
     * Construct an instance of `LedgerStorage`, exposes callback API.
     */
    constructor(
        databaseConfig: IDatabaseConfig,
        genesis_timestamp: number,
        block_interval: number,
        validator_cycle: number,
        callback: (err: Error | null) => void,
        excludedAddresses?: string[]
    ) {
        super(databaseConfig, callback);
        this.genesis_timestamp = genesis_timestamp;
        this.block_interval = block_interval;
        this.validator_cycle = validator_cycle;
        this.excluded_addresses = excludedAddresses;
    }

    /**
     * Construct an instance of `LedgerStorage` using `Promise` API.
     */
    public static make(
        databaseConfig: IDatabaseConfig,
        genesis_timestamp: number,
        block_interval: number,
        validator_cycle: number,
        excludedAddresses?: string[]
    ): Promise<LedgerStorage> {
        return new Promise<LedgerStorage>((resolve, reject) => {
            const result: LedgerStorage = new LedgerStorage(
                databaseConfig,
                genesis_timestamp,
                block_interval,
                validator_cycle,
                async (err: Error | null) => {
                    if (err) reject(err);
                    else {
                        result._transaction_pool = new TransactionPool(result);
                        await result.transaction_pool.loadSpenderList();
                        return resolve(result);
                    }
                },
                excludedAddresses
            );
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
            logger.error("TransactionPool is not ready yet.", {
                operation: Operation.start,
                height: "",
                status: Status.Error,
                responseTime: Number(moment().utc().unix() * 1000),
            });
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
        const sql = `CREATE TABLE IF NOT EXISTS blocks
        (
            height              INTEGER  NOT NULL,
            hash                TINYBLOB NOT NULL,
            prev_block          TINYBLOB NOT NULL,
            validators          TEXT     NOT NULL,
            merkle_root         TINYBLOB NOT NULL,
            signature           TINYBLOB NOT NULL,
            tx_count            INTEGER  NOT NULL,
            enrollment_count    INTEGER  NOT NULL,
            time_offset         INTEGER  NOT NULL,
            time_stamp          INTEGER  NOT NULL,
            PRIMARY KEY(height),
            KEY blocks_hash (hash(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS enrollments
        (
            block_height        INTEGER  NOT NULL,
            enrollment_index    INTEGER  NOT NULL,
            utxo_key            TINYBLOB NOT NULL,
            commitment          TINYBLOB NOT NULL,
            enroll_sig          TINYBLOB NOT NULL,
            PRIMARY KEY(block_height, enrollment_index)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS transactions
        (
            block_height        INTEGER  NOT NULL,
            tx_index            INTEGER  NOT NULL,
            tx_hash             TINYBLOB NOT NULL,
            type                INTEGER  NOT NULL,
            unlock_height       INTEGER  NOT NULL,
            lock_height         INTEGER  NOT NULL,
            tx_fee              BIGINT(20)  NOT NULL,
            payload_fee         BIGINT(20)  NOT NULL,
            freezing_fee        BIGINT(20)  NOT NULL,
            tx_size             INTEGER  NOT NULL,
            calculated_tx_fee   BIGINT(20)  NOT NULL,
            inputs_count        INTEGER  NOT NULL,
            outputs_count       INTEGER  NOT NULL,
            payload_size        INTEGER  NOT NULL,
            PRIMARY KEY(block_height, tx_index),
            KEY transaction_tx_hash (tx_hash(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS tx_inputs
        (
            block_height        INTEGER  NOT NULL,
            tx_index            INTEGER  NOT NULL,
            in_index            INTEGER  NOT NULL,
            tx_hash             TINYBLOB NOT NULL,
            utxo                TINYBLOB NOT NULL,
            unlock_bytes        TINYBLOB NOT NULL,
            unlock_age          INTEGER  NOT NULL,
            PRIMARY KEY(block_height, tx_index, in_index, utxo(64)),
            KEY tx_inputs_tx_hash (tx_hash(64)),
            KEY tx_inputs_utxo  (utxo(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

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
            address             VARCHAR(64) NOT NULL,
            PRIMARY KEY(block_height, tx_index, output_index),
            KEY tx_outputs_tx_hash (tx_hash(64)),
            KEY tx_outputs_utxo (utxo_key(64)),
            KEY tx_outputs_address (address(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS utxos
        (
            utxo_key            TINYBLOB    NOT NULL,
            tx_hash             TINYBLOB    NOT NULL,
            type                INTEGER     NOT NULL,
            unlock_height       INTEGER     NOT NULL,
            amount              BIGINT(20)  UNSIGNED NOT NULL,
            lock_type           INTEGER     NOT NULL,
            lock_bytes          TINYBLOB    NOT NULL,
            address             VARCHAR(64) NOT NULL,
            PRIMARY KEY(utxo_key(64)),
            KEY utxo_tx_hash (tx_hash(64)),
            KEY utxo_address (address(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS validators
        (
            enrolled_at         INTEGER     NOT NULL,
            utxo_key            TINYBLOB    NOT NULL,
            address             VARCHAR(64)        NOT NULL,
            amount              BIGINT(20)  UNSIGNED NOT NULL,
            preimage_height     INTEGER     NOT NULL,
            preimage_hash       TINYBLOB    NOT NULL,
            slashed             INTEGER,
            slashed_height      INTEGER,
            PRIMARY KEY(enrolled_at, utxo_key(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS validator_by_block
        (
            block_height        INTEGER     NOT NULL,
            enrolled_height     INTEGER     NOT NULL,
            address             VARCHAR(64) NOT NULL,
            utxo_key            TINYBLOB    NOT NULL,
            signed              INTEGER     NOT NULL,
            slashed             INTEGER     NOT NULL,
            PRIMARY KEY(block_height, address(64), utxo_key(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS payloads (
            tx_hash             TINYBLOB    NOT NULL,
            payload             BLOB        NOT NULL,
            PRIMARY KEY(tx_hash(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS merkle_trees
        (
            block_height        INTEGER     NOT NULL,
            merkle_index        INTEGER     NOT NULL,
            merkle_hash         TINYBLOB    NOT NULL,
            PRIMARY KEY(block_height, merkle_index)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS blocks_header_updated_history
        (
            block_height        INTEGER  NOT NULL,
            current_height      INTEGER  NOT NULL,
            signature           TINYBLOB NOT NULL,
            hash                TINYBLOB NOT NULL,
            validators          TEXT     NOT NULL,
            updated_time        INTEGER  NOT NULL,
            PRIMARY KEY(block_height, signature(64), updated_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS information
        (
            keyname             TEXT       NOT NULL,
            value               TEXT       NOT NULL,
            PRIMARY KEY(keyname(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS transaction_pool (
            tx_hash             TINYBLOB   NOT NULL,
            type                INTEGER    NOT NULL,
            payload             BLOB   NOT NULL,
            lock_height         INTEGER    NOT NULL,
            received_height     INTEGER    NOT NULL,
            time                INTEGER    NOT NULL,
            tx_fee              BIGINT(20)     NOT NULL,
            payload_fee         BIGINT(20)     NOT NULL,
            freezing_fee        BIGINT(20)     NOT NULL,
            tx_size             INTEGER    NOT NULL,
            PRIMARY KEY(tx_hash(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS tx_input_pool (
            tx_hash             TINYBLOB   NOT NULL,
            input_index         INTEGER    NOT NULL,
            utxo                TINYBLOB   NOT NULL,
            unlock_bytes        TINYBLOB   NOT NULL,
            unlock_age          INTEGER    NOT NULL,
            PRIMARY KEY(tx_hash(64), input_index),
            KEY tx_input_pool_utxo (utxo(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS tx_output_pool (
            tx_hash             TINYBLOB   NOT NULL,
            output_index        INTEGER    NOT NULL,
            type                INTEGER    NOT NULL,
            amount              BIGINT(20) UNSIGNED NOT NULL,
            lock_type           INTEGER    NOT NULL,
            lock_bytes          TINYBLOB   NOT NULL,
            address             VARCHAR(64) NOT NULL,
            PRIMARY KEY(tx_hash(64), output_index),
            KEY tx_output_pool_address (address(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

       CREATE TABLE IF NOT EXISTS blocks_stats(
            block_height        INTEGER,
            total_sent          BIGINT(20)  UNSIGNED NOT NULL,
            total_received      BIGINT(20)  UNSIGNED NOT NULL,
            total_reward        BIGINT(20)  UNSIGNED NOT NULL,
            total_fee           BIGINT(20)  NOT NULL,
            total_size          BIGINT(20)  UNSIGNED NOT NULL,
            circulating_supply  BIGINT(20)  UNSIGNED NOT NULL,
            PRIMARY KEY(block_height)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS marketcap (
            last_updated_at INTEGER NOT NULL,
            currency        TEXT NOT NULL,
            price           DECIMAL(14,6)  NOT NULL,
            market_cap      BIGINT(20) UNSIGNED NOT NULL,
            vol_24h         BIGINT(20) UNSIGNED NOT NULL,
            change_24h      BIGINT(20),
            PRIMARY KEY (last_updated_at, currency(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS fee_mean_disparity (
            height      INTEGER    NOT NULL,
            disparity   BIGINT(20) NOT NULL,
            PRIMARY KEY (height)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS fee_stats (
            tx_hash     TINYBLOB   NOT NULL,
            tx_time     INTEGER    NOT NULL,
            tx_size     INTEGER    NOT NULL,
            tx_fee      BIGINT(20) NOT NULL,
            block_time  INTEGER,
            PRIMARY KEY (tx_hash(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS tx_pool
        (
            \`key\`     TINYBLOB    NOT NULL,
            \`val\`     MEDIUMBLOB  NOT NULL,
            PRIMARY KEY(\`key\`(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS accounts(
            address          VARCHAR(64),
            tx_count         INTEGER,
            total_received   BIGINT(24) UNSIGNED NOT NULL,
            total_sent       BIGINT(24) UNSIGNED NOT NULL,
            total_reward     BIGINT(20) UNSIGNED NOT NULL,
            total_frozen     BIGINT(20) UNSIGNED NOT NULL,
            total_spendable  BIGINT(20) UNSIGNED NOT NULL,
            total_balance    BIGINT(20) UNSIGNED NOT NULL,
            last_updated_at   INTEGER,
            PRIMARY KEY (address(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS account_history(
            address                     VARCHAR(64) NOT NULL,
            granularity_time_stamp      INTEGER     NOT NULL,
            granularity                 TEXT        NOT NULL,
            time_stamp                  INTEGER     NOT NULL,
            block_height                INTEGER     NOT NULL,
            balance                     BIGINT(20)  UNSIGNED NOT NULL,

            PRIMARY KEY (address(64), granularity_time_stamp, granularity(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS fees
        (
            height                      INTEGER    NOT NULL,
            granularity_time_stamp      INTEGER    NOT NULL,
            granularity                 TEXT       NOT NULL,
            time_stamp                  INTEGER    NOT NULL,
            average_tx_fee              BIGINT(20) NOT NULL,
            total_tx_fee                BIGINT(20) NOT NULL,
            total_payload_fee           BIGINT(20) NOT NULL,
            total_freezing_fee          BIGINT(20) NOT NULL,
            total_fee                   BIGINT(20) NOT NULL,
            PRIMARY KEY(granularity_time_stamp, granularity(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS proposal_fee
        (
            proposal_id          TEXT      NOT NULL,
            block_height         INTEGER   NOT NULL,
            tx_hash              TINYBLOB  NOT NULL,

            PRIMARY KEY(proposal_id(64), block_height, tx_hash(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS proposal
        (
            proposal_id              TEXT        NOT NULL,
            block_height             INTEGER     NOT NULL,
            tx_hash                  TINYBLOB    NOT NULL,
            app_name                 TEXT        NOT NULL,
            proposal_type            INTEGER     NOT NULL,
            proposal_title           TEXT        NOT NULL,
            vote_start_height        INTEGER     NOT NULL,
            vote_end_height          INTEGER     NOT NULL,
            doc_hash                 TINYBLOB    NOT NULL,
            fund_amount              BIGINT(20)  NOT NULL,
            proposal_fee             BIGINT(20)  NOT NULL,
            vote_fee                 BIGINT(20)  NOT NULL,
            proposal_fee_tx_hash     TINYBLOB    NOT NULL,
            proposer_address         VARCHAR(64) NOT NULL,
            proposal_fee_address     VARCHAR(64) NOT NULL,
            proposal_status          TEXT        NOT NULL,
            data_collection_status   TEXT        NOT NULL,
            proposal_result          TEXT        NOT NULL,

            PRIMARY KEY(proposal_id(64), app_name(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS proposal_metadata
        (
            proposal_id                 TEXT           NOT NULL,
            voting_start_date           INTEGER        NOT NULL,
            voting_end_date             INTEGER        NOT NULL,
            voting_fee_hash             TINYBLOB       NOT NULL,
            detail                      TEXT           NOT NULL,
            submit_time                 INTEGER        NOT NULL,
            ave_pre_evaluation_score    INTEGER        NOT NULL,
            pre_evaluation_start_time   INTEGER        NOT NULL,
            pre_evaluation_end_time     INTEGER        NOT NULL,
            assess_node_count           INTEGER        NOT NULL,
            assess_average_score        DECIMAL(10,4)  NOT NULL,
            assess_completeness_score   DECIMAL(10,4)  NOT NULL,
            assess_realization_score    DECIMAL(10,4)  NOT NULL,
            assess_profitability_score  DECIMAL(10,4)  NOT NULL,
            assess_attractiveness_score DECIMAL(10,4)  NOT NULL,
            assess_expansion_score      DECIMAL(10,4)  NOT NULL,
            proposer_name               TEXT,

            PRIMARY KEY(proposal_id(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS proposal_attachments
        (
            attachment_id   TEXT      NOT NULL,
            proposal_id     TEXT      NOT NULL,
            name            TEXT      NOT NULL,
            url             TEXT      NOT NULL,
            mime            TEXT      NOT NULL,
            doc_hash        TEXT      NOT NULL,

            PRIMARY KEY(proposal_id(64), attachment_id(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS ballots
        (
            proposal_id         TEXT        NOT NULL,
            block_height        INTEGER     NOT NULL,
            app_name            TEXT        NOT NULL,
            tx_hash             TINYBLOB    NOT NULL,
            voter_address       VARCHAR(64) NOT NULL,
            sequence            INTEGER     NOT NULL,
            ballot              BLOB        NOT NULL,
            signature           TINYBLOB    NOT NULL,
            voting_time         INTEGER     NOT NULL,
            ballot_answer       INTEGER,
            PRIMARY KEY(proposal_id(64), block_height, app_name(64), voter_address(64) )
        );

        CREATE TABLE IF NOT EXISTS preimages
        (
            block_height          INTEGER     NOT NULL,
            utxo_key              TINYBLOB    NOT NULL,
            preimage_hash         TINYBLOB    NOT NULL,
            address               VARCHAR(64) NOT NULL,

            PRIMARY KEY(block_height, utxo_key(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

        CREATE TABLE IF NOT EXISTS nodes
        (
            public_key    TEXT  NOT NULL,
            utxo_key      TEXT  NOT NULL,
            url           TEXT  NOT NULL,
            port          TEXT  NOT NULL,
            block_height  TEXT  NOT NULL,
            update_time   TEXT  NOT NULL,

            PRIMARY KEY(public_key(64))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

       DROP TRIGGER IF EXISTS tx_trigger;
       CREATE TRIGGER tx_trigger AFTER INSERT
       ON transactions
       FOR EACH ROW
        BEGIN
            DELETE FROM transaction_pool WHERE tx_hash = NEW.tx_hash;
            DELETE FROM tx_input_pool WHERE tx_hash = NEW.tx_hash;
            DELETE FROM tx_output_pool WHERE tx_hash = NEW.tx_hash;
        END;

       DROP TRIGGER IF EXISTS proposal_trigger;
       CREATE TRIGGER proposal_trigger AFTER INSERT ON
       proposal_metadata
       FOR EACH ROW
       BEGIN
           UPDATE proposal SET data_collection_status = '${DataCollectionStatus.COMPLETED}' WHERE proposal_id = NEW.proposal_id;
       END;

       DROP TRIGGER IF EXISTS proposal_start_trigger;
       CREATE TRIGGER proposal_start_trigger AFTER INSERT ON
       blocks
       FOR EACH ROW
       BEGIN
           UPDATE proposal SET proposal_status = '${ProposalStatus.VOTING}' WHERE vote_start_height = NEW.height;
       END;

       DROP TRIGGER IF EXISTS proposal_end_trigger;
       CREATE TRIGGER proposal_end_trigger AFTER INSERT ON
       blocks
       FOR EACH ROW
       BEGIN
           UPDATE proposal SET proposal_status = '${ProposalStatus.COUNTING_VOTES}' WHERE vote_end_height = NEW.height;
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
        const genesis_timestamp: number = this.genesis_timestamp;
        const now_timestamp = Math.floor(new Date().getTime() / 1000);
        block.header.time_offset = JSBI.toNumber(block.header.height.value) * this.block_interval;

        function saveBlock(
            storage: LedgerStorage,
            block: Block,
            genesis_timestamp: number,
            conn?: mysql.PoolConnection
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                const block_hash = hashFull(block.header);
                storage
                    .query(
                        `INSERT INTO blocks
                        (height, hash, prev_block, validators, merkle_root, signature,
                         tx_count, enrollment_count, time_offset, time_stamp)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            block.header.height.toString(),
                            block_hash.toBinary(Endian.Little),
                            block.header.prev_block.toBinary(Endian.Little),
                            block.header.validators.toString(),
                            block.header.merkle_root.toBinary(Endian.Little),
                            block.header.signature.toBinary(Endian.Little),
                            block.txs.length,
                            block.header.enrollments.length,
                            block.header.time_offset,
                            block.header.time_offset + genesis_timestamp,
                        ],
                        conn
                    )
                    .then(() => {
                        return resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        return new Promise<void>(async (resolve, reject) => {
            let conn: mysql.PoolConnection;
            try {
                conn = await this.getConnection();
            } catch (err) {
                return reject(err);
            }

            try {
                await this.begin(conn);
                for (const tx of block.txs) await this.transaction_pool.remove(conn, tx);
                await saveBlock(this, block, genesis_timestamp, conn);
                await this.putfees(block, conn);
                await this.putTransactions(block, conn);
                await this.putEnrollments(block, conn);
                await this.putBlockHeight(block.header.height, conn);
                await this.putPreimages(block, conn);
                await this.putMerkleTree(block, conn);
                await this.putBlockstats(block, conn);
                await this.putFeeDisparity(block, conn);
                await this.putAccountStats(block, conn);
                await this.putBlockHeaderHistory(block.header, block.header.height, conn);
                await this.putValidatorByBlock(block, conn);
                await this.commit(conn);
                await this.begin(conn);
                await this.putProposalResult(block, conn);
                await this.putProposals(block, conn);
                await this.commit(conn);
                return resolve();
            } catch (err) {
                await this.rollback(conn);
                return reject(err);
            } finally {
                conn.release();
            }
        });
    }
    /**
     * Saving Average Fees
     * @param block: The instance of the `Block`
     * @param conn Use this if it are providing a db connection.
     */
    public putfees(block: Block, conn?: mysql.PoolConnection) {
        function save_fee(
            storage: LedgerStorage,
            height: Height,
            granularity_time_stamp: number,
            granularity: number,
            time_stamp: number,
            average_tx_fee: JSBI,
            total_tx_fee: JSBI,
            total_payload_fee: JSBI,
            total_freezing_fee: JSBI,
            total_fee: JSBI
        ) {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO fees
                        ( height, granularity_time_stamp, granularity, time_stamp, average_tx_fee, total_tx_fee, total_payload_fee, total_freezing_fee, total_fee)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY
                    UPDATE
                        height = VALUES(height),
                        time_stamp = VALUES(time_stamp),
                        average_tx_fee = VALUES(average_tx_fee),
                        total_tx_fee = VALUES(total_tx_fee),
                        total_payload_fee = VALUES(total_payload_fee),
                        total_freezing_fee = VALUES(total_freezing_fee),
                        total_fee = VALUES(total_fee)`,
                        [
                            height.value.toString(),
                            granularity_time_stamp.toString(),
                            granularity.toString(),
                            time_stamp.toString(),
                            average_tx_fee.toString(),
                            total_tx_fee.toString(),
                            total_payload_fee.toString(),
                            total_freezing_fee.toString(),
                            total_fee.toString(),
                        ],
                        conn
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return new Promise<void>(async (resolve, reject) => {
            let total_tx_fee: JSBI = JSBI.BigInt(0);
            let total_payload_fee: JSBI = JSBI.BigInt(0);
            let total_freezing_fee: JSBI = JSBI.BigInt(0);
            let total_fee: JSBI = JSBI.BigInt(0);
            let sum: JSBI = JSBI.BigInt(0);

            if (Number(block.txs.length) === 0) {
                return resolve();
            }
            for (let tx_idx = 0; tx_idx < block.txs.length; tx_idx++) {
                if (!block.txs[tx_idx].isCoinbase()) {
                    const fees = await this.getTransactionFee(block.txs[tx_idx]);
                    sum = JSBI.add(sum, JSBI.divide(fees[1], JSBI.BigInt(block.txs[tx_idx].getNumberOfBytes())));
                    total_tx_fee = JSBI.add(total_tx_fee, fees[1]);
                    total_payload_fee = JSBI.add(total_payload_fee, fees[2]);
                    total_freezing_fee = JSBI.add(total_freezing_fee, fees[3]);
                    total_fee = JSBI.add(total_fee, fees[0]);
                }
            }
            const average_tx_fee = JSBI.divide(sum, JSBI.BigInt(block.txs.length));
            const newEntry = await this.applyGranularity(block.header.time_offset + this.genesis_timestamp);
            if (newEntry.length > 0) {
                for (let index = 0; index < newEntry.length; index++) {
                    await save_fee(
                        this,
                        block.header.height,
                        newEntry[index].time_stamp,
                        newEntry[index].granularity,
                        block.header.time_offset + this.genesis_timestamp,
                        average_tx_fee,
                        total_tx_fee,
                        total_payload_fee,
                        total_freezing_fee,
                        total_fee
                    );
                }
            }
            resolve();
        });
    }
    /**
     * Apply a scale on data on every block recieved.
     * @param time_stamp
     * @returns
     */
    public async applyGranularity(time_stamp: number) {
        const granularityArray = ["H", "D", "M", "Y"];
        const date = moment(time_stamp * 1000);
        const newEntry: any = [];
        for (let index = 0; index < granularityArray.length; index++) {
            const element = granularityArray[index];
            const unit = date.startOf(element as moment.unitOfTime.StartOf).utc();
            newEntry.push({ time_stamp: unit.unix(), granularity: granularityArray[index] });
            if (index === granularityArray.length - 1) {
                return newEntry;
            }
        }
    }

    /**
     * Gets a block data
     * @param height the height of the block to get
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getBlock(height: Height): Promise<any[]> {
        const sql = `SELECT
            height, hash, prev_block, validators, merkle_root, signature,
            tx_count, enrollment_count, time_offset, time_stamp
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
            const sql = `SELECT MAX(height) as height FROM blocks`;
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
     * Get the height corresponding to to the block creation time
     * @param time_stamp The time to get block height
     * @returns If it already exists in the block,
     * it returns the height of the block and,
     * if the block has not yet been created,
     * it returns the estimated height is returned.
     */
    public getEstimatedBlockHeight(time_stamp: number): Promise<Height | null> {
        return new Promise<Height | null>((resolve, reject) => {
            const sql = `SELECT
                    height, time_stamp
                FROM
                    blocks
                WHERE
                    time_stamp < ?
                ORDER BY height DESC
                LIMIT 1`;
            this.query(sql, [time_stamp])
                .then((rows: any[]) => {
                    if (rows.length === 0) resolve(null);
                    else {
                        const period = 10 * 60; // 10 minutes
                        const additional_height = Math.floor((time_stamp - rows[0].time_stamp) / period);
                        const estimated_height = new Height(JSBI.BigInt(rows[0].height + additional_height));
                        resolve(estimated_height);
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Puts all enrollments
     * @param block: The instance of the `Block`
     * @param connection Use this if it are providing a db connection.
     */
    public putEnrollments(block: Block, conn?: mysql.PoolConnection): Promise<void> {
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
                        (block_height, enrollment_index, utxo_key, commitment, enroll_sig)
                    VALUES
                        (?, ?, ?, ?, ?)`,
                        [
                            height.toString(),
                            enroll_idx,
                            enroll.utxo_key.toBinary(Endian.Little),
                            enroll.commitment.toBinary(Endian.Little),
                            enroll.enroll_sig.toBinary(Endian.Little),
                        ],
                        conn
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
                    .query(
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
                        ],
                        conn
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
     * Puts the pre-images of the block header.
     * @param block: The instance of the `Block`
     * @param connection Use this if it are providing a db connection.
     */
    public putPreimages(block: Block, conn?: mysql.PoolConnection): Promise<void> {
        function save_preimage(
            storage: LedgerStorage,
            height: Height,
            utxo_key: Hash,
            preimage_hash: Hash,
            address: string
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO preimages
                        (block_height, utxo_key, preimage_hash, address)
                    VALUES
                        (?, ?, ?, ?)`,
                        [
                            height.toString(),
                            utxo_key.toBinary(Endian.Little),
                            preimage_hash.toBinary(Endian.Little),
                            address.toString(),
                        ],
                        conn
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err: any) => {
                        reject(err);
                    });
            });
        }

        function getBlockPreimages(storage: LedgerStorage, height: JSBI, utxo_key: Hash): Promise<any[]> {
            const sql = `SELECT
                            block_height,
                            utxo_key,
                            preimage_hash,
                            address
                        FROM
                            preimages
                        WHERE
                            block_height = ? AND utxo_key = ?
                        ORDER BY utxo_key ASC`;

            return storage.query(sql, [height.toString(), utxo_key.toBinary(Endian.Little)], conn);
        }

        function updateValidatorSlashing(storage: LedgerStorage, height: Height, utxo_key: Hash, enrolled_at: Height) {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `UPDATE validators
                            SET slashed = ? ,
                            slashed_height = ?
                            WHERE utxo_key = ? AND enrolled_at = ?`,
                        [
                            ValidatorStatus.SLASHED,
                            height.value.toString(),
                            utxo_key.toBinary(Endian.Little),
                            enrolled_at,
                        ],
                        conn
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
                if (JSBI.equal(block.header.height.value, JSBI.BigInt(0))) {
                    resolve();
                    return;
                }
                const validators: any[] = await this.getValidatorsAPI(block.header.height, null, conn);
                if (block.header.preimages.length !== block.header.validators.length) {
                    logger.error("The number of validators and the number of pre-images do not match.", {
                        operation: Operation.block_sync,
                        height: block.header.height.toString(),
                        status: Status.Error,
                        responseTime: Number(moment().utc().unix() * 1000),
                    });
                    resolve();
                    return;
                }

                for (let idx = 0; idx < block.header.preimages.length; idx++) {
                    try {
                        if (block.header.preimages[idx].isNull()) {
                            await updateValidatorSlashing(
                                this,
                                new Height(block.header.height.value),
                                new Hash(validators[idx].utxo_key, Endian.Little),
                                validators[idx].enrolled_at
                            );
                        } else {
                            const pre_preimage: any[] = await getBlockPreimages(
                                this,
                                JSBI.subtract(block.header.height.value, JSBI.BigInt(1)),
                                new Hash(validators[idx].utxo_key, Endian.Little)
                            );

                            // Compare hashing the previous block pre-images with the pre-images
                            if (
                                pre_preimage.length > 0 &&
                                block.header.height.value >= validators[idx].enrolled_at + 2
                            ) {
                                const pre_preimage_hash: Hash = new Hash(pre_preimage[0].preimage_hash, Endian.Little);
                                const preimage_hash: Hash = hashFull(block.header.preimages[idx]);
                                if (!Hash.equal(pre_preimage_hash, preimage_hash)) {
                                    logger.error("Verification failed of the previous pre-image and the pre-image.", {
                                        operation: Operation.block_sync,
                                        height: block.header.height.toString(),
                                        status: Status.Error,
                                        responseTime: Number(moment().utc().unix() * 1000),
                                    });
                                    resolve();
                                    break;
                                }
                            }
                            await save_preimage(
                                this,
                                block.header.height,
                                new Hash(validators[idx].utxo_key, Endian.Little),
                                block.header.preimages[idx],
                                validators[idx].address
                            );
                        }
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
     * Update a blockHeader
     * The blockheader can have signatures from validators
     * added even after the block has been externalized.
     */
    public updateBlockHeader(block_header: BlockHeader): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.query(
                `UPDATE blocks
                    SET validators = ?,
                        signature = ?
                    WHERE
                        height = ?`,
                [
                    block_header.validators.toString(),
                    block_header.signature.toBinary(Endian.Little),
                    block_header.height.toString(),
                ]
            )
                .then((result: any) => {
                    resolve(result.affectedRows);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Puts a block header updated history to database
     * @param block a block header data
     * @param conn Use this if it are providing a db connection.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putBlockHeaderHistory(
        header: BlockHeader,
        current_height: Height,
        conn?: mysql.PoolConnection
    ): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            // That's not gonna happen. Check if the hash changes.
            const hash = hashFull(header);
            this.query(
                `INSERT INTO blocks_header_updated_history
                        (block_height, current_height, signature, hash, validators, updated_time)
                    VALUES
                        (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                         block_height = VALUES(block_height),
                         signature = VALUES(signature),
                         updated_time = VALUES(updated_time)`,
                [
                    header.height.toString(),
                    current_height.toString(),
                    header.signature.toBinary(Endian.Little),
                    hash.toBinary(Endian.Little),
                    header.validators.toString(),
                    moment().unix(),
                ],
                conn
            )
                .then((result: any) => {
                    resolve(result.affectedRows);
                })
                .catch((err) => {
                    reject(err);
                });
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
        const sql = `SELECT
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
     * @param conn Use this if it are providing a db connection.
     */
    public putMerkleTree(block: Block, conn?: mysql.PoolConnection): Promise<void> {
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
                        [height.toString(), merkle_index, merkle_hash.toBinary(Endian.Little)],
                        conn
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
     * Put BOA Account Stats.
     * @param block: The instance of the `Block`
     * @param conn Use this if it are providing a db connection.
     */
    public putAccountStats(block: Block, conn?: mysql.PoolConnection): Promise<void> {
        function save_stats(
            storage: LedgerStorage,
            address: string,
            accountInfo: IAccountInformation,
            received_amount: JSBI,
            sent_amount: JSBI,
            height: Height,
            time_stamp: number
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO accounts
                            (address, tx_count, total_received, total_sent, total_reward, total_frozen, total_spendable, total_balance, last_updated_at)
                        VALUES
                            (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                                    address = VALUES(address),
                                    tx_count = IF(last_updated_at = VALUES(last_updated_at), tx_count, (tx_count + VALUES(tx_count))),
                                    total_received = total_received + VALUES(total_received),
                                    total_sent = total_sent + VALUES(total_sent),
                                    total_reward = VALUES(total_reward),
                                    total_frozen = VALUES(total_frozen),
                                    total_spendable = VALUES(total_spendable),
                                    total_balance = VALUES(total_balance),
                                    last_updated_at = VALUES(last_updated_at)
                        `,
                        [
                            address,
                            accountInfo.tx_count,
                            received_amount.toString(),
                            sent_amount.toString(),
                            accountInfo.total_reward.toString(),
                            accountInfo.total_frozen.toString(),
                            accountInfo.total_spendable.toString(),
                            accountInfo.total_balance.toString(),
                            height.value.toString(),
                        ],
                        conn
                    )
                    .then(async () => {
                        const newEntry = await storage.applyGranularity(time_stamp);
                        if (newEntry.length > 0) {
                            for (let index = 0; index < newEntry.length; index++) {
                                await save_account_history(
                                    storage,
                                    address,
                                    height,
                                    time_stamp,
                                    accountInfo.total_balance.toString(),
                                    newEntry[index].time_stamp,
                                    newEntry[index].granularity
                                );
                            }
                        }
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function save_account_history(
            storage: LedgerStorage,
            address: string,
            height: Height,
            time_stamp: number,
            balance: string,
            granularity_time_stamp: number,
            granularity: string
        ) {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO account_history
                        ( address, block_height, time_stamp, granularity_time_stamp, granularity, balance)
                    VALUES
                        (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY
                    UPDATE
                        balance = VALUES(balance),
                        time_stamp = VALUES(time_stamp),
                        block_height = VALUES(block_height)`,
                        [
                            address,
                            height.value.toString(),
                            time_stamp.toString(),
                            granularity_time_stamp.toString(),
                            granularity.toString(),
                            balance.toString(),
                        ],
                        conn
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function getTXStats(storage: LedgerStorage, tx_hash: Hash) {
            const hash = tx_hash.toBinary(Endian.Little);
            const sql_sender = `
                      SELECT
                          S.address,
                          SUM(IFNULL(S.amount,0)) as amount
                      FROM
                          blocks B
                          INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?)
                          INNER JOIN tx_inputs I ON (T.tx_hash = I.tx_hash)
                          INNER JOIN tx_outputs S ON (I.utxo = S.utxo_key AND (S.address IS NOT NULL OR S.address != ''))
                          GROUP BY address`;

            const sql_receiver = `
                       SELECT
                           O.address,
                           SUM(IFNULL(O.amount,0)) as amount
                       FROM
                           blocks B
                           INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?)
                           INNER JOIN tx_outputs O ON (T.tx_hash = O.tx_hash AND (O.address IS NOT NULL OR O.address != ''))
                           GROUP BY address;`;

            return new Promise<any[]>((resolve, reject) => {
                const result: any = {};
                storage
                    .query(sql_sender, hash, conn)
                    .then((rows: any[]) => {
                        result.senders = rows;
                        return storage.query(sql_receiver, [hash], conn);
                    })
                    .then((rows: any[]) => {
                        result.receivers = rows;
                        resolve(result);
                    })
                    .catch(reject);
            });
        }

        return new Promise<void>((resolve, reject) => {
            (async () => {
                const block_transactions = `SELECT
	                                        T.block_height, T.tx_hash, T.tx_fee, T.tx_size, B.time_stamp
                                          From
                                             blocks B INNER JOIN transactions T ON(B.height = T.block_height)
                                          Where B.height = ?`;

                this.query(block_transactions, [block.header.height.value.toString()], conn)
                    .then(async (rows: any[]) => {
                        let senders = [];
                        let receivers = [];
                        let total_received = JSBI.BigInt(0);
                        let total_sent = JSBI.BigInt(0);

                        for (let tx_index = 0; tx_index < rows.length; tx_index++) {
                            const hash = new Hash(rows[tx_index].tx_hash, Endian.Little);
                            const txStats: any = await getTXStats(this, hash);

                            senders = txStats.senders;
                            receivers = txStats.receivers;

                            for (let sender_index = 0; sender_index < senders.length; sender_index++) {
                                for (let receiver_index = 0; receiver_index < receivers.length; receiver_index++) {
                                    if (!senders.length || !receivers.length) {
                                        break;
                                    }
                                    if (senders[sender_index].address === receivers[receiver_index].address) {
                                        if (
                                            JSBI.LT(
                                                JSBI.BigInt(senders[sender_index].amount),
                                                JSBI.BigInt(receivers[receiver_index].amount)
                                            )
                                        ) {
                                            total_received = JSBI.subtract(
                                                JSBI.BigInt(receivers[receiver_index].amount),
                                                JSBI.BigInt(senders[sender_index].amount)
                                            );
                                        } else {
                                            total_sent = JSBI.subtract(
                                                JSBI.BigInt(senders[sender_index].amount),
                                                JSBI.BigInt(receivers[receiver_index].amount)
                                            );
                                        }
                                        const accountInfo = await this.getAccountInfo(
                                            block.header.height,
                                            senders[sender_index].address,
                                            conn
                                        );
                                        await save_stats(
                                            this,
                                            senders[sender_index].address,
                                            accountInfo,
                                            total_received,
                                            total_sent,
                                            block.header.height,
                                            block.header.time_offset + this.genesis_timestamp
                                        );
                                        senders.splice(sender_index, 1);
                                        receivers.splice(receiver_index, 1);
                                    }
                                }
                            }
                            for (let receiver_index = 0; receiver_index < receivers.length; receiver_index++) {
                                const accountInfo = await this.getAccountInfo(
                                    block.header.height,
                                    receivers[receiver_index].address,
                                    conn
                                );
                                await save_stats(
                                    this,
                                    receivers[receiver_index].address,
                                    accountInfo,
                                    receivers[receiver_index].amount,
                                    JSBI.BigInt(0),
                                    block.header.height,
                                    block.header.time_offset + this.genesis_timestamp
                                );
                            }
                            for (let sender_index = 0; sender_index < senders.length; sender_index++) {
                                const accountInfo = await this.getAccountInfo(
                                    block.header.height,
                                    senders[sender_index].address,
                                    conn
                                );
                                await save_stats(
                                    this,
                                    senders[sender_index].address,
                                    accountInfo,
                                    JSBI.BigInt(0),
                                    senders[sender_index].amount,
                                    block.header.height,
                                    block.header.time_offset + this.genesis_timestamp
                                );
                            }
                        }
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            })();
        });
    }

    /**
     * Puts merkle tree
     * @param block: The instance of the `Block`
     * @param conn Use this if it are providing a db connection.
     */
    public putBlockstats(block: Block, conn?: mysql.PoolConnection): Promise<void> {
        function save_blockstats(
            storage: LedgerStorage,
            height: Height,
            total_sent: JSBI,
            total_received: JSBI,
            total_size: JSBI,
            total_fee: JSBI,
            total_reward: JSBI,
            circulating_supply: JSBI
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO blocks_stats
                        (block_height, total_sent, total_received, total_size, total_fee,total_reward, circulating_supply)
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            height.toString(),
                            total_sent.toString(),
                            total_received.toString(),
                            total_size.toString(),
                            total_fee.toString(),
                            total_reward.toString(),
                            circulating_supply.toString(),
                        ],
                        conn
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
                let circulating_supply = JSBI.BigInt(0);
                let total_utxo = JSBI.BigInt(0);
                let total_common_budget_balance = JSBI.BigInt(0);
                let total_reward = JSBI.BigInt(0);
                let total_sent = JSBI.BigInt(0);
                let total_fee = JSBI.BigInt(0);
                let total_size = JSBI.BigInt(0);
                const total_received_sql = `SELECT
                                                IFNULL(SUM(IFNULL(O.amount,0)),0) as total_amount,
                                                O.type
                                                FROM
                                                tx_outputs O
                                                    INNER JOIN blocks B ON (O.block_height = B.height)
                                                WHERE
                                                    block_height = ?;`;
                const transaction_stats = `SELECT
                                                IFNULL(SUM(IFNULL(T.tx_fee,0)),0) as tx_fee,
                                                IFNULL(SUM(IFNULL(T.payload_fee,0)),0) as payload_fee
                                            FROM
                                            transactions T
                                                Inner join blocks B ON (T.block_height = B.height)
                                            WHERE
                                                block_height =?;`;

                const get_sum_utxos_sql = `SELECT SUM(amount) as total_utxo FROM utxos`;

                this.query(total_received_sql, [block.header.height.toString()], conn)
                    .then((row: any) => {
                        switch (row[0].type) {
                            case OutputType.Coinbase: {
                                total_reward = JSBI.BigInt(row[0].total_amount);
                                break;
                            }
                            default: {
                                total_received = JSBI.BigInt(row[0].total_amount);
                                break;
                            }
                        }
                        return this.query(get_sum_utxos_sql, [], conn);
                    })
                    .then(async (row: any[]) => {
                        if (row[0]) {
                            total_utxo = JSBI.BigInt(row[0].total_utxo);
                            let excludedAddresses: string[];
                            if (this.excluded_addresses !== undefined) {
                                excludedAddresses = this.excluded_addresses;
                            } else {
                                excludedAddresses = [];
                            }
                            await Promise.all(
                                excludedAddresses.map(async (elem: string) => {
                                    const balance: any = await this.getWalletBalance(elem.toString(), conn);
                                    if (balance[0]) {
                                        total_common_budget_balance = JSBI.add(
                                            total_common_budget_balance,
                                            JSBI.BigInt(balance[0].balance)
                                        );
                                    }
                                })
                            );
                        }
                        return this.query(transaction_stats, [block.header.height.toString()], conn);
                    })
                    .then((row: any) => {
                        total_fee = JSBI.ADD(JSBI.BigInt(row[0].tx_fee), JSBI.BigInt(row[0].payload_fee));
                        total_size = JSBI.BigInt(block.getNumberOfBytes());
                        total_sent = JSBI.ADD(total_received, total_fee);
                        circulating_supply = JSBI.subtract(total_utxo, total_common_budget_balance);
                        save_blockstats(
                            this,
                            block.header.height,
                            total_sent,
                            total_received,
                            total_size,
                            total_fee,
                            total_reward,
                            circulating_supply
                        );
                        resolve();
                    });
            })();
        });
    }

    /**
     * Puts the average of disparity from the calculated transaction fee.
     * @param block: The instance of the `Block`
     * @param conn Use this if it are providing a db connection.
     */
    public putFeeDisparity(block: Block, conn?: mysql.PoolConnection): Promise<void> {
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
            this.query(select_sql, [start.toString(), end.toString()], conn)
                .then((rows: any[]) => {
                    const insert_sql = `INSERT INTO fee_mean_disparity (height, disparity) VALUES (?, ?);`;
                    return this.query(
                        insert_sql,
                        [end.toString(), FeeManager.calculateTrimmedMeanDisparity(rows.map((m) => m.disparity))],
                        conn
                    );
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
    public getFeeMeanDisparity(block_height: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const sql = `SELECT disparity FROM fee_mean_disparity ORDER BY height DESC LIMIT 1;`;
            const tx_delay = `SELECT tx_time, tx_size, tx_fee, block_time
                                FROM fee_stats
                                ORDER BY block_time DESC
                                LIMIT 100;`;
            let result: any = {};
            this.query(sql, [])
                .then(async (rows: any[]) => {
                    if (rows.length > 0) {
                        result.disparity = rows[0].disparity;
                        if (block_height > 100) {
                            let fee_rows = await this.query(tx_delay, []);
                            let delays: any = [];
                            fee_rows.map((elem) => {
                                let tx_delay = bigDecimal.subtract(elem.block_time, elem.tx_time);
                                delays.push(tx_delay);
                            });
                            result.low_delay = Math.max(...delays);
                            result.high_delay = Math.min(...delays);
                            let medium = delays.reduce((a: any, b: any) => bigDecimal.add(a, b), 0);
                            result.medium_delay = Number(bigDecimal.divide(medium, delays.length, 0));
                        }
                        resolve(result);
                    } else {
                        resolve(0);
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /* Get the detail for an account
     * @param address
     * @param conn Use this if it are providing a db connection.
     * @returns  Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public async getAccountInfo(
        height: Height,
        address: string,
        conn?: mysql.PoolConnection
    ): Promise<IAccountInformation> {
        return new Promise<IAccountInformation>(async (resolve, reject) => {
            const utxo_array: UnspentTxOutput[] = [];
            await this.getUTXO(address, conn)
                .then((rows: any[]) => {
                    for (const row of rows) {
                        const utxo: UnspentTxOutput = new UnspentTxOutput(
                            new Hash(row.utxo, Endian.Little),
                            row.type,
                            JSBI.BigInt(row.unlock_height),
                            Amount.make(row.amount),
                            JSBI.BigInt(row.block_height)
                        );
                        utxo_array.push(utxo);
                    }
                })
                .catch((err) => {
                    reject(err);
                });
            const total_txs = await this.getTxCount(height, address, conn);
            const accountInfo: IAccountInformation = {
                total_balance: JSBI.BigInt(0),
                total_spendable: JSBI.BigInt(0),
                total_frozen: JSBI.BigInt(0),
                total_reward: JSBI.BigInt(0),
                tx_count: total_txs[0].tx_count ? total_txs[0].tx_count : 0,
            };
            utxo_array.map((elem) => {
                switch (elem.type) {
                    case OutputType.Payment: {
                        accountInfo.total_spendable = JSBI.add(accountInfo.total_spendable, elem.amount.value);
                        break;
                    }
                    case OutputType.Freeze: {
                        accountInfo.total_frozen = JSBI.add(accountInfo.total_frozen, elem.amount.value);
                        break;
                    }
                    case OutputType.Coinbase: {
                        accountInfo.total_reward = JSBI.add(accountInfo.total_reward, elem.amount.value);
                        break;
                    }
                    default: {
                        break;
                    }
                }
            });
            accountInfo.total_balance = JSBI.add(
                JSBI.add(accountInfo.total_spendable, accountInfo.total_frozen),
                accountInfo.total_reward
            );
            accountInfo.total_spendable = JSBI.add(accountInfo.total_spendable, accountInfo.total_reward);
            return resolve(accountInfo);
        });
    }

    /**
     * Update a preImage to database
     */
    public updatePreImage(pre_image: PreImageInfo): Promise<number> {
        const enroll_key = pre_image.utxo.toBinary(Endian.Little);
        return new Promise<number>((resolve, reject) => {
            this.query(
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
                        WHERE utxo_key = ?
                            AND ? < (block_height + ?)
                        ORDER BY block_height ASC
                        LIMIT 1)
                    AND ? > validators.preimage_height`,
                [
                    pre_image.height.toString(),
                    pre_image.hash.toBinary(Endian.Little),
                    enroll_key,
                    enroll_key,
                    enroll_key,
                    pre_image.height.toString(),
                    this.validator_cycle,
                    pre_image.height.toString(),
                ]
            )
                .then((result: any) => {
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
        return new Promise<void>(async (resolve, reject) => {
            const sql = `INSERT IGNORE INTO marketcap (last_updated_at, currency, price, market_cap, change_24h, vol_24h)
            VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.query(sql, [
                data.last_updated_at,
                data.currency,
                data.price,
                data.market_cap,
                data.change_24h,
                data.vol_24h,
            ])
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
        const sql = `SELECT
            block_height, enrollment_index, utxo_key, commitment, enroll_sig
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
        const sql = `SELECT
            enrolled_at, utxo_key, address, amount, preimage_height, preimage_hash
        FROM
            validators
        WHERE enrolled_at = ?`;
        return this.query(sql, [height.toString()]);
    }

    public getTransactionFee(tx: Transaction): Promise<[JSBI, JSBI, JSBI, JSBI]> {
        return new Promise<[JSBI, JSBI, JSBI, JSBI]>((resolve, reject) => {
            if (tx.inputs.length === 0) {
                resolve([JSBI.BigInt(0), JSBI.BigInt(0), JSBI.BigInt(0), JSBI.BigInt(0)]);
                return;
            }

            const utxo = tx.inputs.map((m) => `x'${m.utxo.toBinary(Endian.Little).toString("hex")}'`);

            const sql = `SELECT
                    O.type, O.amount
                FROM
                    utxos O
                WHERE
                    O.utxo_key in (${utxo.join(",")});`;

            this.query(sql, [])
                .then((rows: any) => {
                    if (rows.length > 0) {
                        let SumOfInput = JSBI.BigInt(0);
                        for (const row of rows) {
                            SumOfInput = JSBI.add(SumOfInput, JSBI.BigInt(row.amount));
                            if (row.type === OutputType.Freeze)
                                SumOfInput = JSBI.add(SumOfInput, Constant.SlashPenaltyAmount.value);
                        }
                        let SumOfOutput = JSBI.BigInt(0);
                        let freezing_fee = JSBI.BigInt(0);
                        for (const output of tx.outputs) {
                            SumOfOutput = JSBI.add(SumOfOutput, output.value.value);
                            if (output.type === OutputType.Freeze)
                                freezing_fee = JSBI.add(freezing_fee, Constant.SlashPenaltyAmount.value);
                        }

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
                            tx_fee = JSBI.subtract(total_fee, JSBI.add(payload_fee, freezing_fee));
                        }

                        resolve([total_fee, tx_fee, payload_fee, freezing_fee]);
                    } else {
                        resolve([JSBI.BigInt(0), JSBI.BigInt(0), JSBI.BigInt(0), JSBI.BigInt(0)]);
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
     * @param conn Use this if it are providing a db connection.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putTransactions(block: Block, conn?: mysql.PoolConnection): Promise<void> {
        function update_fee_stats(storage: LedgerStorage, tx_hash: Hash, block_time: number): Promise<void> {
            return new Promise<void>(async (resolve, reject) => {
                storage
                    .query(
                        `UPDATE fee_stats
                        SET block_time = ?
                        where tx_hash = ?`,
                        [block_time, tx_hash.toBinary(Endian.Little)],
                        conn
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        function save_transaction(
            storage: LedgerStorage,
            height: Height,
            tx_idx: number,
            hash: Hash,
            tx: Transaction
        ): Promise<void> {
            return new Promise<void>(async (resolve, reject) => {
                const fees = await storage.getTransactionFee(tx);
                const tx_size = tx.getNumberOfBytes();
                const calculated_fee = FeeManager.getTxFee(tx_size, 0)[1];

                let unlock_height_query: string;
                if (tx.isPayment() && tx.inputs.length > 0) {
                    const utxo = tx.inputs.map((m) => `x'${m.utxo.toBinary(Endian.Little).toString("hex")}'`);

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
                    .query(
                        `INSERT INTO transactions
                        (block_height, tx_index, tx_hash, type, unlock_height, lock_height, tx_fee, payload_fee, freezing_fee, tx_size, calculated_tx_fee, inputs_count, outputs_count, payload_size)
                    VALUES
                        (?, ?, ?, ?, ${unlock_height_query}, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            height.toString(),
                            tx_idx,
                            hash.toBinary(Endian.Little),
                            tx_type,
                            tx.lock_height.toString(),
                            fees[1].toString(),
                            fees[2].toString(),
                            fees[3].toString(),
                            tx_size,
                            calculated_fee,
                            tx.inputs.length,
                            tx.outputs.length,
                            tx.payload.length,
                        ],
                        conn
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
                    .query(
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
                        ],
                        conn
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
                    .query(`DELETE FROM utxos WHERE utxo_key = ?`, [input.utxo.toBinary(Endian.Little)], conn)
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
                const address: string = output.lock.type === 0 ? new PublicKey(output.lock.bytes).toString() : "";

                storage
                    .query(
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
                        ],
                        conn
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
                    const utxo = tx.inputs.map((m) => `x'${m.utxo.toBinary(Endian.Little).toString("hex")}'`);

                    const sql = `SELECT
                            count(*) as count
                        FROM
                            utxos O
                        WHERE
                            O.type = 1
                            AND O.utxo_key in (${utxo.join(",")})
                        `;

                    storage
                        .query(sql, [], conn)
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
                const address: string = output.lock.type === 0 ? new PublicKey(output.lock.bytes).toString() : "";

                let unlock_height: JSBI;
                if (melting && address !== TxPayloadFee.CommonsBudgetAddress) {
                    unlock_height = JSBI.add(height.value, JSBI.BigInt(2016));
                } else {
                    unlock_height = JSBI.add(height.value, JSBI.BigInt(1));
                }

                storage
                    .query(
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
                        ],
                        conn
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
                if (tx.payload.length === 0) resolve();

                storage
                    .query(
                        `INSERT INTO payloads
                        (tx_hash, payload)
                    VALUES
                        (?, ?)`,
                        [tx_hash.toBinary(Endian.Little), tx.payload],
                        conn
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
                        const melting = await is_melting(this, block.txs[tx_idx]);
                        await update_fee_stats(
                            this,
                            block.merkle_tree[tx_idx],
                            block.header.time_offset + this.genesis_timestamp
                        );
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
                            const utxo_key = makeUTXOKey(block.merkle_tree[tx_idx], JSBI.BigInt(out_idx));
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
     * @param conn MySQL pool connection
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putTransactionPool(tx: Transaction): Promise<number> {
        function save_fee_stats(
            storage: LedgerStorage,
            tx: Transaction,
            hash: Hash,
            conn: mysql.PoolConnection
        ): Promise<Boolean> {
            return new Promise<Boolean>(async (resolve, reject) => {
                const fees = await storage.getTransactionFee(tx);
                const tx_size = tx.getNumberOfBytes();
                storage
                    .query(
                        `INSERT IGNORE INTO fee_stats
                        (tx_hash, tx_time, tx_size, tx_fee)
                    VALUES
                        (?, ?, ?, ?)`,
                        [hash.toBinary(Endian.Little), moment().utc().unix(), tx_size, fees[1].toString()],
                        conn
                    )
                    .then((result: any) => {
                        resolve(true);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function save_transaction_pool(
            storage: LedgerStorage,
            tx: Transaction,
            hash: Hash,
            conn: mysql.PoolConnection
        ): Promise<number> {
            return new Promise<number>(async (resolve, reject) => {
                const fees = await storage.getTransactionFee(tx);
                const tx_size = tx.getNumberOfBytes();

                let tx_type: number;
                if (tx.isFreeze()) tx_type = OutputType.Freeze;
                else if (tx.isCoinbase()) tx_type = OutputType.Coinbase;
                else tx_type = OutputType.Payment;

                storage
                    .query(
                        `INSERT INTO transaction_pool
                        (tx_hash, type, payload, lock_height, received_height, time, tx_fee, payload_fee, freezing_fee, tx_size)
                    VALUES
                        (?, ?, ?, ?, (SELECT IFNULL(MAX(height), 0) as height FROM blocks), ?, ?, ?, ?, ?)`,
                        [
                            hash.toBinary(Endian.Little),
                            tx_type,
                            tx.payload,
                            tx.lock_height.toString(),
                            moment().utc().unix(),
                            fees[1].toString(),
                            fees[2].toString(),
                            fees[3].toString(),
                            tx_size,
                        ],
                        conn
                    )
                    .then((result: any) => {
                        resolve(result.affectedRows);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function save_input_pool(
            storage: LedgerStorage,
            hash: Hash,
            in_idx: number,
            input: TxInput,
            conn: mysql.PoolConnection
        ): Promise<number> {
            return new Promise<number>((resolve, reject) => {
                storage
                    .query(
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
                        ],
                        conn
                    )
                    .then((result: any) => {
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
            output: TxOutput,
            conn: mysql.PoolConnection
        ): Promise<number> {
            return new Promise<number>((resolve, reject) => {
                const address: string = output.lock.type === 0 ? new PublicKey(output.lock.bytes).toString() : "";

                storage
                    .query(
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
                        ],
                        conn
                    )
                    .then((result: any) => {
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

                let conn: mysql.PoolConnection;
                try {
                    conn = await this.getConnection();
                } catch (err) {
                    return reject(err);
                }

                try {
                    await this.begin(conn);

                    // Remove pending transactions using the same input.
                    await this.transaction_pool.remove(conn, tx, true);
                    await this.transaction_pool.add(conn, tx);

                    const hash = hashFull(tx);
                    tx_changes = await save_transaction_pool(this, tx, hash, conn);
                    if (tx_changes !== 1) throw new Error("Failed to save a transaction.");

                    for (let in_idx = 0; in_idx < tx.inputs.length; in_idx++) {
                        in_changes = await save_input_pool(this, hash, in_idx, tx.inputs[in_idx], conn);
                        if (in_changes !== 1) throw new Error("Failed to save a input on transactionPool.");
                    }

                    for (let out_idx = 0; out_idx < tx.outputs.length; out_idx++) {
                        out_changes = await save_output_pool(this, hash, out_idx, tx.outputs[out_idx], conn);
                        if (out_changes !== 1) throw new Error("Failed to save a output on transactionPool.");
                    }
                    await save_fee_stats(this, tx, hash, conn);

                    await this.commit(conn);
                    return resolve(tx_changes);
                } catch (err) {
                    await this.rollback(conn);
                    return reject(err);
                } finally {
                    conn.release();
                }
            })();
        });
    }

    /**
     * Returns UTXO's address about the UTXO hash array.
     * @param utxos The array of UTXO hash
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the array of UTXO
     * and if an error occurs the `.catch` is called with an error.
     */
    public getAddressesOfUTXOs(utxos: Hash[]) {
        const u = utxos.map((m) => `x'${m.toBinary(Endian.Little).toString("hex")}'`);
        const sql_utxo = `SELECT
                DISTINCT O.address
            FROM
                tx_outputs O
            WHERE
                O.utxo_key in (${u.join(",")})
                AND address != ''`;
        return new Promise<any[]>((resolve, reject) => {
            this.query(sql_utxo, [])
                .then((result: any[]) => {
                    return resolve(result);
                })
                .catch(reject);
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
        const sql = `SELECT
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
        const sql = `SELECT
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
        const sql = `SELECT
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
        const sql = `SELECT
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
        const sql = `SELECT
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
    public getValidatorsAPI(
        height: Height | null,
        address: string | null,
        conn: mysql.PoolConnection | undefined = undefined,
        limit?: number | undefined,
        page?: number | undefined
    ): Promise<any[]> {
        let cur_height: string;

        const LIMIT_QUERY = limit ? (page ? `LIMIT ${limit} OFFSET ${limit * (page - 1)}` : "") : "";
        if (height !== null) cur_height = height.toString();
        else cur_height = `(SELECT MAX(height) as height FROM blocks)`;

        let sql =
            `SELECT V.address,
                V.enrolled_at,
                V.utxo_key,
                V.utxo_key as stake,
                V.amount as stake_amount,
                V.slashed,
                V.slashed_height,
                P.block_height,
                P.block_height as preimage_height,
                P.preimage_hash,
                V.slashed,
                ` +
            cur_height +
            ` as height,
            count(*) OVER() AS full_count
            FROM validators V
            LEFT OUTER JOIN preimages P
            ON V.utxo_key = P.utxo_key
            AND ` +
            cur_height +
            ` = P.block_height
            WHERE (V.slashed_height is null OR V.slashed_height >= ` +
            cur_height +
            `)
            AND V.enrolled_at >= (` +
            cur_height +
            ` - ?)
            AND V.enrolled_at < ` +
            cur_height;

        if (address != null) sql += ` AND V.address = '` + address + `'`;

        sql += ` ORDER BY V.utxo_key ASC `;
        sql += LIMIT_QUERY;

        return this.query(sql, [this.validator_cycle], conn);
    }

    /**
     * Puts the height of the block to database
     * @param height The height of the block
     * @param conn Use this if it are providing a db connection.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public putBlockHeight(height: Height, conn?: mysql.PoolConnection): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const sql = `INSERT INTO information (keyname, value) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE keyname = VALUES(keyname) , value = VALUES(value);`;
            this.query(sql, ["height", height.toString()], conn)
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Saving Proposal fee
     * @param block: The instance of the `Block`
     * @param conn Use this if it are providing a db connection.
     */
    public putProposals(block: Block, conn?: mysql.PoolConnection) {
        function save_proposal_fee(
            storage: LedgerStorage,
            block_height: Height,
            tx_hash: Hash,
            proposal_id: string
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO proposal_fee
                        (proposal_id, block_height, tx_hash)
                    VALUES
                        (?, ?, ?)`,
                        [proposal_id, block_height.value, tx_hash.toBinary(Endian.Little)]
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function save_proposal_data(
            storage: LedgerStorage,
            block_height: Height,
            tx_hash: Hash,
            proposalData: ProposalData
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT IGNORE INTO proposal
                        (proposal_id, block_height, tx_hash, app_name,
                         proposal_type, proposal_title, vote_start_height, vote_end_height, doc_hash,
                         fund_amount, proposal_fee, vote_fee, proposal_fee_tx_hash, proposer_address,
                         proposal_fee_address, proposal_status, data_collection_status, proposal_result)
                         VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            proposalData.proposal_id,
                            block_height.value.toString(),
                            tx_hash.toBinary(Endian.Little),
                            proposalData.app_name,
                            proposalData.proposal_type.toString(),
                            proposalData.proposal_title,
                            proposalData.vote_start_height.toString(),
                            proposalData.vote_end_height.toString(),
                            proposalData.doc_hash.toBinary(Endian.Little),
                            proposalData.fund_amount.toString(),
                            proposalData.proposal_fee.toString(),
                            proposalData.vote_fee.toString(),
                            proposalData.tx_hash_proposal_fee.toBinary(Endian.Little),
                            proposalData.proposer_address.toString(),
                            proposalData.proposal_fee_address.toString(),
                            ProposalStatus.ONGOING,
                            DataCollectionStatus.PENDING,
                            ProposalResult.PENDING,
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

        function save_ballot_data(
            storage: LedgerStorage,
            block_header: BlockHeader,
            tx_hash: Hash,
            ballot: BallotData,
            ballot_answer?: number
        ) {
            return new Promise<void>(async (resolve, reject) => {
                storage
                    .query(
                        `INSERT IGNORE INTO ballots
                        (
                            proposal_id,
                            block_height,
                            app_name,
                            ballot,
                            tx_hash,
                            voter_address,
                            sequence,
                            signature,
                            voting_time,
                            ballot_answer
                        )
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            ballot.proposal_id,
                            block_header.height.value,
                            ballot.app_name,
                            ballot.ballot,
                            tx_hash.toBinary(Endian.Little),
                            ballot.card.validator_address.toString(),
                            ballot.sequence,
                            ballot.signature.toBinary(Endian.Little),
                            block.header.time_offset + storage.genesis_timestamp,
                            ballot_answer ? ballot_answer : null,
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

        function getProposalVotePeriod(storage: LedgerStorage, proposal_id: string, app_name: string): Promise<any[]> {
            const sql = `SELECT
                    vote_start_height, vote_end_height, block_height
                    FROM
                        proposal
                    WHERE proposal_id = ? and app_name = ?;`;

            return storage.query(sql, [proposal_id, app_name]);
        }

        function putPayload(storage: LedgerStorage, block_header: BlockHeader, tx_hash: Hash, tx: Transaction) {
            return new Promise<void>(async (resolve, reject) => {
                try {
                    if (tx.payload.length >= 9) {
                        const header = tx.payload.slice(1, 9);
                        if (Buffer.compare(Buffer.from(ProposalFeeData.HEADER), header) === 0) {
                            const buffer = SmartBuffer.fromBuffer(tx.payload);
                            const proposal_fee = ProposalFeeData.deserialize(buffer);
                            await save_proposal_fee(storage, block_header.height, tx_hash, proposal_fee.proposal_id);
                        } else if (Buffer.compare(Buffer.from(ProposalData.HEADER), header) === 0) {
                            const buffer = SmartBuffer.fromBuffer(tx.payload);
                            const proposalData: ProposalData = ProposalData.deserialize(buffer);
                            await save_proposal_data(storage, block_header.height, tx_hash, proposalData);
                        } else if (Buffer.compare(Buffer.from(BallotData.HEADER), header) === 0) {
                            const buffer = SmartBuffer.fromBuffer(tx.payload);
                            const ballotData: BallotData = BallotData.deserialize(buffer);
                            const info = await getProposalVotePeriod(
                                storage,
                                ballotData.proposal_id,
                                ballotData.app_name
                            );
                            if (info.length) {
                                const validators_by_block: IValidatorByBlock[] = await storage.getValidatorsByBlock(
                                    new Height(info[0].block_height)
                                );
                                const validator = validators_by_block
                                    .map((m) => m.address)
                                    .find((element) => ballotData.card.validator_address.toString() === element);
                                block_header.height.value >= info[0].vote_start_height &&
                                block_header.height.value <= info[0].vote_end_height &&
                                validator
                                    ? await save_ballot_data(storage, block_header, tx_hash, ballotData)
                                    : await save_ballot_data(
                                          storage,
                                          block_header,
                                          tx_hash,
                                          ballotData,
                                          BallotData.REJECT
                                      );
                            }
                        }
                    }
                    logger.info("Proposal information saved successfully:", {
                        operation: Operation.db,
                        height: HeightManager.height.toString(),
                        status: Status.Success,
                        responseTime: Number(moment().utc().unix() * 1000),
                    });
                    resolve();
                } catch (err) {
                    logger.error("Failed to put proposal's information:" + err, {
                        operation: Operation.block_sync,
                        height: HeightManager.height.toString(),
                        status: Status.Error,
                        responseTime: Number(moment().utc().unix() * 1000),
                    });
                    reject(err);
                }
            });
        }
        return new Promise<void>((resolve, reject) => {
            (async () => {
                try {
                    for (let tx_idx = 0; tx_idx < block.txs.length; tx_idx++) {
                        if (block.txs[tx_idx].payload.length > 0) {
                            await putPayload(this, block.header, block.merkle_tree[tx_idx], block.txs[tx_idx]);
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
     * Saving Proposal Result.
     * When a new block is recieved. if block's height matches the Voting_end_height + 7
     * of proposals then it starts Ballot counting Process and Put the Proposal Result to database.
     * @param block: The instance of the `Block`
     * @param conn Use this if it are providing a db connection.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public putProposalResult(block: Block, conn?: mysql.PoolConnection) {
        function getSignCount(
            storage: LedgerStorage,
            address: string,
            proposal_data_height: number,
            vote_end_height: number
        ) {
            const sql = `SELECT
                       count(*) as sign_count
                    FROM
                        validator_by_block
                    WHERE signed = ?  AND  address = ?  AND block_height BETWEEN ? AND  ? ;`;

            return storage.query(sql, [SignStatus.SIGNED, address, proposal_data_height, vote_end_height]);
        }

        function updateValidatorBallots(
            storage: LedgerStorage,
            address: string,
            sequence: number,
            ballot_answer: number,
            block_height: Height,
            conn?: mysql.PoolConnection
        ) {
            return new Promise<void>(async (resolve, reject) => {
                storage
                    .query(
                        `UPDATE
                            ballots
                        SET
                            ballot_answer = ?
                        WHERE
                            voter_address = ?
                        AND
                            sequence = ?
                        AND
                            block_height = ?
                            `,
                        [ballot_answer, address, sequence, block_height],
                        conn
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        function rejectValidatorBallots(
            storage: LedgerStorage,
            address: string,
            ballot_answer: number,
            conn?: mysql.PoolConnection
        ) {
            return new Promise<void>(async (resolve, reject) => {
                storage
                    .query(
                        `UPDATE
                            ballots
                        SET
                            ballot_answer = ?
                        WHERE
                            voter_address = ?`,
                        [ballot_answer, address],
                        conn
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function getProposalVotesByValidator(
            storage: LedgerStorage,
            proposal_id: string,
            voter_address: string,
            app_name: string
        ): Promise<any> {
            const sql = `SELECT
                        proposal_id,
                        block_height,
                        app_name,
                        tx_hash,
                        voter_address,
                        sequence,
                        ballot,
                        signature,
                        voting_time,
                        ballot_answer
                    FROM
                        ballots
                    WHERE
                        ballot_answer IS NULL
                        AND
                        proposal_id = ?
                        AND
                        voter_address = ?
                        AND
                        app_name = ?
                        ORDER BY sequence DESC LIMIT 1`;
            return storage.query(sql, [proposal_id, voter_address, app_name]);
        }

        function updateProposals(
            storage: LedgerStorage,
            proposal_id: string,
            app_name: string,
            proposal_status: ProposalStatus,
            proposal_result: ProposalResult,
            conn?: mysql.PoolConnection
        ) {
            return new Promise<void>(async (resolve, reject) => {
                storage
                    .query(
                        `
                UPDATE
                    proposal
                SET
                    proposal_status = ? ,
                    proposal_result = ?
                WHERE
                    proposal_id = ?
                    AND app_name = ?`,
                        [proposal_status, proposal_result, proposal_id, app_name],
                        conn
                    )
                    .then(() => {
                        return resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }

        function validatePreImage(validator: any): IPreimage {
            const preimage_hash: string =
                validator.preimage_hash !== null ? new Hash(validator.preimage_hash, Endian.Little).toString() : "";
            const preimage_height_str: string =
                validator.preimage_height !== null ? validator.preimage_height.toString() : "";

            const preimage: IPreimage = {
                height: preimage_height_str,
                hash: preimage_hash,
            };

            return preimage;
        }

        function process_ballots(
            storage: LedgerStorage,
            validator: IValidatorByBlock,
            proposal: IProposal,
            votingResult: IVotingResult,
            conn?: mysql.PoolConnection
        ) {
            return new Promise<void>(async (resolve, reject) => {
                try {
                    const total_block = proposal.vote_end_height - (proposal.block_height - 1);
                    const sign_count = await getSignCount(
                        storage,
                        validator.address,
                        proposal.block_height,
                        proposal.vote_end_height
                    );
                    const uptime = bigDecimal.divide(
                        bigDecimal.multiply(sign_count[0].sign_count, 100),
                        total_block,
                        7
                    );
                    const validator_info: any[] = await storage.getValidatorsAPI(
                        new Height((proposal.vote_end_height + 7).toString()),
                        validator.address
                    );
                    const { height, hash } = validator_info[0]
                        ? await validatePreImage(validator_info[0])
                        : { hash: new Hash(Buffer.alloc(Hash.Width)).toString(), height: "" };
                    if (Number(uptime) > LedgerStorage.validator_uptime_constant && height && hash) {
                        await getProposalVotesByValidator(
                            storage,
                            proposal.proposal_id,
                            validator.address,
                            proposal.app_name
                        ).then(async (ballot: IBallot[]) => {
                            if (ballot.length) {
                                const ballot_preimage_hash: Hash = hashMulti(
                                    new Hash(hash),
                                    Buffer.from(ballot[0].app_name)
                                );
                                const key_encrypt = Encrypt.createKey(
                                    ballot_preimage_hash.data,
                                    ballot[0].proposal_id.toString()
                                );
                                const answer = Encrypt.decrypt(ballot[0].ballot, key_encrypt).readInt8();

                                switch (answer) {
                                    case BallotData.YES: {
                                        votingResult.approved = JSBI.add(votingResult.approved, JSBI.BigInt(1));
                                        await updateValidatorBallots(
                                            storage,
                                            validator.address,
                                            ballot[0].sequence,
                                            BallotData.YES,
                                            ballot[0].block_height,
                                            conn
                                        );
                                        break;
                                    }
                                    case BallotData.NO: {
                                        votingResult.opposed = JSBI.add(votingResult.opposed, JSBI.BigInt(1));
                                        await updateValidatorBallots(
                                            storage,
                                            validator.address,
                                            ballot[0].sequence,
                                            BallotData.NO,
                                            ballot[0].block_height,
                                            conn
                                        );
                                        break;
                                    }
                                    case BallotData.BLANK: {
                                        votingResult.abstain = JSBI.add(votingResult.abstain, JSBI.BigInt(1));
                                        await updateValidatorBallots(
                                            storage,
                                            validator.address,
                                            ballot[0].sequence,
                                            BallotData.BLANK,
                                            ballot[0].block_height,
                                            conn
                                        );
                                        break;
                                    }
                                    default: {
                                        await rejectValidatorBallots(
                                            storage,
                                            validator.address,
                                            BallotData.REJECT,
                                            conn
                                        );
                                        break;
                                    }
                                }
                            }
                        });
                    } else await rejectValidatorBallots(storage, validator.address, BallotData.REJECT, conn);
                    return resolve();
                } catch (err) {
                    return reject(err);
                }
            });
        }

        function computeResult(votingResult: IVotingResult, Vn: number): boolean {
            let quorum: JSBI = JSBI.BigInt(0);
            let Qn: JSBI = JSBI.BigInt(0);

            quorum = JSBI.BigInt(Math.floor(Vn / 3));
            Qn = JSBI.add(JSBI.add(votingResult.approved, votingResult.opposed), votingResult.abstain);
            if (Qn > quorum) {
                const F: JSBI = JSBI.subtract(votingResult.approved, votingResult.opposed);
                const result = bigDecimal.divide(F, Vn, 7);
                if (Number(result) > 0.1) {
                    return true;
                }
            }
            return false;
        }

        return new Promise<void>((resolve, reject) => {
            (async () => {
                try {
                    let validators_by_block: IValidatorByBlock[] = [];
                    let proposal: IProposal[] = await this.getProposalByStatus(ProposalStatus.COUNTING_VOTES);
                    proposal = proposal.filter((element) =>
                        JSBI.equal(JSBI.BigInt(element.vote_end_height + 7), block.header.height.value)
                    );

                    for (let proposal_index = 0; proposal_index < proposal.length; proposal_index++) {
                        const VotingResult: IVotingResult = {
                            approved: JSBI.BigInt(0),
                            opposed: JSBI.BigInt(0),
                            abstain: JSBI.BigInt(0),
                        };
                        validators_by_block = await this.getValidatorsByBlock(
                            new Height(proposal[proposal_index].block_height.toString())
                        );
                        await Promise.all(
                            validators_by_block.map(async (element) => {
                                await process_ballots(this, element, proposal[proposal_index], VotingResult, conn);
                            })
                        );
                        const result = await computeResult(VotingResult, validators_by_block.length);
                        await updateProposals(
                            this,
                            proposal[proposal_index].proposal_id,
                            proposal[proposal_index].app_name,
                            ProposalStatus.CLOSED,
                            result ? ProposalResult.PASSED : ProposalResult.REJECTED,
                            conn
                        );
                        logger.info("Proposal result computed successfully", {
                            operation: Operation.proposal_result_computation,
                            height: HeightManager.height.toString(),
                            status: Status.Success,
                            responseTime: Number(moment().utc().unix() * 1000),
                        });
                    }
                } catch (err) {
                    logger.error("Failed to put proposal's result:" + err, {
                        operation: Operation.proposal_result_computation,
                        height: HeightManager.height.toString(),
                        status: Status.Error,
                        responseTime: Number(moment().utc().unix() * 1000),
                    });
                    reject(err);
                    return;
                }
                return resolve();
            })();
        });
    }

    /**
     * Put Validator by Block
     * @param block: The instance of the `Block`
     * @param connection Use this if it are providing a db connection.
     */
    public putValidatorByBlock(block: Block, conn?: mysql.PoolConnection): Promise<void> {
        function save_block_validator(
            storage: LedgerStorage,
            height: Height,
            validator: IValidator,
            signed: SignStatus,
            slashed: ValidatorStatus
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO validator_by_block
                        (
                          block_height,
                          enrolled_height,
                          address,
                          utxo_key,
                          signed,
                          slashed
                        )
                        VALUES(?, ?, ?, ?, ?, ? )`,
                        [
                            height.value,
                            validator.enrolled_at,
                            validator.address,
                            new Hash(validator.stake).toBinary(Endian.Little),
                            signed,
                            slashed,
                        ],
                        conn
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
                if (JSBI.equal(block.header.height.value, JSBI.BigInt(0))) {
                    resolve();
                    return;
                }
                const cycleValidators: any[] = await this.getValidatorsAPI(block.header.height, null, conn);

                const bitMask = BitMask.fromString(block.header.validators.toString());
                for (let i = 0; i < bitMask.length; i++) {
                    if (bitMask.get(i))
                        await save_block_validator(
                            this,
                            block.header.height,
                            cycleValidators[i],
                            SignStatus.SIGNED,
                            ValidatorStatus.ACTIVE
                        );
                    else {
                        await save_block_validator(
                            this,
                            block.header.height,
                            cycleValidators[i],
                            SignStatus.UNSIGNED,
                            cycleValidators[i].slashed ? ValidatorStatus.SLASHED : ValidatorStatus.ACTIVE
                        );
                    }
                }
                resolve();
            })();
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
            const sql = `SELECT value FROM information WHERE keyname = 'height';`;
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
     * @param conn Use this if it are providing a db connection.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the array of UTXO
     * and if an error occurs the `.catch` is called with an error.
     */
    public getUTXO(address: string, conn?: mysql.PoolConnection): Promise<any[]> {
        const sql_utxo = `SELECT
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
                AND O.utxo_key NOT IN
                (
                    SELECT
                        S.utxo_key
                    FROM
                        utxos S
                        INNER JOIN tx_input_pool I ON (I.utxo = S.utxo_key)
                        INNER JOIN transaction_pool T ON (T.tx_hash = I.tx_hash)
                    WHERE
                        S.address = ?
                )
            ORDER BY T.block_height, O.utxo_key
            `;

        return new Promise<any[]>((resolve, reject) => {
            this.query(sql_utxo, [address, address], conn)
                .then((result: any[]) => {
                    resolve(result);
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
    public getUTXOs(utxos: Hash[]): Promise<any[]> {
        const u = utxos.map((m) => `x'${m.toBinary(Endian.Little).toString("hex")}'`);
        const sql_utxo = `SELECT
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
        type: number[],
        begin?: number,
        end?: number,
        peer?: string
    ): Promise<any[]> {
        const filter_type = "AND FTX.display_tx_type in (" + type.map((n) => `${n}`).join(",") + ")";
        const filter_date =
            begin !== undefined && end !== undefined ? `AND B.time_stamp BETWEEN ${begin} AND ${end}` : ``;
        let filter_peer_field;
        let filter_peer_condition;
        let filter_peer_value;
        if (peer !== undefined) {
            filter_peer_field = `,
                    CASE
                        WHEN (IFNULL(SUM(TX.income),0) - IFNULL(SUM(TX.spend),0)) > 0 THEN
                        (
                            SELECT COUNT(S.address) FROM tx_inputs I, tx_outputs S WHERE TX.tx_hash = I.tx_hash AND I.utxo = S.utxo_key
                            AND S.address LIKE '${peer}%'
                        )
                        ELSE
                        (
                            SELECT
                                COUNT(B.address)
                            FROM
                            (
                                SELECT
                                    DISTINCT S.address
                                FROM
                                    tx_inputs I
                                    INNER JOIN  tx_outputs S ON (I.utxo = S.utxo_key)
                                WHERE
                                    TX.tx_hash = I.tx_hash

                            ) A
                            INNER JOIN  (
                                SELECT
                                    O.address,
                                    O.amount
                                FROM
                                    tx_outputs O
                                WHERE
                                    TX.tx_hash = O.tx_hash AND O.address LIKE '${peer}%'
                            ) B
                            ON A.address != B.address
                        )
                    END AS peer_filter
            `;
            filter_peer_condition = "AND FTX.peer_filter > 0";
            filter_peer_value = `IFNULL(CASE
                        WHEN (IFNULL(SUM(TX.income),0) - IFNULL(SUM(TX.spend),0)) > 0 THEN
                        (
                            SELECT S.address FROM tx_inputs I, tx_outputs S
                            WHERE TX.tx_hash = I.tx_hash AND I.utxo = S.utxo_key AND S.address LIKE '${peer}%'
                            ORDER BY S.amount DESC LIMIT 1
                        )
                        ELSE
                        (
                            SELECT
                                B.address
                            FROM
                            (
                                SELECT
                                    DISTINCT S.address
                                FROM
                                    tx_inputs I
                                    INNER JOIN  tx_outputs S ON (I.utxo = S.utxo_key)
                                WHERE
                                    TX.tx_hash = I.tx_hash
                            ) A
                            INNER JOIN  (
                                SELECT
                                    O.address,
                                    O.amount
                                FROM
                                    tx_outputs O
                                WHERE
                                    TX.tx_hash = O.tx_hash AND O.address LIKE '${peer}%'
                            ) B
                            ON A.address != B.address
                            ORDER BY B.amount DESC LIMIT 1
                        )
                    END, TX.address) AS peer`;
        } else {
            filter_peer_field = "";
            filter_peer_condition = "";
            filter_peer_value = `IFNULL(CASE
                        WHEN (IFNULL(SUM(TX.income),0) - IFNULL(SUM(TX.spend),0)) > 0 THEN
                        (
                            SELECT S.address FROM tx_inputs I, tx_outputs S
                            WHERE TX.tx_hash = I.tx_hash AND I.utxo = S.utxo_key AND S.address != TX.address
                            ORDER BY S.amount DESC LIMIT 1
                        )
                        ELSE
                        (
                            SELECT
                                B.address
                            FROM
                            (
                                SELECT
                                    DISTINCT S.address
                                FROM
                                    tx_inputs I
                                    INNER JOIN  tx_outputs S ON (I.utxo = S.utxo_key)
                                WHERE
                                    TX.tx_hash = I.tx_hash
                            ) A
                            INNER JOIN  (
                                SELECT
                                    O.address,
                                    O.amount
                                FROM
                                    tx_outputs O
                                WHERE
                                    TX.tx_hash = O.tx_hash
                            ) B
                            ON A.address != B.address
                            ORDER BY B.amount DESC LIMIT 1
                        )
                    END, TX.address) AS peer`;
        }

        const sql = `SELECT
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
                FTX.type,
                FTX.tx_fee,
                FTX.tx_size,
                count(*) OVER() AS full_count
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
                    (IFNULL(SUM(TX.income),0) - IFNULL(SUM(TX.spend),0)) as amount,
                    ${filter_peer_value},
                    CASE
                        WHEN (IFNULL(SUM(TX.income),0) - IFNULL(SUM(TX.spend),0)) > 0 THEN
                        (
                            SELECT COUNT(S.address) FROM tx_inputs I, tx_outputs S WHERE TX.tx_hash = I.tx_hash AND I.utxo = S.utxo_key
                        )
                        ELSE
                        (
                            SELECT
                                COUNT(B.address)
                            FROM
                            (
                                SELECT
                                    DISTINCT S.address
                                FROM
                                    tx_inputs I
                                    INNER JOIN  tx_outputs S ON (I.utxo = S.utxo_key)
                                WHERE
                                    TX.tx_hash = I.tx_hash
                            ) A
                            INNER JOIN  (
                                SELECT
                                    O.address,
                                    O.amount
                                FROM
                                    tx_outputs O
                                WHERE
                                    TX.tx_hash = O.tx_hash
                            ) B
                            ON A.address != B.address
                        )
                    END AS peer_count,
                    CASE
                        WHEN (TX.type = 1) THEN 2
                        WHEN (TX.payload_size) > 0 THEN 3
                        WHEN (IFNULL(SUM(TX.income),0) - IFNULL(SUM(TX.spend),0)) > 0 THEN 0
                        ELSE 1
                    END AS display_tx_type,
                    TX.tx_fee,
                    TX.tx_size
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
                        IFNULL(SUM(S.amount), 0) AS spend,
                        T.tx_fee,
                        T.tx_size
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
                        0 as spend,
                        T.tx_fee,
                        T.tx_size
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
        const hash = tx_hash.toBinary(Endian.Little);

        const sql_tx = `SELECT
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

        const sql_sender = `SELECT
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

        const sql_receiver = `SELECT
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

        const result: any = {};
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
     * Provides a overview of a pending transaction.
     * @param tx_hash The hash of the transaction
     */
    public getWalletPendingTransactionOverview(tx_hash: Hash): Promise<any[]> {
        const hash = tx_hash.toBinary(Endian.Little);

        const sql_tx = `SELECT 
                        tx_hash,
                        type,
                        payload,
                        lock_height,
                        time,
                        'Pending' as status,
                        received_height,
                        payload,
                        tx_fee,
                        payload_fee,
                        tx_size
                        FROM transaction_pool 
                        WHERE tx_hash = ?`;

        const sql_sender = `SELECT 
                            O.address,
                            SUM(O.amount) as amount, 
                            I.tx_hash,
                            I.input_index,
                            I.utxo,
                            I.unlock_bytes,
                            I.unlock_age
                            FROM
                            tx_input_pool I
                            INNER JOIN tx_output_pool O 
                            ON(I.tx_hash = O.tx_hash)
                            WHERE I.tx_hash = ? `;

        const sql_receiver = `SELECT
                            tx_hash,
                            type,
                            address,
                            amount,
                            output_index,
                            lock_type,
                            lock_bytes
                            FROM tx_output_pool
                            WHERE tx_hash = ?`;

        const result: any = {};
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
     * Provides a detail of a transaction.
     * @param tx_hash The hash of the transaction
     */
    public getWalletTransactionDetail(tx_hash: Hash): Promise<any[]> {
        const hash = tx_hash.toBinary(Endian.Little);

        const sql_tx = `SELECT
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
                T.payload_fee,
                T.freezing_fee
            FROM
                blocks B
                INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?)
                LEFT OUTER JOIN payloads P ON (T.tx_hash = P.tx_hash);`;

        const sql_sender = `SELECT
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

        const sql_receiver = `SELECT
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

        const result: any = {};
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
        const sql = `
        SELECT
            TF.tx_hash,
            TF.time,
            TF.type,
            TF.tx_fee,
            TF.payload_fee,
            TF.freezing_fee,
            TF.received_height,
            (SELECT IFNULL(MAX(height), 0) AS height FROM blocks) AS current_height,
            TF.peer_count,
            CASE TF.peer_count WHEN 0 THEN
                0
            ELSE
                (SELECT IFNULL(SUM(O.amount), 0) FROM tx_output_pool O WHERE O.tx_hash = TF.tx_hash AND O.address != TF.sender GROUP BY O.tx_hash)
            END AS amount,
            CASE TF.peer_count WHEN 0 THEN
                ''
            ELSE
                (SELECT O.address FROM tx_output_pool O WHERE O.tx_hash = TF.tx_hash AND O.address != TF.sender ORDER BY O.amount DESC LIMIT 1)
            END AS address
        FROM
        (
            SELECT
                T.tx_hash,
                T.time,
                T.type,
                T.tx_fee,
                T.payload_fee,
                T.freezing_fee,
                T.received_height,
                S.address AS sender,
                (
                    SELECT count(*) FROM tx_output_pool O WHERE O.tx_hash = T.tx_hash AND S.address != O.address
                ) AS peer_count
            FROM
                tx_outputs S
                INNER JOIN tx_input_pool I ON (I.utxo = S.utxo_key)
                INNER JOIN transaction_pool T ON (T.tx_hash = I.tx_hash)
            WHERE
                S.address = ?
            GROUP BY T.tx_hash
            ORDER BY T.time DESC
        ) AS TF;`;

        return this.query(sql, [address]);
    }

    /**
     * Provides a balance of address
     * @param address The address to check the balance
     */
    public getWalletBalance(address: string, conn?: mysql.PoolConnection): Promise<any[]> {
        const sql = `
        SELECT
            TF.address,
            TF.balance - TF.send_other - TF.send_unfreeze + TF.receive AS balance,
            TF.spendable - TF.send_other AS spendable,
            TF.frozen - TF.send_unfreeze AS frozen,
            TF.locked + TF.receive + ((frozen_utxo_cnt - send_unfreeze_utxo_cnt) * ${Constant.SlashPenaltyAmount.value.toString()}) AS locked
        FROM
        (
            SELECT
                ? AS address,
                IFNULL(SUM(amount), 0) AS balance,
                IFNULL(SUM(CASE WHEN ((unlock_height <= height + 1) AND ((type = 0) OR (type = 2))) THEN amount ELSE 0 END), 0) AS spendable,
                IFNULL(SUM(CASE WHEN ((unlock_height <= height + 1) AND ((type = 1))) THEN amount ELSE 0 END), 0) AS frozen,
                IFNULL(SUM(CASE WHEN ((unlock_height > height + 1) AND ((type = 0) OR (type = 2))) THEN amount ELSE 0 END), 0) AS locked,
                IFNULL(SUM(CASE WHEN ((unlock_height <= height + 1) AND ((type = 1))) THEN 1 ELSE 0 END), 0) AS frozen_utxo_cnt,
                IFNULL(
                (
                    SELECT
                        SUM(S.amount)
                    FROM
                        tx_outputs S
                        INNER JOIN tx_input_pool I ON (I.utxo = S.utxo_key)
                        INNER JOIN transaction_pool T ON (T.tx_hash = I.tx_hash)
                    WHERE
                        S.address = ?
                        AND S.type = 1
                    GROUP BY S.address
                ), 0) AS send_unfreeze,
                IFNULL(
                (
                    SELECT
                        SUM(S.amount)
                    FROM
                        tx_outputs S
                        INNER JOIN tx_input_pool I ON (I.utxo = S.utxo_key)
                        INNER JOIN transaction_pool T ON (T.tx_hash = I.tx_hash)
                    WHERE
                        S.address = ?
                        AND S.type != 1
                ), 0) AS send_other,
                IFNULL(
                (
                    SELECT
                        SUM(TTO.amount)
                    FROM
                    (
                        SELECT
                            O.tx_hash,
                            O.address,
                            O.amount
                        FROM
                            tx_output_pool O
                            INNER JOIN transaction_pool T ON (T.tx_hash = O.tx_hash)
                        WHERE
                            O.address = ?
                    ) TTO
                    INNER JOIN  (
                        SELECT
                            DISTINCT T.tx_hash
                        FROM
                            tx_outputs S
                            INNER JOIN tx_input_pool I ON (I.utxo = S.utxo_key)
                            INNER JOIN transaction_pool T ON (T.tx_hash = I.tx_hash)
                        WHERE
                            S.address = ?
                    ) TTX ON (TTO.tx_hash = TTX.tx_hash)
                    GROUP BY TTO.address
                ), 0) AS receive,
                IFNULL(
                (
                    SELECT
                        COUNT(S.utxo_key)
                    FROM
                        tx_outputs S
                        INNER JOIN tx_input_pool I ON (I.utxo = S.utxo_key)
                        INNER JOIN transaction_pool T ON (T.tx_hash = I.tx_hash)
                    WHERE
                        S.address = ?
                        AND S.type = 1
                    GROUP BY S.address
                ), 0) AS send_unfreeze_utxo_cnt
            FROM
            (
                SELECT
                    O.utxo_key AS utxo,
                    O.amount,
                    O.lock_type,
                    O.lock_bytes,
                    T.block_height,
                    B.time_stamp AS block_time,
                    O.type,
                    O.unlock_height,
                    (SELECT MAX(height) AS height FROM blocks) AS height
                FROM
                    utxos O
                    INNER JOIN transactions T ON (T.tx_hash = O.tx_hash)
                    INNER JOIN blocks B ON (B.height = T.block_height)
                WHERE
                    O.address = ?
            ) AS T
        ) AS TF;`;

        return this.query(sql, [address, address, address, address, address, address, address], conn);
    }

    /**
     * Returns the UTXO of the address.
     * @param address       The public address to receive UTXO
     * @param amount        Amount Required
     * @param balance_type  Balance Type (0: Spendable, 1: Frozen, 2: Locked)
     * @param filter_last   Last UTXO in previous request, If this is the first request, set this value to undefined.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the array of UTXO
     * and if an error occurs the `.catch` is called with an error.
     */
    public getWalletUTXO(
        address: string,
        amount: JSBI,
        balance_type: number,
        filter_last: Hash | undefined
    ): Promise<any[]> {
        const sql_utxo = `
        SELECT
            *
        FROM
        (
            SELECT
                utxo,
                amount,
                lock_type,
                lock_bytes,
                block_height,
                block_time,
                type,
                unlock_height,
                @ACCUM := @ACCUM + TB_FILTERED_UTXO.amount as accumulative,
                include
            FROM
            (
                SELECT
                    *
                FROM
                (
                    SELECT
                        *,
                        @INCLUDE := CASE WHEN TB_RAW.utxo = ? THEN 1
                        WHEN @INCLUDE = 1 THEN 2
                        ELSE @INCLUDE
                        END AS include
                    FROM
                    (
                        SELECT
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
                            INNER JOIN (
                                SELECT MAX(height) as height FROM blocks
                            ) BH
                        WHERE
                            O.address = ?
                            AND
                            (
                                (
                                    ? = 0 AND ((O.type = 0) OR (O.type = 2)) AND (O.unlock_height <= BH.height + 1)
                                ) OR
                                (
                                    ? = 1 AND (O.type = 1) AND (O.unlock_height <= BH.height + 1)
                                ) OR
                                (
                                    ? = 2 AND ((O.type = 0) OR (O.type = 2)) AND (O.unlock_height > BH.height + 1)
                                )
                            )
                            AND O.utxo_key NOT IN
                            (
                                SELECT
                                    S.utxo_key
                                FROM
                                    utxos S
                                    INNER JOIN tx_input_pool I ON (I.utxo = S.utxo_key)
                                    INNER JOIN transaction_pool T ON (T.tx_hash = I.tx_hash)
                                WHERE
                                    S.address = ?
                            )
                        ORDER BY T.block_height, O.utxo_key
                    ) AS TB_RAW,
                    (SELECT @INCLUDE := 0) AS U,
                    (SELECT EXISTS (SELECT * FROM utxos WHERE utxo_key = ? AND address = ? LIMIT 1) as exists_prev) AS TB_EXIST_UTXO
                ) TB_FOR_FILTER_UTXO
                WHERE
                    (
                        (? <> x'00') AND (include = 2) AND (exists_prev = 1)
                    ) OR
                    (
                        (? <> x'00') AND (exists_prev = 0)
                    ) OR
                    (
                        (? = x'00')
                    )
            ) AS TB_FILTERED_UTXO,
            (SELECT @ACCUM := 0) AS R
        ) AS TB_FOR_FILTER_AMOUNT
        WHERE accumulative - amount < ?
        LIMIT 1000;
        `;

        return new Promise<any[]>((resolve, reject) => {
            const utxo = filter_last !== undefined ? filter_last.toBinary(Endian.Little) : Buffer.from([0]);
            this.query(sql_utxo, [
                utxo,
                address,
                balance_type,
                balance_type,
                balance_type,
                address,
                utxo,
                address,
                utxo,
                utxo,
                utxo,
                amount.toString(),
            ])
                .then((result: any[]) => {
                    resolve(result);
                })
                .catch(reject);
        });
    }

    /**
     * Provides a status of a transaction.
     * @param tx_hash The hash of the transaction
     */
    public getTransactionStatus(tx_hash: Hash): Promise<any> {
        const hash = tx_hash.toBinary(Endian.Little);

        const sql_tx = `SELECT
                B.hash,
                T.block_height as height,
                T.tx_hash
            FROM
                blocks B
                INNER JOIN transactions T ON (B.height = T.block_height and T.tx_hash = ?);`;

        const sql_tx_pending = `SELECT
                T.tx_hash
            FROM
                transaction_pool T
            WHERE
                T.tx_hash = ?;`;

        const result: any = {};
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
                const hash = tx_hash.toBinary(Endian.Little);
                const rows = await this.query(
                    "SELECT tx_hash, type, payload, lock_height, time FROM transaction_pool WHERE tx_hash = ?;",
                    [hash]
                );
                if (rows.length > 0) {
                    const input_rows = await this.query(
                        "SELECT tx_hash, utxo, unlock_bytes, unlock_age FROM tx_input_pool WHERE tx_hash = ? ORDER BY input_index;",
                        [hash]
                    );
                    const output_rows = await this.query(
                        "SELECT tx_hash, type, amount, lock_type, lock_bytes FROM tx_output_pool WHERE tx_hash = ? ORDER BY output_index;",
                        [hash]
                    );

                    const inputs: TxInput[] = [];
                    for (const input_row of input_rows)
                        inputs.push(
                            new TxInput(
                                new Hash(input_row.utxo, Endian.Little),
                                new Unlock(input_row.unlock_bytes),
                                input_row.unlock_age
                            )
                        );
                    const outputs: TxOutput[] = [];
                    for (const output_row of output_rows)
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
                const hash = tx_hash.toBinary(Endian.Little);
                const rows = await this.query(
                    `SELECT
                        T.tx_hash, T.lock_height, P.payload FROM
                    transactions T
                    LEFT JOIN payloads P ON (T.tx_hash = P.tx_hash)
                    WHERE
                        T.tx_hash = ?`,
                    [hash]
                );
                if (rows.length > 0) {
                    const input_rows = await this.query(
                        "SELECT tx_hash, utxo, unlock_bytes, unlock_age FROM tx_inputs WHERE tx_hash = ? ORDER BY in_index;",
                        [hash]
                    );
                    const output_rows = await this.query(
                        "SELECT tx_hash, type, amount, lock_type, lock_bytes FROM tx_outputs WHERE tx_hash = ? ORDER BY output_index;",
                        [hash]
                    );

                    const inputs: TxInput[] = [];
                    for (const input_row of input_rows)
                        inputs.push(
                            new TxInput(
                                new Hash(input_row.utxo, Endian.Little),
                                new Unlock(input_row.unlock_bytes),
                                input_row.unlock_age
                            )
                        );
                    const outputs: TxOutput[] = [];
                    for (const output_row of output_rows)
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

        const sql = `SELECT
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
        const sql = `SELECT
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
        const sql = `SELECT
                height, hash, merkle_root, signature, validators, tx_count,
                enrollment_count, time_stamp, count(*) OVER() AS full_count
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
        const sql = `SELECT
                        block_height,
                        tx_hash,
                        time_stamp,
                        tx_fee,
                        tx_size,
                        type,
                        CASE WHEN status = 'Confirmed'
                             THEN (SELECT SUM(IFNULL(amount,0)) FROM tx_outputs O WHERE O.tx_hash = TX.tx_hash)
                             ELSE (SELECT SUM(IFNULL(amount,0)) FROM tx_output_pool O WHERE O.tx_hash = TX.tx_hash)
                        END as amount,
                        status,
                        (SELECT IFNULL(count(*),0) AS pending_full_count FROM transaction_pool) + (SELECT IFNULL(count(*),0) AS pending_full_count FROM transactions) as full_count
                    FROM
                    ((SELECT
                            "" AS block_height,
                            T.tx_hash,
                            T.time as time_stamp,
                            T.tx_fee,
                            T.tx_size,
                            T.type,
                            'Pending' as status
                        FROM
                            transaction_pool T
                        )
                        UNION
                        (SELECT
                            T.block_height,
                            T.tx_hash,
                            B.time_stamp,
                            T.tx_fee,
                            T.tx_size,
                            T.type,
                            'Confirmed' as status
                        FROM
                            transactions T
                            INNER JOIN blocks B ON (B.height = T.block_height)
                        )
                        ORDER BY time_stamp DESC, tx_hash ASC
                    LIMIT ? offset ?) AS TX`;
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
        const sql = `SELECT B.height, B.hash, B.merkle_root, B.signature, B.prev_block,
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
        const sql = `SELECT
                E.block_height, E.utxo_key, E.commitment, E.enroll_sig, V.address,
                count(*) OVER() AS full_count
            FROM
                blocks B
                INNER JOIN enrollments E ON (E.block_height = B.height)
                INNER JOIN validators V ON (E.utxo_key = V.utxo_key AND E.block_height = V.enrolled_at)
                AND B.${field} = ?
            ORDER BY E.enrollment_index ASC
            LIMIT ? OFFSET ?;`;

        const result: any = {};
        return new Promise<any[]>((resolve, reject) => {
            this.query(sql, [value, limit, limit * (page - 1)]).then((rows: any[]) => {
                result.enrollments = rows;
                resolve(result);
            });
        });
    }

    /**
     * Get proposal's voting details
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public getVotingDetails(proposal_id: string, limit: number, page: number): Promise<any[]> {
        const sql = `
            SELECT 
                BA.voter_address,
                BA.sequence,
                BA.tx_hash,
                BA.ballot_answer,
                BA.voting_time,
                BT.count as full_count,
                BT.utxo_key FROM
                            (
                        SELECT B.*, T.utxo_key
                            FROM (
                        SELECT voter_address, max(sequence) as sequence,count(*) as count,tx_hash, ballot_answer, voting_time, proposal_id
                            FROM ballots 
                            WHERE proposal_id = ? 
                            GROUP BY voter_address
                            ) AS B
                        INNER JOIN tx_outputs T
                        ON(B.tx_hash = T.tx_hash)
                        GROUP BY voter_address
                    ) AS BT
                INNER JOIN ballots BA
                ON(BT.voter_address = BA.voter_address and BT.sequence = BA.sequence)
                ORDER BY BA.block_height DESC
              LIMIT ? OFFSET ? `;

        return this.query(sql, [proposal_id, limit, limit * (page - 1)]);
    }

    /**
     * Get Validator ballots.
     * @param address Address of the validator
     * @param limit Maximum record count that can be obtained from one query
     * @param page The number on the page, this value begins with 1
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public getValidatorBallots(address: string, limit: number, page: number): Promise<any> {
        const sql = `
                SELECT 
                    B.proposal_id,
                    B.tx_hash,
                    B.sequence,
                    P.proposal_type,
                    P.proposal_title,
                    B.ballot_answer,
                    count(*) OVER() AS full_count
                FROM ballots B 
                INNER JOIN proposal P
                ON (B.proposal_id = P.proposal_id)
                WHERE B.voter_address = ?
                AND B.sequence = (SELECT MAX(sequence) FROM ballots WHERE voter_address = ? AND proposal_id = B.proposal_id)
                ORDER BY B.block_height DESC
                LIMIT ? OFFSET ?`;
        return this.query(sql, [address, address, limit, limit * (page - 1)]);
    }

    /**
     * Get Validators's latest blocks
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public getValidatorMissedBlocks(address: string): Promise<any[]> {
        const sql = `
            SELECT
                block_height,
                signed
            FROM
                validator_by_block
            WHERE address = ?
            ORDER BY block_height DESC
            LIMIT 100`;

        return this.query(sql, [address]);
    }

    /**
     * Get Validators's latest blocks
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public async getBlockValidators(
        value: number | Buffer,
        field: string,
        limit: number | undefined,
        page: number | undefined,
        conn: mysql.PoolConnection | undefined = undefined
    ): Promise<any[]> {
        let block_height: number | Buffer = 0;
        const LIMIT_QUERY = limit ? (page ? `LIMIT ${limit} OFFSET ${limit * (page - 1)}` : "") : "";
        if (field == "hash") {
            const block_sql = `SELECT height
                                FROM blocks where hash = ?`;
            await this.query(block_sql, [value]).then((rows: any[]) => {
                block_height = rows[0].height;
            });
        } else {
            block_height = value;
        }

        let sql = `SELECT V.address,
                V.enrolled_at,
                V.address,
                V.utxo_key,
                V.utxo_key as stake,
                V.amount as stake_amount,
                P.block_height,
                P.block_height as preimage_height,
                P.preimage_hash,
                ${block_height} as height,
                B.slashed,
                B.signed,
            count(*) OVER() AS full_count
            FROM validators V
            LEFT OUTER JOIN preimages P
            ON V.utxo_key = P.utxo_key
            AND ${block_height} = P.block_height
            LEFT OUTER JOIN validator_by_block B
            ON(B.address = P.address and B.block_height = P.block_height)
            WHERE B.block_height = ?
            AND V.enrolled_at >= (${block_height} - ?)
            AND V.enrolled_at < ${block_height}
            ORDER BY V.utxo_key ASC 
            `;
        sql += LIMIT_QUERY;
        return this.query(sql, [block_height, this.validator_cycle], conn);
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
        const sql_tx = `SELECT
                T.block_height, T.tx_hash, SUM(IFNULL(O.amount,0)) as amount,
	            T.tx_fee, T.tx_size, B.time_stamp, count(*) OVER() AS full_count,
                INS.senders,
                JSON_ARRAYAGG(JSON_OBJECT("type", O.type, "address", O.address, "amount", O.amount)) as receiver
                FROM
			        blocks B
			        INNER JOIN transactions T ON (B.height = T.block_height)
                    INNER JOIN (SELECT * FROM tx_outputs ORDER BY output_index ASC ) O ON (T.tx_hash = O.tx_hash)
                    LEFT JOIN (SELECT
			            TS.tx_hash,
                        JSON_ARRAYAGG(JSON_OBJECT("address", OS.address, "amount", OS.amount)) as senders
		            FROM
			            blocks BS
			            INNER JOIN transactions TS ON (BS.height = TS.block_height)
			            INNER JOIN tx_inputs I ON (TS.tx_hash = I.tx_hash)
			            INNER JOIN tx_outputs OS ON (I.utxo = OS.utxo_key)
		            WHERE
			            BS.${field}= ?
                        GROUP BY TS.tx_hash
                        ORDER BY TS.tx_index ASC ) as INS ON ( INS.tx_hash = T.tx_hash)
                WHERE
                    B.${field} = ?
			    GROUP BY T.tx_hash
			    ORDER BY T.tx_index ASC, O.output_index ASC
                LIMIT ? OFFSET ? ;`;

        const sql_count = `SELECT
                    IFNULL(count(*),0) as total_records
                FROM
                    transactions T
                    INNER JOIN blocks B ON (B.height = T.block_height)
                WHERE
                    ${field} = ?;`;

        const result: any = {};
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
     * Get transactions of a address
     * @param address is the address
     * @param limit Maximum record count that can be obtained from one query
     * @param page The number on the page, this value begins with 1
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTransactionsAddress(address: string, limit: number, page: number): Promise<any[]> {
        const sql_tx = `SELECT
                        T.block_height, T.tx_hash, T.type, T.tx_fee, T.tx_size, B.time_stamp, count(*) OVER() AS full_count,
                        (SELECT JSON_ARRAYAGG(JSON_OBJECT("type", O.type, "address", O.address, "amount", O.amount))
                            FROM blocks BS
                            INNER JOIN transactions TS ON (BS.height = TS.block_height)
                            INNER JOIN tx_outputs O ON (TS.tx_hash = O.tx_hash)
                            WHERE O.tx_hash = TX.tx_hash
                            ORDER BY O.tx_index ASC) as outputs,
                        (SELECT JSON_ARRAYAGG(JSON_OBJECT("address", OS.address, "amount", OS.amount))
                            FROM blocks BS
                            INNER JOIN transactions TS ON (BS.height = TS.block_height)
                            INNER JOIN tx_inputs I ON (TS.tx_hash = I.tx_hash)
                            INNER JOIN tx_outputs OS ON (I.utxo = OS.utxo_key)
                            WHERE I.tx_hash = TX.tx_hash
                            ORDER BY TS.tx_index ASC ) as inputs
                        FROM
                            blocks B
                            INNER JOIN transactions T ON (B.height = T.block_height)
                            INNER JOIN
                            (SELECT DISTINCT GT.tx_hash
                              FROM
                                (SELECT T.tx_hash
                                 FROM
                                    tx_outputs S
                                    INNER JOIN tx_inputs I ON (I.utxo = S.utxo_key)
                                    INNER JOIN transactions T ON (T.tx_hash = I.tx_hash)
                                    INNER JOIN blocks B ON (B.height = T.block_height)
                                 WHERE
                                    S.address = ?
                                 GROUP BY T.tx_hash
                                 UNION ALL
                                 SELECT T.tx_hash
                                 FROM
                                    tx_outputs O
                                    INNER JOIN transactions T ON (T.tx_hash = O.tx_hash)
                                    INNER JOIN blocks B ON (B.height = T.block_height)
                                 WHERE
                                    O.address = ?
                                 GROUP BY T.tx_hash) as GT) as TX ON (T.tx_hash = TX.tx_hash)
                        GROUP BY T.tx_hash
                        ORDER BY B.height DESC, T.tx_index ASC
                        LIMIT ? OFFSET ? ;`;

        return this.query(sql_tx, [address, address, limit, limit * (page - 1)]);
    }

    /**
     * Get statistics of BOA coin
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getBOAStats(): Promise<any[]> {
        const sql = `
                    SELECT B.height AS height,
                        B.time_stamp AS time_stamp,
                        (SELECT SUM(tx_count) FROM blocks) AS transactions,
                        (SELECT IFNULL(sum(total_reward),0) AS total_reward FROM blocks_stats) AS total_reward,
                        (SELECT circulating_supply FROM blocks_stats WHERE block_height = BS.block_height) AS circulating_supply,
                        (SELECT COUNT(address) FROM validator_by_block WHERE slashed <> 1 AND block_height = BS.block_height) AS validators,
                        (SELECT COUNT(address) FROM validator_by_block WHERE signed = 1 AND slashed <> 1 AND block_height = BS.block_height) AS active_validator,
                        (SELECT SUM(total_frozen) FROM accounts) AS total_frozen
                    FROM blocks B
                    LEFT OUTER JOIN blocks_stats BS
                    ON (B.height = BS.block_height)
                    WHERE B.height = (SELECT MAX(height) FROM blocks);`;
        return this.query(sql, []);
    }

    /**
     * Get the latest Coin Market cap data of BOA coin
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getCoinMarketcap(currency: string): Promise<any[]> {
        const sql = `SELECT * FROM marketcap 
        WHERE last_updated_at = (SELECT MAX(last_updated_at) as time FROM marketcap WHERE currency = ?)
        AND currency = ?
        `;

        return this.query(sql, [currency, currency]);
    }

    /**
     * Get the latest Coin Market cap chart of BOA coin
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getCoinMarketChart(from: number, to: number, currency: string): Promise<any[]> {
        const sql = `SELECT * FROM marketcap WHERE last_updated_at BETWEEN ? AND ? AND currency = ?`;

        return this.query(sql, [from, to, currency]);
    }

    /**
     * Get the transaction count for an address
     * @param height The height of the block
     * @param address Address of the target
     * @param conn Use this if it are providing a db connection.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getTxCount(height: Height, address: string, conn?: mysql.PoolConnection): Promise<any[]> {
        const sql = `SELECT
               COUNT(DISTINCT(tx_hash)) AS tx_count
            FROM
            (
                SELECT
                    T.tx_hash
                FROM
                    tx_outputs S
                    INNER JOIN tx_inputs I ON (I.utxo = S.utxo_key)
                    INNER JOIN transactions T ON (T.tx_hash = I.tx_hash)
                WHERE
                    T.block_height = ?
                    AND S.address = ?
                GROUP BY T.tx_hash, S.address

                UNION ALL

                SELECT
                    T.tx_hash
                FROM
                    tx_outputs O
                    INNER JOIN transactions T ON (T.tx_hash = O.tx_hash)
                WHERE
                    T.block_height = ?
                    AND O.address = ?
                GROUP BY T.tx_hash, O.address
            ) Tx;`;
        return this.query(sql, [height.value.toString(), address, height.value.toString(), address], conn);
    }

    /**
     * Get BOA Holder List.
     * @param limit Maximum record count that can be obtained from one query
     * @param page The number on the page, this value begins with 1
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public getBOAHolders(limit: number, page: number): Promise<any> {
        const circulating_sql = `SELECT circulating_supply FROM blocks_stats WHERE block_height = (SELECT MAX(block_height) FROM blocks_stats)`;
        const sql = `
            SELECT
	            address, tx_count, total_received, total_sent,
	            total_reward, total_frozen, total_spendable, total_balance, count(*) OVER() AS full_count
            FROM
                accounts
            ORDER BY total_balance DESC, address ASC
            LIMIT ? OFFSET ?`;
        const result: any = {};
        return new Promise<any[]>((resolve, reject) => {
            this.query(sql, [limit, limit * (page - 1)])
                .then((rows: any[]) => {
                    result.holders = rows;
                    return this.query(circulating_sql, []);
                })
                .then((rows: any[]) => {
                    result.circulating_supply = rows[0].circulating_supply;
                    resolve(result);
                })
                .catch(reject);
        });
    }

    /**
     * Get Pending proposals list
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public getPendingProposal(): Promise<any[]> {
        const sql = `
            SELECT
	            proposal_id, block_height, tx_hash, app_name, proposal_type, proposal_title,
                vote_start_height, vote_end_height, doc_hash, fund_amount, proposal_fee, proposal_fee_tx_hash,
                proposer_address, vote_fee, proposal_fee_address, proposal_status, data_collection_status
            FROM
                proposal
            WHERE data_collection_status = ?
            `;
        return this.query(sql, [DataCollectionStatus.PENDING]);
    }

    /**
     * Get transcation hash
     * @param utxo UTXO key of the transaction
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public getTransactionHash(utxo_key: Hash): Promise<any> {
        const hash = utxo_key.toBinary(Endian.Little);
        const sql = `
            SELECT
	            tx_hash
                FROM tx_outputs
                WHERE utxo_key = ?
            `;
        return this.query(sql, [hash]);
    }

    /**
     * Get transcation hash of the spender
     * @param utxo UTXO key of the transaction
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
     public getSpenderHash(utxo_key: Hash): Promise<any> {
        const hash = utxo_key.toBinary(Endian.Little);
        const sql = `
            SELECT
	            tx_hash
                FROM tx_inputs
                WHERE utxo = ?
            `;
        return this.query(sql, [hash]);
    }

    /**
     * Put the MetaData for proposal
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public putProposalMetaData(storage: LedgerStorage, metadata: IMetaData): Promise<void> {
        function putMetaData(storage: LedgerStorage, metadata: IMetaData) {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO proposal_metadata
                        ( proposal_id, voting_start_date, voting_end_date, voting_fee_hash, detail,
                        submit_time, ave_pre_evaluation_score, pre_evaluation_start_time, pre_evaluation_end_time,
                        assess_node_count, assess_average_score, assess_completeness_score, assess_realization_score,
                        assess_profitability_score, assess_attractiveness_score, assess_expansion_score, proposer_name )
                    VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            metadata.proposal_id,
                            metadata.voting_start_date,
                            metadata.voting_end_date,
                            metadata.voting_fee_hash.toBinary(Endian.Little),
                            metadata.detail.toString(),
                            metadata.submit_time,
                            metadata.ave_pre_evaluation_score,
                            metadata.pre_evaluation_start_time,
                            metadata.pre_evaluation_end_time,
                            metadata.assessResult.assess_node_count,
                            metadata.assessResult.assess_average_score,
                            metadata.assessResult.assess_completeness_score,
                            metadata.assessResult.assess_realization_score,
                            metadata.assessResult.assess_profitability_score,
                            metadata.assessResult.assess_attractiveness_score,
                            metadata.assessResult.assess_expansion_score,
                            metadata.proposer_name.toString(),
                        ]
                    )
                    .then(() => {
                        return resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        function putAttachments(storage: LedgerStorage, proposal_id: string, attachments: IProposalAttachment) {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `INSERT INTO proposal_attachments
                         ( attachment_id, proposal_id, name, url, mime, doc_hash )
                    VALUES
                        (?, ?, ?, ?, ?, ?)`,
                        [
                            attachments.attachment_id,
                            proposal_id,
                            attachments.name,
                            attachments.url,
                            attachments.mime,
                            attachments.doc_hash,
                        ]
                    )
                    .then(() => {
                        return resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
        return new Promise<void>(async (resolve, reject) => {
            try {
                await putMetaData(storage, metadata);
                for (
                    let attachment_index = 0;
                    attachment_index < metadata.proposal_attachments.length;
                    attachment_index++
                ) {
                    await putAttachments(
                        storage,
                        metadata.proposal_id,
                        metadata.proposal_attachments[attachment_index]
                    );
                }
                return resolve();
            } catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Get proposal list
     * @param limit Maximum record count that can be obtained from one query
     * @param page The number on the page, this value begins with 1
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public getProposals(limit: number, page: number): Promise<any[]> {
        const sql = `
                SELECT 
                    P.proposal_id,
                    P.proposal_title,
                    P.block_height,
                    P.proposal_result,
                    P.proposal_type,
                    P.fund_amount,
                    P.vote_start_height,
                    P.vote_end_height,
                    P.proposal_status,
                    M.submit_time,
                    M.proposer_name,
                    M.voting_start_date,
                    M.voting_end_date,
                    count(*) OVER() AS full_count
                    FROM proposal P
                    LEFT OUTER JOIN proposal_metadata M
                    ON(P.proposal_id = M.proposal_id)
                    LIMIT ? OFFSET ?
            `;
        const validators = `
                    SELECT count(DISTINCT(address)) as total_validators
                    FROM   validators
        `;

        const total_votes = `
                    SELECT 
                        DISTINCT voter_address
                    FROM ballots
                    WHERE  proposal_id = ?
                    `;
        const vote_answer = `
                    SELECT ballot_answer
                    FROM ballots 
                    WHERE proposal_id = ?
                    AND voter_address = ?
                    ORDER BY sequence DESC limit 1`;
        const result: any = {};
        let totalValidators: any;
        let totalVotes: any;
        return new Promise<any>(async (resolve, reject) => {
            this.query(sql, [limit, limit * (page - 1)])
                .then((rows: any) => {
                    result.proposalData = rows;
                    return this.query(validators, []);
                })
                .then(async (rows: any[]) => {
                    totalValidators = rows[0].total_validators;
                    const maxLength = result.proposalData.length <= 10 ? result.proposalData.length : 10;
                    for (let i = 0; i < maxLength; i++) {
                        const votes = await this.query(total_votes, [result.proposalData[i].proposal_id]);
                        let yesCount = 0;
                        let noCount = 0;
                        let abstainCount = 0;
                        for (let k = 0; k < votes.length; k++) {
                            const ballot_answer = await this.query(vote_answer, [
                                result.proposalData[i].proposal_id,
                                votes[k].voter_address,
                            ]);
                            switch (ballot_answer[0].ballot_answer) {
                                case 0: {
                                    ++yesCount;
                                    break;
                                }
                                case 1: {
                                    ++noCount;
                                    break;
                                }
                                case 2: {
                                    ++abstainCount;
                                    break;
                                }
                                default:
                                    break;
                            }
                        }
                        const votedCount = votes.length;
                        const notVotedCount = totalValidators - votedCount;
                        result.proposalData[i].total_validators = totalValidators;
                        result.proposalData[i].yes_percent = (yesCount / totalValidators) * 100;
                        result.proposalData[i].no_percent = (noCount / totalValidators) * 100;
                        result.proposalData[i].abstain_percent = (abstainCount / totalValidators) * 100;
                        result.proposalData[i].voted_percent = (votedCount / totalValidators) * 100;
                        result.proposalData[i].not_voted_percent = (notVotedCount / totalValidators) * 100;
                    }
                    resolve(result);
                })
                .catch(reject);
        });
    }

    /**
     * Get proposal by proposal_id
     * @param proposal_id Id of the requested proposal
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public getProposalById(proposal_id: string): Promise<any> {
        const sql = `
                SELECT P.proposal_title, 
                    P.proposal_id,
                    P.block_height,
                    M.detail,
                    P.tx_hash,
                    M.voting_fee_hash,
                    M.proposer_name,
                    P.fund_amount,
                    P.proposal_fee,
                    P.proposal_type,
                    P.vote_start_height,
                    M.voting_start_date,
                    P.vote_end_height,
                    M.voting_end_date,
                    M.submit_time,
                    P.proposal_status,
                    M.pre_evaluation_start_time,
                    M.pre_evaluation_end_time,
                    M.ave_pre_evaluation_score,
                    P.proposer_address,
                    P.proposal_fee_address,
                    P.proposal_result
                FROM proposal P 
                LEFT OUTER JOIN proposal_metadata M
                ON (P.proposal_id = M.proposal_id)
                WHERE P.proposal_id = ?
            `;
        const urls = `
                SELECT url
                FROM proposal_attachments
                WHERE proposal_id=?`;

        const total_votes = `
                    SELECT 
                        DISTINCT voter_address
                    FROM ballots
                    WHERE  proposal_id = ?
                    `;
        const vote_answer = `
                    SELECT ballot_answer
                    FROM ballots 
                    WHERE proposal_id = ?
                    AND voter_address = ?
                    ORDER BY sequence DESC limit 1`;

        const validators = `
                    SELECT count(DISTINCT(address)) as total_validators
                    FROM validators
        `;
        const result: any = {};
        let totalValidators: any;
        return new Promise<any>(async (resolve, reject) => {
            this.query(sql, [proposal_id.toString()])
                .then((rows: any) => {
                    result.proposalData = rows;
                    return this.query(urls, [proposal_id.toString()]);
                })
                .then((rows: any[]) => {
                    result.url = rows;
                    return this.query(validators, []);
                })
                .then((data: any) => {
                    totalValidators = data[0].total_validators;
                    result.total_validators = totalValidators;
                    return this.query(total_votes, [proposal_id.toString()]);
                })
                .then(async (rows: any[]) => {
                    let yesCount = 0;
                    let noCount = 0;
                    let abstainCount = 0;
                    for (let i = 0; i < rows.length; i++) {
                        const ballot_answer = await this.query(vote_answer, [
                            proposal_id.toString(),
                            rows[i].voter_address,
                        ]);
                        switch (ballot_answer[0].ballot_answer) {
                            case 0: {
                                ++yesCount;
                                break;
                            }
                            case 1: {
                                ++noCount;
                                break;
                            }
                            case 2: {
                                ++abstainCount;
                                break;
                            }
                            default:
                                break;
                        }
                    }
                    const votedCount = rows.length;
                    const notVotedCount = totalValidators - votedCount;
                    result.yes = yesCount;
                    result.no = noCount;
                    result.abstain = abstainCount;
                    result.not_voted = notVotedCount;
                    result.voted = votedCount;
                    result.yes_percent = (yesCount / totalValidators) * 100;
                    result.no_percent = (noCount / totalValidators) * 100;
                    result.abstain_percent = (abstainCount / totalValidators) * 100;
                    result.not_voted_percent = (notVotedCount / totalValidators) * 100;
                    result.voted_percent = (votedCount / totalValidators) * 100;
                    resolve(result);
                })
                .catch(reject);
        });
    }

    /**
     * Get BOA Holder by address.
     * @param address Address of the holder
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public getBOAHolder(address: string): Promise<any> {
        const circulating_sql = `SELECT circulating_supply FROM blocks_stats WHERE block_height = (SELECT MAX(block_height) FROM blocks_stats)`;
        const sql = `
            SELECT
	            address, tx_count, total_received, total_sent,
	            total_reward, total_frozen, total_balance
            FROM
                accounts
            WHERE address = ?`;
        const result: any = {};
        return new Promise<any[]>((resolve, reject) => {
            this.query(sql, [address])
                .then((rows: any[]) => {
                    result.holder = rows;
                    return this.query(circulating_sql, []);
                })
                .then((rows: any[]) => {
                    result.circulating_supply = rows[0].circulating_supply;
                    resolve(result);
                })
                .catch(reject);
        });
    }

    /**
     * This method update the validators when block header is updated
     * @param block_header The block header
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public updateValidatorsByBlockheader(block_header: BlockHeader, conn?: mysql.PoolConnection): Promise<void> {
        function update_validator(
            storage: LedgerStorage,
            height: Height,
            validator: IValidator,
            signed: SignStatus
        ): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                storage
                    .query(
                        `UPDATE validator_by_block
                            SET signed = ?
                            WHERE block_height = ? and address = ?`,
                        [signed, height.value, validator.address],
                        conn
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
                if (JSBI.equal(block_header.height.value, JSBI.BigInt(0))) {
                    resolve();
                    return;
                }
                const cycleValidators: any[] = await this.getValidatorsAPI(block_header.height, null, conn);

                const bitMask = BitMask.fromString(block_header.validators.toString());
                for (let i = 0; i < bitMask.length; i++) {
                    if (bitMask.get(i))
                        await update_validator(this, block_header.height, cycleValidators[i], SignStatus.SIGNED);
                    else {
                        await update_validator(this, block_header.height, cycleValidators[i], SignStatus.UNSIGNED);
                    }
                }
                resolve();
            })();
        });
    }

    /**
     * Get validator reward
     * @param address Address of the validator
     * @param limit Maximum record count that can be obtained from one query
     * @param page The number on the page, this value begins with 1
     * @returns returns the Promise with requested data
     * and if an error occurs the .catch is called with an error.
     */
    public getValidatorReward(address: string, limit: number, page: number): Promise<any> {
        const sql = `
                SELECT
                V.amount stake_amount,
                O.block_height,
                O.amount as validator_reward,
                B.total_reward,
                B.total_fee,
                count(*) OVER() AS full_count
                FROM tx_outputs O
                LEFT OUTER JOIN validators V ON
                (V.address = O.address
                AND V.enrolled_at >= (O.block_height - ${this.validator_cycle})
                AND V.enrolled_at < O.block_height
                )
                INNER JOIN blocks_stats B
                ON(O.block_height = B.block_height)
                WHERE
                (O.address = ?
                AND O.type = 2)
                ORDER BY O.block_height ASC
                LIMIT ? OFFSET ?`;
        return this.query(sql, [address, limit, limit * (page - 1)]);
    }

    /**
     * Get Average Fees between given time range.
     * @param from Begin date for chart history
     * @param to End date for chart history
     * @param filter scale in which data needed to be fetched i.e H, D, M, Y
     */
    public calculateAvgFeeChart(from: number, to: number, filter: string): Promise<any[]> {
        const sql = `SELECT
                height, time_stamp, average_tx_fee, granularity_time_stamp,
                granularity, total_tx_fee, total_payload_fee, total_fee
             FROM
                fees
             WHERE
                granularity_time_stamp>=? AND  granularity_time_stamp<=? AND  granularity = ?`;
        return this.query(sql, [from, to, filter]);
    }

    /**
     * Get Boa Holder data between given range.
     * @param address The address of BOA Holder
     * @param from Begin date for chart history
     * @param to End date for chart history
     * @param filter scale in which data needed to be fetched i.e H, D, M, Y
     */
    public getAccountChart(address: string, from: number, to: number, filter: string): Promise<any[]> {
        const sql = `SELECT
                address, block_height, granularity_time_stamp, time_stamp, balance, granularity
             FROM
                account_history
             WHERE
              address=? AND granularity_time_stamp>=? AND  granularity_time_stamp<=? AND  granularity = ?`;
        return this.query(sql, [address, from, to, filter]);
    }

    /**
     * This method fetch the Proposal based on the status.
     * @param status The Proposal status.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public getProposalByStatus(status: ProposalStatus) {
        const sql = `
        SELECT
            proposal_id,
            block_height,
            tx_hash,
            app_name,
            proposal_type,
            proposal_title,
            vote_start_height,
            vote_end_height,
            doc_hash,
            fund_amount,
            proposal_fee,
            vote_fee,
            proposal_fee_tx_hash,
            proposer_address,
            proposal_fee_address,
            proposal_status,
            proposal_result,
            data_collection_status
        FROM
            proposal
        WHERE
            proposal_status = ?`;

        return this.query(sql, [status]);
    }

    /**
     * This method fetch the validators by block height
     * @param height The block height
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public getValidatorsByBlock(height: Height) {
        const sql = `
        SELECT
            block_height,
            enrolled_height,
            address,
            utxo_key,
            signed,
            slashed
        FROM
            validator_by_block
        WHERE
            block_height = ?`;

        return this.query(sql, [height.value.toString()]);
    }

    /**
     * This method will put node information into the DB
     * @param node_info Node information
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public putNodeInfo(node_info: INodeInformation) {
        const sql = `INSERT INTO nodes
                    (public_key, utxo_key, url, port, block_height, update_time)
                    VALUES
                        (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY
                    UPDATE
                    utxo_key = VALUES(utxo_key),
                    url = VALUES(url),
                    port = VALUES(port),
                    block_height = VALUES(block_height),
                    update_time = VALUES(update_time)
        `;

        return this.query(sql, [
            node_info.public_key,
            node_info.utxo,
            node_info.URL,
            node_info.port,
            node_info.block_height,
            node_info.update_time,
        ]);
    }

    /**
     * This method is used to get the ballots of given address.
     * @param proposal_id The proposal id
     * @param type The type filter
     * @param height The height filter
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public getProposalBallots(proposal_id: string, type?: string, height?: number) {
        const type_filter = type ? `AND B.ballot_answer = ${type}` : "";
        const height_filter = height ? `AND B.block_height = ${height}` : "";
        const sql = `
                SELECT
                   B.proposal_id,
                   B.block_height,
                   B.app_name,
                   B.tx_hash,
                   B.voter_address,
                   B.sequence,
                   B.ballot,
                   B.signature,
                   B.voting_time,
                   B.ballot_answer
                FROM
                    proposal P INNER JOIN ballots B ON(P.proposal_id = B.proposal_id)
                WHERE
                P.proposal_id = ? ${type_filter} ${height_filter}`;

        return this.query(sql, [proposal_id]);
    }
    /**
     * This method get the current exchange rate BOA/USD.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public getExchangeRate(currency: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.getCoinMarketcap(currency)
                .then((rows: any) => {
                    if (rows[0]) {
                        resolve(rows[0].price);
                    } else {
                        reject();
                    }
                })
                .catch((err) => {
                    logger.error("Failed to data lookup to the DB: " + err, {
                        operation: Operation.db,
                        height: HeightManager.height.toString(),
                        status: Status.Error,
                        responseTime: Number(moment().utc().unix() * 1000),
                    });
                    reject();
                });
        });
    }

    /**
     * Get the status of search for block -> hash and transaction -> tx_hash
     * @param value The hash for searching.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the records
     * and if an error occurs the `.catch` is called with an error.
     */
    public exist(value: Hash): Promise<any[]> {
        const hash = value.toBinary(Endian.Little);

        const sql = `SELECT
                (SELECT IF(EXISTS (SELECT hash FROM blocks WHERE hash= ?), 1, 0)) as block,
                (SELECT IF(EXISTS (SELECT tx_hash FROM transactions WHERE tx_hash= ?
                UNION 
                SELECT tx_hash FROM transaction_pool WHERE tx_hash=?), 1, 0)) as transaction`;

        return this.query(sql, [hash, hash, hash]);
    }

    /**
     * Drop Database
     * Use this only in the test code.
     * @param database The name of database
     */
    public async dropTestDB(database: any): Promise<any[]> {
        const sql = `DROP DATABASE ${database}`;
        return this.query(sql, []);
    }
}
