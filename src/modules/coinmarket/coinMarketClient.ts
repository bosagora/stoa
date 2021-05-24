/*******************************************************************************

    This file contains CoinMarket Interface and CoinGeckoMaket as concrete 
    implementation of CoinMarket.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { CoinGeckoClient } from "coingecko-api-v3";
import { logger, Logger } from '../common/Logger';
import { IMarketCap } from "../../Types";

export interface CoinMarket {
    /**
     * Method to ping the coin market
     */
    ping(): Promise<boolean>;
    /**
     * Method to fetch from coin market
     */
    fetch(): Promise<any>;
}

export class CoinGeckoMaket implements CoinMarket {
    /**
     * Market Client i.e Gecko_coin_market 
     */
    private coinMarketClient: CoinGeckoClient;

    constructor() {
        this.coinMarketClient = new CoinGeckoClient({
            timeout: 10000,
            autoRetry: true,
        });
    }
    /**
     *  This method ping the GecoCoinMarket
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public ping(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            let data = await this.coinMarketClient.ping();
            if (data.gecko_says) {
                resolve(true);
            }
            else {
                logger.info(`Error: Unable to ping coin market client`);
                return reject(`Error: Unable to ping coin market client`);
            }
        })
    }
    /**
     *  This method fetch the coin market data
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public fetch(): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            let marketCap = await this.coinMarketClient.simplePrice({ ids: "boa", vs_currencies: "usd", include_market_cap: true, include_24hr_vol: true, include_24hr_change: true, include_last_updated_at: true })
            if (marketCap) {
                let coinMarketStat: IMarketCap =
                {
                    price: marketCap.boa.usd,
                    market_cap: marketCap.boa.usd_market_cap,
                    vol_24h: marketCap.boa.usd_24h_vol,
                    change_24h: marketCap.boa.usd_24h_change,
                    last_updated_at: marketCap.boa.last_updated_at
                }
                logger.info(`CoinMarket: Data Fetch Completed at ${marketCap.boa.last_updated_at}`);
                return resolve(coinMarketStat);
            }
            else {
                logger.info(`Fail to fetch CoinMarket data`);
                reject(`Fail to fetch CoinMarket data`);
            }
        });
    }
}

