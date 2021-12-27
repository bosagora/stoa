/*******************************************************************************

    Test BOASCAN server

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as assert from "assert";
import {
    SodiumHelper,
    ProposalType,
    JSBI,
    ProposalData,
    Hash,
    PublicKey,
    Endian,
    Height,
    Validator,
    hash,
    BallotData,
    Enrollment,
    BlockHeader,
    BitMask,
    Signature,
    Block,
    Amount,
} from "boa-sdk-ts";
import { BOASodium } from "boa-sodium-ts";
import URI from "urijs";
import { URL } from "url";
import { CoinGeckoMarket } from "../src/modules/coinmarket/CoinGeckoMarket";
import { IDatabaseConfig } from "../src/modules/common/Config";
import { Exchange } from "../src/modules/common/Exchange";
import { CoinMarketService } from "../src/modules/service/CoinMarketService";
import { VoteraService } from "../src/modules/service/VoteraService";
import { CurrencyType, IMarketCap, IMetaData, IPendingProposal, IProposal, IValidatorByBlock } from "../src/Types";
import { MockDBConfig } from "./TestConfig";
import {
    FakeBlacklistMiddleware,
    market_cap_history_sample_data,
    market_cap_sample_data,
    sample_data,
    TestAgora,
    TestClient,
    TestGeckoServer,
    TestStoa,
    delay,
    TestVoteraServer,
    sample_data3,
    sample_data2,
    sample_data5,
    sample_data4,
} from "./Utils";

describe("Test of Stoa API Server", function () {
    this.timeout(10000);
    const agora_addr: URL = new URL("http://localhost:2800");
    const stoa_addr: URL = new URL("http://localhost:3800");
    const stoa_private_addr: URL = new URL("http://localhost:4800");
    const votera_addr: URL = new URL("http://127.0.0.1:1337/");
    let stoa_server: TestStoa;
    let agora_server: TestAgora;
    const client = new TestClient();
    let testDBConfig: IDatabaseConfig;
    let gecko_server: TestGeckoServer;
    let gecko_market: CoinGeckoMarket;
    let coinMarketService: CoinMarketService;
    let votera_server: TestVoteraServer;
    let votera_service: VoteraService;

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

    before("Start a fake TestCoinGeckoServer", () => {
        return new Promise<void>(async (resolve, reject) => {
            gecko_server = new TestGeckoServer("7876", market_cap_sample_data, market_cap_history_sample_data, resolve);
            gecko_market = new CoinGeckoMarket(gecko_server);
        });
    });

    before("Start a fake TestCoinGecko", () => {
        coinMarketService = new CoinMarketService(gecko_market);
    });

    before("Start a fake votera Server and Service", () => {
        return new Promise<void>(async (resolve, reject) => {
            votera_server = new TestVoteraServer(1337, votera_addr, resolve);
            votera_service = new VoteraService(votera_addr);
        });
    });
    before("Create TestStoa", () => {
        testDBConfig = MockDBConfig();
        stoa_server = new TestStoa(
            testDBConfig,
            agora_addr,
            parseInt(stoa_addr.port, 10),
            votera_service,
            coinMarketService
        );
        return stoa_server.createStorage();
    });

    before("Start TestStoa", async () => {
        await stoa_server.start();
        await stoa_server.voteraService?.stop();
        return;
    });

    after("Stop Stoa and Agora server instances", async () => {
        await stoa_server.ledger_storage.dropTestDB(testDBConfig.database);
        await stoa_server.stop();
        await votera_server.stop();
        await gecko_server.stop();
        await agora_server.stop();
    });

    it("Test of the path /latest-blocks", async () => {
        const uri = URI(stoa_addr).directory("/latest-blocks").addSearch("page", "1").addSearch("limit", "10");

        const response = await client.get(uri.toString());
        const expected = [
            {
                enrollment_count: "0",
                full_count: 2,
                hash: "0x5216c0ef8763a4c4b36404d837a1db4778996f7955f0fe459cabc66a36692947d0a93f6191ad33024ff0dc304ae1360f08203bf17c611ba438a1c1735d67af52",
                height: "1",
                merkle_root:
                    "0xaf887747962e5ba515cb56fcfe74b1a3f3a6bbcb15e28ce5354926af7835f0b587bc2b1fbb043f0f36921cd565102e581cd8062a3f7012475ad4cad5e3ac550c",
                signature:
                    "0xec522046957581733f1c038c8483f8c7422d626de697481992ddcfed77edb7a50b5a7f1078fca7ba8a99e9a3f92eb80cfdabe280033e934d6691d2bfc7da4e84",
                time_stamp: 1609459800,
                tx_count: "8",
                validators: 5,
            },
            {
                enrollment_count: "6",
                full_count: 2,
                hash: "0x8365f069fe37ee02f2c4dc6ad816702088fab5fc875c3c67b01f82c285aa2d90b605f57e068139eba1f20ce20578d712f75be4d8568c8f3a7a34604e72aa3175",
                height: "0",
                merkle_root:
                    "0x0923b97e7a4dc9443089471545e796115ef5ad2eed8e92bb8b1de4744f94a95e297a536eb7c152752ca685af7602bc296f5590c2ddf0d91e4fe3dd24fb8e3f72",
                signature:
                    "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                time_stamp: 1609459200,
                tx_count: "3",
                validators: 0,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /latest-transactions", async () => {
        const uri = URI(stoa_addr).directory("/latest-transactions").addSearch("page", "1").addSearch("limit", "10");

        const response = await client.get(uri.toString());
        const expected = [
            {
                amount: "594999999717900",
                full_count: 11,
                height: "1",
                status: "Confirmed",
                time_stamp: 1609459800,
                tx_fee: "282100",
                tx_hash:
                    "0x006b4215543cb0cfa1815c7f16a4f965b6c9d0205cc6eb27f783ebc4e0b5831130f563751cd5230793c285d4d8b1a3c85f3384abc385e691de0bfa2041ed0491",
                tx_size: "366",
                type: "Payment",
            },
            {
                amount: "594999999717900",
                full_count: 11,
                height: "1",
                status: "Confirmed",
                time_stamp: 1609459800,
                tx_fee: "282100",
                tx_hash:
                    "0x4192b4c64083f5e689a8f5262a833438e9574dda8574082f1b4bfb07de7856138373a33e07e1fcd4c4f6bfd26a784c09c1ad98bbc6293fdd754d1ae803640017",
                tx_size: "366",
                type: "Payment",
            },
            {
                amount: "594999999717900",
                full_count: 11,
                height: "1",
                status: "Confirmed",
                time_stamp: 1609459800,
                tx_fee: "282100",
                tx_hash:
                    "0x458af77568cc592eb8e27343cf9b1921ac6af3780315291cfc0dbbfb47c9095045b6e23510c62bb605be2fb08d9f922bfede9ba0ea6efd6bb1a62e86dfc0a8e3",
                tx_size: "366",
                type: "Payment",
            },
            {
                amount: "594999999717900",
                full_count: 11,
                height: "1",
                status: "Confirmed",
                time_stamp: 1609459800,
                tx_fee: "282100",
                tx_hash:
                    "0x52968e7bac4c8d063c808733eecf5981cafb6f8145cc28d1ffa53444dbdae2177892d94498668e0e1be53a4c8a76488ba551d3d356fcb852f85489f338c1f169",
                tx_size: "366",
                type: "Payment",
            },
            {
                amount: "594999999717900",
                full_count: 11,
                height: "1",
                status: "Confirmed",
                time_stamp: 1609459800,
                tx_fee: "282100",
                tx_hash:
                    "0x63a6151e60088d7a8b288faaad8587d8eec4cd107af27cf46d23693ebc786a6179c3a037979c0d80f68a9ac4788a861119265b9c19d8c80c3fedd17973bcda13",
                tx_size: "366",
                type: "Payment",
            },
            {
                amount: "594999999717900",
                full_count: 11,
                height: "1",
                status: "Confirmed",
                time_stamp: 1609459800,
                tx_fee: "282100",
                tx_hash:
                    "0xc0656ae6d41ddb69d2756f67b347c96d12564ecf9dd6461c7d96c6a8f5ae7f41ff9cb87f2e1493aa46fdff52c251938d411a4ded4d8363a2ac959ad387baf7de",
                tx_size: "366",
                type: "Payment",
            },
            {
                amount: "594999999717900",
                full_count: 11,
                height: "1",
                status: "Confirmed",
                time_stamp: 1609459800,
                tx_fee: "282100",
                tx_hash:
                    "0xc7882278ab2f3d1e1bc643e646e30daa3861b89f0162a8dd07a3d34d9e72cf20988d85bfd99b31a9298e1c71bca3d3e06f60fa781b351d00289dd219ca9599a2",
                tx_size: "366",
                type: "Payment",
            },
            {
                amount: "594999999717900",
                full_count: 11,
                height: "1",
                status: "Confirmed",
                time_stamp: 1609459800,
                tx_fee: "282100",
                tx_hash:
                    "0xd37d727bae3cacb60cd89fc279f1edeb4cd6255670de570916bdb5e0dd4674b884e78957759066635fa4ee713580b3b578c5bdf2b7888030fd005c888b6c6c15",
                tx_size: "366",
                type: "Payment",
            },
            {
                amount: "120000000000000",
                full_count: 11,
                height: "0",
                status: "Confirmed",
                time_stamp: 1609459200,
                tx_fee: "0",
                tx_hash:
                    "0xaf63ca7d0b555bbbe65d398165c3d921421114003ee6d42fe11a1b4eaafa6d6e9a57ffc6d35b820d001beeebdcdec9a9d6b7d34fe0062a6d9eb719d8d47237f2",
                tx_size: "278",
                type: "Freeze",
            },
            {
                amount: "120000000000000",
                full_count: 11,
                height: "0",
                status: "Confirmed",
                time_stamp: 1609459200,
                tx_fee: "0",
                tx_hash:
                    "0xbf5685b8bc230a0463d1b5c64a8dd3cab09de95cd6e71649a43af680569770b279646a8a5453bd157a6d2066850c27e941c662eb22c8ebae922989487bc53e58",
                tx_size: "278",
                type: "Freeze",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /block-summary with block height", async () => {
        const uri = URI(stoa_addr).directory("block-summary").addSearch("height", "1");

        const response = await client.get(uri.toString());
        const expected = {
            hash: "0x5216c0ef8763a4c4b36404d837a1db4778996f7955f0fe459cabc66a36692947d0a93f6191ad33024ff0dc304ae1360f08203bf17c611ba438a1c1735d67af52",
            height: "1",
            merkle_root:
                "0xaf887747962e5ba515cb56fcfe74b1a3f3a6bbcb15e28ce5354926af7835f0b587bc2b1fbb043f0f36921cd565102e581cd8062a3f7012475ad4cad5e3ac550c",
            prev_hash:
                "0x8365f069fe37ee02f2c4dc6ad816702088fab5fc875c3c67b01f82c285aa2d90b605f57e068139eba1f20ce20578d712f75be4d8568c8f3a7a34604e72aa3175",
            random_seed: "",
            signature:
                "0xec522046957581733f1c038c8483f8c7422d626de697481992ddcfed77edb7a50b5a7f1078fca7ba8a99e9a3f92eb80cfdabe280033e934d6691d2bfc7da4e84",
            time: 1609459800,
            total_fee: 2256800,
            total_received: 4759999997743200,
            total_reward: 0,
            total_sent: 4760000000000000,
            total_size: 4473,
            total_transactions: 8,
            tx_volume: "4760000000000000",
            version: "",
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /block-enrollments with block height", async () => {
        const uri = URI(stoa_addr)
            .directory("block-enrollments")
            .addSearch("height", "0")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        const response = await client.get(uri.toString());
        const expected = [
            {
                commitment:
                    "0x12f7fc1c953a13101e60c823ecd502fc9215a4dc7c1f3408db37ed70e62e45f9dda92c3b0592ad3fde04c4241bfe65e207704db9794e6fd92641f54a17747ab3",
                cycle_length: 20,
                enroll_sig:
                    "0x6d7a10ce4912b89806800cd66c6b58e66ccb78625afa865119c6d598aa061d18098e45596199261710d32c8c1b6565a1b2341cae9f773b6dca53dc26b7d49cf2",
                full_count: 6,
                height: "0",
                utxo: "0x0666c4d505b55b6840fbb669ec08a1849e699d5a30ba246989b65ea71292f8ac9a3d7126ca9061313d3225d6e324146f37cdc5dab51facbbc3beead6854e89a4",
            },
            {
                commitment:
                    "0x659467b85b216489e090d8b77e4de9fa67d4c0824ee27a798d302e3cac0f2e527abe04db5e84a87fadb101edb60342687fec3d094af2a4bfdd3f73b4176f00a0",
                cycle_length: 20,
                enroll_sig:
                    "0xa669a117712a49b470c2bfe885015a185c60fc158b8086a74f585804bf8962de0f076c77115f49a043035fd293318d8c9462f943db4d9a9b7c9bc9cccfd1254f",
                full_count: 6,
                height: "0",
                utxo: "0x2b1fcfb62b868a53287fbdfbc17631f5a4e1cfdb91e58dfc0a8ebf083e92994dd327b0b574c81f0e29394d3abbf67f609ad67bce49c9d9b59672fa5a61a37495",
            },
            {
                commitment:
                    "0x3c4e8f32879e16a6d856f6360045ad263b7be2c22cfa55d6178dcf138955b92748a105cf9cc3f697b8b6dfc126ab81fb56a7349f57b9ddb443fbd880658b94f0",
                cycle_length: 20,
                enroll_sig:
                    "0x221c3179366b4f12cb2ac1a323c312a2c56d96854b9b1aa0a50eb348766b50f5080735f10ccaba022a8e6d540b679a5453d622bd398915c143b5cbb4195da1d7",
                full_count: 6,
                height: "0",
                utxo: "0x6bceb7f5997df362bd0808826ef9577d7f8389bf9c75a471362aa5a24f1d64c9074850f29c6c078e2a7fa8555ec81fde75c2c8b6a8c0adc8d75057bbcb51116a",
            },
            {
                commitment:
                    "0x2ef9c7042d38c6a212907ff065e355d0ce78cf315ba63c37dff58fbe4f484ccddaf03753918730a79a64927b2c1e4996296506abfeb484d8fe338311494cc3b3",
                cycle_length: 20,
                enroll_sig:
                    "0x8ff3e4f89919ce3f010223ffa03ea908c4963cddae7165fa9eaa53d071780d1a086bf1e2594e6745c597cbedd491fa3aa568e58faee89a31ec05bb8f5c1a1e28",
                full_count: 6,
                height: "0",
                utxo: "0x84daa1d361afd9238041431b838500103eeb16d7952486077830a31a77ecc31d40f3a9d3f3a1c92dc3a0e5723ba6de9d87f107a73c73aef6a45bf9862c663493",
            },
            {
                commitment:
                    "0xbdb489da86fb8aeda9d09478b1936d9dc57b243eae9d31381270e533d48985a2a235e880c4b225e8a2f23aace36a6c5590ef47d5c3143b5115bc5137b6a200c2",
                cycle_length: 20,
                enroll_sig:
                    "0x7702482cdbed0ef9751cad41ca46b172edbd4c0db7fe8536ecb82e87aead31fa01fb58b031b139074ef97a17d7c746fe9261b194bad95a906648bee08234f199",
                full_count: 6,
                height: "0",
                utxo: "0x94b78736ae8ddf97f05a30e549f5eab377648a9116f3033ab7dcb8c9528ee717fd8d94dae7fe3ecc9d43290204ca2a41f710e798a3446b553c7a415d968e7177",
            },
            {
                commitment:
                    "0x5666c8993722e5ba725a60174fa2ec28c37ea0569e0366c612b278de7afa0e25c40d6e1a3f1e3c62fe67712df211f989f0f4cb3f0a2745d24e9f830c88c3d6c3",
                cycle_length: 20,
                enroll_sig:
                    "0x0c7110ea3fcc9fd683ad4b0edcd8956a8716830dee4c8755e773d10f611b32aa0e32d68f5c7961054356148e99c9abc978019fca71b1d4fc9685ecc6a9575fd1",
                full_count: 6,
                height: "0",
                utxo: "0xa3c2660bd4c65d6153bbe5bfac2cff06f68364c92e1f2619a4faede13943267df958efd9117c87125180241d678ff7278557fb8e83e486872a1eb8d83c41b4e1",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test of the path /block-enrollments with block hash", async () => {
        const uri = URI(stoa_addr)
            .directory("block-enrollments")
            .addSearch(
                "hash",
                "0x8365f069fe37ee02f2c4dc6ad816702088fab5fc875c3c67b01f82c285aa2d90b605f57e068139eba1f20ce20578d712f75be4d8568c8f3a7a34604e72aa3175"
            )
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        const response = await client.get(uri.toString());
        const expected = [
            {
                commitment:
                    "0x12f7fc1c953a13101e60c823ecd502fc9215a4dc7c1f3408db37ed70e62e45f9dda92c3b0592ad3fde04c4241bfe65e207704db9794e6fd92641f54a17747ab3",
                cycle_length: 20,
                enroll_sig:
                    "0x6d7a10ce4912b89806800cd66c6b58e66ccb78625afa865119c6d598aa061d18098e45596199261710d32c8c1b6565a1b2341cae9f773b6dca53dc26b7d49cf2",
                full_count: 6,
                height: "0",
                utxo: "0x0666c4d505b55b6840fbb669ec08a1849e699d5a30ba246989b65ea71292f8ac9a3d7126ca9061313d3225d6e324146f37cdc5dab51facbbc3beead6854e89a4",
            },
            {
                commitment:
                    "0x659467b85b216489e090d8b77e4de9fa67d4c0824ee27a798d302e3cac0f2e527abe04db5e84a87fadb101edb60342687fec3d094af2a4bfdd3f73b4176f00a0",
                cycle_length: 20,
                enroll_sig:
                    "0xa669a117712a49b470c2bfe885015a185c60fc158b8086a74f585804bf8962de0f076c77115f49a043035fd293318d8c9462f943db4d9a9b7c9bc9cccfd1254f",
                full_count: 6,
                height: "0",
                utxo: "0x2b1fcfb62b868a53287fbdfbc17631f5a4e1cfdb91e58dfc0a8ebf083e92994dd327b0b574c81f0e29394d3abbf67f609ad67bce49c9d9b59672fa5a61a37495",
            },
            {
                commitment:
                    "0x3c4e8f32879e16a6d856f6360045ad263b7be2c22cfa55d6178dcf138955b92748a105cf9cc3f697b8b6dfc126ab81fb56a7349f57b9ddb443fbd880658b94f0",
                cycle_length: 20,
                enroll_sig:
                    "0x221c3179366b4f12cb2ac1a323c312a2c56d96854b9b1aa0a50eb348766b50f5080735f10ccaba022a8e6d540b679a5453d622bd398915c143b5cbb4195da1d7",
                full_count: 6,
                height: "0",
                utxo: "0x6bceb7f5997df362bd0808826ef9577d7f8389bf9c75a471362aa5a24f1d64c9074850f29c6c078e2a7fa8555ec81fde75c2c8b6a8c0adc8d75057bbcb51116a",
            },
            {
                commitment:
                    "0x2ef9c7042d38c6a212907ff065e355d0ce78cf315ba63c37dff58fbe4f484ccddaf03753918730a79a64927b2c1e4996296506abfeb484d8fe338311494cc3b3",
                cycle_length: 20,
                enroll_sig:
                    "0x8ff3e4f89919ce3f010223ffa03ea908c4963cddae7165fa9eaa53d071780d1a086bf1e2594e6745c597cbedd491fa3aa568e58faee89a31ec05bb8f5c1a1e28",
                full_count: 6,
                height: "0",
                utxo: "0x84daa1d361afd9238041431b838500103eeb16d7952486077830a31a77ecc31d40f3a9d3f3a1c92dc3a0e5723ba6de9d87f107a73c73aef6a45bf9862c663493",
            },
            {
                commitment:
                    "0xbdb489da86fb8aeda9d09478b1936d9dc57b243eae9d31381270e533d48985a2a235e880c4b225e8a2f23aace36a6c5590ef47d5c3143b5115bc5137b6a200c2",
                cycle_length: 20,
                enroll_sig:
                    "0x7702482cdbed0ef9751cad41ca46b172edbd4c0db7fe8536ecb82e87aead31fa01fb58b031b139074ef97a17d7c746fe9261b194bad95a906648bee08234f199",
                full_count: 6,
                height: "0",
                utxo: "0x94b78736ae8ddf97f05a30e549f5eab377648a9116f3033ab7dcb8c9528ee717fd8d94dae7fe3ecc9d43290204ca2a41f710e798a3446b553c7a415d968e7177",
            },
            {
                commitment:
                    "0x5666c8993722e5ba725a60174fa2ec28c37ea0569e0366c612b278de7afa0e25c40d6e1a3f1e3c62fe67712df211f989f0f4cb3f0a2745d24e9f830c88c3d6c3",
                cycle_length: 20,
                enroll_sig:
                    "0x0c7110ea3fcc9fd683ad4b0edcd8956a8716830dee4c8755e773d10f611b32aa0e32d68f5c7961054356148e99c9abc978019fca71b1d4fc9685ecc6a9575fd1",
                full_count: 6,
                height: "0",
                utxo: "0xa3c2660bd4c65d6153bbe5bfac2cff06f68364c92e1f2619a4faede13943267df958efd9117c87125180241d678ff7278557fb8e83e486872a1eb8d83c41b4e1",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test of the path /block-transactions with block height", async () => {
        const uri = URI(stoa_addr)
            .directory("block-transactions")
            .addSearch("height", "0")
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        const response = await client.get(uri.toString());
        const expected = [
            {
                amount: "120000000000000",
                fee: 0,
                full_count: 3,
                height: "0",
                receiver: [
                    {
                        address: "boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xrval6hd8szdektyz69fnqjwqfejhu4rvrpwlahh9rhaazzpvs5g6lh34l5",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xrval7gwhjz4k9raqukcnv2n4rl4fxt74m2y9eay6l5mqdf4gntnzhhscrh",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xzval2a3cdxv28n6slr62wlczslk3juvk7cu05qt3z55ty2rlfqfc6egsh2",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xzval3ah8z7ewhuzx6mywveyr79f24w49rdypwgurhjkr8z2ke2mycftv9n",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xzval4nvru2ej9m0rptq7hatukkavemryvct4f8smyy3ky9ct5u0s8w6gfy",
                        amount: 20000000000000,
                        type: 1,
                    },
                ],
                sender_address: null,
                size: 278,
                time: 1609459200,
                tx_hash:
                    "0xaf63ca7d0b555bbbe65d398165c3d921421114003ee6d42fe11a1b4eaafa6d6e9a57ffc6d35b820d001beeebdcdec9a9d6b7d34fe0062a6d9eb719d8d47237f2",
                type: "Freeze",
            },
            {
                amount: "120000000000000",
                fee: 0,
                full_count: 3,
                height: "0",
                receiver: [
                    {
                        address: "boa1xpval9gv8wjk5s05w0vplpgd5wrmzlvhj4e6zym302f2t6xeklzw2meepv9",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xqvala342upf2t2c0fe96h8cdtjatrksjldyhsrachcq3523ah8dy5r8ejz",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xqvalc7v34kr9crh4e882zmguvt3dgmtdhxtqx0wsljej5f9xdxl6xftcay",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xrvaldd5au5d5xs6pd6js7zah6m4h5d0r5tpwjasp99gvz3gmj2ex432u5x",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xzval8mq887lkjsqwyl58xyrkxxz8mphv5dx9qv2z750fxvcs9gtvpal0dm",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xzvale54hw9zk69t7hpgu422ht2nkv3gkx7k8nhph5vg2tkpwpnzuarah4d",
                        amount: 20000000000000,
                        type: 1,
                    },
                ],
                sender_address: null,
                size: 278,
                time: 1609459200,
                tx_hash:
                    "0xbf5685b8bc230a0463d1b5c64a8dd3cab09de95cd6e71649a43af680569770b279646a8a5453bd157a6d2066850c27e941c662eb22c8ebae922989487bc53e58",
                type: "Freeze",
            },
            {
                amount: "4760000000000000",
                fee: 0,
                full_count: 3,
                height: "0",
                receiver: [
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                ],
                sender_address: null,
                size: 368,
                time: 1609459200,
                tx_hash:
                    "0xf1b227276819be01f574bad7bcb26afddafbc14a3cb6052c5006e4b35c483e20864ba8388adcf8f9870cc2a028ec41dc563a91b8c09d13f95277e0b5bdad1ac3",
                type: "Payment",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /block-transactions with block hash", async () => {
        const uri = URI(stoa_addr)
            .directory("block-transactions")
            .addSearch(
                "hash",
                "0x8365f069fe37ee02f2c4dc6ad816702088fab5fc875c3c67b01f82c285aa2d90b605f57e068139eba1f20ce20578d712f75be4d8568c8f3a7a34604e72aa3175"
            )
            .addSearch("page", "1")
            .addSearch("page_size", "10");
        const response = await client.get(uri.toString());
        const expected = [
            {
                amount: "120000000000000",
                fee: 0,
                full_count: 3,
                height: "0",
                receiver: [
                    {
                        address: "boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xrval6hd8szdektyz69fnqjwqfejhu4rvrpwlahh9rhaazzpvs5g6lh34l5",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xrval7gwhjz4k9raqukcnv2n4rl4fxt74m2y9eay6l5mqdf4gntnzhhscrh",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xzval2a3cdxv28n6slr62wlczslk3juvk7cu05qt3z55ty2rlfqfc6egsh2",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xzval3ah8z7ewhuzx6mywveyr79f24w49rdypwgurhjkr8z2ke2mycftv9n",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xzval4nvru2ej9m0rptq7hatukkavemryvct4f8smyy3ky9ct5u0s8w6gfy",
                        amount: 20000000000000,
                        type: 1,
                    },
                ],
                sender_address: null,
                size: 278,
                time: 1609459200,
                tx_hash:
                    "0xaf63ca7d0b555bbbe65d398165c3d921421114003ee6d42fe11a1b4eaafa6d6e9a57ffc6d35b820d001beeebdcdec9a9d6b7d34fe0062a6d9eb719d8d47237f2",
                type: "Freeze",
            },
            {
                amount: "120000000000000",
                fee: 0,
                full_count: 3,
                height: "0",
                receiver: [
                    {
                        address: "boa1xpval9gv8wjk5s05w0vplpgd5wrmzlvhj4e6zym302f2t6xeklzw2meepv9",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xqvala342upf2t2c0fe96h8cdtjatrksjldyhsrachcq3523ah8dy5r8ejz",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xqvalc7v34kr9crh4e882zmguvt3dgmtdhxtqx0wsljej5f9xdxl6xftcay",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xrvaldd5au5d5xs6pd6js7zah6m4h5d0r5tpwjasp99gvz3gmj2ex432u5x",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xzval8mq887lkjsqwyl58xyrkxxz8mphv5dx9qv2z750fxvcs9gtvpal0dm",
                        amount: 20000000000000,
                        type: 1,
                    },
                    {
                        address: "boa1xzvale54hw9zk69t7hpgu422ht2nkv3gkx7k8nhph5vg2tkpwpnzuarah4d",
                        amount: 20000000000000,
                        type: 1,
                    },
                ],
                sender_address: null,
                size: 278,
                time: 1609459200,
                tx_hash:
                    "0xbf5685b8bc230a0463d1b5c64a8dd3cab09de95cd6e71649a43af680569770b279646a8a5453bd157a6d2066850c27e941c662eb22c8ebae922989487bc53e58",
                type: "Freeze",
            },
            {
                amount: "4760000000000000",
                fee: 0,
                full_count: 3,
                height: "0",
                receiver: [
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                    {
                        address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                        amount: 595000000000000,
                        type: 0,
                    },
                ],
                sender_address: null,
                size: 368,
                time: 1609459200,
                tx_hash:
                    "0xf1b227276819be01f574bad7bcb26afddafbc14a3cb6052c5006e4b35c483e20864ba8388adcf8f9870cc2a028ec41dc563a91b8c09d13f95277e0b5bdad1ac3",
                type: "Payment",
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test for putCoinMarketStats method", async () => {
        const data: IMarketCap = await gecko_market.fetch(CurrencyType.USD);
        const response = await stoa_server.putCoinMarketStats(data);
        assert.deepStrictEqual(response.affectedRows, 1);
    });

    it("Test for /coinmarketcap", async () => {
        const uri = URI(stoa_addr).directory("/coinmarketcap").addSearch("currency", "usd");
        const response = await client.get(uri.toString());
        const expected = {
            last_updated_at: 1622599176,
            price: "0.239252",
            market_cap: 72635724,
            vol_24h: 1835353,
            change_24h: -7,
            currency: "usd",
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /boa-stats", async () => {
        const uri = URI(stoa_addr).directory("boa-stats");
        const response = await client.get(uri.toString());
        const expected = {
            active_validators: 5,
            circulating_supply: 4999999997743200,
            frozen_coin: "240000000000000",
            height: 1,
            price: 119625999.946006,
            time_stamp: 1609459800,
            total_reward: "0",
            transactions: "11",
            validators: 5,
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test for /holders", async () => {
        const uri = URI(stoa_addr)
            .directory("/holders")
            .addSearch("currency", "usd")
            .addSearch("page", "1")
            .addSearch("pageSize", "10");
        const response = await client.get(uri.toString());
        const expected = [
            {
                address: "boa1xplw00mldxs85l4vuxgse9szjwhtvv99vtp44e7slzwqa8mt6350vysxady",
                full_count: 22,
                percentage: "19.0400",
                total_balance: 951999999548640,
                total_frozen: 0,
                total_received: 951999999548640,
                total_reward: 0,
                total_sent: 0,
                total_spendable: 951999999548640,
                tx_count: 8,
                value: 22776790.389201,
            },
            {
                address: "boa1xpaqh00j6amm5unu56tdg9l2vezq5znhdmkgzlwyydyhw7lvf2vlkq4kwpq",
                full_count: 22,
                percentage: "16.6600",
                total_balance: 832999999605060,
                total_frozen: 0,
                total_received: 832999999605060,
                total_reward: 0,
                total_sent: 0,
                total_spendable: 832999999605060,
                tx_count: 7,
                value: 19929691.590551,
            },
            {
                address: "boa1xzca00zkzjge2h7sc30d5durkkxeuf2fv9d0q4tyddpn5r8f93dwjdyatgp",
                full_count: 22,
                percentage: "11.9000",
                total_balance: 594999999717900,
                total_frozen: 0,
                total_received: 594999999717900,
                total_reward: 0,
                total_sent: 0,
                total_spendable: 594999999717900,
                tx_count: 5,
                value: 14235493.993251,
            },
            {
                address: "boa1xzvr00tkrefwf9k3eem3uu3k9f36l5xap4sjjpfcd64ragwq5f3eqqts3ft",
                full_count: 22,
                percentage: "11.9000",
                total_balance: 594999999717900,
                total_frozen: 0,
                total_received: 594999999717900,
                total_reward: 0,
                total_sent: 0,
                total_spendable: 594999999717900,
                tx_count: 5,
                value: 14235493.993251,
            },
            {
                address: "boa1xppz00cv25tjfkx93j998g90ggjmpyky64dtxuaqh5qxcxud5f9yww64cxq",
                full_count: 22,
                percentage: "9.5200",
                total_balance: 475999999774320,
                total_frozen: 0,
                total_received: 475999999774320,
                total_reward: 0,
                total_sent: 0,
                total_spendable: 475999999774320,
                tx_count: 4,
                value: 11388395.194601,
            },
            {
                address: "boa1xrnm00uh8v7vv9vk2l8vlhz3feaz80c9s8mk9jmkwe5tx7ccwy4v7lmhny5",
                full_count: 22,
                percentage: "9.5200",
                total_balance: 475999999774320,
                total_frozen: 0,
                total_received: 475999999774320,
                total_reward: 0,
                total_sent: 0,
                total_spendable: 475999999774320,
                tx_count: 4,
                value: 11388395.194601,
            },
            {
                address: "boa1xpafy0035qy2xludu2s203rnvj7z62uyq2a0v4kz593lwlx3tx0z5nf8hap",
                full_count: 22,
                percentage: "7.1400",
                total_balance: 356999999830740,
                total_frozen: 0,
                total_received: 356999999830740,
                total_reward: 0,
                total_sent: 0,
                total_spendable: 356999999830740,
                tx_count: 3,
                value: 8541296.39595,
            },
            {
                address: "boa1xzcp004fmz534clzk23u3vqa03z7n432wf67rpsrxs6x5gzxm97ykl52436",
                full_count: 22,
                percentage: "7.1400",
                total_balance: 356999999830740,
                total_frozen: 0,
                total_received: 356999999830740,
                total_reward: 0,
                total_sent: 0,
                total_spendable: 356999999830740,
                tx_count: 3,
                value: 8541296.39595,
            },
            {
                address: "boa1xrajh00as4l8u8jrvjtfqleae59nrzt8vnjpxf8ys6uzzmyarygfc7j2xx5",
                full_count: 22,
                percentage: "2.3800",
                total_balance: 118999999943580,
                total_frozen: 0,
                total_received: 118999999943580,
                total_reward: 0,
                total_sent: 0,
                total_spendable: 118999999943580,
                tx_count: 1,
                value: 2847098.79865,
            },
            {
                address: "boa1xpval9gv8wjk5s05w0vplpgd5wrmzlvhj4e6zym302f2t6xeklzw2meepv9",
                full_count: 22,
                percentage: "0.4000",
                total_balance: 20000000000000,
                total_frozen: 20000000000000,
                total_received: 20000000000000,
                total_reward: 0,
                total_sent: 0,
                total_spendable: 0,
                tx_count: 1,
                value: 478504,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test for path /holder_balance_history", async () => {
        const uri = URI(stoa_addr)
            .directory("/holder_balance_history")
            .filename("boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67")
            .setSearch("date", "1609545600")
            .setSearch("filter", "H");
        const response = await client.get(uri.toString());
        const expected = [
            {
                address: "boa1xzgenes5cf8xel37fz79gzs49v56znllk7jw7qscjwl5p6a9zxk8zaygm67",
                granularity: "H",
                granularity_time_stamp: 1609459200,
                time_stamp: 1609459800,
                balance: 0,
                block_height: 1,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test for /holder/:address", async () => {
        const uri = URI(stoa_addr)
            .directory("/holder")
            .filename("boa1xpaqh00j6amm5unu56tdg9l2vezq5znhdmkgzlwyydyhw7lvf2vlkq4kwpq")
            .addSearch("currency", "usd");
        const response = await client.get(uri.toString());
        const expected = {
            address: "boa1xpaqh00j6amm5unu56tdg9l2vezq5znhdmkgzlwyydyhw7lvf2vlkq4kwpq",
            percentage: "16.6600",
            total_balance: 832999999605060,
            total_frozen: 0,
            total_received: 832999999605060,
            total_reward: 0,
            total_sent: 0,
            total_spendable: 0,
            tx_count: 7,
            value: 19929691.590551,
        };
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test for path /average_fee_chart/", async () => {
        const uri = URI(stoa_addr)
            .directory("/average_fee_chart")
            .setSearch("date", "1609459200")
            .setSearch("filter", "M");
        const response = await client.get(uri.toString());
        const expected = [
            {
                average_tx_fee: 770,
                granularity: "D",
                granularity_time_stamp: 1609459200,
                height: 1,
                time_stamp: 1609459800,
                total_fee: 2256800,
                total_payload_fee: 0,
                total_tx_fee: 2256800,
            },
        ];
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test for path /search by block hash", async () => {
        const uri = URI(stoa_addr)
            .directory("/search/hash/")
            .filename(
                "0x5216c0ef8763a4c4b36404d837a1db4778996f7955f0fe459cabc66a36692947d0a93f6191ad33024ff0dc304ae1360f08203bf17c611ba438a1c1735d67af52"
            );
        const response = await client.get(uri.toString());
        const expected = { block: 1, transaction: 0 };
        assert.deepStrictEqual(response.data, expected);
    });
    it("Test for path /search by transaction hash", async () => {
        const uri = URI(stoa_addr)
            .directory("/search/hash/")
            .filename(
                "0xaf63ca7d0b555bbbe65d398165c3d921421114003ee6d42fe11a1b4eaafa6d6e9a57ffc6d35b820d001beeebdcdec9a9d6b7d34fe0062a6d9eb719d8d47237f2"
            );
        const response = await client.get(uri.toString());
        const expected = { block: 0, transaction: 1 };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test for writing reward transactions block", async () => {
        const url = URI(stoa_private_addr).directory("block_externalized").toString();
        await client.post(url, { block: sample_data2 });
        await delay(500);
        await client.post(url, { block: sample_data3 });
        await delay(500);
        await client.post(url, { block: sample_data4 });
        await delay(500);
        await client.post(url, { block: sample_data5 });
        await delay(1000);

        //  Verifies that all sent blocks are wrote
        const uri = URI(stoa_addr).directory("/block_height");
        const response = await client.get(uri.toString());

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data, "5");
    });

    // it("Test for path /validator/reward/:address", async () => {
    //     const uri = URI(stoa_addr)
    //         .directory("/validator/reward")
    //         .filename("boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8");
    //     const response = await client.get(uri.toString());
    //     let expected = [
    //         {
    //             block_height: 5,
    //             steaking_amount: 0,
    //             block_reward: 8717784200000,
    //             block_fee: 0,
    //             validator_reward: 12962823333,
    //             full_count: 1,
    //         },
    //     ];
    //
    //     assert.deepStrictEqual(response.data, expected);
    // });

    it("Test for /convert-to-currency", async () => {
        const uri = URI(stoa_addr)
            .directory("/convert-to-currency")
            .addSearch("amount", "1.23")
            .addSearch("currency", "usd");

        const response = await client.get(uri.toString());
        let expected = { amount: 1.23, currency: 0.29428 };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test for convertBoaToUsd()", async () => {
        let rate = 3450246;
        let Boa = 0.5;
        let exchange = new Exchange(rate);
        let value = exchange.convertBoaToCurrency(Boa);
        assert.deepStrictEqual(value, rate * Boa);
    });

    it("Test for convertBalanceToUsd()", async () => {
        let rate = 3450246;
        let amount = new Amount(4880000000000000);
        let exchange = new Exchange(rate);

        let value = exchange.convertAmountToCurrency(amount);
        assert.deepStrictEqual(value, rate * 488000000);
    });
    it("Test of the path /boa-stats with circulating and reward", async () => {
        const uri = URI(stoa_addr).directory("boa-stats");
        const response = await client.get(uri.toString());
        const expected = {
            "active_validators": 5,
            "circulating_supply": 4999999967521368,
            "frozen_coin": "240000000000000",
            "height": 5,
            "price": 119625999.222942,
            "time_stamp": 1609462200,
            "total_reward": "0",
            "transactions": "57",
            "validators": 5,
        };
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /txhash/:utxo", async () => {
        const uri = URI(stoa_addr)
            .directory("/txhash")
            .filename(
                "0xe878a3ddddbf7f3b6bb0fb1852cb333c1166d829a8cb71a818d3045fdae4641b45d12c27a3a530beab9a26211e22bf30244561876cc79fb891afcd55d7d614c3"
            );

        const response = await client.get(uri.toString());
        const expected =
            "0xfdfae0ac3110785170ebadce205eda050bfed9c5a38e52dc79ba26ffc85e3d808b758c30e49a2d2b9ec95cc33d71408a0e0a68aea3d7272f4ff19eb63d4a42ac";
        assert.strictEqual(response.data, expected);
    });

    it("Test of the path /validator/missed-blocks/:address", async () => {
        const uri = URI(stoa_addr)
            .directory("/validator/missed-blocks")
            .filename("boa1xzval2a3cdxv28n6slr62wlczslk3juvk7cu05qt3z55ty2rlfqfc6egsh2");

        const response = await client.get(uri.toString());
        const expected = [{ block_height: 1, signed: 0 }];
        assert.deepStrictEqual(response.data, expected);
    });

    it("Test of the path /block/validators", async () => {
        const uri = URI(stoa_addr).directory("/block/validators").addSearch("height", "2");

        const response = await client.get(uri.toString());
        const expected = [
            {
                "address": "boa1xrval5rzmma29zh4aqgv3mvcarhwa0w8rgthy3l9vaj3fywf9894ycmjkm8",
                "block_signed": 1,
                "full_count": 5,
                "pre_image": {
                    "hash": "0x4cab780babbcf05da2af4d44f5655ce275aacba52ccf166e528f6cb04d8a9f66df80eccc5508f5af34080ab6a9b7b91a01537641785f50f172f1118d67d52853",
                    "height": "2",
                },
                "slashed": 0,
                "utxo_key": "0x0666c4d505b55b6840fbb669ec08a1849e699d5a30ba246989b65ea71292f8ac9a3d7126ca9061313d3225d6e324146f37cdc5dab51facbbc3beead6854e89a4",
            },
            {
                "address": "boa1xzval3ah8z7ewhuzx6mywveyr79f24w49rdypwgurhjkr8z2ke2mycftv9n",
                "block_signed": 1,
                "full_count": 5,
                "pre_image": {
                    "hash": "0xa9d657de27353167331bbb87758f001941e3eacdc83ab44b9988b7e44b259407bb00ad4e4abe1bd91af3c7ac935d830b2dc46545f607fe4e77ec8da9605ab26a",
                    "height": "2",
                },
                "slashed": 0,
                "utxo_key": "0x2b1fcfb62b868a53287fbdfbc17631f5a4e1cfdb91e58dfc0a8ebf083e92994dd327b0b574c81f0e29394d3abbf67f609ad67bce49c9d9b59672fa5a61a37495",
            },
            {
                "address": "boa1xrval7gwhjz4k9raqukcnv2n4rl4fxt74m2y9eay6l5mqdf4gntnzhhscrh",
                "block_signed": 1,
                "full_count": 5,
                "pre_image": {
                    "hash": "0xa94f0dffe37146a93d0c8253bd561c4f1e3a067f6027b788e08b3f02cbb1ddec8703791b9b5a168a719331f516de259b7852c151f42461e020b0da72c9396074",
                    "height": "2",
                },
                "slashed": 0,
                "utxo_key": "0x6bceb7f5997df362bd0808826ef9577d7f8389bf9c75a471362aa5a24f1d64c9074850f29c6c078e2a7fa8555ec81fde75c2c8b6a8c0adc8d75057bbcb51116a",
            },
            {
                "address": "boa1xrval6hd8szdektyz69fnqjwqfejhu4rvrpwlahh9rhaazzpvs5g6lh34l5",
                "block_signed": 1,
                "full_count": 5,
                "pre_image": {
                    "hash": "0xea6a06127ee6100f6d1966a35e8345052003d27b1c04eab546b75ca132b51021982790d59860a3a3a2e1d81838af551df454f77e1a31cdb46f8e9c15b2fa6709",
                    "height": "2",
                },
                "slashed": 0,
                "utxo_key": "0x84daa1d361afd9238041431b838500103eeb16d7952486077830a31a77ecc31d40f3a9d3f3a1c92dc3a0e5723ba6de9d87f107a73c73aef6a45bf9862c663493",
            },
            {
                "address": "boa1xzval4nvru2ej9m0rptq7hatukkavemryvct4f8smyy3ky9ct5u0s8w6gfy",
                "block_signed": 1,
                "full_count": 5,
                "pre_image": {
                    "hash": "0xcb160f6be5a11d16c3bd4ac4cdc71b0b7d05682f1ca5af3c12ddd9f630b73b4226d61e6bf15c2389f252bfc502cb6ee24ccdb8b919bf0b799896f06fe11bc181",
                    "height": "2",
                },
                "slashed": 0,
                "utxo_key": "0x94b78736ae8ddf97f05a30e549f5eab377648a9116f3033ab7dcb8c9528ee717fd8d94dae7fe3ecc9d43290204ca2a41f710e798a3446b553c7a415d968e7177",
            },
        ];

        assert.deepStrictEqual(response.data, expected);
    });
});
