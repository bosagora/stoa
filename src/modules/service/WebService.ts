/*******************************************************************************

    The superclass for web service

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import express from 'express';
import http  from 'http' ;
import { SocketIO } from '../service/Socket'
import { EventDispatcher } from 'event-dispatch';

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
     * The Event Dispatcher 
     */
    protected  eventDispatcher : EventDispatcher;

    /**
     * Connection
     * @param port 
     * @param address 
     */
    protected socket : SocketIO
    
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
        this.eventDispatcher = new EventDispatcher();
        this.socket = new SocketIO(http.createServer(this.app));
    }

    /**
     * Asynchronously start the web server
     */
    public async start (): Promise<void>
    {
        this.app.set('port', this.port);

        // Listen on provided this.port on this.address.
        return new Promise<void>((resolve, reject) => {
            // Create HTTP server.
            this.server = http.createServer(this.app);
            this.socket = new SocketIO(this.server);
            this.server.on('error', reject);
            this.server.listen(this.port, this.address, () => {
                resolve();
            });
        });
    }
}
