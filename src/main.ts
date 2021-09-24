import { SodiumHelper } from "boa-sdk-ts";
import { BOASodium } from "boa-sodium-ts";
import { CoinGeckoClient } from "coingecko-api-v3";
import "source-map-support/register";
import { CoinGeckoMarket } from "./modules/coinmarket/CoinGeckoMarket";
import { Config } from "./modules/common/Config";
import { logger, Logger } from "./modules/common/Logger";
import { Operation, Status } from "./modules/common/LogOperation";
import { CoinMarketService } from "./modules/service/CoinMarketService";
import { VoteraService } from "./modules/service/VoteraService";
import { Storages } from "./modules/storage/Storages";
import Stoa from "./Stoa";
import moment, { months } from "moment";

// Create with the arguments and read from file
const config = Config.createWithArgument();

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
        if (config.logging.console) logger.add(Logger.defaultConsoleTransport());
        if (config.logging.database) {
            Logger.BuildDbConnection(config.logging.mongodb_url).then((connection) => {
                if (connection) logger.add(Logger.defaultDatabaseTransport(config.logging.mongodb_url));
            });
        }
}
logger.transports.forEach((tp) => {
    tp.level = config.logging.level;
});

logger.info(`Agora endpoint: ${config.server.agora_endpoint.toString()}`, {
    operation: Operation.connection,
    height: "",
    status: Status.Success,
    responseTime: Number(moment().utc().unix() * 1000),
});
logger.info(`mysql database host: ${config.database.database}`, {
    operation: Operation.connection,
    height: "",
    status: Status.Success,
    responseTime: Number(moment().utc().unix() * 1000),
});

const stoa: Stoa = new Stoa(
    config.database,
    config.server.agora_endpoint,
    config.server.port,
    config.server.private_port,
    config.server.address,
    config.consensus.genesis_timestamp,
    config.consensus.validator_cycle,
    config.server.require_votera && config.votera ? new VoteraService(config.votera.votera_endpoint) : undefined,
    new CoinMarketService(
        new CoinGeckoMarket(
            new CoinGeckoClient({
                timeout: 10000,
                autoRetry: true,
            })
        )
    )
);

if (!SodiumHelper.isAssigned()) SodiumHelper.assign(new BOASodium());
SodiumHelper.init()
    .then(async () => {
        await Storages.waiteForConnection(config.database);
        return stoa.createStorage().catch((error: any) => {
            logger.error(`Failed to create LedgerStorage: ${error}`, {
                operation: Operation.start,
                height: "",
                status: Status.Error,
                responseTime: Number(moment().utc().unix() * 1000),
            });
            process.exit(1);
        });
    })
    .then(() => {
        return stoa.start().catch((error) => {
            // handle specific listen errors with friendly messages
            switch (error.code) {
                case "EACCES":
                    logger.error(`${config.server.port} requires elevated privileges`, {
                        operation: Operation.start,
                        height: "",
                        status: Status.Error,
                        responseTime: Number(moment().utc().unix() * 1000),
                    });
                    break;
                case "EADDRINUSE":
                    logger.error(`Port ${config.server.port} is already in use`, {
                        operation: Operation.start,
                        height: "",
                        status: Status.Error,
                        responseTime: Number(moment().utc().unix() * 1000),
                    });
                    break;
                default:
                    logger.error(`An error occured while starting the server: ${error.stack}`, {
                        operation: Operation.start,
                        height: "",
                        status: Status.Error,
                        responseTime: Number(moment().utc().unix() * 1000),
                    });
            }
            process.exit(1);
        });
    })
    .catch((error) => {
        logger.error(`Failed to load Sodium library: ${error}`, {
            operation: Operation.start,
            height: "",
            status: Status.Error,
            responseTime: Number(moment().utc().unix() * 1000),
        });
        process.exit(1);
    });
