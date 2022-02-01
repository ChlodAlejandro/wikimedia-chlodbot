describe("Clean exit test", () => {

    test("Check if the test task exits after logout", async () => {
        await expect(
            (await import("../bot/one-off/TestTask")).default
        ).resolves.not.toThrow();
    });

});
