/*******************************************************************************

    Test that calculates transaction fees

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { JSBI } from "boa-sdk-ts";
import { FeeManager } from "../src/modules/common/FeeManager";

import * as assert from "assert";

describe("Test of FeeManager", () => {
    it("Test of FeeManager.getTxFee()", async () => {
        assert.deepStrictEqual(FeeManager.getTxFee(500, 0), [
            JSBI.BigInt(110_000),
            JSBI.BigInt(100_000),
            JSBI.BigInt(100_000),
        ]);
        assert.deepStrictEqual(FeeManager.getTxFee(500, 100_000), [
            JSBI.BigInt(220_000),
            JSBI.BigInt(200_000),
            JSBI.BigInt(180_000),
        ]);
    });

    it("Test of FeeManager.calculateTrimmedMeanDisparity()", async () => {
        const data = [];
        for (let idx = 0; idx < 100; idx++) data.push(idx);

        // Remove 5% minimum value, 5% maximum
        // Calculate an average
        let sum = 0;
        for (let n = 5; n <= 94; n++) sum += n;
        const avg = Math.floor(sum / 90);
        assert.deepStrictEqual(FeeManager.calculateTrimmedMeanDisparity(data), avg);
    });
});
