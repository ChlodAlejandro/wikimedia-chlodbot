import Logger from "bunyan";
import bunyanFormat from "bunyan-format";
import {mwn, MwnOptions} from "mwn";
import {USER_AGENT} from "../constants/Constants";
import Timeout = NodeJS.Timeout;
import * as path from "path";
import * as fs from "fs";

/**
 * Manages the mwn instance for one-off tasks.
 */
export default class OneOffTask {

    /** Keeps track of emergency timeouts. */
    static timeouts : Map<mwn, Timeout> = new Map<mwn, NodeJS.Timeout>();
    /** Path of the log folder. */
    static readonly logPath = path.resolve(__dirname, "..", "..", ".logs");

    /**
     * Creates components for a one-off task.
     */
    static async create(taskName: string, mwnOptions?: MwnOptions) : Promise<{ log: Logger, bot: mwn }> {
        if (!fs.existsSync(OneOffTask.logPath)) {
            fs.mkdirSync(OneOffTask.logPath);
        }
        const logFile = path.resolve(
            OneOffTask.logPath,
            taskName
                .replace(/[^a-z0-9]/gi, "-")
                .toLowerCase() + ".log"
        );
        const logFileStream = fs.createWriteStream(
            logFile, { flags: "a", encoding: "utf8" }
        );

        const log = Logger.createLogger({
            name: taskName,
            level: process.env.NODE_ENV === "development" ? 0 : 30,
            stream: process.env.ZOOMIE_RAWLOG ? process.stdout : bunyanFormat({
                outputMode: "long",
                levelInString: true
            }, process.stdout)
        });
        log.addStream({
            level: "trace",
            stream: logFileStream
        });

        if (!process.env.ENWIKI_USERNAME || !process.env.ENWIKI_PASSWORD) {
            log.fatal("Missing username or password");
            process.exit();
        }

        let bot;
        let loginSafetyTimeout;
        await Promise.race([
            new Promise<void>(async (res, rej) => {
                // API connection
                bot = await mwn.init(Object.assign({
                    apiUrl: "https://en.wikipedia.org/w/api.php",

                    username: process.env.ENWIKI_USERNAME,
                    password: process.env.ENWIKI_PASSWORD,

                    userAgent: USER_AGENT,
                    defaultParams: {
                        assert: "user",
                        maxlag: 60
                    },
                    silent: true
                }, mwnOptions)).catch(rej);

                // Enable emergency shutoff
                bot.enableEmergencyShutoff({
                    page: `User:Zoomiebot/${taskName}/shutdown`,
                    intervalDuration: 1000,
                    condition: function (text) {
                        return text === "false";
                    },
                    onShutoff: function () {
                        log.fatal("Shutdown activated! Exiting!!!");
                        process.exit();
                    }
                });
                res();
            }),
            new Promise<void>(async (res, rej) => {
                await new Promise((res) => {
                    loginSafetyTimeout = setTimeout(res, 30000);
                });
                rej(new Error("Failed to log in within 30 seconds."));
            })
        ]).catch((e) => {
            log.fatal("Could not log in.", e);
            process.exit();
        });
        clearTimeout(loginSafetyTimeout);

        log.info("Logged in. Ready to perform one-off task.");

        this.timeouts.set(bot, setTimeout(() => {
            log.warn("One-off task still has not completed after one hour. Something must have gone wrong.");
            log.warn("Triggering emergency destruction. Data might be lost!");
            this.destroy(log, bot);
        }, 3600000));

        return { log, bot };
    }

    /**
     * Destroys the bot instance.
     * @param log The logger instance created by {@link OneOffTask.create()}
     * @param bot The bot instance created by {@link OneOffTask.create()}
     */
    static async destroy(log : Logger, bot : mwn) : Promise<void> {
        const overrunCheck = this.timeouts.get(bot);
        if (overrunCheck)
            clearTimeout(overrunCheck);
        else
            log.warn("The overrun check was not found for this mwn instance.");

        bot.disableEmergencyShutoff();
        await bot.logout();
        log.info("Bot logged out. Exiting...");
    }

}
