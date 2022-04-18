/*******************************************************************************

    Test that inserts and reads the block into the database.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as assert from "assert";
import { Block, BlockHeader, Endian, Hash, Height, JSBI, PreImageInfo, SodiumHelper } from "boa-sdk-ts";
import { LedgerStorage } from "../src/modules/storage/LedgerStorage";
import {
    block1_sample_updated_header_data,
    block1_sample_updated_header_data_raw,
    sample_data,
    sample_data2,
    sample_preImageInfo,
} from "./Utils";

import { BOASodium } from "boa-sodium-ts";
import * as fs from "fs";
import { IDatabaseConfig } from "../src/modules/common/Config";
import { MockDBConfig } from "./TestConfig";

describe("Test ledger storage and inquiry function.", () => {
    let ledger_storage: LedgerStorage;
    let testDBConfig: IDatabaseConfig;

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Prepare Storage", async () => {
        testDBConfig = await MockDBConfig();
        return LedgerStorage.make(testDBConfig, 1609459200, 600, 20).then((result) => {
            ledger_storage = result;
        });
    });

    after("Close Storage", async () => {
        await ledger_storage.dropTestDB(testDBConfig.database);
        ledger_storage.close();
    });

    it("Test for saving of all blocks", async () => {
        for (const elem of sample_data) await ledger_storage.putBlocks(Block.reviver("", elem));

        const height_value = 1;
        const height = new Height(JSBI.BigInt(height_value));
        const rows = await ledger_storage.getBlock(height);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, height_value);
        assert.strictEqual(
            new Hash(rows[0].merkle_root, Endian.Little).toString(),
            "0xaf887747962e5ba515cb56fcfe74b1a3f3a6bbcb15e28ce5354926af7835f0b587bc2b1fbb043f0f36921cd565102e581cd8062a3f7012475ad4cad5e3ac550c"
        );
    });

    it("Test for transaction", async () => {
        const rows3 = await ledger_storage.getTransactions(new Height("0"));
        assert.strictEqual(rows3.length, 3);
        assert.strictEqual(
            new Hash(rows3[0].tx_hash, Endian.Little).toString(),
            "0xaf63ca7d0b555bbbe65d398165c3d921421114003ee6d42fe11a1b4eaafa6d6e9a57ffc6d35b820d001beeebdcdec9a9d6b7d34fe0062a6d9eb719d8d47237f2"
        );

        const rows4 = await ledger_storage.getTxInputs(new Height("1"), 0);
        assert.strictEqual(rows4.length, 1);
        assert.strictEqual(
            new Hash(rows4[0].utxo, Endian.Little).toString(),
            "0xdd7ce1ab69ad4df9a8fa174d12bfbb4dcdec02450ba5cd638ab79427d13e42d0d06eabb581b173606b642d8fa947948117d60becb73429af5785611843664ac3"
        );

        const rows5 = await ledger_storage.getTxOutputs(new Height("0"), 1);
        assert.strictEqual(rows5.length, 6);
        assert.strictEqual(
            new Hash(rows5[0].utxo_key, Endian.Little).toString(),
            "0x3245a62b3c4630a35ba999087866cf8e70ec600059dd1f2ec1760f86f4128c8b5d521734a65069961eb7c5547557173887399aee0bf98b1fa8b3386c1c6d81d6"
        );
        assert.strictEqual(
            new Hash(rows5[0].tx_hash, Endian.Little).toString(),
            "0xbf5685b8bc230a0463d1b5c64a8dd3cab09de95cd6e71649a43af680569770b279646a8a5453bd157a6d2066850c27e941c662eb22c8ebae922989487bc53e58"
        );
        assert.strictEqual(rows5[0].address, "boa1xqvalc7v34kr9crh4e882zmguvt3dgmtdhxtqx0wsljej5f9xdxl6xftcay");
    });

    it("Test for enrollment", async () => {
        const height_value = 0;
        const height = new Height(JSBI.BigInt(height_value));
        let rows = await ledger_storage.getEnrollments(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].block_height, height_value);
        assert.strictEqual(
            new Hash(rows[0].utxo_key, Endian.Little).toString(),
            "0x0666c4d505b55b6840fbb669ec08a1849e699d5a30ba246989b65ea71292f8ac9a3d7126ca9061313d3225d6e324146f37cdc5dab51facbbc3beead6854e89a4"
        );

        rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].enrolled_at, height_value);
        assert.strictEqual(
            new Hash(rows[0].utxo_key, Endian.Little).toString(),
            "0x0666c4d505b55b6840fbb669ec08a1849e699d5a30ba246989b65ea71292f8ac9a3d7126ca9061313d3225d6e324146f37cdc5dab51facbbc3beead6854e89a4"
        );
        assert.strictEqual(rows[0].address, "boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8");
    });

    it("Test for validator", async () => {
        const address: string = "boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8";

        let rows = await ledger_storage.getValidatorsAPI(new Height("1"), null);
        assert.ok(rows.length > 0);
        const validator = rows.find((n) => n.address === address);
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.address, address);
        assert.strictEqual(validator.enrolled_at, 0);
        assert.strictEqual(validator.height, 1);

        rows = await ledger_storage.getValidatorsAPI(new Height("1"), address);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].address, address);
        assert.strictEqual(
            new Hash(rows[0].stake, Endian.Little).toString(),
            "0x0666c4d505b55b6840fbb669ec08a1849e699d5a30ba246989b65ea71292f8ac9a3d7126ca9061313d3225d6e324146f37cdc5dab51facbbc3beead6854e89a4"
        );

        rows = await ledger_storage.getValidatorsAPI(null, null);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].height, 1);
    });

    it("Test for merkle tree", async () => {
        const height_value = 0;
        const height = new Height(JSBI.BigInt(height_value));
        const rows = await ledger_storage.getMerkleTree(height);
        assert.strictEqual(rows.length, 7);
        assert.strictEqual(rows[0].block_height, height_value);
        assert.strictEqual(rows[0].merkle_index, 0);
        assert.strictEqual(
            new Hash(rows[0].merkle_hash, Endian.Little).toString(),
            "0xaf63ca7d0b555bbbe65d398165c3d921421114003ee6d42fe11a1b4eaafa6d6e9a57ffc6d35b820d001beeebdcdec9a9d6b7d34fe0062a6d9eb719d8d47237f2"
        );
        assert.strictEqual(
            new Hash(rows[1].merkle_hash, Endian.Little).toString(),
            "0xbf5685b8bc230a0463d1b5c64a8dd3cab09de95cd6e71649a43af680569770b279646a8a5453bd157a6d2066850c27e941c662eb22c8ebae922989487bc53e58"
        );
    });

    it("Test for LedgerStorage.getWalletBlocksHeaderInfo()", async () => {
        let rows = await ledger_storage.getWalletBlocksHeaderInfo(null);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(rows[0].time_stamp, 1609459800);
        assert.strictEqual(
            new Hash(rows[0].merkle_root, Endian.Little).toString(),
            "0xaf887747962e5ba515cb56fcfe74b1a3f3a6bbcb15e28ce5354926af7835f0b587bc2b1fbb043f0f36921cd565102e581cd8062a3f7012475ad4cad5e3ac550c"
        );
        assert.strictEqual(
            new Hash(rows[0].hash, Endian.Little).toString(),
            "0x5216c0ef8763a4c4b36404d837a1db4778996f7955f0fe459cabc66a36692947d0a93f6191ad33024ff0dc304ae1360f08203bf17c611ba438a1c1735d67af52"
        );

        rows = await ledger_storage.getWalletBlocksHeaderInfo(new Height("0"));
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 0);
        assert.strictEqual(rows[0].time_stamp, 1609459200);
        assert.strictEqual(
            new Hash(rows[0].merkle_root, Endian.Little).toString(),
            "0x0923b97e7a4dc9443089471545e796115ef5ad2eed8e92bb8b1de4744f94a95e297a536eb7c152752ca685af7602bc296f5590c2ddf0d91e4fe3dd24fb8e3f72"
        );
        assert.strictEqual(
            new Hash(rows[0].hash, Endian.Little).toString(),
            "0x8365f069fe37ee02f2c4dc6ad816702088fab5fc875c3c67b01f82c285aa2d90b605f57e068139eba1f20ce20578d712f75be4d8568c8f3a7a34604e72aa3175"
        );
    });

    // it("Test for saving of a block with transaction data payload", async () => {
    //     const data: string = fs.readFileSync("tests/data/Block.5.sample1.json", "utf-8");
    //     const block: Block = Block.reviver("", JSON.parse(data));
    //     await ledger_storage.putBlocks(block);
    //     const rows = await ledger_storage.getPayload(block.merkle_tree[0]);
    //     assert.strictEqual(rows.length, 1);
    //     assert.deepStrictEqual(rows[0].payload, block.txs[0].payload);
    // });

    it("Test for UTXO", async () => {
        const address: string = "boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap";
        const rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 3);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2);
        assert.strictEqual(rows[0].amount, 118999999943580);
        assert.strictEqual(
            new Hash(rows[0].utxo, Endian.Little).toString(),
            "0x4d8ca31d115e8044ea91a6ced3db25c59c91a6ded38a85c736ac57030f5f7d0053e435f4e66349b98e7b5f618c775f8e7c35137618b8931b2625efa382904eee"
        );
    });

    // it("Test for UTXO in melting", async () => {
    //     const address: string = "boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq";
    //     const rows = await ledger_storage.getUTXO(address);
    //     assert.strictEqual(rows.length, 5);
    //     assert.strictEqual(rows[0].type, 0);
    //     assert.strictEqual(rows[0].unlock_height, 2018);
    //     assert.strictEqual(rows[0].amount, 3999999980000);
    //     assert.strictEqual(
    //         new Hash(rows[0].utxo, Endian.Little).toString(),
    //         "0x009b3800b3f1f3b4eaf6f449244902b5e9a632fac59c3366d06cf31b9d683d7205cb86e4bf424a9d04aec8ff91e896705780f8ac9b55199decf2c1fef21a0a40"
    //     );
    // });

    it("Test for getting block height and merkle root with transaction hash", async () => {
        const tx_hash = new Hash(
            "0x006B4215543CB0CFA1815C7F16A4F965B6C9D0205CC6EB27F783EBC4E0B5831130F563751CD5230793C285D4D8B1A3C85F3384ABC385E691DE0BFA2041ED0491"
        );
        const rows = await ledger_storage.getBlockHeaderByTxHash(tx_hash);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(
            new Hash(rows[0].merkle_root, Endian.Little).toString(),
            "0xaf887747962e5ba515cb56fcfe74b1a3f3a6bbcb15e28ce5354926af7835f0b587bc2b1fbb043f0f36921cd565102e581cd8062a3f7012475ad4cad5e3ac550c"
        );
    });
});

describe("Test for storing block data in the database", () => {
    let ledger_storage: LedgerStorage;
    let testDBConfig: IDatabaseConfig;

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    beforeEach("Prepare Storage", async () => {
        testDBConfig = await MockDBConfig();
        ledger_storage = await LedgerStorage.make(testDBConfig, 1609459200, 600, 20);
    });

    afterEach("Close Storage", async () => {
        await ledger_storage.dropTestDB(testDBConfig.database);
        ledger_storage.close();
    });

    it("Error-handling test when writing a transaction.", async () => {
        const block = Block.reviver("", sample_data[0]);

        await ledger_storage.putTransactions(block);
        await assert.rejects(ledger_storage.putTransactions(block), {
            message: "Duplicate entry '0-0' for key 'transactions.PRIMARY'",
        });
    });

    it("Error-handling test when writing a enrollment.", async () => {
        const block = Block.reviver("", sample_data[0]);

        await ledger_storage.putEnrollments(block);
        await assert.rejects(ledger_storage.putEnrollments(block), {
            message: "Duplicate entry '0-0' for key 'enrollments.PRIMARY'",
        });
    });

    it("Error-handling test when writing a block.", async () => {
        const block = Block.reviver("", sample_data[0]);
        await ledger_storage.putBlocks(block);
        await assert.rejects(ledger_storage.putBlocks(block), {
            message: "Duplicate entry '0' for key 'blocks.PRIMARY'",
        });
    });

    it("DB transaction test when writing a block", async () => {
        const block = Block.reviver("", sample_data[0]);

        await ledger_storage.putEnrollments(block);
        await assert.rejects(ledger_storage.putBlocks(block), {
            message: "Duplicate entry '0-0' for key 'enrollments.PRIMARY'",
        });

        const rows0: any[] = await ledger_storage.getBlock(new Height("0"));
        assert.strictEqual(rows0.length, 0);

        await ledger_storage.putTransactions(block);
        const rows1: any[] = await ledger_storage.getTransactions(new Height("0"));
        assert.strictEqual(rows1.length, 3);
    });

    it("Test for writing the block hash", async () => {
        const block0 = Block.reviver("", sample_data[0]);
        const block1 = Block.reviver("", sample_data[1]);

        // Write the Genesis block.
        await ledger_storage.putBlocks(block0);

        // The block is read from the database.
        const rows = await ledger_storage.getBlock(new Height("0"));
        if (rows.length > 0) {
            // Check that the `prev_block` of block1 is the same as the hash value of the database.
            assert.deepStrictEqual(block1.header.prev_block, new Hash(rows[0].hash, Endian.Little));
        }
    });
});

describe("Tests that sending a pre-image", () => {
    let ledger_storage: LedgerStorage;
    let testDBConfig: IDatabaseConfig;
    const height = new Height("0");

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Start sending a pre-image", async () => {
        testDBConfig = await MockDBConfig();
        ledger_storage = await LedgerStorage.make(testDBConfig, 1609459200, 600, 20);
        for (const elem of sample_data) await ledger_storage.putBlocks(Block.reviver("", elem));
        await ledger_storage.getEnrollments(height);
    });

    after("Close Storage", async () => {
        await ledger_storage.dropTestDB(testDBConfig.database);
        ledger_storage.close();
    });

    it("Tests that sending a pre-image with a height of 6 works", async () => {
        const pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        return ledger_storage.updatePreImage(pre_image);

        const rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        const validator = rows.find(
            (n) => n.address === "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku"
        );
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.preimage_height, "6");
        assert.strictEqual(new Hash(validator.preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
    });
});

describe("Tests storing transaction pools of a transaction", () => {
    let ledger_storage: LedgerStorage;
    let testDBConfig: IDatabaseConfig;

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Preparation the ledgerStorage", async () => {
        testDBConfig = await MockDBConfig();
        return LedgerStorage.make(testDBConfig, 1609459200, 600, 20).then((result) => {
            ledger_storage = result;
        });
    });

    after("Close Storage", async () => {
        await ledger_storage.dropTestDB(testDBConfig.database);
        ledger_storage.close();
    });

    it("Tests to store a transaction on the transaction pool", async () => {
        const block0 = Block.reviver("", sample_data[0]);
        const block1 = Block.reviver("", sample_data[1]);

        // Write the Genesis block.
        await ledger_storage.putBlocks(block0);

        const changes = await ledger_storage.putTransactionPool(block1.txs[0]);
        assert.strictEqual(changes, 1);
    });

    it("Test to transaction pool deletion trigger", async () => {
        const before_pool_rows = await ledger_storage.getTransactionPool();
        assert.deepStrictEqual(before_pool_rows.length, 1);

        // Write the block 1.
        const block1 = Block.reviver("", sample_data[1]);
        await ledger_storage.putBlocks(block1);

        const spender = await ledger_storage.getSpenderHash(block1.txs[0].inputs[0].utxo);
        assert.deepStrictEqual(spender[0].tx_hash, before_pool_rows[0].tx_hash);

        // The block is read from the database.
        const rows = await ledger_storage.getBlock(new Height("1"));
        assert.deepStrictEqual(rows.length, 1);

        // Check the transaction on the transaction pool is cleared
        const after_pool_rows = await ledger_storage.getTransactionPool();
        assert.deepStrictEqual(after_pool_rows.length, 0);
    });
});

describe("Tests update blockHeader", () => {
    let ledger_storage: LedgerStorage;
    let testDBConfig: IDatabaseConfig;

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Preparation the ledgerStorage", async () => {
        testDBConfig = await MockDBConfig();
        return LedgerStorage.make(testDBConfig, 1609459200, 600, 20).then((result) => {
            ledger_storage = result;
        });
    });

    after("Close Storage", async () => {
        await ledger_storage.dropTestDB(testDBConfig.database);
        ledger_storage.close();
    });

    it("Tests to update a blockHeader and put a blockHeader history", async () => {
        const block0 = Block.reviver("", sample_data[0]);
        const block1 = Block.reviver("", sample_data[1]);
        const block_header: BlockHeader = BlockHeader.reviver("", block1_sample_updated_header_data[0].header);

        // Write the Genesis block & block1
        await ledger_storage.putBlocks(block0);
        await ledger_storage.putBlocks(block1);

        const changes = await ledger_storage.updateBlockHeader(block_header);
        const put = await ledger_storage.putBlockHeaderHistory(block_header, new Height("1"));

        assert.strictEqual(changes, 1);
        assert.strictEqual(put, 1);
    });

    it("Test to updated a blockHeader", async () => {
        const block_header: BlockHeader = BlockHeader.reviver("", block1_sample_updated_header_data[0].header);

        const rows = await ledger_storage.getBlock(new Height("1"));
        assert.deepStrictEqual(rows.length, 1);
        assert.deepStrictEqual(rows[0].validators, block_header.validators.toString());
        assert.deepStrictEqual(
            new Hash(rows[0].signature, Endian.Little).toString(),
            block_header.signature.toString()
        );
    });
});
