/*******************************************************************************

    Contains definition for the public key class,

    See_Also: https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/crypto/Key.d

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as utils from '../utils/CRC16';
import { Signature } from './Signature';

import * as sodium from 'sodium-native';
import * as assert from 'assert';
import { base32Encode, base32Decode } from '@ctrl/ts-base32';

/**
 * Define the public key / address
 */
export class PublicKey
{
    /**
     * Buffer containing raw public key
     */
    public readonly data: Buffer;

    /**
     * The number of byte of the public key
     */
    public static Width: number = sodium.crypto_sign_PUBLICKEYBYTES;

    /**
     * Constructor
     * @param bin The binary data of the public key
     */
    constructor (bin?: Buffer)
    {
        this.data = Buffer.alloc(PublicKey.Width);
        if (bin != undefined)
        {
            assert.strictEqual(bin.length, PublicKey.Width);
            bin.copy(this.data);
        }
    }

    /**
     * Uses Stellar's representation instead of hex
     * @returns The address
     */
    public toString (): string
    {
        const body = Buffer.concat([Buffer.from([VersionByte.AccountID]), this.data]);
        const checksum = utils.checksum(body);
        const unencoded = Buffer.concat([body, checksum]);
        return base32Encode(unencoded);
    }

    /**
     * Read a Public key from Stellar's string representation
     * @param str The address
     * @returns The instance of PublicKey
     */
    public fromString (str: string): PublicKey
    {
        const decoded = Buffer.from(base32Decode(str));
        assert.strictEqual(decoded.length, 1 + PublicKey.Width + 2);
        assert.strictEqual(decoded[0], VersionByte.AccountID);

        const body = decoded.slice(0, -2);
        const data = body.slice(1);
        const checksum = decoded.slice(-2);

        assert.ok(utils.validate(body, checksum));

        data.copy(this.data);

        return this;
    }

    /**
     * Create a Public key from Stellar's string representation
     * @param str The address
     * @returns The instance of PublicKey
     */
    public static createFromString (str: string): PublicKey
    {
        return (new PublicKey()).fromString(str);
    }

    /**
     * Verify that a signature matches a given message
     * @param signature The signature of `msg` matching `this` public key.
     * @param msg The signed message. Should not include the signature.
     * @returns `true` if the signature is valid
     * See_Also: https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/crypto/Key.d#L226-L235
     */
    public verify (signature: Signature, msg: Buffer): boolean
    {
        return sodium.crypto_sign_verify_detached(signature.data, msg, this.data);
    }
}

/**
 * Discriminant for Stellar binary-encoded user-facing data
 */
enum VersionByte
{
    /**
     * Used for encoded stellar addresses
     * Base32-encodes to 'G...'
     */
    AccountID = 6 << 3,

    /**
     * Used for encoded stellar seed
     * Base32-encodes to 'S...'
     */
    Seed = 18 << 3,

    /**
     * Used for encoded stellar hashTx signer keys.
     * Base32-encodes to 'T...'
     */
    HashTx = 19 << 3,

    /**
     * Used for encoded stellar hashX signer keys.
     * Base32-encodes to 'X...'
     */
    HashX = 23 << 3,
}
