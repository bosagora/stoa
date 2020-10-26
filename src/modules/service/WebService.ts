/*******************************************************************************

    The superclass for web service

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import express from 'express';
import http  from 'http' ;
import { logger } from '../common/Logger';

export class WebService
{
    /**
     * The bind address
     */
    private readonly address: string;

    /**
     * The bind port
     */
    private readonly port: number;

    /**
     * The application of express module
     */
    protected app: express.Application;

    /**
     * The Http server
     */
    protected server: http.Server | null = null;

    /**
     * Constructor
     * @param port The bind port
     * @param address The bind address
     */
    constructor (port: number | string, address?: string)
    {
        if (typeof port == "string")
            this.port = parseInt(port, 10);
        else
            this.port = port;

        if (address !== undefined)
            this.address = address;
        else
            this.address = "";

        this.app = express();
    }

    /**
     * Start web server
     *
     * @param callback An optional callback to register as listener
     */
    public start (callback?: Function)
    {
        this.app.set('port', this.port);

        // Create HTTP server.
        this.server = http.createServer(this.app);

        this.server.on('error', (error: any) =>
        {
            // handle specific listen errors with friendly messages
            switch (error.code) {
                case 'EACCES':
                    logger.error(`${this.port} requires elevated privileges`);
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    logger.error(`${this.port} is already in use`);
                    process.exit(1);
                    break;
                default:
                    logger.error(error);
            }
        });

        this.server.on('listening', () =>
        {
            logger.info(`Listening to requests on: ${this.address}:${this.port}`);
        });

        // Listen on provided this.port on this.address.
        this.server.listen(this.port, this.address, () =>
        {
            if (callback !== undefined)
                callback();
        });
    }
}
