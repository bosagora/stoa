/*******************************************************************************

    Test for PublicKey

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { PublicKey, Signature }  from '../src/modules/data'
import * as assert from 'assert';

describe ('PublicKey', () =>
{
    it ('Extract the public key from a string then convert it back into a string and compare it.', () =>
    {
        let address = 'GDD5RFGBIUAFCOXQA246BOUPHCK7ZL2NSHDU7DVAPNPTJJKVPJMNLQFW';
        let public_key = PublicKey.createFromString(address);
        assert.strictEqual(public_key.toString(), address);
    });

    // See: https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/crypto/Key.d#L375-L386
    it ('test for verify of signature', () =>
    {
        let address = 'GDD5RFGBIUAFCOXQA246BOUPHCK7ZL2NSHDU7DVAPNPTJJKVPJMNLQFW';
        let signature = Signature.createFromString('0x01cd1b598618347c1d5df7' +
            'ce25d94de41bac109699dc0c93bb01703b81c7731503f7dc5f7f9a9375efb67' +
            '2c83669f5c74ba41d30e5a969d1ed06904eb3b0b6a7');
        let public_key = PublicKey.createFromString(address);
        assert.ok(public_key.verify(signature, Buffer.from('Hello World')));
    });
});
