/*******************************************************************************

    This file contain the Exchange class.

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import bigDecimal from 'js-big-decimal';
import { Amount, AmountConverter, BOA } from "boa-sdk-ts";
import JSBI from 'jsbi';

export class Exchange {

    /**
     * Current exchange of BOA/USD 
     */
    public exchangeRate: number

    constructor(exchangeRate: number) {
        this.exchangeRate = exchangeRate;
    }

    /**
     * Convert BOA to USD.
     * @param boa The BOA unit amount.
     * @returns Amount in USD.
     */
    public convertBoaToCurrency(boa: number): number {
        let currencyAmount = Number(bigDecimal.multiply(this.exchangeRate, boa)).toFixed(6);
        return Number(currencyAmount);
    }

    /**
     * Convert Amount To USD.
     * @param amount The amount.
     * @returns Amount in USD.
     */
    public convertAmountToCurrency(amount: Amount): number {
        return this.convertBoaToCurrency(Number(AmountConverter.toString(amount, false)));
    }
}
