/*******************************************************************************

    Logging class for Stoa

    Define the output format of Log and support console output
    and file writing, depending on the 'NODE_ENV'.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import path from 'path';
import winston, { config } from 'winston';
import { MongoDB } from 'winston-mongodb';
import { MongoClient } from 'mongodb';
const { combine, timestamp, label, printf, metadata, json } = winston.format;
const logFormat = printf(({ level, message, label, timestamp }) => {
    return `[${label}] ${timestamp} ${level} ${message}`;
});


export class Logger
{
    /**
     * Create the 'default' file transport to be added to a logger
     *
     * Currently our setup only supports one logger and one file output.
     * However, the log folder is configurable, hence the File transport
     * cannot be setup before the config parsing is done.
     *
     * @param folderPath The absolute path to the folder in which to store the file
     * @return A transport that can be passed to `logger.add`
     */
    public static defaultFileTransport (folderPath: string)
    {
        // write log file options
        const options = {
            filename: path.join(folderPath, 'Stoa.log'),
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
        };

        return new winston.transports.File(options);
    }

    /**
     * Create the 'default' console transport to be added to a logger
     *
     * Just like `defaultFileTransport`, this allows to delay logger configuration
     * until after the configuration file parsing is done.
     *
     * @return A transport that can be passed to `logger.add`
     */
    public static defaultConsoleTransport ()
    {
        // console log mode options
        const options = {
            handleExceptions: true,
            json: false,
            colorize: false,
            format: combine(
                label({ label: 'Stoa' }),
                timestamp(),
                logFormat
            )
        };

        return new winston.transports.Console(options);
    }
    /**
    * Create the 'default' database transport to be added to a logger
    *
    *
    * @return A transport that can be passed to `logger.add`
    */
    public static defaultDatabaseTransport(mongodb_url: string) {
        const options = {
            level: 'http',
            db: mongodb_url,
            collection: 'stoa_logs',
            tryReconnect: true,
            format: combine(
                timestamp(),
                json(),
                metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),                
            ),
            options : {useUnifiedTopology: true}
        };
        return new MongoDB(options);
    }
    /**
     * Method build connectivity with logging database.
     * @param mongodb_url 
     * @returns Ture if successfull, and return false if connection issue occers.
     */
    public static async BuildDbConnection(mongodb_url: string) {

        const client = new MongoClient(mongodb_url, {useUnifiedTopology: true});
        try {
            await client.connect();
            return true;
        } catch (err) {
            logger.error(`stoa is unable to build connection for db log. Error:`, err);
            return false;
        }
    }

    public static create () : winston.Logger
    {
        switch (process.env.NODE_ENV) {
            case "test":
                return winston.createLogger({
                    level: "error",
                    transports: [ Logger.defaultConsoleTransport() ],
                });
            case "development":
                return winston.createLogger({
                    level: "debug",
                });
            case "production":
            default:
                return winston.createLogger({
                    level: "info"
                });
        }
    }
}

export const logger : winston.Logger = Logger.create();
