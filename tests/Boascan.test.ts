/*******************************************************************************

    Test BOASCAN server

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as assert from "assert";
import { SodiumHelper } from "boa-sdk-ts";
import { BOASodium } from "boa-sodium-ts";
import URI from "urijs";
import sinon from "sinon";
import { URL } from "url";
import { CoinGeckoMarket } from "../src/modules/coinmarket/CoinGeckoMarket";
import { IDatabaseConfig } from "../src/modules/common/Config";
import { CoinMarketService } from "../src/modules/service/CoinMarketService";
import { IMarketCap } from "../src/Types";
import { MockDBConfig } from "./TestConfig";
import {
    market_cap_history_sample_data,
    market_cap_sample_data,
    sample_data,
    TestAgora,
    TestClient,
    TestGeckoServer,
    TestStoa,
} from "./Utils";
import { Request, Response, NextFunction } from "express";
const blacklistMiddleware = require("../src/modules/middleware/blacklistMiddleware");

describe("Test of Stoa API Server", () => {
    let host: string = "http://localhost";
    let port: string = "3837";
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMarket;
    let coinMarketService: CoinMarketService;

    before("Bypassing middleware check", async () => {
        sinon
            .stub(blacklistMiddleware, "isBlackList")
            .callsFake(async (req: Request, res: Response, next: NextFunction) => {
                next();
            });
    });

    before("Wait for the package libsodium to finish loading", async () => {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", sample_data, resolve);
        });
    });

    before("Start a fake TestCoinGeckoServer", () => {
        return new Promise<void>(async (resolve, reject) => {
            gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
            gecko_market = new CoinGeckoMarket(gecko_server);
        });
    });

    before("Start a fake TestCoinGecko", () => {
        coinMarketService = new CoinMarketService(gecko_market);
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, new URL("http://127.0.0.1:2826"), port, coinMarketService);
        await stoa_server.createStorage();
    });

    before("Start TestStoa", async () => {
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await gecko_server.stop();
        await agora_server.stop();
    });

    it("Test of the path /latest-blocks", async () => {
        let uri = URI(host).port(port).directory("/latest-blocks").addSearch("page", "1").addSearch("limit", "10");

        let response = await client.get(uri.toString());
        let expected = [
            {
                height: "1",
                hash: "0x5e57db5e2c2effd180f831330ddf2ea2686817b4f14c8ee60700ecb5c4e9130ce5fe1b9785bc2b5cc6c5fd8c1682647b258419cafa637f07f0aa4e88c9a7de9f",
                merkle_root:
                    "0x515a30d31fbd031d63f041b92184f32baf00d08e4120da9299bc336c6f980f2245b11e70bb1dcb7c2279ead9dab1c37b62dee8414083ae8346d166cf033cddfb",
                signature:
                    "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                validators: "111111",
                tx_count: "8",
                enrollment_count: "0",
                time_stamp: 1609459800,
                full_count: 2,
            },
            {
                height: "0",
                hash: "0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364eabbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99",
                merkle_root:
                    "0x67218493be437c25dc5884abdc8ee40e61f0af79aa9af8ab9bd8b0632eaaca238b4c054f114b046da0d5911b1b205ba540d07c5dc01560beafe564e5f3d101c9",
                signature:
                    "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                validators: "",
                tx_count: "2",
                enrollment_count: "6",
                time_stamp: 1609459200,
                full_count: 2,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /latest-transactions", async () => {
        let uri = URI(host)
            .port(port)
            .directory("/latest-transactions")
            .addSearch("page", "1")
            .addSearch("limit", "10");

        let response = await client.get(uri.toString());
        let expected = [
            {
                height: "1",
                tx_hash:
                    "0xfbaaebc15bb1618465077fed2425a826d88c7f5ae0197634f056bfbad12a7a74b28cc82951e889255e149707bd3ef64eb01121875c766b5d24afed176d7d255c",
                type: 0,
                amount: "609999999762000",
                tx_fee: "238000",
                tx_size: "1265",
                time_stamp: 1609459800,
                full_count: 10,
            },
            {
                height: "1",
                tx_hash:
                    "0x25ba9352ec7a92efd273b62de9bb30c62a2c468030e2ac0711563453102299abcb9e014a59b9c0ba43e2041c1444535098bf6f0e5532e7e4dce10ebac751f747",
                type: 0,
                amount: "609999999762000",
                tx_fee: "238000",
                tx_size: "1265",
                time_stamp: 1609459800,
                full_count: 10,
            },
            {
                height: "1",
                tx_hash:
                    "0xf07bdd8d4285928d39debe21601368220b6132f0bf1e9a0e45f94407648b74534c1d27c421b978fdcadae058cb426039d69c5469409c6f3b29f1d79bfb808b4b",
                type: 0,
                amount: "609999999762000",
                tx_fee: "238000",
                tx_size: "1265",
                time_stamp: 1609459800,
                full_count: 10,
            },
            {
                height: "1",
                tx_hash:
                    "0x21df6397c1353dafac1092eef428b9cf27ee96baa143f5a111c587c46f887688c45b956b8cf2adf01285536c13b452c8c15bd82ec436b39b373c2987d7f1f3d9",
                type: 0,
                amount: "609999999762000",
                tx_fee: "238000",
                tx_size: "1265",
                time_stamp: 1609459800,
                full_count: 10,
            },
            {
                height: "1",
                tx_hash:
                    "0x622e862706aa4e2b3ff5df7fa63b4dec77e93f13f0650cede3f19705486815ea4e00f62f34abafc61f93bef17463924df0e81ca0ed154733f8790d2fe8adafd1",
                type: 0,
                amount: "609999999762000",
                tx_fee: "238000",
                tx_size: "1265",
                time_stamp: 1609459800,
                full_count: 10,
            },
            {
                height: "1",
                tx_hash:
                    "0x05f9fd77edc4cddd9c6573a275db1bef40372191a7a99eaa9afaaeedcc26ffd0071532c533193ad7abf7cfa3d646a711bdc1977cc331685864ef31e23dddcb1d",
                type: 0,
                amount: "609999999762000",
                tx_fee: "238000",
                tx_size: "1265",
                time_stamp: 1609459800,
                full_count: 10,
            },
            {
                height: "1",
                tx_hash:
                    "0x143a9feedb1b8cd8f2af4c0a508b742bc5fd6fdc2705e25a4d156cf8cb68688da8bc68de7118a8ba8919ab0009dbb02ad8fcbb3170c50674c7825d5ea14b2e05",
                type: 0,
                amount: "609999999762000",
                tx_fee: "238000",
                tx_size: "1265",
                time_stamp: 1609459800,
                full_count: 10,
            },
            {
                height: "1",
                tx_hash:
                    "0x70f8c2a080fd8c7afd8500a218939e44e91cab869069d40ebb0b0226c1b0617ac4df5a6da5c2ad99d19c7b53e63a8c44be3e906261280f718bb407d843f7b842",
                type: 0,
                amount: "609999999762000",
                tx_fee: "238000",
                tx_size: "1265",
                time_stamp: 1609459800,
                full_count: 10,
            },
            {
                height: "0",
                tx_hash:
                    "0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2d7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f",
                type: 1,
                amount: "120000000000000",
                tx_fee: "0",
                tx_size: "278",
                time_stamp: 1609459200,
                full_count: 10,
            },
            {
                height: "0",
                tx_hash:
                    "0x26866bb263593d024a92103646c48cf35a2b1bfcc49b087915b85db14a432b373569d56f576242354328a31bf0102a0a78cb806cf6e25d88d7981367833631b7",
                type: 0,
                amount: "4880000000000000",
                tx_fee: "0",
                tx_size: "368",
                time_stamp: 1609459200,
                full_count: 10,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /block-summary with block height", async () => {
        let uri = URI(host).port(port).directory("block-summary").addSearch("height", "1");

        let response = await client.get(uri.toString());
        let expected = {
            height: "1",
            total_transactions: 8,
            hash: "0x5e57db5e2c2effd180f831330ddf2ea2686817b4f14c8ee60700ecb5c4e9130ce5fe1b9785bc2b5cc6c5fd8c1682647b258419cafa637f07f0aa4e88c9a7de9f",
            prev_hash:
                "0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364eabbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99",
            merkle_root:
                "0x515a30d31fbd031d63f041b92184f32baf00d08e4120da9299bc336c6f980f2245b11e70bb1dcb7c2279ead9dab1c37b62dee8414083ae8346d166cf033cddfb",
            signature:
                "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            random_seed:
                "0x691775809b9498f45a2c5ef8b8d552e318ebaf0b1b2fb15dcc39e0ec962ae9812d7edffa5f053590a895c9ff72c1b0838ce8f5c709579d4529f9f4caf0fab13d",
            time: 1609459800,
            version: "v0.x.x",
            total_sent: 4880000000000000,
            total_received: 4879999998096000,
            total_reward: 0,
            total_fee: 1904000,
            total_size: 10120,
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /block-enrollments with block height", async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-enrollments")
            .addSearch("height", "0")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = [
            {
                height: "0",
                utxo: "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f",
                enroll_sig:
                    "0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422",
                commitment:
                    "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328",
                cycle_length: 20,
                full_count: 6,
            },
            {
                height: "0",
                utxo: "0x6fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673",
                enroll_sig:
                    "0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01",
                commitment:
                    "0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1",
                cycle_length: 20,
                full_count: 6,
            },
            {
                height: "0",
                utxo: "0x00bac393977fbd1e0edc70a34c7ca802dafe57f2b4a2aabf1adaac54892cb1cbae72cdeeb212904101382690d18d2d2c6ac99b83227ca73b307fde0807c4af03",
                enroll_sig:
                    "0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304",
                commitment:
                    "0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb",
                cycle_length: 20,
                full_count: 6,
            },
            {
                height: "0",
                utxo: "0xd935b5f1b616e6ec5c96502395e4b89683f526bdb8845f93a67bd329d44b1c2e5c185492e9610c0e3648609b3a9a5b21a35ee1a16f234c6415099803a97306ca",
                enroll_sig:
                    "0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634",
                commitment:
                    "0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc",
                cycle_length: 20,
                full_count: 6,
            },
            {
                height: "0",
                utxo: "0x7fa36630b0d4a6be729fcab6db70c9b603f2da4c28feaa754f178b5cedb0174a9647fe8c08cdbfd244c6a5d23a7fdf89f1990e002c5565e1babbdb53193e95bc",
                enroll_sig:
                    "0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31",
                commitment:
                    "0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4",
                cycle_length: 20,
                full_count: 6,
            },
            {
                height: "0",
                utxo: "0xe0ea82fd0ab9c57b068123927c002750181366f417c30a6ded05a23aca99c2c98b508bba9ba7c496eee36d78eeb7b71f330f81633372a712010036c4dc506b07",
                enroll_sig:
                    "0x0e0070e5951ef5be897cb593c4c57ce28b7529463f7e5644b1314ab7cc69fd625c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa74fe2",
                commitment:
                    "0xdd1b9c62d4c62246ea124e5422d5a2e23d3ca9accb0eba0e46cd46708a4e7b417f46df34dc2e3cba9a57b1dc35a66dfc2d5ef239ebeaaa00299232bc7e3b7bfa",
                cycle_length: 20,
                full_count: 6,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test of the path /block-enrollments with block hash", async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-enrollments")
            .addSearch(
                "hash",
                "0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364eabbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99"
            )
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = [
            {
                height: "0",
                utxo: "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f",
                enroll_sig:
                    "0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422",
                commitment:
                    "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328",
                cycle_length: 20,
                full_count: 6,
            },
            {
                height: "0",
                utxo: "0x6fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673",
                enroll_sig:
                    "0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01",
                commitment:
                    "0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1",
                cycle_length: 20,
                full_count: 6,
            },
            {
                height: "0",
                utxo: "0x00bac393977fbd1e0edc70a34c7ca802dafe57f2b4a2aabf1adaac54892cb1cbae72cdeeb212904101382690d18d2d2c6ac99b83227ca73b307fde0807c4af03",
                enroll_sig:
                    "0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304",
                commitment:
                    "0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb",
                cycle_length: 20,
                full_count: 6,
            },
            {
                height: "0",
                utxo: "0xd935b5f1b616e6ec5c96502395e4b89683f526bdb8845f93a67bd329d44b1c2e5c185492e9610c0e3648609b3a9a5b21a35ee1a16f234c6415099803a97306ca",
                enroll_sig:
                    "0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634",
                commitment:
                    "0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc",
                cycle_length: 20,
                full_count: 6,
            },
            {
                height: "0",
                utxo: "0x7fa36630b0d4a6be729fcab6db70c9b603f2da4c28feaa754f178b5cedb0174a9647fe8c08cdbfd244c6a5d23a7fdf89f1990e002c5565e1babbdb53193e95bc",
                enroll_sig:
                    "0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31",
                commitment:
                    "0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4",
                cycle_length: 20,
                full_count: 6,
            },
            {
                height: "0",
                utxo: "0xe0ea82fd0ab9c57b068123927c002750181366f417c30a6ded05a23aca99c2c98b508bba9ba7c496eee36d78eeb7b71f330f81633372a712010036c4dc506b07",
                enroll_sig:
                    "0x0e0070e5951ef5be897cb593c4c57ce28b7529463f7e5644b1314ab7cc69fd625c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa74fe2",
                commitment:
                    "0xdd1b9c62d4c62246ea124e5422d5a2e23d3ca9accb0eba0e46cd46708a4e7b417f46df34dc2e3cba9a57b1dc35a66dfc2d5ef239ebeaaa00299232bc7e3b7bfa",
                cycle_length: 20,
                full_count: 6,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test of the path /block-transactions with block height", async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-transactions")
            .addSearch("height", "0")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = [
            {
                height: "0",
                tx_hash:
                    "0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2d7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f",
                amount: "120000000000000",
                fee: 0,
                size: 278,
                time: 1609459200,
                sender_address: null,
                receiver: [
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t",
                    },
                ],
                full_count: 2,
            },
            {
                height: "0",
                tx_hash:
                    "0x26866bb263593d024a92103646c48cf35a2b1bfcc49b087915b85db14a432b373569d56f576242354328a31bf0102a0a78cb806cf6e25d88d7981367833631b7",
                amount: "4880000000000000",
                fee: 0,
                size: 368,
                time: 1609459200,
                sender_address: null,
                receiver: [
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                ],
                full_count: 2,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /block-transactions with block hash", async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-transactions")
            .addSearch(
                "hash",
                "0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364eabbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99"
            )
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = [
            {
                height: "0",
                tx_hash:
                    "0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2d7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f",
                amount: "120000000000000",
                fee: 0,
                size: 278,
                time: 1609459200,
                sender_address: null,
                receiver: [
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku",
                    },
                    {
                        type: 1,
                        amount: 20000000000000,
                        address: "boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t",
                    },
                ],
                full_count: 2,
            },
            {
                height: "0",
                tx_hash:
                    "0x26866bb263593d024a92103646c48cf35a2b1bfcc49b087915b85db14a432b373569d56f576242354328a31bf0102a0a78cb806cf6e25d88d7981367833631b7",
                amount: "4880000000000000",
                fee: 0,
                size: 368,
                time: 1609459200,
                sender_address: null,
                receiver: [
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                    {
                        type: 0,
                        amount: 610000000000000,
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    },
                ],
                full_count: 2,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /boa-stats", async () => {
        let uri = URI(host).port(port).directory("boa-stats");
        let response = await client.get(uri.toString());
        let expected = {
            height: 1,
            transactions: 10,
            validators: 6,
            frozen_coin: 5283595,
            circulating_supply: 5283535,
            active_validators: 155055,
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test for putCoinMarketStats method", async () => {
        let data: IMarketCap = await gecko_market.fetch();
        let response = await stoa_server.putCoinMarketStats(data);
        assert.deepStrictEqual(response.affectedRows, 1);
    });

    it("Test for /coinmarketcap", async () => {
        let uri = URI(host).port(port).directory("/coinmarketcap");
        let response = await client.get(uri.toString());
        let expected = {
            last_updated_at: 1622599176,
            price: "0.239252",
            market_cap: 72635724,
            vol_24h: 1835353,
            change_24h: -7,
        };
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test for /holders", async () => {
        let uri = URI(host).port(port).directory("/holders");
        let response = await client.get(uri.toString());

        let expected = [
            {
                address: "boa1xpfp00tr86d9zdgv3uy08qs0ld5s3wmx869yte68h3y4erteyn3wkq692jq",
                tx_count: 2,
                total_received: 48799999980960,
                total_sent: 0,
                total_reward: 0,
                total_frozen: 0,
                total_spendable: 48799999980960,
                total_balance: 48799999980960,
                percentage: 0,
                value: 0,
                full_count: 199,
            },
            {
                address: "boa1xpfq00t5f0uv8v0wzclvt72fl3x2vz4z48harsx5zdks6m5pecxey9vh4e8",
                tx_count: 2,
                total_received: 48799999980960,
                total_sent: 0,
                total_reward: 0,
                total_frozen: 0,
                total_spendable: 48799999980960,
                total_balance: 48799999980960,
                percentage: 0,
                value: 0,
                full_count: 199,
            },
            {
                address: "boa1xpfr005hadezanqmze3f99st3v4n8q3zu0lrzsc3t4mvcj7fnrn7sseah6p",
                tx_count: 2,
                total_received: 48799999980960,
                total_sent: 0,
                total_reward: 0,
                total_frozen: 0,
                total_spendable: 48799999980960,
                total_balance: 48799999980960,
                percentage: 0,
                value: 0,
                full_count: 199,
            },
            {
                address: "boa1xqfn00yp3myu4jt2se80flcksf9j2nta3t6yvhfh7gugzllkmzwfskczvk5",
                tx_count: 2,
                total_received: 48799999980960,
                total_sent: 0,
                total_reward: 0,
                total_frozen: 0,
                total_spendable: 48799999980960,
                total_balance: 48799999980960,
                percentage: 0,
                value: 0,
                full_count: 199,
            },
            {
                address: "boa1xqfs008pm8f73te5dsys46ewdk3ha5wzlfcz2d6atn2z4nayunp66aelwmr",
                tx_count: 2,
                total_received: 48799999980960,
                total_sent: 0,
                total_reward: 0,
                total_frozen: 0,
                total_spendable: 48799999980960,
                total_balance: 48799999980960,
                percentage: 0,
                value: 0,
                full_count: 199,
            },
            {
                address: "boa1xrft007petq803lnkk4820l8ya6xpshrl3tg9az8yghejm9t7mwgc8wtgrs",
                tx_count: 2,
                total_received: 48799999980960,
                total_sent: 0,
                total_reward: 0,
                total_frozen: 0,
                total_spendable: 48799999980960,
                total_balance: 48799999980960,
                percentage: 0,
                value: 0,
                full_count: 199,
            },
            {
                address: "boa1xzfu00gaqcea0j0n4jdmveve4hhwsa264tthyaqrtyx9pu0rrc3rsma3zdy",
                tx_count: 2,
                total_received: 48799999980960,
                total_sent: 0,
                total_reward: 0,
                total_frozen: 0,
                total_spendable: 48799999980960,
                total_balance: 48799999980960,
                percentage: 0,
                value: 0,
                full_count: 199,
            },
            {
                address: "boa1xzfv00s88ky9mf50nqngvztmnmtjzv4yr0w555aet366ssrv5zqaj6zsga3",
                tx_count: 2,
                total_received: 48799999980960,
                total_sent: 0,
                total_reward: 0,
                total_frozen: 0,
                total_spendable: 48799999980960,
                total_balance: 48799999980960,
                percentage: 0,
                value: 0,
                full_count: 199,
            },
            {
                address: "boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj",
                tx_count: 1,
                total_received: 24399999990480,
                total_sent: 0,
                total_reward: 0,
                total_frozen: 0,
                total_spendable: 24399999990480,
                total_balance: 24399999990480,
                percentage: 0,
                value: 0,
                full_count: 199,
            },
            {
                address: "boa1xparl00ghmujzcsrt8jacj06sdq002s3s4uljceqn98awvy4vsya5qmvqvu",
                tx_count: 1,
                total_received: 24399999990480,
                total_sent: 0,
                total_reward: 0,
                total_frozen: 0,
                total_spendable: 24399999990480,
                total_balance: 24399999990480,
                percentage: 0,
                value: 0,
                full_count: 199,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test for path /holder_balance_history", async () => {
        let uri = URI(host)
            .port(port)
            .directory("/holder_balance_history")
            .filename("boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67")
            .setSearch("date", "1609545600")
            .setSearch("filter", "H");
        let response = await client.get(uri.toString());
        let expected = [
            {
                address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                block_height: 1,
                granularity: "H",
                time_stamp: 1609459200,
                balance: 0,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test for /holder/:address", async () => {
        let uri = URI(host)
            .port(port)
            .directory("/holder")
            .filename("boa1xpfp00tr86d9zdgv3uy08qs0ld5s3wmx869yte68h3y4erteyn3wkq692jq");
        let response = await client.get(uri.toString());
        let expected = {
            address: "boa1xpfp00tr86d9zdgv3uy08qs0ld5s3wmx869yte68h3y4erteyn3wkq692jq",
            tx_count: 2,
            total_received: 48799999980960,
            total_sent: 0,
            total_reward: 0,
            total_spendable: 0,
            total_frozen: 0,
            total_balance: 48799999980960,
            percentage: 0,
            value: 0,
        };
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test for path /average_fee_chart/", async () => {
        let uri = URI(host)
            .port(port)
            .directory("/average_fee_chart")
            .setSearch("date", "1609459200")
            .setSearch("filter", "M");
        let response = await client.get(uri.toString());
        let expected = [
            {
                height: 1,
                granularity: "M",
                time_stamp: 1609459200,
                average_tx_fee: 188,
                total_tx_fee: 1904000,
                total_payload_fee: 0,
                total_fee: 1904000,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test for path /search by block hash", async () => {
        let uri = URI(host)
            .port(port)
            .directory("/search/hash/")
            .filename(
                "0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364eabbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99"
            );
        let response = await client.get(uri.toString());
        let expected = { block: 1, transaction: 0 };
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test for path /search by transaction hash", async () => {
        let uri = URI(host)
            .port(port)
            .directory("/search/hash/")
            .filename(
                "0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2d7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f"
            );
        let response = await client.get(uri.toString());
        let expected = { block: 0, transaction: 1 };
        assert.deepStrictEqual(response.data, expected);
    });
});
