import 'source-map-support/register';
import { Config } from './modules/common/Config';
import { logger, Logger } from './modules/common/Logger';
import Stoa from './Stoa';

import { URL } from 'url';

// Create with the arguments and read from file
let config = Config.createWithArgument();

// Now configure the logger with the expected transports
switch (process.env.NODE_ENV) {
    case "test":
        // Logger is silent, do nothingg
        break;

    case "development":
        // Only use the console log
        logger.add(Logger.defaultConsoleTransport());
        break;

    case "production":
    default:
        // Read the config file and potentially use both
        logger.add(Logger.defaultFileTransport(config.logging.folder));
}

logger.info(`Agora endpoint: ${config.server.agora_endpoint.toString()}`);
logger.info(`sqlite3 database filename: ${config.database.filename}`);

const stoa: Stoa = new Stoa(config.database.filename,
    config.server.agora_endpoint,
    config.server.port,
    config.server.address
    );
stoa.start();
