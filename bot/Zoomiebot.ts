import fs from "fs";
import path from "path";
import Logger from "bunyan";
import bunyanFormat from "bunyan-format";
import express from "express";
import * as net from "net";
import { mwn } from "mwn";
import {USER_AGENT} from "./constants/Constants";
import compression from "compression";
import api from "./api";
import BrowserUtils from "./util/BrowserUtils";

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const zoomiebotPackage = require("../package.json");

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
     * List of wikis that this bot is enabled on.
     */
    static readonly enabledWikis = <const>{
        "enwiki": "https://en.wikipedia.org/w/api.php"
    };
    /**
     * Allowed origins for CORS requests.
     */
    static readonly allowedOrigins = Object.values(Zoomiebot.enabledWikis)
        .map((url) => new URL(url).origin);

    /**
     * The Zoomiebot log. Logs to the bot `.logs` folder and stdout.
     */
    log: Logger;
    /**
     * The bot mwn instances.
     */
    mwn: Partial<Record<keyof (typeof Zoomiebot)["enabledWikis"], mwn>> = {};
    /**
     * The Express instance that handles HTTP requests.
     */
    app: express.Express;
    /**
     * The Express instance that handles API HTTP requests.
     */
    apiRouter: express.Router;
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
     * Log into a wiki. This will be put in the `mwn` variable.
     * @param wiki
     */
    async wikiLogin(wiki: keyof (typeof Zoomiebot)["enabledWikis"]): Promise<void> {
        this.mwn[wiki] = await mwn.init({
            apiUrl: Zoomiebot.enabledWikis[wiki],

            username: process.env[`${wiki.toUpperCase()}_USERNAME`],
            password: process.env[`${wiki.toUpperCase()}_PASSWORD`],

            userAgent: USER_AGENT,
            defaultParams: {
                maxlag: 60,

                format: "json",
                formatversion: "2",
                utf8: 1,
            },
            silent: true
        });
    }

    /**
     * Automatically wraps an Express route function with a catcher in the event that
     * an exception remains uncaught.
     */
    apiRoute(route: (req: express.Request, res: express.Response) => Promise<void>)
        : (req: express.Request, res: express.Response) => Promise<void> {
        return (req, res) => {
            if (req.headers.origin && Zoomiebot.allowedOrigins.includes(req.headers.origin)) {
                res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
            }

            return route(req, res).catch((err) => {
                this.log.error(err);
                res
                    .status(500)
                    .send({
                        error: {
                            code: "zb_internal_error",
                            info: "Internal server error: " + err.message
                        }
                    });
            });
        };
    }

    /**
     * Starts Zoomiebot.
     */
    async start(): Promise<void> {
        this.setupLogger();
        this.log.info(`Zoomiebot v${zoomiebotPackage.version} is starting...`);

        // We log the client in now than later in order to immediately die in the
        // event that some provided credentials fail to log in.
        this.log.info("Logging into wikis...");
        await Promise.all(
            Object.keys(Zoomiebot.enabledWikis).map(
                (wiki) => this.wikiLogin(wiki as keyof (typeof Zoomiebot)["enabledWikis"])
            )
        );

        this.app = express();
        this.app.use((req, res, next) => {
            this.log.debug(`${req.method} [${req.ip}] ${req.path}`);
            next();
        });
        this.app.use(compression());
        this.app.use(express.json());
        this.app.use(express.urlencoded());
        this.app.get("/", (req, res) => {
            res.type("text/plain");
            res.send("Zoomiebot is running!");
        });

        this.apiRouter = express.Router();
        this.apiRouter.get("/rss/recentchanges/:wikiHost", this.apiRoute(api.rss.recentchanges));

        this.apiRouter.get("/renderer/diff/:wikiHost/:to", this.apiRoute(api.renderer.diff));

        this.apiRouter.all("/deputy/revisions/:wiki", this.apiRoute(api.deputy.latest.revisions));
        this.apiRouter.all("/deputy/v1/revisions/:wiki", this.apiRoute(api.deputy.v1.revisions));

        this.app.use("/api", this.apiRouter);
        this.server = this.app.listen(process.env.PORT ?? 8001, () => {
            this.log.info(`Server started on port ${process.env.PORT ?? 8001}.`);
        });

        // Do some post-startup activities that can take a while.
        // Wrapped in a closure to prevent the "missing await for async" warning.

        // Startup BrowserUtils
        (() => {
            BrowserUtils.assertBrowser();
        })();
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

process.on("uncaughtException", (err) => {
    Zoomiebot.i.log.error("Uncaught exception: " + err.message, err);
});
process.on("unhandledRejection", (err) => {
    Zoomiebot.i.log.error("Unhandled rejection.", err);
});

process.once("SIGINT", function () {
    // noinspection JSIgnoredPromiseFromCall
    Zoomiebot.i.stop();
});
process.once("SIGTERM", function () {
    // noinspection JSIgnoredPromiseFromCall
    Zoomiebot.i.stop();
});
