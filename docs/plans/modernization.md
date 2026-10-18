# Modernization plan

Bring MyCdA.app back to life on a maintained stack without breaking existing users' data. Decisions: [ADR-0002](../decisions/0002-rewrite-frontend-in-react.md) to [ADR-0010](../decisions/0010-private-ride-fixtures.md). Work happens on the `modernize` branch.

| Phase | Scope | Status |
|---|---|---|
| 0 | Lock down production | Done (`93f3288`), deployed 2026-10-17 |
| 1 | Analysis core in TypeScript with tests | Done (`93f3288`) |
| 1b | Physics fixes | Done (`4eaf00c`) |
| 2 | Backend modernization | Done, deployed 2026-10-17 (optional Storage-direct reads deferred) |
| 3 | New app shell | Done in code, not yet hosted |
| 4 | Analysis screens | Done in code, not yet hosted |
| 5 | Cutover | In progress |

## Phase 0: Lock down production ✅

- [x] Owner-only Firestore and Storage rules, with emulator tests ([ADR-0006](../decisions/0006-owner-only-security-rules.md))
- [x] Ownership check on `/api/activity/:id`
- [x] Per-service host allowlist on `/api/cors`
- [x] Deployed 2026-10-17 (`firebase deploy --only firestore:rules,storage,functions`)
- [ ] Optionally rotate the OpenWeatherMap and Google API keys

## Phase 1: Analysis core ✅

- [x] `web/` scaffold (Vite, React 19, TypeScript, Vitest)
- [x] Port VE, wind model, loop finder, spike filter, segment stats and units to `web/src/core/` ([ADR-0007](../decisions/0007-framework-free-core-with-parity-tests.md))
- [x] Parity tests against the legacy JS; golden snapshots; private ride fixtures ([ADR-0010](../decisions/0010-private-ride-fixtures.md))
- [x] Split `functions/activity.js` out of `functions/index.js`

## Phase 1b: Physics fixes ✅

- [x] Energy-balance VE: correct for any Δt; stop, gap and tailwind handling ([ADR-0009](../decisions/0009-virtual-elevation-gap-and-stop-handling.md))
- [x] Metric-only core ([ADR-0008](../decisions/0008-metric-only-analysis-core.md))
- [x] Wind model: aligned GPS track, centred bearings, time-zone-independent hourly sampling
- [x] Measured on real rides ([evaluation](../log/2026-10-17-physics-fixes-evaluation.md))

## Phase 2: Backend

