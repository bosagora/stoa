/*******************************************************************************

    Test of transaction pool

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    Block,
    Hash,
    JSBI,
    OutputType,
    PublicKey,
    Signature,
    SodiumHelper,
    Transaction,
    TxInput,
    TxOutput,
    Unlock,
} from "boa-sdk-ts";
import { BOASodium } from "boa-sodium-ts";
import { IDatabaseConfig, IAdminConfig } from "../src/modules/common/Config";
import { LedgerStorage } from "../src/modules/storage/LedgerStorage";
import { TransactionPool } from "../src/modules/storage/TransactionPool";
import { MockDBConfig } from "./TestConfig";
import { Logger } from '../src/modules/common/Logger';

import { CoinGeckoMarket } from "../src/modules/coinmarket/CoinGeckoMarket";
import { CoinMarketService } from "../src/modules/service/CoinMarketService";
import {
    delay,
    market_cap_history_sample_data,
    market_cap_sample_data,
    sample_data,
    sample_data2,
    TestAgora,
    TestClient,
    TestGeckoServer,
    TestStoa,
} from "./Utils";

import * as assert from "assert";
import URI from "urijs";
import { URL } from "url";

describe("Test TransactionPool", () => {
    let ledger_storage: LedgerStorage;
    let transaction_pool: TransactionPool;
    let testDBConfig: IDatabaseConfig;
    let testAdminConfig: IAdminConfig;

    before("Wait for the package libsodium to finish loading", async () => {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Prepare Storage", async () => {
        testDBConfig = await MockDBConfig();
        return LedgerStorage.make(testDBConfig, 1609459200).then((result) => {
            ledger_storage = result;
            transaction_pool = new TransactionPool();
            return transaction_pool.loadSpenderList(ledger_storage.connection);
        });
    });

    after("Close Storage", async () => {
        await ledger_storage.dropTestDB(testDBConfig.database);
        await ledger_storage.close();
    });

    it("Test for deletion of a pending transaction that all use the same input", async () => {
        let tx1 = new Transaction(
            [
                new TxInput(
                    new Hash(
                        "0x75283072696d82d8bca2fe45471906a26df1dbe0736e41a9f78e02a14e2bfce" +
                            "d6e0cb671f023626f890f28204556aca217f3023c891fe64b9f4b3450cb3e80ad"
                    ),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(10_000_000),
                    new PublicKey("boa1xza007gllhzdawnr727hds36guc0frnjsqscgf4k08zqesapcg3uujh9g93")
                ),
            ],
            Buffer.alloc(0)
        );
        await transaction_pool.add(ledger_storage.connection, tx1);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 1);

        let tx2 = new Transaction(
            [
                new TxInput(
                    new Hash(
                        "0x75283072696d82d8bca2fe45471906a26df1dbe0736e41a9f78e02a14e2bfce" +
                            "d6e0cb671f023626f890f28204556aca217f3023c891fe64b9f4b3450cb3e80ad"
                    ),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(10_000_000),
                    new PublicKey("boa1xrc00kar2yqa3jzve9cm4cvuaa8duazkuwrygmqgpcuf0gqww8ye7ua9lkl")
                ),
            ],
            Buffer.alloc(0)
        );
        await transaction_pool.remove(ledger_storage.connection, tx2, true);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 0);

        await transaction_pool.add(ledger_storage.connection, tx2);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 1);
    });

    it("Test for deletion of a pending transaction that use some of the same inputs", async () => {
        let tx1 = new Transaction(
            [
                new TxInput(
                    new Hash(
                        "0x75283072696d82d8bca2fe45471906a26df1dbe0736e41a9f78e02a14e2bfce" +
                            "d6e0cb671f023626f890f28204556aca217f3023c891fe64b9f4b3450cb3e80ad"
                    ),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
                new TxInput(
                    new Hash(
                        "0x6fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83" +
                            "cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673"
                    ),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(10_000_000),
                    new PublicKey("boa1xza007gllhzdawnr727hds36guc0frnjsqscgf4k08zqesapcg3uujh9g93")
                ),
            ],
            Buffer.alloc(0)
        );
        await transaction_pool.add(ledger_storage.connection, tx1);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 2);

        let tx2 = new Transaction(
            [
                new TxInput(
                    new Hash(
                        "0x75283072696d82d8bca2fe45471906a26df1dbe0736e41a9f78e02a14e2bfce" +
                            "d6e0cb671f023626f890f28204556aca217f3023c891fe64b9f4b3450cb3e80ad"
                    ),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(10_000_000),
                    new PublicKey("boa1xrc00kar2yqa3jzve9cm4cvuaa8duazkuwrygmqgpcuf0gqww8ye7ua9lkl")
                ),
            ],
            Buffer.alloc(0)
        );
        await transaction_pool.remove(ledger_storage.connection, tx2, true);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 0);

        await transaction_pool.add(ledger_storage.connection, tx2);
        assert.strictEqual(await transaction_pool.getLength(ledger_storage.connection), 1);
    });
});

describe("Test of double spending transaction", () => {
    let host: string = "http://localhost";
    let port: string = "3837";
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    let testAdminConfig: IAdminConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMarket;
    let coinMarketService: CoinMarketService;

    const block = Block.reviver("", sample_data2);

    before("Wait for the package libsodium to finish loading", async () => {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", sample_data, resolve);
        });
    });

    before("Start a fake TestCoinGecko", () => {
        return new Promise<void>((resolve, reject) => {
            gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
            gecko_market = new CoinGeckoMarket(gecko_server);
        });
    });

    before("Start a fake coinMarketService", () => {
        coinMarketService = new CoinMarketService(gecko_market);
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, testAdminConfig, new URL("http://127.0.0.1:2826"), port, coinMarketService);
        await stoa_server.createStorage();
    });

    before("Start TestStoa", async () => {
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
        await gecko_server.stop();
    });
    after('Drop mongoDb database', async () => {
        let conn: any = Logger.dbInstance.connection;
        await conn.dropDatabase();
    });

    it("Test of the path /block_externalized", async () => {
        let uri = URI(host).port(port).directory("block_externalized");

        let url = uri.toString();
        await client.post(url, { block: sample_data[0] });
        await client.post(url, { block: sample_data[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(100);
    });

    it("Send the first transaction", async () => {
        let tx = new Transaction(
            [
                new TxInput(
                    block.txs[0].inputs[0].utxo,
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(24_400_000_000_000),
                    new PublicKey("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj")
                ),
            ],
            Buffer.alloc(0)
        );

        let uri = URI(host).port(port).directory("transaction_received");

        let url = uri.toString();
        await client.post(url, { tx: tx });
        await delay(100);
    });

    it("Check if the pending transaction is the first transaction", async () => {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/pending")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

        let response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(
            response.data[0].tx_hash,
            "0xfe9f5b40bcd1dfe68be7aa4a08b65d2a7ea31aac52431bc6dae1a9e3ebe4742" +
                "25e470aeb36bea739c9c0f094b56fc1f8097bbbbc7721bf99208154ec74801950"
        );
        assert.strictEqual(response.data[0].address, "boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");
        assert.strictEqual(response.data[0].amount, "24400000000000");
    });

    it("Send a second transaction with the same input as the first transaction", async () => {
        let tx = block.txs[0];

        let uri = URI(host).port(port).directory("transaction_received");

        let url = uri.toString();
        await client.post(url, { tx: tx });
        await delay(100);
    });

    it("Check if there is only a second transaction.", async () => {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/pending")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

        let response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 2);
        assert.strictEqual(
            response.data[0].tx_hash,
            "0x35917fba7333947cfbc086164e81c1ad7b98dc6a4c61822a89f6eb061b29e95" +
                "6c5c964a2d4b9cce9a2119244e320091b20074351ab288e07f9946b9dcc4735a7"
        );
        assert.strictEqual(response.data[0].address, "boa1xqcmmns5swnm03zay5wjplgupe65uw4w0dafzsdsqtwq6gv3h3lcz24a8ch");
        assert.strictEqual(response.data[0].amount, "12199168170440");
    });
});
