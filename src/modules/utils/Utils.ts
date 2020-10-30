/*******************************************************************************

    Includes various useful functions

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as assert from 'assert';

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
}
