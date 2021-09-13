/*******************************************************************************

    This file contains a class that calculate transaction fees and
    process statistics.

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { JSBI } from "boa-sdk-ts";

/**
 * Calculate transaction fees and process statistics.
 */
export class FeeManager {
    /**
     * Calculate the fees according to the transaction size.
     * @param tx_size   The size of the transaction
     * @param disparity The disparity plot calculated from most recent block
     * @returns The fees of [high, medium, low]
     */
    public static getTxFee(tx_size: number, disparity: number): [JSBI, JSBI, JSBI] {
        const size = JSBI.BigInt(tx_size);
        const rate = JSBI.BigInt(700);
        const minimum = JSBI.multiply(size, rate);
        let medium = JSBI.multiply(size, rate);
        if (JSBI.lessThan(medium, minimum)) medium = JSBI.BigInt(minimum);

        const width = JSBI.divide(medium, JSBI.BigInt(10));
        let high = JSBI.add(medium, width);
        let low = JSBI.subtract(medium, width);
        if (JSBI.lessThan(high, minimum)) high = JSBI.BigInt(minimum);
        if (JSBI.lessThan(low, minimum)) low = JSBI.BigInt(minimum);

        return [high, medium, low];
    }

    /**
     * Calculates a trimmed mean of the disparities
     * @param values The sample of disparity
     * @param trim_percent The percent of trim
     * @returns The value of trimmed mean
     */
    public static calculateTrimmedMeanDisparity(values: number[], trim_percent: number = 5): number {
        if (values.length === 0) return 0;

        // Sort the array
        values.sort((a, b) => a - b);

        // Remove minimum value, maximum
        for (let idx = 0; idx < Math.floor((values.length * trim_percent) / 100.0); idx++) {
            values.shift();
            values.pop();
        }

        // Calculate an average
        const sum = values.reduce((s, v) => s + v, 0);
        return Math.floor(sum / values.length);
    }
}
