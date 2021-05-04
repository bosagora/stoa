import { AgoraClient } from './modules/agora/AgoraClient';
import { cors_options } from './cors';
import { IDatabaseConfig } from './modules/common/Config';
import { LedgerStorage } from './modules/storage/LedgerStorage';
import { logger } from './modules/common/Logger';
import { Height, PreImageInfo, Hash, hash, Block, Utils,
    Endian, Transaction, hashFull, DataPayload } from 'boa-sdk-ts';
import { WebService } from './modules/service/WebService';
import { ValidatorData, IPreimage, IUnspentTxOutput, ITxStatus,
    ITxHistoryElement, ITxOverview, ConvertTypes, DisplayTxType,
    IPendingTxs, ISPVStatus, ITransactionFee, IBlock, ITransaction,
    IBlockOverview, IBlockEnrollmentElements, IBlockEnrollment, IBlockTransactions, IBlockTransactionElements,
    IBOAStats, IPagination} from './Types';

import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import JSBI from 'jsbi';
import { URL } from 'url';

class Stoa extends WebService
{
    private _ledger_storage: LedgerStorage | null;

    /**
     * Network client to interact with Agora
     */
    private readonly agora: AgoraClient;
    /**
     * Stoa page size limit
     */
    private readonly limit_page_size: number = 100;

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
     * The Database config
     */
    private databaseConfig: IDatabaseConfig;

    /**
     * The genesis timestamp
     */
    private readonly genesis_timestamp: number;

    /**
     * Constructor
     * @param databaseConfig Mysql database configuration
     * @param agora_endpoint The network endpoint to connect to Agora
     * @param port The network port of Stoa
     * @param address The network address of Stoa
     * @param genesis_timestamp The genesis timestamp
     */
    constructor(databaseConfig:IDatabaseConfig, agora_endpoint: URL, port: number | string, address: string, genesis_timestamp: number) {
        super(port, address);

        this.genesis_timestamp = genesis_timestamp;
        this._ledger_storage = null;
        this.databaseConfig = databaseConfig;

        // Instantiate a dummy promise for chaining
        this.pending = new Promise<void>(function (resolve, reject) { resolve() });

        // Do this last, as it is possible it will fail, and we only want failure
        // to happen after we checked that our own state is correct.
        this.agora = new AgoraClient(agora_endpoint);
    }

    /**
     * Creates a instance of LedgerStorage
     */
    public createStorage(): Promise<void>
    {
        return LedgerStorage.make(this.databaseConfig, this.genesis_timestamp)
            .then((storage) => {
                this._ledger_storage = storage;
            });
    }

    /**
     * Returns the instance of LedgerStorage
     * This must be invoked after creating an instance of
     * `LedgerStorage` using `createStorage`.
     * @returns If `_ledger_storage` is not null, return `_ledger_storage`.
     * Otherwise, terminate the process.
     */
    public get ledger_storage (): LedgerStorage
    {
        if (this._ledger_storage !== null)
            return this._ledger_storage;
        else
        {
            logger.error('LedgerStorage is not ready yet.');
            process.exit(1);
        }
    }

