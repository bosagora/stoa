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
    Endian,
    Enrollment,
    Hash,
    hashFull,
    hashMulti,
    Height,
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
    UnspentTxOutput,
    Utils,
    UTXOProvider,
} from "boa-sdk-ts";
import { BOASodium } from "boa-sodium-ts";
import { SmartBuffer } from "smart-buffer";
import URI from "urijs";
import { URL } from "url";
import { IDatabaseConfig } from "../src/modules/common/Config";
import { ProposalResult, ProposalStatus } from "../src/modules/common/enum";
import { VoteraService } from "../src/modules/service/VoteraService";
import { IMetaData, IPendingProposal, IProposal, IValidatorByBlock } from "../src/Types";
import { MockDBConfig } from "./TestConfig";
import {
    BlockManager,
    delay,
    FakeBlacklistMiddleware,
    sample_data,
    TestAgora,
    TestClient,
    TestStoa,
    TestVoteraServer,
    ValidatorKey,
    Vote,
} from "./Utils";

import * as assert from "assert";
import moment from "moment";

describe("Test BlockManager", () => {
    let key_position = 6;
    let gen_keypair: KeyPair;
    let block_manager: BlockManager;

    async function createEnrollment(): Promise<{ enrollments: Enrollment[]; tx: Transaction }> {
        const add_validators: KeyPair[] = [];
        add_validators.push(ValidatorKey.keys(key_position));
        key_position++;

        // One validator requests UTXO to freeze 40,000 boa each.
        const utxos: UnspentTxOutput[] = [
            {
                utxo: new Hash(Buffer.from(SodiumHelper.sodium.randombytes_buf(Hash.Width))),
                type: OutputType.Payment,
                unlock_height: JSBI.BigInt(0),
                amount: BOA(50_000),
                height: JSBI.BigInt(1),
                time: 0,
                lock_type: 0,
                lock_bytes: gen_keypair.address.data.toString("base64"),
            },
        ];

        // Create a frozen transaction
        const tx = block_manager.addValidators(add_validators, utxos, gen_keypair);
        const enrollments: Enrollment[] = [];

        // Create new validator's enrollment data.
        const new_enrolls = block_manager.getNewEnrollment();
        assert.strictEqual(new_enrolls.length, 1);
        enrollments.push(...new_enrolls);

        // Create enrollment data of validators who need re-enrollment among already registered validators.
        const re_enrolls = block_manager.getReEnrollment();

        enrollments.push(...re_enrolls);

        // Arrange the enrollment data in ascending order of UTXO.
        enrollments.sort((a, b) => {
            return Utils.compareBuffer(a.utxo_key.data, b.utxo_key.data);
        });
        return { enrollments, tx };
    }

    before("Wait for the package libsodium to finish loading", async () => {
        if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
        await SodiumHelper.init();
    });

    before("Create component", async () => {
        block_manager = new BlockManager();
        gen_keypair = KeyPair.fromSeed(new SecretKey("SDN7BBGE6Z6OQM3K4PACLTZUJ5QX4AY4QPDQ2JJ2JCFWCG2OIYYALIRY"));
    });

    it("Create a block 1 - Dummy", async () => {
        const new_block = block_manager.saveBlock([], []);
        const validators_simulation = block_manager.getValidators(block_manager.getLastBlockHeight());
        assert.strictEqual(new_block.header.height.toString(), "1");
        assert.strictEqual(new_block.header.validators.length, 6);
        assert.strictEqual(validators_simulation.length, new_block.header.validators.length);
    });

    it("Create a block 2 - Add one enrollment", async () => {
        const enroll = await createEnrollment();
        const new_block = block_manager.saveBlock([enroll.tx], enroll.enrollments);
        const validators_simulation = block_manager.getValidators(block_manager.getLastBlockHeight());
        assert.strictEqual(new_block.header.height.toString(), "2");
        assert.strictEqual(new_block.header.validators.length, 6);
        assert.strictEqual(validators_simulation.length, new_block.header.validators.length);
    });

    it("Create a block 3 - Add one enrollment", async () => {
        const enroll = await createEnrollment();
        const new_block = block_manager.saveBlock([enroll.tx], enroll.enrollments);
        const validators_simulation = block_manager.getValidators(block_manager.getLastBlockHeight());
        assert.strictEqual(new_block.header.height.toString(), "3");
        assert.strictEqual(new_block.header.validators.length, 7);
        assert.strictEqual(validators_simulation.length, new_block.header.validators.length);
    });

    it("Create a block 4 - Dummy", async () => {
        const new_block = block_manager.saveBlock([], []);
        const validators_simulation = block_manager.getValidators(block_manager.getLastBlockHeight());
        assert.strictEqual(new_block.header.height.toString(), "4");
        assert.strictEqual(new_block.header.validators.length, 8);
        assert.strictEqual(validators_simulation.length, new_block.header.validators.length);
    });

    it("Create a block 5 - Slash one validator", async () => {
        block_manager.removeValidator(ValidatorKey.keys(0));
        const new_block = block_manager.saveBlock([], []);
        const validators_simulation = block_manager.getValidators(block_manager.getLastBlockHeight());
        assert.strictEqual(new_block.header.height.toString(), "5");
        assert.strictEqual(new_block.header.validators.length, 8);
        assert.strictEqual(validators_simulation.length, new_block.header.validators.length);
    });

    it("Create a block 6 - Slash one validator", async () => {
        const new_block = block_manager.saveBlock([], []);
        const validators_simulation = block_manager.getValidators(block_manager.getLastBlockHeight());
        assert.strictEqual(new_block.header.height.toString(), "6");
        assert.strictEqual(new_block.header.validators.length, 7);
        assert.strictEqual(validators_simulation.length, new_block.header.validators.length);
    });
});

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

        // Create new validator's enrollment data.
        enrollments.push(...block_manager.getNewEnrollment());

        // Create enrollment data of validators who need re-enrollment among already registered validators.
        enrollments.push(...block_manager.getReEnrollment());

        // Arrange the enrollment data in ascending order of UTXO.
        enrollments.sort((a, b) => {
            return Utils.compareBuffer(a.utxo_key.data, b.utxo_key.data);
        });

        // Create a new block.
        const new_block = block_manager.saveBlock([tx], enrollments);

        const expected_validator = block_manager.validators.get(block_manager.height).map((key) => key.address);
        const expected_preimages = expected_validator.map((v) => {
            const image = block_manager.getPreImage(v, block_manager.height);
            if (image === undefined) return new Hash(Buffer.alloc(Hash.Width));
            else return image.hash;
        });
        assert.deepStrictEqual(new_block.header.preimages, expected_preimages);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(block_manager.getLastBlockHeight(), 1);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());

        const validators_simulation = block_manager.getValidators(block_manager.getLastBlockHeight());
        const validators = await boa_client.getAllValidators(block_manager.getLastBlockHeight());
        assert.strictEqual(validators.length, validators_simulation.length);
        assert.deepStrictEqual(
            validators.map((m) => m.address.toString()),
            validators_simulation.map((m) => m.toString())
        );
    });

    it("Create 18 blocks and the every block has 1 enrollments", async () => {
        for (let loop = 0; loop < 20; loop++) {
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
            const new_block = block_manager.saveBlock([tx], enrollments);

            const expected_validator = block_manager.validators.get(block_manager.height).map((key) => key.address);
            const expected_preimages = expected_validator.map((v) => {
                const image = block_manager.getPreImage(v, block_manager.height);
                if (image === undefined) return new Hash(Buffer.alloc(Hash.Width));
                else return image.hash;
            });
            assert.deepStrictEqual(new_block.header.preimages, expected_preimages);

            const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
            await client.post(block_url, { block: new_block });

            await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
            assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());

            const validators_simulation = block_manager.getValidators(block_manager.getLastBlockHeight());
            const validators = await boa_client.getAllValidators(block_manager.getLastBlockHeight());
            assert.strictEqual(validators.length, validators_simulation.length);
            assert.deepStrictEqual(
                validators.map((m) => m.address.toString()),
                validators_simulation.map((m) => m.toString())
            );
        }

        assert.strictEqual(block_manager.height, 21);
    });
});

