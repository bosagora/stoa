import http from "http";
import { Socket } from "socket.io";

export class SocketIO {
    public io: Socket;

    constructor(server: http.Server) {
        this.io = require("socket.io")(server, {
            cors: {
                origin: "*",
                methods: ["GET"],
                allowedHeaders: true,
                credentials: true,
            },
        });
    }
}
