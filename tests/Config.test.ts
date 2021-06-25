/*******************************************************************************

    Test that parses config.

    Copyright:
        Copyright (c) 2020-2021 BOSAGORA Foundation
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

 *******************************************************************************/

import { Config } from "../src/modules/common/Config";

import * as assert from "assert";

describe("Test of Config", () => {
    it("Test parsing the settings of a string", () => {
        let config_content = [
            "server:",
            "   address: 127.0.0.1",
            "   port:    3838",
            "   agora_endpoint: http://127.0.0.1:2826",
            "database:",
            "   host : 127.0.0.1",
            "   user : root",
            "   database : stoa",
            "   password : 12345678",
            "   port : 3306",
            "logging:",
            "   folder: /stoa/logs/",
            "   level: debug",
            "consensus:",
            "   genesis_timestamp: 1609459200",
        ].join("\n");
        let config: Config = new Config();
        config.readFromString(config_content);
        assert.strictEqual(config.server.address, "127.0.0.1");
        assert.strictEqual(config.server.port.toString(), "3838");
        assert.strictEqual(config.server.agora_endpoint.toString(), "http://127.0.0.1:2826");
        assert.strictEqual(config.database.host, "127.0.0.1");
        assert.strictEqual(config.database.user, "root");
        assert.strictEqual(config.database.database, "stoa");
        assert.strictEqual(config.database.port.toString(), "3306");
        assert.strictEqual(config.database.password.toString(), "12345678");
        assert.strictEqual(config.logging.folder, "/stoa/logs");
        assert.strictEqual(config.logging.level, "debug");
        assert.strictEqual(config.consensus.genesis_timestamp, 1609459200);
    });
});
