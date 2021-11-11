/*******************************************************************************

    This file contains the implementation of coin market service for boascan.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { JSBI } from "boa-sdk-ts";
import * as cron from "node-cron";
import Stoa from "../../Stoa";
import { IMarketCap, CurrencyType } from "../../Types";
import { HeightManager } from "../common/HeightManager";
import { logger, Logger } from "../common/Logger";
import { Operation, Status } from "../common/LogOperation";
import { Time } from "../common/Time";
import moment from "moment";

export class CoinMarketService {
    /**
     * Market Client i.e CoinGeckoMarket
     */
    private coinMarketClient: any;

    /**
     * Job to collect coin market data
     */
    private job: cron.ScheduledTask | null = null;

    /**
     * Currency array
     */
    private static readonly currency = [CurrencyType.USD, CurrencyType.KRW, CurrencyType.CNY]

    /**
     * Job execution status
     */
    private status: boolean;

    /**
     * constructor
     * @param coinMarketClient i.e CoinGeckoMarket
     */
    constructor(coinMarketClient: any) {
        this.coinMarketClient = coinMarketClient;
        this.status = false;
    }

    /**
     * @param StoaInstance
     * Asynchronously start CoinMarket Data sync service
     */
    public start(stoaInstance: Stoa, time: number = 15): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.job = cron.schedule(`*/${time} * * * * *`, async () => {
                await this.scheduler(stoaInstance);
                resolve(true);
            });
        });
    }

    /**
     * This method performs BOSAGORA coin market cap recovery and handle
     * the execution order of cron job
     * @param stoaInstance
     * @returns
     */
    public scheduler(stoaInstance: Stoa): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            if (this.status === true) return resolve(true);

            const geckoConnection = await this.coinMarketClient.ping();
            if (!geckoConnection) {
                logger.warn(`Hints: either api.coingecko.com is available or check you internet connection`);
                return resolve(true);
            } else {
                this.status = true;
                await Promise.all(await CoinMarketService.currency.map(async (element) => {
                    await stoaInstance.ledger_storage
                        .getCoinMarketcap(element)
                        .then(async (rows: any[]) => {
                            if (rows.length === 0) {
                                await this.recover24hourData(stoaInstance, element);

                            } else {
                                this.coinMarketClient.fetch(element).then(async (data: IMarketCap) => {
                                    await stoaInstance.putCoinMarketStats(data);
                                });
                            }
                        })
                        .catch(async (err: any) => {
                            await this.recover24hourData(stoaInstance, element);
                            this.status = false;
                            return resolve(true);
                        });
                }));
                this.status = false;
                return resolve(true);
            }
        });
    }

    /**
     * @param StoaInstance
     * Asynchronously recover 24 hour CoinMarket Data
     */
    public recover24hourData(stoaInstance: Stoa, currency: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const to = await Time.msToTime(Date.now());
                const from = await JSBI.subtract(JSBI.BigInt(to.seconds), JSBI.BigInt(60 * 60 * 24));
                const dt = new Date(to.seconds * 1000);
                const df = new Date(Number(from.toString()) * 1000);
                logger.info(`Recovering 24 hour coinmarket cap from: ${df} to: ${dt} for ${currency}`, {
                    operation: Operation.coin_market_data_sync,
                    height: HeightManager.height.toString(),
                    status: Status.Success,
                    responseTime: Number(moment().utc().unix() * 1000),
                });
                const marketCap = await this.coinMarketClient.recover(Number(from.toString()), to.seconds, currency);
                await marketCap.forEach(async (element: IMarketCap) => {
                    const time = await Time.msToTime(element.last_updated_at);
                    element.last_updated_at = time.seconds;
                    await stoaInstance.putCoinMarketStats(element);
                });
                resolve(true);
            } catch (err) {
                logger.error(`Failed to 24-hour coin market data recovery: ${err}`, {
                    operation: Operation.coin_market_data_sync,
                    height: HeightManager.height.toString(),
                    status: Status.Error,
                    responseTime: Number(moment().utc().unix() * 1000),
                });
                reject(`Failed to 24-hour coin market data recovery`);
            }
        });
    }

    /*
     * Stop CoinMarket Data sync service
     */
    public async stop() {
        if (this.job) {
            this.job.stop();
            return;
        } else return;
    }
}
