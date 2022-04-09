import OneOffTask from "./OneOffTask";
import {buildCode, findCycloneNumber, PAGASADocument, PagasaScraper} from "pagasa-archiver";
import iajs from "@chlodalejandro/iajs";
import * as fs from "fs";
import cheerio from "cheerio";
import path from "path";
import axios, {AxiosResponse} from "axios";
import {USER_AGENT} from "../constants/Constants";
import FormData from "form-data";

interface ItemMetadata {
    mediatype: string;
    collection: string[];
    creator: string;
    date: string;
    description: string;
    language: string;
    licenseurl: string;
    subject: string[];
    title: string;
}

/**
 * Generates Internet Archive metadata for a storm.
 */
function generateMetadata(tcb : PAGASADocument) : ItemMetadata {
    const [year, stormNo] = findCycloneNumber(tcb.name);
    const month = year !== new Date().getFullYear() ? 12 : (new Date()).getMonth() + 1;
    const name = tcb.name[0].toUpperCase() + tcb.name.substr(1).toLowerCase();
    return {
        mediatype: "texts",
        collection: ["opensource"],
        creator: "Philippine Atmospheric, Geophysical and Astronomical Services Administration",
        date: `${year}-${month < 10 ? `0${month}` : month}`,
        description: fs.readFileSync(
            path.resolve(__dirname, "..", "..", "assets", "PagasaArchiver-desc.html")
        ).toString()
            .replace(/{{{name}}}/g, name)
            .replace(/{{{year}}}/g, `${year}`)
            .replace(/\r?\n/g, ""),
        language: "eng",
        licenseurl: "http://creativecommons.org/publicdomain/mark/1.0/",
        subject: [
            "typhoon",
            "tropical cyclone",
            "tropical cyclone warning",
            "severe weather bulletin",
            "tropical cyclone advisory",
            "PAGASA",
            "Philippines",
            `${year} pacific typhoon season`
        ],
        title: `PAGASA Tropical Cyclone Bulletins for Tropical Cyclone ${
            name
        }, ${
            year.toString().substr(2)
        }-TC${
            stormNo < 10 ? `0${stormNo}` : stormNo
        }`
    };
}

/**
 * Enable when testing.
 */
const READ_ONLY = false;

