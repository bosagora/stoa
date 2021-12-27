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
import { IDatabaseConfig } from "../src/modules/common/Config";
import { LedgerStorage } from "../src/modules/storage/LedgerStorage";
import { TransactionPool } from "../src/modules/storage/TransactionPool";
import { MockDBConfig } from "./TestConfig";

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
import * as mysql from "mysql2";

describe("Test TransactionPool", () => {
    let ledger_storage: LedgerStorage;
    let transaction_pool: TransactionPool;
    let testDBConfig: IDatabaseConfig;

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Prepare Storage", async () => {
        testDBConfig = await MockDBConfig();
        return LedgerStorage.make(testDBConfig, 1609459200, 600, 20).then(async (result) => {
            ledger_storage = result;
            transaction_pool = new TransactionPool(ledger_storage);
            return transaction_pool.loadSpenderList();
        });
    });

    after("Close Storage", async () => {
        await ledger_storage.dropTestDB(testDBConfig.database);
        await ledger_storage.close();
    });

    it("Test for deletion of a pending transaction that all use the same input", async () => {
        const tx1 = new Transaction(
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
        let conn: mysql.PoolConnection = await ledger_storage.getConnection();
        await transaction_pool.add(conn, tx1);
        assert.strictEqual(await transaction_pool.getLength(conn), 1);

        const tx2 = new Transaction(
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
        await transaction_pool.remove(conn, tx2, true);
        assert.strictEqual(await transaction_pool.getLength(conn), 0);

        await transaction_pool.add(conn, tx2);
        assert.strictEqual(await transaction_pool.getLength(conn), 1);
        conn.release();
    });

    it("Test for deletion of a pending transaction that use some of the same inputs", async () => {
        const tx1 = new Transaction(
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
        let conn: mysql.PoolConnection = await ledger_storage.getConnection();

        await transaction_pool.add(conn, tx1);
        assert.strictEqual(await transaction_pool.getLength(conn), 2);

        const tx2 = new Transaction(
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
        await transaction_pool.remove(conn, tx2, true);
        assert.strictEqual(await transaction_pool.getLength(conn), 0);

        await transaction_pool.add(conn, tx2);
        assert.strictEqual(await transaction_pool.getLength(conn), 1);
        conn.release();
    });

    it("Test for TransactionPool.loadSpenderList()", async () => {
        let conn: mysql.PoolConnection = await ledger_storage.getConnection();
        assert.strictEqual(await transaction_pool.getLength(conn), 1);
        const other_pool = new TransactionPool(ledger_storage);
        other_pool.loadSpenderList();
        conn.release();
    });
});

describe("Test of double spending transaction", () => {
    const agora_addr: URL = new URL("http://localhost:2821");
    const stoa_addr: URL = new URL("http://localhost:3821");
    const stoa_private_addr: URL = new URL("http://localhost:4821");
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;

    let block: Block;

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start TestAgora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora(agora_addr.port, sample_data, resolve);
        });
    });

    after("Stop TestAgora", async () => {
        await agora_server.stop();
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port);
        await stoa_server.createStorage();
    });

    before("Start TestStoa", async () => {
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
    });

    it("Test of the path /block_externalized", async () => {
        block = Block.reviver("", sample_data2);

        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: sample_data[0] });
        await client.post(url, { block: sample_data[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Send the first transaction", async () => {
        const tx = new Transaction(
            [
                new TxInput(
                    block.txs[0].inputs[0].utxo,
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(10_000_000_000_000),
                    new PublicKey("boa1xqej00jh50l2me46pkd3dmkpdl6n4ugqss2ev3utuvpuvwhe93l9gjlmxzu")
                ),
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt(14_399_999_970_480),
                    new PublicKey("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj")
                ),
            ],
            Buffer.alloc(0)
        );

        const uri = URI(stoa_private_addr).directory("transaction_received");

        const url = uri.toString();
        await client.post(url, { tx });
        await delay(500);
    });

    it("Check if the pending transaction is the first transaction", async () => {
        const uri = URI(stoa_addr)
            .directory("/wallet/transactions/pending")
            .filename("boa1xpaqh00j6amm5unu56tdg9l2vezq5znhdmkgzlwyydyhw7lvf2vlkq4kwpq");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(
            response.data[0].tx_hash,
            "0x7764f1180b6d9f16db020e399a2f3b9dcbe4c4b70369165de750952ec0adf61bf4e7a4980b3ece60cd3f2cf5081f1b6a9a226b63f7a98e05fa3fc538971fcb9c"
        );
        assert.strictEqual(response.data[0].address, "boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");
        assert.strictEqual(response.data[0].amount, "24399999970480");
    });

    it("Send a second transaction with the same input as the first transaction", async () => {
        const tx = block.txs[0];

        const uri = URI(stoa_private_addr).directory("transaction_received");

        const url = uri.toString();
        await client.post(url, { tx });
        await delay(500);
    });

    it("Check if there is only a second transaction.", async () => {
        const uri = URI(stoa_addr)
            .directory("/wallet/transactions/pending")
            .filename("boa1xpaqh00j6amm5unu56tdg9l2vezq5znhdmkgzlwyydyhw7lvf2vlkq4kwpq");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(
            response.data[0].tx_hash,
            "0x18bcf5260063740ef60d4d283b655242a5cbf72616c2713882e4d15804cbc2c20d3d904c34509e6c736bc3425b37a381ef60c06c04f4f3edc6ef28c2976d598c"
        );
        assert.strictEqual(response.data[0].address, "boa1xppz00cv25tjfkx93j998g90ggjmpyky64dtxuaqh5qxcxud5f9yww64cxq");
        assert.strictEqual(response.data[0].amount, "95199999729184");
    });
});
