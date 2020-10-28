import { AgoraClient } from './modules/agora/AgoraClient';
import { cors_options } from './cors';
import { Endian } from './modules/utils/buffer';
import { LedgerStorage } from './modules/storage/LedgerStorage';
import { logger } from './modules/common/Logger';
import { Height, PreImageInfo, Hash, hash } from './modules/data';
import { Utils } from './modules/utils/Utils';
import { ValidatorData, IPreimage } from './modules/data/ValidatorData';
import { WebService } from './modules/service/WebService';

import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { UInt64 } from 'spu-integer-math';
import { URL } from 'url';

// Module extension to allow customizing JSON serialization
declare global {
    interface BigInt {
        toJSON(key?: string): string;
    }
}

class Stoa extends WebService
{
    public ledger_storage: LedgerStorage;

    /**
     * The network endpoint to connect to Agora
     */
    private readonly agora_endpoint: URL;

    /**
     * Chain of pending store operations
     *
     * To ensure swift response time to Agora when our handlers are called,
     * we start the storage asynchronously and respond immediately with HTTP/200.
     * This means that if we get called in a quick succession, we need to make sure
     * the data is processed serially. To do so, we chain `Promise`s in this member.
     */
    private pending: Promise<void>;

    /**
     * The maximum number of blocks that can be recovered at one time
     */
    private _max_count_on_recovery: number = 64;

    /**
     * Constructor
     * @param database_filename sqlite3 database file name
     * @param agora_endpoint The network endpoint to connect to Agora
     * @param port The network port of Stoa
     * @param address The network address of Stoa
     */
    constructor (database_filename: string, agora_endpoint: URL, port: number | string, address?: string)
    {
        super(port, address);

        this.agora_endpoint = agora_endpoint;

        // create blockStorage
        this.ledger_storage = new LedgerStorage(database_filename, (err: Error | null) =>
        {
            if (err != null)
            {
                logger.error(err);
                throw new Error(err.message);
            }
        });

        // Instantiate a dummy promise for chaining
        this.pending = new Promise<void>(function (resolve, reject) { resolve() });

        // Allow JSON serialization of BigInt
        BigInt.prototype.toJSON = function(key?: string) {
            return this.toString();
        }
    }

    /**
     * Setup and start the server
     */
    public async start (): Promise<void>
    {
        // Prepare middleware

        // parse application/x-www-form-urlencoded
        this.app.use(bodyParser.urlencoded({extended: false}));
        this.app.use(bodyParser.raw({type: "*/*"}));
        this.app.use(cors(cors_options));
        // enable pre-flight
        this.app.options('*', cors(cors_options));

        // Prepare routes
        this.app.get("/validators", this.getValidators.bind(this));
        this.app.get("/validator/:address", this.getValidator.bind(this));
        this.app.post("/block_externalized", this.putBlock.bind(this));
        this.app.post("/preimage_received", this.putPreImage.bind(this));

        // Start the server
        return super.start();
    }

    /**
     * GET /validators
     *
     * Called when a request is received through the `/validators` handler
     *
     * Returns a set of Validators based on the block height if there is a height.
     * If height was not provided the latest validator set is returned.
     */
    private getValidators (req: express.Request, res: express.Response)
    {
        if ((req.query.height !== undefined) &&
            !Utils.isPositiveInteger(req.query.height.toString()))
        {
            res.status(400).send("The Height value is not valid.");
            return;
        }

        let height = (req.query.height !== undefined)
            ? new Height(req.query.height.toString())
            : null;

        if (height != null)
            logger.http(`GET /validators height=${height.toString()}`);
        else
            logger.http(`GET /validators`);

        this.ledger_storage.getValidatorsAPI(height, null)
            .then((rows: any[]) => {
                if (rows.length)
                {
                    let out_put:Array<ValidatorData> = new Array<ValidatorData>();

                    for (const row of rows)
                    {
                        let preimage_hash: Buffer = row.preimage_hash;
                        let preimage_distance: number = row.preimage_distance;
                        let target_height: UInt64 = UInt64.fromNumber(row.height);
                        let result_preimage_hash = new Hash();
                        let start_index: UInt64 = UInt64.add(UInt64.fromNumber(row.enrolled_at), 1);

                        // Hashing preImage
                        if ((UInt64.compare(target_height, start_index) >= 0) &&
                            (UInt64.compare(UInt64.add(start_index, row.preimage_distance), target_height) >= 0))
                        {
                            result_preimage_hash.fromBinary(preimage_hash, Endian.Little);
                            let count = Number(Utils.UInt64ToString(UInt64.sub(UInt64.add(start_index, row.preimage_distance), target_height)));
                            for (let i = 0; i < count; i++)
                            {
                                result_preimage_hash = hash(result_preimage_hash.data);
                                preimage_distance--;
                            }
                        }
                        else
                        {
                            preimage_distance = NaN;
                            result_preimage_hash = Hash.NULL;
                        }

                        let preimage: IPreimage = {
                            distance: preimage_distance,
                            hash: result_preimage_hash.toString()
                        } as IPreimage;

                        let validator: ValidatorData =
                            new ValidatorData(row.address, new Height(BigInt(row.enrolled_at)),
                                              Hash.createFromBinary(row.stake, Endian.Little).toString(),
                                              preimage);
                        out_put.push(validator);
                    }
                    res.status(200).send(Utils.toJson(out_put));
                }
                else
                {
                    res.status(204).send();
                }
            })
            .catch((err) => {
                logger.error("Failed to data lookup to the DB: " + err);
                res.status(500).send("Failed to data lookup");
            }
        );
    }

