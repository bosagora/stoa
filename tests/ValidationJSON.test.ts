/*******************************************************************************

    Test that validation with JSON schema

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Validator, ITransaction, IEnrollment } from '../src/modules/data/validator';

import * as assert from 'assert';

describe ('Test that validation with JSON schema', () =>
{
    it ('Test that validation of Transaction', () =>
    {
        assert.throws(() =>
        {
            // When attribute `type` is not present
            Validator.isValidOtherwiseThrow<ITransaction>
            ("Transaction", {
                "inputs": [],
                "outputs": [],
                "payload": ""
            });
        }, new Error("Validation failed: Transaction" +
            " - should have required property 'type'"));

        assert.throws(() =>
        {
            // When attribute `inputs` is not an array
            Validator.isValidOtherwiseThrow<ITransaction>
            ("Transaction", {
                "type": 1,
                "inputs": {},
                "outputs": [],
                "payload": ""
            });
        }, new Error("Validation failed: Transaction - should be array"));

        // When attribute `type` is not present
        assert.ok(!Validator.isValidOtherwiseNoThrow<ITransaction>
        ("Transaction", {
            "inputs": [],
            "outputs": [],
            "payload": ""
        }));

        // When attribute `inputs` is not an array
        assert.ok(!Validator.isValidOtherwiseNoThrow<ITransaction>
        ("Transaction", {
            "type": 1,
            "inputs": {},
            "outputs": [],
            "payload": ""
        }));

        // When everything is normal
        assert.ok(Validator.isValidOtherwiseThrow<ITransaction>
        ("Transaction",
        {
            "type": 0,
            "inputs": [],
            "outputs": [
                {
                    "value": "400000000000",
                    "address": "GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2" +
                        "OKDM2VJ235GN"
                }
            ],
            "payload": ""
        }));

        // When everything is normal
        assert.ok(Validator.isValidOtherwiseThrow<ITransaction>
        ("Transaction",
        {
            "type": 0,
            "inputs": [
                {
                    "previous": "0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5" +
                        "cd252c2c6f10cdbd2236713dc369ef2a44b62ba113814a9d819" +
                        "a276ff61582874c9aee9c98efa2aa1f10d73",
                    "signature": "0x07557ce0845a7ccbba61643b95e310bd3ae06c41" +
                        "fab9e8761ff3b0e5d28a5d625a3b951223c618910b239e7b779" +
                        "c6c671252a78edff4d0f37bdb25982e4f4228"
                }
            ],
            "outputs": [
                {
                    "value": "400000000000",
                    "address": "GA3DMXTREDC4AIUTHRFIXCKWKF7BDIXRWM2KLV74OPK2" +
                        "OKDM2VJ235GN"
                }
            ],
            "payload": ""
        }));

    });

    it ('Test that validation of Enrollment', () =>
    {
        // When attribute `utxo_key` is not present
        assert.throws(() =>
        {
            Validator.isValidOtherwiseThrow<IEnrollment>
            ("Enrollment", {
                "random_seed": "0xfb05e20321ae11b2f799a71a736fd172c5dec39540" +
                    "f53d6213cd1b7522898c8bfb86445c6b6db9437899f5917bb5f9c9b" +
                    "e7358ba0ecaa37675692f7d08766950",
                "cycle_length": 1008,
                "enroll_sig": "0x0c48e78972e1b138a37e37ae27a01d5ebdea193088d" +
                    "def2d9883446efe63086925e8803400d7b93d22b1eef5c475098ce0" +
                    "8a5b47e8125cf6b04274cc4db34bfd"
            });
        }, new Error("Validation failed: Enrollment" +
            " - should have required property 'utxo_key'"));

        // When attribute `utxo_key` is not present
        assert.ok(!Validator.isValidOtherwiseNoThrow<IEnrollment>
        ("Enrollment", {
            "random_seed": "0xfb05e20321ae11b2f799a71a736fd172c5dec39540f53d" +
                "6213cd1b7522898c8bfb86445c6b6db9437899f5917bb5f9c9be7358ba0" +
                "ecaa37675692f7d08766950",
            "cycle_length": 1008,
            "enroll_sig": "0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2" +
                "d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8" +
                "125cf6b04274cc4db34bfd"
        }));

        // When everything is normal
        assert.ok(Validator.isValidOtherwiseThrow<IEnrollment>
        ("Enrollment", {
            "utxo_key": "0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e9" +
                "1ab66ad1cc3bfc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f0" +
                "3a83651b48ce0e576a1a",
            "random_seed": "0xfb05e20321ae11b2f799a71a736fd172c5dec39540f53d" +
                "6213cd1b7522898c8bfb86445c6b6db9437899f5917bb5f9c9be7358ba0" +
                "ecaa37675692f7d08766950",
            "cycle_length": 1008,
            "enroll_sig": "0x0c48e78972e1b138a37e37ae27a01d5ebdea193088ddef2" +
                "d9883446efe63086925e8803400d7b93d22b1eef5c475098ce08a5b47e8" +
                "125cf6b04274cc4db34bfd"
        }));
    });
});
