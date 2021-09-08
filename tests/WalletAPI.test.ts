/*******************************************************************************

    Test Wallet API of Server Stoa

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { JSBI, SodiumHelper } from "boa-sdk-ts";
import {
    delay,
    FakeBlacklistMiddleware,
    recovery_sample_data,
    sample_data,
    sample_data2,
    TestAgora,
    TestClient,
    TestStoa,
} from "./Utils";

import * as assert from "assert";
import { BOASodium } from "boa-sodium-ts";
import URI from "urijs";
import { URL } from "url";
import { IDatabaseConfig } from "../src/modules/common/Config";
import { MockDBConfig } from "./TestConfig";

describe("Test of Stoa API for the wallet", () => {
    const host: string = "http://localhost";
    const port: string = "3837";
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;

    before("Bypassing middleware check", () => {
        FakeBlacklistMiddleware.assign();
    });

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    it("Store blocks", async () => {
        const uri = URI(host).port(port).directory("block_externalized");

        const url = uri.toString();
        for (let idx = 0; idx < 10; idx++) {
            await client.post(url, { block: recovery_sample_data[idx] });
            await delay(300);
        }
    });

    it("Test of the path /wallet/transactions/history", async () => {
        const uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k")
            .setSearch("pageSize", "10")
            .setSearch("page", "1");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 9);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address, "boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k");
        assert.strictEqual(response.data[0].peer, "boa1xpr00rxtcprlf99dnceuma0ftm9sv03zhtlwfytd5p0dkvzt4ryp595zpjp");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "9");
        assert.strictEqual(
            response.data[0].tx_hash,
            "0xed574225c713db7414f507af427ab8056c6adadbc78f45a8dd07397cb7717e39dc1fce4d03b34c80c68292d6a27b500ee896c0487d28e916c4f71a4b626a1da0"
        );
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "609999999100000");
        assert.strictEqual(response.data[0].unlock_height, "10");
    });

    it("Test of the path /wallet/transaction/overview", async () => {
        const uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename(
                "0x405ee9d66e83abd8c9a97c68db41de53c70c93c2f5bbe59eb134867ea1bf7f227ef06cc6babc34da81a43f1037e0f620eebe7f01368f9df498caaaef16fe9695"
            );

        const response = await client.get(uri.toString());
        const expected = {
            status: "Confirmed",
            height: "9",
            time: 1609464600,
            tx_hash:
                "0x405ee9d66e83abd8c9a97c68db41de53c70c93c2f5bbe59eb134867ea1bf7f227ef06cc6babc34da81a43f1037e0f620eebe7f01368f9df498caaaef16fe9695",
            tx_type: "payment",
            tx_size: 185,
            unlock_height: "10",
            lock_height: "0",
            unlock_time: 1609465200,
            payload: "",
            senders: [
                {
                    address: "boa1xrk00cupup5vxwpz09kl9rau78cwag28us4vuctr6zdxvwfzaht9v6tms8q",
                    amount: 609999999200000,
                    utxo: "0x1f701acb9086250af330ac6c4c45f69bdcbbe0b77f32d20255f6ccc6d639365b8a904b5a60e4ed4903323400e9ef5be08b3d040d8c6129b7496ebeb0dec4af09",
                    signature:
                        "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                    index: 0,
                    unlock_age: 0,
                    bytes: "jsuaqCzozqV97c5XBRiz1n0BIKSp+TFZdJwk2dkg4wIBMhc6Dsi/7jgD71FCxjbcjnKR3x1LctRTPXfaGolhGA==",
                },
            ],
            receivers: [
                {
                    type: 0,
                    address: "boa1xza007gllhzdawnr727hds36guc0frnjsqscgf4k08zqesapcg3uujh9g93",
                    lock_type: 0,
                    amount: 609999999100000,
                    utxo: "0xca8926f08dbe88fc8d5051eaaa6c3b94f8b165c21d873d15f2190aa74d27788cfe3f5a204023053c7e0fa874842cca4214154179d7728ed3c007650beac25e5d",
                    index: 0,
                    bytes: "uvf5H/3E3rpj8r12wjpHMPSOcoAhhCa2ecQMw6HCI84=",
                },
            ],
            fee: "100000",
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /wallet/transactions/history - Filtering - Wrong TransactionType", async () => {
        const uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "in,out");

        await assert.rejects(client.get(uri.toString()), {
            statusMessage: "Invalid transaction type: in,out",
        });
    });

    it("Test of the path /wallet/transactions/history - Filtering - TransactionType", async () => {
        const uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "outbound");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 4);
        assert.strictEqual(response.data[0].display_tx_type, "outbound");
        assert.strictEqual(response.data[0].address, "boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k");
        assert.strictEqual(response.data[0].peer, "boa1xpr00rxtcprlf99dnceuma0ftm9sv03zhtlwfytd5p0dkvzt4ryp595zpjp");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "8");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "-609999999300000");
        assert.strictEqual(
            response.data[0].tx_hash,
            "0x6ddb999e0f948df8a7c9abb44702dd3dfde02af2ecd3e7e517639202794253ac69e11335b05df71e2826afdebfe42c8a5db3da2465628188f98108ee38b8a9c4"
        );
    });

    it("Test of the path /wallet/transactions/history - Filtering - Date", async () => {
        const uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("beginDate", "1609459200")
            .setSearch("endDate", "1609459900");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address, "boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k");
        assert.strictEqual(response.data[0].peer, "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "1");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "609999999900000");
        assert.strictEqual(
            response.data[0].tx_hash,
            "0xd972ce624097872d8ae110d3e4cee11cdd0d090bbffa3850b1b80a7f22e65573c480156e58bcec924fa840214b91d4b36a9d9ddd85037673cdce99959532a0a7"
        );
    });

    it("Test of the path /wallet/transactions/history - Filtering - Peer", async () => {
        const uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("peer", "boa1xzgenes5cf8xel37");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].display_tx_type, "inbound");
        assert.strictEqual(response.data[0].address, "boa1xph007vhkq4j58eyhwxx8eg5hjc0p5etp5kss0w8fh2ux6xjf2v4wlxm25k");
        assert.strictEqual(response.data[0].peer, "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67");
        assert.strictEqual(response.data[0].peer_count, 1);
        assert.strictEqual(response.data[0].height, "1");
        assert.strictEqual(response.data[0].tx_type, "payment");
        assert.strictEqual(response.data[0].amount, "609999999900000");
        assert.strictEqual(
            response.data[0].tx_hash,
            "0xd972ce624097872d8ae110d3e4cee11cdd0d090bbffa3850b1b80a7f22e65573c480156e58bcec924fa840214b91d4b36a9d9ddd85037673cdce99959532a0a7"
        );
    });
});

describe("Test of Stoa API for the wallet with `sample_data`", () => {
    const host: string = "http://localhost";
    const port: string = "3837";
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;

    before("Bypassing middleware check", () => {
        FakeBlacklistMiddleware.assign();
    });

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora("2826", [], resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, new URL("http://127.0.0.1:2826"), port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", () => {
        return stoa_server.stop().then(async () => {
            await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
            return agora_server.stop();
        });
    });

    it("Store blocks", async () => {
        const uri = URI(host).port(port).directory("block_externalized");

        const url = uri.toString();

        await client.post(url, { block: sample_data[0] });
        await client.post(url, { block: sample_data[1] });
        await client.post(url, { block: sample_data2 });
        await delay(2000);
    });

    it("Test of the path /wallet/transaction/overview with payload", async () => {
        const uri = URI(host)
            .port(port)
            .directory("/wallet/transaction/overview")
            .filename(
                "0x35917fba7333947cfbc086164e81c1ad7b98dc6a4c61822a89f6eb061b29e956c5c964a2d4b9cce9a2119244e320091b20074351ab288e07f9946b9dcc4735a7"
            );

        const response = await client.get(uri.toString());
        const expected = {
            status: "Confirmed",
            height: "2",
            time: 1609460400,
            tx_hash:
                "0x35917fba7333947cfbc086164e81c1ad7b98dc6a4c61822a89f6eb061b29e956c5c964a2d4b9cce9a2119244e320091b20074351ab288e07f9946b9dcc4735a7",
            tx_type: "payment",
            tx_size: 1254,
            unlock_height: "3",
            lock_height: "0",
            unlock_time: 1609461000,
            payload:
                "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==",
            senders: [
                {
                    address: "boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj",
                    amount: 24399999990480,
                    utxo: "0x6c985ecd25f0dbfd201bc73b6c994c7ac40bcaf7506712afbcc25ebbb1a00435440868c4943c8b851ffb9401d192d27ca9473627972401508e0b022047bd88b6",
                    signature:
                        "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                    index: 0,
                    unlock_age: 0,
                    bytes: "g5qWM1z8SDAcI0aGbiq7r13dD7f13bRR0MoX0XddbAuzPdB1AfRoZtca/6SYpNn4ESkxPj6TXU8Z0ThwFT+iSA==",
                },
            ],
            receivers: [
                {
                    type: 0,
                    address: "boa1xqcmmns5swnm03zay5wjplgupe65uw4w0dafzsdsqtwq6gv3h3lcz24a8ch",
                    lock_type: 0,
                    amount: 12199168170440,
                    utxo: "0x353f583cc4bec3f53d23243ddb221339f6eec5b87f3a470494d7adb5aa55d7fdebaf4f6d58a0f5de07c2bc9cdc4b20710f019aee28b9463c24d526dd24b88010",
                    index: 0,
                    bytes: "Mb3OFIOnt8RdJR0g/RwOdU46rnt6kUGwAtwNIZG8f4E=",
                },
                {
                    type: 0,
                    address: "boa1xrlj00v7wyf9vf0cm2thd58tquqxpj9xtdrh2hhfyrmag4cdkmej5nystea",
                    lock_type: 0,
                    amount: 12199168170440,
                    utxo: "0x15dae46e2a9c2ce6f3f88b7e805b67b5d8cbc37de4546e1cdbe4821dca56addb6953338c61e10b37bbd5b8b3008061733da402022ba9f3cd85b468f5385985fc",
                    index: 1,
                    bytes: "/ye9nnESViX42pd20OsHAGDIpltHdV7pIPfUVw228yo=",
                },
            ],
            fee: "1663649600",
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /wallet/transactions/history - Filtering - exclude DataPayload in specific filter", async () => {
        let uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrlj00v7wyf9vf0cm2thd58tquqxpj9xtdrh2hhfyrmag4cdkmej5nystea")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "payload");

        let response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 1);

        uri = URI(host)
            .port(port)
            .directory("/wallet/transactions/history")
            .filename("boa1xrlj00v7wyf9vf0cm2thd58tquqxpj9xtdrh2hhfyrmag4cdkmej5nystea")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "outbound");

        response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 0);
    });

    it("Test of the path /wallet/utxo - Two UTXO", async () => {
        const amount = JSBI.BigInt("24399999990481");
        const uri = URI(host)
            .port(port)
            .directory("/wallet/utxo")
            .filename("boa1xzfv00s88ky9mf50nqngvztmnmtjzv4yr0w555aet366ssrv5zqaj6zsga3")
            .setSearch("amount", amount.toString());

        const response = await client.get(uri.toString());
        const expected = [
            {
                utxo: "0xa8d769089ccd2c8dd1bde0fd94fabe3e7ae414f7ce6143a9d65b32dc8ec998e34e9bbddb253fdb46058582f0f69de959d2b5af9edea4e8e5f951b1228aa7fe5a",
                type: 0,
                unlock_height: "2",
                amount: "24399999990480",
                height: "1",
                time: 1609459800,
                lock_type: 0,
                lock_bytes: "kse+Bz2IXaaPmCaGCXue1yEypBvdSlO5XHWoQGyggdk=",
            },
            {
                utxo: "0xe681a6b99e8f4ee51a54d4c3d0876566e08571b794f8446c3916457739bb7872fa3040845400d9b8ee3ca310f6e4e852c1dbc25bbb8cc255bbaa6b32196264c6",
                type: 0,
                unlock_height: "2",
                amount: "24399999990480",
                height: "1",
                time: 1609459800,
                lock_type: 0,
                lock_bytes: "kse+Bz2IXaaPmCaGCXue1yEypBvdSlO5XHWoQGyggdk=",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
        assert.ok(
            JSBI.greaterThanOrEqual(
                response.data.reduce((sum, m) => JSBI.add(sum, JSBI.BigInt(m.amount)), JSBI.BigInt(0)),
                amount
            )
        );
    });

    it("Test of the path /wallet/utxo - One UTXO", async () => {
        const amount = JSBI.BigInt("24399999990480");
        const uri = URI(host)
            .port(port)
            .directory("/wallet/utxo")
            .filename("boa1xzfv00s88ky9mf50nqngvztmnmtjzv4yr0w555aet366ssrv5zqaj6zsga3")
            .setSearch("amount", amount.toString());

        const response = await client.get(uri.toString());
        const expected = [
            {
                utxo: "0xa8d769089ccd2c8dd1bde0fd94fabe3e7ae414f7ce6143a9d65b32dc8ec998e34e9bbddb253fdb46058582f0f69de959d2b5af9edea4e8e5f951b1228aa7fe5a",
                type: 0,
                unlock_height: "2",
                amount: "24399999990480",
                height: "1",
                time: 1609459800,
                lock_type: 0,
                lock_bytes: "kse+Bz2IXaaPmCaGCXue1yEypBvdSlO5XHWoQGyggdk=",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
        assert.ok(
            JSBI.greaterThanOrEqual(
                response.data.reduce((sum, m) => JSBI.add(sum, JSBI.BigInt(m.amount)), JSBI.BigInt(0)),
                amount
            )
        );
    });

    it("Test of the path /wallet/utxo - Use filter last", async () => {
        const amount = JSBI.BigInt("24399999990480");
        const uri = URI(host)
            .port(port)
            .directory("/wallet/utxo")
            .filename("boa1xzfv00s88ky9mf50nqngvztmnmtjzv4yr0w555aet366ssrv5zqaj6zsga3")
            .setSearch("amount", amount.toString())
            .setSearch(
                "last",
                "0xa8d769089ccd2c8dd1bde0fd94fabe3e7ae414f7ce6143a9d65b32dc8ec998e34e9bbddb253fdb46058582f0f69de959d2b5af9edea4e8e5f951b1228aa7fe5a"
            );

        const response = await client.get(uri.toString());
        const expected = [
            {
                utxo: "0xe681a6b99e8f4ee51a54d4c3d0876566e08571b794f8446c3916457739bb7872fa3040845400d9b8ee3ca310f6e4e852c1dbc25bbb8cc255bbaa6b32196264c6",
                type: 0,
                unlock_height: "2",
                amount: "24399999990480",
                height: "1",
                time: 1609459800,
                lock_type: 0,
                lock_bytes: "kse+Bz2IXaaPmCaGCXue1yEypBvdSlO5XHWoQGyggdk=",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
        assert.ok(
            JSBI.greaterThanOrEqual(
                response.data.reduce((sum, m) => JSBI.add(sum, JSBI.BigInt(m.amount)), JSBI.BigInt(0)),
                amount
            )
        );
    });

    it("Test of the path /wallet/utxo - Get frozen UTXO", async () => {
        const amount = JSBI.BigInt("10000");
        const uri = URI(host)
            .port(port)
            .directory("/wallet/utxo")
            .filename("boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t")
            .setSearch("amount", amount.toString())
            .setSearch("type", "1");

        const response = await client.get(uri.toString());
        const expected = [
            {
                utxo: "0x00bac393977fbd1e0edc70a34c7ca802dafe57f2b4a2aabf1adaac54892cb1cbae72cdeeb212904101382690d18d2d2c6ac99b83227ca73b307fde0807c4af03",
                type: 1,
                unlock_height: "1",
                amount: "20000000000000",
                height: "0",
                time: 1609459200,
                lock_type: 0,
                lock_bytes: "2d+3UoATzC/jrMdblwpVWc7c7EM8koxS7x2Wekdcn1A=",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /wallet/utxo - Get locked UTXO", async () => {
        const amount = JSBI.BigInt("10000");
        const uri = URI(host)
            .port(port)
            .directory("/wallet/utxo")
            .filename("boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq")
            .setSearch("amount", amount.toString())
            .setSearch("type", "2");

        const response = await client.get(uri.toString());
        const expected = [
            {
                utxo: "0x009b3800b3f1f3b4eaf6f449244902b5e9a632fac59c3366d06cf31b9d683d7205cb86e4bf424a9d04aec8ff91e896705780f8ac9b55199decf2c1fef21a0a40",
                type: 0,
                unlock_height: "2018",
                amount: "3999999980000",
                height: "2",
                time: 1609460400,
                lock_type: 0,
                lock_bytes: "md+31zMRMVqPgR9b99kSCEWZdIIdFUREO38ok6oFX50=",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });
});
