import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { LedgerStorage } from "./modules/storage/LedgerStorage";
import { ValidatorData, IPreimage, IValidator } from "./modules/data/ValidatorData";
import { PreImageInfo, Hash, hash } from "./modules/data";
import { cors_options } from "./cors";
import { AgoraClient } from "./modules/agora/AgoraClient";
import { TaskManager } from "./modules/task/TaskManager";

class Stoa {
    public stoa: express.Application;

    public ledger_storage: LedgerStorage;

    /**
     * The network host to connect to Agora
     */
    private readonly agora_host: string;

    /**
     * The network port to connect to Agora
     */
    private readonly agora_port: string;

    /**
     * The temporary storage of the data received from Agora
     */
    protected pool: Array<IPooledData>;

    /**
     * The task manager that periodically executes registered a task function
     */
    protected task_manager: TaskManager;

    /**
     * Constructor
     * @param database_filename sqlite3 database file name
     * @param agora_host The network host to connect to Agora
     * @param agora_port The network port to connect to Agora
     */
    constructor (database_filename: string, agora_host: string, agora_port: string)
    {
        this.agora_host = agora_host;
        this.agora_port = agora_port;

        this.pool = [];

        this.stoa = express();
        // parse application/x-www-form-urlencoded
        this.stoa.use(bodyParser.urlencoded({ extended: false }));
        // parse application/json
        this.stoa.use(bodyParser.json());
        // create blockStorage
        this.ledger_storage = new LedgerStorage(database_filename, (err: Error | null) =>
        {
            if (err != null)
            {
                console.error(err);
                throw new Error(err.message);
            }
        });

        this.stoa.use(cors(cors_options));
        // enable pre-flight
        this.stoa.options('*', cors(cors_options));

        // create task manager, delay time is 10 milliseconds
        this.task_manager = new TaskManager(() =>
        {
            return this.task();
        }, 10);

        /**
         * Called when a request is received through the `/validators` handler
         *
         * Returns a set of Validators based on the block height if there is a height.
         * If height was not provided the latest validator set is returned.
         */
        this.stoa.get("/validators",
            (req: express.Request, res: express.Response, next: express.NextFunction) => {

            let height: number = Number(req.query.height);

            if (!Number.isNaN(height) && (!Number.isInteger(height) || height < 0))
            {
                res.status(400).send("The Height value is not valid.");
                return;
            }

            this.ledger_storage.getValidatorsAPI(height, null,
                (rows: any[]) =>
                {
                    if (rows.length)
                    {
                        let out_put:Array<ValidatorData> = new Array<ValidatorData>();

                        for (const row of rows)
                        {
                            let preimage_hash: string = row.preimage_hash;
                            let preimage_distance: number = row.preimage_distance;
                            let target_height: number = row.height;
                            let result_preimage_hash = new Hash();
                            let start_index: number = row.enrolled_at + 1;

                            // Hashing preImage
                            if ((target_height >= start_index) &&
                                (start_index + row.preimage_distance) >= target_height)
                            {
                                result_preimage_hash.fromString(preimage_hash);
                                for (let i = 0; i < start_index + row.preimage_distance - target_height; i++)
                                {
                                    result_preimage_hash = hash(result_preimage_hash.data);
                                    preimage_distance--;
                                }
                            }
                            else
                            {
                                preimage_distance = NaN;
                                result_preimage_hash.fromString(Hash.NULL);
                            }

                            let preimage: IPreimage =
                                {
                                    distance: preimage_distance,
                                    hash: result_preimage_hash.toString()
                                } as IPreimage;

                            let validator: ValidatorData =
                                new ValidatorData(row.address, row.enrolled_at, row.stake, preimage);
                            out_put.push(validator);
                        }
                        res.status(200).send(JSON.stringify(out_put));
                    }
                    else
                    {
                        res.status(204).send();
                    }
                },
                (err: Error) =>
                {
                    console.error("Failed to data lookup to the DB: " + err);
                    res.status(500).send("Failed to data lookup");
                    return;
                }
            );
        });

        /**
         * Called when a request is received through the `/validators/:address` handler
         *
         * Returns a set of Validators based on the block height if there is a height.
         * If height was not provided the latest validator set is returned.
         * If an address was provided, return the validator data of the address if it exists.
         */
        this.stoa.get("/validator/:address",
            (req: express.Request, res: express.Response, next: express.NextFunction) => {

            let height: number = Number(req.query.height);
            let address: string = String(req.params.address);

            if (!Number.isNaN(height) && (!Number.isInteger(height) || height < 0))
            {
                res.status(400).send("The Height value is not valid.");
                return;
            }

            this.ledger_storage.getValidatorsAPI(height, address,
                (rows: any[]) =>
                {
                    if (rows.length)
                    {
                        let out_put:Array<ValidatorData> = new Array<ValidatorData>();

                        for (const row of rows)
                        {
                            let preimage_hash: string = row.preimage_hash;
                            let preimage_distance: number = row.preimage_distance;
                            let target_height: number = row.height;
                            let result_preimage_hash = new Hash();
                            let start_index: number = row.enrolled_at + 1;

                            // Hashing preImage
                            if ((target_height >= start_index) &&
                                (start_index + row.preimage_distance) >= target_height)
                            {
                                result_preimage_hash.fromString(preimage_hash);
                                for (let i = 0; i < start_index + row.preimage_distance - target_height; i++)
                                {
                                    result_preimage_hash = hash(result_preimage_hash.data);
                                    preimage_distance--;
                                }
                            }
                            else
                            {
                                preimage_distance = NaN;
                                result_preimage_hash.fromString(Hash.NULL);
                            }

                            let preimage: IPreimage =
                                {
                                    distance: preimage_distance,
                                    hash: result_preimage_hash.toString()
                                } as IPreimage;

                            let validator: ValidatorData =
                                new ValidatorData(row.address, row.enrolled_at, row.stake, preimage);
                            out_put.push(validator);
                        }
                        res.status(200).send(JSON.stringify(out_put));
                    }
                    else
                    {
                        res.status(204).send();
                    }
                },
                (err: Error) =>
                {
                    console.error("Failed to data lookup to the DB: " + err);
                    res.status(500).send("Failed to data lookup");
                    return;
                }
            );
        });

        /**
         * When a request is received through the `/push` handler
         * The block data received is stored in the pool
         * and immediately sends a response to Agora
         */
        this.stoa.post("/block_externalized",
            (req: express.Request, res: express.Response, next: express.NextFunction) => {

            if (req.body.block === undefined)
            {
                res.status(400).send("Missing 'block' object in body");
                return;
            }

            // To do
            // For a more stable operating environment,
            // it would be necessary to consider organizing the pool
            // using the database instead of the array.
            this.pool.push({type: "block", data: req.body.block});

            res.status(200).send();
        });

        /**
         * When a request is received through the `/preimage_received` handler
         * JSON preImage data is parsed and stored on each storage.
         */
        this.stoa.post("/preimage_received",
            (req: express.Request, res: express.Response, next: express.NextFunction) => {

            if (req.body.pre_image === undefined)
            {
                res.status(400).send("Missing 'preImage' object in body");
                return;
            }

            // To do
            // For a more stable operating environment,
            // it would be necessary to consider organizing the pool
            // using the database instead of the array.
            this.pool.push({type: "pre_image", data: req.body.pre_image});

            res.status(200).send();
        });
    }

