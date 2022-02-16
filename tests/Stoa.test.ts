/*******************************************************************************

    Test API Server Stoa

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    BitMask,
    Block,
    BlockHeader,
    Enrollment,
    Hash,
    Height,
    JSBI,
    OutputType,
    PublicKey,
    Signature,
    SodiumHelper,
    Transaction,
    TxInput,
    TxOutput,
} from "boa-sdk-ts";
import {
    createBlock,
    delay,
    FakeBlacklistMiddleware,
    market_cap_history_sample_data,
    market_cap_sample_data,
    sample_data,
    sample_data2,
    sample_data3,
    sample_preImageInfo,
    TestAgora,
    TestClient,
    TestGeckoServer,
    TestStoa,
    TestVoteraServer,
} from "./Utils";

import * as assert from "assert";
import { BOASodium } from "boa-sodium-ts";
import URI from "urijs";
import { URL } from "url";
import { AgoraClient } from "../src/modules/agora/AgoraClient";
import { IDatabaseConfig } from "../src/modules/common/Config";
import { MockDBConfig } from "./TestConfig";
import { VoteraService } from "../src/modules/service/VoteraService";
import { CoinGeckoMarket } from "../src/modules/coinmarket/CoinGeckoMarket";
import { CoinMarketService } from "../src/modules/service/CoinMarketService";
import { CurrencyType, IMarketCap } from "../src/Types";

describe("Test of Stoa API Server", function () {
    this.timeout(10000);
    const agora_addr: URL = new URL("http://localhost:2802");
    const stoa_addr: URL = new URL("http://localhost:3802");
    const stoa_private_addr: URL = new URL("http://localhost:4802");
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;

    before("Bypassing middleware check", () => {
        FakeBlacklistMiddleware.assign();
    });

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora(agora_addr.port, [], resolve);
        });
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
        await agora_server.stop();
    });

    it("Test of the path /block_externalized", async () => {
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: sample_data[0] });
        await delay(1000);
        await client.post(url, { block: sample_data[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Test of the path /block_height", async () => {
        const uri = URI(stoa_addr).filename("block_height");

        const url = uri.toString();
        const response = await client.get(url);
        assert.strictEqual(response.data, "1");
    });

    it("Test of the path /validators", async () => {
        const uri = URI(stoa_addr).directory("validators").setSearch("height", "1");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 6);
        assert.strictEqual(response.data[0].address, "boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8");
        assert.strictEqual(response.data[0].preimage.height, "1");
    });

    it("Test of the path /validator", async () => {
        const uri = URI(stoa_addr)
            .directory("validator")
            .filename("boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8")
            .setSearch("height", "1");

        const fail_uri = URI(stoa_addr)
            .directory("validator")
            .filename("boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8")
            .setSearch("height", "99");

        const response1 = await client.get(fail_uri.toString());
        assert.strictEqual(response1.status, 204);

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].address, "boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8");
        assert.strictEqual(response.data[0].preimage.height, "1");
    });

    it("Test of the path /wallet/blocks/header", async () => {
        let uri = URI(stoa_addr).directory("/wallet/blocks/header");

        let response = await client.get(uri.toString());
        assert.strictEqual(response.data.height, "1");
        assert.strictEqual(
            response.data.hash,
            "0x5216c0ef8763a4c4b36404d837a1db4778996f7955f0fe459cabc66a36692947d0a93f6191ad33024ff0dc304ae1360f08203bf17c611ba438a1c1735d67af52"
        );
        assert.strictEqual(
            response.data.merkle_root,
            "0xaf887747962e5ba515cb56fcfe74b1a3f3a6bbcb15e28ce5354926af7835f0b587bc2b1fbb043f0f36921cd565102e581cd8062a3f7012475ad4cad5e3ac550c"
        );
        assert.strictEqual(response.data.time_stamp, 1609459800);

        uri = URI(stoa_addr).directory("/wallet/blocks/header").setSearch("height", "0");

        response = await client.get(uri.toString());
        assert.strictEqual(response.data.height, "0");
        assert.strictEqual(
            response.data.hash,
            "0x8365f069fe37ee02f2c4dc6ad816702088fab5fc875c3c67b01f82c285aa2d90b605f57e068139eba1f20ce20578d712f75be4d8568c8f3a7a34604e72aa3175"
        );
        assert.strictEqual(
            response.data.merkle_root,
            "0x0923b97e7a4dc9443089471545e796115ef5ad2eed8e92bb8b1de4744f94a95e297a536eb7c152752ca685af7602bc296f5590c2ddf0d91e4fe3dd24fb8e3f72"
        );
        assert.strictEqual(response.data.time_stamp, 1609459200);
    });

    it("Test of the path /transaction_received", async () => {
        const uri = URI(stoa_private_addr).directory("transaction_received");

        const url = uri.toString();
        const block = Block.reviver("", sample_data2);
        await client.post(url, { tx: block.txs[0] });
        await delay(500);
    });

    it("Test of the path /wallet/transactions/pending/:address", async () => {
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
        assert.strictEqual(response.data[0].fee, "282100");
        assert.strictEqual(response.data[0].block_delay, 0);
    });

    it("Test of the path /transaction/status/:hash", async () => {
        let uri = URI(stoa_addr)
            .directory("/transaction/status")
            .filename(
                "0x18bcf5260063740ef60d4d283b655242a5cbf72616c2713882e4d15804cbc2c20d3d904c34509e6c736bc3425b37a381ef60c06c04f4f3edc6ef28c2976d598c"
            );

        const response_pending = await client.get(uri.toString());
        const expected_pending = {
            status: "pending",
            tx_hash:
                "0x18bcf5260063740ef60d4d283b655242a5cbf72616c2713882e4d15804cbc2c20d3d904c34509e6c736bc3425b37a381ef60c06c04f4f3edc6ef28c2976d598c",
        };
        assert.deepStrictEqual(response_pending.data, expected_pending);

        uri = URI(stoa_addr)
            .directory("/transaction/status")
            .filename(
                "0x006b4215543cb0cfa1815c7f16a4f965b6c9d0205cc6eb27f783ebc4e0b5831130f563751cd5230793c285d4d8b1a3c85f3384abc385e691de0bfa2041ed0491"
            );

        const response_confirmed = await client.get(uri.toString());
        const expected_confirmed = {
            status: "confirmed",
            tx_hash:
                "0x006b4215543cb0cfa1815c7f16a4f965b6c9d0205cc6eb27f783ebc4e0b5831130f563751cd5230793c285d4d8b1a3c85f3384abc385e691de0bfa2041ed0491",
            block: {
                height: 1,
                hash: "0x5216c0ef8763a4c4b36404d837a1db4778996f7955f0fe459cabc66a36692947d0a93f6191ad33024ff0dc304ae1360f08203bf17c611ba438a1c1735d67af52",
            },
        };
        assert.deepStrictEqual(response_confirmed.data, expected_confirmed);
    });

    it("Test of the path /transaction/pending/:hash", async () => {
        const uri = URI(stoa_addr)
            .directory("/transaction/pending")
            .filename(
                "0x18bcf5260063740ef60d4d283b655242a5cbf72616c2713882e4d15804cbc2c20d3d904c34509e6c736bc3425b37a381ef60c06c04f4f3edc6ef28c2976d598c"
            );

        const response = await client.get(uri.toString());
        const expected = {
            inputs: [
                {
                    utxo: "0x75e5147e79da0e2e78ad765e0970fbc107f968b31ed3076de31a1da6f0ec5d8bc38bcfb6a269fb88cd585c6267de041c6d8326ff0318069cf9ee1b512229b539",
                    unlock: {
                        bytes: "R1rBB6gepY2V8AdfRga3kmHlcYZp4jqX/EM5RsRTug19Rat9h5W0PmXP1nUxz1ni0+iOEiw0p8kxCKDoNjwWkgE=",
                    },
                    unlock_age: 0,
                },
            ],
            outputs: [
                {
                    lock: {
                        bytes: "Qie/DFUXJNjFjIpToK9CJbCSxNVas3OgvQBsG42iSkc=",
                        type: 0,
                    },
                    type: 0,
                    value: "23799999932296",
                },
                {
                    lock: {
                        bytes: "egu98td3unJ8ppbUF+pmRAoKd27sgX3EI0l3e+xKmfs=",
                        type: 0,
                    },
                    type: 0,
                    value: "23799999932296",
                },
                {
                    lock: {
                        bytes: "epI98aAIo3+N4qCnxHNkvC0rhAK69lbCoWP3fNFZnio=",
                        type: 0,
                    },
                    type: 0,
                    value: "23799999932296",
                },
                {
                    lock: {
                        bytes: "fue/f2mgen6s4ZEMlgKTrrYwpWLDWufQ+JwOn2vUaPY=",
                        type: 0,
                    },
                    type: 0,
                    value: "23799999932296",
                },
                {
                    lock: {
                        bytes: "mDe9dh5S5JbRzncecjYqY6/Q3Q1hKQU4bqo+ocCiY5A=",
                        type: 0,
                    },
                    type: 0,
                    value: "23799999932296",
                },
            ],
            payload: "",
            lock_height: "0",
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /transaction/:hash", async () => {
        const uri = URI(stoa_addr)
            .directory("/transaction")
            .filename(
                "0x006b4215543cb0cfa1815c7f16a4f965b6c9d0205cc6eb27f783ebc4e0b5831130f563751cd5230793c285d4d8b1a3c85f3384abc385e691de0bfa2041ed0491"
            );

        const response = await client.get(uri.toString());
        const expected = {
            inputs: [
                {
                    unlock: {
                        bytes: "SG1FI8iTMx45w4av9jIvJyKDtd+/crAvQa/8P7h7IAz+kPCnU7IdZcFom0d938Ao2Knxvjd7gXFQyLJaSCPvPgE=",
                    },
                    unlock_age: 0,
                    utxo: "0xdd7ce1ab69ad4df9a8fa174d12bfbb4dcdec02450ba5cd638ab79427d13e42d0d06eabb581b173606b642d8fa947948117d60becb73429af5785611843664ac3",
                },
            ],
            lock_height: "0",
            outputs: [
                {
                    lock: {
                        bytes: "Qie/DFUXJNjFjIpToK9CJbCSxNVas3OgvQBsG42iSkc=",
                        type: 0,
                    },
                    type: 0,
                    value: "118999999943580",
                },
                {
                    lock: {
                        bytes: "egu98td3unJ8ppbUF+pmRAoKd27sgX3EI0l3e+xKmfs=",
                        type: 0,
                    },
                    type: 0,
                    value: "118999999943580",
                },
                {
                    lock: {
                        bytes: "epI98aAIo3+N4qCnxHNkvC0rhAK69lbCoWP3fNFZnio=",
                        type: 0,
                    },
                    type: 0,
                    value: "118999999943580",
                },
                {
                    lock: {
                        bytes: "fue/f2mgen6s4ZEMlgKTrrYwpWLDWufQ+JwOn2vUaPY=",
                        type: 0,
                    },
                    type: 0,
                    value: "118999999943580",
                },
                {
                    lock: {
                        bytes: "mDe9dh5S5JbRzncecjYqY6/Q3Q1hKQU4bqo+ocCiY5A=",
                        type: 0,
                    },
                    type: 0,
                    value: "118999999943580",
                },
            ],
            payload: "",
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /transactions/address/:address", async () => {
        const uri = URI(stoa_addr)
            .directory("/transactions/address")
            .filename("boa1xpval9gv8wjk5s05w0vplpgd5wrmzlvhj4e6zym302f2t6xeklzw2meepv9");

        const response = await client.get(uri.toString());
        const expected = [
            {
                height: "0",
                tx_hash:
                    "0xbf5685b8bc230a0463d1b5c64a8dd3cab09de95cd6e71649a43af680569770b279646a8a5453bd157a6d2066850c27e941c662eb22c8ebae922989487bc53e58",
                type: "Freeze",
                fee: 0,
                size: 278,
                time: 1609459200,
                inputs: [],
                outputs: [
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xqvalc7v34kr9crh4e882zmguvt3dgmtdhxtqx0wsljej5f9xdxl6xftcay",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xqvala342upf2t2c0fe96h8cdtjatrksjldyhsrachcq3523ah8dy5r8ejz",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xpval9gv8wjk5s05w0vplpgd5wrmzlvhj4e6zym302f2t6xeklzw2meepv9",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xzval8mq887lkjsqwyl58xyrkxxz8mphv5dx9qv2z750fxvcs9gtvpal0dm",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xzvale54hw9zk69t7hpgu422ht2nkv3gkx7k8nhph5vg2tkpwpnzuarah4d",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xrvaldd5au5d5xs6pd6js7zah6m4h5d0r5tpwjasp99gvz3gmj2ex432u5x",
                    },
                ],
                full_count: 1,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /validators Slashed a validator", async () => {
        const uri = URI(stoa_private_addr).directory("block_externalized");
        await client.post(uri.toString(), { block: sample_data2 });
        await delay(2000);

        const slash_uri = URI(stoa_addr).directory("validators").setSearch("height", "2");
        // Slashed a validator
        const response = await client.get(slash_uri.toString());
        assert.strictEqual(response.data.length, 5);
    });
});

describe("Test of the path /utxo", function () {
    this.timeout(10000);
    const agora_addr: URL = new URL("http://localhost:2803");
    const stoa_addr: URL = new URL("http://localhost:3803");
    const stoa_private_addr: URL = new URL("http://localhost:4803");
    let stoa_server: TestStoa;
    const votera_addr: URL = new URL("http://127.0.0.1:1337/");
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMarket;
    let coinMarketService: CoinMarketService;
    let votera_server: TestVoteraServer;
    let votera_service: VoteraService;

    before("Bypassing middleware check", () => {
        FakeBlacklistMiddleware.assign();
    });

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora(agora_addr.port, [], resolve);
        });
    });

    before("Start a fake TestCoinGeckoServer", () => {
        return new Promise<void>(async (resolve, reject) => {
            gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
            gecko_market = new CoinGeckoMarket(gecko_server);
        });
    });
    before("Start a fake votera Server and Service", () => {
        return new Promise<void>(async (resolve, reject) => {
            votera_server = new TestVoteraServer(1337, votera_addr, resolve);
            votera_service = new VoteraService(votera_addr);
        });
    });

    before("Start a fake TestCoinGecko", () => {
        coinMarketService = new CoinMarketService(gecko_market);
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port, votera_service, coinMarketService);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.voteraService?.stop();
        await votera_server.stop();
        await stoa_server.stop();
        await gecko_server.stop();
        await agora_server.stop();
    });

    it("Store two blocks", async () => {
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: sample_data[0] });
        await delay(1000);
        await client.post(url, { block: sample_data[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Test of the path /utxo no pending transaction ", async () => {
        const uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap");

        const response = await client.get(uri.toString());
        const expected = [
            {
                amount: "118999999943580",
                height: "1",
                lock_bytes: "epI98aAIo3+N4qCnxHNkvC0rhAK69lbCoWP3fNFZnio=",
                lock_type: 0,
                time: 1609459800,
                type: 0,
                unlock_height: "2",
                utxo: "0x4d8ca31d115e8044ea91a6ced3db25c59c91a6ded38a85c736ac57030f5f7d0053e435f4e66349b98e7b5f618c775f8e7c35137618b8931b2625efa382904eee",
            },
            {
                amount: "118999999943580",
                height: "1",
                lock_bytes: "epI98aAIo3+N4qCnxHNkvC0rhAK69lbCoWP3fNFZnio=",
                lock_type: 0,
                time: 1609459800,
                type: 0,
                unlock_height: "2",
                utxo: "0xb49154b6f701ab3a55797f9513e9c166db50b4bb625cd813f3c782e49195edc34dee513f7d1901a4952d94bad309aaec389618a85ac5eea3d5c579ffcbd9c23d",
            },
            {
                amount: "118999999943580",
                height: "1",
                lock_bytes: "epI98aAIo3+N4qCnxHNkvC0rhAK69lbCoWP3fNFZnio=",
                lock_type: 0,
                time: 1609459800,
                type: 0,
                unlock_height: "2",
                utxo: "0xe94bea1007e0018ffe9a8c744ff8bc17ea4c880883b657fb53e0de9f2d1da4d91fc5c20b75bd03c73d3b9210316dc1762c4893702e5402cad129cbf7412432bd",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Store one pending transaction", async () => {
        const uri = URI(stoa_private_addr).directory("transaction_received");

        const url = uri.toString();
        await client.post(url, { tx: Block.reviver("", sample_data2).txs[0] });
        await delay(500);
    });

    it("Test of the path /utxo with pending transaction ", async () => {
        const uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 0);
    });

    it("Test for putCoinMarketStats method", async () => {
        const data: IMarketCap = await gecko_market.fetch(CurrencyType.USD);
        const response = await stoa_server.putCoinMarketStats(data);
        assert.deepStrictEqual(response.affectedRows, 1);
    });

    it("Test getting fees of the transaction", async () => {
        const uri = URI(stoa_addr).directory("transaction/fees").filename("1000");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.medium, "700000");
        assert.strictEqual(response.data.low, "700000");
        assert.strictEqual(response.data.high, "770000");
    });

    it("Test getting height at", async () => {
        const zero = 1609459200;
        const one = zero + 10 * 60;

        const no_exist = zero - 10 * 60;
        let uri = URI(stoa_addr).directory("block_height_at").filename(no_exist.toString());
        let response = await client.get(uri.toString());
        assert.strictEqual(response.statusText, "No Content");

        uri = URI(stoa_addr).directory("block_height_at").filename(one.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "1");

        const one_alpha = one + 1;
        uri = URI(stoa_addr).directory("block_height_at").filename(one_alpha.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "1");

        const one_beta = one - 1;
        uri = URI(stoa_addr).directory("block_height_at").filename(one_beta.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "0");

        const hundred = zero + 100 * 10 * 60;
        uri = URI(stoa_addr).directory("block_height_at").filename(hundred.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "100");

        const hundred_alpha = hundred + 1;
        uri = URI(stoa_addr).directory("block_height_at").filename(hundred_alpha.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "100");

        const hundred_beta = hundred - 1;
        uri = URI(stoa_addr).directory("block_height_at").filename(hundred_beta.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "99");
    });
});

describe("Test of the path /utxo for freezing", function () {
    this.timeout(10000);
    const agora_addr: URL = new URL("http://localhost:2804");
    const stoa_addr: URL = new URL("http://localhost:3804");
    const stoa_private_addr: URL = new URL("http://localhost:4804");
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;

    const blocks: Block[] = [];

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();

        blocks.push(Block.reviver("", sample_data[0]));
        blocks.push(Block.reviver("", sample_data[1]));
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora(agora_addr.port, [], resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    it("Store two blocks", async () => {
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: sample_data[0] });
        await delay(1000);
        await client.post(url, { block: sample_data[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Test of /utxos - Get UTXO information", async () => {
        const uri = URI(stoa_addr).directory("utxos");

        const utxo_hash = [
            "B49154B6F701AB3A55797F9513E9C166DB50B4BB625CD813F3C782E49195EDC34DEE513F7D1901A4952D94BAD309AAEC389618A85AC5EEA3D5C579FFCBD9C23D",
            "B7D5277F5A233E97FAEC8EBA5A67BFEAC710B7AA4CD5EAA8116149719A3F590E2D08C78FA22EACAF9E7FEE212225CC4E379DADD173EA9438CC2E1F183B16261E",
            "C39C45DD83DC80630D2BD801EFF288FFB0E8B1FA5FDDFABC9B529B32DE429F9320E3256C128108485B75AF94F0E5DE1E667F4687A6118D7901AF3CD1815A3E28",
        ];

        const response = await client.post(uri.toString(), { utxos: utxo_hash });
        const expected = [
            {
                amount: "118999999943580",
                height: "1",
                lock_bytes: "mDe9dh5S5JbRzncecjYqY6/Q3Q1hKQU4bqo+ocCiY5A=",
                lock_type: 0,
                time: 1609459800,
                type: 0,
                unlock_height: "2",
                utxo: "0xc39c45dd83dc80630d2bd801eff288ffb0e8b1fa5fddfabc9b529b32de429f9320e3256c128108485b75af94f0e5de1e667f4687a6118d7901af3cd1815a3e28",
            },
            {
                amount: "118999999943580",
                height: "1",
                lock_bytes: "fue/f2mgen6s4ZEMlgKTrrYwpWLDWufQ+JwOn2vUaPY=",
                lock_type: 0,
                time: 1609459800,
                type: 0,
                unlock_height: "2",
                utxo: "0xb7d5277f5a233e97faec8eba5a67bfeac710b7aa4cd5eaa8116149719a3f590e2d08c78fa22eacaf9e7fee212225cc4e379dadd173ea9438cc2e1f183b16261e",
            },
            {
                amount: "118999999943580",
                height: "1",
                lock_bytes: "epI98aAIo3+N4qCnxHNkvC0rhAK69lbCoWP3fNFZnio=",
                lock_type: 0,
                time: 1609459800,
                type: 0,
                unlock_height: "2",
                utxo: "0xb49154b6f701ab3a55797f9513e9c166db50b4bb625cd813f3c782e49195edc34dee513f7d1901a4952d94bad309aaec389618a85ac5eea3d5c579ffcbd9c23d",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Create a block with a freeze transaction", async () => {
        let uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xrajh00as4l8u8jrvjtfqleae59nrzt8vnjpxf8ys6uzzmyarygfc7j2xx5");

        let response = await client.get(uri.toString());

        //  First Transaction
        //  Refund amount is      10,000 BOA
        //  Freezing amount is 11,889,999.9943580 BOA
        const tx1 = new Transaction(
            [new TxInput(new Hash(response.data[0].utxo))],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt("100000000000"),
                    new PublicKey("boa1xrajh00as4l8u8jrvjtfqleae59nrzt8vnjpxf8ys6uzzmyarygfc7j2xx5")
                ),
                new TxOutput(
                    OutputType.Freeze,
                    JSBI.BigInt("118899999943580"),
                    new PublicKey("boa1xrajh00as4l8u8jrvjtfqleae59nrzt8vnjpxf8ys6uzzmyarygfc7j2xx5")
                ),
            ],
            Buffer.alloc(0)
        );

        uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap");

        response = await client.get(uri.toString());

        //  Second Transaction
        //  Refund amount is      40,000 BOA
        //  Freezing amount is 35,659,999.9830740 BOA
        const tx2 = new Transaction(
            [new TxInput(new Hash(response.data[0].utxo))],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt("400000000000"),
                    new PublicKey("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs")
                ),
                new TxOutput(
                    OutputType.Freeze,
                    JSBI.BigInt("356599999830740"),
                    new PublicKey("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs")
                ),
            ],
            Buffer.alloc(0)
        );

        // Create block with two transactions
        blocks.push(createBlock(blocks[1], [tx1, tx2]));
        uri = URI(stoa_private_addr).directory("block_externalized");
        await client.post(uri.toString(), { block: blocks[2] });
        await delay(500);
    });

    it("Check the height of the block", async () => {
        const uri = URI(stoa_addr).filename("block_height");

        const url = uri.toString();
        const response = await client.get(url);
        assert.strictEqual(response.data, "2");
    });

    it("Check the UTXO included in the freeze transaction, when refund amount less then 40,000 BOA", async () => {
        const uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xrajh00as4l8u8jrvjtfqleae59nrzt8vnjpxf8ys6uzzmyarygfc7j2xx5");

        const response = await client.get(uri.toString());
        const utxo_array: any[] = response.data;
        assert.strictEqual(utxo_array.length, 2);

        const freeze_utxo = utxo_array.find((m) => m.amount === "118899999943580");
        assert.strictEqual(freeze_utxo.type, OutputType.Freeze);

        // It was not frozen because the amount of the refund was less than 40,000 BOA.
        const refund_utxo = utxo_array.find((m) => m.amount === "100000000000");
        assert.strictEqual(refund_utxo.type, OutputType.Payment);
    });

    it("Check the UTXO included in the freeze transaction, when refund amount greater or equal then 40,000 BOA", async () => {
        const uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs");

        const response = await client.get(uri.toString());
        const utxo_array: any[] = response.data;
        assert.strictEqual(utxo_array.length, 2);

        const freeze_utxo = utxo_array.find((m) => m.amount === "356599999830740");
        assert.strictEqual(freeze_utxo.type, OutputType.Freeze);

        // It was frozen because the amount of the refund was larger than 40,000 BOA.
        const refund_utxo = utxo_array.find((m) => m.amount === "400000000000");
        assert.strictEqual(refund_utxo.type, OutputType.Payment);
    });
});

describe("Test of the path /merkle_path", function () {
    this.timeout(10000);
    const agora_addr: URL = new URL("http://localhost:2805");
    const stoa_addr: URL = new URL("http://localhost:3805");
    const stoa_private_addr: URL = new URL("http://localhost:4805");
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora(agora_addr.port, [], resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port);
        await stoa_server.createStorage();
        await stoa_server.start();

        agora_server.setBlocks(sample_data);
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    it("Store two blocks", async () => {
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: sample_data[0] });
        await delay(1000);
        await client.post(url, { block: sample_data[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Test of the path /merkle_path", async () => {
        const uri = URI(agora_addr)
            .directory("merkle_path")
            .setSearch("height", "1")
            .setSearch(
                "hash",
                "0xa4ce8dd85f51340bdae780db580e21acacfc94eec3305d83275ff2ea2d5583d75b8c400e1807952e04f243c4ef80d821e2537a59f20e12857c910bc2e4028bf7"
            );

        const response = await client.get(uri.toString());

        const expected = [
            "0x4192b4c64083f5e689a8f5262a833438e9574dda8574082f1b4bfb07de7856138373a33e07e1fcd4c4f6bfd26a784c09c1ad98bbc6293fdd754d1ae803640017",
            "0x08042268e7755f5aaaa32e886c25ecf0ffd711540afdbb5e038da887bf1e1c1f8542b26da90e531e9689ad7d9aa9e8378b68f2170b8e1ec1b555749c75d73515",
            "0xd7e57e2077db79906b1993155d0bef9be05cd5ebe0d9335d96c5f762a40616d8c542f3fde80099e5db9773526552194a3ebce4c9297e18c6fcb0f9575e6c8ccb",
        ];

        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /merkle_path by AgoraClient", async () => {
        const agora_client = new AgoraClient(agora_addr);
        const merkle_path: Hash[] = await agora_client.getMerklePath(
            new Height("1"),
            new Hash(
                "0xdd75be9a8b2778deb99734dfb17f70c3635afff654342cc1c306ba0fc69eb72494c9e3c4543eaa6974757204ff19a521989b6ab4c6d41de535b8e634faf66183"
            )
        );

        const expected = [
            new Hash(
                "0x4192b4c64083f5e689a8f5262a833438e9574dda8574082f1b4bfb07de7856138373a33e07e1fcd4c4f6bfd26a784c09c1ad98bbc6293fdd754d1ae803640017"
            ),
            new Hash(
                "0x08042268e7755f5aaaa32e886c25ecf0ffd711540afdbb5e038da887bf1e1c1f8542b26da90e531e9689ad7d9aa9e8378b68f2170b8e1ec1b555749c75d73515"
            ),
            new Hash(
                "0xd7e57e2077db79906b1993155d0bef9be05cd5ebe0d9335d96c5f762a40616d8c542f3fde80099e5db9773526552194a3ebce4c9297e18c6fcb0f9575e6c8ccb"
            ),
        ];
        assert.deepStrictEqual(merkle_path, expected);
    });

    it("Test of the path /spv with a Merkle path transaction", async () => {
        const uri = URI(stoa_addr)
            .directory("spv")
            .filename(
                "0x006b4215543cb0cfa1815c7f16a4f965b6c9d0205cc6eb27f783ebc4e0b5831130f563751cd5230793c285d4d8b1a3c85f3384abc385e691de0bfa2041ed0491"
            );

        const response = await client.get(uri.toString());

        const expected = {
            result: true,
            message: "Success",
        };

        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /spv with a non-Merkle path transaction", async () => {
        const uri = URI(stoa_addr)
            .directory("spv")
            .filename(
                "0xaf63ca7d0b555bbbe65d398165c3d921421114003ee6d42fe11a1b4eaafa6d6e9a57ffc6d35b820d001beeebdcdec9a9d6b7d34fe0062a6d9eb719d8d47237f2"
            );

        const response = await client.get(uri.toString());

        const expected = {
            result: false,
            message: "Verification failed",
        };

        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /spv with an invalid transaction ", async () => {
        const uri = URI(stoa_addr)
            .directory("spv")
            .filename(
                "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
            );

        const response = await client.get(uri.toString());

        const expected = {
            result: false,
            message: "Transaction does not exist in block",
        };

        assert.deepStrictEqual(response.data, expected);
    });
});
