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
    Transaction, TxType, TxInput, TxOutput, DataPayload, PublicKey, JSBI
} from 'boa-sdk-ts';
import {
    sample_data,
    sample_data2,
    sample_preImageInfo,
    sample_reEnroll_preImageInfo,
    market_cap_sample_data,
    TestAgora,
    TestStoa,
    TestClient,
    TestCoinGecko,
    delay,
    createBlock
} from './Utils';
import { CoinMarketService } from '../src/modules/service/CoinMaketService'
import * as assert from 'assert';
import URI from 'urijs';
import { URL } from 'url';
import { IDatabaseConfig } from '../src/modules/common/Config';
import { MockDBConfig } from "./TestConfig"
import { BOASodium } from 'boa-sodium-ts';
import { IMarketCap } from '../src/Types';

describe('Test of Stoa API Server', () => {
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    let testCoinGecko: TestCoinGecko;
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
    before('Start a fake TestCoinGecko', () => {
        return new Promise<void>(async (resolve, reject) => {
            testCoinGecko = new TestCoinGecko("7876", market_cap_sample_data, resolve);
        });
    });
    before('Start a fake TestCoinGecko', () => {
        coinMarketService = new CoinMarketService(testCoinGecko);
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
        await coinMarketService.stop();
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
        await testCoinGecko.stop();
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
                height: '1',
                hash: '0x1b272e34c3df561450a52cf9e2eab4b1dbff4d710cba755ad76e1b2a906645e0f2b6650e62369f3f56b04a51c82fb36d33c5ef88b59949d37a81ca614902ff8e',
                merkle_root: '0xc8f96bf274187b0b6fb73c5b609a3fff28bd1fe9e6b712aaa3d9f92351100d7ca718a6c85f5f020cdeb13753179432e710576627399a3235ae472e7fe56b27e6',
                signature: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                validators: '[252]',
                tx_count: '8',
                enrollment_count: '0',
                time_stamp: 1609459800
            },
            {
                height: '0',
                hash: '0x217f5b3f53a52c396c3418c0245c2435a90c53978564efac448e1162ec8647dde9e5c13263390f73f5d5b74e059b79b5286cf292f3121e6f1654ff452f9296f5',
                merkle_root: '0x8ac592615f23ee726577eb8c305c67558fd08f14120e0f23c2969a3b1d37089009159bd42c1d7af53d601b53ccbbad0ebaa54f36f4bc13d473790921ae3dc7fa',
                signature: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                validators: '[0]',
                tx_count: '2',
                enrollment_count: '6',
                time_stamp: 1609459200
            }
        ]
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
                height: '1',
                tx_hash: '0xa4ce8dd85f51340bdae780db580e21acacfc94eec3305d83275ff2ea2d5583d75b8c400e1807952e04f243c4ef80d821e2537a59f20e12857c910bc2e4028bf7',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '1166',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0x63f299f3af18e0f333f2dbfe4a13377fbc7d11e3fb9ba0b899b4acd7219ad4c47b56481fc59979b933b33240b36aa4c090bf0440bd18e7a2e6d5405caa885794',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '1166',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0xdcc5ba48d932f9681028f6aad42ac77ec2363a2279c0441aebbf419b32c81a445f2d4ffe5d1e72f86e7c3750b5ef56e1054ca84d8578ddaa88659b7bd829404e',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '1166',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0x9823f761a9f55d222861aa6702ad79cf76869552038dfe8ec601c34b3e8c600320febba7aaa44028681e6e039b18508c2d1daf999ef606d11d69f6494bd0ce88',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '1166',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0x21f88b970256eb38f347322b07fcfdfb03eb5ba10bda3a2c2d2eac3feeaf8f073d66e3802922385a883fa2fa1dc3e1e5535ef0024eb69f839d8af23c2fa0e7af',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '1166',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0x3d04887353ad6eed2b61f0be74972d078eb432c5d37555b7e87aefb15a04815e4b1bea6b78c566936cbfebf5b4a8d412804881570f87555e423c1b99919c609d',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '1166',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0xbc5d1308b9e2c0e32c6b6fbbbd8f955393fa190a81307d37d82e6bd4608621f8227da1c071b35edf42608c734a694946822c2d0dc6d7c8e2b697beb58888b9aa',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '1166',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0xabf0830cc549d3a1be744a8b484b69236b27e8bd4f7950b1edb8fb5bd9eff31fc58bc5a645ab3a81fbd48fddb38e4677539924036de415e1a96b9a440ed4fa3d',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '1166',
                time_stamp: 1609459800
            },
            {
                height: '0',
                tx_hash: '0xd7f9204afdc2d41b28a33504d21b3c5384758d851c573dde44da26d7a0c7de06fde6127ec740fbfdfafbed4fb13cff24144054b8ae2ab34582110f0f752316aa',
                type: 1,
                amount: '120000000000000',
                tx_fee: '0',
                tx_size: '255',
                time_stamp: 1609459200
            },
            {
                height: '0',
                tx_hash: '0xd4b2011f46b7de32e6a3f51eae35c97440b7adf427df7725d19575b8a9a8256552939656f8b5d4087b9bcbbe9219504e31f91a85fb1709683cbefc3962639ecd',
                type: 0,
                amount: '4880000000000000',
                tx_fee: '0',
                tx_size: '337',
                time_stamp: 1609459200
            }
        ]
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-summary with block height', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-summary")
            .addSearch("height", "1");

        let response = await client.get(uri.toString());
        let expected = {
            height: '1',
            total_transactions: 8,
            hash: '0x1b272e34c3df561450a52cf9e2eab4b1dbff4d710cba755ad76e1b2a906645e0f2b6650e62369f3f56b04a51c82fb36d33c5ef88b59949d37a81ca614902ff8e',
            prev_hash: '0x217f5b3f53a52c396c3418c0245c2435a90c53978564efac448e1162ec8647dde9e5c13263390f73f5d5b74e059b79b5286cf292f3121e6f1654ff452f9296f5',
            merkle_root: '0xc8f96bf274187b0b6fb73c5b609a3fff28bd1fe9e6b712aaa3d9f92351100d7ca718a6c85f5f020cdeb13753179432e710576627399a3235ae472e7fe56b27e6',
            signature: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
            random_seed: '0x691775809b9498f45a2c5ef8b8d552e318ebaf0b1b2fb15dcc39e0ec962ae9812d7edffa5f053590a895c9ff72c1b0838ce8f5c709579d4529f9f4caf0fab13d',
            time: 1609459800,
            version: 'v0.x.x',
            total_sent: 4880000000000000,
            total_recieved: 4880000000000000,
            total_reward: 0,
            total_fee: 0,
            total_size: 9328
        }
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
            enrollmentElementList: [
                {
                    height: '0',
                    utxo: '0xd68cfa6d0457b404d74a0367ace0bd3784110fb55d94692e0859f3b5a15b33f990f33e3b4e4b4030945ee0303fabf7b2702f48a31ffdc3d1d6985e3e3dfcc8d7',
                    enroll_sig: '0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422',
                    commitment: '0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x7f6e35961dbaae3cad2efa0582a6ff2c992973bdd987c41c6d4f4b0e1289158c98b2858b4731c36744ebf92edcb05b3f68838432479aaf1373d123e60ad3448b',
                    enroll_sig: '0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01',
                    commitment: '0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0xfbb850538245991a7156dc1713535717c530f851554c91de4b21091e88647cc0ee8c296da6fc40b283c048e3ed82cc46abe82cbd5061ba0ea579e1054ab51fcc',
                    enroll_sig: '0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304',
                    commitment: '0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x765025088610ec9e6ee82c6373306bfe3c15731234195b9c762859ee3becea85d85de44ca5fef6660bdea5add694e12658ea4060c0ac5c76757829147afcc582',
                    enroll_sig: '0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634',
                    commitment: '0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0xe9786bcd4188dbc27f3bcd9f3097355ad056d7518e8ea5a908adaba7229625a195d2073c512849e856ac7f8f7e0ee463e2e2be6373f3fa3f645640d2e1141151',
                    enroll_sig: '0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31',
                    commitment: '0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0xa551c7d3076f43857913fa1a7de694df9c1ea5606bc084caa4c7cd7868a74c9f80c303ce64324becfadf8e092781a6b5ea9c76ec81bc5f5fa18fd523b333a1a2',
                    enroll_sig: '0x0e0070e5951ef5be897cb593c4c57ce28b7529463f7e5644b1314ab7cc69fd625c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa74fe2',
                    commitment: '0xdd1b9c62d4c62246ea124e5422d5a2e23d3ca9accb0eba0e46cd46708a4e7b417f46df34dc2e3cba9a57b1dc35a66dfc2d5ef239ebeaaa00299232bc7e3b7bfa',
                    cycle_length: 20
                }
            ],
            total_data: 6
        }
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-enrollments with block hash', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-enrollments")
            .addSearch("hash", "0x217f5b3f53a52c396c3418c0245c2435a90c53978564efac448e1162ec8647dde9e5c13263390f73f5d5b74e059b79b5286cf292f3121e6f1654ff452f9296f5")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            enrollmentElementList: [
                {
                    height: '0',
                    utxo: '0xd68cfa6d0457b404d74a0367ace0bd3784110fb55d94692e0859f3b5a15b33f990f33e3b4e4b4030945ee0303fabf7b2702f48a31ffdc3d1d6985e3e3dfcc8d7',
                    enroll_sig: '0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422',
                    commitment: '0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x7f6e35961dbaae3cad2efa0582a6ff2c992973bdd987c41c6d4f4b0e1289158c98b2858b4731c36744ebf92edcb05b3f68838432479aaf1373d123e60ad3448b',
                    enroll_sig: '0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01',
                    commitment: '0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0xfbb850538245991a7156dc1713535717c530f851554c91de4b21091e88647cc0ee8c296da6fc40b283c048e3ed82cc46abe82cbd5061ba0ea579e1054ab51fcc',
                    enroll_sig: '0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304',
                    commitment: '0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x765025088610ec9e6ee82c6373306bfe3c15731234195b9c762859ee3becea85d85de44ca5fef6660bdea5add694e12658ea4060c0ac5c76757829147afcc582',
                    enroll_sig: '0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634',
                    commitment: '0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0xe9786bcd4188dbc27f3bcd9f3097355ad056d7518e8ea5a908adaba7229625a195d2073c512849e856ac7f8f7e0ee463e2e2be6373f3fa3f645640d2e1141151',
                    enroll_sig: '0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31',
                    commitment: '0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0xa551c7d3076f43857913fa1a7de694df9c1ea5606bc084caa4c7cd7868a74c9f80c303ce64324becfadf8e092781a6b5ea9c76ec81bc5f5fa18fd523b333a1a2',
                    enroll_sig: '0x0e0070e5951ef5be897cb593c4c57ce28b7529463f7e5644b1314ab7cc69fd625c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa74fe2',
                    commitment: '0xdd1b9c62d4c62246ea124e5422d5a2e23d3ca9accb0eba0e46cd46708a4e7b417f46df34dc2e3cba9a57b1dc35a66dfc2d5ef239ebeaaa00299232bc7e3b7bfa',
                    cycle_length: 20
                }
            ],
            total_data: 6
        }
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
            tx: [
                {
                    height: '0',
                    tx_hash: '0xd7f9204afdc2d41b28a33504d21b3c5384758d851c573dde44da26d7a0c7de06fde6127ec740fbfdfafbed4fb13cff24144054b8ae2ab34582110f0f752316aa',
                    amount: '120000000000000',
                    type: 1,
                    fee: 0,
                    size: 255,
                    time: 1609459200,
                    sender_address: null,
                    receiver: [
                        {
                            amount: 20000000000000,
                            address: 'boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t'
                        }
                    ]
                },
                {
                    height: '0',
                    tx_hash: '0xd4b2011f46b7de32e6a3f51eae35c97440b7adf427df7725d19575b8a9a8256552939656f8b5d4087b9bcbbe9219504e31f91a85fb1709683cbefc3962639ecd',
                    amount: '4880000000000000',
                    type: 0,
                    fee: 0,
                    size: 337,
                    time: 1609459200,
                    sender_address: null,
                    receiver: [
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        }
                    ]
                }
            ],
            total_data: 2
        }
        assert.deepStrictEqual(response.data, expected);
    });
    it('Test of the path /block-transactions with block hash', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block-transactions")
            .addSearch("hash", "0x217f5b3f53a52c396c3418c0245c2435a90c53978564efac448e1162ec8647dde9e5c13263390f73f5d5b74e059b79b5286cf292f3121e6f1654ff452f9296f5")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            tx: [
                {
                    height: '0',
                    tx_hash: '0xd7f9204afdc2d41b28a33504d21b3c5384758d851c573dde44da26d7a0c7de06fde6127ec740fbfdfafbed4fb13cff24144054b8ae2ab34582110f0f752316aa',
                    amount: '120000000000000',
                    type: 1,
                    fee: 0,
                    size: 255,
                    time: 1609459200,
                    sender_address: null,
                    receiver: [
                        {
                            amount: 20000000000000,
                            address: 'boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t'
                        }
                    ]
                },
                {
                    height: '0',
                    tx_hash: '0xd4b2011f46b7de32e6a3f51eae35c97440b7adf427df7725d19575b8a9a8256552939656f8b5d4087b9bcbbe9219504e31f91a85fb1709683cbefc3962639ecd',
                    amount: '4880000000000000',
                    type: 0,
                    fee: 0,
                    size: 337,
                    time: 1609459200,
                    sender_address: null,
                    receiver: [
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        },
                        {
                            amount: 610000000000000,
                            address: 'boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67'
                        }
                    ]
                }
            ],
            total_data: 2
        }
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
        let data: IMarketCap = await testCoinGecko.fetch();
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
