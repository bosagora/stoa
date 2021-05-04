/*******************************************************************************

    Define the configuration objects that are used through the application

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
    All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Utils } from 'boa-sdk-ts';

import {ArgumentParser} from 'argparse';
import extend from 'extend';
import ip from 'ip';
import fs from "fs";
import path from 'path';
import { URL } from 'url';
import yaml from 'js-yaml';

/**
 * Main config
 */
export class Config implements IConfig
{
    /**
     * Server config
     */
    public server: ServerConfig;

    /**
     * Database config
     */
    public database: DatabaseConfig;

    /**
     * Logging config
     */
    public logging: LoggingConfig;

    /**
     * Consensus config
     */
    public consensus: ConsensusConfig;

    /**
     * Constructor
     */
    constructor ()
    {
        this.server = new ServerConfig();
        this.database = new DatabaseConfig();
        this.logging = new LoggingConfig();
        this.consensus = new ConsensusConfig();
    }

    /**
     * Reads from file
     * @param config_file The file name of configuration
     */
    public readFromFile (config_file: string)
    {
        let config_content = fs.readFileSync(path.resolve(Utils.getInitCWD(), config_file), 'utf8');
        this.readFromString(config_content);
    }

    /**
     * Reads from string
     * @param config_content The content of configuration
     */
    public readFromString (config_content: string)
    {
        const cfg = yaml.safeLoad(config_content) as IConfig;
        this.server.readFromObject(cfg.server);
        this.database.readFromObject(cfg.database);
        this.logging.readFromObject(cfg.logging);
        this.consensus.readFromObject(cfg.consensus);
    }

    /**
     * Parses the command line arguments, Reads from the configuration file
     */
    public static createWithArgument (): Config
    {
        // Parse the arguments
        const parser = new ArgumentParser();
        parser.add_argument('-c', '--config', {
            default: "config.yaml",
            help: "Path to the config file to use",
        });
        let args = parser.parse_args();

        const configPath = path.resolve(Utils.getInitCWD(), args.config);
        if (!fs.existsSync(configPath)) {
            console.error(`Config file '${configPath}' does not exists`);
            process.exit(1);
        }

        let cfg = new Config();
        try
        {
            cfg.readFromFile(configPath);
        }
        catch (error)
        {
            // Logging setup has not been completed and is output to the console.
            console.error(error.message);

            // If the process fails to read the configuration file, the process exits.
            process.exit(1);
        }
        return cfg;
    }
}

/**
 * Server config
 */
export class ServerConfig implements IServerConfig
{
    /**
     * THe address to which we bind
     */
    public address: string;

    /**
     * The port on which we bind
     */
    public port: number;

    /**
     * The endpoint of Agora
     */
    public agora_endpoint: URL;

    /**
     * Constructor
     * @param address The address to which we bind
     * @param port The port on which we bind
     * @param agora_endpoint The endpoint of Agora
     */
    constructor (address?: string, port?: number, agora_endpoint?: string)
    {
        let conf = extend(true, {}, ServerConfig.defaultValue());
        extend(true, conf, {address: address, port: port, agora_endpoint: agora_endpoint});

        if (!ip.isV4Format(conf.address) && !ip.isV6Format(conf.address))
        {
            console.error(`${conf.address}' is not appropriate to use as an IP address.`);
            process.exit(1);
        }

        this.address = conf.address;
        this.port = conf.port;
        this.agora_endpoint = conf.agora_endpoint;
    }

    /**
     * Reads from Object
     * @param config The object of IServerConfig
     */
    public readFromObject (config: IServerConfig)
    {
        let conf = extend(true, {}, ServerConfig.defaultValue());
        extend(true, conf, config);

        if (!ip.isV4Format(conf.address) && !ip.isV6Format(conf.address))
        {
            console.error(`${conf.address}' is not appropriate to use as an IP address.`);
            process.exit(1);
        }
        this.address = conf.address;
        this.port = conf.port;
        this.agora_endpoint = conf.agora_endpoint;
    }

    /**
     * Returns default value
     */
    public static defaultValue (): IServerConfig
    {
        return {
            address: "127.0.0.1",
            port: 3836,
            agora_endpoint: new URL("http://127.0.0.1:2826")
        }
    }
}

/**
 * Database config
 */
export class DatabaseConfig implements IDatabaseConfig
{
    /**
     * The host of mysql
     */
    host: string

    /**
     * The user of mysql
     */
    user: string

    /**
     * The pasword of mysql
     */
    password: string

    /**
     * The database name
     */
    database?: string

    /**
     * The host database port
     */
    port: number

    /** 
     * multiple Statements exec config
    */

    multipleStatements: boolean
    
