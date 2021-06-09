/*******************************************************************************

    Test Wallet API of Server Stoa

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { SodiumHelper } from 'boa-sdk-ts';
import { TestAgora, TestStoa, TestGeckoServer, TestClient, market_cap_sample_data, sample_data, market_cap_history_sample_data, sample_data2, recovery_sample_data, delay } from './Utils';

import * as assert from 'assert';
import URI from 'urijs';
import { URL } from 'url';
import { IDatabaseConfig } from '../src/modules/common/Config';
import { MockDBConfig } from './TestConfig';
import { BOASodium } from 'boa-sodium-ts';
import { CoinMarketService } from '../src/modules/service/CoinMarketService';
import { CoinGeckoMarket } from '../src/modules/coinmarket/CoinGeckoMarket';

describe ('Test of Stoa API for the wallet', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMarket;
    let coinMarketService: CoinMarketService;

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
    before('Start a fake TestCoinGecko', () => {
        return new Promise<void>((resolve, reject) => {
                gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
                gecko_market = new CoinGeckoMarket(gecko_server);
        });
    });
    before('Start a fake coinMarketService', () => {
             coinMarketService = new CoinMarketService(gecko_market)
    });
    before ('Create TestStoa', async () =>
    {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig,new URL("http://127.0.0.1:2826"), port, coinMarketService);
        await stoa_server.createStorage();
        await stoa_server.start();
    });
    after ('Stop Stoa and Agora server instances', async () =>
    {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await gecko_server.stop();
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
        await delay(1000);
    });

    it ('Test of the path /wallet/transactions/history', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k")
            .setSearch("pageSize", "10")
            .setSearch("page", "1");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 9);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address,
            "boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k");
        assert.strictEqual(response.data[0].peer,
            "boa1xpr00rxtcprlf99dnceuma0ftm9sv03zhtlwfytd5p0dkvzt4ryp595zpjp");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "9");
        assert.strictEqual(response.data[0].tx_hash,
            "0xeffb91d272f3f116fb179c96dcc623010d393b83140d3e4929caa783ec3e66b" +
            "3053d5ee4168b298d5a7f5f7fbc4a9949ced280f550e3aa235eafcfa24b2ca9dd");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].unlock_height, "10");
    });

    it ('Test of the path /wallet/transaction/overview', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0xd39a98fb9ba8882be791000ddaa21b7b0fbf12850a8810dbea4bb1c7d6b85000d1b2e05837f8dcac97827a6c51d75aced5145364e6dac7596d7d8047e73b701c")

        let response = await client.get (uri.toString());
        let expected = {
            "status": "Confirmed",
            "height": "9",
            "time": 1609464600,
            "tx_hash": "0xd39a98fb9ba8882be791000ddaa21b7b0fbf12850a8810dbea4bb1c7d6b85000d1b2e05837f8dcac97827a6c51d75aced5145364e6dac7596d7d8047e73b701c",
            "tx_type": "payment",
            "tx_size": 182,
            "unlock_height": "10",
            "lock_height": "0",
            "unlock_time": 1609465200,
            "payload": "",
            "senders": [
                {
                    "address": "boa1xrk00cupup5vxwpz09kl9rau78cwag28us4vuctr6zdxvwfzaht9v6tms8q",
                    "amount": 610000000000000,
                    "utxo": "0x3001f97e9536babe0e899909838d4fb12971cb7b61bdf4fffe4e65ea2c4f9dcaef6de683a1e30d011b5d686bccb62e6e355963da5cd62364e95f11389265b005",
                    "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                    "index": 0,
                    "unlock_age": 0,
                    "bytes": "0x6e242b73d0e69ce822952c9fb1c1ed88c55bd8247a44bd62cc712d2d65964c01afa0e59336e43e947e41c51d7dea966554762c0c04bf173d321e3a1ce57eef0f"
                }
            ],
            "receivers": [
                {
                    "type": 0,
                    "address": "boa1xza007gllhzdawnr727hds36guc0frnjsqscgf4k08zqesapcg3uujh9g93",
                    "lock_type": 0,
                    "amount": 610000000000000,
                    "utxo": "0xf6de2987c803b29ca4d22a8f6f43db530b879d4986a7613c7d20686e337907230b91e23ff272c316f4fe15f5c1209b6540c91bc47c293f87b2ecc1c246cd8629",
                    "index": 0,
                    "bytes": "0x5f21dbacbd82f3f86006b1237f1bfc4b24b857d5e8bd8616a20d1feb09be640c9d096839324b36f8dd5457f4bef618261fe62c8e15a411495cca216a3bc94397"
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
            .filename("boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k")
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
            .filename("boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "outbound");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 4);
        assert.strictEqual(response.data[0].display_tx_type, "outbound");
        assert.strictEqual(response.data[0].address,
            "boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k");
        assert.strictEqual(response.data[0].peer,
            "boa1xpr00rxtcprlf99dnceuma0ftm9sv03zhtlwfytd5p0dkvzt4ryp595zpjp");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "8");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "-610000000000000");
        assert.strictEqual(response.data[0].tx_hash,
            "0x3bfdbf5776eeef6d6429b9aca3946d4a2de1be8e9d38c3bb2cff8cc18be32eb" +
            "40e4bf0a33561ec644bd79be45621724824b6dda7edda1f7a77cc2efeeb723f6e");
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Date', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("beginDate", "1609459200")
            .setSearch("endDate", "1609459900");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address,
            "boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k");
        assert.strictEqual(response.data[0].peer,
            "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "1");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].tx_hash,
            "0xa21b598d404fdd5ffff7eb3ff4294c9cadd4ceb5a4be480c66e599bb2648187" +
            "4c84ffe38c100b15ccc03406b885093306ae62bdd464a8c7399e1609269aceb8d");
    });

    it ('Test of the path /wallet/transactions/history - Filtering - Peer', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("peer", "boa1xzgenes5cf8xel37");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address,
            "boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k");
        assert.strictEqual(response.data[0].peer,
            "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "1");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].tx_hash,
            "0xa21b598d404fdd5ffff7eb3ff4294c9cadd4ceb5a4be480c66e599bb2648187" +
            "4c84ffe38c100b15ccc03406b885093306ae62bdd464a8c7399e1609269aceb8d");
    });
});

describe ('Test of Stoa API for the wallet with `sample_data`', () => {
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();
    let testDBConfig : IDatabaseConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMarket;
    let coinMarketService: CoinMarketService;


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
    before('Start a fake TestCoinGecko', () => {
        return new Promise<void>((resolve, reject) => {
                gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
                gecko_market = new CoinGeckoMarket(gecko_server);
        });
    });
    before('Start a fake coinMarketService', () => {
             coinMarketService = new CoinMarketService(gecko_market)
    });
    before ('Create TestStoa', async () =>
    {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig,new URL("http://127.0.0.1:2826"), port, coinMarketService);
        await stoa_server.createStorage();
        await stoa_server.start();
    });
    after('Stop Stoa and Agora server instances', () => {
        return stoa_server.stop().then(async() => {
            await coinMarketService.stop();
            await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
            await gecko_server.stop();
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
        await delay(1000);
    });

    it('Test of the path /wallet/transaction/overview with payload', async () => {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0xd39a98fb9ba8882be791000ddaa21b7b0fbf12850a8810dbea4bb1c7d6b85000d1b2e05837f8dcac97827a6c51d75aced5145364e6dac7596d7d8047e73b701c")

        let response = await client.get(uri.toString());        
        let expected = ''
        assert.deepStrictEqual(response.data, expected);
    });

    it ('Test of the path /wallet/transactions/history - Filtering - exclude DataPayload in specific filter', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrlj00v7wyf9vf0cm2thd58tquqxpj9xtdrh2hhfyrmag4cdkmej5nystea")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "payload");

        let response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 1);


        uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrlj00v7wyf9vf0cm2thd58tquqxpj9xtdrh2hhfyrmag4cdkmej5nystea")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "outbound");

        response = await client.get (uri.toString());
        assert.strictEqual(response.data.length, 0);
    });
});
