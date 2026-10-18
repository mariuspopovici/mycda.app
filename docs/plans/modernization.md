# Modernization plan

Bring MyCdA.app back to life on a maintained stack without breaking existing users' data. Decisions: [ADR-0002](../decisions/0002-rewrite-frontend-in-react.md) to [ADR-0010](../decisions/0010-private-ride-fixtures.md). Work happens on the `modernize` branch.

| Phase | Scope | Status |
|---|---|---|
| 0 | Lock down production | Done (`93f3288`), deployed 2026-10-17 |
| 1 | Analysis core in TypeScript with tests | Done (`93f3288`) |
| 1b | Physics fixes | Done (`4eaf00c`) |
| 2 | Backend modernization | Done, deployed 2026-10-17 (optional Storage-direct reads deferred) |
| 3 | New app shell | Not started |
| 4 | Analysis screens | Not started |
| 5 | Cutover | Not started |

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

- [ ] Mantine app shell, routing, dark mode ([ADR-0003](../decisions/0003-mantine-ui-library.md))
- [ ] Modular Firebase SDK; auth screens (login, sign-up, reset and set password)
- [ ] Profile (user prefs), upload with progress, activity list
- [ ] Static pages: landing, FAQ, terms, privacy
- [ ] Environment config through Vite `import.meta.env`; no hardcoded function URLs

## Phase 4: Analysis screens

- [ ] Activity details: plotly chart with range selection, laps, stats, Leaflet map ([ADR-0004](../decisions/0004-openstreetmap-with-leaflet.md)), loop detection
- [ ] CdA analysis: VE chart, CdA/Crr/mass/ρ controls, air density calculator (Open-Meteo plus `@mariuspopovici/rho`), wind model toggle (only when `travelBearings` is defined), save and edit segments
- [ ] Segment comparison against the baseline
- [ ] Segment storage that avoids the 1 MiB document limit ([data model](../architecture/data-model.md))
- [ ] Read legacy segments' display-unit `mass`, `rho` and `ve` correctly ([ADR-0008](../decisions/0008-metric-only-analysis-core.md))

## Phase 5: Cutover

- [ ] Point Firebase Hosting at `web/dist` (it currently serves `public/`, which the legacy build never writes)
- [ ] CI (GitHub Actions): lint, typecheck, core tests, rules tests
- [ ] Deploy to a Firebase Hosting preview channel, check against real accounts, then promote
- [ ] Delete `src/`, `build/`, `config/`, the root webpack toolchain, `parity.test.ts` and the `/cors` proxy
- [ ] Stop `npm run build` from running `npm version patch`
- [ ] Update `README.md` and its screenshots
