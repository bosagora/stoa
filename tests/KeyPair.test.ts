/*******************************************************************************

    Test for KeyPair, PublicKey, SecretKey and Seed

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { KeyPair, PublicKey, Seed }  from '../src/modules/data'
import { SodiumHelper } from '../src/modules/utils/SodiumHelper'

import * as assert from 'assert';

describe ('ED25519 Public Key', () =>
{
    before('Wait for the package libsodium to finish loading', () =>
    {
        return SodiumHelper.init();
    });

    it ('Extract the public key from a string then convert it back into a string and compare it.', () =>
    {
        let address = 'GDD5RFGBIUAFCOXQA246BOUPHCK7ZL2NSHDU7DVAPNPTJJKVPJMNLQFW';
        let public_key = new PublicKey(address);
        assert.strictEqual(public_key.toString(), address);
    });
});

describe ('ED25519 Secret Key Seed', () =>
{
    it ('Extract the seed from a string then convert it back into a string and compare it.', () =>
    {
        let secret_seed = 'SBBUWIMSX5VL4KVFKY44GF6Q6R5LS2Z5B7CTAZBNCNPLS4UKFVDXC7TQ';
        let seed = new Seed(secret_seed);
        assert.strictEqual(seed.toString(), secret_seed);
    });
});

describe ('KeyPair', () =>
{
    // See: https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/crypto/Key.d#L375-L386
    it ('Test of KeyPair.fromSeed, sign, verify', () =>
    {
        let address = `GDD5RFGBIUAFCOXQA246BOUPHCK7ZL2NSHDU7DVAPNPTJJKVPJMNLQFW`;
        let seed = `SBBUWIMSX5VL4KVFKY44GF6Q6R5LS2Z5B7CTAZBNCNPLS4UKFVDXC7TQ`;

        let kp = KeyPair.fromSeed(new Seed(seed));
        assert.strictEqual(kp.address.toString(), address);

        let signature = kp.secret.sign(Buffer.from('Hello World'));
        assert.ok(kp.address.verify(signature, Buffer.from('Hello World')));
    });

    it ('Test of KeyPair.random, sign, verify, reproduce', () =>
    {
        let random_kp = KeyPair.random();

        let random_kp_signature = random_kp.secret.sign(Buffer.from('Hello World'));
        assert.ok(random_kp.address.verify(random_kp_signature, Buffer.from('Hello World')));

        // Test whether randomly generated key-pair are reproducible.
        let reproduced_kp = KeyPair.fromSeed(random_kp.seed);

        let reproduced_kp_signature = reproduced_kp.secret.sign(Buffer.from('Hello World'));
        assert.ok(reproduced_kp.address.verify(reproduced_kp_signature, Buffer.from('Hello World')));

        assert.deepStrictEqual(random_kp.secret, reproduced_kp.secret);
        assert.deepStrictEqual(random_kp.address, reproduced_kp.address);
        assert.deepStrictEqual(random_kp_signature, reproduced_kp_signature);
    });
});
