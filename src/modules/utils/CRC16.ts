/*******************************************************************************

    This provides functions to use the CRC16 package.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

    Note by @antirez: this uses actually the XMODEM CRC 16 algorithm, using the
    following parameters:

    Name                       : "XMODEM", also known as "ZMODEM", "CRC-16/ACORN"
    Width                      : 16 bit
    Poly                       : 1021 (That is actually x^16 + x^12 + x^5 + 1)
    Initialization             : 0000
    Reflect Input byte         : False
    Reflect Output CRC         : False
    Xor constant to output CRC : 0000
    Output for "123456789"     : 31C3

*******************************************************************************/

import * as assert from 'assert';
import crc from 'crc';

/**
 * Checksum returns the 2-byte checksum for the provided data
 * Data returned is in little endian
 * @param data {Buffer} Input data
 * @returns {Buffer}
 * See_Also: https://github.com/bpfkorea/agora/blob/
 * 93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/crypto/Crc16.d#L90-L100
 */
export function checksum (data: Buffer): Buffer
{
    const checksum = Buffer.alloc(2);
    checksum.writeUInt16LE(crc.crc16xmodem(data), 0);
    return checksum;
}

/**
 * Validate returns an error if the provided checksum does not match
 * the calculated checksum of the provided data
 * @param data {Buffer} Data to checksum
 * @param expected {Buffer} Expected checksum value
 * @returns {boolean}
 * See_Also: https://github.com/bpfkorea/agora/blob/
 * 93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/crypto/Crc16.d#L104-L109
 */
export function validate (data: Buffer, expected: Buffer): boolean
{
    assert.strictEqual(expected.length, 2);
    const actual = Buffer.alloc(2);
    actual.writeUInt16LE(crc.crc16xmodem(data), 0);
    return expected.equals(actual);
}
