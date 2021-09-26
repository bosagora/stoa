/*******************************************************************************

    Test API Server Stoa

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    BitMask,
    Block,
    BlockHeader,
    Enrollment,
    Hash,
    Height,
    JSBI,
    OutputType,
    PublicKey,
    Signature,
    SodiumHelper,
    Transaction,
    TxInput,
    TxOutput
} from "boa-sdk-ts";
import {
    createBlock,
    delay,
    FakeBlacklistMiddleware,
    sample_data,
    sample_data2,
    sample_preImageInfo,
    TestAgora,
    TestClient,
    TestStoa,
    TestVoteraServer,
} from "./Utils";

import * as assert from "assert";
import { BOASodium } from "boa-sodium-ts";
import URI from "urijs";
import { URL } from "url";
import { AgoraClient } from "../src/modules/agora/AgoraClient";
import { IDatabaseConfig } from "../src/modules/common/Config";
import { MockDBConfig } from "./TestConfig";
import { VoteraService } from "../src/modules/service/VoteraService";

describe("Test of Stoa API Server", () => {
    const agora_addr: URL = new URL("http://localhost:2802");
    const stoa_addr: URL = new URL("http://localhost:3802");
    const stoa_private_addr: URL = new URL("http://localhost:4802");
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
            agora_server = new TestAgora(agora_addr.port, sample_data, resolve);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port);
        await stoa_server.createStorage();
    });

    before("Start TestStoa", async () => {
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    it("Test of the path /block_externalized", async () => {
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: sample_data[0] });
        await client.post(url, { block: sample_data[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(500);
    });

    it("Test of the path /block_height", async () => {
        const uri = URI(stoa_addr).filename("block_height");

        const url = uri.toString();
        const response = await client.get(url);
        assert.strictEqual(response.data, "1");
    });

    it("Test of the path /validators", async () => {
        const uri = URI(stoa_addr).directory("validators").setSearch("height", "10");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 6);
        assert.strictEqual(response.data[0].address, "boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t");
        assert.strictEqual(response.data[0].preimage.height, "");
    });

    it("Test of the path /validator", async () => {
        const uri = URI(stoa_addr)
            .directory("validator")
            .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
            .setSearch("height", "10");

        const fail_uri = URI(stoa_addr)
            .directory("validator")
            .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
            .setSearch("height", "99");

        await assert.rejects(client.get(fail_uri.toString()), {
            statusMessage:
                "The validator data not found.'address': (boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku), 'height': (99)",
        });

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].address, "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku");
        assert.strictEqual(response.data[0].preimage.height, "");
    });

    it("Tests that sending a pre-image with get /validator and /validators", async () => {
        const uri = URI(stoa_private_addr).directory("preimage_received");
        const response1 = await client.post(uri.toString(), { preimage: sample_preImageInfo });
        assert.strictEqual(response1.status, 200);

        await delay(500);

        // Wait for the data added to the pool to be processed.
        const uri1 = URI(stoa_addr)
            .directory("validator")
            .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
            .setSearch("height", "0");

        let response = await client.get(uri1.toString());

        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].preimage.height, "0");
        assert.strictEqual(
            response.data[0].preimage.hash,
            "0x0a8201f9f5096e1ce8e8de4147694940a57a188b78293a55144fc8777a774f2349b3a910fb1fb208514fb16deaf49eb05882cdb6796a81f913c6daac3eb74328"
        );

        const uri2 = URI(stoa_addr)
            .directory("validator")
            .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
            .setSearch("height", "6");

        response = await client.get(uri2.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].preimage.height, "6");
        assert.strictEqual(
            response.data[0].preimage.hash,
            "0x790ab7c8f8ddbf012561e70c944c1835fd1a873ca55c973c828164906f8b35b924df7bddcafade688ad92cfb4414b2cf69a02d115dc214bbd00d82167f645e7e"
        );

        const uri3 = URI(stoa_addr)
            .directory("validator")
            .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
            .setSearch("height", "1");
        response = await client.get(uri3.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].preimage.height, "1");
        assert.strictEqual(
            response.data[0].preimage.hash,
            "0x314e30482fd0b498361e8537961d875e52b7e82edb8260cd548d3edacb451c80f41dd0ba9c5700adfb646066d41b0031120b65cba2df91def9bd83263fb306bd"
        );

        const uri4 = URI(stoa_addr)
            .directory("validator")
            .filename("boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku")
            .setSearch("height", "8");
        response = await client.get(uri4.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(response.data[0].preimage.height, "");
        assert.strictEqual(response.data[0].preimage.hash, new Hash(Buffer.alloc(Hash.Width)).toString());

        const uri5 = URI(stoa_addr).directory("validators");
        response = await client.get(uri5.toString());
        let validators: any[] = response.data;
        assert.strictEqual(response.data.length, 6);
        let validator = validators.find(
            (n) => n.address === "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku"
        );
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.preimage.height, "1");
        assert.strictEqual(
            validator.preimage.hash,
            "0x314e30482fd0b498361e8537961d875e52b7e82edb8260cd548d3edacb451c80f41dd0ba9c5700adfb646066d41b0031120b65cba2df91def9bd83263fb306bd"
        );

        // re-enrollment
        const enroll_sig = new Signature(
            "0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8125cf6b04274cc4db34bfd"
        );
        const utxo_key = new Hash(
            "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f"
        );
        const commitment = new Hash(
            "0xe0c04a5bd47ffc5b065b7d397e251016310c43dc77220bf803b73f1183da00b0e67602b1f95cb18a0059aa1cdf2f9adafe979998364b38cd5c15d92b9b8fd815"
        );
        const enrollment = new Enrollment(utxo_key, commitment, enroll_sig);
        const header = new BlockHeader(
            new Hash(Buffer.alloc(Hash.Width)),
            new Height("20"),
            new Hash(Buffer.alloc(Hash.Width)),
            BitMask.fromString(""),
            new Signature(Buffer.alloc(Signature.Width)),
            [enrollment],
            new Hash(Buffer.alloc(Hash.Width)),
            [],
            0
        );
        const block = new Block(header, [], []);

        // put the re-enrollment
        await stoa_server.ledger_storage.putEnrollments(block);

        const uri6 = URI(stoa_addr).directory("validators").setSearch("height", "21");

        response = await client.get(uri6.toString());
        validators = response.data;
        assert.strictEqual(response.data.length, 1);

        validator = validators.find(
            (n) => n.address === "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku"
        );
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.stake, enrollment.utxo_key.toString());
        assert.strictEqual(validator.enrolled_at, "20");

        // let uri7 = URI(host)
        // .port(port)
        // .directory("validators")
        // .setSearch("height", "20");

        // response = await client.get(uri7.toString());
        // console.log(response);
        // assert.strictEqual(response.data.length, 1);

        // assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
        // assert.strictEqual(response.data[0].enrolled_at, "19");

        // let uri8 = URI(host)
        // .port(port)
        // .directory("validators")
        // .setSearch("height", "39");

        // response = await client.get (uri8.toString());
        // assert.strictEqual(response.data.length, 1);

        // assert.strictEqual(response.data[0].stake, enrollment.utxo_key.toString());
        // assert.strictEqual(response.data[0].enrolled_at, "19");

        // let uri9 = URI(host)
        // .port(port)
        // .directory("validators")
        // .setSearch("height", "40");

        // await assert.rejects(
        //     client.get(uri9.toString()),
        //     {statusMessage: "No validator exists for block height."}
        // );

        // /**
        //  * To do
        //  * The preimage_reserved service requires improvement and modification.
        //  * See Stoa.ts putPreImage(req, res);
        //  */
        // Wait for the data added to the pool to be processed.
        // setTimeout(async () =>
        // {
        //     // push the re-enroll's preImage
        //     let uri10 = URI(host)
        //     .port(port)
        //     .directory("preimage_received");
        //     let response = await client.post (uri10.toString(), {preimage: sample_reEnroll_preImageInfo});
        //     assert.strictEqual(response.status, 200);
        // }, 200);
        //
        // // Wait for the data added to the pool to be processed.
        // setTimeout(async () =>
        // {
        //     let uri11 = URI(host)
        //     .port(port)
        //     .directory("validators")
        //     .setSearch("height", "21");
        //
        //     let response = await client.get (uri11.toString());
        //     assert.strictEqual(response.data.length, 1);
        //     console.log(response.data);
        //     assert.strictEqual(response.data[0].preimage.height, 1);
        //     assert.strictEqual(response.data[0].preimage.hash, sample_reEnroll_preImageInfo.hash);
        // }, 300);
    });

    it("Test of the path /wallet/blocks/header", async () => {
        let uri = URI(stoa_addr).directory("/wallet/blocks/header");

        let response = await client.get(uri.toString());
        assert.strictEqual(response.data.height, "1");
        assert.strictEqual(
            response.data.hash,
            "0x100057b7dfdcee4174231ed110d48e420276745ebfa5c307e28754facbeb4b33267cde253d91da336b1f3a5ad6a0fb6cb514b611b1d70638659becd09780c11d"
        );
        assert.strictEqual(
            response.data.merkle_root,
            "0x515a30d31fbd031d63f041b92184f32baf00d08e4120da9299bc336c6f980f2245b11e70bb1dcb7c2279ead9dab1c37b62dee8414083ae8346d166cf033cddfb"
        );
        assert.strictEqual(response.data.time_stamp, 1609459800);

        uri = URI(stoa_addr).directory("/wallet/blocks/header").setSearch("height", "0");

        response = await client.get(uri.toString());
        assert.strictEqual(response.data.height, "0");
        assert.strictEqual(
            response.data.hash,
            "0x891808f2bada31adeab0e312775cef39ba5c301bf6cce97d06b54c626ec2ed53a5475b224f63f779d405f1441d2121e1285f173347e650b65e77d00f344fdaea"
        );
        assert.strictEqual(
            response.data.merkle_root,
            "0x67218493be437c25dc5884abdc8ee40e61f0af79aa9af8ab9bd8b0632eaaca238b4c054f114b046da0d5911b1b205ba540d07c5dc01560beafe564e5f3d101c9"
        );
        assert.strictEqual(response.data.time_stamp, 1609459200);
    });

    it("Test of the path /transaction_received", async () => {
        const uri = URI(stoa_private_addr).directory("transaction_received");

        const url = uri.toString();
        const block = Block.reviver("", sample_data2);
        await client.post(url, { tx: block.txs[0] });
        await delay(500);
    });

    it("Test of the path /wallet/transactions/pending/:address", async () => {
        const uri = URI(stoa_addr)
            .directory("/wallet/transactions/pending")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 1);
        assert.strictEqual(
            response.data[0].tx_hash,
            "0x35917fba7333947cfbc086164e81c1ad7b98dc6a4c61822a89f6eb061b29e956c5c964a2d4b9cce9a2119244e320091b20074351ab288e07f9946b9dcc4735a7"
        );
        assert.strictEqual(response.data[0].address, "boa1xqcmmns5swnm03zay5wjplgupe65uw4w0dafzsdsqtwq6gv3h3lcz24a8ch");
        assert.strictEqual(response.data[0].amount, "24398336340880");
        assert.strictEqual(response.data[0].fee, "1663649600");
        assert.strictEqual(response.data[0].block_delay, 0);
    });

    it("Test of the path /transaction/status/:hash", async () => {
        let uri = URI(stoa_addr)
            .directory("/transaction/status")
            .filename(
                "0x35917fba7333947cfbc086164e81c1ad7b98dc6a4c61822a89f6eb061b29e956c5c964a2d4b9cce9a2119244e320091b20074351ab288e07f9946b9dcc4735a7"
            );

        const response_pending = await client.get(uri.toString());
        const expected_pending = {
            status: "pending",
            tx_hash:
                "0x35917fba7333947cfbc086164e81c1ad7b98dc6a4c61822a89f6eb061b29e956c5c964a2d4b9cce9a2119244e320091b20074351ab288e07f9946b9dcc4735a7",
        };
        assert.deepStrictEqual(response_pending.data, expected_pending);

        uri = URI(stoa_addr)
            .directory("/transaction/status")
            .filename(
                "0xfbaaebc15bb1618465077fed2425a826d88c7f5ae0197634f056bfbad12a7a74b28cc82951e889255e149707bd3ef64eb01121875c766b5d24afed176d7d255c"
            );

        const response_confirmed = await client.get(uri.toString());
        const expected_confirmed = {
            status: "confirmed",
            tx_hash:
                "0xfbaaebc15bb1618465077fed2425a826d88c7f5ae0197634f056bfbad12a7a74b28cc82951e889255e149707bd3ef64eb01121875c766b5d24afed176d7d255c",
            block: {
                height: 1,
                hash: "0x100057b7dfdcee4174231ed110d48e420276745ebfa5c307e28754facbeb4b33267cde253d91da336b1f3a5ad6a0fb6cb514b611b1d70638659becd09780c11d",
            },
        };
        assert.deepStrictEqual(response_confirmed.data, expected_confirmed);
    });

    it("Test of the path /transaction/pending/:hash", async () => {
        const uri = URI(stoa_addr)
            .directory("/transaction/pending")
            .filename(
                "0x35917fba7333947cfbc086164e81c1ad7b98dc6a4c61822a89f6eb061b29e956c5c964a2d4b9cce9a2119244e320091b20074351ab288e07f9946b9dcc4735a7"
            );

        const response = await client.get(uri.toString());
        const expected = {
            inputs: [
                {
                    utxo: "0x6c985ecd25f0dbfd201bc73b6c994c7ac40bcaf7506712afbcc25ebbb1a00435440868c4943c8b851ffb9401d192d27ca9473627972401508e0b022047bd88b6",
                    unlock: {
                        bytes: "g5qWM1z8SDAcI0aGbiq7r13dD7f13bRR0MoX0XddbAuzPdB1AfRoZtca/6SYpNn4ESkxPj6TXU8Z0ThwFT+iSA==",
                    },
                    unlock_age: 0,
                },
            ],
            outputs: [
                {
                    type: 0,
                    value: "12199168170440",
                    lock: {
                        type: 0,
                        bytes: "Mb3OFIOnt8RdJR0g/RwOdU46rnt6kUGwAtwNIZG8f4E=",
                    },
                },
                {
                    type: 0,
                    value: "12199168170440",
                    lock: {
                        type: 0,
                        bytes: "/ye9nnESViX42pd20OsHAGDIpltHdV7pIPfUVw228yo=",
                    },
                },
            ],
            payload:
                "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==",
            lock_height: "0",
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /transaction/:hash", async () => {
        const uri = URI(stoa_addr)
            .directory("/transaction")
            .filename(
                "0xfbaaebc15bb1618465077fed2425a826d88c7f5ae0197634f056bfbad12a7a74b28cc82951e889255e149707bd3ef64eb01121875c766b5d24afed176d7d255c"
            );

        const response = await client.get(uri.toString());
        const expected = {
            inputs: [
                {
                    utxo: "0xb9794167a781561298bcb0f634346c85e56fba3f26c641e52dbf0066e8fb0b96d278cdd4c22c7e9885fceb307368e4130aaebd7800905c27c6a6e09870d8d9ca",
                    unlock: {
                        bytes: "hvGnaqLBxgLqF50qjzut5L08UpWW4ILnlDZ89xL2uABVd8tl0F66xXe9llkZ/vCJCmC03DbID7DMXZ3rOjL+HQ==",
                    },
                    unlock_age: 0,
                },
            ],
            outputs: [
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "OjG98m16c26s8H7QSu3taAZmpkXXldHS35/RN1PJI0E=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "Ojk96+0F1fNfmtl039XW7LafwCw77dYDvo7G7NIFnLs=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "Oju9/YiKHC70YvTKMXbeqIujoLe+deR16FlKxIJOAIw=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ejI9/X5zwED6yXnwiZ0dhihufi8wqU+iRPaACqGcsP8=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ejW9+kZ1tu6JdMV3LRzEYY9cD5tAjnnO4nGYF6+zam4=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ejc98/bE1PYSXYLssjNOFJ5wxMgCZlhe1UHVrZQtecs=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ejw94GMKeuLPesbtpNxgN7+6BnCTHv3rgCllDdrrqq8=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ej295eI1Empe2oz1Sx4EtYKtyyHkyGyXu1myj6BBbMw=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ej+96L75IWIDWeXcSfqDQPeqEYV5+WMgmU/XMJVkCdo=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ewa97U1wMlSffch4BHNpepAZ2bNMrkb3mRjjwfp6P5Y=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "eww9+9QkOYbvvLSy6hQedwcPqncK+a3mSHPdr+lJyEw=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ew699nDzRZB+ACW4a70WakpM2RX8RaZ6Yw6BXu7073M=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ujM9/CrfXmdQsQuC4ji1APZB1yWvRL+W0XExjfCmB/c=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ujQ95gz90DDVs6WlhtMlFsQOmEGu44BLTT9BHyVR3dE=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "ujS989FoU5AN3sVNiTxtO0VJ75IS03mXraj6yZ47ixE=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "uj496a3T/CmS/lSA+eBLsnBTWYOU6tH3oaUL0HDKoQw=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "+jA99UOtdwtOBmftagyTGmnOJdNHEj27r+ys/cdyRvw=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "+jC98n7qANALrxKKKHyuisgsOjhz+Y5mAMsKfLSK/h0=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "+jE95blgPL0nc3KT9gXlXV1q4VWgZnvy64gzUZoJkLs=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "+jY9+XHS4Nj510Ezlw2bIG91kR9x+jLUH4tuLl6jZSY=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "+ja9+iX6EamiWvodERH7xsoRJa3bPe0yoKzr3I474S8=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "+jg95K/C2cKhYo+ORjdoFubre9be/Cd+wQNHIixGokw=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "+jm9+y2/Uj+Kzu2J3v0S/ccaIAt/SVdLNlw7Cjk/xbs=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "+js9+6BmXaLLEIfa1QuhF75/wviB9cXlHq6jFk33vGk=",
                    },
                },
                {
                    type: 0,
                    value: "24399999990480",
                    lock: {
                        type: 0,
                        bytes: "+jy99QRsbfDR6l/NzPF2cICQ2uYXpzzh54KU7XbfQhk=",
                    },
                },
            ],
            payload: "",
            lock_height: "0",
        };
        assert.deepStrictEqual(response.data, expected);
    });
});