describe("Test for the creation a proposal and the voting", () => {
    const agora_addr: URL = new URL("http://localhost:2862");
    const stoa_addr: URL = new URL("http://localhost:3862");
    const stoa_private_addr: URL = new URL("http://localhost:4862");
    const votera_addr: URL = new URL("http://127.0.0.1:1337/");
    const client = new TestClient();

    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let testDBConfig: IDatabaseConfig;

    let votera_server: TestVoteraServer;
    let votera_service: VoteraService;

    let block_manager: BlockManager;
    let gen_keypair: KeyPair;
    let boa_client: BOAClient;
    let utxo_provider: UTXOProvider;
    let proposer_utxo_provider: UTXOProvider;
    let tx_hash_proposal_fee: Hash;
    let key_position = 6;

    let proposal_key_pair: KeyPair;
    let proposal_fee_destination: PublicKey;

    async function createDummyBlock(expected_block_height: number) {
        const new_block = block_manager.saveBlock([], []);
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), expected_block_height);
    }

    async function createEnrollment() {
        //Create key pairs of validators to be added.
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

        // Create new validator's enrollment data.
        const new_enrolls = block_manager.getNewEnrollment();
        assert.strictEqual(new_enrolls.length, 1);
        enrollments.push(...new_enrolls);

        // Create enrollment data of validators who need re-enrollment among already registered validators.
        const re_enrolls = block_manager.getReEnrollment();

        enrollments.push(...re_enrolls);

        // Arrange the enrollment data in ascending order of UTXO.
        enrollments.sort((a, b) => {
            return Utils.compareBuffer(a.utxo_key.data, b.utxo_key.data);
        });
        return { enrollments, tx };
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

    before("Start a fake votera Server and Service", () => {
        return new Promise<void>(async (resolve, reject) => {
            votera_server = new TestVoteraServer(1337, votera_addr, resolve);
            votera_service = new VoteraService(votera_addr);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port, votera_service);
        await stoa_server.createStorage();
    });

    before("Start TestStoa", async () => {
        await stoa_server.start();
        await stoa_server.voteraService?.stop();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await votera_server.stop();
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
        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 1);
    });

    it("2. Create a dummy block", async () => {
        await createDummyBlock(2);
    });

    it("3. Create a proposal fee data and store to block", async () => {
        let enroll = await createEnrollment();
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

        const new_block = block_manager.saveBlock([tx, enroll.tx], enroll.enrollments);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 3);
    });

    it("4. Create a block with 1 enrollment", async () => {
        let enroll = await createEnrollment();
        const new_block = block_manager.saveBlock([enroll.tx], enroll.enrollments);
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 4);
    });

    it("5. Create a proposal", async () => {
        let enroll = await createEnrollment();
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

        const new_block = block_manager.saveBlock([tx, enroll.tx], enroll.enrollments);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 5);
    });

    it("6~8 Create a dummy block", async () => {
        await createDummyBlock(6);
        await createDummyBlock(7);
        await createDummyBlock(8);
    });

    it("9. Reject Votes that are recieved before voting_start_height", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(1);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.YES, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await delay(200);
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        let result = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 9);

        assert.strictEqual(result[0].ballot_answer, BallotData.REJECT);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 9);
    });

    it("10. Vote", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(1);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.YES, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 10);
    });

    it("Test for Voting Start Trigger", async () => {
        let result = await stoa_server.ledger_storage.getProposalByStatus(ProposalStatus.VOTING);
        let data: IProposal[] = [];
        result.forEach((m) => {
            data.push({
                proposal_id: m.proposal_id,
                app_name: m.app_name,
                block_height: m.block_height,
                proposal_type: ProposalType.Fund,
                proposal_title: m.proposal_title,
                vote_start_height: m.vote_start_height,
                vote_end_height: m.vote_end_height,
                doc_hash: new Hash(m.doc_hash, Endian.Little).toString(),
                fund_amount: m.fund_amount,
                proposal_fee: m.proposal_fee,
                vote_fee: m.vote_fee,
                proposal_fee_tx_hash: new Hash(m.proposal_fee_tx_hash, Endian.Little).toString(),
                proposer_address: m.proposer_address,
                proposal_fee_address: m.proposer_address,
                proposal_status: m.proposal_status,
                proposal_result: m.proposal_result,
                data_collection_status: m.data_collection_status,
            });
            assert.strictEqual(data[0].proposal_status, "Voting");
        });
    });

    it("Start votera service for syncing proposal's meta information", async () => {
        await stoa_server.voteraService?.start(stoa_server, 2);
        await delay(200);

        await stoa_server.voteraService?.stop();
    });

    it("Test for getMetaData Method", async () => {
        let proposal = new ProposalData(
            "Votera",
            ProposalType.Fund,
            "469008972006",
            "Title",
            JSBI.BigInt(5),
            JSBI.BigInt(10),
            new Hash(Buffer.alloc(Hash.Width)),
            JSBI.BigInt(10000000000000),
            JSBI.BigInt(100000000000),
            JSBI.BigInt(27000000),
            new Hash(Buffer.alloc(Hash.Width)),
            new PublicKey("boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67"),
            new PublicKey("boa1xrc00kar2yqa3jzve9cm4cvuaa8duazkuwrygmqgpcuf0gqww8ye7ua9lkl")
        );
        let pendingProposal: IPendingProposal = {
            app_name: proposal.app_name,
            proposal_type: proposal.proposal_type,
            proposal_id: proposal.proposal_id,
            proposal_title: proposal.proposal_title,
            vote_start_height: Number(proposal.vote_start_height),
            vote_end_height: Number(proposal.vote_start_height),
            doc_hash: proposal.doc_hash,
            fund_amount: proposal.fund_amount,
            proposal_fee: proposal.proposal_fee,
            vote_fee: proposal.vote_fee,
            proposal_fee_tx_hash: proposal.tx_hash_proposal_fee,
            proposer_address: proposal.proposer_address.toString(),
            proposal_fee_address: proposal.proposal_fee_address.toString(),
        };
        let data = await votera_service.getMetadata(pendingProposal);
        let expected: IMetaData = {
            proposal_id: "469008972006",
            voting_start_date: moment("2021-07-26").utc().unix(),
            voting_end_date: moment("2021-08-02").utc().unix(),
            voting_fee_hash: new Hash(
                "0x8b6a2e1ecc3616ad63c73d606c4019407ebfd06a122519e7bd88d99af92d19d9621323d7c2e68593053a570522b6bc8575d1ee45a74ee38726f297a5ce08e33d"
            ),
            detail: "Description Make better world!",
            submit_time: moment("2021-07-23T04:49:26.634Z").utc().unix(),
            ave_pre_evaluation_score: 7,
            pre_evaluation_start_time: moment("2021-08-18").utc().unix(),
            pre_evaluation_end_time: moment("2021-08-18").utc().unix(),
            proposer_name: "test",
            assessResult: {
                assess_node_count: 2,
                assess_average_score: 7,
                assess_completeness_score: 6,
                assess_realization_score: 6.5,
                assess_profitability_score: 7,
                assess_attractiveness_score: 7.5,
                assess_expansion_score: 8,
            },
            proposal_attachments: [
                {
                    attachment_id: "61f6724251k789",
                    name: "Make the world better",
                    url: "https://s3.ap-northeast-2.amazonaws.com/com.kosac.defora.beta.upload-image/BOASCAN_Requirements_Documentation_Version1_0_EN_copy_fb69a8a7d5.pdf",
                    mime: "application/pdf",
                    doc_hash: "5b5073302c8570a269a5d028cc256d80b7d5d22aaa05e279fac7ced94d7df7c9",
                },
            ],
        };
        assert.deepStrictEqual(data, expected);
        await delay(500);
    });

    it("Test for [ Pending ] proposals", async () => {
        const uri = URI(stoa_addr).directory("/proposal").filename("469008972006");
        const response = await client.get(uri.toString());
        assert.deepStrictEqual(response.data.proposal_result, ProposalResult.PENDING);
    });

    it("Test for path /proposals", async () => {
        const uri = URI(stoa_addr).directory("/proposals");
        const response = await client.get(uri.toString());
        let expected = {
            proposal_id: "469008972006",
            proposal_title: "Title",
            proposal_type: "Fund",
            fund_amount: 10000000000000,
            vote_start_height: 10,
            vote_end_height: 15,
            proposal_status: "Voting",
            proposal_date: 1627015766,
            proposer_name: "test",
            voting_start_date: moment("2021-07-26").utc().unix(),
            voting_end_date: moment("2021-08-02").utc().unix(),
            full_count: 1,
        };
        assert.deepStrictEqual(response.data[0], expected);
    });

    it("Test for path /proposal/:proposal_id", async () => {
        const uri = URI(stoa_addr).directory("/proposal").filename("469008972006");
        const response = await client.get(uri.toString());
        let expected = {
            proposal_title: "Title",
            proposal_id: "469008972006",
            detail: "Description Make better world!",
            proposal_tx_hash:
                "0xaa4e80fc3a47eecd7ddd24a1d644ede65825fb2d4121782b5591e799dbe97455581f94df9d1e4f6ae45d0e8af94a71715645a5052b8bfc193bc615bd0cf11b27",
            fee_tx_hash:
                "0x8b6a2e1ecc3616ad63c73d606c4019407ebfd06a122519e7bd88d99af92d19d9621323d7c2e68593053a570522b6bc8575d1ee45a74ee38726f297a5ce08e33d",
            proposer_name: "test",
            fund_amount: 10000000000000,
            proposal_fee: 100000000000,
            proposal_type: "Fund",
            vote_start_height: 10,
            voting_start_date: moment("2021-07-26").utc().unix(),
            vote_end_height: 15,
            voting_end_date: moment("2021-08-02").utc().unix(),
            proposal_status: "Voting",
            proposal_result: "Pending",
            proposal_date: 1627015766,
            pre_evaluation_start_time: moment("2021-08-18").utc().unix(),
            pre_evaluation_end_time: moment("2021-08-18").utc().unix(),
            ave_pre_evaluation_score: 7,
            proposer_address: "boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn",
            proposal_fee_address: "boa1xrgq6607dulyra5r9dw0ha6883va0jghdzk67er49h3ysm7k222ruhh7400",
            urls: [
                {
                    url: "https://s3.ap-northeast-2.amazonaws.com/com.kosac.defora.beta.upload-image/BOASCAN_Requirements_Documentation_Version1_0_EN_copy_fb69a8a7d5.pdf",
                },
            ],
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test for getValidatorByBlock()", async () => {
        let validators = await stoa_server.ledger_storage.getValidatorsByBlock(new Height("5"));
        let validator_by_block: IValidatorByBlock[] = [];
        validators.forEach((m) => {
            validator_by_block.push({
                block_height: m.block_height,
                enrolled_height: m.enrolled_height,
                address: m.address,
                utxo_key: new Hash(m.utxo_key, Endian.Little).toString(),
                signed: m.signed,
                slashed: m.slashed,
            });
        });

        let expected = [
            {
                block_height: 5,
                enrolled_height: 0,
                address: "boa1xpvald2ydpxzl9aat978kv78y5g24jxy46mcnl7munf4jyhd0zjrc5x62kn",
                utxo_key:
                    "0xbc953e1953dbbbbae165552c000e99f189df7f3ad2a5c644d2bfcd088cfe47964a17b0ed5c8b174f75aafe284cdaf203b6c970dbb6ca9f72bea6d4b03066a37f",
                signed: 1,
                slashed: 0,
            },
            {
                block_height: 5,
                enrolled_height: 3,
                address: "boa1xrq3466a97zrr7ljtj2zmcq7ktvcx3l9dzmznxd86mssp7wau4t45jkmtpy",
                utxo_key:
                    "0xc46c97589e7484ff88f13e250a6b844b3ec2e90ab994a8fb6ecd271916d53590da155082da6a25faa6e6bcd4ad58602da2137691ffa1621022651dc30e109e57",
                signed: 1,
                slashed: 0,
            },
            {
                block_height: 5,
                enrolled_height: 4,
                address: "boa1xrq3k668jcmnypk2te5j929s6pk6zmtld9d02d99ysn83vzdmpyf70sv9gp",
                utxo_key:
                    "0x39f3da6a9a4c8c6e7469ad85af29eb71b63663552ab144866ba030a1727e0db8f4f7915fe7a8fdefbad5a355e867ec6bfe1276731410c2c1e806f5b5c90943f7",
                signed: 1,
                slashed: 0,
            },
            {
                block_height: 5,
                enrolled_height: 0,
                address: "boa1xrvald3zmehvpcmxqm0kn6wkaqyry7yj3cd8h975ypzlyz00sczpzhsk308",
                utxo_key:
                    "0x076b50dcc436000112a7723363810f331fb7b7ee786de3ee96c4a79bba8b508bc9c299ca3aa205ed6d0ac317f46613185027007c922381067bc5b90afd82eae0",
                signed: 1,
                slashed: 0,
            },
            {
                block_height: 5,
                enrolled_height: 0,
                address: "boa1xrvald4v2gy790stemq4gg37v4us7ztsxq032z9jmlxfh6xh9xfak4qglku",
                utxo_key:
                    "0x5f00c49527b3c277920feab20483a430090e9f02d4a221321602bf06a43e6d86c3f5d229446586ef73b1e7bfd447d4ec3f3b811e254b164bd5b8f4030b5f4570",
                signed: 1,
                slashed: 0,
            },
            {
                block_height: 5,
                enrolled_height: 0,
                address: "boa1xrvald6jsqfuctlr4nr4h9c224vuah8vgv7f9rzjauwev7j8tj04qee8f0t",
                utxo_key:
                    "0x03afc40708de7f303ba77c22839bc96a2c2d8dd190263801419012b2eecd72aecbb12c8954acda1abfaaa2b4f257feda02a87c4ca370dc0e1ebd7f9793c3ba00",
                signed: 1,
                slashed: 0,
            },
            {
                block_height: 5,
                enrolled_height: 0,
                address: "boa1xzvald5dvy54j7yt2h5yzs2432h07rcn66j84t3lfdrlrwydwq78cz0nckq",
                utxo_key:
                    "0xca0673a903980915644c236fa1e15ea3215b9a3a9b6048360e0c61e99254185c2e1c4bd429d37ba6935f84b8bd26f58396b8e4952350965cece616b6f1b535d9",
                signed: 1,
                slashed: 0,
            },
            {
                block_height: 5,
                enrolled_height: 0,
                address: "boa1xzvald7hxvgnzk50sy04ha7ezgyytxt5sgw323zy8dlj3ya2q40e6elltwq",
                utxo_key:
                    "0x7396fb808d729e18dd614eff98c484631f7400b1aebc8c6ebcb68df1732bb1d43cb80e9bd82336709dc3c26e64a3ecc281c26d5b87f1210f12f5e07325dbbc6f",
                signed: 1,
                slashed: 0,
            },
        ];
        assert.deepStrictEqual(validator_by_block, expected);
    });

    it("11. Vote [ No ]", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(2);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.NO, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 11);
    });

    it("12. Vote [ Blank ]", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(3);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.BLANK, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 12);
    });

    it("13. Vote [ Yes ]", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(4);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.YES, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 13);
    });

    it("14. Vote by new enrolled validators", async () => {
        // The KeyPair of the validator
        let txs: Transaction[] = [];
        let validator_key: KeyPair[] = [ValidatorKey.keys(6), ValidatorKey.keys(7), ValidatorKey.keys(8)];
        const app_name = "Votera";
        const proposal_id = "469008972006";
        await Promise.all(
            validator_key.map(async (element) => {
                let vote = new Vote(boa_client, block_manager, element, app_name, proposal_id, BallotData.YES, 100, 22);
                const tx = await vote.CreateVote();
                assert.ok(tx !== undefined);
                txs.push(tx);
            })
        );
        const new_block = block_manager.saveBlock(txs, []);
        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 14);
    });

    it("15. Vote [ Yes ]", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(5);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.YES, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 15);
    });

    it("16. Reject Votes that are recieved after voting_end_height", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(1);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.YES, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await delay(200);
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        let result = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 16);

        assert.strictEqual(result[0].ballot_answer, BallotData.REJECT);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 16);
    });

    it("17~19 Create a dummy block", async () => {
        await createDummyBlock(17);
        await createDummyBlock(18);
        await createDummyBlock(19);
        await block_manager.waitFor(19, boa_client);
    });

    it("Test for Voting End Trigger", async () => {
        let data: IProposal[] = [];
        let result = await stoa_server.ledger_storage.getProposalByStatus(ProposalStatus.COUNTING_VOTES);
        result.forEach((m) => {
            data.push({
                proposal_id: m.proposal_id,
                app_name: m.app_name,
                block_height: m.block_height,
                proposal_type: ProposalType.Fund,
                proposal_title: m.proposal_title,
                vote_start_height: m.vote_start_height,
                vote_end_height: m.vote_end_height,
                doc_hash: new Hash(m.doc_hash, Endian.Little).toString(),
                fund_amount: m.fund_amount,
                proposal_fee: m.proposal_fee,
                vote_fee: m.vote_fee,
                proposal_fee_tx_hash: new Hash(m.proposal_fee_tx_hash, Endian.Little).toString(),
                proposer_address: m.proposer_address,
                proposal_fee_address: m.proposer_address,
                proposal_status: m.proposal_status,
                proposal_result: m.proposal_result,
                data_collection_status: m.data_collection_status,
            });
            assert.strictEqual(data[0].proposal_status, "CountingVotes");
        });
    });

    it("Create a block with a height is 20 and the block has 5 enrollments", async () => {
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

        // Create new validator's enrollment data.
        enrollments.push(...block_manager.getNewEnrollment());

        // Create enrollment data of validators who need re-enrollment among already registered validators.
        enrollments.push(...block_manager.getReEnrollment());

        // Arrange the enrollment data in ascending order of UTXO.
        enrollments.sort((a, b) => {
            return Utils.compareBuffer(a.utxo_key.data, b.utxo_key.data);
        });

        // Create a new block.
        const new_block = block_manager.saveBlock([tx], enrollments);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(block_manager.getLastBlockHeight(), 20);
    });

    it("21-22 Create a dummy block", async () => {
        await createDummyBlock(21);
        await createDummyBlock(22);
        await block_manager.waitFor(22, boa_client);
    });

    it("Test case for ballot types.[No, Blank, Yes]", async () => {
        await delay(1000);
        let ballot_answer1 = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 11);
        let ballot_answer2 = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 12);
        let ballot_answer3 = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 13);

        assert.strictEqual(ballot_answer1[0].ballot_answer, BallotData.NO);
        assert.strictEqual(ballot_answer2[0].ballot_answer, BallotData.BLANK);
        assert.strictEqual(ballot_answer3[0].ballot_answer, BallotData.YES);
    });

    it("Test case for ballot types at boundries [9, 10, 15, 16]", async () => {
        let ballot_at_height_9 = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 9);
        let ballot_at_height_10 = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 10);
        let ballot_at_height_15 = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 15);
        let ballot_at_height_16 = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 16);

        assert.strictEqual(ballot_at_height_9[0].ballot_answer, BallotData.REJECT);
        assert.strictEqual(ballot_at_height_10[0].ballot_answer, BallotData.YES);
        assert.strictEqual(ballot_at_height_15[0].ballot_answer, BallotData.YES);
        assert.strictEqual(ballot_at_height_16[0].ballot_answer, BallotData.REJECT);
    });

    it("Test case for ballot by enrolled Validators at height [3, 4, 5]", async () => {
        let ballot_answer = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 14);
        ballot_answer = ballot_answer.sort((a, b) => a.ballot_answer - b.ballot_answer);

        assert.strictEqual(ballot_answer[0].ballot_answer, BallotData.YES);
        assert.strictEqual(ballot_answer[1].ballot_answer, BallotData.YES);

        // A enrolled validator who become validator after the proposal_block height should be Rejected.
        assert.strictEqual(ballot_answer[2].ballot_answer, BallotData.REJECT);
        assert.strictEqual(ballot_answer[2].voter_address, ValidatorKey.keys(8).address.toString());
    });

    it("Test for [ Passed ] Proposals", async () => {
        const uri = URI(stoa_addr).directory("/proposal").filename("469008972006");

        const response = await client.get(uri.toString());
        assert.deepStrictEqual(response.data.proposal_result, ProposalResult.PASSED);
    });
});

