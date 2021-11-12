import OneOffTask from "./OneOffTask";

(async () => {
    const { log, bot } = await OneOffTask.create("Test Task");

    log.info("Hello, world!");
    log.info(`Logged in as ${(await bot.userinfo())["name"]}.`);

    await OneOffTask.destroy(log, bot);
})();
