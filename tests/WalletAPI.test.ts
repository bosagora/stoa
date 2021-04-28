/*******************************************************************************

    Test Wallet API of Server Stoa

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { SodiumHelper } from 'boa-sdk-ts';
import { TestAgora, TestStoa, TestClient, sample_data, sample_data2, recovery_sample_data, delay } from './Utils';

import * as assert from 'assert';
import URI from 'urijs';
import { URL } from 'url';
import { BOASodium } from 'boa-sodium-ts';

describe ('Test of Stoa API for the wallet', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();

    before('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before ('Start a fake Agora', () =>
    {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before ('Create TestStoa', async () =>
    {
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
    });

    before ('Start TestStoa', async () =>
    {
        await stoa_server.start();
    });

    after ('Stop Stoa and Agora server instances', async () =>
    {
        await stoa_server.stop();
        await agora_server.stop();
    });

    it ('Store blocks', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("block_externalized");

        let url = uri.toString();
        for (let idx = 0; idx < 10; idx++)
            await client.post(url, {block: recovery_sample_data[idx]});
        await delay(300);
    });

    it ('Test of the path /wallet/transactions/history', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9")
            .setSearch("pageSize", "10")
            .setSearch("page", "1");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 9);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address,
            "boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9");
        assert.strictEqual(response.data[0].peer,
            "boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "9");
        assert.strictEqual(response.data[0].tx_hash,
            "0x2ecd4c19dd1013d3514ece34c7b313ee109d9089fb0f5a4f980d6dfa6f559d3" +
            "9f9021f4d738b581afb411714657031b6f9c9f8bf2a4a1f5836cea4c5023771a9");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].unlock_height, "10");
    });

    it ('Test of the path /wallet/transaction/overview', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0xf5daf67967631d93da1b2453c84708632daa43cebd49a4b170929eeb3f7a636688189dd3d79b993e9d31f3f8b80dfa83d5b6a44e4ccc7984de211000eef9a74a")

        let response = await client.get (uri.toString());
        let expected = {
            "height": "9",
            "time": 1609464600,
            "tx_hash": "0xf5daf67967631d93da1b2453c84708632daa43cebd49a4b170929eeb3f7a636688189dd3d79b993e9d31f3f8b80dfa83d5b6a44e4ccc7984de211000eef9a74a",
            "tx_type": "payment",
            "unlock_height": "10",
            "unlock_time": 1609465200,
            "payload": "",
            "senders": [
                {
                    "address": "boa1xrg66j9mgk20kflzdzrq4p3k4gw8tg6vk3pa3fgm3twsagyaxa8luz7e3vu",
                    "amount": 610000000000000,
                    "utxo": "0xff4b4812d0e8e513de683cec8546a92e503f04a83340c9dd96f7897438abdc6cea69639df8703299a181d7083db2c18a753f4b20d10fafb68be54b1cc85b7b7d"
                }
            ],
            "receivers": [
                {
                    "address": "boa1xrq66nug6wnen9sp5cm7xhfw03yea8e9x63ggay3v5dhe6d9jerqz50eld0",
                    "amount": 610000000000000,
                    "utxo": "0x435f19a00fdcb41847588c275e1dd82a867f2a56595265f92ad3bc573d5f0bb52e8546f215c853e68c6aaddc82e91043af73e8279609b822b5fd8ea7b946483c"
                }
            ],
            "fee": "0"
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Wrong TransactionType', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "in,out");

        await assert.rejects(client.get (uri.toString()),
            {
                statusMessage: "Invalid transaction type: in,out"
            });
    });

    it ('Test of the path /wallet/transactions/history - Filtering - TransactionType', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "outbound");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 4);
        assert.strictEqual(response.data[0].display_tx_type, "outbound");
        assert.strictEqual(response.data[0].address,
            "boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9");
        assert.strictEqual(response.data[0].peer,
            "boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "8");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "-610000000000000");
        assert.strictEqual(response.data[0].tx_hash,
            "0xcf84090644a08a96526ba06fdfd84d4691f3934f3d2d984c2ce00ebc04b37da" +
            "a4625b682597f101f1bd7a26cc70bcc8ec9ce2072f4f6032609460758d6447440");
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Date', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("beginDate", "1609459200")
            .setSearch("endDate", "1609459900");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address,
            "boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9");
        assert.strictEqual(response.data[0].peer,
            "boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "1");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].tx_hash,
            "0xf2dd77d4936d3dedc6b5ef4ee19d33ecef1559e875f2bda77672d3505087eab" +
            "7400d680b5037091b2110ca14035710c7a8f13f976f0feaad6135ca42befd0a08");
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Peer', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("peer", "boa1xrxydyju2h8l3sfy");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address,
            "boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9");
        assert.strictEqual(response.data[0].peer,
            "boa1xrxydyju2h8l3sfytnwd3l8j4gj4jsa0wj4pykt37yyggtl686ugy5wj2yt");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "1");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].tx_hash,
            "0xf2dd77d4936d3dedc6b5ef4ee19d33ecef1559e875f2bda77672d3505087eab" +
            "7400d680b5037091b2110ca14035710c7a8f13f976f0feaad6135ca42befd0a08");
    });
});

describe ('Test of Stoa API for the wallet with `sample_data`', () => {
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();

    before('Wait for the package libsodium to finish loading', async () =>
    {
        SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before('Start a fake Agora', () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before ('Create TestStoa', async () =>
    {
        stoa_server = new TestStoa(new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
    });

    before ('Start TestStoa', async () =>
    {
        await stoa_server.start();
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
        await delay(500);
    });

    it('Test of the path /wallet/transaction/overview with payload', async () => {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0x5faca8a9851cf3a6229c9b7998d26cacb26a2483efa209aaf94ce95d34ca93efa24f4d9d0c00bf158f43c597facb2aa71c725a670332cc3608bd470ec6420edc")

        let response = await client.get(uri.toString());
        let expected = {
            "height": "2",
            "time": 1609460400,
            "tx_hash": "0x5faca8a9851cf3a6229c9b7998d26cacb26a2483efa209aaf94ce95d34ca93efa24f4d9d0c00bf158f43c597facb2aa71c725a670332cc3608bd470ec6420edc",
            "tx_type": "payment",
            "unlock_height": "3",
            "unlock_time": 1609461000,
            "payload": "0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff",
            "senders": [
                {
                    "address": "boa1xrqx366yn8xktzhtsj83gj0nnj35cv8lrk7xhszj0dfemlacumgujs595mr",
                    "amount": 24400000000000,
                    "utxo": "0x79170f924260def767d30e9eb606379c59b26ab5b575097f760507e889ba097e458a19aead724e10cf15313a1da7094c5c7e708c12e91a58f1f922bd6a5da0a5"
                }
            ],
            "receivers": [
                {
                    "address": "boa1xrzwvvw6l6d9k84ansqgs9yrtsetpv44wfn8zm9a7lehuej3ssskxth867s",
                    "amount": 1663400000,
                    "utxo": "0x695ebd4843c0bab6966d4457648f0d85371361647af9bfb9dd7a7a553257efdc0be38700032cb362e614933d2d00590a98d03679a94edf573b6d574158b201cc"
                },
                {
                    "address": "boa1xrgr66gdm5je646x70l5ar6qkhun0hg3yy2eh7tf8xxlmlt9fgjd2q0uj8p",
                    "amount": 24398336600000,
                    "utxo": "0xba8a96eb3bcbc673f61652e3b6ba1c29c3f6fb996af95bcb2afe7e0d347bf1100a1bce76e64aa60f0a50bf1587b5dc01a03d32a45746656d46cfe8b073bce9a3"
                }
            ],
            "fee": "0"
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it ('Test of the path /wallet/transactions/history - Filtering - exclude DataPayload in specific filter', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrgr66gdm5je646x70l5ar6qkhun0hg3yy2eh7tf8xxlmlt9fgjd2q0uj8p")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "payload");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);


        uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrgr66gdm5je646x70l5ar6qkhun0hg3yy2eh7tf8xxlmlt9fgjd2q0uj8p")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "outbound");

        response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 0);
    });
});
