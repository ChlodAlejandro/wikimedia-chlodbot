import OneOffTask from "./OneOffTask";
import createConnection from "../database/Database";
import {RowDataPacket} from "mysql2";
import nd from "../util/nd";
import iswitch from "../util/iswitch";
import * as path from "path";
import * as fs from "fs/promises";

export default (async () => {
    const { log, bot } = await OneOffTask.create("Unreferenced Tambayan Philippines pages");

    log.info("Connecting to `enwiki_p`...");
    const sql = await createConnection(log, "enwiki");

    log.info("Performing query...");
    const start = process.hrtime.bigint();
    const [ rows ] = await sql.query<RowDataPacket[]>(
        await fs.readFile(path.resolve(__dirname, "sql", "UnreferencedTambayanPages.sql"))
            .then(f => f.toString())
    );
    const end = process.hrtime.bigint();
    log.info(`Query finished. Took ${Number(end - start) / 1000000}ms.`);
    log.info("Closing SQL connection...");
    await sql.destroy();

    let wikitext = nd(`
        This page lists all [[Wikipedia:Tambayan Philippines]] pages that are tagged with {{T|Unreferenced}}.
        
        {| class="wikitable sortable"
        ! rowspan=2 | Page
        ! colspan=2 | Last edit
        ! rowspan=2 data-sort-type="number" | Length
        ! rowspan=2 data-sort-type="number" | Importance
        |-
        ! Timestamp
        ! User
        |-
    `) + "\n";
    for (const row of rows) {
        wikitext += nd(`
            | {{la3|${row["page_title"]}}}
            | [[Special:Diff/${row["s_last_id"]}|${row["s_last_time"]}]]
            | {{user|${row["s_last_actor"]}}}
            | {{nts|${row["s_length"]}}}
            | {{nts|${row["importance"]}|quiet=y}} ${
                iswitch(row["importance"], {
                    1: "Low",
                    2: "Mid",
                    3: "High",
                    4: "Top"
                }, "Unknown")
            }
            |-
        `) + "\n";
    }
    wikitext += "|}";


    // ########################################################################
    // Dump to file / save to Wikipedia
    // ########################################################################

    log.info("Dumping...");

    await bot.save(
        "User:Zoomiebot/Unreferenced Tambayan Philippines pages",
        wikitext,
        "(bot) Updating page list."
    );

    log.info("Done.");
    await OneOffTask.destroy(log, bot);
})();
