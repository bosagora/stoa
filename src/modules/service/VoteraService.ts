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
import { VoteraClient } from "../votera/VoteraClient";
import { URL } from "url";
import { IMetaData, IPendingProposal } from "../../Types";
import { logger } from "../common/Logger";
import { Operation } from "../common/LogOperation";
import { HeightManager } from "../common/HeightManager";

export class VoteraService {

    /**
     * The Votera endpoint
     */
    public votera: VoteraClient;

    /**
      * Job to collect Unprocessed Proposals data.
      */
    private job: cron.ScheduledTask | null = null;

    /**
     * Job execution status
     */
    private status: boolean;

    constructor(votera_endpoint: URL) {
        this.votera = new VoteraClient(votera_endpoint)
        this.status = false;
    }

    /**
     * Asynchronously start Proposal Data sync job. Job is scheduled fixed @time interval.
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
     * This method Handles the Proposal data syncing.
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
                    logger.info(`votera proposal data collection job is already running.`);
                    return resolve(true);
                }

                else {
                    logger.info(`***votera proposals data syncing job started***`);
                    this.status = true;
                    const proposal = await stoaInstance.getPendingProposal();
                    await Promise.all(proposal.map(async (element) => {
                        let metadata = await this.getMetadata(element);
                        await this.storeMetadata(stoaInstance, metadata);
                    }));
                    this.status = false;
                    logger.info(`***votera proposals data syncing job completed***`);
                    return resolve(true);
                }
            }
            catch (err) {
                this.status = false;
                resolve(true);
                logger.error(`votera proposals data syncing job started failed Err: ${err}`, {
                    operation: Operation.votera_request,
                    height: HeightManager.height,
                    success: false,
                });
            }
        });

    }

    /**
     * This method gets the metadata of recently received proposals.
     * @param proposal The proposal for which metadata should fetched.
     * @returns IMetaData.
     */
    public async getMetadata(proposal: IPendingProposal): Promise<IMetaData> {
        return new Promise<IMetaData>((resolve, reject) => {
            try {
                this.votera.getProposalData(proposal.proposal_id).then((metadata) => {
                    logger.info(`Data fetched from votera: proposal_id(${proposal.proposal_id})`);
                    resolve(metadata);
                }).catch((err) => {
                    reject(`Failed to request votera for proposal data: proposal_id(${proposal.proposal_id}) Err: ${err}`);
                    logger.error(`Failed to request votera for proposal data: ${err}`, {
                        operation: Operation.votera_request,
                        height: HeightManager.height,
                        success: false,
                    });
                })
            }
            catch (err) {
                reject(`Failed to request votera for proposal data`);
                logger.error(`Failed to request votera for proposal data: proposal_id(${proposal.proposal_id}) Err: ${err}`, {
                    operation: Operation.votera_request,
                    height: HeightManager.height,
                    success: false,
                });
            }
        });
    }

    /**
     * The method store the metadata about the recent proposals.
     * @param stoaInstance Stoa instance.
     * @param metadata IMetaData.
     * @returns 
     */
    public async storeMetadata(stoaInstance: Stoa, metadata: IMetaData): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            try {
                stoaInstance.ledger_storage.putProposalMetaData(stoaInstance.ledger_storage, metadata)
                    .then((data) => {
                        logger.info(`Proposal metadata insertion success: proposal_id(${metadata.proposal_id})`);
                        resolve(true);
                    })
                    .catch((err) => {
                        reject(`Failed to put proposal metadata: proposal_id(${metadata.proposal_id}) Err: ${err}`);
                        logger.error(`Failed to put proposal metadata: proposal_id(${metadata.proposal_id}) Err: ${err}`, {
                            operation: Operation.votera_request,
                            height: HeightManager.height,
                            success: false,
                        });
                    })
            }
            catch (err) {
                reject(`Failed to put proposal metadata: proposal_id(${metadata.proposal_id}) Err: ${err}`);
                logger.error(`Failed to put proposal metadata: proposal_id(${metadata.proposal_id}) Err: ${err} ${err}`, {
                    operation: Operation.votera_request,
                    height: HeightManager.height,
                    success: false,
                });
            }
        });
    }

    /**
     * This method forcefully stops the votera job.
     * @returns 
     */
    public async stop() {
        if (this.job) {
            this.job.stop();
            return;
        } else return;
    }
}
