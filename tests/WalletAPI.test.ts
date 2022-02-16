/*******************************************************************************

    Test Wallet API of Server Stoa

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    Amount,
    Block,
    BOA,
    Hash,
    hashFull,
    JSBI,
    makeUTXOKey,
    OutputType,
    PublicKey,
    Signature,
    SodiumHelper,
    Transaction,
    TxInput,
    TxOutput,
    Unlock,
} from "boa-sdk-ts";
import {
    createBlock,
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
import { IUnspentTxOutput } from "../src/Types";
import { MockDBConfig } from "./TestConfig";

import { io, Socket } from "socket.io-client";

describe("Test of Stoa API for the wallet with recovery data", function () {
    this.timeout(20000);
    const agora_addr: URL = new URL("http://localhost:2831");
    const stoa_addr: URL = new URL("http://localhost:3831");
    const stoa_private_addr: URL = new URL("http://localhost:4831");
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
            agora_server = new TestAgora(agora_addr.port, [], resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    it("Store blocks", async () => {
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        for (let idx = 0; idx < 10; idx++) {
            await client.post(url, { block: recovery_sample_data[idx] });
            await delay(1000);
        }
        await delay(2000);
    });

    it("Test of the path /wallet/transaction/detail", async () => {
        const uri = URI(stoa_addr)
            .directory("/wallet/transaction/detail")
            .filename(
                "0xd37d727bae3cacb60cd89fc279f1edeb4cd6255670de570916bdb5e0dd4674b884e78957759066635fa4ee713580b3b578c5bdf2b7888030fd005c888b6c6c15"
            );

        const response = await client.get(uri.toString());
        const expected = {
            fee: "282100",
            freezing_fee: "0",
            height: "1",
            lock_height: "0",
            payload: "",
            payload_fee: "0",
            receivers: [
                {
                    address: "boa1xpaqh00j6amm5unu56tdg9l2vezq5znhdmkgzlwyydyhw7lvf2vlkq4kwpq",
                    amount: 118999999943580,
                    bytes: "egu98td3unJ8ppbUF+pmRAoKd27sgX3EI0l3e+xKmfs=",
                    index: 0,
                    lock_type: 0,
                    type: 0,
                    utxo: "0x8f6f89c036491fb9ce8e2bf53de715bf2993a732461337d5ea0d0d69510dd9e4d16f4df751d610554536cb799d4c90c9b7b5ce92daeb90a98c6e4596c10dcbcb",
                },
                {
                    address: "boa1xplw00mldxs85l4vuxgse9szjwhtvv99vtp44e7slzwqa8mt6350vysxady",
                    amount: 118999999943580,
                    bytes: "fue/f2mgen6s4ZEMlgKTrrYwpWLDWufQ+JwOn2vUaPY=",
                    index: 1,
                    lock_type: 0,
                    type: 0,
                    utxo: "0x1dd7fefc990fc51b2b9d6059356bf112ce55ba5d86eede9ca93113178c2a1e1b23c6231d5ab95fa79581c69122dafbbbeb6e94686800479d8cbdac7a3a01201c",
                },
                {
                    address: "boa1xzcp004fmz534clzk23u3vqa03z7n432wf67rpsrxs6x5gzxm97ykl52436",
                    amount: 118999999943580,
                    bytes: "sBe+qdipGuPisqPIsB18RenWKnJ14YYDNDRqIEbZfEs=",
                    index: 2,
                    lock_type: 0,
                    type: 0,
                    utxo: "0x906f618a869c41983d99f1ebbdc568ead2be034bffa15bda5a8bb32ab06cf53f1c9b678c4ce506a5b46abb8150441beeab68ffc8fb7e919a4a66c7cb9c546225",
                },
                {
                    address: "boa1xzca00zkzjge2h7sc30d5durkkxeuf2fv9d0q4tyddpn5r8f93dwjdyatgp",
                    amount: 118999999943580,
                    bytes: "sde8VhSRlV/QxF7aN4O1jZ4lSWFa8FVka0M6DOksWuk=",
                    index: 3,
                    lock_type: 0,
                    type: 0,
                    utxo: "0x29f24d3b015e5f0387e796d6ff14c40001115566bc5f740f9f9a1f1eb110387a1e0b423c838624bf7cec34a5499c871f3a0bcb15b74e78be604ce1c6bdcfe2eb",
                },
                {
                    address: "boa1xrnm00uh8v7vv9vk2l8vlhz3feaz80c9s8mk9jmkwe5tx7ccwy4v7lmhny5",
                    amount: 118999999943580,
                    bytes: "57e/lzs8xhWWV87P3FFOeiO/BYH3Yst2dmizexhxKs8=",
                    index: 4,
                    lock_type: 0,
                    type: 0,
                    utxo: "0x0580876c00b96b187f7caca6df760b3e414cb0133775035cce16b41a806a542400f13890d6ba53e2da995f1927c3007a1ae3332d870540002c42432af1d3c7e3",
                },
            ],
            senders: [
                {
                    address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                    amount: 595000000000000,
                    bytes: "iPwVzjY2o9SYUSEg/Qm0n32kUeeLqMQdZnCCu3a4cgpHBskqtBlWOuCQlJ5erI6I0R4o68Im7QlVwhAbuu4xqgE=",
                    index: 0,
                    signature:
                        "0xec522046957581733f1c038c8483f8c7422d626de697481992ddcfed77edb7a50b5a7f1078fca7ba8a99e9a3f92eb80cfdabe280033e934d6691d2bfc7da4e84",
                    unlock_age: 0,
                    utxo: "0x30485ce1d2b6b44012dcacc94616adaf34f0c8d790ca9f74848a419d488d1c66425b4519484a7c6bb364b8bdc907d067f0bca056451b2606c9a6c8ce778d6065",
                },
            ],
            status: "Confirmed",
            time: 1609459800,
            tx_fee: "282100",
            tx_hash:
                "0xd37d727bae3cacb60cd89fc279f1edeb4cd6255670de570916bdb5e0dd4674b884e78957759066635fa4ee713580b3b578c5bdf2b7888030fd005c888b6c6c15",
            tx_size: 366,
            tx_type: "payment",
            unlock_height: "2",
            unlock_time: 1609460400,
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /wallet/transaction/history", async () => {
        const uri = URI(stoa_addr)
            .directory("/wallet/transaction/history")
            .filename("boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft")
            .setSearch("pageSize", "10")
            .setSearch("page", "1");

        const response = await client.get(uri.toString());
        assert.deepStrictEqual(response.data.header, {
            address: "boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft",
            page_size: 10,
            page: 1,
            total_page: 7,
            type: ["inbound", "outbound", "freeze", "payload"],
        });
        assert.strictEqual(response.data.items.length, 10);
        assert.strictEqual(response.data.items[0].display_tx_type, "inbound");
        assert.strictEqual(
            response.data.items[0].address,
            "boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft"
        );
        assert.strictEqual(
            response.data.items[0].peer,
            "boa1xqey0079077q0r0cy7unj753cdq3rkjjjz680rqj8rs72uw97tuzsjs60qq"
        );
        assert.strictEqual(response.data.items[0].peer_count, 1);
        assert.strictEqual(response.data.items[0].height, "9");
        assert.strictEqual(
            response.data.items[0].tx_hash,
            "0x43c567945c35e5c576261238c46fce1291dca42cfe6c98e54c778a85b91155b78fbc5a8a5c302aff6df8fee51bf887df15144c2e49d1d78dbb0e1ea6a17817b4"
        );
        assert.strictEqual(response.data.items[0].tx_type, "payment");
        assert.strictEqual(response.data.items[0].amount, "101018622697007");
        assert.strictEqual(response.data.items[0].unlock_height, "10");
        assert.strictEqual(response.data.items[0].tx_fee, 282102);
        assert.strictEqual(response.data.items[0].tx_size, 366);
    });

    it("Test of the path /wallet/transaction/history - Filtering - Wrong TransactionType", async () => {
        const uri = URI(stoa_addr)
            .directory("/wallet/transaction/history")
            .filename("boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "in,out");

        await assert.rejects(client.get(uri.toString()), {
            statusMessage: "Invalid transaction type: in,out",
        });
    });

    it("Test of the path /wallet/transaction/history - Filtering - TransactionType", async () => {
        const uri = URI(stoa_addr)
            .directory("/wallet/transaction/history")
            .filename("boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("type", "outbound");

        const response = await client.get(uri.toString());
        assert.deepStrictEqual(response.data.header, {
            address: "boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft",
            page_size: 10,
            page: 1,
            total_page: 2,
            type: ["outbound"],
        });
        assert.strictEqual(response.data.items.length, 10);
        assert.strictEqual(response.data.items[0].display_tx_type, "outbound");
        assert.strictEqual(
            response.data.items[0].address,
            "boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft"
        );
        assert.strictEqual(response.data.items[0].peer_count, 8);
        assert.strictEqual(response.data.items[0].height, "8");
        assert.strictEqual(response.data.items[0].tx_type, "payment");
        assert.strictEqual(response.data.items[0].amount, "-14775039842526");
        assert.strictEqual(
            response.data.items[0].tx_hash,
            "0xcfd9864c70ff69e7313dd8234b92a2d78512c8934747c90efc4edc93840d61b1b6ca712f40aae8e3874ccf932343b931df65d5d0dc2ef1d6805169d6a5615474"
        );
    });

    it("Test of the path /wallet/transaction/history - Filtering - Date", async () => {
        const uri = URI(stoa_addr)
            .directory("/wallet/transaction/history")
            .filename("boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("beginDate", "1609459200")
            .setSearch("endDate", "1609459900");

        const response = await client.get(uri.toString());
        assert.deepStrictEqual(response.data.header, {
            address: "boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft",
            page_size: 10,
            page: 1,
            total_page: 1,
            type: ["inbound", "outbound", "freeze", "payload"],
            begin_date: 1609459200,
            end_date: 1609459900,
        });
        assert.strictEqual(response.data.items.length, 5);
        assert.strictEqual(response.data.items[0].display_tx_type, "inbound");
        assert.strictEqual(
            response.data.items[0].address,
            "boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft"
        );
        assert.strictEqual(
            response.data.items[0].peer,
            "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
        );
        assert.strictEqual(response.data.items[0].peer_count, 1);
        assert.strictEqual(response.data.items[0].height, "1");
        assert.strictEqual(response.data.items[0].tx_type, "payment");
        assert.strictEqual(response.data.items[0].amount, "118999999943580");
        assert.strictEqual(
            response.data.items[0].tx_hash,
            "0xc0656ae6d41ddb69d2756f67b347c96d12564ecf9dd6461c7d96c6a8f5ae7f41ff9cb87f2e1493aa46fdff52c251938d411a4ded4d8363a2ac959ad387baf7de"
        );
    });

    it("Test of the path /wallet/transaction/history - Filtering - Peer", async () => {
        const uri = URI(stoa_addr)
            .directory("/wallet/transaction/history")
            .filename("boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap")
            .setSearch("pageSize", "10")
            .setSearch("page", "1")
            .setSearch("peer", "boa1xzgenes5cf8xel37");

        const response = await client.get(uri.toString());
        assert.deepStrictEqual(response.data.header, {
            address: "boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap",
            page_size: 10,
            page: 1,
            total_page: 1,
            type: ["inbound", "outbound", "freeze", "payload"],
            peer: "boa1xzgenes5cf8xel37",
        });
        assert.strictEqual(response.data.items.length, 3);
        assert.strictEqual(response.data.items[0].display_tx_type, "inbound");
        assert.strictEqual(
            response.data.items[0].address,
            "boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap"
        );
        assert.strictEqual(
            response.data.items[0].peer,
            "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"
        );
        assert.strictEqual(response.data.items[0].peer_count, 1);
        assert.strictEqual(response.data.items[0].height, "1");
        assert.strictEqual(response.data.items[0].tx_type, "payment");
        assert.strictEqual(response.data.items[0].amount, "118999999943580");
        assert.strictEqual(
            response.data.items[0].tx_hash,
            "0xc0656ae6d41ddb69d2756f67b347c96d12564ecf9dd6461c7d96c6a8f5ae7f41ff9cb87f2e1493aa46fdff52c251938d411a4ded4d8363a2ac959ad387baf7de"
        );
    });
});

describe("Test of Stoa API for the wallet with `sample_data`", function () {
    this.timeout(5000);
    const agora_addr: URL = new URL("http://localhost:2839");
    const stoa_addr: URL = new URL("http://localhost:3839");
    const stoa_private_addr: URL = new URL("http://localhost:4839");
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
            agora_server = new TestAgora(agora_addr.port, [], resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port);
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
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();

        await client.post(url, { block: sample_data[0] });
        await delay(1000);
        await client.post(url, { block: sample_data[1] });
        await delay(1000);
        await client.post(url, { block: sample_data2 });
        await delay(2000);
    });

    it("Test of the path /wallet/transaction/detail with payload", async () => {
        const uri = URI(stoa_addr)
            .directory("/wallet/transaction/detail")
            .filename(
                "0x18bcf5260063740ef60d4d283b655242a5cbf72616c2713882e4d15804cbc2c20d3d904c34509e6c736bc3425b37a381ef60c06c04f4f3edc6ef28c2976d598c"
            );

        const response = await client.get(uri.toString());
        const expected = {
            fee: "282100",
            height: "2",
            lock_height: "0",
            payload: "",
            payload_fee: "0",
            freezing_fee: "0",
            receivers: [
                {
                    address: "boa1xppz00cv25tjfkx93j998g90ggjmpyky64dtxuaqh5qxcxud5f9yww64cxq",
                    amount: 23799999932296,
                    bytes: "Qie/DFUXJNjFjIpToK9CJbCSxNVas3OgvQBsG42iSkc=",
                    index: 0,
                    lock_type: 0,
                    type: 0,
                    utxo: "0x3309a95bf02ebc1e6447dd354a29fdfc743f7619d901135c56a2c38d27dc0ae64b0125539f82f25d31d4c955252cfaff7e3c2feb858b8a76f4a454dd6efc13e2",
                },
                {
                    address: "boa1xpaqh00j6amm5unu56tdg9l2vezq5znhdmkgzlwyydyhw7lvf2vlkq4kwpq",
                    amount: 23799999932296,
                    bytes: "egu98td3unJ8ppbUF+pmRAoKd27sgX3EI0l3e+xKmfs=",
                    index: 1,
                    lock_type: 0,
                    type: 0,
                    utxo: "0x4389c1133fbcc316d09983c3c592daa72c249594f60a8a1cacef0892086e1b706ae5892b71c4fa08f00a3bf0f993b0fb7caaf0b23eea5ac292904e33943166e8",
                },
                {
                    address: "boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap",
                    amount: 23799999932296,
                    bytes: "epI98aAIo3+N4qCnxHNkvC0rhAK69lbCoWP3fNFZnio=",
                    index: 2,
                    lock_type: 0,
                    type: 0,
                    utxo: "0x0a09ec3eb67f770024f7d7ff75c39b592b9ccdc5a87f3f392c6e76766e303788b35017535fa0cae87b40cf4500753c4bbf68113d8f094d1526f928c20c1e9444",
                },
                {
                    address: "boa1xplw00mldxs85l4vuxgse9szjwhtvv99vtp44e7slzwqa8mt6350vysxady",
                    amount: 23799999932296,
                    bytes: "fue/f2mgen6s4ZEMlgKTrrYwpWLDWufQ+JwOn2vUaPY=",
                    index: 3,
                    lock_type: 0,
                    type: 0,
                    utxo: "0xae74e463628d8b685072e77d2f373963c756cf8c1f8496cb8b746e83efe3106e021d8a262fb5091aaf6be627cc5d6f8d6378140c81a8b5d77382913de2394793",
                },
                {
                    address: "boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft",
                    amount: 23799999932296,
                    bytes: "mDe9dh5S5JbRzncecjYqY6/Q3Q1hKQU4bqo+ocCiY5A=",
                    index: 4,
                    lock_type: 0,
                    type: 0,
                    utxo: "0x05f29d933474e5565770e60a97aa8f1d507b8923d58f0a6a26dc198dd7bde88e9142e7114253e226332519fee92e6e66474fd1fc4290f7dccb3d9ec9bacd8a77",
                },
            ],
            senders: [
                {
                    address: "boa1xpaqh00j6amm5unu56tdg9l2vezq5znhdmkgzlwyydyhw7lvf2vlkq4kwpq",
                    amount: 118999999943580,
                    bytes: "R1rBB6gepY2V8AdfRga3kmHlcYZp4jqX/EM5RsRTug19Rat9h5W0PmXP1nUxz1ni0+iOEiw0p8kxCKDoNjwWkgE=",
                    index: 0,
                    signature:
                        "0x6b96a00deaa4ab85fa12ec225590e567d4fc5712a1622ee4110432f8bd7682b40aa578b5837f72866d65893d5dc6fe780f81566d37b5800b0d2c03212bc1c706",
                    unlock_age: 0,
                    utxo: "0x75e5147e79da0e2e78ad765e0970fbc107f968b31ed3076de31a1da6f0ec5d8bc38bcfb6a269fb88cd585c6267de041c6d8326ff0318069cf9ee1b512229b539",
                },
            ],
            status: "Confirmed",
            time: 1609460400,
            tx_fee: "282100",
            tx_hash:
                "0x18bcf5260063740ef60d4d283b655242a5cbf72616c2713882e4d15804cbc2c20d3d904c34509e6c736bc3425b37a381ef60c06c04f4f3edc6ef28c2976d598c",
            tx_size: 366,
            tx_type: "payment",
            unlock_height: "3",
            unlock_time: 1609461000,
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /wallet/utxo - 3 UTXO", async () => {
        const amount = JSBI.BigInt("142799999875877");
        const uri = URI(stoa_addr)
            .directory("/wallet/utxo")
            .filename("boa1xrajh00as4l8u8jrvjtfqleae59nrzt8vnjpxf8ys6uzzmyarygfc7j2xx5")
            .setSearch("amount", amount.toString());

        const response = await client.get(uri.toString());
        const expected = [
            {
                amount: "118999999943580",
                height: "1",
                lock_bytes: "+yu9/YV+fh5DZJaQfz3NCzGJZ2TkEyTkhrghbJ0ZEJw=",
                lock_type: 0,
                time: 1609459800,
                type: 0,
                unlock_height: "2",
                utxo: "0x895b9afeb1b777044c43cdf09b544ee126fa1db5dd7636485a8d45846bec7d21ffba54f11522336c6438e84a508a0234e21311ec174e59dcdf9db27850c368e1",
            },
            {
                amount: "23799999932296",
                height: "2",
                lock_bytes: "+yu9/YV+fh5DZJaQfz3NCzGJZ2TkEyTkhrghbJ0ZEJw=",
                lock_type: 0,
                time: 1609460400,
                type: 0,
                unlock_height: "3",
                utxo: "0x28e1bd7918ccfef8cba316dba777f95574a113a670b75cf350ec6ef16f3d150a46275724a2639e4ec1b82a0512e5eea5f25087b78f680ecf9551c69f0362ccf4",
            },
            {
                amount: "23799999932296",
                height: "2",
                lock_bytes: "+yu9/YV+fh5DZJaQfz3NCzGJZ2TkEyTkhrghbJ0ZEJw=",
                lock_type: 0,
                time: 1609460400,
                type: 0,
                unlock_height: "3",
                utxo: "0x9965816ac0ab8e5ce59155fcef0939661be8fff8607e1a911df346068c3e9eac7abb2e0249533f57f3b002d5e971611459d25e7375a7b2b0b7bde7778ff4c867",
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
        const uri = URI(stoa_addr)
            .directory("/wallet/utxo")
            .filename("boa1xrajh00as4l8u8jrvjtfqleae59nrzt8vnjpxf8ys6uzzmyarygfc7j2xx5")
            .setSearch("amount", amount.toString());

        const response = await client.get(uri.toString());
        const expected = [
            {
                amount: "118999999943580",
                height: "1",
                lock_bytes: "+yu9/YV+fh5DZJaQfz3NCzGJZ2TkEyTkhrghbJ0ZEJw=",
                lock_type: 0,
                time: 1609459800,
                type: 0,
                unlock_height: "2",
                utxo: "0x895b9afeb1b777044c43cdf09b544ee126fa1db5dd7636485a8d45846bec7d21ffba54f11522336c6438e84a508a0234e21311ec174e59dcdf9db27850c368e1",
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
        const amount = JSBI.BigInt("23799999932296");
        const uri = URI(stoa_addr)
            .directory("/wallet/utxo")
            .filename("boa1xrajh00as4l8u8jrvjtfqleae59nrzt8vnjpxf8ys6uzzmyarygfc7j2xx5")
            .setSearch("amount", amount.toString())
            .setSearch(
                "last",
                "0x895b9afeb1b777044c43cdf09b544ee126fa1db5dd7636485a8d45846bec7d21ffba54f11522336c6438e84a508a0234e21311ec174e59dcdf9db27850c368e1"
            );

        const response = await client.get(uri.toString());
        const expected = [
            {
                amount: "23799999932296",
                height: "2",
                lock_bytes: "+yu9/YV+fh5DZJaQfz3NCzGJZ2TkEyTkhrghbJ0ZEJw=",
                lock_type: 0,
                time: 1609460400,
                type: 0,
                unlock_height: "3",
                utxo: "0x28e1bd7918ccfef8cba316dba777f95574a113a670b75cf350ec6ef16f3d150a46275724a2639e4ec1b82a0512e5eea5f25087b78f680ecf9551c69f0362ccf4",
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
        const uri = URI(stoa_addr)
            .directory("/wallet/utxo")
            .filename("boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8")
            .setSearch("amount", amount.toString())
            .setSearch("type", "1");

        const response = await client.get(uri.toString());
        const expected = [
            {
                amount: "20000000000000",
                height: "0",
                lock_bytes: "2d/QYt76oor16BDI7Zjo7u69xxoXckflZ2UUkckpy1I=",
                lock_type: 0,
                time: 1609459200,
                type: 1,
                unlock_height: "1",
                utxo: "0x0666c4d505b55b6840fbb669ec08a1849e699d5a30ba246989b65ea71292f8ac9a3d7126ca9061313d3225d6e324146f37cdc5dab51facbbc3beead6854e89a4",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });
});

describe("Test of the path /wallet/balance:address for payment", function () {
    this.timeout(10000);
    const agora_addr: URL = new URL("http://localhost:2901");
    const stoa_addr: URL = new URL("http://localhost:3901");
    const stoa_private_addr: URL = new URL("http://localhost:4901");
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    const blocks: Block[] = [];

    const address_1 = "boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap";
    const address_2 = "boa1xpaqh00j6amm5unu56tdg9l2vezq5znhdmkgzlwyydyhw7lvf2vlkq4kwpq";
    const address_3 = "boa1xplw00mldxs85l4vuxgse9szjwhtvv99vtp44e7slzwqa8mt6350vysxady";

    before("Bypassing middleware check", () => {
        FakeBlacklistMiddleware.assign();
    });

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora(agora_addr.port, [], resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    it("Store two blocks", async () => {
        blocks.push(Block.reviver("", sample_data[0]));
        blocks.push(Block.reviver("", sample_data[1]));
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: blocks[0] });
        await delay(1000);
        await client.post(url, { block: blocks[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Test of the balance with no pending transaction", async () => {
        const url_1 = URI(stoa_addr).directory("wallet/balance").filename(address_1).toString();

        const response_1 = await client.get(url_1);
        const expected_1 = {
            address: address_1,
            balance: "356999999830740",
            spendable: "356999999830740",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(response_1.data, expected_1);

        const url_2 = URI(stoa_addr).directory("wallet/balance").filename(address_2).toString();

        const response_2 = await client.get(url_2);
        const expected_2 = {
            address: address_2,
            balance: "832999999605060",
            spendable: "832999999605060",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(response_2.data, expected_2);
    });

    it("Test of pending payment transaction", async () => {
        // Get UTXO
        const utxo_uri = URI(stoa_addr)
            .directory("wallet/utxo")
            .filename(address_1)
            .setSearch("amount", BOA(2_439_999.999048).toString())
            .toString();

        const response_utxo = await client.get(utxo_uri);
        assert.deepStrictEqual(response_utxo.data.length, 1);

        // Create a payment transaction
        const tx = new Transaction(
            [
                new TxInput(
                    new Hash(response_utxo.data[0].utxo),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(OutputType.Payment, BOA(1_000_000), new PublicKey(address_2)),
                new TxOutput(OutputType.Payment, BOA(10_000), new PublicKey(address_1)),
                new TxOutput(OutputType.Payment, BOA(10_000), new PublicKey(address_1)),
                new TxOutput(OutputType.Payment, BOA(10_000), new PublicKey(address_1)),
                new TxOutput(OutputType.Payment, BOA(1_409_999.95), new PublicKey(address_1)),
            ],
            Buffer.alloc(0)
        );
        blocks.push(createBlock(blocks[blocks.length - 1], [tx]));

        // Send payment transaction
        const transaction_uri = URI(stoa_private_addr).directory("transaction_received").toString();
        await client.post(transaction_uri, { tx });
        await delay(500);

        const balance_1_url = URI(stoa_addr).directory("wallet/balance").filename(address_1).toString();

        // Check the balance with a pending transaction
        const balance_1_response = await client.get(balance_1_url);
        const balance_1_expected = {
            address: address_1,
            balance: "252399999387160",
            frozen: "0",
            locked: "14399999500000",
            spendable: "237999999887160",
        };
        assert.deepStrictEqual(balance_1_response.data, balance_1_expected);

        const balance_2_url = URI(stoa_addr).directory("wallet/balance").filename(address_2).toString();

        const balance_2_response = await client.get(balance_2_url);
        const balance_2_expected = {
            address: address_2,
            balance: "832999999605060",
            spendable: "832999999605060",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(balance_2_response.data, balance_2_expected);

        // Store the block - the pending transaction is stored
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: blocks[blocks.length - 1] });
        await delay(500);

        // Check the balance with no pending transaction
        const balance_1_response2 = await client.get(balance_1_url);
        const balance_1_expected2 = {
            address: address_1,
            balance: "252399999387160",
            spendable: "252399999387160",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(balance_1_response2.data, balance_1_expected2);

        const balance_2_response2 = await client.get(balance_2_url);
        const balance_2_expected2 = {
            address: address_2,
            balance: "842999999605060",
            spendable: "842999999605060",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(balance_2_response2.data, balance_2_expected2);
    });

    it("Test of pending payment transaction when has multi utxo", async () => {
        // Get UTXO
        const utxo_uri = URI(stoa_addr)
            .directory("wallet/utxo")
            .filename(address_1)
            .setSearch("amount", BOA(1_000_000).toString())
            .toString();

        const response_utxo = await client.get(utxo_uri);
        const utxos: IUnspentTxOutput[] = response_utxo.data;
        const sum = utxos.reduce<Amount>((sum, value) => Amount.add(sum, Amount.make(value.amount)), Amount.make(0));
        // Create a payment transaction
        const tx = new Transaction(
            response_utxo.data.map(
                (m: any) =>
                    new TxInput(new Hash(m.utxo), Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width))))
            ),
            [
                new TxOutput(OutputType.Payment, BOA(1_000_000), new PublicKey(address_2)),
                new TxOutput(OutputType.Payment, Amount.subtract(sum, BOA(1_000_000.05)), new PublicKey(address_1)),
            ],
            Buffer.alloc(0)
        );
        blocks.push(createBlock(blocks[blocks.length - 1], [tx]));

        // Send payment transaction
        const transaction_uri = URI(stoa_private_addr).directory("transaction_received").toString();
        await client.post(transaction_uri, { tx });
        await delay(500);

        const balance_url = URI(stoa_addr).directory("wallet/balance").filename(address_1).toString();

        // Check the balance with a pending transaction
        const balance_response = await client.get(balance_url);
        const balance_expected = {
            address: address_1,
            balance: "242399998887160",
            spendable: "133399999443580",
            frozen: "0",
            locked: "108999999443580",
        };
        assert.deepStrictEqual(balance_response.data, balance_expected);

        // Store the block - the pending transaction is stored
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: blocks[blocks.length - 1] });
        await delay(500);

        // Check the balance with no pending transaction
        const balance_response2 = await client.get(balance_url);
        const balance_expected2 = {
            address: address_1,
            balance: "242399998887160",
            spendable: "242399998887160",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(balance_response2.data, balance_expected2);
    });
});

describe("Test of the path /wallet/balance:address for freeze and unfreeze", function () {
    this.timeout(10000);
    const agora_addr: URL = new URL("http://localhost:2902");
    const stoa_addr: URL = new URL("http://localhost:3902");
    const stoa_private_addr: URL = new URL("http://localhost:4902");
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    const blocks: Block[] = [];

    const address_1 = "boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap";
    const address_2 = "boa1xqej00jh50l2me46pkd3dmkpdl6n4ugqss2ev3utuvpuvwhe93l9gjlmxzu";
    const address_3 = "boa1xplw00mldxs85l4vuxgse9szjwhtvv99vtp44e7slzwqa8mt6350vysxady";

    before("Bypassing middleware check", () => {
        FakeBlacklistMiddleware.assign();
    });

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora(agora_addr.port, [], resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    it("Store two blocks", async () => {
        blocks.push(Block.reviver("", sample_data[0]));
        blocks.push(Block.reviver("", sample_data[1]));
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: blocks[0] });
        await delay(1000);
        await client.post(url, { block: blocks[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Test of the balance with no pending transaction", async () => {
        const uri = URI(stoa_addr).directory("wallet/balance").filename(address_1);

        const response = await client.get(uri.toString());
        const expected = {
            address: address_1,
            balance: "356999999830740",
            spendable: "356999999830740",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of pending freeze transaction", async () => {
        // Get UTXO
        const utxo_uri = URI(stoa_addr)
            .directory("wallet/utxo")
            .filename(address_1)
            .setSearch("amount", BOA(2_439_999.999048).toString())
            .toString();

        const response_utxo = await client.get(utxo_uri);
        assert.deepStrictEqual(response_utxo.data.length, 1);

        // Create a freeze transaction
        const tx = new Transaction(
            [
                new TxInput(
                    new Hash(response_utxo.data[0].utxo),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(OutputType.Freeze, BOA(400_000), new PublicKey(address_3)),
                new TxOutput(OutputType.Payment, BOA(2_029_999.95), new PublicKey(address_1)),
            ],
            Buffer.alloc(0)
        );
        blocks.push(createBlock(blocks[blocks.length - 1], [tx]));

        // Send freeze transaction
        const transaction_uri = URI(stoa_private_addr).directory("transaction_received").toString();
        await client.post(transaction_uri, { tx });
        await delay(500);

        const balance_1_url = URI(stoa_addr).directory("wallet/balance").filename(address_1).toString();

        // Check the balance with a pending transaction
        const balance_1_response = await client.get(balance_1_url);
        const balance_1_expected = {
            address: address_1,
            balance: "258299999387160",
            spendable: "237999999887160",
            frozen: "0",
            locked: "20299999500000",
        };
        assert.deepStrictEqual(balance_1_response.data, balance_1_expected);

        const balance_3_url = URI(stoa_addr).directory("wallet/balance").filename(address_3).toString();

        // Check the balance with a pending transaction
        const balance_3_response = await client.get(balance_3_url);
        const balance_3_expected = {
            address: address_3,
            balance: "951999999548640",
            spendable: "951999999548640",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(balance_3_response.data, balance_3_expected);

        // Store the block - the pending transaction is stored
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: blocks[blocks.length - 1] });
        await delay(500);

        // Check the balance with no pending transaction
        const balance_1_response2 = await client.get(balance_1_url);
        const balance_1_expected2 = {
            address: address_1,
            balance: "258299999387160",
            spendable: "258299999387160",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(balance_1_response2.data, balance_1_expected2);

        // Check the balance with a pending transaction
        const balance_3_response2 = await client.get(balance_3_url);
        const balance_3_expected2 = {
            address: address_3,
            balance: "955999999548640",
            spendable: "951999999548640",
            frozen: "4000000000000",
            locked: "100000000000",
        };
        assert.deepStrictEqual(balance_3_response2.data, balance_3_expected2);
    });

    it("Test of pending unfreeze transaction", async () => {
        // Get UTXO
        const utxo_uri = URI(stoa_addr)
            .directory("wallet/utxo")
            .filename(address_3)
            .setSearch("amount", BOA(400_000).toString())
            .setSearch("type", "1")
            .toString();

        const response_utxo = await client.get(utxo_uri);
        assert.deepStrictEqual(response_utxo.data.length, 1);
        assert.deepStrictEqual(response_utxo.data[0].amount, BOA(400_000).toString());

        // Create a freeze transaction
        const tx = new Transaction(
            [
                new TxInput(
                    new Hash(response_utxo.data[0].utxo),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [new TxOutput(OutputType.Payment, BOA(499_999.95), new PublicKey(address_3))],
            Buffer.alloc(0)
        );
        blocks.push(createBlock(blocks[blocks.length - 1], [tx]));

        // Send freeze transaction
        const transaction_uri = URI(stoa_private_addr).directory("transaction_received").toString();
        await client.post(transaction_uri, { tx });
        await delay(500);

        // Check the balance with a pending transaction
        const balance_url = URI(stoa_addr).directory("wallet/balance").filename(address_3).toString();
        const balance_response = await client.get(balance_url);
        const balance_expected = {
            address: address_3,
            balance: "956999999048640",
            spendable: "951999999548640",
            frozen: "0",
            locked: "4999999500000",
        };
        assert.deepStrictEqual(balance_response.data, balance_expected);

        // Store the block - the pending transaction is stored
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: blocks[blocks.length - 1] });
        await delay(500);

        // Check the balance with no pending transaction
        const balance_response2 = await client.get(balance_url);
        const balance_expected2 = {
            address: address_3,
            balance: "956999999048640",
            spendable: "951999999548640",
            frozen: "0",
            locked: "4999999500000",
        };
        assert.deepStrictEqual(balance_response2.data, balance_expected2);
    });
});

describe("Test of the path /wallet/balance:address for double spending", function () {
    this.timeout(10000);
    const agora_addr: URL = new URL("http://localhost:2904");
    const stoa_addr: URL = new URL("http://localhost:3904");
    const stoa_private_addr: URL = new URL("http://localhost:4904");
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    const blocks: Block[] = [];

    const address_1 = "boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap";
    const address_2 = "boa1xpaqh00j6amm5unu56tdg9l2vezq5znhdmkgzlwyydyhw7lvf2vlkq4kwpq";

    before("Bypassing middleware check", () => {
        FakeBlacklistMiddleware.assign();
    });

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora(agora_addr.port, [], resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    it("Store two blocks", async () => {
        blocks.push(Block.reviver("", sample_data[0]));
        blocks.push(Block.reviver("", sample_data[1]));
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: blocks[0] });
        await delay(1000);
        await client.post(url, { block: blocks[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Test of the balance with no pending transaction", async () => {
        const uri = URI(stoa_addr).directory("wallet/balance").filename(address_1);

        const response = await client.get(uri.toString());
        const expected = {
            address: address_1,
            balance: "356999999830740",
            spendable: "356999999830740",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of pending payment transaction", async () => {
        // Get UTXO
        const utxo_uri = URI(stoa_addr)
            .directory("wallet/utxo")
            .filename(address_1)
            .setSearch("amount", BOA(2_439_999.999048).toString())
            .toString();

        const response_utxo = await client.get(utxo_uri);
        assert.deepStrictEqual(response_utxo.data.length, 1);

        // Create a payment transaction 1
        const tx1 = new Transaction(
            [
                new TxInput(
                    new Hash(response_utxo.data[0].utxo),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(OutputType.Payment, BOA(1_000_000), new PublicKey(address_2)),
                new TxOutput(OutputType.Payment, BOA(1_439_999.95), new PublicKey(address_1)),
            ],
            Buffer.alloc(0)
        );

        // Send payment transaction 1
        const transaction_uri = URI(stoa_private_addr).directory("transaction_received").toString();
        await client.post(transaction_uri, { tx: tx1 });
        await delay(500);

        const balance_url = URI(stoa_addr).directory("wallet/balance").filename(address_1).toString();

        // Check the balance with a pending transaction 1
        const balance_response_tx1 = await client.get(balance_url);
        const balance_expected_tx1 = {
            address: address_1,
            balance: "252399999387160",
            spendable: "237999999887160",
            frozen: "0",
            locked: "14399999500000",
        };
        assert.deepStrictEqual(balance_response_tx1.data, balance_expected_tx1);

        // Create a payment transaction 2
        const tx2 = new Transaction(
            [
                new TxInput(
                    new Hash(response_utxo.data[0].utxo),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(OutputType.Payment, BOA(2_000_000), new PublicKey(address_2)),
                new TxOutput(OutputType.Payment, BOA(439_999), new PublicKey(address_1)),
            ],
            Buffer.alloc(0)
        );

        // Send payment transaction 2
        await client.post(transaction_uri, { tx: tx2 });
        await delay(500);

        // Check the balance with a pending transaction 2
        const balance_response_tx2 = await client.get(balance_url);
        const balance_expected_tx2 = {
            address: address_1,
            balance: "242399989887160",
            spendable: "237999999887160",
            frozen: "0",
            locked: "4399990000000",
        };
        assert.deepStrictEqual(balance_response_tx2.data, balance_expected_tx2);

        // Store the block - the pending transaction is stored
        blocks.push(createBlock(blocks[blocks.length - 1], [tx1]));
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: blocks[blocks.length - 1] });
        await delay(500);

        // Check the balance with no pending transaction
        const balance_response2 = await client.get(balance_url);
        const balance_expected2 = {
            address: address_1,
            balance: "252399999387160",
            spendable: "252399999387160",
            frozen: "0",
            locked: "0",
        };
        assert.deepStrictEqual(balance_response2.data, balance_expected2);
    });
});

describe("Test the message transmission module when the balance changes and new block are created", function () {
    this.timeout(20000);
    const port = 5000 + Math.floor(Math.random() * 1000);
    const agora_addr: URL = new URL(`http://localhost:${port.toString()}`);
    const stoa_addr: URL = new URL(`http://localhost:${(port + 1000).toString()}`);
    const stoa_private_addr: URL = new URL(`http://localhost:${(port + 2000).toString()}`);
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    const blocks: Block[] = [];

    const address_1 = "boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft";
    const address_2 = "boa1xzl09lfa0nvtsr0dhf5hhgan7kd8st753hay62ufgwhksjnx98vd6hrv2d5";
    const address_3 = "boa1xqx0039s4ulz2n9cqalv04pgphf79q09csw0w9lyfv52mmlc6ynhzjzgyex";
    const address_4 = "boa1xpy00m8r9qpmkh8zznkn3jc9w9n3t6x3wdzx4sdsd9xqjk3m0dwzx9ecvul";

    before("Bypassing middleware check", () => {
        FakeBlacklistMiddleware.assign();
    });

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora(agora_addr.port, [], resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port);
        await stoa_server.createStorage();
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    it("Store two blocks", async () => {
        blocks.push(Block.reviver("", sample_data[0]));
        blocks.push(Block.reviver("", sample_data[1]));
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: blocks[0] });
        await client.post(url, { block: blocks[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Distribute funds to addresses. address_2, address_3, address_4", async () => {
        // Get UTXO
        const utxo_uri = URI(stoa_addr)
            .directory("wallet/utxo")
            .filename(address_1)
            .setSearch("amount", BOA(2_439_999.999048).toString())
            .toString();

        const response_utxo = await client.get(utxo_uri);
        assert.deepStrictEqual(response_utxo.data.length, 1);

        // Create a payment transaction
        const tx = new Transaction(
            [
                new TxInput(
                    new Hash(response_utxo.data[0].utxo),
                    Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                ),
            ],
            [
                new TxOutput(OutputType.Payment, BOA(10_000), new PublicKey(address_2)),
                new TxOutput(OutputType.Payment, BOA(10_000), new PublicKey(address_3)),
                new TxOutput(OutputType.Payment, BOA(10_000), new PublicKey(address_4)),
                new TxOutput(OutputType.Payment, BOA(1_509_999.95), new PublicKey(address_1)),
            ],
            Buffer.alloc(0)
        );
        blocks.push(createBlock(blocks[blocks.length - 1], [tx]));

        // Store the block - the pending transaction is stored
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: blocks[blocks.length - 1] });
        await delay(2000);
    });

    it("Check the received message when the balance changes and new block are created", async () => {
        const socket = io(stoa_addr.toString());
        const received_data: any[] = [];
        socket.on("new_tx_acc", (data: { address: string }) => {
            received_data.push(data);
        });
        socket.emit("subscribe", { address: "block" });
        socket.emit("subscribe", { address: address_2 });
        socket.emit("subscribe", { address: address_4 });

        await delay(1000);

        const txs: Transaction[] = [];

        // query UTXO and build transaction, send transaction
        const sendTransaction = async (send_address: string): Promise<Transaction> => {
            const utxo_uri = URI(stoa_addr)
                .directory("wallet/utxo")
                .filename(send_address)
                .setSearch("amount", BOA(10_000).toString())
                .toString();
            const response_utxo = await client.get(utxo_uri);

            // Create a payment transaction
            const tx = new Transaction(
                [
                    new TxInput(
                        new Hash(response_utxo.data[0].utxo),
                        Unlock.fromSignature(new Signature(Buffer.alloc(Signature.Width)))
                    ),
                ],
                [new TxOutput(OutputType.Payment, BOA(9_999), new PublicKey(send_address))],
                Buffer.alloc(0)
            );

            // Send payment transaction
            const transaction_uri = URI(stoa_private_addr).directory("transaction_received").toString();
            await client.post(transaction_uri, { tx });

            return tx;
        };

        // Spend UTXO of address 2
        txs.push(await sendTransaction(address_2));
        await delay(1000);

        // Spend UTXO of address 3
        txs.push(await sendTransaction(address_3));
        await delay(1000);

        // Spend UTXO of address 4
        txs.push(await sendTransaction(address_4));
        await delay(1000);

        // Store the block
        blocks.push(createBlock(blocks[blocks.length - 1], txs));
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: blocks[blocks.length - 1] });
        await delay(1000);

        // address_3 isn't subscribed
        const expected = [
            { address: address_2, tx_hash: hashFull(txs[0]).toString(), type: "pending" },
            { address: address_4, tx_hash: hashFull(txs[2]).toString(), type: "pending" },
            { address: address_2, tx_hash: hashFull(txs[0]).toString(), type: "confirm" },
            { address: address_4, tx_hash: hashFull(txs[2]).toString(), type: "confirm" },
        ];

        assert.deepStrictEqual(received_data, expected);

        socket.disconnect();
    });
});
