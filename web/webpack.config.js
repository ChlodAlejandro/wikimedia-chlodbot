/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const { ProgressPlugin } = require("webpack");
const child_process = require("child_process");

module.exports = {
    mode: process.env.NODE_ENV === "production" ? "production" : "development",
    entry: {
        logs: "./src/logs.ts"
    },
    output: {
        path: path.resolve(__dirname, "public", "scripts", "auto"),
        filename: "[name].js",
        publicPath: "http://127.0.0.1:45000/scripts/auto/"
    },
    devServer: {
        devMiddleware: {
            index: false,
            publicPath: "/scripts/auto"
        },
        /**
         * @param devServer {Record<any, any>}
         */
        onBeforeSetupMiddleware: (devServer) => {
            if (!devServer) {
                throw new Error("webpack-dev-server is not defined");
            }
            debugger;

            devServer.php = child_process.spawn("php", [
                "-S",
                "127.0.0.1:45001"
            ], {
                cwd: path.resolve(__dirname, "public"),
                stdio: "pipe"
            });
            if (devServer.app != null)
                devServer.app.addListener("close", () => { devServer.php.kill("SIGTERM"); });
        },
        port: 45000,
        proxy: {
            "/": {
                target: "http://127.0.0.1:45001/",
                pathRewrite: { "^/web/public": "" },
            }
        },
        static: false
    },
    resolve: {
        extensions: [".js", ".ts", ".tsx", ".json"]
    },
    plugins: [
        new ProgressPlugin({
            activeModules: true,
            entries: true,
            modules: true,
            dependencies: true
        })
    ],
    module: {
        rules: [
            {
                test: /\.(txt|svg)$/,
                use: ["text-loader"],
                exclude: path.resolve("./static")
            },
            {
                test: /\.tsx?$/,
                use: ["ts-loader"],
                exclude: path.resolve("./static")
            },
            {
                test: /\.jsx?$/,
                exclude: path.resolve("./static")
            }
        ]
    }
};
