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
                hash: '0xe0609c900848dffd7bbf7112301b4a3ce47fc9ea4810bb7ce6d4ad4d9f0f0ad18c324b822127f3564f33efee8228662e02755ea49452f6a5832447e5cf495a8f',
                merkle_root: '0x928f5789a97f75dff9aa070cb761d2ae70c6566556739509b495c2d7b899181119d31f37160212f7ea38358eb671520595178a8aad17f12e00f4119d0b662888',
                signature: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                validators: '[252]',
                tx_count: '8',
                enrollment_count: '0',
                time_stamp: 1609459800
            },
            {
                height: '0',
                hash: '0x8ea91eafb2555f93ce0b0335d8454cdd052646dd1ef4a9029f026d08cdd081b9fb3e736903a119cce4beec1814b05c29b70243e0d1bbc096cf99c90b93f0b9a2',
                merkle_root: '0x94747147a0ca093d1099d1b2e0d9e2de9d89e0b887a56ffafb17f473cd0317de36ab7ecd2bdc1148d542bce9501aa1b978c722822a281e45034088286700059e',
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
                tx_hash: '0x74c2caf013ffd47440c46536403c1116dbf5276ee736a82db7e2cd9a5b827f7f24dca30951983e0aba92b8d5b813254b447616d2d060845fa0eca3d6b46a09b2',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '0',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0x59336788adcb9eb8c7bfbbd40162a74bef6972d1bcd3fdb8f8eb7f464ff11094c3000c08e8da33595482ff4223167f079ce96c8f849ee640f5eb556ab5406839',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '0',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0x5001ae8900de1a2b54aab1b5fd8529129b20f51db188016d7429168b08ca6b48ca450cd82f4a3643f6a97d06ddd0671d5c533f3a2a40cea6a516290d0775bf1a',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '0',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0xc0060e586a5f3b076e590086c3f9c144667852cb86cd2b30135e44aacfa4deb7235fdd860780600fb3dfbd3228c0fad2b4bbe933b5a44205ca13ed340d4e6679',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '0',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0x20fcd96646d8cc15a55d74848d57467985d85b2ca1bf3838d9b92466fd76513025f2857e3ad79b3e365e7170a890cebb7a9bff85ec8ed0ea17bd441ac71edd14',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '0',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0x06c2e8b1098afe7dc264703fd72ae86c6dc109123491a69b1799166a95fcc9b8795d80e84778cd3d81964467798b8d6a3c1ff54d42c3f8b415e05f39a645b9e4',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '0',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0xb540ef8398c16cf67fc9c5e025348c6f7153f9bd726b36a74f0fc64a2850a77888ec4c2ded5da62ef2ac4b2f0434baa4e5aee326b3d033c454b60cb45991bf27',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '0',
                time_stamp: 1609459800
            },
            {
                height: '1',
                tx_hash: '0xce81424e787d931807cf3723e164b21ad56bd848ee7b24cf5415ed58c450c5477d76aba3fa789f36f488e12612b2fe3912c17adfd4bc17f1c3042a64a018f76d',
                type: 0,
                amount: '610000000000000',
                tx_fee: '0',
                tx_size: '0',
                time_stamp: 1609459800
            },
            {
                height: '0',
                tx_hash: '0xd37793e642273aeccbcbfc6be8e19a6007c5147e1116123e44a5e42e4be11495561e535484a2922120c556161f7ae55433bd124bedbf935f3f5b9a414b7af34e',
                type: 1,
                amount: '120000000000000',
                tx_fee: '0',
                tx_size: '0',
                time_stamp: 1609459200
            },
            {
                height: '0',
                tx_hash: '0xd4b2011f46b7de32e6a3f51eae35c97440b7adf427df7725d19575b8a9a8256552939656f8b5d4087b9bcbbe9219504e31f91a85fb1709683cbefc3962639ecd',
                type: 0,
                amount: '4880000000000000',
                tx_fee: '0',
                tx_size: '0',
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
            hash: '0xe0609c900848dffd7bbf7112301b4a3ce47fc9ea4810bb7ce6d4ad4d9f0f0ad18c324b822127f3564f33efee8228662e02755ea49452f6a5832447e5cf495a8f',
            prev_hash: '0x8ea91eafb2555f93ce0b0335d8454cdd052646dd1ef4a9029f026d08cdd081b9fb3e736903a119cce4beec1814b05c29b70243e0d1bbc096cf99c90b93f0b9a2',
            merkle_root: '0x928f5789a97f75dff9aa070cb761d2ae70c6566556739509b495c2d7b899181119d31f37160212f7ea38358eb671520595178a8aad17f12e00f4119d0b662888',
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
                    utxo: '0x2f8b231aa4fd35c6a5c68a97fed32120da48cf6d40ccffc93d8dc41a3016eb56434b2c44144a38efe459f98ddc2660b168f1c92a48fe65711173385fb4a269e1',
                    enroll_sig: '0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422',
                    commitment: '0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x47a38b066ca55ef3e855b0c741ebd301b3fa38a86f9ed3507ab08794f24eddbd279eeb5bddde331cdaaf44401fcedb0f2f23d117607864c43bdb0cf587df13d7',
                    enroll_sig: '0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01',
                    commitment: '0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x53b6a6da4ee9cd2bc803ccfe06db19b8e557f68ff23d05ea691ebabcd50f10c30cb658f8c0e72141263377d00d481a9b514b92c07aacf80e8642881cffdd5381',
                    enroll_sig: '0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304',
                    commitment: '0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x1f855b74bc623e9767e228362a7517c30d123bbeeae98d85fa933e5d24762f3040a220e327f023b23c562e36f673e9fa972e846efd6326dcafb9784b94937dbe',
                    enroll_sig: '0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634',
                    commitment: '0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x096b57f1c92133073e432102d24b00148f5874fbb63f7fff216d832cb3cbed2b26d8017ba878c9d191bc2934ad742fd7830fe90a42c12faba550de4c25f77e64',
                    enroll_sig: '0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31',
                    commitment: '0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0xb25467a2a15176ae3d293051e01d1e402036a9fbbbbea0d49878ccf4244bd8546c2d42622309efccf884901e3e27b12f4fef3fb2a8f81317d7e375a0f648c2ad',
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
            .addSearch("hash", "0x8ea91eafb2555f93ce0b0335d8454cdd052646dd1ef4a9029f026d08cdd081b9fb3e736903a119cce4beec1814b05c29b70243e0d1bbc096cf99c90b93f0b9a2")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            enrollmentElementList: [
                {
                    height: '0',
                    utxo: '0x2f8b231aa4fd35c6a5c68a97fed32120da48cf6d40ccffc93d8dc41a3016eb56434b2c44144a38efe459f98ddc2660b168f1c92a48fe65711173385fb4a269e1',
                    enroll_sig: '0x0cab27862571d2d2e33d6480e1eab4c82195a508b72672d609610d01f23b0beedc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422',
                    commitment: '0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x47a38b066ca55ef3e855b0c741ebd301b3fa38a86f9ed3507ab08794f24eddbd279eeb5bddde331cdaaf44401fcedb0f2f23d117607864c43bdb0cf587df13d7',
                    enroll_sig: '0x0ed498b867c33d316b468d817ba8238aec68541abd912cecc499f8e780a8cdaf2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01',
                    commitment: '0xd0348a88f9b7456228e4df5689a57438766f4774d760776ec450605c82348c461db84587c2c9b01c67c8ed17f297ee4008424ad3e0e5039179719d7e9df297c1',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x53b6a6da4ee9cd2bc803ccfe06db19b8e557f68ff23d05ea691ebabcd50f10c30cb658f8c0e72141263377d00d481a9b514b92c07aacf80e8642881cffdd5381',
                    enroll_sig: '0x09474f489579c930dbac46f638f3202ac24407f1fa419c1d95be38ab474da29d7e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304',
                    commitment: '0xaf43c67d9dd0f53de3eaede63cdcda8643422d62205df0b5af65706ec28b372adb785ce681d559d7a7137a4494ccbab4658ce11ec75a8ec84be5b73590bffceb',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x1f855b74bc623e9767e228362a7517c30d123bbeeae98d85fa933e5d24762f3040a220e327f023b23c562e36f673e9fa972e846efd6326dcafb9784b94937dbe',
                    enroll_sig: '0x0e4566eca30feb9ad47a65e7ff7e7ce1a7555ccedcf61e1143c2e5fddbec6866fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634',
                    commitment: '0xa24b7e6843220d3454523ceb7f9b43f037e56a01d2bee82958b080dc6350ebac2da12b561cbd96c6fb3f5ae5a3c8df0ac2c559ae1c45b11d42fdf866558112bc',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0x096b57f1c92133073e432102d24b00148f5874fbb63f7fff216d832cb3cbed2b26d8017ba878c9d191bc2934ad742fd7830fe90a42c12faba550de4c25f77e64',
                    enroll_sig: '0x052ee1d975c49f19fd26b077740dcac399f174f40b5df1aba5f09ebea11faacfd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31',
                    commitment: '0xa0502960ddbe816729f60aeaa480c7924fb020d864deec6a9db778b8e56dd2ff8e987be748ff6ca0a43597ecb575da5d532696e376dc70bb4567b5b1fa512cb4',
                    cycle_length: 20
                },
                {
                    height: '0',
                    utxo: '0xb25467a2a15176ae3d293051e01d1e402036a9fbbbbea0d49878ccf4244bd8546c2d42622309efccf884901e3e27b12f4fef3fb2a8f81317d7e375a0f648c2ad',
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
                    tx_hash: '0xd37793e642273aeccbcbfc6be8e19a6007c5147e1116123e44a5e42e4be11495561e535484a2922120c556161f7ae55433bd124bedbf935f3f5b9a414b7af34e',
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
                            address: 'boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq'
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
            .addSearch("hash", "0x8ea91eafb2555f93ce0b0335d8454cdd052646dd1ef4a9029f026d08cdd081b9fb3e736903a119cce4beec1814b05c29b70243e0d1bbc096cf99c90b93f0b9a2")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        let response = await client.get(uri.toString());
        let expected = {
            tx: [
                {
                    height: '0',
                    tx_hash: '0xd37793e642273aeccbcbfc6be8e19a6007c5147e1116123e44a5e42e4be11495561e535484a2922120c556161f7ae55433bd124bedbf935f3f5b9a414b7af34e',
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
                            address: 'boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t'
                        },
                        {
                            amount: 20000000000000,
                            address: 'boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq'
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