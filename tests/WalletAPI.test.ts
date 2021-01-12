/*******************************************************************************

    Test Wallet API of Server Stoa

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { SodiumHelper } from 'boa-sdk-ts';
import { recovery_sample_data } from './RecoveryData.test';
import { TestAgora, TestStoa, sample_data, sample_data2, delay } from './Utils';

import * as assert from 'assert';
import axios from 'axios';
import URI from 'urijs';
import { URL } from 'url';

describe ('Test of Stoa API for the wallet', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = axios.create();

    before('Wait for the package libsodium to finish loading', () =>
    {
        return SodiumHelper.init();
    });

    before ('Start a fake Agora', () =>
    {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before ('Create TestStoa', () =>
    {
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        return stoa_server.createStorage();
    });

    before ('Start TestStoa', () =>
    {
        return stoa_server.start();
    });

    after ('Stop Stoa and Agora server instances', () =>
    {
        return stoa_server.stop().then(() => { return agora_server.stop() });
    });

    it ('Store blocks', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();
        for (let idx = 0; idx < 10; idx++)
            await client.post(url, {block: recovery_sample_data[idx]});
        await delay(100);
    });

    it ('Test of the path /wallet/transactions/history', () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD")
            .setSearch("pageSize", "10")
            .setSearch("page", "1");

        return client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 9);
                assert.strictEqual(response.data[0].display_tx_type, "inbound");
                assert.strictEqual(response.data[0].address,
                    "GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD");
                assert.strictEqual(response.data[0].peer,
                    "GDO22PFYWMU3YFLKDYP2PVM4PLX2D4BLJ2IRQMIHWJHFS3TZ6ITJMGPU");
                assert.strictEqual(response.data[0].peer_count, 1);
                assert.strictEqual(response.data[0].height, "9");
                assert.strictEqual(response.data[0].tx_hash,
                    "0xc7ac3e24aa7d0df99a0fb1fd95c8d8a1fd6a90b17f6ded45210df8" +
                    "8fec0e4e09b45987d15ea18b1a00c6830354c8a49cce11c33fb5719b" +
                    "1234c60137d33a2ce4");
                assert.strictEqual(response.data[0].tx_type, "payment");
                assert.strictEqual(response.data[0].amount, "610000000000000");
                assert.strictEqual(response.data[0].unlock_height, "10");
            });
    });

    it ('Test of the path /wallet/transaction/overview', () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0x6f2e7b2cb25a2146970e6e495ba1cec378a90acdc7817804dd9f41e1ba34a6c55fad4b24395d2da4f6a8d14a4fb2cfbc1cdbb486acda8094e0ab936d56e031c5")

        return client.get (uri.toString())
            .then((response) => {
                let expected = {
                    height: '9',
                    time: 1601553600,
                    tx_hash: '0x6f2e7b2cb25a2146970e6e495ba1cec378a90acdc7817804dd9f41e1ba34a6c55fad4b24395d2da4f6a8d14a4fb2cfbc1cdbb486acda8094e0ab936d56e031c5',
                    tx_type: "payment",
                    unlock_height: '10',
                    unlock_time: 1601554200,
                    payload: '',
                    senders: [
                        {
                            address: 'GDI22L72RGWY3BEFK2VUBWMJMSZU5SQNCQLN5FCF467RFIYN5KMY3YJT',
                            amount: 610000000000000,
                            utxo: '0x73d7f7994156c073c764e59ad65522ea58d28992ac5a857a59475168745f1b9ac160a059e77a7f342d2a6b12f20b8f4b42e7131aeb65dd1cf912069532c045a3'
                        }
                    ],
                    receivers: [
                        {
                            address: 'GDA225RGC4GOCVASSAMROSWJSGNOZX2IGPXZG52ESDSKQW2VN6UJFKWI',
                            amount: 610000000000000,
                            utxo: '0x71c16727e6eb2ca6c8244b8071a78c5bb4ec9253234e51b3f9c8e901cb1c71ee34dd0c4c09bbc16591bf09ecbe962280d8b5e45945490ebe8e6a9fc49f8530dd'
                        }
                    ],
                    fee: '0'
                };
                assert.deepStrictEqual(expected, response.data);
            })
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Wrong TransactionType', () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "in,out");

        return client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 0);
            })
            .catch((error) => {
                assert.strictEqual(error.response.data, "Invalid transaction type: in,out");
            });
    });

    it ('Test of the path /wallet/transactions/history - Filtering - TransactionType', () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "outbound");

        return client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 4);
                assert.strictEqual(response.data[0].display_tx_type, "outbound");
                assert.strictEqual(response.data[0].address,
                    "GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD");
                assert.strictEqual(response.data[0].peer,
                    "GDO22PFYWMU3YFLKDYP2PVM4PLX2D4BLJ2IRQMIHWJHFS3TZ6ITJMGPU");
                assert.strictEqual(response.data[0].peer_count, 1);
                assert.strictEqual(response.data[0].height, "8");
                assert.strictEqual(response.data[0].tx_type, "payment");
                assert.strictEqual(response.data[0].amount, "-610000000000000");
                assert.strictEqual(response.data[0].tx_hash,
                    "0x4c9b7ff106dde2a2ee1e44bddccae7a660800a7146858c6f7338f79" +
                    "f5eb7009b5617f9e747e99d9cdcf898209b3470c3e952256a21b5daee" +
                    "e79f488141558af8");
            });
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Date', () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("beginDate", "1596753600")
            .setSearch("endDate", "1596753600");

        return client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 1);
                assert.strictEqual(response.data[0].display_tx_type, "inbound");
                assert.strictEqual(response.data[0].address,
                    "GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD");
                assert.strictEqual(response.data[0].peer,
                    "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ");
                assert.strictEqual(response.data[0].peer_count, 1);
                assert.strictEqual(response.data[0].height, "1");
                assert.strictEqual(response.data[0].tx_type, "payment");
                assert.strictEqual(response.data[0].amount, "610000000000000");
                assert.strictEqual(response.data[0].tx_hash,
                    "0x5091c6120ebc2c85ff1414225f3813ab80e13275507f2a3d2c82248" +
                    "0ca7fa6247a48f5addcefd8193eca836054a9a12fcc6aabbc8e1675bc" +
                    "749213d7771cde44");
            });
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Peer', () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("peer", "GCOQEOHAU");

        return client.get (uri.toString())
            .then((response) =>
            {
                assert.strictEqual(response.data.length, 1);
                assert.strictEqual(response.data[0].display_tx_type, "inbound");
                assert.strictEqual(response.data[0].address,
                    "GDG22B5FTPXE5THQMCTGDUC4LF2N4DFF44PGX2LIFG4WNUZZAT4L6ZGD");
                assert.strictEqual(response.data[0].peer,
                    "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ");
                assert.strictEqual(response.data[0].peer_count, 1);
                assert.strictEqual(response.data[0].height, "1");
                assert.strictEqual(response.data[0].tx_type, "payment");
                assert.strictEqual(response.data[0].amount, "610000000000000");
                assert.strictEqual(response.data[0].tx_hash,
                    "0x5091c6120ebc2c85ff1414225f3813ab80e13275507f2a3d2c82248" +
                    "0ca7fa6247a48f5addcefd8193eca836054a9a12fcc6aabbc8e1675bc" +
                    "749213d7771cde44");
            });
    });
});

describe ('Test of Stoa API for the wallet with `sample_data`', () => {
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = axios.create();

    before('Wait for the package libsodium to finish loading', () => {
        return SodiumHelper.init();
    });

    before('Start a fake Agora', () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before('Create TestStoa', () => {
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        return stoa_server.createStorage();
    });

    before('Start TestStoa', () => {
        return stoa_server.start();
    });

    after('Stop Stoa and Agora server instances', () => {
        return stoa_server.stop().then(() => {
            return agora_server.stop()
        });
    });

    it('Store blocks', async () => {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();

        await client.post(url, {block: sample_data[0]});
        await client.post(url, {block: sample_data[1]});
        await client.post(url, {block: sample_data2});
        await delay(100);
    });

    it('Test of the path /wallet/transaction/overview with payload', () => {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0x42febd46e93acebfc7f81e7a8b0228c5c4fed42de29bb5b4872b09699c28bb3b29e8dbbc65eb3a46b60ccb688e8a6d4ffbc341a0d59f7de13d28de2fede5566d")

        return client.get(uri.toString())
            .then((response) => {
                let expected = {
                    height: '2',
                    time: 1597353600,
                    tx_hash: '0x42febd46e93acebfc7f81e7a8b0228c5c4fed42de29bb5b4872b09699c28bb3b29e8dbbc65eb3a46b60ccb688e8a6d4ffbc341a0d59f7de13d28de2fede5566d',
                    tx_type: 'payment',
                    unlock_height: '3',
                    unlock_time: 1597354200,
                    payload: '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff',
                    senders: [
                        {
                            address: 'GDAGR22X4IWNEO6FHNY3PYUJDXPUCRCKPNGACETAUVGE3GAWVFPS7VUJ',
                            amount: 24400000000000,
                            utxo: '0xd9482016835acc6defdfd060216a5890e00cf8f0a79ab0b83d3385fc723cd45bfea66eb3587a684518ff1756951d38bf4f07abda96dcdea1c160a4f83e377c32'
                        }
                    ],
                    receivers: [
                        {
                            address: 'GDID227ETHPOMLRLIHVDJSNSJVLDS4D4ANYOUHXPMG2WWEZN5JO473ZO',
                            amount: 24398336600000,
                            utxo: '0x1ea9e5e2c8327cfe20a6b0236767a0af9b5cae74a7addc21cef6a5e925694efa64eb7585db5004b78e5efa2b3c40f43dcd9a36f2ebfda4555214a3fcf8a5d150'
                        },
                        {
                            address: 'GCOMMONBGUXXP4RFCYGEF74JDJVPUW2GUENGTKKJECDNO6AGO32CUWGU',
                            amount: 1663400000,
                            utxo: '0xa3c797dcf6385fc45e14448a15125791547757b6a34bc8e449d9bd738e70ca2ce644eba9ad7a4476f3ee59c3956b37a47ef364f461df8e97e2765c41a889b3d3'
                        }
                    ],
                    fee: '0'
                }
                assert.deepStrictEqual(response.data, expected);
            })
    });
});