- [x] Functions to 2nd gen, Node 22, `firebase-functions` 7, `firebase-admin` 14, Express 5 ([ADR-0011](../decisions/0011-functions-2nd-gen-and-secret-manager.md))
- [x] Replace `functions.config()` with Secret Manager (`defineSecret`); drop DarkSky
- [x] Replace `node-fetch`, `node-gzip`, `mkdirp-promise`, `cors` and `body-parser` with built-ins; process files in memory
- [x] ESLint 9 flat config for functions
- [x] `processActivityFile` checks the activity belongs to the uploader
- [x] End-to-end emulator tests (`tests/emulator/functions.test.js`)
- [x] Deployed 2026-10-17 ([ADR-0011](../decisions/0011-functions-2nd-gen-and-secret-manager.md#deployment)). Two first-deploy problems:
  - Without an explicit region, the CLI put the Storage trigger in `us-east1`, which is how it maps the default bucket's `us` multi-region. Both functions are now pinned to `us-central1` with `setGlobalOptions`.
  - The first 2nd-gen Storage trigger failed until the Eventarc service agent's permissions had propagated. A retry a few minutes later succeeded.
  - Verified with a live `.fit` upload through the legacy app.
- [x] Parser robustness: format detection by content, gzip/zip, fit-file-parser 1.21 → 6.2.2, lap/session recovery, user-facing error messages; 281 of 312 real files accepted, up from 232 ([log](../log/2026-10-17-parser-upgrade.md))
- [x] CSV timestamps from the upload time; hours, clock times and ISO date-times; distance over real intervals
- [x] Open-Meteo client (`web/src/services/openMeteo.ts`) and air density ported from `@mariuspopovici/rho` (`web/src/core/airDensity.ts`) ([ADR-0005](../decisions/0005-open-meteo-for-weather-and-elevation.md))
- [ ] Optional: store points in their final form at upload so the client reads Storage directly, skipping `/activity/:id`

## Phase 3: New app shell

- [x] Mantine 9 app shell, React Router 8, light/dark/auto colour scheme ([ADR-0003](../decisions/0003-mantine-ui-library.md))
- [x] Firebase 12 modular SDK; sign in, sign up, reset password, and the auth action handler (reset password, verify or change email)
- [x] Profile: preferences (shared `userprefs` shape, numbers instead of strings, per-unit limits) and account (display name, email change with verification, password change)
- [x] Activities: live list, multi-file upload with progress (25 MB, also enforced in `storage.rules`), rename, and delete that also removes segments and Storage files; card layout on phones
- [x] Static pages: landing, FAQ (updated for the new parser), about, terms, privacy
- [x] Legacy hash URLs (`/#/activity/…`) redirect to the new paths
- [x] Environment config through Vite `import.meta.env` (`web/.env.local`); `VITE_USE_EMULATORS=true` runs against the emulators
- [x] Playwright end-to-end tests against the emulators (`tests/emulator/e2e/`)
- [ ] Activity page is a summary placeholder linking to the legacy app until Phase 4
- [x] Deployed the Storage rules size cap (2026-10-18)

## Phase 4: Analysis screens

- [x] Activity page:
  - power, speed and elevation chart over time or distance, where dragging zooms into the range and selects it;
  - laps table (click to select) with stats filled in from points when the file lacks them;
  - loop detection with settings;
  - range statistics;
  - Leaflet map with the selection highlighted and the hovered point marked ([ADR-0004](../decisions/0004-openstreetmap-with-leaflet.md));
  - saved analyses with baseline comparison and mean/SD/CV.
- [x] Analysis page (`/activity/:id/analysis?from&to&name`, `/activity/:id/analysis/:sid`):
  - survives a reload, which crashed the legacy app;
  - VE plotted on the elevation axis;
  - mass, ρ (with the calculator), Crr, drivetrain loss, and a CdA slider plus a precise input;
  - laps or loops overlay with RMS error and per-loop drift;
  - **Suggest CdA**: fit to elevation or loop closure, optionally with Crr ([design](../design/virtual-elevation.md#fitting));
  - air speed: measured, still air, or the Open-Meteo wind model;
  - save, update, baseline, CSV export, delete. Legacy `/cda` URLs redirect.
- [x] Air density calculator: a dialog in the analysis page and a standalone public `/rho` page, with ride or current weather from Open-Meteo.
- [x] Segments readable and writable by both apps ([ADR-0012](../decisions/0012-segments-during-coexistence.md)), including legacy display-unit `mass`/`ve` and kg/m³ `rho` ([ADR-0008](../decisions/0008-metric-only-analysis-core.md)). One baseline per activity. Over-long ranges are blocked before hitting the 1 MiB limit.
- [x] Activity and analysis pages load lazily (Plotly is a separate ~400 kB gzipped chunk).
- [x] Playwright tests: lap and drag selection, analysis, the suggested CdA recovering a known value, save as baseline, reopen, delete, and the calculator.
- [x] Stuck and failed uploads. The legacy list never showed activities left at `New`, so years of interrupted uploads surfaced in the new app. Activities at `New` for over 10 minutes now show as **Stalled**. Stalled and error rows can be retried (`POST /api/activity/:id/reprocess`), and "Retry all" covers stalled activities plus errors from the legacy parser. `processedWith` marks results of the current pipeline, which are final.
- [x] Deployed functions (reprocess route, `processedWith`) and the Storage upload cap, 2026-10-18

Implementation notes:
- plotly.js 4.1 resets every axis to empty-chart defaults when `react()` gets unchanged data arrays and changed shapes. `PlotlyChart` bumps `datarevision` on every update, and charts keep the user's zoom with `uirevision`.
- Plotly's box select ignores line-only traces, which is why selection works by zooming.

## Phase 5: Cutover

- [x] Point Firebase Hosting at `web/dist`: SPA rewrite, immutable caching for hashed assets, no-cache `index.html`, security headers, and a predeploy build. The live site (mycda.app on Firebase Hosting, released 2025-04-27) still serves the legacy build until the switch. Previous releases can be rolled back in the console.
- [x] Track `firebase.json` and `.firebaserc`. `.gitignore`'s `firebase.*` had also hidden `web/src/firebase.ts`, so the app's Firebase setup was missing from git. A fresh clone now builds and passes its tests.
- [x] Preview channel deployed (`preview`, expires 2026-11-01). Routes, deep links, caching and production config verified.
- [x] CI (`.github/workflows/ci.yml`): the web app (typecheck, lint, tests, build), Cloud Functions (lint, tests), and the emulator suites (rules, functions end to end, Playwright in Chrome) with Java 21. No automated deploy yet.
- [ ] Use the preview on real accounts, then promote: `firebase hosting:clone mycda-c43c6:preview mycda-c43c6:live` (or `firebase deploy --only hosting`)
- [ ] Delete `src/`, `build/`, `config/`, the root webpack toolchain, `parity.test.ts` and the `/cors` proxy
- [ ] Stop `npm run build` from running `npm version patch`
- [ ] Update `README.md` and its screenshots
