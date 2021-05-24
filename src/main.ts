import 'source-map-support/register';
import { Config } from './modules/common/Config';
import { logger, Logger } from './modules/common/Logger';
import { BOASodium } from "boa-sodium-ts";
import { SodiumHelper } from "boa-sdk-ts";
import Stoa from './Stoa';
import { CoinMarketService } from './modules/service/CoinMaketService';
import { CoinGeckoMaket } from './modules/coinmarket/coinMarketClient'

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
logger.info(`mysql database host: ${config.database.database}`);

const stoa: Stoa = new Stoa(config.database,
    config.server.agora_endpoint,
    config.server.port,
    config.server.address,
    config.consensus.genesis_timestamp,
    new CoinMarketService(new CoinGeckoMaket())
    );

SodiumHelper.assign(new BOASodium());
SodiumHelper.init()
    .then(
        () => {
            return stoa.createStorage().catch((error:any) =>
            {
                logger.error(`Failed to create LedgerStorage: ${error}`);
                process.exit(1);
            });
        })
    .then(
        () => {
            return stoa.start().catch((error) =>
            {
                // handle specific listen errors with friendly messages
                switch (error.code)
                {
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
            });
        }
    ).catch(
        (error) =>
        {
            logger.error(`Failed to load Sodium library: ${error}`);
            process.exit(1);
        });
