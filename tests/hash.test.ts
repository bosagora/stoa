/*******************************************************************************

    Test that create hash.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as assert from 'assert';
import { Hash }  from '../src/modules/common/Hash'

describe('Hash', () => {
    // Buffer has the same content. However, when printed with hex strings,
    // the order of output is different.
    // This was treated to be the same as D language.
    it('Test of reading and writing hex string', () => {
        // Read from hex string
        let h =
            new Hash('0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd223671' +
                    '3dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73');

        // Check
        assert.strictEqual(h.toHexString(),
            '0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd2236713d' +
            'c369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73');
    });

    it('Test of hash', () => {
        // Create Hash class
        let h = new Hash();

        // Hash
        h.hash(Buffer.from("abc"));

        // Check
        assert.strictEqual(h.toHexString(),
            '0x239900d4ed8623b95a92f1dba88ad31895cc3345ded552c22d79ab2a39c5877' +
            'dd1a2ffdb6fbb124bb7c45a68142f214ce9f6129fb697276a0d4d1c983fa580ba');
    });

    // https://github.com/bpfkorea/agora/blob/2d758a693f9df376f9b873f7c7897c0787b582f1/source/agora/common/Hash.d#L260-L265
    it('Test of multi hash', () => {
        // Source 1 : "foo"
        let foo = new Hash();
        foo.hash(Buffer.from("foo"));

        // Source 2 : "bar"
        let bar = new Hash();
        bar.hash(Buffer.from("bar"));

        // Hash Multi
        let h = new Hash();
        h.hashMulti(foo.buffer, bar.buffer);

        // Check
        assert.strictEqual(h.toHexString(),
            '0xe0343d063b14c52630563ec81b0f91a84ddb05f2cf05a2e4330ddc79bd3a06e57' +
            'c2e756f276c112342ff1d6f1e74d05bdb9bf880abd74a2e512654e12d171a74');
    });

    it('Test of utxo key, using makeUTXOKey', () => {
        let hash = new Hash();
        hash.makeUTXOKey('0x5d7f6a7a30f7ff591c8649f61eb8a35d034824ed5cd252c2c6f10cdbd223671' +
        '3dc369ef2a44b62ba113814a9d819a276ff61582874c9aee9c98efa2aa1f10d73', BigInt(1));

        assert.strictEqual(hash.toHexString(),
            '0x7c95c29b184e47fbd32e58e5abd42c6e22e8bd5a7e934ab049d21df545e09c2' +
            'e33bb2b89df2e59ee01eb2519b1508284b577f66a76d42546b65a6813e592bb84');
    });
  });
