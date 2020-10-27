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
    it ('Test that `BigInt` serializes to JSON', () =>
    {
        let json1 = JSON.stringify(BigInt(42));
        assert.strictEqual(json1, '"42"');
        let json2 = JSON.stringify({ value: BigInt(42) });
        assert.strictEqual(json2, '{"value":"42"}');
    });

    it ('We can not get the desired result when UInt64 is used in `JSON.stringify`', () =>
    {
        let height = new Height(45n);
        let json = JSON.stringify(height);
        assert.strictEqual(json, '{"value":{"hi":0,"lo":45}}');
    });

    it ('It works well when UInt64 is used in `toJson`', () =>
    {
        let height = new Height(45n);
        let json = Utils.toJson(height);
        assert.strictEqual(json, '{"value":45}');
    });
});
