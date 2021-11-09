/*******************************************************************************

     The functions to provide real-time events to wallet clients are included.
     The type of real-time event is when a block is created and
     when a transaction of a specific address occurs.

    Copyright:
        Copyright (c) 2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Hash, Height, JSBI } from "boa-sdk-ts";

import { Socket } from "socket.io";

/**
 * The information of wallet's client
 */
interface WalletClientInfo {
    /**
     * The client socket
     */
    socket: Socket;

    /**
     * The latest received ping time
     */
    latest_ping_time: number;
}

/**
 * A class that optionally delivers real-time events to only one client who subscribed.
 * The type of real-time event is when a block is created and
 * when a transaction of a specific address occurs.
 */
export class WalletWatcherIO {
    /**
     * Subscription table.
     * @private
     */
    private tables: Map<string, Socket[]> = new Map<string, Socket[]>();

    /**
     * A map of records the time when each client receives the final message.
     * @private
     */
    private ping: Map<string, WalletClientInfo> = new Map<string, WalletClientInfo>();

    /**
     * Timer to check the status of the client socket.
     * @private
     */
    private checkTimer: any;

    constructor() {
        this.createCheckTimer();
    }

    /**
     * Create a timer to check the status of the client socket.
     */
    public createCheckTimer() {
        if (this.checkTimer !== undefined) clearInterval(this.checkTimer);
        this.checkTimer = setInterval(this.checkConnection.bind(this), 60 * 1000);
    }

    /**
     * Destroy a timer to check the status of the client socket.
     */
    public destroyCheckTimer() {
        if (this.checkTimer !== undefined) clearInterval(this.checkTimer);
    }

    public onClientConnected(client_socket: Socket) {
        this.ping.set(client_socket.id, { socket: client_socket, latest_ping_time: new Date().getTime() });

        client_socket.on("subscribe", (data: { address: string }) => {
            this.ping.set(client_socket.id, { socket: client_socket, latest_ping_time: new Date().getTime() });
            const values = this.tables.get(data.address);
            if (values === undefined) this.tables.set(data.address, [client_socket]);
            else {
                if (values.find((m) => m === client_socket) === undefined) values.push(client_socket);
            }
        });

        client_socket.on("unsubscribe", (data: { address: string }) => {
            this.ping.set(client_socket.id, { socket: client_socket, latest_ping_time: new Date().getTime() });
            const values = this.tables.get(data.address);
            if (values !== undefined) {
                const found = values.findIndex((m) => m === client_socket);
                if (found >= 0) values.splice(found, 1);
            }
        });

        client_socket.on("ping", (data: any) => {
            this.ping.set(client_socket.id, { socket: client_socket, latest_ping_time: new Date().getTime() });
        });

        client_socket.on("disconnect", () => {
            this.tables.forEach((values, key) => {
                const found_idx = values.findIndex((m) => m === client_socket);
                if (found_idx >= 0) values.splice(found_idx, 1);
            });
        });
    }

    /**
     * When the account's UTXO is consumed, an event occurs
     */
    public onTransactionAccountCreated(address: string, tx_hash: Hash, type: string) {
        const sockets = this.tables.get(address);
        if (sockets !== undefined) {
            for (const client of sockets) {
                try {
                    client.emit("new_tx_acc", { address, tx_hash: tx_hash.toString(), type });
                } catch (e) {
                    //
                }
            }
        }
    }

    /**
     * Remove the client who doesn't send any message for 1 minutes.
     */
    public checkConnection() {
        const defective_socket_ids: Socket[] = [];
        const now = new Date().getTime();
        this.ping.forEach((info, key) => {
            if (now - info.latest_ping_time > 60 * 1000) defective_socket_ids.push(info.socket);
        });

        defective_socket_ids.forEach((socket) => {
            this.ping.delete(socket.id);
            this.tables.forEach((sockets, key) => {
                const found_idx = sockets.findIndex((m) => m === socket);
                if (found_idx >= 0) sockets.splice(found_idx, 1);
            });

            try {
                socket.disconnect();
            } catch (e) {
                //
            }
        });
    }
}
