/*******************************************************************************

    Define the configuration objects that are used through the application

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
    All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import appRootPath from 'app-root-path';
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
        let config_content = fs.readFileSync(path.resolve(appRootPath.toString(), config_file), 'utf8');
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
     * The white IP list for IP-filtering
     */
    public white_ip_list: Array<string>;

    /**
     * Constructor
     * @param address The address to which we bind
     * @param port The port on which we bind
     * @param agora_endpoint The endpoint of Agora
     * @param white_ip_list The white IP list for IP-filtering
     */
    constructor (address?: string, port?: number, agora_endpoint?: string, white_ip_list?: Array<string>)
    {
        let conf = extend(true, {}, ServerConfig.defaultValue());
        extend(true, conf, {address: address, port: port, agora_endpoint: agora_endpoint, white_ip_list: white_ip_list});
        this.address = conf.address;
        this.port = conf.port;
        this.agora_endpoint = conf.agora_endpoint;
        this.white_ip_list = conf.white_ip_list;
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
        this.agora_endpoint = conf.agora_endpoint;
        this.white_ip_list = conf.white_ip_list;
    }

    /**
     * Returns default value
     */
    public static defaultValue (): IServerConfig
    {
        return {
            address: "",
            port: 3836,
            agora_endpoint: new URL("http://127.0.0.1:2826"),
            white_ip_list: ["::ffff:127.0.0.1", "::ffff:172.17.0.0/16"]
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
        this.filename = path.resolve(appRootPath.toString(), conf.filename);
    }

    /**
     * Reads from Object
     * @param config The object of IDatabaseConfig
     */
    public readFromObject (config: IDatabaseConfig)
    {
        let conf = extend(true, {}, DatabaseConfig.defaultValue());
        extend(true, conf, config);
        this.filename = path.resolve(appRootPath.toString(), conf.filename);
    }

    /**
     * Returns default value
     */
    public static defaultValue (): IDatabaseConfig
    {
        return {
            filename: path.resolve(appRootPath.toString(), "stoa/data/Stoa.db")
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
     * @param folder The path of logging files
     * @param level The level of logging
     */
    constructor (folder?: string, level?: string)
    {
        let conf = extend(true, {}, LoggingConfig.defaultValue());
        extend(true, conf, {folder: folder, level: level});
        this.folder = path.resolve(appRootPath.toString(), conf.folder);
        this.level = conf.level;
    }

    /**
     * Reads from Object
     * @param config The object of ILoggingConfig
     */
    public readFromObject (config: ILoggingConfig)
    {
        let conf = extend(true, {}, LoggingConfig.defaultValue());
        extend(true, conf, config);
        this.folder = path.resolve(appRootPath.toString(), conf.folder);
        this.level = conf.level;
    }

    /**
     * Returns default value
     */
    public static defaultValue (): ILoggingConfig
    {
        return {
            folder: path.resolve(appRootPath.toString(), "stoa/logs/"),
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

    /**
     * The white IP list for IP-filtering
     */
    white_ip_list: Array<string>;
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
