import Zoomiebot from "../Zoomiebot";
import ZoomiebotCache from "./ZoomiebotCache";
import puppeteer, {Browser} from "puppeteer";

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
    static browserCache: Browser;

    /**
     *
     */
    static async getBrowser(): Promise<Browser> {
        if (!this.browserCache) {
            this.browserCache = await puppeteer.launch({
                defaultViewport: {
                    width: 1920,
                    height: 1080
                }
            });
        }

        return this.browserCache;
    }

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
        await this.getBrowser();

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

        const page = await (await this.getBrowser()).newPage();
        try {
            await page.goto(targetURL.toString());
            Zoomiebot.i.log.debug(`[R:${i}] Navigated to page...`);
        } catch (e) {
            Zoomiebot.i.log.error("Could not load page.", e);
            return;
        }

        let targetSelector = mode === "visual"
            ? ".ve-ui-diffElement"
            : "table.diff";

        try {
            await page.waitForFunction(
                (_targetSelector) => {
                    return document.querySelector(_targetSelector) != null;
                },
                {timeout: 20e3},
                targetSelector
            );
        } catch (e) {
            Zoomiebot.i.log.error("Could not find diff element.", e);
            targetSelector = "#content";
        }
        const element = await page.$(targetSelector);

        // Element still not found. Give up.
        if (element == null) {
            return null;
        }

        Zoomiebot.i.log.debug(`[R:${i}] Taking screenshot...`);
        const screenshotImage = Buffer.from(
            await element.screenshot({ type: "png", encoding: "base64" }), "base64"
        );
        await page.close();

        Zoomiebot.i.log.debug(`[R:${i}] Rendered!`);
        BrowserUtils.renderCache.put(cacheKey, screenshotImage);

        return screenshotImage;
    }

}
