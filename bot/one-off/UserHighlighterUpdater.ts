import OneOffTask from "./OneOffTask";

export default (async () => {
    const { log, bot } = await OneOffTask.create("User Highlighter Updater");



    await OneOffTask.destroy(log, bot);
})();
