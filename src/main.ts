import 'source-map-support/register';
import { Config } from './modules/common/Config';
import { logger, Logger } from './modules/common/Logger';
import Stoa from './Stoa';

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
        if (config.logging.console)
            logger.add(Logger.defaultConsoleTransport());
}
logger.transports.forEach((tp) => { tp.level = config.logging.level });

logger.info(`Agora endpoint: ${config.server.agora_endpoint.toString()}`);
logger.info(`sqlite3 database filename: ${config.database.filename}`);

const stoa: Stoa = new Stoa(config.database.filename,
    config.server.agora_endpoint,
    config.server.port,
    config.server.address
    );

stoa.createStorage().then(() => {
    stoa.start().then(() => {
        logger.info(`Listening to requests on: ${config.server.address}:${config.server.port}`);
    }).catch((error) => {
        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                logger.error(`${config.server.port} requires elevated privileges`);
                break;
            case 'EADDRINUSE':
                logger.error(`Port ${config.server.port} is already in use`);
                break;
            default:
                logger.error(`An error occured while starting the server: ${error.stack}`);
        }
        process.exit(1);
    })
}).catch((error) => {
    logger.error(`Failed to create LedgerStorage: ${error}`);
    process.exit(1);
});
