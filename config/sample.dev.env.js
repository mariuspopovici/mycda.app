"use strict";
const merge = require("webpack-merge");
const prodEnv = require("./prod.env");

module.exports = merge(prodEnv, {
  NODE_ENV: "'development'",
  OW_API_KEY: "'your open weather API key here between single quotes'"
});
