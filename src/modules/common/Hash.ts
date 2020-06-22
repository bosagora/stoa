/*******************************************************************************

    Includes classes that create hash.

    This was implemented to a UTXO key using the transaction's hash and
    output index.
    We will add a wider range of functions in the future.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as sodium from 'sodium-native'

//  Byte of Hash
const HashSize: number = 64;

/**
 * The Class for creating hash
 */
class Hash
{
    /**
     * Buffer containing calculated hash values
     */
    public buffer: Buffer;

    /**
     * Constructor
     * @param hex Hex string of hash
     */
    constructor (hex?: string)
    {
        this.buffer = Buffer.alloc(HashSize);
        if (hex != undefined)
            this.fromHexString(hex);
    }

    /**
     * Creates a hash and stores it in buffer.
     * @param source Original for creating hash
     */
    public hash (source: Buffer)
    {
        sodium.crypto_generichash(this.buffer, source);
    }

    /**
     * Creates a hash of the two buffer combined.
     * @param source1: Original for creating hash
     * @param source2: Original for creating hash
     */
    public hashMulti (source1: Buffer, source2: Buffer)
    {
        let merge = Buffer.alloc(source1.length + source2.length);
        source1.copy(merge);
        source2.copy(merge, source1.length);
        sodium.crypto_generichash(this.buffer, merge);
    }

    /**
     * Read from hex string
     * @param hex Hex string
     */
    public fromHexString (hex: string)
    {
        readFromHexString(hex, this.buffer);
    }

    /**
     * Write to hex string
     */
    public toHexString ()
    {
        return writeToHexString(this.buffer);
    }

    /**
     * A method that makes hash easy to create UTXOKey
     * @param hex Hex string of transaction hash
     * @param index index of the output
     */
    public makeUTXOKey (hex: string, index: bigint)
    {
        let tx = readFromHexString(hex);
        let idx = Buffer.alloc(8);
        idx.writeBigUInt64LE(index);

        this.hashMulti(tx, idx);
    }
}

/**
 * Read from hex string
 * @param hex Hex string
 * @param target Buffer to output
 */
function readFromHexString (hex: string, target?: Buffer)
{
    let temp = Buffer.from((hex.substr(0, 2) == '0x') ? hex.substr(2) : hex, 'hex');

    if (target == undefined)
        target = Buffer.alloc(temp.length);

    for (let idx = 0; idx < temp.length; idx++)
        target.writeUInt8(temp.readUInt8(idx), HashSize - idx - 1);

    return target;
}

/**
 * Write to hex string
 * @param source Buffer to input
 */
function writeToHexString (source: Buffer)
{
    let temp = Buffer.alloc(HashSize);
    for (let idx = 0; idx < source.length; idx++)
        temp.writeUInt8(source.readUInt8(idx), HashSize - idx - 1);
    return '0x' + temp.toString("hex");
}

export default {
    Hash: Hash,
    readFromHexString: readFromHexString,
    writeToHexString: writeToHexString
};
