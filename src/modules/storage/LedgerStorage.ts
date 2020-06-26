/*******************************************************************************

    The class that create and insert and read the ledger into the database.

    Now only block header are stored.
    Transactions and other data will be managed by different classes.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Hash }  from '../common/Hash'
import { Storages } from './Storages';

/**
 * The class that insert and read the ledger into the database.
 */
export class LedgerStorage extends Storages
{
    private hash: Hash;

    constructor (filename: string, callback: (err: Error | null) => void)
    {
        super(filename, callback);
        this.hash = new Hash();
    }

    /**
     * Creates tables related to the ledger.
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     */
    public createTables (callback: (err: Error | null) => void)
    {
        var sql: string =
        `CREATE TABLE IF NOT EXISTS blocks
        (
            height INTEGER NOT NULL PRIMARY KEY,
            prev_block TEXT NOT NULL,
            validators TEXT NOT NULL,
            merkle_root TEXT NOT NULL,
            signature TEXT,
            tx_count INTEGER NOT NULL,
            enrollment_count INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS enrollments
        (
            block_height INTEGER NOT NULL,
            enrollment_index INTEGER NOT NULL,
            utxo_key TEXT NOT NULL,
            random_seed TEXT NOT NULL,
            cycle_length INTEGER NOT NULL,
            enroll_sig TEXT NOT NULL,
            PRIMARY KEY("block_height","enrollment_index")
        );

        CREATE TABLE IF NOT EXISTS "transactions"
        (
            "block_height"      INTEGER NOT NULL,
            "tx_index"          INTEGER NOT NULL,
            "tx_hash"           TEXT NOT NULL,
            "type"              INTEGER NOT NULL,
            "inputs_count"      INTEGER NOT NULL,
            "outputs_count"     INTEGER NOT NULL,
            PRIMARY KEY("block_height", "tx_index")
        );

        CREATE TABLE IF NOT EXISTS "tx_inputs"
        (
            "block_height"      INTEGER NOT NULL,
            "tx_index"          INTEGER NOT NULL,
            "in_index"          INTEGER NOT NULL,
            "previous"          TEXT NOT NULL,
            "out_index"         INTEGER NOT NULL,
            PRIMARY KEY("block_height", "tx_index", "in_index")
        );

        CREATE TABLE IF NOT EXISTS "tx_outputs"
        (
            "block_height"  INTEGER NOT NULL,
            "tx_index"      INTEGER NOT NULL,
            "output_index"  INTEGER NOT NULL,
            "tx_hash"       TEXT NOT NULL,
            "utxo_key"      TEXT NOT NULL,
            "amount"        NUMERIC NOT NULL,
            "address"       TEXT NOT NULL,
            "used"          INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY("block_height", "tx_index", "output_index")
        );

        CREATE TABLE IF NOT EXISTS "validators"
        (
            "enrolled_at"  INTEGER NOT NULL,
            "utxo_key"  TEXT NOT NULL,
            "address"  TEXT(56) NOT NULL,
            "amount"  NUMERIC NOT NULL,
            "preimage_distance"  INTEGER NOT NULL,
            "preimage_hash"  TEXT NOT NULL,
            PRIMARY KEY("enrolled_at","utxo_key")
        );
        `;

        this.db.exec(sql, (err: Error | null) =>
        {
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
    public putBlocks (data: any, callback?: (err: Error | null) => void)
    {
        let block: Block;
        try
        {
            block = new Block(data);


            var sql =
                `INSERT INTO blocks
                    (height, prev_block, validators, merkle_root, signature, tx_count, enrollment_count)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?)`;
            this.db.run(sql,
                [
                    block.header.height.value,
                    block.header.prev_block,
                    JSON.stringify(block.header.validators._storage),
                    block.header.merkle_root,
                    block.header.signature,
                    block.txs.length,
                    block.header.enrollments.length
                ], (err: Error | null) =>
            {
                this.putTransactions(block, (err1: Error | null) =>
                {
                    if (err1)
                    {
                        if (callback != undefined)
                            callback(err1);
                        return;
                    }

                    this.putEnrollments(block, callback);
                });
            });
        }
        catch (error)
        {
            if (callback != undefined)
                callback(error);
            return;
        }
    }

    /**
     * Gets a block data
     * @param height the height of the block to get
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getBlocks (height: number,
        callback: (err: Error | null, rows: any[]) => void)
    {
        var sql =
        `SELECT
            height, prev_block, validators, merkle_root, signature, tx_count, enrollment_count
        FROM
            blocks
        WHERE height = ?`;
        this.db.all(sql, [height], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Puts all enrollments
     * @param header: The instance of the `BlockHeader`
     * @param Callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     */
    public putEnrollments (block: Block, callback?: (err: Error | null) => void)
    {
        const enroll_stmt = this.db.prepare(
            `INSERT INTO enrollments
                (block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig)
            VALUES
                (?, ?, ?, ?, ?, ?)`
        );

        const validator_stmt = this.db.prepare(
            `INSERT INTO validators
                (enrolled_at, utxo_key, address, amount, preimage_distance, preimage_hash)
            SELECT ?, utxo_key, address, amount, ?, ?
                FROM tx_outputs
            WHERE
                tx_outputs.utxo_key = ?`
        );

        block.header.enrollments.forEach((enroll: Enrollment, enroll_idx: number) =>
        {
            enroll_stmt.run([
                block.header.height.value,
                enroll_idx,
                enroll.utxo_key,
                enroll.random_seed,
                enroll.cycle_length,
                enroll.enroll_sig
            ]);
            validator_stmt.run([
                block.header.height.value,
                0,
                '0x0000000000000000',
                enroll.utxo_key
            ]);
        });

        enroll_stmt.finalize((err1: Error | null) =>
        {
            if (err1)
            {
                if (callback != undefined)
                    callback(err1);
                return;
            }

            validator_stmt.finalize((err2: Error | null) =>
            {
                if (callback != undefined)
                    callback(err2);
            });
        });
    }

    /**
     * Get enrollments
     * @param Corresponding block height of enrollments
     * @param Callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getEnrollments (height: number, callback: (err: Error | null, rows: any[]) => void)
    {
        var sql =
        `SELECT
            block_height, enrollment_index, utxo_key, random_seed, cycle_length, enroll_sig
        FROM
            enrollments
        WHERE block_height = ?`;
        this.db.all(sql, [height], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Get validators
     * @param height block height of enrollments
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getValidators (height: number, callback: (err: Error | null, rows: any[]) => void)
    {
        var sql: string =
        `SELECT
            enrolled_at, utxo_key, address, amount, preimage_distance, preimage_hash
        FROM
            validators
        WHERE enrolled_at = ?`;
        this.db.all(sql, [height], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Puts all transactions
     * @param block: The instance of the `Block`
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     */
    public putTransactions (block: Block, callback?: (err: Error | null) => void)
    {
        const tx_stmt = this.db.prepare(
            `INSERT INTO transactions
                (block_height, tx_index, tx_hash, type, inputs_count, outputs_count)
            VALUES
                (?, ?, ?, ?, ?, ?)`
        );

        const inputs_stmt = this.db.prepare(
            `INSERT INTO tx_inputs
                (block_height, tx_index, in_index, previous, out_index)
            VALUES
                (?, ?, ?, ?, ?)`
        );

        const outputs_stmt = this.db.prepare(
            `INSERT INTO tx_outputs
                (block_height, tx_index, output_index, tx_hash, utxo_key, address, amount)
            VALUES
                (?, ?, ?, ?, ?, ?, ?)`
        );

        const update_used_stmt = this.db.prepare(
            `UPDATE tx_outputs SET used = 1 WHERE tx_hash = ? and output_index = ?`
        );

        block.txs.forEach((tx: Transaction, tx_idx: number) => {
            tx_stmt.run([
                block.header.height.value,
                tx_idx,
                block.merkle_tree[tx_idx],
                tx.type,
                tx.inputs.length,
                tx.outputs.length
            ]);
            tx.inputs.forEach((input: TxInputs, in_idx: number)  => {
                inputs_stmt.run([
                    block.header.height.value,
                    tx_idx,
                    in_idx,
                    input.previous,
                    input.index]);
                update_used_stmt.run([input.previous, input.index]);
            });
            tx.outputs.forEach((output: TxOutputs, out_idx: number)  => {
                this.hash.makeUTXOKey(block.merkle_tree[tx_idx], BigInt(out_idx));
                outputs_stmt.run([
                    block.header.height.value,
                    tx_idx,
                    out_idx,
                    block.merkle_tree[tx_idx],
                    this.hash.toHexString(),
                    output.address,
                    output.value]);
            });
        });

        tx_stmt.finalize((err1: Error | null) =>
        {
            if (err1)
            {
                if (callback != undefined)
                    callback(err1);
                return;
            }

            inputs_stmt.finalize((err2: Error | null) =>
            {
                if (err2)
                {
                    if (callback != undefined)
                        callback(err2);
                    return;
                }

                outputs_stmt.finalize((err3: Error | null) =>
                {
                    if (err3)
                    {
                        if (callback != undefined)
                            callback(err3);
                        return;
                    }

                    update_used_stmt.finalize((err4: Error | null) =>
                    {
                        if (callback != undefined)
                            callback(err4);
                    });
                });
            });
        });
    }

    /**
     * Gets a transaction data
     * @param height The height of the block to get
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getTransactions (height: number,
        callback: (err: Error | null, rows: any[]) => void)
    {
        var sql: string =
        `SELECT
            block_height, tx_index, tx_hash, type, inputs_count, outputs_count
        FROM
            transactions
        WHERE block_height = ?`;
        this.db.all(sql, [height], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Gets a transaction inputs data
     * @param height The height of the block to get
     * @param tx_index The index of the transaction in the block
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getTxInputs (height: number, tx_index: number,
        callback: (err: Error | null, rows: any[]) => void)
    {
        var sql: string =
        `SELECT
            block_height, tx_index, in_index, previous, "out_index"
        FROM
            tx_inputs
        WHERE block_height = ? AND tx_index = ?`;
        this.db.all(sql, [height, tx_index], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }

    /**
     * Gets a transaction outputs data
     * @param height The height of the block to get
     * @param tx_index The index of the transaction in the block
     * @param callback If provided, this function will be called when
     * the database was finished successfully or when an error occurred.
     * The first argument is an error object.
     * The second argument is result set.
     */
    public getTxOutputs (height: number, tx_index: number,
        callback: (err: Error | null, rows: any[]) => void)
    {
        var sql: string =
        `SELECT
            block_height, tx_index, output_index, tx_hash, utxo_key, address, amount, used
        FROM
            tx_outputs
        WHERE block_height = ? AND tx_index = ?`;
        this.db.all(sql, [height, tx_index], (err: Error | null, rows: any[]) =>
        {
            callback(err, rows);
        });
    }
}

/**
 * Class that stores the height of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property are not present.
 */
export class Height
{
    value: number;

    constructor (json: any)
    {
        if (json.hasOwnProperty('value'))
        {
            this.value = json['value'];
        }
        else
        {
            throw new Error("Parse error: Height.value");
        }
    }
}

/**
 * Class that stores the BitField of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property are not present.
 */
export class BitField
{
    _storage: number[];

    constructor (json: any)
    {
        if (json.hasOwnProperty('_storage'))
        {
            this._storage = [];
            for (let idx = 0; idx < json._storage.length; idx++)
            {
                this._storage.push(Number(json._storage[idx]));
            }
        }
        else
        {
            throw new Error("Parse error: BitField._storage");
        }
    }
}

/**
 * The class that stores the header of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class BlockHeader
{
    prev_block: string;
    height: Height;
    merkle_root: string;
    validators: BitField;
    signature: string;
    enrollments: Enrollment[]

    constructor (json: any)
    {
        if (json.hasOwnProperty('prev_block'))
        {
            this.prev_block = json.prev_block;
        }
        else
        {
            throw new Error("Parse error: BlockHeader.prev_block");
        }

        if (json.hasOwnProperty('height'))
        {
            this.height = new Height(json.height);
        }
        else
        {
            throw new Error("Parse error: BlockHeader.height");
        }

        if (json.hasOwnProperty('merkle_root'))
        {
            this.merkle_root = json.merkle_root;
        }
        else
        {
            throw new Error("Parse error: BlockHeader.merkle_root");
        }

        if (json.hasOwnProperty('validators'))
        {
            this.validators = new BitField(json.validators);
        }
        else
        {
            throw new Error("Parse error: BlockHeader.validators");
        }

        if (json.hasOwnProperty('signature'))
        {
            this.signature = json.signature;
        }
        else
        {
            throw new Error("Parse error: BlockHeader.signature");
        }

        if (json.hasOwnProperty('enrollments'))
        {
            this.enrollments = [];
            for (let idx = 0; idx < json.enrollments.length; idx++)
            {
                this.enrollments.push(new Enrollment(json.enrollments[idx]));
            }
        }
        else
        {
            throw new Error("Parse error: BlockHeader.enrollments");
        }
    }
}

/**
 * The class that stores the enrollment of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Enrollment
{
    utxo_key: string;
    random_seed: string;
    cycle_length: number;
    enroll_sig: string;

    constructor (json: any)
    {
        if (json.hasOwnProperty('utxo_key'))
        {
            this.utxo_key = json.utxo_key;
        }
        else
        {
            throw new Error("Parse error: Enrollment.utxo_key");
        }

        if (json.hasOwnProperty('random_seed'))
        {
            this.random_seed = json.random_seed;
        }
        else
        {
            throw new Error("Parse error: Enrollment.random_seed");
        }

        if (json.hasOwnProperty('cycle_length'))
        {
            this.cycle_length = json.cycle_length;
        }
        else
        {
            throw new Error("Parse error: Enrollment.cycle_length");
        }

        if (json.hasOwnProperty('enroll_sig'))
        {
            this.enroll_sig = json.enroll_sig;
        }
        else
        {
            throw new Error("Parse error: Enrollment.enroll_sig");
        }
    }
}

/**
 * The class that stores the transaction of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Transaction
{
    type: number;
    inputs: TxInputs[];
    outputs: TxOutputs[];

    constructor (json: any)
    {
        if (json.hasOwnProperty('type'))
        {
            this.type = json.type;
        }
        else
        {
            throw new Error("Parse error: Transaction.type");
        }

        if (json.hasOwnProperty('inputs'))
        {
            this.inputs = [];
            for (let idx = 0; idx < json.inputs.length; idx++)
            {
                this.inputs.push(new TxInputs(json.inputs[idx]));
            }
        }
        else
        {
            throw new Error("Parse error: Transaction.inputs");
        }

        if (json.hasOwnProperty('outputs'))
        {
            this.outputs = [];
            for (let idx = 0; idx < json.outputs.length; idx++)
            {
                this.outputs.push(new TxOutputs(json.outputs[idx]));
            }
        }
        else
        {
            throw new Error("Parse error: Transaction.inputs");
        }
    }
}

/**
 * The class that stores the transaction's inputs of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class TxInputs
{
    previous: string;
    index: number;
    signature: string;

    constructor (json: any)
    {
        if (json.hasOwnProperty('previous'))
        {
            this.previous = json.previous;
        }
        else
        {
            throw new Error("Parse error: TxInputs.previous");
        }

        if (json.hasOwnProperty('index'))
        {
            this.index = json.index;
        }
        else
        {
            throw new Error("Parse error: TxInputs.index");
        }

        if (json.hasOwnProperty('signature'))
        {
            this.signature = json.signature;
        }
        else
        {
            throw new Error("Parse error: TxInputs.signature");
        }
    }
}

/**
 * The class that stores the transaction's outputs of a block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class TxOutputs
{
    value: number;
    address: string;

    constructor (json: any)
    {
        if (json.hasOwnProperty('value'))
        {
            this.value = json.value;
        }
        else
        {
            throw new Error("Parse error: TxOutputs.value");
        }

        if (json.hasOwnProperty('address'))
        {
            this.address = json.address;
        }
        else
        {
            throw new Error("Parse error: TxOutputs.address");
        }
    }
}

/**
 * The class that stores the block.
 * Convert JSON object to TypeScript's instance.
 * An exception occurs if the required property is not present.
 */
export class Block
{
    header: BlockHeader;
    txs: Transaction[];
    merkle_tree: string[];

    constructor (json: any)
    {
        if (json.hasOwnProperty('header'))
        {
            this.header = new BlockHeader(json.header);
        }
        else
        {
            throw new Error("Parse error: Block.header");
        }

        if (json.hasOwnProperty('txs'))
        {
            this.txs = [];
            for (let idx = 0; idx < json.txs.length; idx++)
            {
                this.txs.push(new Transaction(json.txs[idx]));
            }
        }
        else
        {
            throw new Error("Parse error: Block.txs");
        }

        if (json.hasOwnProperty('merkle_tree'))
        {
            this.merkle_tree = [];
            for (let idx = 0; idx < json.merkle_tree.length; idx++)
            {
                this.merkle_tree.push(json.merkle_tree[idx]);
            }
        }
        else
        {
            throw new Error("Parse error: Block.merkle_tree");
        }
    }
}
