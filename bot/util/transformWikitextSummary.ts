import {mwn, MwnTitle} from "mwn";

/**
 * Transforms a wikitext summary to HTML.
 * @param wiki mwn instance.
 * @param page The page of this summary.
 * @param summary The summary to transform
 * @param links The links in the summary. If `true` or undefined, the link exists.
 */
export default function transformWikitextSummary(
    wiki: mwn,
    page: string | MwnTitle,
    summary: string,
    links?: Record<string, boolean | "redirect">
): string {
    let finalSummary = summary;
    const pageTitle = typeof page === "string" ? new wiki.title(page) : page;
    const toInflate: Record<string, string> = {};
    let addDirSpan = false;

    // Replace links
    const linkRegex = /\[\[([^{}\[\]]+?)(?:\|([^{}\[\]]+))?]]/g;
    finalSummary = finalSummary.replace(linkRegex, (substr, rawLink, rawLinkLabel) => {
        const code = `--#ZB-UNIQ#--${Date.now()}-${Math.random()}#-`;

        const linkName = rawLinkLabel ?? rawLink;
        const linkTarget = (new wiki.title(rawLink));
        if (links[linkTarget.getPrefixedText()] !== false) {
            toInflate[code] = `<a href="/wiki/${linkTarget.getPrefixedDb()}">${
                linkName
            }</a>`;
        } else {
            toInflate[code] = `<a href="/w/index.php?title=${
                encodeURIComponent(linkTarget.getPrefixedDb())
            }&action=edit&redlink=1" class="new" title="${
                linkTarget.getPrefixedText()
            } (page does not exist)">${
                linkName
            }</a>`;
        }

        return code;
    });

    // Replace sections
    const sectionRegex = /\/\* ?(.+?) ?\*\/(.?)/g;
    finalSummary = finalSummary.replace(sectionRegex, (substr, section, nextChar) => {
        const code = `--#ZB-UNIQ#--${Date.now()}-${Math.random()}#-`;

        toInflate[code] = `<span class="autocomment"><a href="/wiki/${
            pageTitle.getPrefixedDb()
        }#${
            section
                .replace(/ /g, "_")
                .replace(/"/g, "&quot;")
        }" title="${
            pageTitle.getPrefixedText()
        }">\u2192\u200e${
            section
        }</a>${
            !nextChar ? "" : ": "
        }</span>`;

        addDirSpan = true;

        return code;
    });

    // HTML sanitize
    finalSummary = finalSummary
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    for (const [key, value] of Object.entries(toInflate)) {
        finalSummary = finalSummary.replace(key, value);
    }

    return addDirSpan ? `<span dir="auto">${finalSummary}</span>` : finalSummary;
}
