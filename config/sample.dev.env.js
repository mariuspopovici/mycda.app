"use strict";
const merge = require("webpack-merge");
const prodEnv = require("./prod.env");

module.exports = merge(prodEnv, {
  NODE_ENV: `"development"`,
  OW_API_KEY: `"your open weather API key here"`,
  FB_API_KEY: `"Firebase API key here"`,
  FB_AUTH_DOMAIN: `"Firebase auth domain"`,
  FB_DATABASE_URL: `"Firebase database url"`,
  FB_PROJECT_ID: `"Firebase app name"`,
  FB_STORAGE_BUCKET: `"Firebase storage bucket"`,
  FB_MSG_SENDER_ID: `"Firebase sender id"`
});