describe("Test of the path /utxo", () => {
    const agora_addr: URL = new URL("http://localhost:2803");
    const stoa_addr: URL = new URL("http://localhost:3803");
    const stoa_private_addr: URL = new URL("http://localhost:4803");
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

    it("Store two blocks", async () => {
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: sample_data[0] });
        await client.post(url, { block: sample_data[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Test of the path /utxo no pending transaction ", async () => {
        const uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

        const response = await client.get(uri.toString());
        const expected = [
            {
                utxo: "0x6c985ecd25f0dbfd201bc73b6c994c7ac40bcaf7506712afbcc25ebbb1a00435440868c4943c8b851ffb9401d192d27ca9473627972401508e0b022047bd88b6",
                type: 0,
                unlock_height: "2",
                amount: "24399999990480",
                height: "1",
                time: 1609459800,
                lock_type: 0,
                lock_bytes: "ejw94GMKeuLPesbtpNxgN7+6BnCTHv3rgCllDdrrqq8=",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Store one pending transaction", async () => {
        const uri = URI(stoa_private_addr).directory("transaction_received");

        const url = uri.toString();
        await client.post(url, { tx: Block.reviver("", sample_data2).txs[0] });
        await delay(500);
    });

    it("Test of the path /utxo with pending transaction ", async () => {
        const uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.length, 0);
    });

    it("Test getting fees of the transaction", async () => {
        const uri = URI(stoa_addr).directory("transaction/fees").filename("1000");

        const response = await client.get(uri.toString());
        assert.strictEqual(response.data.medium, "700000");
        assert.strictEqual(response.data.low, "700000");
        assert.strictEqual(response.data.high, "770000");
    });

    it("Test getting height at", async () => {
        const zero = 1609459200;
        const one = zero + 10 * 60;

        const no_exist = zero - 10 * 60;
        let uri = URI(stoa_addr).directory("block_height_at").filename(no_exist.toString());
        let response = await client.get(uri.toString());
        assert.strictEqual(response.statusText, "No Content");

        uri = URI(stoa_addr).directory("block_height_at").filename(one.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "1");

        const one_alpha = one + 1;
        uri = URI(stoa_addr).directory("block_height_at").filename(one_alpha.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "1");

        const one_beta = one - 1;
        uri = URI(stoa_addr).directory("block_height_at").filename(one_beta.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "0");

        const hundred = zero + 100 * 10 * 60;
        uri = URI(stoa_addr).directory("block_height_at").filename(hundred.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "100");

        const hundred_alpha = hundred + 1;
        uri = URI(stoa_addr).directory("block_height_at").filename(hundred_alpha.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "100");

        const hundred_beta = hundred - 1;
        uri = URI(stoa_addr).directory("block_height_at").filename(hundred_beta.toString());
        response = await client.get(uri.toString());
        assert.strictEqual(response.data, "99");
    });
});

describe("Test of the path /utxo for freezing", () => {
    const agora_addr: URL = new URL("http://localhost:2804");
    const stoa_addr: URL = new URL("http://localhost:3804");
    const stoa_private_addr: URL = new URL("http://localhost:4804");
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;

    const blocks: Block[] = [];

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();

        blocks.push(Block.reviver("", sample_data[0]));
        blocks.push(Block.reviver("", sample_data[1]));
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
        const uri = URI(stoa_private_addr).directory("block_externalized");

        const url = uri.toString();
        await client.post(url, { block: sample_data[0] });
        await client.post(url, { block: sample_data[1] });
        // Wait for the block to be stored in the database for the next test.
        await delay(2000);
    });

    it("Test of /utxos - Get UTXO information", async () => {
        const uri = URI(stoa_addr).directory("utxos");

        const utxo_hash = [
            "0x6c985ecd25f0dbfd201bc73b6c994c7ac40bcaf7506712afbcc25ebbb1a00435440868c4943c8b851ffb9401d192d27ca9473627972401508e0b022047bd88b6",
            "0x6fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673",
            "0x7fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673",
        ];

        const response = await client.post(uri.toString(), { utxos: utxo_hash });
        const expected = [
            {
                utxo: "0x6fbcdb2573e0f5120f21f1875b6dc281c2eca3646ec2c39d703623d89b0eb83cd4b12b73f18db6bc6e8cbcaeb100741f6384c498ff4e61dd189e728d80fb9673",
                type: 1,
                unlock_height: "1",
                amount: "20000000000000",
                height: "0",
                time: 1609459200,
                lock_type: 0,
                lock_bytes: "md+31zMRMVqPgR9b99kSCEWZdIIdFUREO38ok6oFX50=",
            },
            {
                utxo: "0x6c985ecd25f0dbfd201bc73b6c994c7ac40bcaf7506712afbcc25ebbb1a00435440868c4943c8b851ffb9401d192d27ca9473627972401508e0b022047bd88b6",
                type: 0,
                unlock_height: "2",
                amount: "24399999990480",
                height: "1",
                time: 1609459800,
                lock_type: 0,
                lock_bytes: "ejw94GMKeuLPesbtpNxgN7+6BnCTHv3rgCllDdrrqq8=",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Create a block with a freeze transaction", async () => {
        let uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

        let response = await client.get(uri.toString());

        //  First Transaction
        //  Refund amount is      10,000 BOA
        //  Freezing amount is 2,439,999.9990480 BOA
        const tx1 = new Transaction(
            [new TxInput(new Hash(response.data[0].utxo))],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt("100000000000"),
                    new PublicKey("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj")
                ),
                new TxOutput(
                    OutputType.Freeze,
                    JSBI.BigInt("24299999990480"),
                    new PublicKey("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj")
                ),
            ],
            Buffer.alloc(0)
        );

        uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs");

        response = await client.get(uri.toString());

        //  Second Transaction
        //  Refund amount is      40,000 BOA
        //  Freezing amount is 2,399,999.9990480 BOA
        const tx2 = new Transaction(
            [new TxInput(new Hash(response.data[0].utxo))],
            [
                new TxOutput(
                    OutputType.Payment,
                    JSBI.BigInt("400000000000"),
                    new PublicKey("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs")
                ),
                new TxOutput(
                    OutputType.Freeze,
                    JSBI.BigInt("23999999990480"),
                    new PublicKey("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs")
                ),
            ],
            Buffer.alloc(0)
        );

        // Create block with two transactions
        blocks.push(createBlock(blocks[1], [tx1, tx2]));
        uri = URI(stoa_private_addr).directory("block_externalized");
        await client.post(uri.toString(), { block: blocks[2] });
        await delay(500);
    });

    it("Check the height of the block", async () => {
        const uri = URI(stoa_addr).filename("block_height");

        const url = uri.toString();
        const response = await client.get(url);
        assert.strictEqual(response.data, "2");
    });

    it("Check the UTXO included in the freeze transaction, when refund amount less then 40,000 BOA", async () => {
        const uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xparc00qvv984ck00trwmfxuvqmmlwsxwzf3al0tsq5k2rw6aw427ct37mj");

        const response = await client.get(uri.toString());
        const utxo_array: any[] = response.data;
        assert.strictEqual(utxo_array.length, 2);

        const freeze_utxo = utxo_array.find((m) => m.amount === "24299999990480");
        assert.strictEqual(freeze_utxo.type, OutputType.Freeze);

        // It was not frozen because the amount of the refund was less than 40,000 BOA.
        const refund_utxo = utxo_array.find((m) => m.amount === "100000000000");
        assert.strictEqual(refund_utxo.type, OutputType.Payment);
    });

    it("Check the UTXO included in the freeze transaction, when refund amount greater or equal then 40,000 BOA", async () => {
        const uri = URI(stoa_addr)
            .directory("utxo")
            .filename("boa1xrard006yhapr2dzttap6yg3l0rv5yf94hdnmmfj5zkwhhyw80sj785segs");

        const response = await client.get(uri.toString());
        const utxo_array: any[] = response.data;
        assert.strictEqual(utxo_array.length, 2);

        const freeze_utxo = utxo_array.find((m) => m.amount === "23999999990480");
        assert.strictEqual(freeze_utxo.type, OutputType.Freeze);

        // It was frozen because the amount of the refund was larger than 40,000 BOA.
        const refund_utxo = utxo_array.find((m) => m.amount === "400000000000");
        assert.strictEqual(refund_utxo.type, OutputType.Payment);
    });
});

