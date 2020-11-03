/*******************************************************************************

    Includes functions for reading and writing of the Buffer.

    It is a function that is needed to match the output direction with agora.
    When the byte array is printed in hex string,
    the order of D-language and TypeScript is the opposite.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as assert from 'assert';

/**
 * The byte order
 */
export enum Endian
{
    Little,
    Big
}

/**
 * Read from the hex string
 * @param hex The hex string
 * @param target The buffer to output
 * @returns The output buffer
 */
export function readFromString (hex: string, target?: Buffer): Buffer
{
    let start = (hex.substr(0, 2) == '0x') ? 2 : 0;
    let length = (hex.length - start) >> 1;
    if (target == undefined)
        target = Buffer.alloc(length);

    for (let pos = 0, idx = start; idx < length * 2 + start; idx += 2, pos++)
        target[length - pos - 1] = parseInt(hex.substr(idx, 2), 16);
    return target;
}

/**
 * Write to the hex string
 * @param source The buffer to input
 * @param endian The byte order
 * @returns The hex string
 */
export function writeToString (source: Buffer, endian?: Endian): string
{
    if (source.length == 0)
        return '0x';

    if ((endian === undefined) || (endian == Endian.Little))
    {
        let hex = [];
        for (let idx = source.length-1; idx >= 0; idx--) {
            hex.push((source[idx] >>> 4).toString(16));
            hex.push((source[idx] & 0xF).toString(16));
        }
        return '0x' + hex.join("");
    }
    else
        return '0x' + source.toString("hex");
}
