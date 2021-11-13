const requireStack = {
    "ansi-to-html": require("ansi-to-html")
};
global.require = (name) => {
    if (requireStack[name]) return requireStack[name];
    else throw new Error("Could not find module: " + name);
};
