/*******************************************************************************

    Contains definition for the class KeyPair, PublicKey, SecretKey and Seed

    See_Also: https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/crypto/Key.d

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Signature } from './Signature';
import { checksum, validate } from "../utils/CRC16";

import * as assert from 'assert';
import { base32Encode, base32Decode } from '@ctrl/ts-base32';
import { SmartBuffer } from 'smart-buffer';
import * as sodium from "sodium-native";

/**
 * The class to hold a secret key + public key + seed
 */
export class KeyPair
{
    /**
     * The public key
     */
    public readonly address: PublicKey;

    /**
     * The secret key
     */
    public readonly secret: SecretKey;

    /**
     * The seed key
     */
    public readonly seed: Seed;

    /**
     * Constructor
     * @param address The instance of PublicKey
     * @param secret The instance of SecretKey
     * @param seed The instance of Seed
     */
    constructor (address: PublicKey, secret: SecretKey, seed: Seed)
    {
        this.address = address;
        this.secret = secret;
        this.seed = seed;
    }

    /**
     * Create a KeyPair from a Seed
     * @param seed The instance of Seed
     * @returns The instance of KeyPair
     */
    public static fromSeed (seed: Seed): KeyPair
    {
        let sk = Buffer.alloc(SecretKey.Width);
        let pk = Buffer.alloc(PublicKey.Width);
        sodium.crypto_sign_seed_keypair(pk, sk, seed.data);
        return new KeyPair(new PublicKey(pk), new SecretKey(sk), new Seed(seed.data));
    }

    /**
     * Generate a KeyPair with a randomly generated Seed
     * @returns The instance of KeyPair
     */
    public static random (): KeyPair
    {
        let sk = Buffer.alloc(SecretKey.Width);
        let pk = Buffer.alloc(PublicKey.Width);
        let seed = Buffer.alloc(Seed.Width);

        sodium.crypto_sign_keypair(pk, sk);
        sk.copy(seed, 0, 0, Seed.Width);
        return new KeyPair(new PublicKey(pk), new SecretKey(sk), new Seed(seed));
    }
}

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
     * @param data The string or binary representation of the public key
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
            assert.ok(validate(body, checksum));
        }
        else
        {
            assert.ok(data.length == PublicKey.Width);
            this.data = Buffer.from(data);
        }
        assert.ok(this.data.length == PublicKey.Width);
    }

    /**
     * Uses Stellar's representation instead of hex
     */
    public toString (): string
    {
        const body = Buffer.concat([Buffer.from([VersionByte.AccountID]), this.data]);
        const cs = checksum(body);
        const unencoded = Buffer.concat([body, cs]);
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
     * @param buffer The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        buffer.writeBuffer(this.data);
    }

    /**
     * Converts this object to its JSON representation
     */
    public toJSON (key?: string): string
    {
        return this.toString();
    }

    /**
     * The public key consisting of zero values for all bytes.
     * @returns The instance of PublicKey
     */
    static get init(): PublicKey
    {
        return new PublicKey(Buffer.alloc(PublicKey.Width));
    }
}

/**
 * Define the secret key
 */
export class SecretKey
{
    /**
     * Buffer containing raw secret key
     */
    public readonly data: Buffer;

    /**
     * The number of byte of the secret key
     */
    public static Width: number = sodium.crypto_sign_SECRETKEYBYTES;

    /**
     * Constructor
     * @param data The binary data of the secret key
     */
    constructor (data: Buffer)
    {
        assert.strictEqual(data.length, SecretKey.Width);
        this.data = Buffer.from(data);
    }

    /**
     * Signs a message with this private key
     * @param msg The message to sign.
     * @returns The signature of `msg` using `this`
     * See_Also: https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/crypto/Key.d#L274-L282
     */
    public sign (msg: Buffer): Signature
    {
        let data = Buffer.alloc(Signature.Width);
        sodium.crypto_sign_detached(data, msg, this.data)
        return new Signature(data);
    }

    /**
     * The secret key consisting of zero values for all bytes.
     * @returns The instance of SecretKey
     */
    static get init(): SecretKey
    {
        return new SecretKey(Buffer.alloc(SecretKey.Width));
    }
}

/**
 * Define ed25519 secret key seed
 */
export class Seed
{
    /**
     * Buffer containing raw seed
     */
    public readonly data: Buffer;

    /**
     * The number of byte of the seed
     */
    public static Width: number = sodium.crypto_sign_SEEDBYTES;

    /**
     * Constructor
     * @param data The binary data of the seed
     */
    constructor (data: Buffer | string)
    {
        if (typeof data === 'string')
        {
            const decoded = Buffer.from(base32Decode(data));
            assert.strictEqual(decoded.length, 1 + Seed.Width + 2);
            assert.strictEqual(decoded[0], VersionByte.Seed);

            const body = decoded.slice(0, -2);
            const cs = decoded.slice(-2);

            assert.ok(validate(body, cs));

            this.data = body.slice(1);
        }
        else
        {
            assert.strictEqual(data.length, Seed.Width);
            this.data = Buffer.from(data);
        }
        assert.ok(this.data.length == Seed.Width);
    }

    /**
     * Returns a secret key seed as a string
     * @returns The secret key seed
     */
    public toString (): string
    {
        const body = Buffer.concat([Buffer.from([VersionByte.Seed]), this.data]);
        const cs = checksum(body);
        const decoded = Buffer.concat([body, cs]);
        return base32Encode(decoded);
    }
}

/**
 * @ignore
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
