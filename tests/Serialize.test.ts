/*******************************************************************************

    Test that serialize.

    Copyright:
         Copyright (c) 2020 BOS Platform Foundation Korea
         All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as assert from 'assert';
import { Block, Transaction, BlockHeader, Enrollment, BitField } from "../src/modules/data";
import { writeToString } from "../src/modules/utils/buffer";
import { SmartBuffer } from "smart-buffer";

let sample_block = {
    "header": {
        "prev_block": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "height": {
            "value": 0
        },
        "merkle_root": "0x788c159d62b565655d9f725786c38e6802038ee73d7a9d187b3be1c7de95aa0ba856bf81bb556d7448488e71f4b89ce6eba319d0536798308112416413289254",
        "validators": {
            "_storage": [
                2826960896
            ]
        },
        "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "enrollments": [
            {
                "utxo_key": "0x46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac",
                "random_seed": "0x34404dca05b15527046f83f03da31a9684d03d2d0204d3cb5849d13fb3c989ddf4f2f04f388355e12f4ed2976e0966d5e02a6f7f1d735ca52e192abbb019c79c",
                "cycle_length": 1008,
                "enroll_sig": "0x0c2fd79ec6deb83eb2baa4da7bdfe37595bb42a768dcd66abc62943023fa8068dc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c2147422"
            },
            {
                "utxo_key": "0x4dde806d2e09367f9d5bdaaf46deab01a336a64fdb088dbb94edb171560c63cf6a39377bf0c4d35118775681d989dee46531926299463256da303553f09be6ef",
                "random_seed": "0xd2324c1865135aaba469afa5381df223a4fce45ea1ecca1f6ba2633917aa2427c3b425e3beccd6077cf8b377ed23c6420d120e2a863f9e31100d10d7fb700967",
                "cycle_length": 1008,
                "enroll_sig": "0x0e5907fbe526e9d9f7310c5e3d4be7cd39c281d9f32f34cb5d2d522fa4bdc14b2692d0b8b04133a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c01"
            },
            {
                "utxo_key": "0x8c1561a4475df42afa0830da1f8a678ad4b1d82b6c610f7b03ce69b7e0fabcf537d48ecd0aee6f1cab14290a0fc6313c729edf928ff3576f8656f3b7be5670e0",
                "random_seed": "0x3372d562f2dd84848c06baadc24bbaa7163cbc516d0bab8c1c215779001ee8ead187699f88b2d2dc590a4f3053e9487dd60d2b33f3ef81399ad702626547a7ba",
                "cycle_length": 1008,
                "enroll_sig": "0x00db1855a7a0dcff59e311e4a038f2e41235081881d0ce4da6e6c6f3d81909a47e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9f48a631001304"
            },
            {
                "utxo_key": "0x94908ec79866cf54bb8e87b605e31ce0b5d7c3090f3498237d83edaca9c8ba2d3d180c572af46c1221fb81add163e14adf738df26e3679626e82113b9fe085b0",
                "random_seed": "0x8827a2c313ada26b42bac150aa7a87d0bab0a9472f244fcba60f465bb8a85954bac18b9469e3c0110fec871144df401f7dcb1dab59e1c1add5338098f43b5957",
                "cycle_length": 1008,
                "enroll_sig": "0x0dad7f1ca61325d10c50a9feb95d034ea88954c9840ee15e23c206a5ea11d677fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a6634"
            },
            {
                "utxo_key": "0xb20da9cfbda971f3f573f55eabcd677feaf12f7948e8994a97cdf9e570799b71631e87bb9ebce0d6a402275adfb6e365fdb72139c18559a10df0e5fe4bae08eb",
                "random_seed": "0xae5acc1a182469a8da33e25ebf18bba01f31b4599fe56e61acd4cd73849ada4ed4bfda5eaac47ada6f2223aa4a149170c4c461a96651bd724ee848df4166a951",
                "cycle_length": 1008,
                "enroll_sig": "0x09cb5c2f1493d207021226b28c190a8b049b5f5a72580464c06d65dd97ebca9bd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b31"
            },
            {
                "utxo_key": "0xdb3931bd87d2cea097533d82be0a5e36c54fec8e5570790c3369bd8300c65a03d76d12a74aa38ec3e6866fd64ae56091ed3cbc3ca278ae0c8265ab699ffe2d85",
                "random_seed": "0xedf7098f88b74d7f80c7bc782dea8c5002ca2dc51333002cc8b596eb0e23af5e4611d59947fbeb13acab663483172d13993faf6239a5641fb5ca18b4e1764605",
                "cycle_length": 1008,
                "enroll_sig": "0x018c71ee3eb2030ee6dc60a41bae6119f8d8de7055f63393979dc22b9ce7f5be5c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa74fe2"
            }
        ]
    },
    "txs": [
        {
            "type": 1,
            "inputs": [],
            "outputs": [
                {
                    "value": "20000000000000",
                    "address": "GDNODE2IMTDH7SZHXWDS24EZCMYCEJMRZWB3S4HLRIUP6UNGKVVFLVHQ"
                },
                {
                    "value": "20000000000000",
                    "address": "GDNODE3EWQKF33TPK35DAQ3KXAYSOT4E4ACDOVJMDZQDVKP66IMJEACM"
                },
                {
                    "value": "20000000000000",
                    "address": "GDNODE4KTE7VQUHVBLXIGD7VEFY57X4XV547P72D37SDG7UEO7MWOSNY"
                },
                {
                    "value": "20000000000000",
                    "address": "GDNODE5T7TWJ2S4UQSTM7KDHU2HQHCJUXFYLPZDDYGXIBUAH3U3PJQC2"
                },
                {
                    "value": "20000000000000",
                    "address": "GDNODE6ZXW2NNOOQIGN24MBEZRO5226LSMHGQA3MUAMYQSTJVR7XT6GH"
                },
                {
                    "value": "20000000000000",
                    "address": "GDNODE7J5EUK7T6HLEO2FDUBWZEXVXHJO7C4AF5VZAKZENGQ4WR3IX2U"
                }
            ]
        },
        {
            "type": 0,
            "inputs": [],
            "outputs": [
                {
                    "value": "610000000000000",
                    "address": "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"
                },
                {
                    "value": "610000000000000",
                    "address": "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"
                },
                {
                    "value": "610000000000000",
                    "address": "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"
                },
                {
                    "value": "610000000000000",
                    "address": "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"
                },
                {
                    "value": "610000000000000",
                    "address": "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"
                },
                {
                    "value": "610000000000000",
                    "address": "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"
                },
                {
                    "value": "610000000000000",
                    "address": "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"
                },
                {
                    "value": "610000000000000",
                    "address": "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"
                }
            ]
        }
    ],
    "merkle_tree": [
        "0x6314ce9bc41a7f5b98309c3a3d824647d7613b714c4e3ddbc1c5e9ae46db29715c83127ce259a3851363bff36af2e1e9a51dfa15c36a77c9f8eba6826ff975bc",
        "0x7a5bfeb96f9caefa377cb9a7ffe3ea3dd59ea84d4a1c66304ab8c307a4f47706fe0aec2a73ce2b186a9f45641620995f8c7e4c157cee7940872d96d9b2f0f95c",
        "0x788c159d62b565655d9f725786c38e6802038ee73d7a9d187b3be1c7de95aa0ba856bf81bb556d7448488e71f4b89ce6eba319d0536798308112416413289254"
    ]
};

describe ('Serialize and Deserialize', () =>
{
    let block: Block;

    before ('Prepare test for serialize and deserialize', () =>
    {
        block = new Block();
        block.parseJSON(sample_block);
    });

    it ('Test that serialize and deserialize transaction', () =>
    {
        let buffer = new SmartBuffer();
        block.txs[0].serialize(buffer);
        buffer.readOffset = 0;
        assert.strictEqual(writeToString(buffer.readBuffer()),
            "0xb4a3e5d0349215c8b517c0c577e9dc7a49b6818ea21d59c7cfaf28e9e993e" +
            "1da000012309ce54000ff797fac694a8819a06c03680e93cb6bdd5dcc2430ae" +
            "9b41d0b9d6b4bdd993e1da000012309ce54000fff436dd07d080aec163e4b77" +
            "0b93489038fa667a8cfa684944b9decfcb393e1da000012309ce54000ff67d9" +
            "77847e33e4df43fff779af97dfdf7121f50f83ee0af550583f998a93e1da000" +
            "012309ce54000ff9218f2fea93a601e2c553704e0844f2731b86a4330fa566f" +
            "ee5d14b46493e1da000012309ce54000ff556a55a651ff288aeb70b983cd912" +
            "522301399702d87bd27cb7fc6644893e1da000012309ce54000ff060001"
        );

        let tx = new Transaction();
        buffer.readOffset = 0;
        tx.deserialize(buffer);
        assert.deepStrictEqual(block.txs[0], tx);
    });

    it ('Test that serialize and deserialize enrollment', () =>
    {
        let buffer = new SmartBuffer();
        block.header.enrollments[0].serialize(buffer);
        assert.strictEqual(writeToString(buffer.readBuffer()),
            "0x0c2fd79ec6deb83eb2baa4da7bdfe37595bb42a768dcd66abc62943023fa8" +
            "068dc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c214" +
            "742203f0fd34404dca05b15527046f83f03da31a9684d03d2d0204d3cb5849d" +
            "13fb3c989ddf4f2f04f388355e12f4ed2976e0966d5e02a6f7f1d735ca52e19" +
            "2abbb019c79c46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f9" +
            "9e17576b809c7e9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51d" +
            "c339c47052a3ac"
        );

        let enrollment = new Enrollment();
        buffer.readOffset = 0;
        enrollment.deserialize(buffer);
        assert.deepStrictEqual(block.header.enrollments[0], enrollment,
            "When serialize, then deserialize, it does not match the original.");
    });

    it ('Test that serialize and deserialize bit-field', () =>
    {
        let buffer = new SmartBuffer();
        block.header.validators.serialize(buffer);
        assert.strictEqual(writeToString(buffer.readBuffer()),
            "0xa8800000fe01"
        );

        let bit_field = new BitField();
        buffer.readOffset = 0;
        bit_field.deserialize(buffer);
        assert.deepStrictEqual(block.header.validators, bit_field,
            "When serialize, then deserialize, it does not match the original.");
    });

    it ('Test that serialize and deserialize block header', () =>
    {
        let buffer = new SmartBuffer();
        block.header.serialize(buffer);
        assert.strictEqual(writeToString(buffer.readBuffer()),
            "0x018c71ee3eb2030ee6dc60a41bae6119f8d8de7055f63393979dc22b9ce7f" +
            "5be5c71e74382a24b7e644d32b0306fe3cf14ecd7de5635c70aa592f4721aa7" +
            "4fe203f0fdedf7098f88b74d7f80c7bc782dea8c5002ca2dc51333002cc8b59" +
            "6eb0e23af5e4611d59947fbeb13acab663483172d13993faf6239a5641fb5ca" +
            "18b4e1764605db3931bd87d2cea097533d82be0a5e36c54fec8e5570790c336" +
            "9bd8300c65a03d76d12a74aa38ec3e6866fd64ae56091ed3cbc3ca278ae0c82" +
            "65ab699ffe2d8509cb5c2f1493d207021226b28c190a8b049b5f5a72580464c" +
            "06d65dd97ebca9bd79a36ace4d3097869dc009b8939fc83bdf940c8822c6931" +
            "d5c09326aa746b3103f0fdae5acc1a182469a8da33e25ebf18bba01f31b4599" +
            "fe56e61acd4cd73849ada4ed4bfda5eaac47ada6f2223aa4a149170c4c461a9" +
            "6651bd724ee848df4166a951b20da9cfbda971f3f573f55eabcd677feaf12f7" +
            "948e8994a97cdf9e570799b71631e87bb9ebce0d6a402275adfb6e365fdb721" +
            "39c18559a10df0e5fe4bae08eb0dad7f1ca61325d10c50a9feb95d034ea8895" +
            "4c9840ee15e23c206a5ea11d677fd787c4518b78ab9ed73a3760741d557ac2a" +
            "ca631fc2796be86fcf391d3a663403f0fd8827a2c313ada26b42bac150aa7a8" +
            "7d0bab0a9472f244fcba60f465bb8a85954bac18b9469e3c0110fec871144df" +
            "401f7dcb1dab59e1c1add5338098f43b595794908ec79866cf54bb8e87b605e" +
            "31ce0b5d7c3090f3498237d83edaca9c8ba2d3d180c572af46c1221fb81add1" +
            "63e14adf738df26e3679626e82113b9fe085b000db1855a7a0dcff59e311e4a" +
            "038f2e41235081881d0ce4da6e6c6f3d81909a47e3d4753b6b4ccdb35c2864b" +
            "e4195e83b7b8433ca1d27a57fb9f48a63100130403f0fd3372d562f2dd84848" +
            "c06baadc24bbaa7163cbc516d0bab8c1c215779001ee8ead187699f88b2d2dc" +
            "590a4f3053e9487dd60d2b33f3ef81399ad702626547a7ba8c1561a4475df42" +
            "afa0830da1f8a678ad4b1d82b6c610f7b03ce69b7e0fabcf537d48ecd0aee6f" +
            "1cab14290a0fc6313c729edf928ff3576f8656f3b7be5670e00e5907fbe526e" +
            "9d9f7310c5e3d4be7cd39c281d9f32f34cb5d2d522fa4bdc14b2692d0b8b041" +
            "33a34716169a4b1d33d77c3e585357d8a2a2c48a772275255c0103f0fdd2324" +
            "c1865135aaba469afa5381df223a4fce45ea1ecca1f6ba2633917aa2427c3b4" +
            "25e3beccd6077cf8b377ed23c6420d120e2a863f9e31100d10d7fb7009674dd" +
            "e806d2e09367f9d5bdaaf46deab01a336a64fdb088dbb94edb171560c63cf6a" +
            "39377bf0c4d35118775681d989dee46531926299463256da303553f09be6ef0" +
            "c2fd79ec6deb83eb2baa4da7bdfe37595bb42a768dcd66abc62943023fa8068" +
            "dc8b89135fe3f5df9e2815b9bdb763c41b8b2dab5911e313acc82470c214742" +
            "203f0fd34404dca05b15527046f83f03da31a9684d03d2d0204d3cb5849d13f" +
            "b3c989ddf4f2f04f388355e12f4ed2976e0966d5e02a6f7f1d735ca52e192ab" +
            "bb019c79c46883e83778481d640a95fcffd6e1a1b6defeaac5a8001cd3f99e1" +
            "7576b809c7e9bc7a44c3917806765a5ff997366e217ff54cd4da09c0c51dc33" +
            "9c47052a3ac0600000000000000000000000000000000000000000000000000" +
            "000000000000000000000000000000000000000000000000000000000000000" +
            "000000000000000a8800000fe01788c159d62b565655d9f725786c38e680203" +
            "8ee73d7a9d187b3be1c7de95aa0ba856bf81bb556d7448488e71f4b89ce6eba" +
            "319d05367983081124164132892540000000000000000000000000000000000" +
            "000000000000000000000000000000000000000000000000000000000000000" +
            "000000000000000000000000000000000"
        );

        let header = new BlockHeader();
        buffer.readOffset = 0;
        header.deserialize(buffer);
        assert.deepStrictEqual(block.header, header,
            "When serialize, then deserialize, it does not match the original.");
    });

    it ('Test that serialize and deserialize block', () =>
    {
        let buffer = new SmartBuffer();
        block.serialize(buffer);
        assert.strictEqual(writeToString(buffer.readBuffer()),
            "0x788c159d62b565655d9f725786c38e6802038ee73d7a9d187b3be1c7de95a" +
            "a0ba856bf81bb556d7448488e71f4b89ce6eba319d053679830811241641328" +
            "92547a5bfeb96f9caefa377cb9a7ffe3ea3dd59ea84d4a1c66304ab8c307a4f" +
            "47706fe0aec2a73ce2b186a9f45641620995f8c7e4c157cee7940872d96d9b2" +
            "f0f95c6314ce9bc41a7f5b98309c3a3d824647d7613b714c4e3ddbc1c5e9ae4" +
            "6db29715c83127ce259a3851363bff36af2e1e9a51dfa15c36a77c9f8eba682" +
            "6ff975bc03f52201b3d296424f285ca01391640951cd6a319b9d8ad6c60b407" +
            "1a1e038029d00022acab1502000fff52201b3d296424f285ca01391640951cd" +
            "6a319b9d8ad6c60b4071a1e038029d00022acab1502000fff52201b3d296424" +
            "f285ca01391640951cd6a319b9d8ad6c60b4071a1e038029d00022acab15020" +
            "00fff52201b3d296424f285ca01391640951cd6a319b9d8ad6c60b4071a1e03" +
            "8029d00022acab1502000fff52201b3d296424f285ca01391640951cd6a319b" +
            "9d8ad6c60b4071a1e038029d00022acab1502000fff52201b3d296424f285ca" +
            "01391640951cd6a319b9d8ad6c60b4071a1e038029d00022acab1502000fff5" +
            "2201b3d296424f285ca01391640951cd6a319b9d8ad6c60b4071a1e038029d0" +
            "0022acab1502000fff52201b3d296424f285ca01391640951cd6a319b9d8ad6" +
            "c60b4071a1e038029d00022acab1502000ff080000b4a3e5d0349215c8b517c" +
            "0c577e9dc7a49b6818ea21d59c7cfaf28e9e993e1da000012309ce54000ff79" +
            "7fac694a8819a06c03680e93cb6bdd5dcc2430ae9b41d0b9d6b4bdd993e1da0" +
            "00012309ce54000fff436dd07d080aec163e4b770b93489038fa667a8cfa684" +
            "944b9decfcb393e1da000012309ce54000ff67d977847e33e4df43fff779af9" +
            "7dfdf7121f50f83ee0af550583f998a93e1da000012309ce54000ff9218f2fe" +
            "a93a601e2c553704e0844f2731b86a4330fa566fee5d14b46493e1da0000123" +
            "09ce54000ff556a55a651ff288aeb70b983cd912522301399702d87bd27cb7f" +
            "c6644893e1da000012309ce54000ff06000102018c71ee3eb2030ee6dc60a41" +
            "bae6119f8d8de7055f63393979dc22b9ce7f5be5c71e74382a24b7e644d32b0" +
            "306fe3cf14ecd7de5635c70aa592f4721aa74fe203f0fdedf7098f88b74d7f8" +
            "0c7bc782dea8c5002ca2dc51333002cc8b596eb0e23af5e4611d59947fbeb13" +
            "acab663483172d13993faf6239a5641fb5ca18b4e1764605db3931bd87d2cea" +
            "097533d82be0a5e36c54fec8e5570790c3369bd8300c65a03d76d12a74aa38e" +
            "c3e6866fd64ae56091ed3cbc3ca278ae0c8265ab699ffe2d8509cb5c2f1493d" +
            "207021226b28c190a8b049b5f5a72580464c06d65dd97ebca9bd79a36ace4d3" +
            "097869dc009b8939fc83bdf940c8822c6931d5c09326aa746b3103f0fdae5ac" +
            "c1a182469a8da33e25ebf18bba01f31b4599fe56e61acd4cd73849ada4ed4bf" +
            "da5eaac47ada6f2223aa4a149170c4c461a96651bd724ee848df4166a951b20" +
            "da9cfbda971f3f573f55eabcd677feaf12f7948e8994a97cdf9e570799b7163" +
            "1e87bb9ebce0d6a402275adfb6e365fdb72139c18559a10df0e5fe4bae08eb0" +
            "dad7f1ca61325d10c50a9feb95d034ea88954c9840ee15e23c206a5ea11d677" +
            "fd787c4518b78ab9ed73a3760741d557ac2aca631fc2796be86fcf391d3a663" +
            "403f0fd8827a2c313ada26b42bac150aa7a87d0bab0a9472f244fcba60f465b" +
            "b8a85954bac18b9469e3c0110fec871144df401f7dcb1dab59e1c1add533809" +
            "8f43b595794908ec79866cf54bb8e87b605e31ce0b5d7c3090f3498237d83ed" +
            "aca9c8ba2d3d180c572af46c1221fb81add163e14adf738df26e3679626e821" +
            "13b9fe085b000db1855a7a0dcff59e311e4a038f2e41235081881d0ce4da6e6" +
            "c6f3d81909a47e3d4753b6b4ccdb35c2864be4195e83b7b8433ca1d27a57fb9" +
            "f48a63100130403f0fd3372d562f2dd84848c06baadc24bbaa7163cbc516d0b" +
            "ab8c1c215779001ee8ead187699f88b2d2dc590a4f3053e9487dd60d2b33f3e" +
            "f81399ad702626547a7ba8c1561a4475df42afa0830da1f8a678ad4b1d82b6c" +
            "610f7b03ce69b7e0fabcf537d48ecd0aee6f1cab14290a0fc6313c729edf928" +
            "ff3576f8656f3b7be5670e00e5907fbe526e9d9f7310c5e3d4be7cd39c281d9" +
            "f32f34cb5d2d522fa4bdc14b2692d0b8b04133a34716169a4b1d33d77c3e585" +
            "357d8a2a2c48a772275255c0103f0fdd2324c1865135aaba469afa5381df223" +
            "a4fce45ea1ecca1f6ba2633917aa2427c3b425e3beccd6077cf8b377ed23c64" +
            "20d120e2a863f9e31100d10d7fb7009674dde806d2e09367f9d5bdaaf46deab" +
            "01a336a64fdb088dbb94edb171560c63cf6a39377bf0c4d35118775681d989d" +
            "ee46531926299463256da303553f09be6ef0c2fd79ec6deb83eb2baa4da7bdf" +
            "e37595bb42a768dcd66abc62943023fa8068dc8b89135fe3f5df9e2815b9bdb" +
            "763c41b8b2dab5911e313acc82470c214742203f0fd34404dca05b15527046f" +
            "83f03da31a9684d03d2d0204d3cb5849d13fb3c989ddf4f2f04f388355e12f4" +
            "ed2976e0966d5e02a6f7f1d735ca52e192abbb019c79c46883e83778481d640" +
            "a95fcffd6e1a1b6defeaac5a8001cd3f99e17576b809c7e9bc7a44c39178067" +
            "65a5ff997366e217ff54cd4da09c0c51dc339c47052a3ac0600000000000000" +
            "000000000000000000000000000000000000000000000000000000000000000" +
            "000000000000000000000000000000000000000000000000000a8800000fe01" +
            "788c159d62b565655d9f725786c38e6802038ee73d7a9d187b3be1c7de95aa0" +
            "ba856bf81bb556d7448488e71f4b89ce6eba319d05367983081124164132892" +
            "540000000000000000000000000000000000000000000000000000000000000" +
            "000000000000000000000000000000000000000000000000000000000000000" +
            "000000"
        );

        let deserialized_block = new Block();
        buffer.readOffset = 0;
        deserialized_block.deserialize(buffer);
        assert.deepStrictEqual(block, deserialized_block,
            "When serialize, then deserialize, it does not match the original.");
    });
});