    /**
     * Extract the block height from JSON.
     * @param block
     */
    private static getBlockHeight(block: any): number
    {
        if  (
            (block.header === undefined) ||
            (block.header.height === undefined) ||
            (block.header.height.value === undefined)
        )
        {
            throw Error("Not found block height in JSON Block");
        }

        return Number(block.header.height.value);
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
    private recoverBlock (block: any, height: number, expected_height: number): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            (async () => {
                try
                {
                    let block_height = expected_height;
                    let max_blocks = height - expected_height;
                    let response_result = [];

                    if (max_blocks > 0)
                    {
                        let agora_client = new AgoraClient(this.agora_host, this.agora_port);
                        let blocks = await agora_client.requestBlocks(block_height, max_blocks);

                        let element_height: number;

                        // Save previous block
                        for (let elem of blocks)
                        {
                            element_height = Stoa.getBlockHeight(elem);
                            if (element_height == expected_height)
                            {
                                await this.ledger_storage.putBlocks(elem);
                                expected_height++;
                                response_result.push(`recover ${element_height}`);
                                console.log(`Recovered a block with block height of ${element_height}`);
                            }
                            else
                            {
                                resolve();
                                return;
                            }
                        }
                    }

                    // Save a block just received
                    if (height == expected_height)
                    {
                        await this.ledger_storage.putBlocks(block);
                        response_result.push(`save ${height}`);
                        console.log(`Saved a block with block height of ${height}`);
                    }

                    resolve();
                }
                catch (err)
                {
                    reject(err);
                }
            })();
        });
    }

    /**
     * The task function to process data received from Agora one by one
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    private task (): Promise<void>
    {
        return new Promise<void>(async (resolve, reject) =>
        {
            let stored_data = this.pool.shift();

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

                    if (height == expected_height)
                    {
                        // The normal case
                        // Save a block just received
                        await this.ledger_storage.putBlocks(block);
                        console.log(`Saved a block with block height of ${height}`);
                    }
                    else if (height > expected_height)
                    {
                        // Recovery is required for blocks that are not received.
                        await this.recoverBlock(block, height, expected_height);
                    }
                    else
                    {
                        // Do not save because it is already a saved block.
                        console.log(`Ignored a block with block height of ${height}`);
                    }
                    resolve();
                }
                catch (err)
                {
                    console.error("Failed to store the payload of a push to the DB: " + err);
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
                    console.log(`Saved a pre-image enroll_key : ${pre_image.enroll_key.substr(0, 18)}, ` +
                        `hash : ${pre_image.hash.substr(0, 18)}, distance : ${pre_image.distance}`);
                    resolve();
                }
                catch(err)
                {
                    console.error("Failed to store the payload of a update to the DB: " + err);
                    reject(err);
                }
            }
        });
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