export default (async () => {
    const { log, bot } = await OneOffTask.create("PAGASA Archiver");

    if (process.env.IA_S3_ACCESS_KEY == null || process.env.IA_S3_SECRET_KEY == null) {
        log.fatal("Missing Internet Archive S3-like API access or secret key.");
        await OneOffTask.destroy(log, bot);
        process.exit(1);
    }

    log.info("Grabbing current bulletins...");
    const TCBs = await PagasaScraper.listTCBs();

    const years : Set<number> = new Set();
    const stormTCBs : Record<string, PAGASADocument[]> = {};
    for (const tcb of TCBs) {
        const stormNumber = findCycloneNumber(tcb.name);

        if (stormNumber[1] === 0) {
            log.debug(`Detected storm does not have a valid name (${
                tcb.name
            }). Skipping...`);
        }

        const stormIdentifier = `pagasa-${stormNumber[0].toString().substr(2)}-TC${
            stormNumber[1] < 10 ? `0${stormNumber[1]}` : stormNumber[1]
        }`;

        if (stormTCBs[stormIdentifier] == null) {
            log.info(`Found storm: ${stormIdentifier} (${tcb.name})`);
            stormTCBs[stormIdentifier] = [];
        }
        log.debug(`Found TCB #${tcb.count} for ${stormIdentifier}.`);
        stormTCBs[stormIdentifier].push(tcb);
        years.add(stormNumber[0]);
    }

    if (TCBs.length == 0) {
        log.info("No documents to archive.");
        log.info("Done.");
        await OneOffTask.destroy(log, bot);
    }

    const auth = await iajs.Auth.fromS3(process.env.IA_S3_ACCESS_KEY, process.env.IA_S3_SECRET_KEY);
    if (auth.values.screenname == null) {
        log.fatal("Invalid Internet Archive S3-like API access or secret key.");
        await OneOffTask.destroy(log, bot);
        process.exit(1);
    } else {
        log.info(`Logged into Internet Archive (screenname: ${auth.values.screenname})`);
    }

    let uploadedFiles = 0;

    // Check if item exists
    for (const identifier in stormTCBs) {
        log.info(`Archiving ${identifier}...`);
        const metadata = await iajs.MetadataAPI.get({ identifier, auth });
        const notUploaded = Object.keys(metadata).length === 0;

        for (const tcb of stormTCBs[identifier]) {
            const code = buildCode(tcb);
            const filename = `${code}.pdf`;

            // Check if file already uploaded
            if (!notUploaded && metadata.files.some(v => v.name === filename)) {
                log.debug(`${filename} already uploaded, skipping...`);
            } else {
                // Not yet uploaded.
                try {
                    const downloaded: AxiosResponse<Buffer> =
                        await PagasaScraper.downloadTCB(tcb.file, {responseType: "arraybuffer"});
                    log.debug("TCB downloaded from PAGASA.");
                    if (!READ_ONLY)
                        await iajs.S3API.upload({
                            identifier,
                            key: encodeURIComponent(filename),
                            body: downloaded.data,
                            autocreate: true,
                            wait: true,
                            keepOldVersions: false,
                            metadata: {...generateMetadata(tcb)},
                            headers: {
                                "x-archive-interactive-priority": 1,
                                "x-archive-size-hint": downloaded.data.byteLength,
                            },
                            auth
                        });
                    uploadedFiles++;
                    log.info(`Uploaded new file: ${filename}`);
                } catch (e) {
                    log.error(`Failed to download and archive bulletin: ${e.message}`, e);
                }
            }
        }
    }

    if (uploadedFiles > 0 || true) {
        // Get Parsoid page
        for (const year of years) {
            let pageExists : boolean = true;

            log.debug(`Grabbing Parsoid HTML (${year})...`);
            const $ = await axios(
                new URL(
                    encodeURIComponent(`User:Zoomiebot/Archives/PAGASA/${year}`),
                    "https://en.wikipedia.org/api/rest_v1/page/html/"
                ).toString(),
                {
                    responseType: "text"
                }
            )
                .then(r => cheerio.load(r.data))
                .catch(e => {
                    if (e.response && e.response.status === 404) {
                        pageExists = false;
                        return cheerio.load(`<section data-mw-section-id=\"0\">
                            <ul></ul>
                        </section>`);
                    }
                    throw e;
                });

            const existingStorms : Record<string, {
                e: cheerio.Element,
                mw: any,
                t: any
            }> = {};

            // noinspection JSJQueryEfficiency
            let list = $("ul");
            if (list.length === 0) {
                $("[data-mw-section-id=\"0\"]").append("<ul></ul>");
                list = $("ul");
            }

            list.find("[data-mw]").each((i, e) => {
                try {
                    const mw = JSON.parse($(e).attr("data-mw"));
                    for (const part of mw.parts) {
                        if (
                            typeof part === "object"
                            && part.template != null
                            && part.template.target.wt.startsWith("User:Zoomiebot/Archives/PAGASA/Entry")
                            && part.template.params.designation?.wt != null
                        ) {
                            existingStorms[part.template.params.designation.wt] = {
                                e, mw, t: part.template
                            };
                        }
                    }
                } catch {}
            });

            const matchingStorms = Object.keys(stormTCBs).filter(v => v.startsWith(`pagasa-${
                year.toString().substr(2)
            }`));
            for (const storm of matchingStorms) {
                const matchingTCBs = stormTCBs[storm];
                const designation = findCycloneNumber(matchingTCBs[0].name)[1];
                const max = matchingTCBs.reduce(
                    (p, n) => n.count > p.count ? n : p
                ).count;
                const stormElement = existingStorms[`TC${designation}`];
                const active = !matchingTCBs.some(tcb => tcb.final);

                if (stormElement != null) {
                    if (!active) {
                        delete stormElement.t.params.active;
                    }
                    stormElement.t.params["TCBs"].wt = max.toString();
                    $(stormElement.e).attr("data-mw", JSON.stringify(stormElement.mw));
                } else {
                    const name =
                        matchingTCBs[0].name[0].toUpperCase()
                        + matchingTCBs[0].name.substr(1).toLowerCase();
                    const mw = {
                        parts: [{
                            template: {
                                target: {
                                    wt: "User:Zoomiebot/Archives/PAGASA/Entry\n",
                                    href: "./User:Zoomiebot/Archives/PAGASA/Entry"
                                },
                                params: {
                                    "active": { wt: "yes" },
                                    "year": { wt: year.toString() },
                                    "name": { wt: name },
                                    "designation": {
                                        wt: `TC${designation < 10 ? `0${designation}` : designation }`
                                    },
                                    "local-name": { wt: name  },
                                    "date": { wt: new Date().toISOString().substr(0, 10) },
                                    "TCBs": { wt: max.toString() }
                                },
                                i: 0
                            }
                        }]
                    };
                    if (!active) {
                        delete mw.parts[0].template.params.active;
                    }
                    list.append(`<li><span typeof="mw:Transclusion" data-mw='${
                        JSON.stringify(mw)
                    }' about="N${
                        Math.random().toString().substr(2)
                    }"></span></li>`);
                }
            }

            try {
                const data = new FormData();

                data.append("html", $.html());
                data.append("scrub_wikitext", "true");
                data.append("stash", "true");

                log.debug("Grabbing wikitext...");
                const wikitext = (await axios(
                    `https://en.wikipedia.org/api/rest_v1/transform/html/to/wikitext${
                        pageExists ? `/${
                            encodeURIComponent(`User:Zoomiebot/Archives/PAGASA/${year}`)
                        }` : ""
                    }`,
                    {
                        method: "POST",
                        responseType: "text",
                        headers: {
                            "User-Agent": USER_AGENT,
                            ...data.getHeaders()
                        },
                        data: data.getBuffer()
                    }
                )).data;

                log.debug("Saving to page...");
                if (!READ_ONLY) {
                    await bot.save(
                        `User:Zoomiebot/Archives/PAGASA/${year}`,
                        wikitext,
                        "Updating archives (bot)"
                    );
                    await bot.purge("User:Zoomiebot/Archives/PAGASA").catch((e) => {
                        log.warn("Failed to purge.", e);
                    });
                }
            } catch (e) {
                log.error("Failed to save to Wikipedia.", e);
                if (e.response) {
                    log.debug(e.response.data);
                }
            }
        }
    } else {
        log.info("No archived files. Skipping Wikipedia edits...");
    }

    log.info("Done.");
    await OneOffTask.destroy(log, bot);
})();
