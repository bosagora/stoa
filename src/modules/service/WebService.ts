/*******************************************************************************

    The superclass for web service

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { EventDispatcher } from "event-dispatch";
import express from "express";
import http from "http";
import { logger } from "../common/Logger";
import { Operation } from "../common/LogOperation";
import { SocketIO } from "./Socket";

export class WebService {
    /**
     * The bind address
     */
    private readonly address: string;

    /**
     * The bind port
     */
    private readonly port: number;

    /**
     * The bind private port
     */
    private readonly private_port: number;

    /**
     * The application of express module
     */
    protected app: express.Application;

    /**
     * The private application of express module
     */
    protected private_app: express.Application;

    /**
     * The Http server
     */
    protected server: http.Server | null = null;

    /**
     * The Http private server
     */
    protected private_server: http.Server | null = null;

    /**
     * The Event Dispatcher
     */
    protected eventDispatcher: EventDispatcher;

    /**
     * The instance of SocketIO
     */
    protected _socket: SocketIO | null = null;

    /**
     * Constructor
     * @param port The bind port
     * @param private_port The bind private port
     * @param address The bind address
     */
    constructor(port: number | string, private_port: number | string, address?: string) {
        if (typeof port === "string") this.port = parseInt(port, 10);
        else this.port = port;

        if (typeof private_port === "string") this.private_port = parseInt(private_port, 10);
        else this.private_port = private_port;

        if (address !== undefined) this.address = address;
        else this.address = "";

        this.app = express();
        this.private_app = express();
        this.eventDispatcher = new EventDispatcher();
    }

    public get socket(): SocketIO {
        if (this._socket !== null) return this._socket;
        else {
            logger.error("SocketIO is not ready yet.", { operation: Operation.start, height: "", success: false });
            process.exit(1);
        }
    }

    /**
     * Asynchronously start the web server
     */
    public async start(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Create HTTP servers
            this.app.set("port", this.port);
            this.private_app.set("port", this.private_port);
            this.server = http.createServer(this.app);
            this.private_server = http.createServer(this.private_app);
            this.server.on("error", reject);
            this.private_server.on("error", reject);
            this.private_server.listen(this.private_port, this.address, () => {
                logger.info("Listening on Stoa private port : " + this.private_port);
                if (this.server && this.private_server)
                    this.server.listen(this.port, this.address, () => {
                        logger.info("Listening on Stoa port : " + this.port);
                        // Open soketIO
                        if (this.server) this._socket = new SocketIO(this.server);
                        return resolve();
                    });
            });
        });
    }
}
