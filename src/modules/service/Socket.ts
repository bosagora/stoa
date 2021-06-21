import { rejects } from 'assert';
import http from 'http';
import { resolve } from 'path';
import { Socket } from "socket.io";
import Stoa from '../../Stoa';
import { WebService } from './WebService';
import events from '../events/events';

export class SocketIO {

  public io: Socket

  constructor(server: http.Server) {
    this.io = require("socket.io")(server, {
      cors: {
        origin: "*",
        methods: ["GET"],
        allowedHeaders: true,
        credentials: true
      }
    });
  }
}
