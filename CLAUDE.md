# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MyCdA.app estimates a cyclist's aerodynamic drag (CdA) and rolling resistance (Crr) from power/speed/elevation data using R. Chung's Virtual Elevation (VE) method. It is a Vue 2 SPA (old `vuejs-templates/webpack` scaffold: webpack 3, Babel 6, bootstrap-vue, Vuex, plotly) backed by Firebase (Auth, Firestore, Storage, Cloud Functions).

## Commands

Frontend (repo root):
- `npm run dev` — webpack-dev-server with hot reload on localhost:8080 (eslint-loader runs during bundling).
- `npm run lint` — eslint (`standard` + `plugin:vue/essential`) over `src/`.
- `npm run build` — **runs `npm version patch` first** (bumps version and creates a git commit/tag, hence the `1.0.xx` commits in history), then builds to `dist/`. `npm run build --report` adds the bundle analyzer.

Cloud Functions (`functions/`, Node 22):
- `npm --prefix functions run lint` — also runs automatically as a predeploy step.
- `npm --prefix functions run serve` / `shell` — local emulation; `firebase emulators:start` uses the ports in `firebase.json`.
- `firebase deploy` (or `npm --prefix functions run deploy` for functions only).

New React app (`web/`, being built to replace the Vue app — see Migration below):
- `npm --prefix web test` — Vitest. Run one file with `npx vitest run src/core/__tests__/core.test.ts` from `web/`; `-u` updates snapshots.
- `npm --prefix web run lint`, `npm --prefix web run build` (`tsc -b` + Vite).

Security rules tests (`tests/rules/`): `npm --prefix tests/rules test` starts the Firestore + Storage emulators and runs Vitest against `firestore.rules` / `storage.rules`. Needs Java (firebase-tools will require JDK 21+ from v15).

## Migration in progress

The Vue 2 app in `src/` is being replaced by a React 19 + Vite + TypeScript + Mantine app in `web/`, with OpenStreetMap (Leaflet) instead of Google Maps and Open-Meteo instead of DarkSky/OpenWeatherMap. Firestore collections and Storage paths must stay unchanged so existing user data keeps working.

- `web/src/core/` holds the framework-free domain logic (virtual elevation, wind model, loop finder, spike filter, segment stats, units), ported from `src/services/` and the Vue components.
- `web/src/core/__tests__/parity.test.ts` runs the ports against the legacy `src/services/*.js` on the CSV fixtures; `core.test.ts` holds physics checks and golden snapshots that outlive the legacy code. Ports intentionally reproduce legacy quirks (commented in the code); fix them deliberately and update snapshots, not silently.
- `functions/activity.js` holds the Firebase-free file parsing (`parseCSV`, `parseFIT`, `getActivityData`) so tests can import it; `functions/index.js` only wires triggers and HTTP routes.

## Configuration

`config/dev.env.js` and `config/prod.env.js` (copied from the `sample.*.env.js` files, gitignored) hold the keys that webpack's DefinePlugin injects as `process.env.*`: Firebase config (`FB_*`), `GOOGLE_MAPS_API_KEY`, and `WEATHER_API` (`OpenWeatherMap` or `DarkSky`) selecting the weather provider. Values must be double-quoted string literals (e.g. `` `"value"` ``).

Third-party API keys for weather/elevation calls are **not** used directly by the browser: the client calls the `api/cors` Cloud Function with a URL containing the literal placeholder `API_KEY` plus a `service` name, and the function substitutes `functions.config()[service].key` server-side. Each service is restricted to its own host by `PROXY_SERVICE_HOSTS`; the proxy goes away once the new app uses Open-Meteo.

Security rules are owner-only: `activities` and `userprefs` by `uid`, `segments` through their parent activity's `uid`, Storage under `userdata/{uid}/`.

## Architecture

### Data flow for an activity
1. `Upload.vue` creates an `activities` Firestore doc and uploads the .FIT/.CSV file to Storage, named with the activity ID.
2. The `processActivityFile` Storage trigger (`functions/index.js`) parses it (`fit-file-parser` or `functions/csv.js`), writes a gzipped `<activityId>.json.gz` next to the original, and updates the activity doc's status/metadata (`Processed` or `Error` + `statusMessage`).
3. `Activity.vue` fetches the parsed data via the authenticated Express endpoint `api/activity/:id` (Firebase ID token as Bearer header) and caches it in localStorage (`services/cache.js`, LRU by capacity).
4. `CdA.vue` runs the VE analysis on a lap or chart selection and saves results to the `segments` collection.

Cloud Function URLs are hardcoded to the production project (`https://us-central1-mycda-c43c6.cloudfunctions.net/api/...`) in `Activity.vue`, `services/weather.js` and `services/mapping.js`.

### Firestore collections
`activities` (upload metadata/status), `segments` (saved CdA/Crr analyses, baseline flags, notes), `userprefs` (per-user settings keyed by uid; loaded into the Vuex store in `store/store.js`). The Firestore `db` instance is exported from `src/main.js` and imported by components.

### Analysis services (`src/services/`)
- `ve.js` — `VirtualElevation`: solves the power equation for slope at each point to produce a virtual elevation profile from power, ground speed, air speed, elevation, time, rho, mass, Crr, CdA, and drivetrain loss. Speeds are in km/h or mph depending on `units`. Pass ground speed as air speed when there is no air speed data.
- `windmodel.js` — `WindModel`: derives air speed from GPS bearing plus wind speed/direction (yaw/headwind components); its output feeds VE as air speed.
- `weather.js` — `WeatherServiceFactory.create(config, user)` returns a DarkSky or OpenWeatherMap service (both proxied through `api/cors`). Used for wind data and air-density inputs (`RhoCalculator.vue`, with the `@mariuspopovici/rho` package).
- `loopdetect.js` — detects loops in the GPS track so VE can be aligned on loop start/end markers.

Routes requiring login set `meta.requiresAuth` in `src/router/index.js`. The `@` import alias resolves to `src/`.

## Gotchas
- `firebase.json` hosting serves `public/`, but the webpack build writes to `dist/`; copy or repoint before deploying hosting.
- `functions/index.js` requires `cors` and `node-fetch`, which are not listed in `functions/package.json`.
- Functions use the legacy `functions.config()` API and v1 triggers (`functions.storage.object().onFinalize`).
