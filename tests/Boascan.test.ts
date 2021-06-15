/*******************************************************************************

    Test BOASCAN server

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    BitField, Block, BlockHeader, Enrollment, Height, Hash, Signature, SodiumHelper,
    Transaction, OutputType, TxInput, TxOutput, PublicKey, JSBI
} from 'boa-sdk-ts';
import {
    sample_data,
    sample_data2,
    sample_preImageInfo,
    sample_reEnroll_preImageInfo,
    market_cap_sample_data,
    market_cap_history_sample_data,
    TestAgora,
    TestStoa,
    TestClient,
    TestGeckoServer,
    delay,
    createBlock
} from './Utils';
import * as assert from 'assert';
import URI from 'urijs';
import { URL } from 'url';
import { IDatabaseConfig } from '../src/modules/common/Config';
import { MockDBConfig } from "./TestConfig"
import { BOASodium } from 'boa-sodium-ts';
import { IMarketCap } from '../src/Types';
import { CoinMarketService } from '../src/modules/service/CoinMarketService';
import { CoinGeckoMarket } from '../src/modules/coinmarket/CoinGeckoMarket';

describe('Test of Stoa API Server', () => {
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMarket;
    let coinMarketService: CoinMarketService;

    before('Wait for the package libsodium to finish loading', async () => {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before('Start a fake Agora', () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", sample_data, resolve);
        });
    });
    before('Start a fake TestCoinGeckoServer', () => {
        return new Promise<void>(async (resolve, reject) => {
            gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
            gecko_market = new CoinGeckoMarket(gecko_server);
        });
    });
    before('Start a fake TestCoinGecko', () => {
        coinMarketService = new CoinMarketService(gecko_market);
    });
    before('Create TestStoa', async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, new URL("http://127.0.0.1:2826"), port, coinMarketService);
        await stoa_server.createStorage();
    });

    before('Start TestStoa', async () => {
        await stoa_server.start();
    });

    after('Stop Stoa and Agora server instances', async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await gecko_server.stop();
        await agora_server.stop();
    });
    it('Test of the path /latest-blocks', async () => {
        let uri = URI(host)
            .port(port)
            .directory("/latest-blocks")
            .addSearch("page", "1")
            .addSearch("limit", "10");

        let response = await client.get(uri.toString());
        let expected = [
            {
                "height": "1",
                "hash": "0x8161cb00f6d95e4c42c8aa8d752a378ff2de671e4dfc1edba3b53704d8dd1241077c1df1c3c0bb8f63dc4f0645cd86ccb17d932cc7a796f9e1c221abafe8b0d7",
                "merkle_root": "0x2a8158ee049c459e32912f426b0f4ebaea9d017455efd3e20c27954f22066a10a4cb676254e9a011906ac8cb6855add4d314eb96d583d1a1828ff7f05d04ebd0",
                "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                "validators": "[252]",
                "tx_count": "8",
                "enrollment_count": "0",
                "time_stamp": 1609459800
            },
            {
                "height": "0",
                "hash": "0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364eabbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99",
                "merkle_root": "0x67218493be437c25dc5884abdc8ee40e61f0af79aa9af8ab9bd8b0632eaaca238b4c054f114b046da0d5911b1b205ba540d07c5dc01560beafe564e5f3d101c9",
                "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                "validators": "[0]",
                "tx_count": "2",
                "enrollment_count": "6",
                "time_stamp": 1609459200
            }
        ];
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /latest-transactions', async () => {
        let uri = URI(host)
            .port(port)
            .directory("/latest-transactions")
            .addSearch("page", "1")
            .addSearch("limit", "10");

        let response = await client.get(uri.toString());
        let expected = [
            {
                "height": "1",
                "tx_hash": "0x9e6d1b023eed4b4a7141c18b585e8aebc4955d5e279698e96086eca689daa8cebfef63deb816749445bf4a82af43958f44d90357488a5a3681fb6e3b4bc9789a",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0xd7cdd350d885c2f15a91b6b927de0e79d2cddecf4b8d02825978f026cecae23482252d8d04e57114aeb3fe5048fc1297d65824abe0696d9dc982153a64a4c6ac",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0x1abe5052d4870dc6c803688aa1219b8432f60e0a17637442133cc82491ff752b519f626064925639fdb4ce2de03a5d3b4dc82742bfb7659ef6f9838addf0a56e",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0x54356f02180daf134a324265f264130c56d29a77fea8c904a7e404dcee030ba234b15f92e33cea1aa1e15f4ba2eed0f215038f488637bd4b8055da3cabab6007",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0xee063a939506b1582680aecacc5c95f2f1bf0df3c4c5eb66ef3802113c8366010950013217d7dff9f66b64aadffa34553743123818b2ec551095c60b762ae823",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0x1a94390f4dac13b28c6a13c36a99aa02c4feb45bb7af3f18a047e1441fc2c8574d565bdb18ae05685877a6f32d8a12ee989e24a51bb84395c496b37b3cba0343",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0xd4db9e5325508acf34e91a856c5fd3c760ec3efd1e8621b7a3c79e34480e938580c28aec3ecff12d27b1d8f617dd48e3d8d99ac3ce20f5d8181a8107d1d3973b",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0x6b183cfad10adbb03092ef170b7105ec2af452c36185906d1ce1fbeddfaaa19ac50feda39bebf3caca8f501ec85e56432ce706506f18058d978d5b20ae2ec7e8",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "0",
                "tx_hash": "0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2d7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f",
                "amount": "120000000000000",
                "tx_fee": "0",
                "tx_size": "260",
                "time_stamp": 1609459200
            },
            {
                "height": "0",
                "tx_hash": "0x26866bb263593d024a92103646c48cf35a2b1bfcc49b087915b85db14a432b373569d56f576242354328a31bf0102a0a78cb806cf6e25d88d7981367833631b7",
                "amount": "4880000000000000",
                "tx_fee": "0",
                "tx_size": "344",
                "time_stamp": 1609459200
            }
        ];
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-summary with block height', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-summary")
            .addSearch("height", "1");

        let response = await client.get(uri.toString());
        let expected = {
            "height": "1",
            "total_transactions": 8,
            "hash": "0x8161cb00f6d95e4c42c8aa8d752a378ff2de671e4dfc1edba3b53704d8dd1241077c1df1c3c0bb8f63dc4f0645cd86ccb17d932cc7a796f9e1c221abafe8b0d7",
            "prev_hash": "0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364eabbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99",
            "merkle_root": "0x2a8158ee049c459e32912f426b0f4ebaea9d017455efd3e20c27954f22066a10a4cb676254e9a011906ac8cb6855add4d314eb96d583d1a1828ff7f05d04ebd0",
            "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "random_seed": "0x691775809b9498f45a2c5ef8b8d552e318ebaf0b1b2fb15dcc39e0ec962ae9812d7edffa5f053590a895c9ff72c1b0838ce8f5c709579d4529f9f4caf0fab13d",
            "time": 1609459800,
            "version": "v0.x.x",
            "total_sent": 4880000000000000,
            "total_received": 4880000000000000,
            "total_reward": 0,
            "total_fee": 0,
            "total_size": 9520
        };
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-enrollments with block height', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-enrollments")
            .addSearch("height", "0")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            "enrollmentElementList": [
                {
                    "height": "0",
                    "utxo": "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f",
                    "enroll_sig": "0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422",
                    "commitment": "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0x6fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673",
                    "enroll_sig": "0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01",
                    "commitment": "0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0x00bac393977fbd1e0edc70a34c7ca802dafe57f2b4a2aabf1adaac54892cb1cbae72cdeeb212904101382690d18d2d2c6ac99b83227ca73b307fde0807c4af03",
                    "enroll_sig": "0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304",
                    "commitment": "0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0xd935b5f1b616e6ec5c96502395e4b89683f526bdb8845f93a67bd329d44b1c2e5c185492e9610c0e3648609b3a9a5b21a35ee1a16f234c6415099803a97306ca",
                    "enroll_sig": "0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634",
                    "commitment": "0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0x7fa36630b0d4a6be729fcab6db70c9b603f2da4c28feaa754f178b5cedb0174a9647fe8c08cdbfd244c6a5d23a7fdf89f1990e002c5565e1babbdb53193e95bc",
                    "enroll_sig": "0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31",
                    "commitment": "0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0xe0ea82fd0ab9c57b068123927c002750181366f417c30a6ded05a23aca99c2c98b508bba9ba7c496eee36d78eeb7b71f330f81633372a712010036c4dc506b07",
                    "enroll_sig": "0x0e0070e5951ef5be897cb593c4c57ce28b7529463f7e5644b1314ab7cc69fd625c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa74fe2",
                    "commitment": "0xdd1b9c62d4c62246ea124e5422d5a2e23d3ca9accb0eba0e46cd46708a4e7b417f46df34dc2e3cba9a57b1dc35a66dfc2d5ef239ebeaaa00299232bc7e3b7bfa",
                    "cycle_length": 20
                }
            ],
            "total_data": 6
        };
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-enrollments with block hash', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-enrollments")
            .addSearch("hash", "0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364eabbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            "enrollmentElementList": [
                {
                    "height": "0",
                    "utxo": "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f",
                    "enroll_sig": "0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422",
                    "commitment": "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0x6fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673",
                    "enroll_sig": "0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01",
                    "commitment": "0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0x00bac393977fbd1e0edc70a34c7ca802dafe57f2b4a2aabf1adaac54892cb1cbae72cdeeb212904101382690d18d2d2c6ac99b83227ca73b307fde0807c4af03",
                    "enroll_sig": "0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304",
                    "commitment": "0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0xd935b5f1b616e6ec5c96502395e4b89683f526bdb8845f93a67bd329d44b1c2e5c185492e9610c0e3648609b3a9a5b21a35ee1a16f234c6415099803a97306ca",
                    "enroll_sig": "0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634",
                    "commitment": "0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0x7fa36630b0d4a6be729fcab6db70c9b603f2da4c28feaa754f178b5cedb0174a9647fe8c08cdbfd244c6a5d23a7fdf89f1990e002c5565e1babbdb53193e95bc",
                    "enroll_sig": "0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31",
                    "commitment": "0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0xe0ea82fd0ab9c57b068123927c002750181366f417c30a6ded05a23aca99c2c98b508bba9ba7c496eee36d78eeb7b71f330f81633372a712010036c4dc506b07",
                    "enroll_sig": "0x0e0070e5951ef5be897cb593c4c57ce28b7529463f7e5644b1314ab7cc69fd625c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa74fe2",
                    "commitment": "0xdd1b9c62d4c62246ea124e5422d5a2e23d3ca9accb0eba0e46cd46708a4e7b417f46df34dc2e3cba9a57b1dc35a66dfc2d5ef239ebeaaa00299232bc7e3b7bfa",
                    "cycle_length": 20
                }
            ],
            "total_data": 6
        };
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-transactions with block height', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-transactions")
            .addSearch("height", "0")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            "tx": [
                {
                    "height": "0",
                    "tx_hash": "0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2d7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f",
                    "amount": "120000000000000",
                    "fee": 0,
                    "size": 260,
                    "time": 1609459200,
                    "sender_address": null,
                    "receiver": [
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn"
                        },
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq"
                        },
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq"
                        },
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308"
                        },
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku"
                        },
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t"
                        }
                    ]
                },
                {
                    "height": "0",
                    "tx_hash": "0x26866bb263593d024a92103646c48cf35a2b1bfcc49b087915b85db14a432b373569d56f576242354328a31bf0102a0a78cb806cf6e25d88d7981367833631b7",
                    "amount": "4880000000000000",
                    "fee": 0,
                    "size": 344,
                    "time": 1609459200,
                    "sender_address": null,
                    "receiver": [
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        }
                    ]
                }
            ],
            "total_data": 2
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it('Test of the path /block-transactions with block hash', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-transactions")
            .addSearch("hash", "0xfca7a6455549ff1886969228b12dc5db03c67470145ed3e8e318f0c356a364eabbf1eeefc06232cfa7f3cdf3017521ee54b2b4542241650781022552ddc3dc99")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            "tx": [
                {
                    "height": "0",
                    "tx_hash": "0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2d7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f",
                    "amount": "120000000000000",
                    "fee": 0,
                    "size": 260,
                    "time": 1609459200,
                    "sender_address": null,
                    "receiver": [
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn"
                        },
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq"
                        },
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq"
                        },
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308"
                        },
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku"
                        },
                        {
                            "type": 1,
                            "amount": 20000000000000,
                            "address": "boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t"
                        }
                    ]
                },
                {
                    "height": "0",
                    "tx_hash": "0x26866bb263593d024a92103646c48cf35a2b1bfcc49b087915b85db14a432b373569d56f576242354328a31bf0102a0a78cb806cf6e25d88d7981367833631b7",
                    "amount": "4880000000000000",
                    "fee": 0,
                    "size": 344,
                    "time": 1609459200,
                    "sender_address": null,
                    "receiver": [
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        },
                        {
                            "type": 0,
                            "amount": 610000000000000,
                            "address": "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
                        }
                    ]
                }
            ],
            "total_data": 2
        };
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /boa-stats', async () => {
        let uri = URI(host)
            .port(port)
            .directory("boa-stats");
        let response = await client.get(uri.toString());
        let expected = {
            height: 1,
            transactions: 10,
            validators: 6,
            frozen_coin: 5283595,
            circulating_supply: 5283535,
            active_validators: 155055
        }
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test for putCoinMarketStats method', async () => {
        let data: IMarketCap = await gecko_market.fetch();
        let response = await stoa_server.putCoinMarketStats(data);
        assert.deepStrictEqual(response.affectedRows, 1)
    });
    it('Test for /coinmarketcap', async () => {
        let uri = URI(host)
            .port(port)
            .directory("/coinmarketcap");
        let response = await client.get(uri.toString());
        let expected = {
            last_updated_at: 1622599176,
            price: "0.239252",
            market_cap: 72635724,
            vol_24h: 1835353,
            change_24h: -7
        }
        assert.deepStrictEqual(response.data, expected)
    });
    it('Test for /holders', async () => {
        let uri = URI(host)
            .port(port)
            .directory("/holders");
        let response = await client.get(uri.toString());
        let expected = [
            {
                address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67',
                tx_count: 1,
                total_received: 4880000000000000,
                total_sent: 39040000000000000,
                total_reward: 0,
                total_freeze: 0,
                total_spendable: 4270000000000000,
                total_balance: 4270000000000000
            },
            {
                address: 'boa1xrft007petq803lnkk4820l8ya6xpshrl3tg9az8yghejm9t7mwgc8wtgrs',
                tx_count: 2,
                total_received: 48800000000000,
                total_sent: 0,
                total_reward: 0,
                total_freeze: 0,
                total_spendable: 48800000000000,
                total_balance: 48800000000000
            },
            {
                address: 'boa1xzfv00s88ky9mf50nqngvztmnmtjzv4yr0w555aet366ssrv5zqaj6zsga3',
                tx_count: 2,
                total_received: 48800000000000,
                total_sent: 0,
                total_reward: 0,
                total_freeze: 0,
                total_spendable: 48800000000000,
                total_balance: 48800000000000
            },
            {
                address: 'boa1xzfu00gaqcea0j0n4jdmveve4hhwsa264tthyaqrtyx9pu0rrc3rsma3zdy',
                tx_count: 2,
                total_received: 48800000000000,
                total_sent: 0,
                total_reward: 0,
                total_freeze: 0,
                total_spendable: 48800000000000,
                total_balance: 48800000000000
            },
            {
                address: 'boa1xpfr005hadezanqmze3f99st3v4n8q3zu0lrzsc3t4mvcj7fnrn7sseah6p',
                tx_count: 2,
                total_received: 48800000000000,
                total_sent: 0,
                total_reward: 0,
                total_freeze: 0,
                total_spendable: 48800000000000,
                total_balance: 48800000000000
            },
            {
                address: 'boa1xpfq00t5f0uv8v0wzclvt72fl3x2vz4z48harsx5zdks6m5pecxey9vh4e8',
                tx_count: 2,
                total_received: 48800000000000,
                total_sent: 0,
                total_reward: 0,
                total_freeze: 0,
                total_spendable: 48800000000000,
                total_balance: 48800000000000
            },
            {
                address: 'boa1xpfp00tr86d9zdgv3uy08qs0ld5s3wmx869yte68h3y4erteyn3wkq692jq',
                tx_count: 2,
                total_received: 48800000000000,
                total_sent: 0,
                total_reward: 0,
                total_freeze: 0,
                total_spendable: 48800000000000,
                total_balance: 48800000000000
            },
            {
                address: 'boa1xqfs008pm8f73te5dsys46ewdk3ha5wzlfcz2d6atn2z4nayunp66aelwmr',
                tx_count: 2,
                total_received: 48800000000000,
                total_sent: 0,
                total_reward: 0,
                total_freeze: 0,
                total_spendable: 48800000000000,
                total_balance: 48800000000000
            },
            {
                address: 'boa1xqfn00yp3myu4jt2se80flcksf9j2nta3t6yvhfh7gugzllkmzwfskczvk5',
                tx_count: 2,
                total_received: 48800000000000,
                total_sent: 0,
                total_reward: 0,
                total_freeze: 0,
                total_spendable: 48800000000000,
                total_balance: 48800000000000
            },
            {
                address: 'boa1xrqs3669txkt796p8uqgwkjfxc4sv98sm2dr4cl2mlq6ku3pk5y2u5dd55c',
                tx_count: 1,
                total_received: 24400000000000,
                total_sent: 0,
                total_reward: 0,
                total_freeze: 0,
                total_spendable: 24400000000000,
                total_balance: 24400000000000
            }
        ]
        assert.deepStrictEqual(response.data, expected)
    });
});
