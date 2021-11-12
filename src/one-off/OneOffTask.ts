import Logger from "bunyan";
import bunyanFormat from "bunyan-format";
import {mwn} from "mwn";
import {USER_AGENT} from "../constants/Constants";

/**
 * Manages the mwn instance for one-off tasks.
 */
export default class OneOffTask {

    /**
     * Creates components for a one-off task.
     */
    static async create(taskName: string) : Promise<{ log: Logger, bot: mwn }> {
        const log = Logger.createLogger({
            name: taskName,
            level: process.env.NODE_ENV === "development" ? 10 : 30,
            stream: bunyanFormat({
                outputMode: "short",
                levelInString: true
            }, process.stdout)
        });

        if (!process.env.ENWIKI_USERNAME || !process.env.ENWIKI_PASSWORD) {
            log.fatal("Missing username or password");
            process.exit();
        }

        let bot;
        await Promise.race([
            new Promise<void>(async (res, rej) => {
                // API connection
                bot = await mwn.init({
                    apiUrl: "https://en.wikipedia.org/w/api.php",

                    username: process.env.ENWIKI_USERNAME,
                    password: process.env.ENWIKI_PASSWORD,

                    userAgent: USER_AGENT,
                    defaultParams: {
                        assert: "user",
                        maxlag: 60
                    },
                    silent: true
                }).catch(rej);

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
                    setTimeout(res, 30000);
                });
                rej(new Error("Failed to log in within 30 seconds."));
            })
        ]).catch((e) => {
            log.fatal("Could not log in.", e);
            process.exit();
        });

        log.info("Logged in. Ready to perform one-off task.");

        setTimeout(() => {
            log.warn("One-off task still has not completed. Something must have gone wrong.");
            log.warn("Triggering emergency destruction. Data might be lost!");
            this.destroy(log, bot);
        }, 3600000);

        return { log, bot };
    }

    /**
     * Destroys the bot instance.
     * @param log The logger instance created by {@link OneOffTask.create()}
     * @param bot The bot instance created by {@link OneOffTask.create()}
     */
    static async destroy(log : Logger, bot : mwn) : Promise<void> {
        bot.disableEmergencyShutoff();
        await bot.logout();
        log.info("Bot logged out. Exiting...");
    }

}