    /**
     * Setup and start the server
     */
    public async start (): Promise<void>
    {
        // Prepare middleware

        // parse application/x-www-form-urlencoded
        this.app.use(bodyParser.urlencoded({ extended: false }))
        // parse application/json
        this.app.use(bodyParser.json())
        this.app.use(cors(cors_options));

        // Prepare routes
        this.app.get("/block_height", this.getBlockHeight.bind(this));
        this.app.get("/validators", this.getValidators.bind(this));
        this.app.get("/validator/:address", this.getValidator.bind(this));
        this.app.get("/transaction/pending/:hash", this.getTransactionPending.bind(this));
        this.app.get("/transaction/:hash", this.getTransaction.bind(this));
        this.app.get("/utxo/:address", this.getUTXO.bind(this));
        this.app.get("/transaction/status/:hash", this.getTransactionStatus.bind(this));
        this.app.get("/transaction/fees/:tx_size", this.getTransactionFees.bind(this));
        this.app.get("/wallet/transactions/history/:address", this.getWalletTransactionsHistory.bind(this));
        this.app.get("/wallet/transaction/overview/:hash", this.getWalletTransactionOverview.bind(this));
        this.app.get("/wallet/transactions/pending/:address", this.getWalletTransactionsPending.bind(this));
        this.app.get("/wallet/blocks/header", this.getWalletBlocksHeader.bind(this));
        this.app.get("/latest-blocks", this.getLatestBlocks.bind(this));
        this.app.get("/latest-transactions", this.getLatestTransactions.bind(this));
        this.app.get("/block-summary", this.getBlockSummary.bind(this));
        this.app.get("/block-enrollments", this.getBlockEnrollments.bind(this));
        this.app.get("/block-transactions", this.getBlockTransactions.bind(this));
        this.app.get("/boa-stats", this.getBOAStats.bind(this));
        this.app.get("/spv/:hash", this.verifyPayment.bind(this));
        this.app.post("/block_externalized", this.postBlock.bind(this));
        this.app.post("/preimage_received", this.putPreImage.bind(this));
        this.app.post("/transaction_received", this.putTransaction.bind(this));

        let height: Height = new Height("0");

        // Start the server once we can establish a connection to Agora
        return this.agora.getBlockHeight()
            .then(
                (res) => {
                    height.value = JSBI.BigInt(res.value);
                    logger.info(`Connected to Agora, block height is ${res.toString()}`);
                    return super.start();
                },
                (err) => {
                    logger.error(`Error: Could not connect to Agora node: ${err.toString()}`);
                    process.exit(1);
                })
            .then(
                () =>
                {
                    return this.pending = this.pending.then(() => { return this.catchup(height); });
                });
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
            res.status(400).send(`Invalid value for parameter 'height': ${req.query.height.toString()}`);
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
                // Nothing found
                if (!rows.length)
                {
                    if (height !== null)
                        res.status(400).send("No validator exists for block height.");
                    else
                        res.status(503).send("Stoa is currently unavailable.");

                    return;
                }

                let out_put:Array<ValidatorData> = new Array<ValidatorData>();

                for (const row of rows)
                {
                    let preimage_hash: Buffer = row.preimage_hash;
                    let preimage_distance: number = row.preimage_distance;
                    let target_height: Height = new Height(row.height);
                    let result_preimage_hash = new Hash(Buffer.alloc(Hash.Width));
                    let avail_height = JSBI.BigInt(row.avail_height);

                    // Hashing preImage
                    if (JSBI.greaterThanOrEqual(target_height.value, avail_height) &&
                        JSBI.greaterThanOrEqual(JSBI.add(avail_height, JSBI.BigInt(preimage_distance)), target_height.value))
                    {
                        result_preimage_hash.fromBinary(preimage_hash, Endian.Little);
                        let count = JSBI.toNumber(JSBI.subtract(JSBI.add(avail_height, JSBI.BigInt(preimage_distance)), target_height.value));
                        for (let i = 0; i < count; i++)
                        {
                            result_preimage_hash = hash(result_preimage_hash.data);
                            preimage_distance--;
                        }
                    }
                    else
                    {
                        if (JSBI.equal(target_height.value, JSBI.BigInt(row.enrolled_at)))
                        {
                            preimage_distance = 0;
                            result_preimage_hash.fromBinary(row.commitment, Endian.Little);
                        }
                        else
                        {
                            preimage_distance = NaN;
                            result_preimage_hash = new Hash(Buffer.alloc(Hash.Width));
                        }
                    }

                    let preimage: IPreimage = {
                        distance: Number(preimage_distance),
                        hash: result_preimage_hash.toString()
                    } as IPreimage;

                    let validator: ValidatorData =
                        new ValidatorData(row.address, new Height(JSBI.BigInt(row.enrolled_at)),
                                          new Hash(row.stake, Endian.Little).toString(),
                                          preimage);
                    out_put.push(validator);
                }
                res.status(200).send(JSON.stringify(out_put));
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
            res.status(400).send(`Invalid value for parameter 'height': ${req.query.height.toString()}`);
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
                // Nothing to show
                if (!rows.length)
                {
                    res.status(400).send(`The validator data not found.` +
                    `'address': (${address}), 'height': (${height?.toString()})`);
                    return;
                }

                let out_put:Array<ValidatorData> = new Array<ValidatorData>();

                for (const row of rows)
                {
                    let preimage_hash: Buffer = row.preimage_hash;
                    let preimage_distance: number = row.preimage_distance;
                    let target_height: Height = new Height(JSBI.BigInt(row.height));
                    let result_preimage_hash = new Hash(Buffer.alloc(Hash.Width));
                    let avail_height = JSBI.BigInt(row.avail_height);
                    // Hashing preImage
                    if (JSBI.greaterThanOrEqual(target_height.value, avail_height) &&
                        JSBI.greaterThanOrEqual(JSBI.add(avail_height, JSBI.BigInt(preimage_distance)), target_height.value))
                    {
                        result_preimage_hash.fromBinary(preimage_hash, Endian.Little);
                        let count = JSBI.toNumber(JSBI.subtract(JSBI.add(avail_height, JSBI.BigInt(preimage_distance)), target_height.value));
                        for (let i = 0; i < count; i++)
                        {
                            result_preimage_hash = hash(result_preimage_hash.data);
                            preimage_distance--;
                        }
                    }
                    else
                    {
                        if (JSBI.equal(target_height.value, JSBI.BigInt(row.enrolled_at)))
                        {
                            preimage_distance = 0;
                            result_preimage_hash.fromBinary(row.commitment, Endian.Little);
                        }
                        else
                        {
                            preimage_distance = NaN;
                            result_preimage_hash = new Hash(Buffer.alloc(Hash.Width));
                        }
                    }

                    let preimage: IPreimage = {
                        distance: preimage_distance,
                        hash: result_preimage_hash.toString()
                    } as IPreimage;

                    let validator: ValidatorData =
                        new ValidatorData(row.address, new Height(JSBI.BigInt(row.enrolled_at)),
                                          new Hash(row.stake, Endian.Little).toString(),
                                          preimage);
                    out_put.push(validator);
                }
                res.status(200).send(JSON.stringify(out_put));
            })
            .catch((err) => {
                logger.error("Failed to data lookup to the DB: " + err);
                res.status(500).send("Failed to data lookup");
            }
        );
    }

    /**
     * GET /transaction/status/:hash
     *
     * Called when a request is received through the `/transaction/status/:hash` handler
     * The parameter `hash` is the hash of the transaction
     *
     * Returns a transaction status.
     */
    private getTransactionStatus (req: express.Request, res: express.Response)
    {
        let hash: string = String(req.params.hash);

        logger.http(`GET /transaction/status/${hash}}`);

        let tx_hash: Hash;
        try
        {
            tx_hash = new Hash(hash);
        }
        catch (error)
        {
            res.status(400).send(`Invalid value for parameter 'hash': ${hash}`);
            return;
        }

        this.ledger_storage.getTransactionStatus(tx_hash)
            .then((data: any) => {
                let status: ITxStatus = {
                    status: data.status,
                    tx_hash: new Hash(data.tx_hash, Endian.Little).toString()
                };
                if (data.block !== undefined)
                {
                    status.block = {
                        height: data.block.height,
                        hash: new Hash(data.block.hash, Endian.Little).toString()
                    };
                }
                res.status(200).send(JSON.stringify(status));
            })
            .catch((err) => {
                logger.error("Failed to data lookup to the DB: " + err);
                res.status(500).send("Failed to data lookup");
            });
    }

    /**
     * GET /transaction/fees/:tx_size
     *
     * Called when a request is received through the `/transaction/fees/:tx_size` handler
     *
     * Returns transaction fees by the transaction size.
     */
    private getTransactionFees (req: express.Request, res: express.Response)
    {
        // TODO This is still incomplete.
        //  We will proceed with statistics to find appropriate fees and then upgrade.

        let size: string = req.params.tx_size.toString();

        logger.http(`GET /transaction/fees/${size}}`);

        if (!Utils.isPositiveInteger(size))
        {
            res.status(400).send(`Invalid value for parameter 'tx_size': ${size}`);
            return;
        }

        let tx_size = JSBI.BigInt(size);
        let factor = JSBI.BigInt(200);
        let minimum = JSBI.BigInt(100_000);     // 0.01BOA
        let medium = JSBI.multiply(tx_size, factor);
        if (JSBI.lessThan(medium, minimum))
            medium = JSBI.BigInt(minimum);

        let width = JSBI.divide(medium, JSBI.BigInt(10));
        let high = JSBI.add(medium, width);
        let low = JSBI.subtract(medium, width);
        if (JSBI.lessThan(low, minimum))
            low = JSBI.BigInt(minimum);

        let data: ITransactionFee = {
            tx_size: JSBI.toNumber(tx_size),
            high: high.toString(),
            medium: medium.toString(),
            low: low.toString()
        };

        res.status(200).send(JSON.stringify(data));
    }

    /**
     * GET /transaction/pending/:hash
     *
     * Called when a request is received through the `/transaction/pending/:hash` handler
     *
     * Returns a pending transaction by the transaction hash.
     */
    private getTransactionPending (req: express.Request, res: express.Response)
    {
        let hash: string = String(req.params.hash);

        logger.http(`GET /transaction/pending/${hash}}`);

        let tx_hash: Hash;
        try
        {
            tx_hash = new Hash(hash);
        }
        catch (error)
        {
            res.status(400).send(`Invalid value for parameter 'hash': ${hash}`);
            return;
        }

        this.ledger_storage.getTransactionPending(tx_hash)
            .then((tx) => {
                if (tx === null)
                {
                    res.status(204).send(`No pending transactions. hash': (${hash})`);
                    return;
                }

                res.status(200).send(JSON.stringify(tx));
            })
            .catch((err) => {
                    logger.error("Failed to data lookup to the DB: " + err);
                    res.status(500).send("Failed to data lookup");
                }
            );
    }

    /**
     * GET /transaction/:hash
     *
     * Called when a request is received through the `/transaction/:hash` handler
     *
     * Returns a transaction by the transaction hash.
     */
    private getTransaction (req: express.Request, res: express.Response)
    {
        let hash: string = String(req.params.hash);

        logger.http(`GET /transaction/${hash}}`);

        let tx_hash: Hash;
        try
        {
            tx_hash = new Hash(hash);
        }
        catch (error)
        {
            res.status(400).send(`Invalid value for parameter 'hash': ${hash}`);
            return;
        }

        this.ledger_storage.getTransaction(tx_hash)
            .then((tx) => {
                if (tx === null)
                {
                    res.status(204).send(`No transactions. hash': (${hash})`);
                    return;
                }

                res.status(200).send(JSON.stringify(tx));
            })
            .catch((err) => {
                    logger.error("Failed to data lookup to the DB: " + err);
                    res.status(500).send("Failed to data lookup");
                }
            );
    }

    /**
     * GET /utxo/:address
     *
     * Called when a request is received through the `/utxo/:address` handler
     *
     * Returns a set of UTXOs of the address.
     */
    private getUTXO (req: express.Request, res: express.Response)
    {
        let address: string = String(req.params.address);

        logger.http(`GET /utxo/${address}}`);

        this.ledger_storage.getUTXO(address)
            .then((rows: any[]) => {
                if (!rows.length)
                {
                    res.status(204).send(`The UTXO not found. address': (${address})`);
                    return;
                }

                let utxo_array: Array<IUnspentTxOutput> = [];
                for (const row of rows)
                {
                    let utxo = {
                        utxo: new Hash(row.utxo, Endian.Little).toString(),
                        type: row.type,
                        unlock_height: JSBI.BigInt(row.unlock_height).toString(),
                        amount: JSBI.BigInt(row.amount).toString(),
                        height: JSBI.BigInt(row.block_height).toString(),
                        time: row.block_time,
                        lock_type: row.lock_type,
                        lock_bytes: row.lock_bytes.toString('base64')
                    }
                    utxo_array.push(utxo);
                }
                res.status(200).send(JSON.stringify(utxo_array));
            })
            .catch((err) => {
                    logger.error("Failed to data lookup to the DB: " + err);
                    res.status(500).send("Failed to data lookup");
                }
            );
    }

    /**
     * GET /wallet/transactions/history/:address
     *
     * Called when a request is received through the `/wallet/transactions/history/:address` handler
     * ```
     * The parameter `address` are the address to query.
     * The parameter `pageSize` is the maximum size that can be obtained
     *      from one query, default is 10
     * The parameter `page` is the number on the page, this value begins with 1,
     *      default is 1
     * The parameter `type` is the type of transaction to query.
     *      This can include multiple types.
     *      Transaction types include "inbound", "outbound", "freeze", "payload".
     *      The "inbound" is an increased transaction of funds at the address.
     *      The "outbound" is a transaction with reduced funds at the address.
     *      Users can select only "inbound", "outbound".
     *      The "freeze", "payload" are always included.
     *      default is "inbound,outbound,freeze,payload"
     * The parameter `beginDate` is the start date of the range of dates to look up.
     * The parameter `endDate` is the end date of the range of dates to look up.
     * The parameter `peer` is used when users want to look up only specific
     *      address of their counterparts.
     *      Peer is the withdrawal address in the inbound transaction and
     *      a deposit address in the outbound transaction
     * Returns a set of transactions history of the addresses.
     * ```
     */
    private async getWalletTransactionsHistory(req: express.Request, res: express.Response)
    {
        let address: string = String(req.params.address);

        logger.http(`GET /wallet/transactions/history/${address}}`);

        let filter_begin: number | undefined;
        let filter_end: number | undefined;
        let page_size: number;
        let page: number;
        let filter_type: Array<DisplayTxType>;

        // Validating Parameter - beginDate, endDate
        if ((req.query.beginDate !== undefined) && (req.query.endDate !== undefined))
        {
            if (!Utils.isPositiveInteger(req.query.beginDate.toString()))
            {
                res.status(400).send(`Invalid value for parameter 'beginDate': ${req.query.beginDate.toString()}`);
                return;
            }

            if (!Utils.isPositiveInteger(req.query.endDate.toString()))
            {
                res.status(400).send(`Invalid value for parameter 'endDate': ${req.query.endDate.toString()}`);
                return;
            }

            filter_begin = Number(req.query.beginDate.toString());
            filter_end = Number(req.query.endDate.toString());

            if (filter_begin > filter_end)
            {
                res.status(204).send(`Parameter beginDate must be less than a parameter endDate. 'beginDate': (${filter_begin}), 'endDate': (${filter_end})`);
                return;
            }
        }
        else if ((req.query.beginDate !== undefined) && (req.query.endDate === undefined))
        {
            res.status(400).send(`Parameter endDate must also be set.`);
            return;
        }
        else if ((req.query.beginDate === undefined) && (req.query.endDate !== undefined))
        {
            res.status(400).send(`Parameter beginDate must also be set.`);
            return;
        }
        else
        {
            filter_begin = undefined;
            filter_end = undefined;
        }
        filter_type = (req.query.type !== undefined)
            ? req.query.type.toString().split(',').map((m) => ConvertTypes.toDisplayTxType(m))
            : [0, 1, 2, 3];

        if (filter_type.find(m => (m === -1)) !== undefined)
        {
            res.status(400).send(`Invalid transaction type: ${req.query.type}`);
            return;
        }

        let filter_peer = (req.query.peer !== undefined)
            ? req.query.peer.toString()
            : undefined;
        let pagination: IPagination = await this.paginate(req, res);
        this.ledger_storage.getWalletTransactionsHistory(address, pagination.pageSize, pagination.page,
            filter_type, filter_begin, filter_end, filter_peer)
            .then((rows: any[]) => {
                if (!rows.length)
                {
                    res.status(204).send(`The data does not exist. 'addresses': (${address})`);
                    return;
                }

                let out_put: Array<ITxHistoryElement> = [];
                for (const row of rows)
                {
                    out_put.push({
                        display_tx_type: ConvertTypes.DisplayTxTypeToString(row.display_tx_type),
                        address: row.address,
                        peer: row.peer,
                        peer_count: row.peer_count,
                        height: JSBI.BigInt(row.height).toString(),
                        time: row.block_time,
                        tx_hash: new Hash(row.tx_hash, Endian.Little).toString(),
                        tx_type: ConvertTypes.TxTypeToString(row.type),
                        amount: JSBI.BigInt(row.amount).toString(),
                        unlock_height: JSBI.BigInt(row.unlock_height).toString(),
                        unlock_time: row.unlock_time
                    });
                }
                res.status(200).send(JSON.stringify(out_put));
            })
            .catch((err) => {
                logger.error("Failed to data lookup to the DB: " + err);
                res.status(500).send("Failed to data lookup");
            });
    }

    /**
     * GET /wallet/transaction/overview/:hash
     *
     * Called when a request is received through the `/transaction_overview/:addresses` handler
     * The parameter `hash` is the hash of the transaction
     *
     * Returns a transaction overview.
     */
    private getWalletTransactionOverview (req: express.Request, res: express.Response)
    {
        let txHash: string = String(req.params.hash);

        logger.http(`GET /wallet/transaction/overview/${txHash}}`);

        let tx_hash: Hash;
        try
        {
            tx_hash = new Hash(txHash);
        }
        catch (error)
        {
            res.status(400).send(`Invalid value for parameter 'hash': ${txHash}`);
            return;
        }

        this.ledger_storage.getWalletTransactionOverview(tx_hash)
            .then((data: any) => {
                if ((data === undefined) || (data.tx === undefined) ||
                    (data.senders === undefined) || (data.receivers === undefined))
                {
                    res.status(500).send("Failed to data lookup");
                    return;
                }

                if (data.tx.length == 0)
                {
                    res.status(204).send(`The data does not exist. 'hash': (${tx_hash})`);
                    return;
                }

                let overview: ITxOverview = {
                    status: 'Confirmed',
                    height: JSBI.BigInt(data.tx[0].height).toString(),
                    time: data.tx[0].block_time,
                    tx_hash: new Hash(data.tx[0].tx_hash, Endian.Little).toString(),
                    tx_type: ConvertTypes.TxTypeToString(data.tx[0].type),
                    tx_size: data.tx[0].tx_size,
                    unlock_height: JSBI.BigInt(data.tx[0].unlock_height).toString(),
                    lock_height: JSBI.BigInt(data.tx[0].lock_height).toString(),
                    unlock_time: data.tx[0].unlock_time,
                    payload: (data.tx[0].payload !== null) ? new DataPayload(data.tx[0].payload, Endian.Little).toString() : "",
                    senders: [],
                    receivers: [],
                    fee: JSBI.add(JSBI.BigInt(data.tx[0].tx_fee), JSBI.BigInt(data.tx[0].payload_fee)).toString()
                };

                for (let elem of data.senders)
                    overview.senders.push({address: elem.address, amount: elem.amount, utxo: new Hash(elem.utxo, Endian.Little).toString(), signature: new Hash(elem.signature, Endian.Little).toString(), index: elem.in_index, unlock_age: elem.unlock_age, bytes: new Hash(elem.bytes, Endian.Little).toString() });

                for (let elem of data.receivers)
                    overview.receivers.push({address: elem.address, lock_type: elem.lock_type, amount: elem.amount, utxo: new Hash(elem.utxo, Endian.Little).toString(), index: elem.output_index, bytes: hash(elem.bytes).toString()});

                res.status(200).send(JSON.stringify(overview));
            })
            .catch((err) => {
                logger.error("Failed to data lookup to the DB: " + err);
                res.status(500).send("Failed to data lookup");
            });
    }

    /**
     * GET /block-summary
     *
     * Called when a request is received through the `/block-summary` handler
     * The parameter `height` is the height and `hash` is the hash of block
     *
     * Returns a block overview.
     */
     private getBlockSummary(req: express.Request, res: express.Response) {
        
        let field: string;
        let value: string | Buffer;

        logger.http(`GET /block-summary/`);

         // Validating Parameter - height
        if (req.query.height !== undefined && Utils.isPositiveInteger(req.query.height.toString())) {
            field = 'height';
            value = String(req.query.height);
        }
         // Validating Parameter - hash
        else if (req.query.hash !== undefined) {
            field = 'hash';
            try
            {
             const hash: string = String(req.query.hash);
             value = new Hash(hash).toBinary(Endian.Little);
            }
            catch (error)
            {
                res.status(400).send(`Invalid value for parameter 'hash': ${req.query.hash}`);
                return;
            }
        }
        else {
            res.status(400).send(`Invalid value for parameter 'height': ${req.query.height} and 'hash': ${req.query.hash}`);
            return;
        }

        this.ledger_storage.getBlockSummary(field, value)
        .then((data: any) => {
            if ((data === undefined)) {
            res.status(500).send("Failed to data lookup");
            return;
          }
           else if (data.length === 0) {
                res.status(204).send(`The data does not exist. 'height': (${value})`);
                return;
            }
            else {
                let overview: IBlockOverview = {
                    height: JSBI.BigInt(data[0].height).toString(),
                    total_transactions: data[0].tx_count,
                    hash: new Hash(data[0].hash, Endian.Little).toString(),
                    prev_hash: new Hash(data[0].prev_block, Endian.Little).toString(),
                    merkle_root: new Hash(data[0].merkle_root, Endian.Little).toString(),
                    signature: new Hash(data[0].signature, Endian.Little).toString(),
                    random_seed: new Hash(data[0].random_seed, Endian.Little).toString(),
                    time: data[0].time_stamp,
                    version: "v0.x.x",
                    total_sent: data[0].total_sent,
                    total_recieved: data[0].total_recieved,
                    total_reward: data[0].total_reward,
                    total_fee: data[0].total_fee,
                    total_size: data[0].total_size
                    };
                res.status(200).send(JSON.stringify(overview));
            }
            })
            .catch((err) => {
                logger.error("Failed to data lookup to the DB: " + err);
                res.status(500).send("Failed to data lookup");
            });
    }

    /**
     * GET /block-enrollments
     *
     * Called when a request is received through the `/block-enrollments` handler
     * The parameter `height` is the height and `hash` is the hash of block
     *
     *@returns Returns enrolled validators of block.
     */
    private async getBlockEnrollments(req: express.Request, res: express.Response) {
        
        let field: string;
        let value: string | Buffer;

        logger.http(`GET /block-enrollments/`);

        // Validating Parameter - height
        if (req.query.height !== undefined && Utils.isPositiveInteger(req.query.height.toString())) {
            field = 'height';
            value = String(req.query.height);
        }
        // Validating Parameter - hash
        else if (req.query.hash !== undefined) {
            field = 'hash';
            try
            {
             const hash: string = String(req.query.hash);
             value = new Hash(hash).toBinary(Endian.Little);
            }
            catch (error)
            {
                res.status(400).send(`Invalid value for parameter 'hash': ${req.query.hash}`);
                return;
            }
        }
        else {
            res.status(400).send(`Invalid value for parameter 'height': ${req.query.height} and 'hash': ${req.query.hash}`);
            return;
        }
        let pagination: IPagination = await this.paginate(req, res);
        this.ledger_storage.getBlockEnrollments(field, value, pagination.pageSize, pagination.page)
        .then((data: any) => {
            if ((data === undefined)) {
                res.status(500).send("Failed to data lookup");
                return;
              }
           else if (data.total_records === 0) {
               return res.status(204).send(`The data does not exist. 'height': (${value})`);
            }
            else {
                let enrollmentElementList: Array<IBlockEnrollmentElements> = [];
                for (const row of data.enrollments) {
                    enrollmentElementList.push(
                        {
                            height: JSBI.BigInt(row.block_height).toString(),
                            utxo: new Hash(row.utxo_key, Endian.Little).toString(),
                            enroll_sig: new Hash(row.enroll_sig, Endian.Little).toString(),
                            commitment: new Hash(row.commitment, Endian.Little).toString(),
                            cycle_length: row.cycle_length,
                        }
                    );
                }
                let enrollmentList: IBlockEnrollment = {
                    enrollmentElementList,
                    total_data: data.total_records
                };
                return res.status(200).send(JSON.stringify(enrollmentList));
            }
        })
        .catch((err) => {
            logger.error("Failed to data lookup to the DB: " + err);
           return res.status(500).send("Failed to data lookup");
        });
    }

    /**
     * GET /block-transactions
     *
     * Called when a request is received through the `/block-transactions` handler
     * The parameter `height` is the height and `hash` is the hash of block
     *
     * @returns Returns transactions of block.
     */
    private async getBlockTransactions(req: express.Request, res: express.Response) {
        
        let field: string;
        let value: string | Buffer;
        let limit: number;
        let page: number;

        logger.http(`GET /block-transactions/`);

        // Validating Parameter - height
        if (req.query.height !== undefined && Utils.isPositiveInteger(req.query.height.toString())) {
            field = 'height';
            value = String(req.query.height);
        }
        // Validating Parameter - hash
        else if (req.query.hash !== undefined) {
            field = 'hash';
            try
            {
             const hash: string = String(req.query.hash);
             value = new Hash(hash).toBinary(Endian.Little);
            }
            catch (error)
            {
                res.status(400).send(`Invalid value for parameter 'hash': ${req.query.hash}`);
                return;
            }
        }
        else {
            res.status(400).send(`Invalid value for parameter 'height': ${req.query.height} and 'hash': ${req.query.hash}`);
            return;
        }
        
        let pagination: IPagination = await this.paginate(req, res);
        this.ledger_storage.getBlockTransactions(field, value, pagination.pageSize, pagination.page)
        .then((data: any) => {
            if ((data === undefined)) {
                res.status(500).send("Failed to data lookup");
                return;
              }
            else if (data.tx.length === 0) {
               return res.status(204).send(`The data does not exist. 'height': (${value})`);
            }
            else {
                let tx: Array<IBlockTransactionElements> = [];
                for (const row of data.tx) {
                    tx.push(
                         {
                            height: JSBI.BigInt(row.block_height).toString(),
                            tx_hash: new Hash(row.tx_hash, Endian.Little).toString(),
                            amount: row.amount,
                            type: row.type,
                            fee: row.tx_fee,
                            size: row.tx_size,
                            time: row.time_stamp,
                            sender_address: row.sender_address,
                            receiver: row.receiver,
                        }
                    ); 
                }

                let transactionList: IBlockTransactions = {
                    tx,
                    total_data: data.total_data
                };
               return res.status(200).send(JSON.stringify(transactionList));
            }
        })
        .catch((err) => {
            logger.error("Failed to data lookup to the DB: " + err);
            res.status(500).send("Failed to data lookup");
        });
    }

    /**
     * GET /boa-stats
     *
     * Called when a request is received through the `/boa-stats` handler
     *
     * @returns Returns statistics of BOA coin.
     */
    private getBOAStats(req: express.Request, res: express.Response) {
        
        logger.http(`GET /boa-stats/`);

        this.ledger_storage.getBOAStats()
        .then((data: any) => {
            if ((data === undefined)) {
                res.status(500).send("Failed to data lookup");
                return;
              }
           else if (data.length === 0) {
               return res.status(204).send(`The data does not exist`);
            }
            else {
                let boaStats: IBOAStats = {
                    height: data[0].height,
                    transactions: data[0].transactions,
                    validators: data[0].validators,
                    frozen_coin: 5283595, //FIX ME static data because of unavailability of real data
                    circulating_supply: 5283535,
                    active_validators: 155055
                };
               return res.status(200).send(JSON.stringify(boaStats));
            }
        })
        .catch((err) => {
            logger.error("Failed to data lookup to the DB: " + err);
           return res.status(500).send("Failed to data lookup");
        });
    }

    private verifyPayment(req: express.Request, res: express.Response) {
        let hash: string = String(req.params.hash);

        logger.http(`GET /spv/${hash}}`);

        let tx_hash: Hash;

        try
        {
            tx_hash = new Hash(hash);
        }
        catch (error)
        {
            res.status(400).send(`Invalid value for parameter 'hash': ${hash}`);
            return;
        }

        this.ledger_storage.getBlockHeaderByTxHash(tx_hash)
            .then((rows: any) => {
                if (rows.length == 0)
                {
                    let status: ISPVStatus = {
                        result: false,
                        message: "Transaction does not exist in block"
                    }
                    res.status(200).send(JSON.stringify(status));
                    return;
                }
                this.agora.getMerklePath(rows[0].height, tx_hash)
                    .then((path: Array<Hash>) => {
                        let root = new Hash(rows[0].merkle_root, Endian.Little)

                        if (Buffer.compare(AgoraClient.checkMerklePath(path, tx_hash, rows[0].tx_index).data, root.data) === 0)
                        {
                            let status: ISPVStatus = {
                                result: true,
                                message: "Success"
                            }
                            res.status(200).send(JSON.stringify(status));
                        }
                        else
                        {
                            let status: ISPVStatus = {
                                result: false,
                                message: "Verification failed"
                            }
                            res.status(200).send(JSON.stringify(status));
                        }
                    })
                    .catch((error) => {
                        let status: ISPVStatus = {
                            result: false,
                            message: error.message
                        }
                        res.status(200).send(JSON.stringify(status));
                    })
                })
            .catch((err) => {
                logger.error("Failed to data lookup to the DB: " + err);
                res.status(500).send("Failed to data lookup");
            });
    }

    /**
     * POST /block_externalized
     *
     * When a request is received through the `/push` handler
     * we we call the storage handler asynchronously and  immediately
     * respond to Agora.
     */
    private postBlock (req: express.Request, res: express.Response)
    {
        if (req.body.block === undefined)
        {
            res.status(400).send({ statusMessage: "Missing 'block' object in body"});
            return;
        }

        logger.http(`POST /block_externalized block=${req.body.block.toString()}`);

        // To do
        // For a more stable operating environment,
        // it would be necessary to consider organizing the pool
        // using the database instead of the array.
        this.pending = this.pending.then(() => { return this.task({type: "block", data: req.body.block}); });

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
        if (req.body.preimage === undefined)
        {
            res.status(400).send({ statusMessage: "Missing 'preimage' object in body"});
            return;
        }

        logger.http(`POST /preimage_received preimage=${req.body.preimage.toString()}`);

        // To do
        // For a more stable operating environment,
        // it would be necessary to consider organizing the pool
        // using the database instead of the array.
        this.pending = this.pending.then(() => { return this.task({type: "pre_image", data: req.body.preimage}); });

        res.status(200).send();
    }

    /**
     * POST /transaction_received
     *
     * When a request is received through the `/transaction_received` handler
     * JSON transaction data is parsed and stored on each storage.
     */
    private putTransaction (req: express.Request, res: express.Response)
    {
        if (req.body.tx === undefined)
        {
            res.status(400).send({ statusMessage: "Missing 'tx' object in body"});
            return;
        }

        logger.http(`POST /transaction_received tx=${req.body.tx.toString()}`);

        this.pending = this.pending.then(() => { return this.task({type: "transaction", data: req.body.tx}); });

        res.status(200).send();
    }

    /**
     * GET /wallet/transactions/pending/:address
     *
     * Called when a request is received through the `/transactions/pending/:address` handler
     *
     * Returns List the total by output address of the pending transaction.
     */
    private getWalletTransactionsPending (req: express.Request, res: express.Response)
    {
        let address: string = String(req.params.address);

        logger.http(`GET /wallet/transactions/pending/${address}}`);

        this.ledger_storage.getWalletTransactionsPending(address)
            .then((rows: any[]) => {
                if (!rows.length)
                {
                    res.status(204).send(`No pending transactions. address': (${address})`);
                    return;
                }

                let pending_array: Array<IPendingTxs> = [];
                for (const row of rows)
                {
                    let tx = {
                        tx_hash: new Hash(row.tx_hash, Endian.Little).toString(),
                        submission_time: row.time,
                        address: row.address,
                        amount: JSBI.BigInt(row.amount).toString(),
                        fee: JSBI.add(JSBI.BigInt(row.tx_fee), JSBI.BigInt(row.payload_fee)).toString(),
                        block_delay: row.current_height - row.received_height
                    }
                    pending_array.push(tx);
                }
                res.status(200).send(JSON.stringify(pending_array));
            })
            .catch((err) => {
                    logger.error("Failed to data lookup to the DB: " + err);
                    res.status(500).send("Failed to data lookup");
                }
            );
    }

    /**
     * GET /wallet/blocks/header
     *
     * Called when a request is received through the `/wallet/blocks/header`
     *
     * Returns information about the header of the block according to the height of the block.
     * If height was not provided the information of the last block header is returned.
     */
    private getWalletBlocksHeader (req: express.Request, res: express.Response)
    {
        if ((req.query.height !== undefined) &&
            !Utils.isPositiveInteger(req.query.height.toString()))
        {
            res.status(400).send(`Invalid value for parameter 'height': ${req.query.height.toString()}`);
            return;
        }

        let height = (req.query.height !== undefined)
            ? new Height(req.query.height.toString())
            : null;

        if (height != null)
            logger.http(`GET /wallet/blocks/header height=${height.toString()}`);
        else
            logger.http(`GET /wallet/blocks/header`);

        this.ledger_storage.getWalletBlocksHeaderInfo(height)
            .then((rows: any[]) =>
            {
                if (!rows.length)
                {
                    res.status(204).send(`No blocks`);
                    return;
                }

                let info = {
                    height: rows[0].height.toString(),
                    hash: new Hash(rows[0].hash, Endian.Little).toString(),
                    merkle_root: new Hash(rows[0].merkle_root, Endian.Little).toString(),
                    time_stamp: rows[0].time_stamp
                };
                res.status(200).send(JSON.stringify(info));
            })
            .catch((err) =>
            {
                logger.error("Failed to data lookup to the DB: " + err);
                res.status(500).send("Failed to data lookup");
            });
    }

    /**
     * GET /block_height
     *
     * Return the highest block height stored in Stoa
     */
    private getBlockHeight (req: express.Request, res: express.Response)
    {
        logger.http(`GET /block_height`);

        this.ledger_storage.getBlockHeight()
            .then((row: Height | null) => {
                if (row == null)
                    res.status(400).send(`The block height not found.`);
                else
                    res.status(200).send(JSON.stringify(row));
            })
            .catch((err) => {
                logger.error("Failed to data lookup to the DB: " + err);
                res.status(500).send("Failed to data lookup");
            }
            );
    };

    /**
     * Extract the block height from JSON.
     * @param block
     */
    private static getJsonBlockHeight(block: any): Height
    {
        if ((block.header === undefined) ||
            (block.header.height === undefined))
        {
            throw Error("Not found block height in JSON Block");
        }

        return new Height(block.header.height);
    };
    /**
    * Get latest blocks
    * @param req 
    * @param res 
    * @returns Return Latest blocks of the ledeger
    */
    public async getLatestBlocks(req: express.Request, res: express.Response) {

        let pagination: IPagination = await this.paginate(req, res);
        this.ledger_storage.getLatestBlocks(pagination.pageSize, pagination.page)
            .then((data: any) => {
                if ((data === undefined)) {
                    res.status(500).send("Failed to data lookup");
                    return;
                  }
               else if (data.length === 0) {
                   return res.status(204).send(`The data does not exist.`);
                }
                else {
                    let blocklist: Array<IBlock> = [];
                    for (const row of data) {
                        blocklist.push(
                            {
                                height: JSBI.BigInt(row.height).toString(),
                                hash: new Hash(row.hash, Endian.Little).toString(),
                                merkle_root: new Hash(row.merkle_root, Endian.Little).toString(),
                                signature: new Hash(row.signature, Endian.Little).toString(),
                                validators: row.validators.toString(),
                                tx_count: (row.tx_count).toString(),
                                enrollment_count: (row.enrollment_count).toString(),
                                time_stamp: row.time_stamp,
                            }
                        )
                    }
                return res.status(200).send(JSON.stringify(blocklist));

                }
            })
    }
    /**
      * Get Latest transactions
      * @param req 
      * @param res 
      * @returns Returns Latest transactions of the ledger.
      */
    public async getLatestTransactions(req: express.Request, res: express.Response) {

        let pagination: IPagination = await this.paginate(req, res);
        this.ledger_storage.getLatestTransactions(pagination.pageSize, pagination.page)
            .then((data: any) => {
                if ((data === undefined)) {
                    res.status(500).send("Failed to data lookup");
                    return;
                  }
               else if (data.length === 0) {
                   return res.status(204).send(`The data does not exist.`);
                }
                else {
                    let transactionList: Array<ITransaction> = [];
                    for (const row of data) {
                        transactionList.push(
                            {
                                height: JSBI.BigInt(row.block_height).toString(),
                                tx_hash: new Hash(row.tx_hash, Endian.Little).toString(),
                                type: row.type,
                                amount: JSBI.BigInt(row.amount).toString(),
                                tx_fee: JSBI.BigInt(row.tx_fee).toString(),
                                tx_size: JSBI.BigInt(row.tx_fee).toString(),
                                time_stamp: row.time_stamp,
                            }
                        )
                    }
                   return res.status(200).send(JSON.stringify(transactionList));

                }
            })
    }


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
                    let max_blocks = JSBI.add(JSBI.subtract(height.value, expected_height.value), (block == null) ? JSBI.BigInt(1) : JSBI.BigInt(0));

                    if (JSBI.greaterThan(max_blocks, JSBI.BigInt(this._max_count_on_recovery)))
                        max_blocks = JSBI.BigInt(this._max_count_on_recovery);

                    if (JSBI.greaterThan(max_blocks, JSBI.BigInt(0)))
                    {
                        let blocks = await this.agora.getBlocksFrom(expected_height, Number(max_blocks));

                        // Save previous block
                        for (let block of blocks)
                        {
                            if (JSBI.equal(block.header.height.value, expected_height.value))
                            {
                                await this.ledger_storage.putBlocks(block);
                                expected_height.value = JSBI.add(expected_height.value, JSBI.BigInt(1));
                                logger.info(`Recovered a block with block height of ${block.header.height.toString()}`);
                            }
                            else
                            {
                                resolve(false);
                                return;
                            }
                        }
                    }

                    // Save a block just received
                    if (JSBI.lessThanOrEqual(height.value, expected_height.value))
                    {
                        if (block != null)
                        {
                            await this.ledger_storage.putBlocks(Block.reviver("", block));
                            logger.info(`Saved a block with block height of ${height.toString()}`);
                        }
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
                    let height = Stoa.getJsonBlockHeight(block);
                    let expected_height = await this.ledger_storage.getExpectedBlockHeight();

                    if (JSBI.equal(height.value, expected_height.value))
                    {
                        // The normal case
                        // Save a block just received
                        await this.ledger_storage.putBlocks(Block.reviver("", block));
                        logger.info(`Saved a block with block height of ${height.toString()}`);
                    }
                    else if (JSBI.greaterThan(height.value, expected_height.value))
                    {
                        // Recovery is required for blocks that are not received.
                        while (true) {
                            if (await this.recoverBlock(block, height, expected_height))
                                break;
                            expected_height = await this.ledger_storage.getExpectedBlockHeight();
                        }
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
                try
                {
                    let pre_image = PreImageInfo.reviver("", stored_data.data);
                    let changes = await this.ledger_storage.updatePreImage(pre_image);

                    if (changes)
                        logger.info(`Saved a pre-image utxo : ${pre_image.utxo.toString().substr(0, 18)}, ` +
                        `hash : ${pre_image.hash.toString().substr(0, 18)}, distance : ${pre_image.distance}`);
                    resolve();
                }
                catch(err)
                {
                    logger.error("Failed to store the payload of a update to the DB: " + err);
                    reject(err);
                }
            }
            else if (stored_data.type === "transaction")
            {
                try
                {
                    let tx = Transaction.reviver("", stored_data.data);
                    let changes = await this.ledger_storage.putTransactionPool(tx);

                    if (changes)
                        logger.info(`Saved a transaction hash : ${hashFull(tx).toString()}, ` +
                        `data : ` + stored_data.data);
                    resolve();
                }
                catch(err)
                {
                    logger.error("Failed to store the payload of a push to the DB: " + err);
                    reject(err);
                }
            }
        });
    }

    /**
     * Catches up to block height of Agora
     * This is done only once immediately after Stoa is executed.
     * @param height The block height of Agora
     */
    private catchup (height: Height): Promise<void>
    {
        return new Promise<void>(async (resolve, reject) =>
        {
            try
            {
                let expected_height = await this.ledger_storage.getExpectedBlockHeight();

                if (JSBI.greaterThanOrEqual(height.value, expected_height.value)) {
                    while (true) {
                        if (await this.recoverBlock(null, height, expected_height))
                            break;
                        // If the number of blocks to be recovered is too large,
                        // only a part of them will be recovered.
                        // Therefore, the height of the block to start the recovery
                        // is taken from the database.
                        expected_height = await this.ledger_storage.getExpectedBlockHeight();
                    }
                }

                resolve();
            }
            catch(err)
            {
                logger.error("Failed to catch up to block height of Agora: " + err);
                reject(err);
            }
        });
    }

    private paginate(req: express.Request, res: express.Response): Promise<IPagination> {
        return new Promise<IPagination>((resolve, reject) => {
            let page: number;
            let pageSize: number;

            if (req.query.page !== undefined && Number(req.query.page) !== 0) {
                if (!Utils.isPositiveInteger(req.query.page.toString())) {
                    res.status(400).send(`Invalid value for parameter 'page': ${req.query.page.toString()}`);
                    return;
                }
                page = Number(req.query.page.toString());
            }
            else
                page = 1;

            if (req.query.pageSize !== undefined) {
                if (!Utils.isPositiveInteger(req.query.pageSize.toString())) {
                    res.status(400).send(`Invalid value for parameter 'limit': ${req.query.pageSize.toString()}`);
                    return;
                }
                pageSize = Number(req.query.pageSize.toString());
                if (pageSize > this.limit_page_size) {
                    res.status(400).send(`Page size cannot be a number greater than 100: ${pageSize}`);
                    return;
                }
            }
            else
                pageSize = 10;

            return resolve({ page, pageSize });
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
