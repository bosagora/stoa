/*******************************************************************************

    Includes various useful functions

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

export class Utils
{
    /**
     * Check whether the string is a integer.
     * @param value
     */
    public static isInteger (value: string): boolean
    {
        return /^[+\-]?([0-9]+)$/.test(value);
    }

    /**
     * Check whether the string is a positive integer.
     * @param value
     */
    public static isPositiveInteger (value: string): boolean
    {
        return /^(\+)?([0-9]+)$/.test(value);
    }

    /**
     * Check whether the string is a negative integer.
     * @param value
     */
    public static isNegativeInteger (value: string): boolean
    {
        return /^\-([0-9]+)$/.test(value);
    }

    /**
     *  Gets the path to where the execution command was entered for this process.
     * This value must be set, otherwise the application will terminate.
     */
    public static getInitCWD (): string
    {
        // Get the working directory the user was in when the process was started,
        // as opposed to the `cwd` exposed by node which is the program's path.
        // Try to use `INIT_CWD` which is provided by npm, and fall back to
        // `PWD` otherwise.
        // See also: https://github.com/npm/cli/issues/2033
        if (process.env.INIT_CWD !== undefined)
            return process.env.INIT_CWD;
        assert.ok(process.env.PWD !== undefined, "Neither `INIT_CWD` nor `PWD` are defined");
        return process.env.PWD;
    }

    /**
     * Read from the hex string
     * @param hex The hex string
     * @param target The buffer to output
     * @returns The output buffer
     */
    public static readFromString (hex: string, target?: Buffer): Buffer
    {
        let start = (hex.substr(0, 2) == '0x') ? 2 : 0;
        let length = (hex.length - start) >> 1;
        if (target === undefined)
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
    public static writeToString (source: Buffer, endian: Endian = Endian.Little): string
    {
        if (source.length == 0)
            return '0x';

        if (endian == Endian.Little)
        {
            let hex: Array<string> = [];
            for (let idx = source.length-1; idx >= 0; idx--) {
                hex.push((source[idx] >>> 4).toString(16));
                hex.push((source[idx] & 0xF).toString(16));
            }
            return '0x' + hex.join("");
        }
        else
            return '0x' + source.toString("hex");
    }
}