describe("Test of the path /merkle_path", () => {
    const agora_addr: URL = new URL("http://localhost:2805");
    const stoa_addr: URL = new URL("http://localhost:3805");
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start a fake Agora", () => {
        return new Promise<void>((resolve, reject) => {
            agora_server = new TestAgora(agora_addr.port, sample_data, resolve);
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

    it("Test of the path /merkle_path", async () => {
        const uri = URI(agora_addr)
            .directory("merkle_path")
            .setSearch("height", "1")
            .setSearch(
                "hash",
                "0xa4ce8dd85f51340bdae780db580e21acacfc94eec3305d83275ff2ea2d5583d75b8c400e1807952e04f243c4ef80d821e2537a59f20e12857c910bc2e4028bf7"
            );

        const response = await client.get(uri.toString());

        const expected = [
            "0x25ba9352ec7a92efd273b62de9bb30c62a2c468030e2ac0711563453102299abcb9e014a59b9c0ba43e2041c1444535098bf6f0e5532e7e4dce10ebac751f747",
            "0x5e9dcca599f7ba5a933525553bdb5db80d3e68eb1d2e8a69093e5370e2284815c98e9dd11d84166e85f01df7bcd04be903a8dac27cdad916875aed0e6167bcf7",
            "0x29577742e0bc6eb0d643418c71f2deac7de161048df605ffb2ee4e0eed4e4b59b524fca30c6b2c5ca1d962ed696cb9e7ef8be082248fdfbfb53b56647ff68e0a",
        ];

        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /merkle_path by AgoraClient", async () => {
        const agora_client = new AgoraClient(agora_addr);
        const merkle_path: Hash[] = await agora_client.getMerklePath(
            new Height("1"),
            new Hash(
                "0xdd75be9a8b2778deb99734dfb17f70c3635afff654342cc1c306ba0fc69eb72494c9e3c4543eaa6974757204ff19a521989b6ab4c6d41de535b8e634faf66183"
            )
        );

        const expected = [
            new Hash(
                "0x25ba9352ec7a92efd273b62de9bb30c62a2c468030e2ac0711563453102299abcb9e014a59b9c0ba43e2041c1444535098bf6f0e5532e7e4dce10ebac751f747"
            ),
            new Hash(
                "0x5e9dcca599f7ba5a933525553bdb5db80d3e68eb1d2e8a69093e5370e2284815c98e9dd11d84166e85f01df7bcd04be903a8dac27cdad916875aed0e6167bcf7"
            ),
            new Hash(
                "0x29577742e0bc6eb0d643418c71f2deac7de161048df605ffb2ee4e0eed4e4b59b524fca30c6b2c5ca1d962ed696cb9e7ef8be082248fdfbfb53b56647ff68e0a"
            ),
        ];

        assert.deepStrictEqual(merkle_path, expected);
    });

    it("Test of the path /spv with a Merkle path transaction", async () => {
        const uri = URI(stoa_addr)
            .directory("spv")
            .filename(
                "0xfbaaebc15bb1618465077fed2425a826d88c7f5ae0197634f056bfbad12a7a74b28cc82951e889255e149707bd3ef64eb01121875c766b5d24afed176d7d255c"
            );

        const response = await client.get(uri.toString());

        const expected = {
            result: true,
            message: "Success",
        };

        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /spv with a non-Merkle path transaction", async () => {
        const uri = URI(stoa_addr)
            .directory("spv")
            .filename(
                "0x25ba9352ec7a92efd273b62de9bb30c62a2c468030e2ac0711563453102299abcb9e014a59b9c0ba43e2041c1444535098bf6f0e5532e7e4dce10ebac751f747 "
            );

        const response = await client.get(uri.toString());

        const expected = {
            result: false,
            message: "Verification failed",
        };

        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /spv with an invalid transaction ", async () => {
        const uri = URI(stoa_addr)
            .directory("spv")
            .filename(
                "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
            );

        const response = await client.get(uri.toString());

        const expected = {
            result: false,
            message: "Transaction does not exist in block",
        };

        assert.deepStrictEqual(response.data, expected);
    });
});
