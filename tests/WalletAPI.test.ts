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
import { CoinMarketService } from '../src/modules/service/CoinMaketService';
import { CoinGeckoMaket } from '../src/modules/coinmarket/CoinGeckoMaket';

describe ('Test of Stoa API for the wallet', () =>
{
    let host: string = 'http://localhost';
    let port: string = '3837';
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMaket;
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
                gecko_market = new CoinGeckoMaket(gecko_server);
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
            "0x137dfda16ebdcc93de30a171bd3de2cc08f8e124dc55858507b4d4ed696952d" +
            "711b09ed83b31e0583ebddd7a3a73cc30d09d1fb656e62245e2dd56c585d1f61b");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].unlock_height, "10");
    });

    it ('Test of the path /wallet/transaction/overview', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0x7a1f8c370a4e31f9f3cc1559c9f1c91cd1bf2efa39156bd88ee10848380f86b27a4ed029ce30550838a6e53eec156afb7b127a1ba872ecf6acea7ac1317f3386")

        let response = await client.get (uri.toString());
        let expected = {
            "status": "Confirmed",
            "height": "9",
            "time": 1609464600,
            "tx_hash": "0x7a1f8c370a4e31f9f3cc1559c9f1c91cd1bf2efa39156bd88ee10848380f86b27a4ed029ce30550838a6e53eec156afb7b127a1ba872ecf6acea7ac1317f3386",
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
                    "utxo": "0x9fd93f7b6acf3a277569084fabc3b6a8e983087c03e75aed7327c45d0a853a18b142daf607990882fc6388856557219c2bce42fb208f9f7e2cbeb845b482dc50",
                    "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                    "index": 0,
                    "unlock_age": 0,
                    "bytes": "0x92a70f8a1e99375e305c50269835545711daca7fbe3f97a1a2c94fcb75b67f004a1a9bd6f9d84f9b057b6901e0c93dbeac67a08f447021e31a604b65f1d0bda0"
                }
            ],
            "receivers": [
                {
                    "type": 0,
                    "address": "boa1xza007gllhzdawnr727hds36guc0frnjsqscgf4k08zqesapcg3uujh9g93",
                    "lock_type": 0,
                    "amount": 610000000000000,
                    "utxo": "0xfa4ca8aa9fbd8d00847b53dc48878d427bef4e5b9c655dce45e35df502829e33a672b47f6bbf506f0a01c920052106f551f46c19b4390c09c2c90ea4d96f69dc",
                    "index": 0,
                    "bytes": "0x5f21dbacbd82f3f86006b1237f1bfc4b24b857d5e8bd8616a20d1feb09be640c9d096839324b36f8dd5457f4bef618261fe62c8e15a411495cca216a3bc94397"
                }
            ],
            "fee": "0"
        }
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
            "0xc9e537de55f0f353baf53d09f1524bf43778911c7aa0a4adc51ef263c4e7ea4" +
            "2eaca79f518a32f0669a4898edb5a43dcd7cb89882b6c1bb1ef074810a357ef61");
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
            "0x90f84f032e95084e243993891e4e40d708845e7d4de197d48c0ddd6e8a66378" +
            "b8ed6745741dcd88b828509d52ed8e7bdc9c564b90414198e2a5a9ac93446d7b8");
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
            "0x90f84f032e95084e243993891e4e40d708845e7d4de197d48c0ddd6e8a66378" +
            "b8ed6745741dcd88b828509d52ed8e7bdc9c564b90414198e2a5a9ac93446d7b8");
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
    let gecko_market: CoinGeckoMaket;
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
                gecko_market = new CoinGeckoMaket(gecko_server);
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
            .filename("0xfbe8c9c8544ed673672607552274aa1f1255375f8bf5f20bb1b7f6fe037a90ffbb84c70d0fd089afe5e6db9f68c5f6456b92f802fbb7a91a1b24353d2c625638")

        let response = await client.get(uri.toString());
        let expected = {
            "status": "Confirmed",
            "height": "2",
            "time": 1609460400,
            "tx_hash": "0xfbe8c9c8544ed673672607552274aa1f1255375f8bf5f20bb1b7f6fe037a90ffbb84c70d0fd089afe5e6db9f68c5f6456b92f802fbb7a91a1b24353d2c625638",
            "tx_type": "payment",
            "tx_size": 1248,
            "unlock_height": "3",
            "lock_height": "0",
            "unlock_time": 1609461000,
            "payload": "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==",
            "senders": [
                {
                    "address": "boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj",
                    "amount": 24400000000000,
                    "utxo": "0xf180e8aede3ea3f6db7872b2af4225f186abc4835e2f1108ea6ee1c56a8edb79c6460de4968696ec1f9a7fe5ab0008d33781a0031d79409825f2ea45df6f7fbd",
                    "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                    "index": 0,
                    "unlock_age": 0,
                    "bytes": "0x79989dee6906c074068975bd3f26d6bd9fe6c07469fe6c660f1f08df6aeb6202971960e21a354cd1afc33b8342d88ff6ad5e18cd1d5710cafc447e5799a56a28"
                }
            ],
            "receivers": [
                {
                    "type": 0,
                    "address": "boa1xqcmmns5swnm03zay5wjplgupe65uw4w0dafzsdsqtwq6gv3h3lcz24a8ch",
                    "lock_type": 0,
                    "amount": 1663400000,
                    "utxo": "0xb1262f48009e97c3f3041b52552986f0b260aad9c03d82ea6d027e0a85caa58a52aebcd8f623cf21e1652619feb047e911a4992dc58d2b1a58fe6bf2ee4ee679",
                    "index": 0,
                    "bytes": "0x178f01a58740ab687b82c61fea00ed740de5bac97ada2599300bfbb1e5b244e945c9b78412864341f96f537a993cf011a15a2affc95f944fdc937aa8ce303f2c"
                },
                {
                    "type": 0,
                    "address": "boa1xrlj00v7wyf9vf0cm2thd58tquqxpj9xtdrh2hhfyrmag4cdkmej5nystea",
                    "lock_type": 0,
                    "amount": 24398336600000,
                    "utxo": "0xdc6e74b9b32a706e7bf389d59dd88d1adfde4161e1854cc5663aa1b15fc6cc99ff9fa6c1779d0e58c51f101bad2d0d3246ffd0917ff12d194daa4486a1f52dee",
                    "index": 1,
                    "bytes": "0xe3dd9e0f4d5b39dfd3a0c656a12179f627da5298c2d9f668099db5dc33e6a9f8dfbbb5f7d9a974a2e2eb27e34ce33582948902c73aca315adc1c2e4025595b0f"
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
