/*******************************************************************************

    Test that parse config.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

 *******************************************************************************/

import { Config } from '../src/modules/common/Config';

import appRootPath from 'app-root-path';
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
                "   white_ip_list:",
                "       - ::ffff:127.0.0.1",
                "       - ::ffff:172.17.0.0/16",
                "database:",
                "   filename: database",
                "logging:",
                "   folder: /stoa/logs/",
                "   level: debug",
            ].join("\n");
        let config: Config = new Config();
        config.readFromString(config_content);
        assert.strictEqual(config.server.address, "127.0.0.1");
        assert.strictEqual(config.server.port.toString(), "3838");
        assert.strictEqual(config.server.agora_endpoint.toString(), "http://127.0.0.1:2826");
        assert.deepStrictEqual(config.server.white_ip_list, ['::ffff:127.0.0.1', '::ffff:172.17.0.0/16']);

        assert.strictEqual(config.database.filename, path.resolve(appRootPath.toString(), "database"));

        assert.strictEqual(config.logging.folder, "/stoa/logs");
        assert.strictEqual(config.logging.level, "debug");
    });

    it ('Test parsing the settings of a file', () => {
        let config: Config = new Config();
        config.readFromFile(path.resolve(appRootPath.toString(), "tests/config.example.yaml"));
        assert.strictEqual(config.server.address, "");
        assert.strictEqual(config.server.port.toString(), "3836");
        assert.strictEqual(config.server.agora_endpoint.toString(), "http://127.0.0.1:2826");
        assert.deepStrictEqual(config.server.white_ip_list, ['::ffff:127.0.0.1', '::ffff:172.17.0.0/16']);

        assert.strictEqual(config.database.filename, path.resolve(appRootPath.toString(), "stoa/data/database"));

        assert.strictEqual(config.logging.folder, path.resolve(appRootPath.toString(), "stoa/logs/"));
        assert.strictEqual(config.logging.level, "info");
    });
});