    /**
     * GET /validator/:address
     *
     * Called when a request is received through the `/validators/:address` handler
     *
     * Returns a set of Validators based on the block height if there is a height.
     * If height was not provided the latest validator set is returned.
     * If an address was provided, return the validator data of the address if it exists.
     */
    private getValidator (req: express.Request, res: express.Response)
    {
        if ((req.query.height !== undefined) &&
            !Utils.isPositiveInteger(req.query.height.toString()))
        {
            res.status(400).send("The Height value is not valid.");
            return;
        }

        let height = (req.query.height !== undefined)
            ? new Height(req.query.height.toString())
            : null;

        let address: string = String(req.params.address);

        if (height != null)
            logger.http(`GET /validator/${address} height=${height.toString()}`);
        else
            logger.http(`GET /validator/${address}}`);

        this.ledger_storage.getValidatorsAPI(height, address)
            .then((rows: any[]) => {
                if (rows.length)
                {
                    let out_put:Array<ValidatorData> = new Array<ValidatorData>();

                    for (const row of rows)
                    {
                        let preimage_hash: Buffer = row.preimage_hash;
                        let preimage_distance: number = row.preimage_distance;
                        let target_height: UInt64 = UInt64.fromNumber(row.height);
                        let result_preimage_hash = new Hash();
                        let start_index: UInt64 = UInt64.add(UInt64.fromNumber(row.enrolled_at), 1);

                        // Hashing preImage
                        if ((UInt64.compare(target_height, start_index) >= 0) &&
                            (UInt64.compare(UInt64.add(start_index, row.preimage_distance), target_height) >= 0))
                        {
                            result_preimage_hash.fromBinary(preimage_hash, Endian.Little);
                            let count = Number(Utils.UInt64ToString(UInt64.sub(UInt64.add(start_index, row.preimage_distance), target_height)));
                            for (let i = 0; i < count; i++)
                            {
                                result_preimage_hash = hash(result_preimage_hash.data);
                                preimage_distance--;
                            }
                        }
                        else
                        {
                            preimage_distance = NaN;
                            result_preimage_hash = Hash.NULL;
                        }

                        let preimage: IPreimage = {
                            distance: preimage_distance,
                            hash: result_preimage_hash.toString()
                        } as IPreimage;

                        let validator: ValidatorData =
                            new ValidatorData(row.address, new Height(BigInt(row.enrolled_at)),
                                              Hash.createFromBinary(row.stake, Endian.Little).toString(),
                                              preimage);
                        out_put.push(validator);
                    }
                    res.status(200).send(Utils.toJson(out_put));
                }
                else
                {
                    res.status(204).send();
                }
            })
            .catch((err) => {
                logger.error("Failed to data lookup to the DB: " + err);
                res.status(500).send("Failed to data lookup");
            }
        );
    }

    /**
     * POST /block_externalized
     *
     * When a request is received through the `/push` handler
     * we we call the storage handler asynchronously and  immediately
     * respond to Agora.
     */
    private putBlock (req: express.Request, res: express.Response)
    {
        // Change the number to a string to preserve the precision of UInt64
        let text = req.body.toString().replace(/([\[:])?(\d+)([,\}\]])/g, "$1\"$2\"$3");
        let body = JSON.parse(text);
        if (body.block === undefined)
        {
            res.status(400).send("Missing 'block' object in body");
            return;
        }

        logger.http(`POST /blocks_externalized block=${body.block.toString()}`);

        // To do
        // For a more stable operating environment,
        // it would be necessary to consider organizing the pool
        // using the database instead of the array.
        this.pending = this.pending.then(() => { return this.task({type: "block", data: body.block}); });

