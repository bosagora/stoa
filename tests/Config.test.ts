/*******************************************************************************

    Test that parse config.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

 *******************************************************************************/

import { Config } from '../src/modules/common/Config';
import { Utils } from '../src/modules/utils/Utils';

import * as assert from 'assert';
import path from "path";

describe('Test of Config', () => {
    it ('Test parsing the settings of a string', () => {
        let config_content =
            [
                "server:",
                "   address: 127.0.0.1",
                "   port:    3838",
                "   agora_endpoint: http://127.0.0.1:2826",
                "database:",
                "   filename: database",
                "logging:",
                "   folder: /stoa/logs/",
                "   level: debug",
            ].join("\n");
        let config: Config = new Config(null);
        config.readFromString(config_content);
        assert.strictEqual(config.server.address, "127.0.0.1");
        assert.strictEqual(config.server.port.toString(), "3838");
        assert.strictEqual(config.server.agora_endpoint.toString(), "http://127.0.0.1:2826");

        assert.strictEqual(config.database.filename, path.resolve(Utils.getInitCWD(), "database"));

        assert.strictEqual(config.logging.folder, "/stoa/logs");
        assert.strictEqual(config.logging.level, "debug");
    });

    it ('Test parsing the settings of a file', () => {
        let config: Config = new Config(null);
        config.readFromFile(path.resolve(process.cwd(), "docs/config.example.yaml"));
        assert.strictEqual(config.server.address, "");
        assert.strictEqual(config.server.port.toString(), "3836");
        assert.strictEqual(config.server.agora_endpoint.toString(), "http://127.0.0.1:2826");

        assert.strictEqual(config.database.filename, path.resolve(Utils.getInitCWD(), "stoa/data/database"));

        assert.strictEqual(config.logging.folder, path.resolve(Utils.getInitCWD(), "stoa/logs/"));
        assert.strictEqual(config.logging.level, "info");
    });

    it ('Test config with argument', () => {
        let argument = {
            agora: "http://127.0.0.1:4000/",
            address: "127.0.0.1",
            port: "5000",
            database: "argument-db"
        };
        let config: Config = new Config(argument);
        config.readFromFile(path.resolve(process.cwd(), "docs/config.example.yaml"));
        assert.strictEqual(config.server.address, "127.0.0.1");
        assert.strictEqual(config.server.port.toString(), "5000");
        assert.strictEqual(config.server.agora_endpoint.toString(), "http://127.0.0.1:4000/");
        assert.strictEqual(config.database.filename, path.resolve(Utils.getInitCWD(), "argument-db"));
    });
});
