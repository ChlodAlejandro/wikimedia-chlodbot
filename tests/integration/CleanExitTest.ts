const itif = (condition) => condition ? it : it.skip;

describe("Clean exit test", () => {

    itif(
        process.env.ENWIKI_USERNAME != null
        && process.env.ENWIKI_PASSWORD != null
    )("Check if the test task exits after logout", async () => {
        await expect(
            (await import("../../bot/one-off/TestTask")).default
        ).resolves.not.toThrow();
    });

});
