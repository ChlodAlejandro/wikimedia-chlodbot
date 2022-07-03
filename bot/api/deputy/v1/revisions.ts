// noinspection SpellCheckingInspection

import express from "express";
import {ApiResponse} from "mwn";
import Zoomiebot from "../../../Zoomiebot";
import transformWikitextSummary from "../../../util/transformWikitextSummary";

interface RevisionData  {
    revid: number,
    parentid: number,
    minor: boolean,
    user: string,
    timestamp: string,
    size: number,
    comment: string;
    tags: string[];
}

interface MissingRevision {
    revid: number;
    missing?: true;
}

interface ApiQueryRevisionResponse extends ApiResponse {
    query: {
        badrevids?: {
            [key: string]: MissingRevision;
        }
        pages: {
            pageid: number,
            ns: number,
            title: string,
            revisions: RevisionData[]
        }[]
    }
}

interface ExpandedRevision extends RevisionData {
    page: {
        pageid: number,
            ns: number,
            title: string,
    }
    diffsize: number,
        parsedcomment?: string
}

interface MissingRevision {
    revid: number;
    missing?: true;
}

/**
 * Gets Deputy-specific information of a page.
 */
export default async function(req: express.Request, res: express.Response): Promise<void> {
    if (Zoomiebot.enabledWikis[req.params.wiki] == null) {
        res
            .status(400)
            .send({
                error: {
                    code: "zb_unsupported_wiki",
                    info: "Zoomiebot is not configured to handle this wiki."
                }
            });
        return;
    }
    const wiki = Zoomiebot.i.mwn[req.params.wiki as keyof (typeof Zoomiebot)["enabledWikis"]];
    if (!wiki || !wiki.loggedIn) {
        res
            .status(500)
            .send({
                error: {
                    code: "zb_unprepared_wiki",
                    info: "Zoomiebot is not logged into the requested wiki."
                }
            });
        return;
    }

    const requestedRevisions = req.method === "GET"
        ? (req.query["revisions"] as string)
        : (req.body["revisions"] as string);

    if (requestedRevisions == null) {
        res
            .status(400)
            .send({
                error: {
                    code: "zb_missing",
                    info: "No provided revision IDs to get."
                }
            });
        return;
    }
    const revisions = requestedRevisions.split("|");

    if (revisions.some(v => isNaN(+v) || (+v % 1 > 0))) {
        res
            .status(400)
            .send({
                "error": {
                    "code": "zb_invalid_revisions",
                    "info": "The provided revision(s) are not valid integers."
                }
            });
    }

    const mainQueries = await wiki.massQuery({
        "action": "query",
        "format": "json",
        "prop": "revisions",
        "rvprop": "ids|timestamp|flags|comment|user|size|tags",
        "revids": revisions
    }, "revids") as ApiQueryRevisionResponse[];
    const parentRevIds = mainQueries.reduce<number[]>(
        (revisions, response) => {
            if (!response?.query?.pages)
                Zoomiebot.i.log.warn("Unexpected API response: " + JSON.stringify( response ));

            for (const page of response.query.pages) {
                for (const revision of page.revisions) {
                    if (revision.parentid) {
                        revisions.push(revision.parentid);
                    }
                }
            }
            return revisions;
        }, []
    );
    const parentQueries = parentRevIds.length > 0
        ? await wiki.massQuery({
            "action": "query",
            "format": "json",
            "prop": "revisions",
            "rvprop": "ids|size",
            "rvslots": "main",
            "revids": parentRevIds
        }, "revids").then((responses: ApiQueryRevisionResponse[]) =>
            responses.reduce<[number, RevisionData][]>((revisions, response) => {
                if (!response?.query?.pages)
                    Zoomiebot.i.log.warn("Unexpected API response: " + JSON.stringify( response ));

                for (const page of response.query.pages) {
                    for (const revision of page.revisions) {
                        revisions.push([revision.revid, revision]);
                    }
                }
                return revisions;
            }, [])
        ).then((v) => Object.fromEntries(v))
        : [];

    const summaryLinks = [];
    const revisionBank: Record<number, ExpandedRevision | MissingRevision> = {};
    for (const response of mainQueries) {
        // Handle missing/deleted/suppressed revision IDs
        if (response.query.badrevids) {
            for (const revision of Object.values(response.query.badrevids)) {
                revisionBank[revision.revid] = revision;
            }
        }
        for (const page of response.query.pages) {
            for (const revision of page.revisions) {
                revisionBank[revision.revid] = Object.assign(revision, {
                    diffsize: revision.parentid
                        ? revision.size - parentQueries[revision.parentid].size
                        : revision.size,
                    page: {
                        pageid: page.pageid,
                        ns: page.ns,
                        title: page.title
                    }
                });
                if (revision.comment) {
                    const summaryWikitext = new wiki.wikitext(revision.comment);
                    summaryWikitext.parseLinks();
                    summaryLinks.push(
                        ...summaryWikitext.links.map(v => v.target.getPrefixedText()),
                        ...summaryWikitext.categories.map(v => v.target.getPrefixedText()),
                        ...summaryWikitext.files.map(v => v.target.getPrefixedText())
                    );
                }
            }
        }
    }

    const summaryLinkChecks: Record<string, boolean | "redirect"> = {};
    const summaryPageCheckQuery = summaryLinks.length > 0
        ? await wiki.massQuery({
            "action": "query",
            "redirects": 1,
            "titles": summaryLinks,
        }, "titles")
        : [];
    for (const response of summaryPageCheckQuery) {
        if (!response?.query?.pages)
            Zoomiebot.i.log.warn("Unexpected API response: " + JSON.stringify( response ));

        if (response.query.redirects) {
            for (const redirect of response.query.redirects) {
                summaryLinkChecks[redirect.from] = "redirect";
            }
        }
        for (const page of response.query.pages) {
            summaryLinkChecks[page.title] = !page.missing;
        }
    }

    for (const revision of Object.values(revisionBank)) {
        if ((revision as any).comment == null)
            continue;
        (revision as any).parsedcomment =
            transformWikitextSummary(
                wiki,
                (revision as ExpandedRevision).page.title,
                (revision as ExpandedRevision).comment,
                summaryLinkChecks
            );
    }

    res
        .status(200)
        .send({
            version: 1,
            revisions: revisionBank
        });
}
