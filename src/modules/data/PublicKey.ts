/*******************************************************************************

    Contains definition for the public key class,

    See_Also: https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/crypto/Key.d

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Signature } from './Signature';
import * as utils from '../utils/CRC16';

import * as assert from 'assert';
import { base32Encode, base32Decode } from '@ctrl/ts-base32';
import { SmartBuffer } from 'smart-buffer';
import * as sodium from 'sodium-native';

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
     * Construct a new instance of this class
     *
     * @param data   The string or binary representation of the public key
     * @param endian The byte order
     */
    constructor (data: Buffer | string)
    {
        if (typeof data === 'string')
        {
            const decoded = Buffer.from(base32Decode(data));
            assert.strictEqual(decoded.length, 1 + PublicKey.Width + 2);
            assert.strictEqual(decoded[0], VersionByte.AccountID);

            const body = decoded.slice(0, -2);
            this.data = body.slice(1);

            const checksum = decoded.slice(-2);
            assert.ok(utils.validate(body, checksum));
        }
        else
        {
            this.data = Buffer.alloc(PublicKey.Width);
            data.copy(this.data);
        }
        assert.ok(this.data.length == PublicKey.Width);
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

    /**
     * Collects data to create a hash.
     * @param buffer - The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        buffer.writeBuffer(this.data);
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
