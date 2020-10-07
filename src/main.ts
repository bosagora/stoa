import 'source-map-support/register';
import { logger } from './modules/common/Logger';
import Stoa from './Stoa';

import { ArgumentParser } from "argparse";
import express from 'express';
import { URL } from 'url';

// Parse the arguments
const parser = new ArgumentParser();
parser.add_argument('-a', '--agora', { help: "The endpoint of Agora" });
parser.add_argument('--address', { help: "The address to which we bind to Stoa" });
parser.add_argument('-p', '--port', { help: "The port on which we bind to Stoa" });
parser.add_argument('-d', '--database', { help: "The file name of sqlite3 database" });
let args = parser.parse_args();

const address: string = args.address || "0.0.0.0";
const port: number = Number(args.port || "3836");
const agora_address: URL = new URL(args.agora || "http://127.0.0.1:2826");
const database_filename: string = args.database || "database";
logger.info(`Using Agora located at: ${agora_address.hostname}: ${agora_address.port}`);
logger.info(`The address to which we bind to Stoa: ${address}`);
logger.info(`The port to which we bind to Stoa: ${port}`);
logger.info(`The file name of sqlite3 database: ${database_filename}`);
const stoa: express.Application = new Stoa(database_filename, agora_address.hostname, agora_address.port).stoa;

stoa.listen(port, address, () => logger.info(`Listening to requests on: ${address}:${port}`))
.on('error', err => logger.error(err));
