/*******************************************************************************

    This file contains CoinMarket Interface and CoinGeckoMarket as concrete
    implementation of CoinMarket.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { IMarketCap } from "../../Types";
import { logger } from "../common/Logger";
import { Operation, Status } from "../common/LogOperation";
import moment from "moment";
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

export class CoinGeckoMarket implements CoinMarket {
    /**
     * Market Client i.e Gecko_coin_market
     */
    private coinMarketClient: any;

    constructor(GeckoClient: any) {
        this.coinMarketClient = GeckoClient;
    }

    /**
     *  This method ping the GecoCoinMarket
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public ping(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            await this.coinMarketClient
                .ping()
                .then((data: any) => {
                    if (data.gecko_says) {
                        resolve(true);
                    }
                })
                .catch((err: any) => {
                    logger.error(`Stoa is unable to ping gecko coin market`, {
                        operation: Operation.coin_market_data_sync,
                        height: "",
                        status: Status.Error,
                        responseTime: Number(moment().utc().unix() * 1000),
                    });
                    resolve(false);
                });
        });
    }

    /**
     *  This method fetch the coin market data
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public fetch(): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const marketCap = await this.coinMarketClient.simplePrice({
                ids: "bosagora",
                vs_currencies: "usd",
                include_market_cap: true,
                include_24hr_vol: true,
                include_24hr_change: true,
                include_last_updated_at: true,
            });
            if (marketCap) {
                const coinMarketStat: IMarketCap = {
                    price: marketCap.bosagora.usd,
                    market_cap: marketCap.bosagora.usd_market_cap,
                    vol_24h: marketCap.bosagora.usd_24h_vol,
                    change_24h: marketCap.bosagora.usd_24h_change,
                    last_updated_at: marketCap.bosagora.last_updated_at,
                };
                logger.info(`CoinMarket: Data Fetch Completed at ${marketCap.bosagora.last_updated_at}`, {
                    operation: Operation.coin_market_data_sync,
                    height: "",
                    status: Status.Success,
                    responseTime: Number(moment().utc().unix() * 1000),
                });
                return resolve(coinMarketStat);
            } else {
                logger.error(`Fail to fetch CoinMarket data`, {
                    operation: Operation.coin_market_data_sync,
                    height: "",
                    status: Status.Error,
                    responseTime: Number(moment().utc().unix() * 1000),
                });
                reject(`Fail to fetch CoinMarket data`);
            }
        });
    }

    /**
     * This method recover the coin market data
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public recover(from: number, to: number): Promise<IMarketCap[]> {
        return new Promise<IMarketCap[]>(async (resolve, reject) => {
            const marketCapChartRange = await this.coinMarketClient.coinIdMarketChartRange({
                id: "bosagora",
                vs_currency: "usd",
                from,
                to,
            });
            if (marketCapChartRange) {
                const coinMarketStat: IMarketCap[] = [];
                marketCapChartRange.prices.forEach((price: any, index: number) => {
                    coinMarketStat.push({
                        price: price[1],
                        last_updated_at: price[0],
                        market_cap: marketCapChartRange.market_caps[index][1],
                        vol_24h: marketCapChartRange.total_volumes[index][1],
                    });
                });
                logger.info(`CoinMarket: Data recover Completed: length(${coinMarketStat.length})`, {
                    operation: Operation.coin_market_data_sync,
                    height: "",
                    status: Status.Success,
                    responseTime: Number(moment().utc().unix() * 1000),
                });
                return resolve(coinMarketStat);
            } else {
                logger.error(`Fail to fetch CoinMarket data`, {
                    operation: Operation.coin_market_data_sync,
                    height: "",
                    status: Status.Error,
                    responseTime: Number(moment().utc().unix() * 1000),
                });
                reject(`Fail to fetch CoinMarket data`);
            }
        });
    }
}
