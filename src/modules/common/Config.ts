/*******************************************************************************

    Define the configuration objects that are used through the application

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
    All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import { Utils } from '../utils/Utils';

import {ArgumentParser} from 'argparse';
import extend from 'extend';
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
     * Constructor
     */
    constructor ()
    {
        this.server = new ServerConfig();
        this.database = new DatabaseConfig();
        this.logging = new LoggingConfig();
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
            address: "",
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
     * The database file name
     */
    public filename: string;

    /**
     * Constructor
     * @param filename The database file name
     */
    constructor (filename?: string)
    {
        let conf = extend(true, {}, DatabaseConfig.defaultValue());
        extend(true, conf, {filename: filename});
        this.filename = path.resolve(Utils.getInitCWD(), conf.filename);
    }

    /**
     * Reads from Object
     * @param config The object of IDatabaseConfig
     */
    public readFromObject (config: IDatabaseConfig)
    {
        let conf = extend(true, {}, DatabaseConfig.defaultValue());
        extend(true, conf, config);
        this.filename = path.resolve(Utils.getInitCWD(), conf.filename);
    }

    /**
     * Returns default value
     */
    public static defaultValue (): IDatabaseConfig
    {
        return {
            filename: path.resolve(Utils.getInitCWD(), "data/main.db")
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
     * Constructor
     */
    constructor ()
    {
        const defaults = LoggingConfig.defaultValue();
        this.folder = path.resolve(Utils.getInitCWD(), defaults.folder);
        this.level = defaults.level;
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
    }

    /**
     * Returns default value
     */
    public static defaultValue (): ILoggingConfig
    {
        return {
            folder: path.resolve(Utils.getInitCWD(), "logs/"),
            level: "info"
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
     * The database file name
     */
    filename: string;
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
}
