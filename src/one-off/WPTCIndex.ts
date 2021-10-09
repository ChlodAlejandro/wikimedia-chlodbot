import { ApiResponse } from "mwn";
import OneOffTask from "./OneOffTask";

(async () => {
    const { log, bot } = await OneOffTask.create("WPTC Indexer");

    /**
     * Pushes pages (converted into their subject page, if the given page was
     * a talk page) into a given array.
     *
     * @param array The array to push into.
     * @param res The API response.
     */
    function pushPages(array : Set<string>, res : ApiResponse) {
        Object.values(res?.query?.pages ?? []).forEach(pageObject => {
            const page = new bot.title((pageObject as Record<string, any>).title);
            const title = page.isTalkPage() ?
                page.getSubjectPage().getPrefixedText() : page.getPrefixedText();
            array.add(title);
        });
    }
    // ########################################################################
    // Class A: WikiProject template banner transclusions
    // ########################################################################

    log.info("Performing class A search...");
    const classA = new Set<string>();

    const tcCategories = [
        "Category:Top-importance Tropical cyclone articles",
        "Category:High-importance Tropical cyclone articles",
        "Category:Mid-importance Tropical cyclone articles",
        "Category:Low-importance Tropical cyclone articles",
        "Category:NA-importance Tropical cyclone articles",
        "Category:Unknown-importance Tropical cyclone articles"
    ];
    for (const category of tcCategories) {
        log.debug(`Processing "${category}"...`);
        for await (const res of bot.continuedQueryGen({
            action: "query",
            generator: "categorymembers",
            gcmtitle: category,
            gcmlimit: 500
        })) {
            pushPages(classA, res);
        }
    }
    log.info(`Found ${classA.size} Class-A articles.`);

    // ########################################################################
    // Class B: WikiProject sub-articles
    // ########################################################################

    log.info("Performing class B search...");
    const classB = new Set<string>();

    for await (const res of bot.continuedQueryGen({
        action: "query",
        generator: "prefixsearch",
        gpssearch: "Wikipedia:WikiProject Tropical cyclones",
        gpslimit: 500
    })) {
        pushPages(classB, res);
    }
    log.info(`Found ${classB.size} Class-B articles.`);

    // ########################################################################
    // Class C: Typhoon-related drafts
    // ########################################################################

    log.info("Performing class C search...");
    const classC = new Set<string>();

    const searchTargets = [
        "intitle:/cyclone/i",
        "intitle:/typhoon/i",
        "intitle:/hurricane/i",
        "intitle:/tropical storm/i",
        "intitle:/(tropical|deep) depression/i",
    ];

    for (const searchTarget of searchTargets) {
        log.debug(`Processing query: "${searchTarget}"`);
        for await (const res of bot.continuedQueryGen({
            action: "query",
            generator: "search",
            gsrsearch: searchTarget,
            gsrnamespace: "118",
            gsrlimit: 500
        })) {
            pushPages(classC, res);
        }
    }
    log.info(`Found ${classC.size} Class-C articles.`);

    // ########################################################################
    // Dump to file / save to Wikipedia
    // ########################################################################

    log.info("Dumping...");

    const sets = {
        "Class A": classA,
        "Class B": classB,
        "Class C": classC
    };

    for (const [name, set] of Object.entries(sets)) {
        await bot.save(
            `User:Zoomiebot/WPTC Indexer/${name}`,
            [...set].map(p => `* {{la2|${p}}}`).join("\n"),
            `(bot) Updating [[User:Zoomiebot/WPTC Indexer|WikiProject Tropical cyclones]] page indexes ([[User:Zoomiebot/WPTC Indexer#${name}|${name}]])`
        );
    }

    log.info("Done.");
    await OneOffTask.destroy(log, bot);
})();
