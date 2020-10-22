/*******************************************************************************

    Includes various useful functions

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as assert from 'assert';
import { UInt64 } from 'spu-integer-math';

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
     * Converts the UInt64 to the string
     * @param value The number of UInt64
     * @param radix An integer in the range 2 through 36 specifying
     * the base to use for representing numeric values.
     */
    public static UInt64ToString(value: UInt64, radix?: number): string
    {
        const BIT32 = 4294967296;

        let high = value.hi;
        let low = value.lo;
        let str = "";

        radix = radix || 10;
        while (true)
        {
            let mod = (high % radix) * BIT32 + low;
            high = Math.floor(high / radix);
            low = Math.floor(mod / radix);
            str = (mod % radix).toString(radix) + str;
            if (!high && !low) break;
        }
        return str;
    }

    /**
     * It is a function that outputs an object with BigInt as JSON.
     * @param data - Object to be converted to a JSON string
     * @returns - If the data type is UInt64 then it converts
     * it to a string and returns a JSON string with " removed.
     */
    public static toJson(data: object): string
    {
        if (data === undefined)
            return "";

        let uint64_to_string = 0;

        // If the data type is UInt64,
        // it converts it into a string and adds '#uint64' after that.
        const json = JSON.stringify(data, (_, value) =>
        {
            if (value instanceof UInt64)
            {
                uint64_to_string++;
                return `${Utils.UInt64ToString(value)}#uint64`;
            }
            return value;
        });


        let remove_quotation = 0;

        // Remove " and #uint64 from the pattern "NUBER#uint64" in JSON.
        const res = json.replace(/"(-?\d+)#uint64"/g, (_, value) =>
        {
            remove_quotation++;
            return value;
        });

        if (remove_quotation > uint64_to_string)
        {
            throw new Error(`UInt64 serialization pattern conflict with a string value.`);
        }

        return res;
    }

    /**
     *  Gets the path to where the execution command was entered for this process.
     * This value must be set, otherwise the application will terminate.
     */
    public static getInitCWD (): string
    {
        //  The type of `process.env.INIT_CWD` is `string | undefined`.
        //  In order to simply return `string`, it is necessary to make sure
        //  that it is not `undefined` first.
        if (process.env.INIT_CWD === undefined)
            assert.fail("INIT_CWD is not defined.");
        else
            return process.env.INIT_CWD;
    }
}
