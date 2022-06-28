import {mwn} from "mwn";

/**
 * Transforms a wikitext summary to HTML.
 * @param wiki mwn instance.
 * @param summary The summary to transform
 * @param links The links in the summary. If `true` or undefined, the link exists.
 */
export default function transformWikitextSummary(
    wiki: mwn, summary: string, links?: Record<string, boolean | "redirect">
): string {
    const toInflate: Record<string, string> = {};

    const linkRegex = /\[\[([^{}\[\]]+?)(?:\|([^{}\[\]]+))?]]/g;
    const linkReplacedSummary = summary.replace(linkRegex, (substr, rawLink, rawLinkLabel) => {
        const code = `--#ZB-UNIQ#--${Date.now()}-${Math.random()}#-`;

        const linkName = (new wiki.title(rawLinkLabel ?? rawLink)).getPrefixedText();
        const linkTarget = (new wiki.title(rawLink));
        if (links[linkTarget.getPrefixedText()] !== false) {
            toInflate[code] = `<a href="/wiki/${linkTarget.getPrefixedDb()}">${
                linkName
            }</a>`;
        } else {
            toInflate[code] = `<a href="/w/index.php?title=${
                encodeURIComponent(linkTarget.getPrefixedDb())
            }&action=edit&redlink=1" class="new" title="${linkName} (page does not exist)">${
                linkName
            }</a>`;
        }

        return code;
    });

    let final = linkReplacedSummary
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    for (const [key, value] of Object.entries(toInflate)) {
        final = final.replace(key, value);
    }

    return final;
}