        res.status(200).send();
    }

    /**
     * POST /preimage_received
     *
     * When a request is received through the `/preimage_received` handler
     * JSON preImage data is parsed and stored on each storage.
     */
    private putPreImage (req: express.Request, res: express.Response)
    {
        let body = JSON.parse(req.body.toString());
        if (body.pre_image === undefined)
        {
            res.status(400).send("Missing 'preImage' object in body");
            return;
        }

        logger.http(`POST /preimage_received preimage=${body.pre_image.toString()}`);

        // To do
        // For a more stable operating environment,
        // it would be necessary to consider organizing the pool
        // using the database instead of the array.
        this.pending = this.pending.then(() => { return this.task({type: "pre_image", data: body.pre_image}); });

        res.status(200).send();
    }

    /**
     * Extract the block height from JSON.
     * @param block
     */
    private static getBlockHeight(block: any): Height
    {
        if ((block.header === undefined) ||
            (block.header.height === undefined))
        {
            throw Error("Not found block height in JSON Block");
        }

        return new Height(block.header.height);
    };

    /**
     * Restores blocks from expected_height to height - 1 and saves recently received block.
     * @param block The recently received block data
     * @param height The height of the recently received block data
     * @param expected_height The height of the block to save
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called
     * and if an error occurs the `.catch` is called with an error.
     */
    private recoverBlock (block: any, height: Height, expected_height: Height): Promise<boolean>
    {
        return new Promise<boolean>((resolve, reject) =>
        {
            (async () => {
                try
                {
                    let max_blocks = Number(UInt64.sub(height.value, expected_height.value).toString());

                    if (UInt64.compare(max_blocks, this._max_count_on_recovery) > 0)
                        max_blocks = this._max_count_on_recovery;

                    if (max_blocks > 0)
                    {
                        let agora_client = new AgoraClient(this.agora_endpoint);
                        let blocks = await agora_client.getBlocksFrom(expected_height, max_blocks);

                        // Save previous block
                        for (let elem of blocks)
                        {
                            let element_height = Stoa.getBlockHeight(elem);
                            if (UInt64.compare(element_height.value, expected_height.value) == 0)
                            {
                                await this.ledger_storage.putBlocks(elem);
                                expected_height.value = UInt64.add(expected_height.value, 1);
                                logger.info(`Recovered a block with block height of ${element_height.toString()}`);
                            }
                            else
                            {
                                resolve(false);
                                return;
                            }
                        }
                    }

                    // Save a block just received
                    if (UInt64.compare(height.value, expected_height.value) <= 0)
                    {
                        await this.ledger_storage.putBlocks(block);
                        logger.info(`Saved a block with block height of ${height.toString()}`);
                        resolve(true);
                    }
                    else
                    {
                        logger.info(`Save of block ${height.toString()} postponed to`);
                        resolve(false);
                    }
                }
                catch (err)
                {
                    reject(err);
                }
            })();
        });
    }

    /**
     * Process pending data and put it into the storage.
     *
     * This function will take care of querying Agora if some blocks are missing.
     * It is separate from the actual handler as we don't want to suffer timeout
     * on the connection, hence we reply with a 200 before the info is stored.
     * This also means that we need to store data serially, in the order it arrived,
     * hence the `pending: Promise<void>` member acts as a queue.
     *
     * @returns A new `Promise<void>` for the caller to chain with `pending`.
     */
    private task (stored_data: IPooledData): Promise<void>
    {
        return new Promise<void>(async (resolve, reject) =>
        {
            if (stored_data === undefined)
            {
                resolve();
                return;
            }

            if (stored_data.type === "block")
            {
                let block = stored_data.data;

                try
                {
                    let height = Stoa.getBlockHeight(block);
                    let expected_height = await this.ledger_storage.getExpectedBlockHeight();

                    if (UInt64.compare(height.value, expected_height.value) == 0)
                    {
                        // The normal case
                        // Save a block just received
                        await this.ledger_storage.putBlocks(block);
                        logger.info(`Saved a block with block height of ${height.toString()}`);
                    }
                    else if (UInt64.compare(height.value, expected_height.value) > 0)
                    {
                        // Recovery is required for blocks that are not received.
                        let success: boolean = false;
                        while (!success)
                            success = await this.recoverBlock(block, height, expected_height);
                    }
                    else
                    {
                        // Do not save because it is already a saved block.
                        logger.info(`Ignored a block with block height of ${height.toString()}`);
                    }
                    resolve();
                }
                catch (err)
                {
                    logger.error("Failed to store the payload of a push to the DB: " + err);
                    reject(err);
                }
            }
            else if (stored_data.type === "pre_image")
            {
                let pre_image: PreImageInfo = new PreImageInfo();

                try
                {
                    pre_image.parseJSON(stored_data.data);

                    await this.ledger_storage.updatePreImage(pre_image);
                    logger.info(`Saved a pre-image enroll_key : ${pre_image.enroll_key.toString().substr(0, 18)}, ` +
                        `hash : ${pre_image.hash.toString().substr(0, 18)}, distance : ${pre_image.distance}`);
                    resolve();
                }
                catch(err)
                {
                    logger.error("Failed to store the payload of a update to the DB: " + err);
                    reject(err);
                }
            }
        });
    }

    /**
     * Get the maximum number of blocks that can be recovered at one time
     */
    get max_count_on_recovery (): number
    {
        return this._max_count_on_recovery;
    }

    /**
     * Set the maximum number of blocks that can be recovered at one time
     */
    set max_count_on_recovery (value: number)
    {
        this._max_count_on_recovery = value;
    }
}

/**
 * The interface of the data that are temporarily stored in the pool
 */
interface IPooledData
{
    type: string;
    data: any;
}

export default Stoa;
