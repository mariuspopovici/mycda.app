"use strict";
const merge = require("webpack-merge");
const prodEnv = require("./prod.env");

module.exports = merge(prodEnv, {
  NODE_ENV: `"development"`,
  WEATHER_API: `"DarkSky"`, // OpenWeatherMap or DarkSky
  DS_API_KEY: `"your Dark Sky API key here"`,
  OW_API_KEY: `"your OpenWeatherMap API key here"`,
  FB_API_KEY: `"Firebase API key here"`,
  FB_AUTH_DOMAIN: `"Firebase auth domain"`,
  FB_DATABASE_URL: `"Firebase database url"`,
  FB_PROJECT_ID: `"Firebase app name"`,
  FB_STORAGE_BUCKET: `"Firebase storage bucket"`,
  FB_MSG_SENDER_ID: `"Firebase sender id"`,
  GOOGLE_MAPS_API_KEY: `"Google Maps API Token"`
});
