const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

if (process.argv.includes("production")) {
  process.env.NODE_ENV = "production";
}

module.exports = {
  entry: "./src/index.js",

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },

      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },

      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: "asset/resource",
      },
    ],
  },

  resolve: {
    extensions: [".js"],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      favicon: "./src/assets/images/logo.png",
    }),
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || 'https://foraminifera-fossil.onrender.com')
    })
  ],

  devServer: {
    port: 3000,
    open: true,
    hot: true,
    historyApiFallback: true,
  },

  devtool: "source-map",
};