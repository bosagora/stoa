/*******************************************************************************

    Test of add of validators and proposal, vote, counting

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    Amount,
    BallotData,
    Block,
    BOA,
    BOAClient,
    Encrypt,
    Enrollment,
    Hash,
    hashFull,
    hashMulti,
    iota,
    JSBI,
    KeyPair,
    OutputType,
    ProposalData,
    ProposalFeeData,
    ProposalType,
    PublicKey,
    SecretKey,
    SodiumHelper,
    Transaction,
    TxBuilder,
    TxPayloadFee,
    Utils,
    UTXOProvider,
    VoterCard,
} from "boa-sdk-ts";
import { BOASodium } from "boa-sodium-ts";
import { SmartBuffer } from "smart-buffer";
import URI from "urijs";
import { URL } from "url";
import { IDatabaseConfig } from "../src/modules/common/Config";
import { MockDBConfig } from "./TestConfig";
import {
    BlockManager,
    delay,
    FakeBlacklistMiddleware,
    sample_data,
    TestAgora,
    TestClient,
    TestStoa,
    ValidatorKey,
} from "./Utils";

import * as assert from "assert";

describe("Test for the addition of validators", () => {
    const agora_addr: URL = new URL("http://localhost:2861");
    const stoa_addr: URL = new URL("http://localhost:3861");
    const stoa_private_addr: URL = new URL("http://localhost:4861");
    const client = new TestClient();

    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let testDBConfig: IDatabaseConfig;

    let block_manager: BlockManager;
    let gen_keypair: KeyPair;
    let boa_client: BOAClient;
    let utxo_provider: UTXOProvider;
    let key_position = 6;

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
    });

    before("Start TestStoa", async () => {
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    before("Create component", async () => {
        block_manager = new BlockManager();
        gen_keypair = KeyPair.fromSeed(new SecretKey("SDN7BBGE6Z6OQM3K4PACLTZUJ5QX4AY4QPDQ2JJ2JCFWCG2OIYYALIRY"));
        boa_client = new BOAClient(stoa_addr.toString(), agora_addr.toString());
        utxo_provider = new UTXOProvider(gen_keypair.address, boa_client);
        await delay(500);
    });

    it("Test of the path /block_externalized", async () => {
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: Block.reviver("", sample_data[0]) });
        await delay(500);
    });

    it("Create a block with a height is 1 and the block has 5 enrollments", async () => {
        // Create key pairs of validators to be added.
        const add_validators: KeyPair[] = [];
        iota(key_position, key_position + 5).forEach((n) => {
            add_validators.push(ValidatorKey.keys(n));
            key_position++;
        });

        // One validator requests UTXO to freeze 40,000 boa each.
        const utxos = await utxo_provider.getUTXO(Amount.multiply(BOA(40_000), add_validators.length));

        // Create a frozen transaction
        const tx = block_manager.addValidators(add_validators, utxos, gen_keypair);
        const enrollments: Enrollment[] = [];
        const bits = block_manager.getBitMask(block_manager.getNextBlockHeight());

        // Create new validator's enrollment data.
        enrollments.push(...block_manager.getNewEnrollment());

        // Create enrollment data of validators who need re-enrollment among already registered validators.
        enrollments.push(...block_manager.getReEnrollment());

        // Arrange the enrollment data in ascending order of UTXO.
        enrollments.sort((a, b) => {
            return Utils.compareBuffer(a.utxo_key.data, b.utxo_key.data);
        });

        // Create a new block.
        const new_block = block_manager.saveBlock([tx], enrollments, bits);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(block_manager.getLastBlockHeight(), 1);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());

        const validators_simulation = block_manager.getValidators(block_manager.getLastBlockHeight());
        const validators = await boa_client.getAllValidators(block_manager.getLastBlockHeight());
        assert.strictEqual(validators.length, validators_simulation.length);
    });

    // TODO Adding one more block results in an error. This needs to be solved.
    it("Create 18 blocks and the every block has 1 enrollments", async () => {
        for (let loop = 0; loop < 18; loop++) {
            // Create key pairs of validators to be added.
            const add_validators: KeyPair[] = [];
            iota(key_position, key_position + 1).forEach((n) => {
                add_validators.push(ValidatorKey.keys(n));
                key_position++;
            });

            // One validator requests UTXO to freeze 40,000 boa each.
            const utxos = await utxo_provider.getUTXO(Amount.multiply(BOA(40_000), add_validators.length));

            // Create a frozen transaction
            const tx = block_manager.addValidators(add_validators, utxos, gen_keypair);
            const enrollments: Enrollment[] = [];
            const bits = block_manager.getBitMask(block_manager.getNextBlockHeight());

            // Create new validator's enrollment data.
            const new_enrolls = block_manager.getNewEnrollment();
            assert.strictEqual(new_enrolls.length, 1);
            enrollments.push(...new_enrolls);

            // Create enrollment data of validators who need re-enrollment among already registered validators.
            const re_enrolls = block_manager.getReEnrollment();
            if (block_manager.height + 1 === BlockManager.ENROLLMENT_CYCLE) {
                assert.strictEqual(re_enrolls.length, 6);
            }
            enrollments.push(...re_enrolls);

            // Arrange the enrollment data in ascending order of UTXO.
            enrollments.sort((a, b) => {
                return Utils.compareBuffer(a.utxo_key.data, b.utxo_key.data);
            });

            // Create a new block.
            const new_block = block_manager.saveBlock([tx], enrollments, bits);

            const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
            await client.post(block_url, { block: new_block });

            await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
            assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());

            const validators_simulation = block_manager.getValidators(block_manager.getLastBlockHeight());
            const validators = await boa_client.getAllValidators(block_manager.getLastBlockHeight());
            assert.strictEqual(validators.length, validators_simulation.length);
            assert.deepStrictEqual(
                validators.map((m) => m.address.toString()).sort((a, b) => a.localeCompare(b)),
                validators_simulation.map((m) => m.toString()).sort((a, b) => a.localeCompare(b))
            );
        }

        assert.strictEqual(block_manager.height, 19);
    });
});

describe("Test for the creation a proposal and the voting", () => {
    const agora_addr: URL = new URL("http://localhost:2862");
    const stoa_addr: URL = new URL("http://localhost:3862");
    const stoa_private_addr: URL = new URL("http://localhost:4862");
    const client = new TestClient();

    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let testDBConfig: IDatabaseConfig;

    let block_manager: BlockManager;
    let gen_keypair: KeyPair;
    let boa_client: BOAClient;
    let utxo_provider: UTXOProvider;
    let proposer_utxo_provider: UTXOProvider;
    let tx_hash_proposal_fee: Hash;
    const key_position = 6;

    let proposal_key_pair: KeyPair;
    let proposal_fee_destination: PublicKey;

    function createVoterCard(validator: KeyPair): { card: VoterCard; temporary_key: KeyPair } {
        const temporary_key = KeyPair.random();
        const card = new VoterCard(validator.address, temporary_key.address, new Date().toString());
        card.signature = validator.secret.sign<VoterCard>(card);
        return {
            card,
            temporary_key,
        };
    }

    async function createDummyBlock(expected_block_height: number) {
        const bits = block_manager.getBitMask(block_manager.getNextBlockHeight());
        const new_block = block_manager.saveBlock([], [], bits);
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), expected_block_height);
    }

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
    });

    before("Start TestStoa", async () => {
        await stoa_server.start();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await agora_server.stop();
    });

    before("Create component", async () => {
        block_manager = new BlockManager();
        gen_keypair = KeyPair.fromSeed(new SecretKey("SDN7BBGE6Z6OQM3K4PACLTZUJ5QX4AY4QPDQ2JJ2JCFWCG2OIYYALIRY"));
        boa_client = new BOAClient(stoa_addr.toString(), agora_addr.toString());
        utxo_provider = new UTXOProvider(gen_keypair.address, boa_client);

        proposal_key_pair = ValidatorKey.keys(0);
        proposal_fee_destination = new PublicKey("boa1xrgq6607dulyra5r9dw0ha6883va0jghdzk67er49h3ysm7k222ruhh7400");
        proposer_utxo_provider = new UTXOProvider(proposal_key_pair.address, boa_client);
    });

    it("0. Test of the path /block_externalized", async () => {
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: Block.reviver("", sample_data[0]) });
        await delay(500);
    });

    it("1. Distribute genesis coin", async () => {
        const utxos = await utxo_provider.getUTXO(BOA(1000_000 * 100 + 10));
        const builder = new TxBuilder(gen_keypair);
        utxos.forEach((m) => {
            builder.addInput(m.utxo, m.amount);
        });
        iota(100).forEach((idx: number) => {
            builder.addOutput(ValidatorKey.keys(idx).address, BOA(1000_000));
        });

        const tx = builder.sign(OutputType.Payment, BOA(10));
        const bits = block_manager.getBitMask(block_manager.getNextBlockHeight());
        const new_block = block_manager.saveBlock([tx], [], bits);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 1);
    });

    // TODO Add a few validator.
    it("2. Create a dummy block", async () => {
        await createDummyBlock(2);
    });

    it("3. Create a proposal fee data and store to block", async () => {
        const proposal_fee_data = new ProposalFeeData("Votera", "469008972006");
        const proposal_fee = BOA(10_000);
        const buffer = new SmartBuffer();
        proposal_fee_data.serialize(buffer);
        const payload = buffer.toBuffer();

        const utxos = await proposer_utxo_provider.getUTXO(proposal_fee);
        const builder = new TxBuilder(proposal_key_pair);
        utxos.forEach((m) => {
            builder.addInput(m.utxo, m.amount);
        });
        builder.addOutput(proposal_fee_destination, proposal_fee);
        builder.assignPayload(payload);

        const tx = builder.sign(OutputType.Payment, BOA(1));

        tx_hash_proposal_fee = hashFull(tx);

        const bits = block_manager.getBitMask(block_manager.getNextBlockHeight());
        const new_block = block_manager.saveBlock([tx], [], bits);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 3);
    });

    // TODO Add a few validator.
    it("4. Create a dummy block", async () => {
        await createDummyBlock(4);
    });

    it("5. Create a proposal", async () => {
        const validators = block_manager.getValidators();
        const vote_cost = Amount.add(
            Amount.make(Utils.FEE_RATE * Transaction.getEstimatedNumberOfBytes(1, 2, 285)),
            TxPayloadFee.getFeeAmount(285)
        );
        const total_vote_cost = Amount.multiply(vote_cost, validators.length);

        const proposal_data = new ProposalData(
            "Votera",
            ProposalType.Fund,
            "469008972006",
            "Title",
            JSBI.BigInt(10),
            JSBI.BigInt(15),
            new Hash(Buffer.alloc(Hash.Width)),
            BOA(1_000_000).value,
            BOA(10_000).value,
            total_vote_cost.value,
            tx_hash_proposal_fee,
            proposal_key_pair.address,
            proposal_fee_destination
        );
        const buffer = new SmartBuffer();
        proposal_data.serialize(buffer);
        const payload = buffer.toBuffer();

        const tx_total_fee = Amount.add(
            Amount.make(
                Utils.FEE_RATE * Transaction.getEstimatedNumberOfBytes(1, validators.length + 1, payload.length)
            ),
            TxPayloadFee.getFeeAmount(payload.length)
        );
        const send_amount = Amount.add(total_vote_cost, tx_total_fee);
        const utxos = await proposer_utxo_provider.getUTXO(send_amount);

        const builder = new TxBuilder(proposal_key_pair);
        utxos.forEach((m) => {
            builder.addInput(m.utxo, m.amount);
        });
        validators.forEach((v) => {
            builder.addOutput(v, vote_cost);
        });
        builder.assignPayload(payload);

        const tx = builder.sign(OutputType.Payment, tx_total_fee);

        const bits = block_manager.getBitMask(block_manager.getNextBlockHeight());
        const new_block = block_manager.saveBlock([tx], [], bits);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 5);
    });

    // TODO Add a few validator.
    it("6~9 Create a dummy block", async () => {
        await createDummyBlock(6);
        await createDummyBlock(7);
        await createDummyBlock(8);
        await createDummyBlock(9);
    });

    // TODO Add a few validator, remove a few validator.
    it("10. Vote", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(1);
        const res = createVoterCard(validator_key);

        const pre_image = block_manager.getPreImage(validator_key.address, 17);
        assert.ok(pre_image !== undefined);

        const app_name = "Votera";
        const proposal_id = "469008972006";
        const key_agora_admin = hashMulti(pre_image.hash, Buffer.from(app_name));
        const key_encrypt = Encrypt.createKey(key_agora_admin.data, proposal_id);
        const ballot = Encrypt.encrypt(Buffer.from([BallotData.YES]), key_encrypt);
        const ballot_data = new BallotData(app_name, proposal_id, ballot, res.card, 100);
        ballot_data.signature = res.temporary_key.secret.sign<BallotData>(ballot_data);

        const buffer = new SmartBuffer();
        ballot_data.serialize(buffer);
        const payload = buffer.toBuffer();

        const utxos = await proposer_utxo_provider.getUTXO(BOA(5));
        const builder = new TxBuilder(validator_key);
        utxos.forEach((m) => {
            builder.addInput(m.utxo, m.amount);
        });
        builder.assignPayload(payload);

        const tx = builder.sign(OutputType.Payment, BOA(5));

        const bits = block_manager.getBitMask(block_manager.getNextBlockHeight());
        const new_block = block_manager.saveBlock([tx], [], bits);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 10);
    });
});
