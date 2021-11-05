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
    public convertBoaToUsd(boa: number): number {
        let usdAmount = Number(bigDecimal.multiply(this.exchangeRate, boa)).toFixed(3);
        return Number(usdAmount);
    }

    /**
     * Convert Amount To USD.
     * @param amount The amount.
     * @returns Amount in USD.
     */
    public convertAmountToUsd(amount: Amount): number {
        return this.convertBoaToUsd(Number(AmountConverter.toString(amount, false)));
    }
}
