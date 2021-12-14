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
import { Operation, Status } from "../common/LogOperation";
import { SocketIO } from "./Socket";
import moment from "moment";
import https from "https";
import fs from "fs";
import util from "util";

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
     * The ssl certificate
     */
    protected ssl_certificate: string;

    /**
     * The ssl certificate key
     */
    protected ssl_certificate_key: string;

    /**
     * Constructor
     * @param port The bind port
     * @param private_port The bind private port
     * @param address The bind address
     */
    constructor(port: number | string, private_port: number | string, address?: string, ssl_certificate?: string, ssl_certificate_key?: string) {
        if (typeof port === "string") this.port = parseInt(port, 10);
        else this.port = port;

        if (typeof private_port === "string") this.private_port = parseInt(private_port, 10);
        else this.private_port = private_port;

        if (address !== undefined) this.address = address;
        else this.address = "";

        if (ssl_certificate !== undefined) this.ssl_certificate = ssl_certificate;
        else this.ssl_certificate = "";

        if (ssl_certificate_key !== undefined) this.ssl_certificate_key = ssl_certificate_key;
        else this.ssl_certificate_key = "";

        this.app = express();
        this.private_app = express();
        this.eventDispatcher = new EventDispatcher();
    }

    public get socket(): SocketIO {
        if (this._socket !== null) return this._socket;
        else {
            logger.error("SocketIO is not ready yet.", {
                operation: Operation.start,
                height: "",
                status: Status.Error,
                responseTime: Number(moment().utc().unix() * 1000),
            });
            process.exit(1);
        }
    }

    /**
     * Asynchronously start the web server
     */
    public async start(): Promise<void> {
        const readFile = util.promisify(fs.readFile);
        return new Promise<void>(async (resolve, reject) => {
            // Create HTTP servers
            this.app.set("port", this.port);
            this.private_app.set("port", this.private_port);
            if (this.ssl_certificate && this.ssl_certificate_key) {
                const [key, cert] = await Promise.all([
                    readFile(this.ssl_certificate_key),
                    readFile(this.ssl_certificate),
                ]);
                this.server = https.createServer({ key, cert }, this.app);
                logger.info("Enable TLS on stoa");
            } else {
                this.server = http.createServer(this.app);
            }
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
