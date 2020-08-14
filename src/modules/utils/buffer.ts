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

/**
 * Read from the hex string
 * @param hex The hex string
 * @param target The buffer to output
 * @returns The output buffer
 */
export function readFromString (hex: string, target?: Buffer): Buffer
{
    let temp = Buffer.from((hex.substr(0, 2) == '0x') ? hex.substr(2) : hex, 'hex');

    if (target == undefined)
        target = Buffer.alloc(temp.length);

    for (let idx = 0; idx < temp.length; idx++)
        target.writeUInt8(temp.readUInt8(idx), temp.length - idx - 1);

    return target;
}

/**
 * Write to the hex string
 * @param source The buffer to input
 * @returns The hex string
 */
export function writeToString (source: Buffer): string
{
    let temp = Buffer.alloc(source.length);
    for (let idx = 0; idx < source.length; idx++)
        temp.writeUInt8(source.readUInt8(idx), source.length - idx - 1);
    return '0x' + temp.toString("hex");
}
