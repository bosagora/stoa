import path from "path";
import { Config } from "../src/modules/common/Config";

export let MockDBConfig = () => {
    let config: Config = new Config();
    config.readFromFile(path.resolve(process.cwd(), "docs/config.example.yaml"));
    return {
        host: config.database.host,
        database: config.database.database,
        password: config.database.password,
        user: config.database.user,
        port: config.database.port,
        multipleStatements: true,
    };
};

export let MockAdminConfig = () => {
    let config: Config = new Config();
    config.readFromFile(path.resolve(process.cwd(), "docs/config.example.yaml"));
    return {
        apiKey: config.admin.apiKey,
        email: config.admin.email,
    };
};
