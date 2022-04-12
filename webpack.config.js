const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
    mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
    devtool: 'cheap-source-map',
    entry: {
        background: path.resolve(__dirname, "src", "background.ts"),
        app: path.resolve(__dirname, "src", "app.tsx"),
    },
    output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].js",
    },
    resolve: {
        extensions: [".ts", ".js", ".tsx", ".json"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [{ from: ".", to: ".", context: "public" }]
        }),
        new MonacoWebpackPlugin({
            languages: ['json'],
        })
    ],
};