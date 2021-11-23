/*******************************************************************************

    This file contains the implementation of data collection service from votera.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as cron from "node-cron";
import Stoa from "../../Stoa";
import { NodeClient } from "../nodeClient/NodeClient";
import { URL } from "url";
import { logger } from "../common/Logger";
import { Operation, Status } from "../common/LogOperation";
import { HeightManager } from "../common/HeightManager";
import moment from "moment";
import { INodeInformation } from "../../Types";

export class NodeService {

    /**
     * The Node endpoint
     */
    public node: NodeClient;

    /**
      * Job to collect Unprocessed Proposals data.
      */
    private job: cron.ScheduledTask | null = null;

    /**
     * Job execution status
     */
    private status: boolean;

    constructor(node_endpoint: URL) {
        this.node = new NodeClient(node_endpoint)
        this.status = false;
    }

    /**
     * Asynchronously start node info sync job. Job is scheduled fixed @time interval.
     * @param StoaInstance
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
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
     * This method Handles the node information syncing.
     * The execution order of cron job. 
     * @param stoaInstance Instance of stoa.
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called and if an error occurs the `.catch`
     * is called with an error.
     */
    public scheduler(stoaInstance: Stoa): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.status === true) {
                    logger.info(`node info collection job is already running.`);
                    return resolve(true);
                }
                else {
                    logger.info(`***node data syncing job started***`, {
                        operation: Operation.db,
                        height: HeightManager.height.toString(),
                        status: Status.Success,
                        responseTime: Number(moment().utc().unix() * 1000)
                    });
                    this.status = true;
                    const nodes = await this.node.getNodeInfo();
                    Promise.all(nodes.map(async (elem: INodeInformation) => {
                        await stoaInstance.ledger_storage.putNodeInfo(elem)
                    }));
                    this.status = false;
                    logger.info(`***node data syncing job completed***`, {
                        operation: Operation.votera_request,
                        height: HeightManager.height.toString(),
                        status: Status.Success,
                        responseTime: Number(moment().utc().unix() * 1000)
                    });
                    return resolve(true);
                }
            }
            catch (err) {
                this.status = false;
                resolve(true);
                logger.error(`node information syncing job started failed Err: ${err}`, {
                    operation: Operation.db,
                    height: HeightManager.height,
                    status: Status.Error,
                });
            }
        });

    }

    /**
     * This method forcefully stops the node job.
     * @returns 
     */
    public async stop() {
        if (this.job) {
            this.job.stop();
            return;
        } else return;
    }
}
