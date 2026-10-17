# Modernization plan

Bring MyCdA.app back to life on a maintained stack without breaking existing users' data. Decisions: [ADR-0002](../decisions/0002-rewrite-frontend-in-react.md) to [ADR-0010](../decisions/0010-private-ride-fixtures.md). Work happens on the `modernize` branch.

| Phase | Scope | Status |
|---|---|---|
| 0 | Lock down production | Done (`93f3288`), deployed 2026-10-17 |
| 1 | Analysis core in TypeScript with tests | Done (`93f3288`) |
| 1b | Physics fixes | Done (`4eaf00c`) |
| 2 | Backend modernization | Next |
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

- [ ] Functions to 2nd gen, Node 22, current `firebase-functions` and `firebase-admin`
- [ ] Replace `functions.config()` with params and Secret Manager (`defineSecret`)
- [ ] Replace `node-fetch`, `node-gzip` and `mkdirp-promise` with built-ins; declare all dependencies (`cors` and `node-fetch` are currently only transitive)
- [ ] Modern ESLint config for functions (the current config uses `ecmaVersion: 6`)
- [ ] Parser robustness: 78 of 272 real `.fit` uploads are rejected or crash ([fixture survey](../log/2026-10-17-fixture-survey.md)). Fix the `in` operator crash on laps without records, and give errors their messages
- [ ] CSV timestamps: stop deriving the date from `new Date()`
- [ ] Open-Meteo client in `web/src/core/` or `web/src/services/` ([ADR-0005](../decisions/0005-open-meteo-for-weather-and-elevation.md))
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
