import mysql from "mysql2/promise";
import ini from "ini";
import * as fs from "fs";
import path from "path";
import Logger from "bunyan";
import * as os from "os";

interface SQLConfiguration {
    client: {
        host?: string;
        port?: string;
        user: string;
        password: string;
        database?: string;
    }
}

/**
 * Check if file exists before reading, returns null if it does not exist.
 */
async function tryRead(path : string) : Promise<Buffer> | null {
    if (path == null) return null;
    return fs.existsSync(path) ? fs.promises.readFile(path) : null;
}

/**
 * Creates a connection and loads in the Toolforge replica.my.cnf file
 * by default, unless overridden by $SQL_CONFIG.
 *
 * If `database` begins with a colon (`:`), this will connect to a
 * user database on the Tools DB. The database needs to exist prior
 * to execution. Otherwise, this will connect to a Wiki database
 * replica. The `_p` suffix is implicit - this can be removed but
 * will be added anyways.
 */
export default async function createConnection(
    log: Logger,
    database : string,
    analytics = true
) : Promise<mysql.Connection> {
    log.debug("Parsing configuration file...");
    const HOME = os.homedir();
    const configRaw = (
        (process.env.SQL_CONFIG ? await tryRead(path.resolve(process.env.SQL_CONFIG)) : null)
        ?? await tryRead(path.resolve(HOME, "replica.my.cnf"))
        ?? await tryRead(path.resolve(HOME, ".my.cnf"))
    ).toString();
    const configParsed = ini.parse(configRaw) as SQLConfiguration;

    if (
        configParsed.client == null
        || configParsed.client.user == null
        || configParsed.client.password == null
    )
        log.error("Parsed SQL configuration file is INVALID.");
    const config = configParsed.client;

    const toolsDB = database.startsWith(":");
    if (toolsDB)
        database = database.substring(1);
    else
        database = database.replace(/_p$/, "");
    const actualDatabase = toolsDB ? config.user + "__" + database : database + "_p";

    const host = config.host ?? toolsDB ? "tools.db.svc.wikimedia.cloud"
        : `${database}.${analytics ? "analytics" : "web"}.db.svc.wikimedia.cloud`;
    log.debug(`Connecting to host: ${host}`);
    log.debug(`Target database: ${actualDatabase}`);

    const sqlConfig = {
        host: host,
        user: config.user,
        password: config.password,
        port: +config.port || 3306,
        database: actualDatabase
    };

    try {
        const connection = await mysql.createConnection(sqlConfig);

        log.info(`Connected to database "${
            actualDatabase
        }" on ${
            toolsDB ? "Tools DB" : "Wiki Replicas"
        }. Running version ${
            (await connection.query("SELECT Version() AS Version"))[/* rows */ 0]["Version"]
        }`);

        return connection;
    } catch (e) {
        log.error("Could not connect to SQL database!", e);
    }
}