describe("Test for the creation a proposal and the voting", () => {
    const agora_addr: URL = new URL("http://localhost:2862");
    const stoa_addr: URL = new URL("http://localhost:3862");
    const stoa_private_addr: URL = new URL("http://localhost:4862");
    const votera_addr: URL = new URL("http://127.0.0.1:1337/");
    const client = new TestClient();

    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    let testDBConfig: IDatabaseConfig;

    let votera_server: TestVoteraServer;
    let votera_service: VoteraService;

    let block_manager: BlockManager;
    let gen_keypair: KeyPair;
    let boa_client: BOAClient;
    let utxo_provider: UTXOProvider;
    let proposer_utxo_provider: UTXOProvider;
    let validator_utxo_provider: UTXOProvider;
    let tx_hash_proposal_fee: Hash;
    let key_position = 6;

    let proposal_key_pair: KeyPair;
    let proposal_fee_destination: PublicKey;

    async function createDummyBlock(expected_block_height: number) {
        const new_block = block_manager.saveBlock([], []);
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

    before("Start a fake votera Server and Service", () => {
        return new Promise<void>(async (resolve, reject) => {
            votera_server = new TestVoteraServer(1337, votera_addr, resolve);
            votera_service = new VoteraService(votera_addr);
        });
    });

    before("Create TestStoa", async () => {
        testDBConfig = await MockDBConfig();
        stoa_server = new TestStoa(testDBConfig, agora_addr, stoa_addr.port, votera_service);
        await stoa_server.createStorage();
    });

    before("Start TestStoa", async () => {
        await stoa_server.start();
        await stoa_server.voteraService?.stop();
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await votera_server.stop();
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
        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 1);
    });

    it("2. Create a dummy block", async () => {
        await createDummyBlock(2);
        await block_manager.waitFor(2, boa_client);
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

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 3);
    });

    it("4. Create a dummy block", async () => {
        await createDummyBlock(4);
        await block_manager.waitFor(4, boa_client);
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

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 5);
    });

    it("6~9 Create a dummy block", async () => {
        await createDummyBlock(6);
        await createDummyBlock(7);
        await createDummyBlock(8);
        await createDummyBlock(9);
        await block_manager.waitFor(9, boa_client);
    });

    it("10. Vote", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(1);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.YES, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 10);
    });

    it("Start votera service for syncing proposal's meta information", async () => {
        await stoa_server.voteraService?.start(stoa_server, 2);
        await delay(200);

        await stoa_server.voteraService?.stop();
    });

    it("11. Vote [ No ]", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(2);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.NO, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 11);
    });

    it("12. Vote [ No ]", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(3);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.NO, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 12);
    });

    it("13. Vote [ Blank ]", async () => {
        // The KeyPair of the validator
        const validator_key = ValidatorKey.keys(4);
        const app_name = "Votera";
        const proposal_id = "469008972006";
        let vote = new Vote(boa_client, block_manager, validator_key, app_name, proposal_id, BallotData.BLANK, 100, 22);
        const tx = await vote.CreateVote();
        assert.ok(tx !== undefined);

        const new_block = block_manager.saveBlock([tx], []);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(JSBI.toNumber(await boa_client.getBlockHeight()), block_manager.getLastBlockHeight());
        assert.strictEqual(block_manager.getLastBlockHeight(), 13);
    });

    it("14-15 Create a dummy block", async () => {
        await createDummyBlock(14);
        await createDummyBlock(15);
        await block_manager.waitFor(15, boa_client);
    });

    it("16~19 Create a dummy block", async () => {
        await createDummyBlock(16);
        await createDummyBlock(17);
        await createDummyBlock(18);
        await createDummyBlock(19);
        await block_manager.waitFor(19, boa_client);
    });

    it("Create a block with a height is 20 and the block has 5 enrollments", async () => {
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

        // Create new validator's enrollment data.
        enrollments.push(...block_manager.getNewEnrollment());

        // Create enrollment data of validators who need re-enrollment among already registered validators.
        enrollments.push(...block_manager.getReEnrollment());

        // Arrange the enrollment data in ascending order of UTXO.
        enrollments.sort((a, b) => {
            return Utils.compareBuffer(a.utxo_key.data, b.utxo_key.data);
        });

        // Create a new block.
        const new_block = block_manager.saveBlock([tx], enrollments);

        const block_url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(block_url, { block: new_block });
        await block_manager.waitFor(block_manager.getLastBlockHeight(), boa_client);
        assert.strictEqual(block_manager.getLastBlockHeight(), 20);
    });

    it("21-22 Create a dummy block", async () => {
        await createDummyBlock(21);
        await createDummyBlock(22);
        await block_manager.waitFor(22, boa_client);
    });

    it("Test case for ballots", async () => {
        let ballot_answer1 = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 11);
        let ballot_answer2 = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 12);
        let ballot_answer3 = await stoa_server.ledger_storage.getProposalBallots("469008972006", undefined, 13);

        assert.strictEqual(ballot_answer1[0].ballot_answer, BallotData.NO);
        assert.strictEqual(ballot_answer2[0].ballot_answer, BallotData.NO);
        assert.strictEqual(ballot_answer3[0].ballot_answer, BallotData.BLANK);
    });

    it("Test for [ Reject ] Proposals", async () => {
        const uri = URI(stoa_addr).directory("/proposal").filename("469008972006");

        const response = await client.get(uri.toString());
        assert.deepStrictEqual(response.data.proposal_result, ProposalResult.REJECTED);
    });
});
