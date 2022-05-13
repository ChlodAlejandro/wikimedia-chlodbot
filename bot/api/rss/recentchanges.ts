// noinspection CssInvalidHtmlTagReference

import axios from "axios";
import express from "express";
import cheerio from "cheerio";
import {zoomiebotPackage} from "../../Zoomiebot";
import TurndownService from "turndown";

import pretty from "pretty";

/**
 * Expands the usual RecentChanges RSS feed with more details.
 */
export default async function(req: express.Request, res: express.Response): Promise<void> {
    const { wiki } = req.params;
    const params = req.query;

    if (/[^a-z\d.\-]/i.test(wiki))
        res.status(400).send("Invalid wiki");
    if (Object.keys(params).some((v) => ![
        "namespace", "invert", "associated", "days", "limit", "from",
        "hideminor", "hidebots", "hideanons", "hideliu", "hidepatrolled",
        "hidemyself", "hidecategorization", "tagfilter", "target",
        "showlinkedto"
    ].includes(v)))
        res.status(400).send("Unexpected parameter.");

    const wikiURL = new URL(`https://${wiki}/w/`);
    if (
        !/(mediawiki|wiki(books|media|news|[mp]edia|quote|source|versity|voyage|data)|wiktionary)\.org$/.test(wikiURL.hostname)
    ) {
        res.status(400).send("Invalid wiki");
        return;
    }

    const apiPath = new URL("api.php", wikiURL.href).href;
    const indexPath = new URL("index.php", wikiURL.href).href;

    const feed = (await axios(apiPath, {
        params: Object.assign(
            params,
            {
                action: "feedrecentchanges",
                feedformat: "rss"
            }
        ),
        responseType: "text"
    }));
    const $ = cheerio.load(feed.data, {
        xmlMode: true
    });

    /**
     * Parse wikitext into Markdown.
     *
     * @param revId Revision ID to use.
     * @param wikitext Wikitext to parse.
     */
    function parseWikitext(revId, wikitext) {
        let parsed = wikitext;

        let sectionMatch;
        const sectionMatcher = /\/\*\*?\s*(.+?)\s*\*\*?\//gi;
        while ((sectionMatch = sectionMatcher.exec(wikitext)) != null) {
            const section = sectionMatch[1].replace(/ /g, "_").replace(/\{\{.+?}}/, "");
            parsed = parsed.replace(sectionMatch[0],
                `[\u2192${sectionMatch[1]}](https://en.wikipedia.org/wiki/${
                    typeof revId === "number" ? `Special:Diff/${revId}` : revId
                }#${section}):`
            );
        }

        let linkMatch;
        const linkMatcher = /\[\[(.+?)(?:\|(.+?))?]]/gi;
        while ((linkMatch = linkMatcher.exec(wikitext)) != null) {
            const url = linkMatch[1].replace(/ /g, "_");
            parsed = parsed.replace(linkMatch[0],
                `[${
                    linkMatch[2] ?? linkMatch[1]
                }](https://en.wikipedia.org/wiki/${url})`
            );
        }

        return parsed.replace(/:$/, "");
    }

    const $rss = $("rss");
    $rss.attr("xmlns:zbrss", "https://zoomiebot.toolforge.org/api/rss/recentchanges");
    const $generator = $("rss generator");
    $generator.text(`${$generator.text()}; Zoomiebot ${zoomiebotPackage.version}`);

    const turndown = new TurndownService();

    const diffsToPull = [];
    const logsToPush = [];
    $("item > guid").each((i, el) => {
        const diffId = /diff=(\d+)/.exec($(el).text());
        if (diffId != null && diffId[1] != null)
            // Diff action
            diffsToPull.push(diffId[1]);
        else {
            const parent = $(el).parent();
            // Log action
            logsToPush.push({
                title: parent.children("title").text(),
                link: parent.children("link").text(),
                guid: parent.children("guid").text(),
                description: parent.children("description").text(),
                descriptionMarkdown: turndown.turndown(
                    parent.children("description").text()
                        .replace(
                            /<(\/?(no(?:wiki|include)|includeonly|onlyinclude))>/gi,
                            "&lt;$1&gt;"
                        )
                ),
                pubDate: parent.children("pubDate").text(),
                creator: parent.children("dc\\:creator").text()
            });
        }
    });

    // Clear all items
    $("item").remove();

    // Pull diff data from Wikipedia API.
    const revs: {
        query: { pages: {
            title: string,
            ns: number,
            pageid: number,
            thumbnail: string,
            revisions: any[]
        }[] }
    } = await axios.get(apiPath, {
        responseType: "json",
        params: {
            action: "query",
            format: "json",
            prop: "revisions|pageimages",
            revids: diffsToPull.join("|"),
            rvprop: "ids|timestamp|flags|comment|user",
            pithumbsize: 2000
        }
    }).then(r => r.data);

    const items = [];

    for (
        const rev of Object.values(revs["query"]["pages"]).reduce((p, n) => {
            for (const rev of n.revisions) {
                rev.title = n.title;
                rev.ns = n.ns;
                rev.pageid = n.pageid;
                rev.thumbnail = n.thumbnail;
            }
            p.push(...n.revisions);
            return p;
        }, [])
    ) {
        const escapedTitle = rev.title.replace(/ /g, "_");
        const escapedUsername = rev.user.replace(/ /g, "_");
        const parsedDescription = parseWikitext(rev.revid, rev.comment);

        let item = "<item>";

        item += `<title>${rev.title}</title>`;
        item += `<link>${indexPath}?diff=${rev.revid}&oldid=${rev.parentid}</link>`;
        item += `<guid isPermaLink="false">${indexPath}?diff=${rev.revid}&oldid=${rev.parentid}</guid>`;
        item += `<description>${rev.comment}</description>`;
        item += `<pubDate>${(new Date(rev.timestamp)).toUTCString()}</pubDate>`;
        item += `<dc:creator>${rev.user}</dc:creator>`;
        if (rev.thumbnail)
            item += `<zbrss:image>${
                rev.thumbnail.source
            }</zbrss:image>`;
        item += "<zbrss:type>diff</zbrss:type>";
        item += `<zbrss:eventid>${rev.revid}</zbrss:eventid>`;
        item += `<zbrss:description>${
            parsedDescription.length > 0 ? parsedDescription : "*No summary.*"
        }</zbrss:description>`;
        item += `<zbrss:userpage>${indexPath}?title=User:${
            escapedUsername
        }</zbrss:userpage>`;
        item += `<zbrss:usertalk>${indexPath}?title=User_talk:${
            escapedUsername
        }</zbrss:usertalk>`;
        item += `<zbrss:usercontribs>${indexPath}?title=Special:Contributions/${
            escapedUsername
        }</zbrss:usercontribs>`;
        item += `<zbrss:page>${indexPath}?title=${escapedTitle}</zbrss:page>`;
        item += `<zbrss:title>${escapedTitle}</zbrss:page>`;
        item += "</item>";

        items.push({ item: item, time: (new Date(rev.timestamp)).getTime() });
    }

    for (const log of logsToPush) {
        const escapedTitle = log.title.replace(/ /g, "_");
        const escapedUsername = log.creator.replace(/ /g, "_");

        let item = "<item>";

        item += `<title>${log.title}</title>`;
        item += `<link>${log.link}</link>`;
        item += `<guid isPermaLink="false">${log.guid}</guid>`;
        item += `<description>${log.comment}</description>`;
        item += `<pubDate>${log.pubDate}</pubDate>`;
        item += `<dc:creator>${log.creator}</dc:creator>`;
        item += "<zbrss:type>log</zbrss:type>";
        item += `<zbrss:description>${
            log.descriptionMarkdown
        }</zbrss:description>`;
        item += `<zbrss:userpage>${indexPath}?title=User:${
            escapedUsername
        }</zbrss:userpage>`;
        item += `<zbrss:usertalk>${indexPath}?title=User_talk:${
            escapedUsername
        }</zbrss:usertalk>`;
        item += `<zbrss:usercontribs>${indexPath}?title=Special:Contributions/${
            escapedUsername
        }</zbrss:usercontribs>`;
        item += `<zbrss:page>${indexPath}?title=${escapedTitle}</zbrss:page>`;
        item += `<zbrss:title>${escapedTitle}</zbrss:page>`;
        item += "</item>";

        items.push({ item: item, time: (new Date(log.pubDate)).getTime() });
    }
    items.sort((a, b) => {
        return b.time - a.time;
    });
    $rss.append(items.map(v => v.item).join("\n"));

    res.type(feed.headers["content-type"] || "text/plain");
    res.send(pretty($.xml().replace(/\n{2,}/g, "\n")));

}
