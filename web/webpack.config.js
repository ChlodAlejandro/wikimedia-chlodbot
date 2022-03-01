/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const { ProgressPlugin } = require("webpack");
const AssetsPlugin = require("assets-webpack-plugin");
const child_process = require("child_process");
const fs = require("fs-jetpack");

const scriptTree = Object.fromEntries(
    fs.list(path.join(__dirname, "src"))
        .map(entity => path.resolve(__dirname, "src", entity))
        .filter(entity => fs.exists(entity) === "file")
        .map(entity => [path.parse(entity).name, entity])
);

fs.dir(path.resolve(__dirname, "public", "scripts", "auto"));

// noinspection JSUnusedGlobalSymbols
module.exports = {
    mode: process.env.NODE_ENV === "production" ? "production" : "development",
    entry: scriptTree,
    output: {
        path: path.resolve(__dirname, "public", "scripts", "auto"),
        filename: "[name].js",
        publicPath: "/scripts/auto/"
    },
    optimization: {
        runtimeChunk: "single",
        splitChunks: {
            chunks: "all",
            maxInitialRequests: Infinity,
            minSize: 0,
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name(module) {
                        const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                        return `npm.${packageName.replace("@", "")}`;
                    },
                },
            },
        }
    },
    devServer: {
        devMiddleware: {
            index: false,
            publicPath: "/scripts/auto"
        },
        /**
         * @param {[]} middlewares
         * @param {Record<any, any>} devServer
         */
        setupMiddlewares: (middlewares, devServer) => {
            if (!devServer) {
                throw new Error("webpack-dev-server is not defined");
            }

            // This just starts the PHP built-in web server. It doesn't actually add
            // any middleware.
            devServer.php = child_process.spawn("php", [
                "-S",
                "127.0.0.1:45001"
            ], {
                cwd: path.resolve(__dirname, "public"),
                stdio: "inherit"
            });
            if (devServer.app != null)
                devServer.app.addListener("close", () => { devServer.php.kill("SIGTERM"); });

            return middlewares;
        },
        port: 45000,
        proxy: {
            "/": {
                target: "http://127.0.0.1:45001/",
                pathRewrite: { "^/web/public": "" },
            }
        },
        hot: true,
        static: false
    },
    devtool: process.env.NODE_ENV === "production" ? "eval-source-map" : "source-map",
    resolve: {
        extensions: [".js", ".ts", ".tsx", ".json"]
    },
    plugins: [
        new ProgressPlugin({
            activeModules: true,
            entries: true,
            modules: true,
            dependencies: true
        }),
        new AssetsPlugin({
            entrypoints: true,
            useCompilerPath: true,
            filename: "entrypoints.json",
            removeFullPathAutoPrefix: true
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
