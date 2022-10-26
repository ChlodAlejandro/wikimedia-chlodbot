import {Builder, By, WebDriver} from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import firefox from "selenium-webdriver/firefox";
import Zoomiebot from "../Zoomiebot";
import ZoomiebotCache from "./ZoomiebotCache";
import Pool from "./Pool";

/**
 *
 */
class DriverSet extends Pool<WebDriver> {

    /**
     *
     */
    create(): Promise<WebDriver> | WebDriver {
        const browser = ( process.env.BROWSER || "firefox" ).toLowerCase();
        const size = { width: 1920, height: 1080 };

        const chromeOpts = new chrome.Options()
            .windowSize( size );
        const firefoxOpts = new firefox.Options()
            .windowSize( size );

        if ( ![ "0", "false", "no", "" ].includes( process.env.HEADLESS?.toLowerCase() ) ) {
            chromeOpts.headless();
            firefoxOpts.headless();
        }

        return new Builder()
            .setChromeOptions( chromeOpts )
            .setFirefoxOptions( firefoxOpts )
            .forBrowser( browser )
            .build();
    }

}

/**
 * Utilities for doing things with a browser. Helps with rendering HTML, among other things.
 */
export default class BrowserUtils {

    /**
     * Stores rendered images for caching. Automatically pruned.
     */
    static renderCache: ZoomiebotCache = new ZoomiebotCache();
    /**
     *
     */
    static browserCache: DriverSet = new DriverSet();

    /**
     * Renders a diff given some settings
     *
     * @param wikiIndex The index URL of the wiki
     * @param to The revision ID to render.
     * @param options Extra options
     */
    static async renderVisualDiff(
        wikiIndex: string,
        to: number,
        options: { from?: number, mode?: "visual" | "source" } = {}
    ): Promise<Buffer> {
        const i = Math.random().toString().substring(2, 8);

        const targetURL = new URL(wikiIndex);

        const mode = options.mode ?? "visual";
        targetURL.searchParams.set("diff", `${to}`);
        targetURL.searchParams.set("diffmode", `${mode}`);
        if (options.from)
            targetURL.searchParams.set("oldid", `${options.from}`);

        const cacheKey = `browserUtils::diffRender++${
            Buffer.from(targetURL.toString()).toString("base64")
        }`;
        if (BrowserUtils.renderCache.has(cacheKey)) {
            Zoomiebot.i.log.debug(`[R:${i}] Cache hit!`);
            return BrowserUtils.renderCache.get<Buffer>(cacheKey);
        } else {
            Zoomiebot.i.log.debug(`[R:${i}] Rendering diff: ${targetURL.toString()}`);
        }

        const browser = await BrowserUtils.browserCache.getFree();
        try {
            await browser.navigate().to(targetURL.toString());
            Zoomiebot.i.log.debug(`[R:${i}] Navigated to page...`);
        } catch (e) {
            Zoomiebot.i.log.error("Could not load page.", e);
            return;
        }

        let targetSelector = mode === "visual"
            ? ".ve-ui-diffElement"
            : "table.diff";

        try {
            await browser.wait(() => {
                return browser.executeScript(
                    "return document.querySelector(arguments[0]) != null",
                    targetSelector
                );
            }, 20e3);
        } catch (e) {
            Zoomiebot.i.log.error("Could not find diff element.", e);
            targetSelector = "#content";
        }
        const element = await browser.findElement(By.js(
            `return document.querySelector("${targetSelector}")`
        ));

        // Element still not found. Give up.
        if (element == null) {
            return null;
        }

        Zoomiebot.i.log.debug(`[R:${i}] Taking screenshot...`);
        const screenshotImage = Buffer.from(
            await element.takeScreenshot(true), "base64"
        );
        BrowserUtils.browserCache.setFree( browser );

        Zoomiebot.i.log.debug(`[R:${i}] Rendered!`);
        BrowserUtils.renderCache.put(cacheKey, screenshotImage);

        return screenshotImage;
    }

}
