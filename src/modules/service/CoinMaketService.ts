/*******************************************************************************

    This file cotain implementation of coin market service for boascan. 

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { logger, Logger } from '../common/Logger';
import * as cron from "node-cron";
import Stoa from "../../Stoa";
import { IMarketCap } from "../../Types";
import { CoinGeckoMaket } from '../coinmarket/coinMarketClient';

export class CoinMarketService {
    /**
     * Market Client i.e CoinGeckoMaket
     */
    private coinMarketClient: any;

    /**
     * Job to collect coin market data 
     */
    private job: cron.ScheduledTask | null = null;

    /**
     * constructor
     * @param coinMarketClient i.e CoinGeckoMaket
     */
    constructor(coinMarketClient: any) {
        this.coinMarketClient = coinMarketClient;
    }
    /**
     * @param StoaInstance 
     * Asynchronously start CoinMarket Data sync service
     */
    public start(stoaInstance: Stoa, time: number = 15): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.job = cron.schedule(`*/${time} * * * * *`, async () => {
                this.coinMarketClient.ping().then(() => {
                    logger.info(`CoinMarket: Fetching Job Stated`);
                    this.coinMarketClient.fetch().then(async (data: IMarketCap) => {
                        await stoaInstance.putCoinMarketStats(data);
                        resolve(true);
                    }).catch((err: any) => {
                        this.recover(stoaInstance);
                        reject(err);
                    });
                }).catch((err: any) => {
                    this.recover(stoaInstance);
                    reject(err);
                });
            })
        });
    }
    /**
     * @param StoaInstance 
     * Asynchronously recover CoinMarket Data
     */
    public recover(stoaInstance: Stoa): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            stoaInstance.ledger_storage.getCoinMarketcap().then(async (rows: any) => {
                if (rows[0]) {
                    // TODO : Yet to define
                    resolve(true)
                }
                else {
                    
                }

            }).catch((err) => {
                logger.error("Failed to recover data: " + err);
            })
        });
    }
    /*
    * Stop CoinMarket Data sync service
    */
    public async stop() {
        if (this.job)
            await this.job.stop();
    }
}
