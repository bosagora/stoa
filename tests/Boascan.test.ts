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
import { CoinMarketService } from '../src/modules/service/CoinMaketService';
import { CoinGeckoMaket } from '../src/modules/coinmarket/CoinGeckoMaket';

describe('Test of Stoa API Server', () => {
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMaket;
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
            gecko_market = new CoinGeckoMaket(gecko_server);
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
                "hash": "0x04348b962dac4423cd9ae48b4932ee1607fb1101a690d2583bbad909e8c3f22b12a6d65d1e1494d38681afc7bea61c3d81251800b8adbf1d31f52889df6d7e09",
                "merkle_root": "0xa82a2d19ae115b521f0d65690e78f66260f5886da76508b72eee62a45cb8cfb5a7b8e300e0042faeb7b28fffc050cceb6c00ef4a326d992ef182969b1857f3d0",
                "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                "validators": "[252]",
                "tx_count": "8",
                "enrollment_count": "0",
                "time_stamp": 1609459800
            },
            {
                "height": "0",
                "hash": "0xba54155d042d03a722dc9234f7de5b304e9efbc896091e28fb3b19b908ee782653b5e6ef44566e19c728ff0eebf65ede6cc485337d5a473b819e86eeb2f7baf8",
                "merkle_root": "0x4cadc4d240a26ebf8a01ae1c53a4793fec40c92d36d9f8755311420c9594a9fbb827fb974b75774723acbd13b4d0589e957bf8f14da24633be6ae299446ddca7",
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
                "tx_hash": "0xdd75be9a8b2778deb99734dfb17f70c3635afff654342cc1c306ba0fc69eb72494c9e3c4543eaa6974757204ff19a521989b6ab4c6d41de535b8e634faf66183",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0x7989e23b6797d654499784cf70a97990b399948c7ed66663f6df31ea279c9200f770e39e72be7670b4daef64f6468b78891c29dad30c4c0a02d0b874ace16a23",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0xd9ccb48a1d1009c4cca92ce3658fd622ccb8892fb455d4b332826263a47beb8165be34ece8c885d90fcf0f678f391584a602302a8115744c1026bd55c8f9aadb",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0x44707116a8fd9422048ab3164d9daa8577059fb98ae50c8ae20d64f0d126a02b244d08348d2ef1600f107687eb9d6792bc725773576fed16c60ea21d483636e1",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0xab31502552c985ac93c598274f11398f0543d41a66e8ae4371a1f026fd5db74dba68dc28cb90e34311facf73efde7857f3e484205224e71ff1dde63ad1c3cf5a",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0x067d37b7f625baccc66186f0426fa7eb61b1657e6bf520b7bfeab0b4759a282c7604a4eac5509ba78e2a71224983237da2c75657a38a22c5f42419fd3ba2eb2b",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0x0054d7d59d02f6c0d29c66d719324f62146f235bf840cfc2d7a9231cb60cddf85c1f3ab70cbf6bf8d9013f744f8c3998e0e39ba953420e98b42bfd5d014ba102",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "1",
                "tx_hash": "0x59595807eb5da775fe50fe0636f22aef76b0e8b33edf8a5ef8999127b350908d4fa6b0865c10b948b2cc802efa536ca344927a3f190c321972bb943c56838f29",
                "amount": "610000000000000",
                "tx_fee": "0",
                "tx_size": "1190",
                "time_stamp": 1609459800
            },
            {
                "height": "0",
                "tx_hash": "0xff66ffde4ed3b91c5bce28907dd68f7ecabe776c1dc7d797e5f69fc349d28342348c778cd42c49ef2c29199f374289d44f5b4d2d149f0b8081a1077eca30f7ce",
                "amount": "120000000000000",
                "tx_fee": "0",
                "tx_size": "260",
                "time_stamp": 1609459200
            },
            {
                "height": "0",
                "tx_hash": "0x9384e68e59382a256d2598251758d3c44f6b48f9a6aa405272e7b5f536dc0f2d3b3fd76b9352ddbf199a4862b05e4300a484ebd3e591abd1df596854debb4d5e",
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
            "hash": "0x04348b962dac4423cd9ae48b4932ee1607fb1101a690d2583bbad909e8c3f22b12a6d65d1e1494d38681afc7bea61c3d81251800b8adbf1d31f52889df6d7e09",
            "prev_hash": "0xba54155d042d03a722dc9234f7de5b304e9efbc896091e28fb3b19b908ee782653b5e6ef44566e19c728ff0eebf65ede6cc485337d5a473b819e86eeb2f7baf8",
            "merkle_root": "0xa82a2d19ae115b521f0d65690e78f66260f5886da76508b72eee62a45cb8cfb5a7b8e300e0042faeb7b28fffc050cceb6c00ef4a326d992ef182969b1857f3d0",
            "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "random_seed": "0x691775809b9498f45a2c5ef8b8d552e318ebaf0b1b2fb15dcc39e0ec962ae9812d7edffa5f053590a895c9ff72c1b0838ce8f5c709579d4529f9f4caf0fab13d",
            "time": 1609459800,
            "version": "v0.x.x",
            "total_sent": 4880000000000000,
            "total_recieved": 4880000000000000,
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
                    "utxo": "0xf8751862d61a28fb878cd4b583ceaf39a59a5f2ff1fa78a169e56811c33b5c3eed80f83074cfb98ab5095ed563ebc6a96320ef59080628c4961f586dbf2e7d2f",
                    "enroll_sig": "0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422",
                    "commitment": "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0x896240cd0ef51fdfdff645bb146737f889b70a7d72f9ebb842f9a0c4705de884209c451ccdc15aace878d12dac85f0b5522bf2642204937c5e44944741a1928f",
                    "enroll_sig": "0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01",
                    "commitment": "0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0xcbb19dfc2c28ea46ffbf962ca4bcb1a11ab6ccc8d83c9357a1d931915b0b8257cbe131e9bda51bed9668972079cf9f0d9ba0fefa01cbdd94aa05a90eb210d4bb",
                    "enroll_sig": "0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304",
                    "commitment": "0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0xd08bc4c4a5f3341369f6c628e1cb9f3339ad1376b642f8bd95603a2fad6be0db81fa4fa58dadb5dc8f3bc7a020ad1fe8d2d6643238ea2508a37ee58b0df9e9f8",
                    "enroll_sig": "0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634",
                    "commitment": "0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0x6c87312f75478d515c5dc2bc8beb3ac5686aacbdedc8219baaf9cb62e41b1b31f00233321b3c42f9966ee47916123191f49caf0dc761d3a7fcd69198aa63f2aa",
                    "enroll_sig": "0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31",
                    "commitment": "0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0xda34f8f20fc231d4c3fe7f0190d5980c748dc82cc213ee7eb60d5c3f21c156b2a8b2113cfb48b3a02c049245e8682ff1da55b59b35abdd3832418675ccf2e29f",
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
            .addSearch("hash", "0xba54155d042d03a722dc9234f7de5b304e9efbc896091e28fb3b19b908ee782653b5e6ef44566e19c728ff0eebf65ede6cc485337d5a473b819e86eeb2f7baf8")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            "enrollmentElementList": [
                {
                    "height": "0",
                    "utxo": "0xf8751862d61a28fb878cd4b583ceaf39a59a5f2ff1fa78a169e56811c33b5c3eed80f83074cfb98ab5095ed563ebc6a96320ef59080628c4961f586dbf2e7d2f",
                    "enroll_sig": "0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422",
                    "commitment": "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0x896240cd0ef51fdfdff645bb146737f889b70a7d72f9ebb842f9a0c4705de884209c451ccdc15aace878d12dac85f0b5522bf2642204937c5e44944741a1928f",
                    "enroll_sig": "0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01",
                    "commitment": "0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0xcbb19dfc2c28ea46ffbf962ca4bcb1a11ab6ccc8d83c9357a1d931915b0b8257cbe131e9bda51bed9668972079cf9f0d9ba0fefa01cbdd94aa05a90eb210d4bb",
                    "enroll_sig": "0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304",
                    "commitment": "0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0xd08bc4c4a5f3341369f6c628e1cb9f3339ad1376b642f8bd95603a2fad6be0db81fa4fa58dadb5dc8f3bc7a020ad1fe8d2d6643238ea2508a37ee58b0df9e9f8",
                    "enroll_sig": "0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634",
                    "commitment": "0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0x6c87312f75478d515c5dc2bc8beb3ac5686aacbdedc8219baaf9cb62e41b1b31f00233321b3c42f9966ee47916123191f49caf0dc761d3a7fcd69198aa63f2aa",
                    "enroll_sig": "0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31",
                    "commitment": "0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4",
                    "cycle_length": 20
                },
                {
                    "height": "0",
                    "utxo": "0xda34f8f20fc231d4c3fe7f0190d5980c748dc82cc213ee7eb60d5c3f21c156b2a8b2113cfb48b3a02c049245e8682ff1da55b59b35abdd3832418675ccf2e29f",
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
                    "tx_hash": "0xff66ffde4ed3b91c5bce28907dd68f7ecabe776c1dc7d797e5f69fc349d28342348c778cd42c49ef2c29199f374289d44f5b4d2d149f0b8081a1077eca30f7ce",
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
                    "tx_hash": "0x9384e68e59382a256d2598251758d3c44f6b48f9a6aa405272e7b5f536dc0f2d3b3fd76b9352ddbf199a4862b05e4300a484ebd3e591abd1df596854debb4d5e",
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
            .addSearch("hash", "0xba54155d042d03a722dc9234f7de5b304e9efbc896091e28fb3b19b908ee782653b5e6ef44566e19c728ff0eebf65ede6cc485337d5a473b819e86eeb2f7baf8")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            "tx": [
                {
                    "height": "0",
                    "tx_hash": "0xff66ffde4ed3b91c5bce28907dd68f7ecabe776c1dc7d797e5f69fc349d28342348c778cd42c49ef2c29199f374289d44f5b4d2d149f0b8081a1077eca30f7ce",
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
                    "tx_hash": "0x9384e68e59382a256d2598251758d3c44f6b48f9a6aa405272e7b5f536dc0f2d3b3fd76b9352ddbf199a4862b05e4300a484ebd3e591abd1df596854debb4d5e",
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
            price: 0,
            market_cap: 72635724,
            vol_24h: 1835353,
            change_24h: -7
        }
        assert.deepStrictEqual(response.data, expected)
    });
});
