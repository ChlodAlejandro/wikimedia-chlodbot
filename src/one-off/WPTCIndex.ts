import { ApiResponse, mwn } from "mwn";
import { VERSION } from "../constants/Constants";
import project from "../../package.json";

if (!process.env.ENWIKI_USERNAME || !process.env.ENWIKI_PASSWORD) {
    console.error("missing username or password");
    process.exit();
}

(async () => {
    // API connection
    const bot = await mwn.init({
        apiUrl: "https://en.wikipedia.org/w/api.php",

        // TODO: ENVIRONMENT VARIABLES
        username: process.env.ENWIKI_USERNAME,
        password: process.env.ENWIKI_PASSWORD,

        userAgent: `ChlodBot ${
            VERSION
        } (https://w.wiki/3Yti; chlod@chlod.net; User:Chlod) mwn/${
            project.dependencies.mwn.replace(/^\^/, "")
        } node/${
            process.version.replace(/^v/, "")
        }`,
        defaultParams: {
            assert: "user"
        }
    });

    // Enable emergency shutoff
    bot.enableEmergencyShutoff({
        page: "User:ChlodBot/WPTC Indexer/shutdown",
        intervalDuration: 5000,
        condition: function (pagetext) {
            return pagetext === "false";
        },
        onShutoff: function () {
            console.log("Shutting down!!!");
            process.exit();
        }
    });

    /**
     * Pushes pages (converted into their subject page, if the given page was
     * a talk page) into a given array.
     * 
     * @param array The array to push into.
     * @param query The API response.
     */
    function pushPages(array : Set<string>, res : ApiResponse) {
        Object.values(res?.query?.pages ?? []).forEach(pageObject => {
            const page = new bot.title((pageObject as Record<string, any>).title);
            const title = page.isTalkPage() ? 
                page.getSubjectPage().getPrefixedText() : page.getPrefixedText();
            array.add(title);
            // console.log(`:: pushed ${title}`);
        });
    }
    // ########################################################################
    // Class A: WikiProject template banner transclusions
    // ########################################################################

    console.log("Performing class A search...");
    const classA = new Set<string>();

    for await (const res of bot.continuedQueryGen({
        action: "query",
        generator: "embeddedin",
        geititle: "Template:WikiProject Tropical cyclones",
        geilimit: 500
    })) {
        pushPages(classA, res);
    }

    // ########################################################################
    // Class B: WikiProject sub-articles
    // ########################################################################

    console.log("Performing class B search...");
    const classB = new Set<string>();

    for await (const res of bot.continuedQueryGen({
        action: "query",
        generator: "prefixsearch",
        gpssearch: "Wikipedia:WikiProject Tropical cyclones",
        gpslimit: 500
    })) {
        pushPages(classB, res);
    }

    // ########################################################################
    // Class C: Typhoon-related drafts
    // ########################################################################

    console.log("Performing class C search...");
    const classC = new Set<string>();

    const searchTargets = [
        "intitle:/cyclone/i",
        "intitle:/typhoon/i",
        "intitle:/hurricane/i",
        "intitle:/tropical storm/i",
        "intitle:/(tropical|deep) depression/i",
    ];

    for (const searchTarget of searchTargets) {
        console.log(`:: ${searchTarget}`);
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

    // ########################################################################
    // Dump to file / save to Wikipedia
    // ########################################################################

    console.log("Dumping...");

    const sets = {
        "Class A": classA,
        "Class B": classB,
        "Class C": classC
    };

    for (const [name, set] of Object.entries(sets)) {
        await bot.save(
            `User:ChlodBot/WPTC Indexer/${name}`,
            [...set].map(p => `* {{la2|${p}}}`).join("\n"),
            `(bot) Updating [[User:ChlodBot/WPTC Indexer|WikiProject Tropical cyclones]] page indexes ([[User:ChlodBot/WPTC Indexer#${name}|${name}]])`
        );
    }

    console.log("Done.");
    bot.disableEmergencyShutoff();
})();