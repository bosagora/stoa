/*******************************************************************************

    This file contain the Exchange class.

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/
import sgMail from '@sendgrid/mail';
import { ISendgridConfig } from './Config';
import moment from 'moment';
import { logger } from './Logger';
import { Operation, Status } from './LogOperation';
import { HeightManager } from './HeightManager';

/**
 * Mailer class
 */
export class mailService {
    public static config: ISendgridConfig;
    constructor() {
    }

    /**
     * Method for sending emails
     * @param operation Defines operation
     * @param message Defines message
     * @returns Returns the Promise. If it is finished successfully the `.then`
     * of the returned Promise is called with the block height
     * and if an error occurs the `.catch` is called with an error.
     */
    public static async mailer(operation: string, message?: any): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (mailService.config === undefined) {
                logger.info(`Sendgrid API or email not provided`, {
                    operation: Operation.connection,
                    height: HeightManager.height.toString(),
                    status: Status.Error,
                    responseTime: Number(moment().utc().unix() * 1000),
                });
                return resolve();
            }
            const mailOptions = {
                to: mailService.config.receiver_email,
                from: mailService.config.email, // email of the sender
                subject: "Error caught",
                html: `Dear Admin \n\n <br>
                                Error has been occurred while ${operation} on ${moment().utc().toISOString()} . \n\n <br>
                                ${message ? message : ''}
                                `,
            };
            sgMail
                .send(mailOptions).then(() => {
                    return resolve();
                }).catch((err) => {
                    logger.error(`Error While sending Email: ${err}`, {
                        operation: Operation.connection,
                        height: HeightManager.height.toString(),
                        status: Status.Error,
                        responseTime: Number(moment().utc().unix() * 1000),
                    });
                    return reject(`Error While sending Email: ${err}`);
                });
        });
    }
}
