import 'source-map-support/register';
import { Config } from './modules/common/Config';
import { logger, Logger } from './modules/common/Logger';
import Stoa from './Stoa';

import { URL } from 'url';

// Create with the arguments and read from file
let config = Config.createWithArgument();

// Set the folder where the log is stored.
Logger.setFolder(config.logging.folder);

logger.info(`Agora endpoint: ${config.server.agora_endpoint.toString()}`);
logger.info(`sqlite3 database filename: ${config.database.filename}`);

const stoa: Stoa = new Stoa(config.database.filename,
    config.server.agora_endpoint,
    config.server.port,
    config.server.address
    );
stoa.start();
