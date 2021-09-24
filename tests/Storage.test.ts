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
        return LedgerStorage.make(testDBConfig, 1609459200, 20).then((result) => {
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
            "0x515a30d31fbd031d63f041b92184f32baf00d08e4120da9299bc336c6f980f2245b11e70bb1dcb7c2279ead9dab1c37b62dee8414083ae8346d166cf033cddfb"
        );
        assert.strictEqual(
            new Hash(rows[0].random_seed, Endian.Little).toString(),
            "0x691775809b9498f45a2c5ef8b8d552e318ebaf0b1b2fb15dcc39e0ec962ae9812d7edffa5f053590a895c9ff72c1b0838ce8f5c709579d4529f9f4caf0fab13d"
        );
        assert.strictEqual(rows[0].missing_validators, "");
    });

    it("Test for transaction", async () => {
        const rows3 = await ledger_storage.getTransactions(new Height("0"));
        assert.strictEqual(rows3.length, 2);
        assert.strictEqual(
            new Hash(rows3[0].tx_hash, Endian.Little).toString(),
            "0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2d7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f"
        );

        const rows4 = await ledger_storage.getTxInputs(new Height("1"), 0);
        assert.strictEqual(rows4.length, 1);
        assert.strictEqual(
            new Hash(rows4[0].utxo, Endian.Little).toString(),
            "0xb9794167a781561298bcb0f634346c85e56fba3f26c641e52dbf0066e8fb0b96d278cdd4c22c7e9885fceb307368e4130aaebd7800905c27c6a6e09870d8d9ca"
        );

        const rows5 = await ledger_storage.getTxOutputs(new Height("0"), 1);
        assert.strictEqual(rows5.length, 8);
        assert.strictEqual(
            new Hash(rows5[0].utxo_key, Endian.Little).toString(),
            "0xb9794167a781561298bcb0f634346c85e56fba3f26c641e52dbf0066e8fb0b96d278cdd4c22c7e9885fceb307368e4130aaebd7800905c27c6a6e09870d8d9ca"
        );
        assert.strictEqual(
            new Hash(rows5[0].tx_hash, Endian.Little).toString(),
            "0x26866bb263593d024a92103646c48cf35a2b1bfcc49b087915b85db14a432b373569d56f576242354328a31bf0102a0a78cb806cf6e25d88d7981367833631b7"
        );
        assert.strictEqual(rows5[0].address, "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67");
    });

    it("Test for enrollment", async () => {
        const height_value = 0;
        const height = new Height(JSBI.BigInt(height_value));
        let rows = await ledger_storage.getEnrollments(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].block_height, height_value);
        assert.strictEqual(
            new Hash(rows[0].utxo_key, Endian.Little).toString(),
            "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f"
        );

        rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].enrolled_at, height_value);
        assert.strictEqual(
            new Hash(rows[0].utxo_key, Endian.Little).toString(),
            "0x00bac393977fbd1e0edc70a34c7ca802dafe57f2b4a2aabf1adaac54892cb1cbae72cdeeb212904101382690d18d2d2c6ac99b83227ca73b307fde0807c4af03"
        );
        assert.strictEqual(rows[0].address, "boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t");
    });

    it("Test for validator", async () => {
        const address: string = "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku";

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
            "0x70455f0b03f4b8d54b164b251e813b3fecd447d4bfe7b173ef86654429d2f5c3866d3ea406bf02163221a2d4029f0e0930a48304b2ea0f9277c2b32795c4005f"
        );

        rows = await ledger_storage.getValidatorsAPI(null, null);
        assert.strictEqual(rows.length, 6);
        assert.strictEqual(rows[0].height, 1);
    });

    it("Test for merkle tree", async () => {
        const height_value = 0;
        const height = new Height(JSBI.BigInt(height_value));
        const rows = await ledger_storage.getMerkleTree(height);
        assert.strictEqual(rows.length, 3);
        assert.strictEqual(rows[0].block_height, height_value);
        assert.strictEqual(rows[0].merkle_index, 0);
        assert.strictEqual(
            new Hash(rows[0].merkle_hash, Endian.Little).toString(),
            "0x224c72ad879eccd38e9b612047633d235e47e329e68a69517822c4c234c53c2d7d81b0245cdb61857002d58a5e033c8720b462e20517f45a5516df432866b32f"
        );
        assert.strictEqual(
            new Hash(rows[1].merkle_hash, Endian.Little).toString(),
            "0x26866bb263593d024a92103646c48cf35a2b1bfcc49b087915b85db14a432b373569d56f576242354328a31bf0102a0a78cb806cf6e25d88d7981367833631b7"
        );
    });

    it("Test for LedgerStorage.getWalletBlocksHeaderInfo()", async () => {
        let rows = await ledger_storage.getWalletBlocksHeaderInfo(null);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(rows[0].time_stamp, 1609459800);
        assert.strictEqual(
            new Hash(rows[0].merkle_root, Endian.Little).toString(),
            "0x515a30d31fbd031d63f041b92184f32baf00d08e4120da9299bc336c6f980f2245b11e70bb1dcb7c2279ead9dab1c37b62dee8414083ae8346d166cf033cddfb"
        );
        assert.strictEqual(
            new Hash(rows[0].hash, Endian.Little).toString(),
            "0x100057b7dfdcee4174231ed110d48e420276745ebfa5c307e28754facbeb4b33267cde253d91da336b1f3a5ad6a0fb6cb514b611b1d70638659becd09780c11d"
        );

        rows = await ledger_storage.getWalletBlocksHeaderInfo(new Height("0"));
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 0);
        assert.strictEqual(rows[0].time_stamp, 1609459200);
        assert.strictEqual(
            new Hash(rows[0].merkle_root, Endian.Little).toString(),
            "0x67218493be437c25dc5884abdc8ee40e61f0af79aa9af8ab9bd8b0632eaaca238b4c054f114b046da0d5911b1b205ba540d07c5dc01560beafe564e5f3d101c9"
        );
        assert.strictEqual(
            new Hash(rows[0].hash, Endian.Little).toString(),
            "0x891808f2bada31adeab0e312775cef39ba5c301bf6cce97d06b54c626ec2ed53a5475b224f63f779d405f1441d2121e1285f173347e650b65e77d00f344fdaea"
        );
    });

    it("Test for saving of a block with transaction data payload", async () => {
        const data: string = fs.readFileSync("tests/data/Block.2.sample1.json", "utf-8");
        const block: Block = Block.reviver("", JSON.parse(data));
        await ledger_storage.putBlocks(block);
        const rows = await ledger_storage.getPayload(block.merkle_tree[0]);
        assert.strictEqual(rows.length, 1);
        assert.deepStrictEqual(rows[0].payload, block.txs[0].payload);
    });

    it("Test for UTXO", async () => {
        const address: string = "boa1xzrf00m4sh4xh7ey8t8zrnknu27yhjrt0qqjffvn3kd3cacp9vm22fc2d2d";
        const rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2);
        assert.strictEqual(rows[0].amount, 24399999990480);
        assert.strictEqual(
            new Hash(rows[0].utxo, Endian.Little).toString(),
            "0xeb5f2caab81d8d29a156a079b137489cb5830b0d956e2b9def2374702a33bee002adbdf7e4fba328f8977b9d4914f659df3d1e314192b67aea7f90f21f9ed729"
        );
    });

    it("Test for UTXO in melting", async () => {
        const address: string = "boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq";
        const rows = await ledger_storage.getUTXO(address);
        assert.strictEqual(rows.length, 5);
        assert.strictEqual(rows[0].type, 0);
        assert.strictEqual(rows[0].unlock_height, 2018);
        assert.strictEqual(rows[0].amount, 3999999980000);
        assert.strictEqual(
            new Hash(rows[0].utxo, Endian.Little).toString(),
            "0x009b3800b3f1f3b4eaf6f449244902b5e9a632fac59c3366d06cf31b9d683d7205cb86e4bf424a9d04aec8ff91e896705780f8ac9b55199decf2c1fef21a0a40"
        );
    });

    it("Test for getting block height and merkle root with transaction hash", async () => {
        const tx_hash = new Hash(
            "0xfbaaebc15bb1618465077fed2425a826d88c7f5ae0197634f056bfbad12a7a74b28cc82951e889255e149707bd3ef64eb01121875c766b5d24afed176d7d255c"
        );
        const rows = await ledger_storage.getBlockHeaderByTxHash(tx_hash);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].height, 1);
        assert.strictEqual(
            new Hash(rows[0].merkle_root, Endian.Little).toString(),
            "0x515a30d31fbd031d63f041b92184f32baf00d08e4120da9299bc336c6f980f2245b11e70bb1dcb7c2279ead9dab1c37b62dee8414083ae8346d166cf033cddfb"
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
        ledger_storage = await LedgerStorage.make(testDBConfig, 1609459200, 20);
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
        assert.strictEqual(rows1.length, 2);
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
        ledger_storage = await LedgerStorage.make(testDBConfig, 1609459200, 20);
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

    it("Fail tests that sending a pre-image with a height of 5 works", async () => {
        sample_preImageInfo.height = "5";
        const pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        await ledger_storage.updatePreImage(pre_image);

        const rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        const validator = rows.find(
            (n) => n.address === "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku"
        );
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.preimage_height, 6);
        assert.strictEqual(new Hash(validator.preimage_hash, Endian.Little).toString(), sample_preImageInfo.hash);
    });

    it("Fail tests that sending a pre-image with a height of 1008 works", async () => {
        // Pre-image height test out of preimage cycle range Test
        sample_preImageInfo.height = "1008";
        const pre_image: PreImageInfo = PreImageInfo.reviver("", sample_preImageInfo);
        await ledger_storage.updatePreImage(pre_image);

        const rows = await ledger_storage.getValidators(height);
        assert.strictEqual(rows.length, 6);
        const validator = rows.find(
            (n) => n.address === "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku"
        );
        assert.ok(validator !== undefined);
        assert.strictEqual(validator.preimage_height, 6);
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
        return LedgerStorage.make(testDBConfig, 1609459200, 20).then((result) => {
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
        return LedgerStorage.make(testDBConfig, 1609459200, 20).then((result) => {
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
        assert.deepStrictEqual(rows[0].signature.toString(), block_header.signature.toString());
    });
});
