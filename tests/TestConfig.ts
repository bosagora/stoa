
import { Config } from '../src/modules/common/Config';
import path from "path";

export let MockDBConfig =( )=>{
    let config: Config = new Config();
    config.readFromFile(path.resolve(process.cwd(), "docs/config.example.yaml"));
    return { 
            host : config.database.host,
            database : config.database.database,
            password : config.database.password,
            user : config.database.user,
            multipleStatements :true,
       }
}