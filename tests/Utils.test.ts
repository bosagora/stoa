/*******************************************************************************

    Test for utility functions

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as assert from 'assert';
import { Utils } from '../src/modules/utils/Utils';
import { Height } from '../src/modules/data';
import { UInt64 } from 'spu-integer-math';

describe ('Test of isInteger, isPositiveInteger, isNegativeInteger', () =>
{
    it ('isInteger', () =>
    {
        assert.ok(!Utils.isInteger("a12345678901234567890"));
        assert.ok(Utils.isInteger("12345678901234567890"));
        assert.ok(Utils.isInteger("+12345678901234567890"));
        assert.ok(Utils.isInteger("-12345678901234567890"));
    });

    it ('isPositiveInteger', () =>
    {
        assert.ok(!Utils.isPositiveInteger("a12345678901234567890"));
        assert.ok(Utils.isPositiveInteger("12345678901234567890"));
        assert.ok(Utils.isPositiveInteger("+12345678901234567890"));
        assert.ok(!Utils.isPositiveInteger("-12345678901234567890"));
    });

    it ('isNegativeInteger', () =>
    {
        assert.ok(!Utils.isNegativeInteger("a12345678901234567890"));
        assert.ok(!Utils.isNegativeInteger("12345678901234567890"));
        assert.ok(!Utils.isNegativeInteger("+12345678901234567890"));
        assert.ok(Utils.isNegativeInteger("-12345678901234567890"));
    });
});

describe ('Test of toJson', () =>
{
    it ('We can not get the desired result when UInt64 is used in `JSON.stringify`', () =>
    {
        let height = new Height(UInt64.fromNumber(45));
        let json = JSON.stringify(height);
        assert.strictEqual(json, '{"value":{"hi":0,"lo":45}}');
    });

    it ('It works well when UInt64 is used in `toJson`', () =>
    {
        let height = new Height(UInt64.fromNumber(45));
        let json = Utils.toJson(height);
        assert.strictEqual(json, '{"value":45}');
    });
});