    /**
     * Constructor
     * @param host Mysql database host
     * @param user Mysql database user
     * @param password Mysql database password
     * @param database Mysql database name
     * @param multipleStatements Mysql allow multiple statement to execute (true / false)
     */
    constructor(host?: string, user?: string, password?: string, database?: string, port?: number, multipleStatements?: boolean
    ) {
        let conf = extend(true, {}, DatabaseConfig.defaultValue());
        extend(true, conf, { host: host, user: user, password: password, database: database, port : port, multipleStatements: multipleStatements });
        this.host = conf.host;
        this.user = conf.user;
        this.password = conf.password;
        this.database = conf.database;
        this.port = conf.port;
        this.multipleStatements = conf.multipleStatements;
    }

    /**
     * Reads from Object
     * @param config The object of IDatabaseConfig
     */
    public readFromObject (config: IDatabaseConfig)
    {
        let conf = extend(true, {}, DatabaseConfig.defaultValue());
        extend(true, conf, config);
        this.host = conf.host;
        this.user = conf.user;
        this.password = conf.password;
        this.database = conf.database;
        this.port = conf.port;
        this.multipleStatements = conf.multipleStatements;
    }

    /**
     * Returns default value
     */
    public static defaultValue (): IDatabaseConfig
    {
        return {
            host: 'localhost',
            user: 'root',
            password: '12345678',
            database: 'boascan',
            port:3306,
            multipleStatements: true,
        }
    }
}

/**
 * Logging config
 */
export class LoggingConfig implements ILoggingConfig
{
    /**
     * The path of logging files
     */
    public folder: string;

    /**
     * The level of logging
     */
    public level: string;

    /**
     * Whether the console is enabled as well
     */
    public console: boolean;

    /**
     * Constructor
     */
    constructor ()
    {
        const defaults = LoggingConfig.defaultValue();
        this.folder = path.resolve(Utils.getInitCWD(), defaults.folder);
        this.level = defaults.level;
        this.console = defaults.console;
    }

    /**
     * Reads from Object
     * @param config The object of ILoggingConfig
     */
    public readFromObject (config: ILoggingConfig)
    {
        if (config.folder)
            this.folder = path.resolve(Utils.getInitCWD(), config.folder);
        if (config.level)
            this.level = config.level;
        if (config.console !== undefined)
            this.console = config.console;
    }

    /**
     * Returns default value
     */
    public static defaultValue (): ILoggingConfig
    {
        return {
            folder: path.resolve(Utils.getInitCWD(), "logs/"),
            level: "info",
            console: false
        }
    }
}

/**
 * Consensus config
 */
export class ConsensusConfig implements IConsensusConfig
{
    /**
     * The genesis timestamp
     */
    public genesis_timestamp: number;

    /**
     * Constructor
     * @param genesis_timestamp The genesis timestamp
     */
    constructor ()
    {
        const defaults = ConsensusConfig.defaultValue();
        this.genesis_timestamp = defaults.genesis_timestamp;
    }

    /**
     * Reads from Object
     * @param config The object of IConsensusConfig
     */
    public readFromObject (config: IConsensusConfig)
    {
        let conf = extend(true, {}, ConsensusConfig.defaultValue());
        extend(true, conf, config);
        this.genesis_timestamp = conf.genesis_timestamp;
    }

    /**
     * Returns default value
     */
    public static defaultValue (): IConsensusConfig
    {
        return {
            genesis_timestamp: 1609459200,
        }
    }
}

/**
 * The interface of server config
 */
export interface IServerConfig
{
    /**
     * THe address to which we bind
     */
    address: string;

    /**
     * The port on which we bind
     */
    port: number;

    /**
     * The endpoint of Agora
     */
    agora_endpoint: URL;
}

/**
 * The interface of database config
 */
export interface IDatabaseConfig
{
    /**
     * The host of mysql
     */
    host: string
    /**
     * The user of mysql
     */
    user: string
    /**
     * The pasword of mysql
     */
    password: string
    /**
     * The database name
     */
    database?: string
    /**
     * The host database port
     */
     port: number
    /** 
     * Multiple Statements execution statement Option
     */
    multipleStatements: boolean
}

/**
 * The interface of logging config
 */
export interface ILoggingConfig
{
    /**
     * The path of logging files
     */
    folder: string;

    /**
     * The level of logging
     */
    level: string;

    /**
     * Whether the console is enabled as well
     */
    console: boolean;
}

/**
 * The interface of consensus config
 */
export interface IConsensusConfig
{
    /**
     * The genesis timestamp
     */
    genesis_timestamp: number;
}

/**
 * The interface of main config
 */
export interface IConfig
{
    /**
     * Server config
     */
    server: IServerConfig;

    /**
     * Database config
     */
    database: IDatabaseConfig;

    /**
     * Logging config
     */
    logging: ILoggingConfig;

    /**
     * Consensus config
     */
    consensus: IConsensusConfig;
}
