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

describe ('Test for JSON serialization', () =>
{
    it ('Test that `BigInt` serializes to JSON', () =>
    {
        let json1 = JSON.stringify(BigInt(42));
        assert.strictEqual(json1, '"42"');
        let json2 = JSON.stringify({ value: BigInt(42) });
        assert.strictEqual(json2, '{"value":"42"}');
    });

    it ('Test that `JSON.stringify` correctly picks up `Height.toJSON`', () =>
    {
        let height = new Height(45n);
        let json = JSON.stringify(height);
        assert.strictEqual(json, '"45"');
    });

    it ('Test that `Height.toJSON` works within an object', () =>
    {
        let height = new Height(45n);
        let json = JSON.stringify({ value: height });
        assert.strictEqual(json, '{"value":"45"}');
    });
});
