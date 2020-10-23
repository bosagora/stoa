/*******************************************************************************

    Logging class for Stoa

    Define the output format of Log and support console output
    and file writing, depending on the 'NODE_ENV'.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Utils } from '../utils/Utils';

import path from 'path';
import winston from 'winston';

const { combine, timestamp, label, printf } = winston.format;
const logFormat = printf(({ level, message, label, timestamp }) => {
  return `[${label}] ${timestamp} ${level} ${message}`;
});


export class Logger
{
    public static folder: string = path.resolve(Utils.getInitCWD(), 'stoa/logs/');

    public static setFolder(folder: string)
    {
        Logger.folder = folder;
    }

    public static create () : winston.Logger
    {
        const options = {
            // write log file options
            file: {
                filename: path.join(Logger.folder, 'Stoa.log'),
                handleExceptions: true,
                json: false,
                maxsize: 10485760, // 10MB
                maxFiles: 10,
                colorize: false,
                format: combine(
                    label({ label: 'Stoa' }),
                    timestamp(),
                    logFormat
                )
            },
            // console log mode options
            console: {
                handleExceptions: true,
                json: false,
                colorize: false,
                format: combine(
                    label({ label: 'Stoa' }),
                    timestamp(),
                    logFormat
                )
            }
        };

        switch (process.env.NODE_ENV) {
            case "test":
                return winston.createLogger({
                    silent: true,
                });
            case "development":
                return winston.createLogger({
                    level: "debug",
                    transports: [
                        new winston.transports.Console(options.console)
                    ],
                });
            case "production":
            default:
                return winston.createLogger({
                    level: "info",
                    transports: [
                        new winston.transports.File(options.file)
                    ],
                });
        }
    }
}

export const logger : winston.Logger = Logger.create();
