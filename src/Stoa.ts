import express from "express";
import bodyParser from "body-parser";
import { LedgerStorage } from "./modules/storage/LedgerStorage";
import { ValidatorData, IPreimage, IValidator } from "./modules/data/ValidatorData";

class Stoa {
    public stoa: express.Application;

    public ledger_storage: LedgerStorage;

    constructor (file_name: string) {
        this.stoa = express();
        // parse application/x-www-form-urlencoded
        this.stoa.use(bodyParser.urlencoded({ extended: false }))
        // parse application/json
        this.stoa.use(bodyParser.json());
        // create blockStorage
        this.ledger_storage = new LedgerStorage(file_name, (err: Error | null) =>
        {
            if (err != null)
            {
                console.error(err);
                throw new Error(err.message);
            }
        });

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
                    let out_put:Array<ValidatorData> = new Array<ValidatorData>();
                    if (rows.length)
                    {
                        let out_put:Array<ValidatorData> = new Array<ValidatorData>();

                        for (const row of rows)
                        {
                            let preimage: IPreimage = {distance: row.distance,
                                hash: (row.distance == 0 ? row.random_seed : '')} as IPreimage;
                            var validator: ValidatorData =
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
                            let preimage: IPreimage = {distance: row.distance,
                                hash: (row.distance == 0 ? row.random_seed : '')} as IPreimage;
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
         * JSON block data is parsed and stored on each storage.
         */
        this.stoa.post("/push",
            (req: express.Request, res: express.Response, next: express.NextFunction) => {

            let block: any;
            if (req.body.block == undefined)
            {
                res.status(400).send("Missing 'block' object in body");
                return;
            }

            try {
                block = JSON.parse(req.body.block);
            } catch(e) {
                res.status(400).send("Not a valid JSON format");
                return;
            }

            console.log(block);

            this.ledger_storage.putBlocks(block,
                () =>
                {
                    res.status(200).send();
                    return;
                },
                (err: Error) =>
                {
                    console.error("Failed to store the payload of a push to the DB: " + err);
                    res.status(500).send("An error occurred while saving");
                    return;
                }
            );
        });
    }
}
export default Stoa;
