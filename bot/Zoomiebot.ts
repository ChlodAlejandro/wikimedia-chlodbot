import fs from "fs";
import path from "path";
import Logger from "bunyan";
import bunyanFormat from "bunyan-format";
import express from "express";
import * as net from "net";

/**
 * Zoomiebot's continuous process. Handles Node-processed web requests,
 * etc.
 */
export default class Zoomiebot {

    /**
     * The only instance of Zoomiebot.
     */
    private static _i = new Zoomiebot();
    /**
     * Get the Zoomiebot singleton instance.
     */
    static get i(): Zoomiebot {
        return Zoomiebot._i;
    }

    /**
     * The path to the log folder.
     */
    static readonly logPath = path.resolve(__dirname, "..", ".logs");

    /**
     * The Zoomiebot log. Logs to the bot `.logs` folder and stdout.
     */
    log: Logger;
    /**
     * The Express instance that handles HTTP requests.
     */
    app: express.Express;
    /**
     * The `net.Server` that takes in HTTP requests. This passes requests to `app`.
     */
    server: net.Server;

    /**
     * Set up the bunyan logger.
     */
    setupLogger(): void {
        if (!fs.existsSync(Zoomiebot.logPath)) {
            fs.mkdirSync(Zoomiebot.logPath);
        }
        const logFile = path.resolve(Zoomiebot.logPath, "zoomiebot.log");
        const logFileStream = fs.createWriteStream(
            logFile, { flags: "a", encoding: "utf8" }
        );

        this.log = Logger.createLogger({
            name: "Zoomiebot",
            level: process.env.NODE_ENV === "development" ? 10 : 30,
            stream: process.env.ZOOMIE_RAWLOG ? process.stdout : bunyanFormat({
                outputMode: "long",
                levelInString: true
            }, process.stdout)
        });
        this.log.addStream({
            level: "trace",
            stream: logFileStream
        });
    }

    /**
     * Starts Zoomiebot.
     */
    async start(): Promise<void> {
        this.setupLogger();
        this.log.info("Zoomiebot is starting...");

        this.app = express();
        this.app.get("*", (req, res) => {
            res.type("text/plain");
            res.send("Zoomiebot is running!");
        });

        this.server = this.app.listen(process.env.PORT ?? 8001, () => {
            this.log.info(`Server started on port ${process.env.PORT ?? 8001}.`);
        });
    }

    /**
     * Stops Zoomiebot.
     */
    async stop(): Promise<void> {
        this.log.info("Stopping...");
        this.server.close();
    }

}

// noinspection JSIgnoredPromiseFromCall
Zoomiebot.i.start();

process.once("SIGINT", function () {
    // noinspection JSIgnoredPromiseFromCall
    Zoomiebot.i.stop();
});
process.once("SIGTERM", function () {
    // noinspection JSIgnoredPromiseFromCall
    Zoomiebot.i.stop();
});
