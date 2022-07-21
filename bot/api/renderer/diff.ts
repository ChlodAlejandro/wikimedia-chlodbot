import express from "express";
import BrowserUtils from "../../util/BrowserUtils";

const APIRendererDiffParam = <const>["to", "from", "mode"];

/**
 * Renders a diff.
 */
export default async function(req: express.Request, res: express.Response): Promise<void> {
    let {wikiHost, to} = req.params;
    const params = req.query as Record<typeof APIRendererDiffParam[number], string>;

    if (/[^a-z\d.\-]/i.test(wikiHost))
        res.status(400).send("Invalid wiki");
    if (Object.keys(params).some((v) => !(APIRendererDiffParam as readonly string[]).includes(v)))
        res.status(400).send("Unexpected parameter");

    if (to == null) {
        res.status(400).send("No target revision ID given");
    } else {
        if (/\.(png)$/.test(to)) {
            to = to.replace(/\.(png)$/, "");
        }

        if (isNaN(+to)) {
            res.status(400).send("Invalid revision ID given");
        }
    }
    if (params.from && isNaN(+params.from)) {
        res.status(400).send("Invalid `from` revision ID given");
    }

    const wikiURL = new URL(`https://${wikiHost}/w/`);
    if (
        !/(mediawiki|wiki(books|media|news|[mp]edia|quote|source|versity|voyage|data)|wiktionary)\.org$/.test(
            wikiURL.hostname)
    ) {
        res.status(400).send("Invalid wiki");
        return;
    }

    const indexPath = new URL("index.php", wikiURL.href).toString();

    const diffImage = await BrowserUtils.renderVisualDiff(
        indexPath, +to, {
            from: !!params.from && +params.from,
            mode: params.mode === "source" ? "source" : "visual"
        }
    );

    if (diffImage == null) {
        res.status(503).send("Could not generate image");
    } else {
        res.status(200).type("image/png").send(diffImage);
    }
}
