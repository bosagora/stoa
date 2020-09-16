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
