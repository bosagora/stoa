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
            "0x819fac9cd506e4fa3411ccd919e818f0e7d2e2d3192d7e687198d652c1bc285" +
            "32c91b8960260eac6fe92c863088566c8ca53f568aa84894048ac91b58db37162");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "610000000000000");
        assert.strictEqual(response.data[0].unlock_height, "10");
    });

    it ('Test of the path /wallet/transaction/overview', async () =>
    {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename("0xbd83d11bfbc2d77281d1435774990e587c871cc53564f527bb07865b31c3cb3cf5c3e235843ad7b967f7f17db5b691d3cc307983d470dd07d3347d3230cf7689")

        let response = await client.get (uri.toString());
        let expected = {
            height: '9',
            time: 1609464600,
            tx_hash: '0xbd83d11bfbc2d77281d1435774990e587c871cc53564f527bb07865b31c3cb3cf5c3e235843ad7b967f7f17db5b691d3cc307983d470dd07d3347d3230cf7689',
            tx_type: 'payment',
            unlock_height: '10',
            unlock_time: 1609465200,
            payload: '',
            senders: [
                {
                    address: 'boa1xrk00cupup5vxwpz09kl9rau78cwag28us4vuctr6zdxvwfzaht9v6tms8q',
                    amount: 610000000000000,
                    utxo: '0xf524c2acd5c95eebc1578dedd3f35e32cfeb6fd7181ceee4839b70745fd8eaa12442762c5d688bb9e15a2c666bccf6bc7ec8456a62daff1ebf4945a76402b6cb'
                }
            ],
            receivers: [
                {
                    address: 'boa1xza007gllhzdawnr727hds36guc0frnjsqscgf4k08zqesapcg3uujh9g93',
                    amount: 610000000000000,
                    utxo: '0x718c57bc74ef0ded4311e7013e146834c58b20c5525919947c37482be7778b95bb7e57faacde1fc5638f6f41d30b8a790a1effffd8385e112ee1e539c41e6ecf'
                }
            ],
            fee: '0'
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
            "0xd1a96fc13f1c4a77870bf208aa9c547335b3bbe4d5e31c9f3fa0afce16ab8ae" +
            "6172244c8b6a9e688b31f4ce25ba6ee22a98e36f0b94f92f964dcb419a8d391a1");
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
            "0x638d7c971a50d714b17de7e8bf9c72a22a03fd1ebbf44cca1bf5ab529b3e024" +
            "6a70a90164b83e93e2002c2387b011d1e32238402f9f79b599ab5ddaab7013b15");
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
            "0x638d7c971a50d714b17de7e8bf9c72a22a03fd1ebbf44cca1bf5ab529b3e024" +
            "6a70a90164b83e93e2002c2387b011d1e32238402f9f79b599ab5ddaab7013b15");
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
            .filename("0xa2073ce83b58f87d3c684bd62c1d037531edd85f7ed11d006f97af95ca65f8ae2ed8cf10f5843c8cc3f4295b787f1413acc92f449d42a587df608f5ef6d1fb7f")

        let response = await client.get(uri.toString());
        let expected = {
            height: '2',
            time: 1609460400,
            tx_hash: '0xa2073ce83b58f87d3c684bd62c1d037531edd85f7ed11d006f97af95ca65f8ae2ed8cf10f5843c8cc3f4295b787f1413acc92f449d42a587df608f5ef6d1fb7f',
            tx_type: 'payment',
            unlock_height: '3',
            unlock_time: 1609461000,
            payload: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==',
            senders: [
                {
                    address: 'boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj',
                    amount: 24400000000000,
                    utxo: '0x2cf1caaeff65a7e2b2f7edff1023881564f2f0cad30161cf42279826e6919d77347df68de6d8eb0da58ebdc6e4f28da7569113002044467fc5cbf599a7ea9037'
                }
            ],
            receivers: [
                {
                    address: 'boa1xqcmmns5swnm03zay5wjplgupe65uw4w0dafzsdsqtwq6gv3h3lcz24a8ch',
                    amount: 1663400000,
                    utxo: '0xcc7cd566eedab17b3fc91e06f34e02106adda4d6080b04cb8cd6eb4d2ff50d953320aa0d2c5a376ba3029d773e77403bfbe8cbe9108e1c61553fd7a0be98feca'
                },
                {
                    address: 'boa1xrlj00v7wyf9vf0cm2thd58tquqxpj9xtdrh2hhfyrmag4cdkmej5nystea',
                    amount: 24398336600000,
                    utxo: '0xf1e7a43bc07341ee75e133476ff12df3f900a942795804ff16bcda6ec7a7e05c92b536a91ce3ee5aa22d40bff001cffdf4dae005eac00a0d7c1d1d39d3c6472e'
                }
            ],
            fee: '0'
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
