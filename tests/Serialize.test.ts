/*******************************************************************************

    Test that serialize.

    Copyright:
         Copyright (c) 2020 BOS Platform Foundation Korea
         All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import {
    Block, Transaction, TxIn, TxOut, TxType, PublicKey, Hash, Signature, BlockHeader, Enrollment,
} from "../src/modules/data";
import { writeToString } from "../src/modules/utils/buffer";
import { SmartBuffer } from "smart-buffer";
import * as assert from 'assert';

let genesis =
    {
        "header": {
            "prev_block": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "height": {
                "value": 0
            },
            "merkle_root": "0x747e1080925af0fda8e8116eaa9f91d047bfa768d71433848ea869258cbecafa7dcaae0d8ceb63cf7d47ca293fa6314c6fd9055ab633c966628234fa13ec16a6",
            "validators": {
                "_storage": []
            },
            "signature": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "enrollments": [
                {
                    "utxo_key": "0x190dd12450d9f1972e21e39d676d9e5bb690071d98ed5c0859077e409741912a4baf07dabc2c879725f0af67f783bbb0161c68d55ef6835639eaaedff2317561",
                    "random_seed": "0xc9934f17f6115f9b489b3a3f68f08d695c92912c3fba5691f3396de151160cb171fce29d36ae315780554abeead208c1e3920f7167515405f0148c0587a7d878",
                    "cycle_length": 1008,
                    "enroll_sig": "0x01924db86527d68926bb387154b035c5dd6dbe499490da90cfdc878cac0d98a8e70b0b8f35a4d70a8bfd8c53183816ddaae73eefcbdc8ad715452b0ed62fedf0"
                },
                {
                    "utxo_key": "0x4028965b7408566a66e4cf8c603a1cdebc7659a3e693d36d2fdcb39b196da967914f40ef4966d5b4b1f4b3aae00fbd68ffe8808b070464c2a101d44f4d7b0170",
                    "random_seed": "0xebe00db839223133ef2c30811b6b619e5f51378fb70eae6d3a7a609e05c3815f7b89fcaa12e6c3222856753935d34c84c1e0dd92930f144f53c5ff97a4d2fb4c",
                    "cycle_length": 1008,
                    "enroll_sig": "0x05b7975f795e455cadf70cfeea87bdfda3d49fa94b8172df6c4cc759d3012bcfe363196eed3f7b1efafe646bc5ef7816b3203cc4fdaa8c6d70260cb46391d06a"
                },
                {
                    "utxo_key": "0x81a326afa790003c32517a2a2556613004e6147edac28d576cf7bcc2daadf4bb60be1f644c229b775e7894844ec66b2d70ddf407b8196b46bc1dfe42061c7497",
                    "random_seed": "0x110bd742a58096dc29b05bef7751b42d31f74037f3027909bd87092ccaab4e8da93d50a616569e1c1fbdeefa4e7da37f02b87a5e1da670348a255d7292432c7e",
                    "cycle_length": 1008,
                    "enroll_sig": "0x0be614099d515a10ca8b380cf57f388226fa4ef4eb6f6f92c1c3983ea8012f3ca52bfc3af80cfff8f516625c469ecf18d7355239c66f2274bfec59dc952111f7"
                },
                {
                    "utxo_key": "0xb82cb96710af2e9804c59d1f1e1679f8b8b69f4c0f6cd79c8c12f365dd766c09aaa4febcc18b3665d33301cb248ac7afd343ac7b98b27beaf246ad12d3b3219a",
                    "random_seed": "0x6b93c624388744156d4a36c0d007b9149b8606fc328c363ea01bd45a74514eeb2f9790b5a8192a6a22ee7d917f1b23dcd629403cafc80e0555fe3c2f7b0f8598",
                    "cycle_length": 1008,
                    "enroll_sig": "0x0b1c4c26ebfced051e3284a16f99728ed5a601368af6ed7b5bd24a1db42fbe7159681feeb9a3b68b18bca05ac811c75bf557a1029f110dd8b34ecb9720affe00"
                }
            ]
        },
        "txs": [
            {
                "type": 1,
                "inputs": [],
                "outputs": [
                    {
                        "value": "400000000000",
                        "address": "GDC22CFFKB4ZNRZUP6EMRIGVZSQEPSNH2CBMWLU5GLGKE36M3KX5YD36"
                    }
                ]
            },
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
            },
            {
                "type": 1,
                "inputs": [],
                "outputs": [
                    {
                        "value": "400000000000",
                        "address": "GDA225RGC4GOCVASSAMROSWJSGNOZX2IGPXZG52ESDSKQW2VN6UJFKWI"
                    }
                ]
            },
            {
                "type": 1,
                "inputs": [],
                "outputs": [
                    {
                        "value": "400000000000",
                        "address": "GDD22H4TGRGS5ENN3DHBGMMCSZELKORKEZT4SZKTKHZESTVQMONREB2D"
                    }
                ]
            },
            {
                "type": 1,
                "inputs": [],
                "outputs": [
                    {
                        "value": "400000000000",
                        "address": "GDB22QJ4NHOHPOGWZG2Y5IFXKW6DCBEFX6QNBR6NSCT6E7CYU66IDGJJ"
                    }
                ]
            }
        ],
        "merkle_tree": [
            "0x388e02bb10e3fab101e2990de73d487b367bd8cb7f485ff392b6f3f9f717274286ab250046641fa7b98d959e15549c8cbc7711333370b7b2fd6abe969a241f0f",
            "0x6314ce9bc41a7f5b98309c3a3d824647d7613b714c4e3ddbc1c5e9ae46db29715c83127ce259a3851363bff36af2e1e9a51dfa15c36a77c9f8eba6826ff975bc",
            "0x7a5bfeb96f9caefa377cb9a7ffe3ea3dd59ea84d4a1c66304ab8c307a4f47706fe0aec2a73ce2b186a9f45641620995f8c7e4c157cee7940872d96d9b2f0f95c",
            "0xada067dd1a2b52be220a8a072b7f44ad35815b09fbe5a34a0f30f12e2097970d71c9d92466b29498ed41b5789f1e493ecd97bacdc3fb756949779360e78fd1e4",
            "0xc57b720a92b7c3111d551095a306b05b773252df1e62ea253f0f9eba83345750962163049d79deeb82ed7b4ecd5fe99b76a962491124877056bbf9ef4f7b1bcd",
            "0xfef3696f232c6bc79caded1a684221fd257245c463e584859a8af1aa9a0d1939db4767932f83891d8fbbe43ac819e09f762d12e4febdbbf4a06ec11ed1587f92",
            "0xfef3696f232c6bc79caded1a684221fd257245c463e584859a8af1aa9a0d1939db4767932f83891d8fbbe43ac819e09f762d12e4febdbbf4a06ec11ed1587f92",
            "0xfef3696f232c6bc79caded1a684221fd257245c463e584859a8af1aa9a0d1939db4767932f83891d8fbbe43ac819e09f762d12e4febdbbf4a06ec11ed1587f92",
            "0x705d76f02085d72fcf127d686d383b8ce16cc5d496966f90e27d037e3c9d2340609b93b902fb072e462d1842a789278c4bcc304679cb7e5cc34a42caae2fac91",
            "0x8bad44791bbe36da672fd4ba4c3f2d4c7d14ae59ae8d838ba184b578c7c4d1d76da39dce93c6451d3f6637f07a2953784d0f1da5abc3cdbc3fd31be1c256b7ea",
            "0x37cd0ae6ac4de148285fb3632d8a27d5a3af14ae4726c0033787b2c8c4a45f7975c13df82383e196de58f8f56085a7d37204bd066948c471d5c9ce941d706d3c",
            "0x1e5ecb13a16f4db8e63ad5f68fc6ecb61c20aa40b89c49425a400cca288373e4b83cec94e75a3e3f30698a9443f26f43125c12af442a7181ae829294e6df6e81",
            "0x9cba8a325f2e32e3b1c39357f1df0f78db76b570198e28f1c89d1a775fa3660ee0967623579a8dc6ff42e4b9679fda64ef7354e41b9c7b4301bd6df5d95dc765",
            "0x74ec04b36a6e34d5a4c7767dc37da8f5baa25c1791cf6ac379cee534156de0839c99330389f164033a1cab7fd93cd753d1751b0e1d0401c3f886cb989c964834",
            "0x747e1080925af0fda8e8116eaa9f91d047bfa768d71433848ea869258cbecafa7dcaae0d8ceb63cf7d47ca293fa6314c6fd9055ab633c966628234fa13ec16a6"
        ]
    };

describe ('Serialize', () =>
{
    it ('Test that serialize transaction input', () =>
    {
        let tx_input = new TxIn(
            Hash.createFromString(
                "0x7a5bfeb96f9caefa377cb9a7ffe3ea3dd59ea84d4a1c66304ab8c307a" +
                "4f47706fe0aec2a73ce2b186a9f45641620995f8c7e4c157cee7940872d" +
                "96d9b2f0f95c"
            ),
            0,
            Signature.createFromString(
                "0x026d833f9edfce2e0f3e65a8f202350f91c465f734498eb3c0dc182f6" +
                "6e1fbe072743eba0facb6d3df994dcdb8f328361a816b8a978927a9e3e6" +
                "79fb8a7c45ac"
            )
        );

        let buffer = new SmartBuffer();
        tx_input.serialize(buffer);
        assert.ok(writeToString(buffer.readBuffer()),
            "0x026d833f9edfce2e0f3e65a8f202350f91c465f734498eb3c0dc182f66e1f" +
            "be072743eba0facb6d3df994dcdb8f328361a816b8a978927a9e3e679fb8a7c" +
            "45ac007a5bfeb96f9caefa377cb9a7ffe3ea3dd59ea84d4a1c66304ab8c307a" +
            "4f47706fe0aec2a73ce2b186a9f45641620995f8c7e4c157cee7940872d96d9" +
            "b2f0f95c"
        );
    });

    it ('Test that serialize transaction output', () =>
    {
        let tx_output = new TxOut(
            BigInt(5000000),
            PublicKey.createFromString(
                "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"
            )
        );

        let buffer = new SmartBuffer();
        tx_output.serialize(buffer);
        assert.ok(writeToString(buffer.readBuffer()),
            "0xf52201b3d296424f285ca01391640951cd6a319b9d8ad6c60b4071a1e0380" +
            "29d004c4b40fe"
        );
    });

    it ('Test that serialize transaction', () =>
    {
        let tx = new Transaction(
            TxType.Payment,
            [],
            []
        );

        let tx_input = new TxIn(
            Hash.createFromString(
                "0x7a5bfeb96f9caefa377cb9a7ffe3ea3dd59ea84d4a1c66304ab8c307a" +
                "4f47706fe0aec2a73ce2b186a9f45641620995f8c7e4c157cee7940872d" +
                "96d9b2f0f95c"
            ),
            0,
            Signature.createFromString(
                "0x026d833f9edfce2e0f3e65a8f202350f91c465f734498eb3c0dc182f6" +
                "6e1fbe072743eba0facb6d3df994dcdb8f328361a816b8a978927a9e3e6" +
                "79fb8a7c45ac"
            )
        );

        let tx_output = new TxOut(
            BigInt(5000000),
            PublicKey.createFromString(
                "GCOQEOHAUFYUAC6G22FJ3GZRNLGVCCLESEJ2AXBIJ5BJNUVTAERPLRIJ"
            )
        );

        tx.inputs.push(tx_input);
        for (let idx = 0; idx < 8; idx++)
            tx.outputs.push(tx_output);


        let buffer = new SmartBuffer();
        tx.serialize(buffer);
        assert.ok(writeToString(buffer.readBuffer()),
            "0xf52201b3d296424f285ca01391640951cd6a319b9d8ad6c60b4071a1e0380" +
            "29d004c4b40fef52201b3d296424f285ca01391640951cd6a319b9d8ad6c60b" +
            "4071a1e038029d004c4b40fef52201b3d296424f285ca01391640951cd6a319" +
            "b9d8ad6c60b4071a1e038029d004c4b40fef52201b3d296424f285ca0139164" +
            "0951cd6a319b9d8ad6c60b4071a1e038029d004c4b40fef52201b3d296424f2" +
            "85ca01391640951cd6a319b9d8ad6c60b4071a1e038029d004c4b40fef52201" +
            "b3d296424f285ca01391640951cd6a319b9d8ad6c60b4071a1e038029d004c4" +
            "b40fef52201b3d296424f285ca01391640951cd6a319b9d8ad6c60b4071a1e0" +
            "38029d004c4b40fef52201b3d296424f285ca01391640951cd6a319b9d8ad6c" +
            "60b4071a1e038029d004c4b40fe08026d833f9edfce2e0f3e65a8f202350f91" +
            "c465f734498eb3c0dc182f66e1fbe072743eba0facb6d3df994dcdb8f328361" +
            "a816b8a978927a9e3e679fb8a7c45ac007a5bfeb96f9caefa377cb9a7ffe3ea" +
            "3dd59ea84d4a1c66304ab8c307a4f47706fe0aec2a73ce2b186a9f456416209" +
            "95f8c7e4c157cee7940872d96d9b2f0f95c0100"
        );

        let deserialized_tx = new Transaction();
        buffer.readOffset = 0;
        deserialized_tx.deserialize(buffer);
        assert.deepStrictEqual(tx, deserialized_tx);
    });

    it ('Test that serialize enrollment', () =>
    {
        let block = new Block();
        block.fromJSON(genesis);

        let buffer = new SmartBuffer();
        block.header.enrollments[0].serialize(buffer);
        assert.ok(writeToString(buffer.readBuffer()),
            "0x01924db86527d68926bb387154b035c5dd6dbe499490da90cfdc878cac0d9" +
            "8a8e70b0b8f35a4d70a8bfd8c53183816ddaae73eefcbdc8ad715452b0ed62f" +
            "edf003f0fdc9934f17f6115f9b489b3a3f68f08d695c92912c3fba5691f3396" +
            "de151160cb171fce29d36ae315780554abeead208c1e3920f7167515405f014" +
            "8c0587a7d878190dd12450d9f1972e21e39d676d9e5bb690071d98ed5c08590" +
            "77e409741912a4baf07dabc2c879725f0af67f783bbb0161c68d55ef6835639" +
            "eaaedff2317561"
        );

        let deserialized_enrollment = new Enrollment();
        buffer.readOffset = 0;
        deserialized_enrollment.deserialize(buffer);
        assert.deepStrictEqual(block.header.enrollments[0], deserialized_enrollment,
            "When serialize, then deserialize, it does not match the original.");
    });

    it ('Test that serialize block header', () =>
    {
        let block = new Block();
        block.fromJSON(genesis);

        let buffer = new SmartBuffer();
        block.header.serialize(buffer);
        assert.ok(writeToString(buffer.readBuffer()),
            "0x0b1c4c26ebfced051e3284a16f99728ed5a601368af6ed7b5bd24a1db42fb" +
            "e7159681feeb9a3b68b18bca05ac811c75bf557a1029f110dd8b34ecb9720af" +
            "fe0003f0fd6b93c624388744156d4a36c0d007b9149b8606fc328c363ea01bd" +
            "45a74514eeb2f9790b5a8192a6a22ee7d917f1b23dcd629403cafc80e0555fe" +
            "3c2f7b0f8598b82cb96710af2e9804c59d1f1e1679f8b8b69f4c0f6cd79c8c1" +
            "2f365dd766c09aaa4febcc18b3665d33301cb248ac7afd343ac7b98b27beaf2" +
            "46ad12d3b3219a0be614099d515a10ca8b380cf57f388226fa4ef4eb6f6f92c" +
            "1c3983ea8012f3ca52bfc3af80cfff8f516625c469ecf18d7355239c66f2274" +
            "bfec59dc952111f703f0fd110bd742a58096dc29b05bef7751b42d31f74037f" +
            "3027909bd87092ccaab4e8da93d50a616569e1c1fbdeefa4e7da37f02b87a5e" +
            "1da670348a255d7292432c7e81a326afa790003c32517a2a2556613004e6147" +
            "edac28d576cf7bcc2daadf4bb60be1f644c229b775e7894844ec66b2d70ddf4" +
            "07b8196b46bc1dfe42061c749705b7975f795e455cadf70cfeea87bdfda3d49" +
            "fa94b8172df6c4cc759d3012bcfe363196eed3f7b1efafe646bc5ef7816b320" +
            "3cc4fdaa8c6d70260cb46391d06a03f0fdebe00db839223133ef2c30811b6b6" +
            "19e5f51378fb70eae6d3a7a609e05c3815f7b89fcaa12e6c3222856753935d3" +
            "4c84c1e0dd92930f144f53c5ff97a4d2fb4c4028965b7408566a66e4cf8c603" +
            "a1cdebc7659a3e693d36d2fdcb39b196da967914f40ef4966d5b4b1f4b3aae0" +
            "0fbd68ffe8808b070464c2a101d44f4d7b017001924db86527d68926bb38715" +
            "4b035c5dd6dbe499490da90cfdc878cac0d98a8e70b0b8f35a4d70a8bfd8c53" +
            "183816ddaae73eefcbdc8ad715452b0ed62fedf003f0fdc9934f17f6115f9b4" +
            "89b3a3f68f08d695c92912c3fba5691f3396de151160cb171fce29d36ae3157" +
            "80554abeead208c1e3920f7167515405f0148c0587a7d878190dd12450d9f19" +
            "72e21e39d676d9e5bb690071d98ed5c0859077e409741912a4baf07dabc2c87" +
            "9725f0af67f783bbb0161c68d55ef6835639eaaedff23175610400000000000" +
            "000000000000000000000000000000000000000000000000000000000000000" +
            "00000000000000000000000000000000000000000000000000000000747e108" +
            "0925af0fda8e8116eaa9f91d047bfa768d71433848ea869258cbecafa7dcaae" +
            "0d8ceb63cf7d47ca293fa6314c6fd9055ab633c966628234fa13ec16a600000" +
            "000000000000000000000000000000000000000000000000000000000000000" +
            "00000000000000000000000000000000000000000000000000000000000000"
        );

        let deserialized_header = new BlockHeader();
        buffer.readOffset = 0;
        deserialized_header.deserialize(buffer);
        assert.deepStrictEqual(block.header, deserialized_header,
            "When serialize, then deserialize, it does not match the original.");
    });

    it ('Test that serialize block', () =>
    {
        let block = new Block();
        block.fromJSON(genesis);

        let buffer = new SmartBuffer();
        block.serialize(buffer);
        assert.ok(writeToString(buffer.readBuffer()),
            "0x747e1080925af0fda8e8116eaa9f91d047bfa768d71433848ea869258cbec" +
            "afa7dcaae0d8ceb63cf7d47ca293fa6314c6fd9055ab633c966628234fa13ec" +
            "16a674ec04b36a6e34d5a4c7767dc37da8f5baa25c1791cf6ac379cee534156" +
            "de0839c99330389f164033a1cab7fd93cd753d1751b0e1d0401c3f886cb989c" +
            "9648349cba8a325f2e32e3b1c39357f1df0f78db76b570198e28f1c89d1a775" +
            "fa3660ee0967623579a8dc6ff42e4b9679fda64ef7354e41b9c7b4301bd6df5" +
            "d95dc7651e5ecb13a16f4db8e63ad5f68fc6ecb61c20aa40b89c49425a400cc" +
            "a288373e4b83cec94e75a3e3f30698a9443f26f43125c12af442a7181ae8292" +
            "94e6df6e8137cd0ae6ac4de148285fb3632d8a27d5a3af14ae4726c0033787b" +
            "2c8c4a45f7975c13df82383e196de58f8f56085a7d37204bd066948c471d5c9" +
            "ce941d706d3c8bad44791bbe36da672fd4ba4c3f2d4c7d14ae59ae8d838ba18" +
            "4b578c7c4d1d76da39dce93c6451d3f6637f07a2953784d0f1da5abc3cdbc3f" +
            "d31be1c256b7ea705d76f02085d72fcf127d686d383b8ce16cc5d496966f90e" +
            "27d037e3c9d2340609b93b902fb072e462d1842a789278c4bcc304679cb7e5c" +
            "c34a42caae2fac91fef3696f232c6bc79caded1a684221fd257245c463e5848" +
            "59a8af1aa9a0d1939db4767932f83891d8fbbe43ac819e09f762d12e4febdbb" +
            "f4a06ec11ed1587f92fef3696f232c6bc79caded1a684221fd257245c463e58" +
            "4859a8af1aa9a0d1939db4767932f83891d8fbbe43ac819e09f762d12e4febd" +
            "bbf4a06ec11ed1587f92fef3696f232c6bc79caded1a684221fd257245c463e" +
            "584859a8af1aa9a0d1939db4767932f83891d8fbbe43ac819e09f762d12e4fe" +
            "bdbbf4a06ec11ed1587f92c57b720a92b7c3111d551095a306b05b773252df1" +
            "e62ea253f0f9eba83345750962163049d79deeb82ed7b4ecd5fe99b76a96249" +
            "1124877056bbf9ef4f7b1bcdada067dd1a2b52be220a8a072b7f44ad35815b0" +
            "9fbe5a34a0f30f12e2097970d71c9d92466b29498ed41b5789f1e493ecd97ba" +
            "cdc3fb756949779360e78fd1e47a5bfeb96f9caefa377cb9a7ffe3ea3dd59ea" +
            "84d4a1c66304ab8c307a4f47706fe0aec2a73ce2b186a9f45641620995f8c7e" +
            "4c157cee7940872d96d9b2f0f95c6314ce9bc41a7f5b98309c3a3d824647d76" +
            "13b714c4e3ddbc1c5e9ae46db29715c83127ce259a3851363bff36af2e1e9a5" +
            "1dfa15c36a77c9f8eba6826ff975bc388e02bb10e3fab101e2990de73d487b3" +
            "67bd8cb7f485ff392b6f3f9f717274286ab250046641fa7b98d959e15549c8c" +
            "bc7711333370b7b2fd6abe969a241f0f0f81bca7587ce2a790cdc7d0a0bf850" +
            "431bc55b7a08eb5c9d6b877dc693c41adc30000005d21dba000ff010001129b" +
            "63b04e49f2515365c967262a3ab54896823113ced8ad912e4d34931fadc7000" +
            "0005d21dba000ff01000192a86f555ba8e490447793ef3348dfec9a91c94a17" +
            "19901254e10c172676adc10000005d21dba000ff010001f52201b3d296424f2" +
            "85ca01391640951cd6a319b9d8ad6c60b4071a1e038029d00022acab1502000" +
            "fff52201b3d296424f285ca01391640951cd6a319b9d8ad6c60b4071a1e0380" +
            "29d00022acab1502000fff52201b3d296424f285ca01391640951cd6a319b9d" +
            "8ad6c60b4071a1e038029d00022acab1502000fff52201b3d296424f285ca01" +
            "391640951cd6a319b9d8ad6c60b4071a1e038029d00022acab1502000fff522" +
            "01b3d296424f285ca01391640951cd6a319b9d8ad6c60b4071a1e038029d000" +
            "22acab1502000fff52201b3d296424f285ca01391640951cd6a319b9d8ad6c6" +
            "0b4071a1e038029d00022acab1502000fff52201b3d296424f285ca01391640" +
            "951cd6a319b9d8ad6c60b4071a1e038029d00022acab1502000fff52201b3d2" +
            "96424f285ca01391640951cd6a319b9d8ad6c60b4071a1e038029d00022acab" +
            "1502000ff080000b4a3e5d0349215c8b517c0c577e9dc7a49b6818ea21d59c7" +
            "cfaf28e9e993e1da000012309ce54000ff797fac694a8819a06c03680e93cb6" +
            "bdd5dcc2430ae9b41d0b9d6b4bdd993e1da000012309ce54000fff436dd07d0" +
            "80aec163e4b770b93489038fa667a8cfa684944b9decfcb393e1da000012309" +
            "ce54000ff67d977847e33e4df43fff779af97dfdf7121f50f83ee0af550583f" +
            "998a93e1da000012309ce54000ff9218f2fea93a601e2c553704e0844f2731b" +
            "86a4330fa566fee5d14b46493e1da000012309ce54000ff556a55a651ff288a" +
            "eb70b983cd912522301399702d87bd27cb7fc6644893e1da000012309ce5400" +
            "0ff060001dcafdacc6fa2cc329d2ecb82d0a7c947a0ccd5a0c8887f34c79679" +
            "50a508adc50000005d21dba000ff010001060b1c4c26ebfced051e3284a16f9" +
            "9728ed5a601368af6ed7b5bd24a1db42fbe7159681feeb9a3b68b18bca05ac8" +
            "11c75bf557a1029f110dd8b34ecb9720affe0003f0fd6b93c624388744156d4" +
            "a36c0d007b9149b8606fc328c363ea01bd45a74514eeb2f9790b5a8192a6a22" +
            "ee7d917f1b23dcd629403cafc80e0555fe3c2f7b0f8598b82cb96710af2e980" +
            "4c59d1f1e1679f8b8b69f4c0f6cd79c8c12f365dd766c09aaa4febcc18b3665" +
            "d33301cb248ac7afd343ac7b98b27beaf246ad12d3b3219a0be614099d515a1" +
            "0ca8b380cf57f388226fa4ef4eb6f6f92c1c3983ea8012f3ca52bfc3af80cff" +
            "f8f516625c469ecf18d7355239c66f2274bfec59dc952111f703f0fd110bd74" +
            "2a58096dc29b05bef7751b42d31f74037f3027909bd87092ccaab4e8da93d50" +
            "a616569e1c1fbdeefa4e7da37f02b87a5e1da670348a255d7292432c7e81a32" +
            "6afa790003c32517a2a2556613004e6147edac28d576cf7bcc2daadf4bb60be" +
            "1f644c229b775e7894844ec66b2d70ddf407b8196b46bc1dfe42061c749705b" +
            "7975f795e455cadf70cfeea87bdfda3d49fa94b8172df6c4cc759d3012bcfe3" +
            "63196eed3f7b1efafe646bc5ef7816b3203cc4fdaa8c6d70260cb46391d06a0" +
            "3f0fdebe00db839223133ef2c30811b6b619e5f51378fb70eae6d3a7a609e05" +
            "c3815f7b89fcaa12e6c3222856753935d34c84c1e0dd92930f144f53c5ff97a" +
            "4d2fb4c4028965b7408566a66e4cf8c603a1cdebc7659a3e693d36d2fdcb39b" +
            "196da967914f40ef4966d5b4b1f4b3aae00fbd68ffe8808b070464c2a101d44" +
            "f4d7b017001924db86527d68926bb387154b035c5dd6dbe499490da90cfdc87" +
            "8cac0d98a8e70b0b8f35a4d70a8bfd8c53183816ddaae73eefcbdc8ad715452" +
            "b0ed62fedf003f0fdc9934f17f6115f9b489b3a3f68f08d695c92912c3fba56" +
            "91f3396de151160cb171fce29d36ae315780554abeead208c1e3920f7167515" +
            "405f0148c0587a7d878190dd12450d9f1972e21e39d676d9e5bb690071d98ed" +
            "5c0859077e409741912a4baf07dabc2c879725f0af67f783bbb0161c68d55ef" +
            "6835639eaaedff2317561040000000000000000000000000000000000000000" +
            "000000000000000000000000000000000000000000000000000000000000000" +
            "000000000000000000000000000747e1080925af0fda8e8116eaa9f91d047bf" +
            "a768d71433848ea869258cbecafa7dcaae0d8ceb63cf7d47ca293fa6314c6fd" +
            "9055ab633c966628234fa13ec16a60000000000000000000000000000000000" +
            "000000000000000000000000000000000000000000000000000000000000000" +
            "000000000000000000000000000000000"
        );

        let deserialized_block = new Block();
        buffer.readOffset = 0;
        deserialized_block.deserialize(buffer);
        assert.deepStrictEqual(block, deserialized_block,
             "When serialize, then deserialize, it does not match the original.");
    });
});
