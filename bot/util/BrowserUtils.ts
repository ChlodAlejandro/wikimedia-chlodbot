import puppeteer, {Browser} from "puppeteer";
import Zoomiebot from "../Zoomiebot";

/**
 * Utilities for doing things with a browser. Helps with rendering HTML, among other things.
 */
export default class BrowserUtils {

    /**
     * Set to true if a browser is currently launching. Prevents `assertBrowser` from
     * being called too fast (which will cause memory usage issues).
     *
     * @private
     */
    private static launching: boolean;

    /**
     * The Puppeteer browser handling this class.
     */
    static browser: Browser;

    /**
     * Ensures that `.browser` is populated with a Puppeteer browser.
     */
    static async assertBrowser(): Promise<void> {
        if (this.launching) {
            await new Promise<void>( (res) => {
                const i = setInterval(() => {
                    if (!this.launching) {
                        res();
                    }
                    clearInterval(i);
                }, 20);
            });
        } else {
            this.launching = true;
        }

        if (this.browser == null || !this.browser.isConnected()) {
            this.browser = await puppeteer.launch();
            Zoomiebot.i.log.info("BrowserUtils started.");
            this.launching = false;
        }
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
        const i = Math.random().toString().substring(2, 8);
        await this.assertBrowser();

        const targetURL = new URL(wikiIndex);

        const mode = options.mode ?? "visual";
        targetURL.searchParams.set("diff", `${to}`);
        targetURL.searchParams.set("diffmode", `${mode}`);
        if (options.from)
            targetURL.searchParams.set("oldid", `${options.from}`);
        Zoomiebot.i.log.debug(`[R:${i}] Rendering diff: ${targetURL.toString()}`);

        const page = await this.browser.newPage();
        await page.goto(targetURL.toString());
        Zoomiebot.i.log.debug(`[R:${i}] Navigated to page...`);

        let targetSelector = mode === "visual"
            ? ".ve-ui-diffElement"
            : "table.diff";

        try {
            await page.waitForSelector(targetSelector, { timeout: 10000 });
        } catch (e) {
            console.error(e);
            targetSelector = "#content";
        }
        const element = await page.$(targetSelector);

        // Element still not found. Give up.
        if (element == null) {
            return null;
        }

        const screenshotImage = await element.screenshot() as Buffer;
        await page.close();

        Zoomiebot.i.log.debug(`[R:${i}] Rendered!`);

        return screenshotImage;
    }

}
