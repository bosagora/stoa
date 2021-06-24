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
            "0xed574225c713db7414f507af427ab8056c6adadbc78f45a8dd07397cb7717e3" +
            "9dc1fce4d03b34c80c68292d6a27b500ee896c0487d28e916c4f71a4b626a1da0");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "609999999100000");
        assert.strictEqual(response.data[0].unlock_height, "10");
    });

    it ('Test of the path /wallet/transaction/overview', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0x405ee9d66e83abd8c9a97c68db41de53c70c93c2f5bbe59eb134867ea1bf7f227ef06cc6babc34da81a43f1037e0f620eebe7f01368f9df498caaaef16fe9695")

        let response = await client.get (uri.toString());
        let expected = {
            "status": "Confirmed",
            "height": "9",
            "time": 1609464600,
            "tx_hash": "0x405ee9d66e83abd8c9a97c68db41de53c70c93c2f5bbe59eb134867ea1bf7f227ef06cc6babc34da81a43f1037e0f620eebe7f01368f9df498caaaef16fe9695",
            "tx_type": "payment",
            "tx_size": 185,
            "unlock_height": "10",
            "lock_height": "0",
            "unlock_time": 1609465200,
            "payload": "",
            "senders": [
                {
                    "address": "boa1xrk00cupup5vxwpz09kl9rau78cwag28us4vuctr6zdxvwfzaht9v6tms8q",
                    "amount": 609999999200000,
                    "utxo": "0x1f701acb9086250af330ac6c4c45f69bdcbbe0b77f32d20255f6ccc6d639365b8a904b5a60e4ed4903323400e9ef5be08b3d040d8c6129b7496ebeb0dec4af09",
                    "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                    "index": 0,
                    "unlock_age": 0,
                    "bytes": "0x8ecb9aa82ce8cea57dedce570518b3d67d0120a4a9f93159749c24d9d920e3020132173a0ec8bfee3803ef5142c636dc8e7291df1d4b72d4533d77da1a896118"
                }
            ],
            "receivers": [
                {
                    "type": 0,
                    "address": "boa1xza007gllhzdawnr727hds36guc0frnjsqscgf4k08zqesapcg3uujh9g93",
                    "lock_type": 0,
                    "amount": 609999999100000,
                    "utxo": "0xca8926f08dbe88fc8d5051eaaa6c3b94f8b165c21d873d15f2190aa74d27788cfe3f5a204023053c7e0fa874842cca4214154179d7728ed3c007650beac25e5d",
                    "index": 0,
                    "bytes": "0x5f21dbacbd82f3f86006b1237f1bfc4b24b857d5e8bd8616a20d1feb09be640c9d096839324b36f8dd5457f4bef618261fe62c8e15a411495cca216a3bc94397"
                }
            ],
            "fee": "100000"
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
        assert.strictEqual(response.data[0].amount, "-609999999300000");
        assert.strictEqual(response.data[0].tx_hash,
            "0x6ddb999e0f948df8a7c9abb44702dd3dfde02af2ecd3e7e517639202794253a" +
            "c69e11335b05df71e2826afdebfe42c8a5db3da2465628188f98108ee38b8a9c4");
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
        assert.strictEqual(response.data[0].amount, "609999999900000");
        assert.strictEqual(response.data[0].tx_hash,
            "0xd972ce624097872d8ae110d3e4cee11cdd0d090bbffa3850b1b80a7f22e6557" +
            "3c480156e58bcec924fa840214b91d4b36a9d9ddd85037673cdce99959532a0a7");
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
        assert.strictEqual(response.data[0].amount, "609999999900000");
        assert.strictEqual(response.data[0].tx_hash,
            "0xd972ce624097872d8ae110d3e4cee11cdd0d090bbffa3850b1b80a7f22e6557" +
            "3c480156e58bcec924fa840214b91d4b36a9d9ddd85037673cdce99959532a0a7");
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
            .filename("0x35917fba7333947cfbc086164e81c1ad7b98dc6a4c61822a89f6eb061b29e956c5c964a2d4b9cce9a2119244e320091b20074351ab288e07f9946b9dcc4735a7")

        let response = await client.get(uri.toString());
        let expected = {
            "status": "Confirmed",
            "height": "2",
            "time": 1609460400,
            "tx_hash": "0x35917fba7333947cfbc086164e81c1ad7b98dc6a4c61822a89f6eb061b29e956c5c964a2d4b9cce9a2119244e320091b20074351ab288e07f9946b9dcc4735a7",
            "tx_type": "payment",
            "tx_size": 1254,
            "unlock_height": "3",
            "lock_height": "0",
            "unlock_time": 1609461000,
            "payload": "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==",
            "senders": [
                {
                    "address": "boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj",
                    "amount": 24399999990480,
                    "utxo": "0x6c985ecd25f0dbfd201bc73b6c994c7ac40bcaf7506712afbcc25ebbb1a00435440868c4943c8b851ffb9401d192d27ca9473627972401508e0b022047bd88b6",
                    "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                    "index": 0,
                    "unlock_age": 0,
                    "bytes": "0x839a96335cfc48301c2346866e2abbaf5ddd0fb7f5ddb451d0ca17d1775d6c0bb33dd07501f46866d71affa498a4d9f81129313e3e935d4f19d13870153fa248"
                }
            ],
            "receivers": [
                {
                    "type": 0,
                    "address": "boa1xqcmmns5swnm03zay5wjplgupe65uw4w0dafzsdsqtwq6gv3h3lcz24a8ch",
                    "lock_type": 0,
                    "amount": 12199168170440,
                    "utxo": "0x353f583cc4bec3f53d23243ddb221339f6eec5b87f3a470494d7adb5aa55d7fdebaf4f6d58a0f5de07c2bc9cdc4b20710f019aee28b9463c24d526dd24b88010",
                    "index": 0,
                    "bytes": "0x178f01a58740ab687b82c61fea00ed740de5bac97ada2599300bfbb1e5b244e945c9b78412864341f96f537a993cf011a15a2affc95f944fdc937aa8ce303f2c"
                },
                {
                    "type": 0,
                    "address": "boa1xrlj00v7wyf9vf0cm2thd58tquqxpj9xtdrh2hhfyrmag4cdkmej5nystea",
                    "lock_type": 0,
                    "amount": 12199168170440,
                    "utxo": "0x15dae46e2a9c2ce6f3f88b7e805b67b5d8cbc37de4546e1cdbe4821dca56addb6953338c61e10b37bbd5b8b3008061733da402022ba9f3cd85b468f5385985fc",
                    "index": 1,
                    "bytes": "0xe3dd9e0f4d5b39dfd3a0c656a12179f627da5298c2d9f668099db5dc33e6a9f8dfbbb5f7d9a974a2e2eb27e34ce33582948902c73aca315adc1c2e4025595b0f"
                }
            ],
            "fee": "1663649600"
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
