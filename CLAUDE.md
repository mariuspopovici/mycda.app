# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MyCdA.app estimates a cyclist's aerodynamic drag area (CdA) and rolling resistance (Crr) from power, speed and elevation data with R. Chung's virtual elevation (VE) method. It is a React 19 + Vite + TypeScript + Mantine app (`web/`) on Firebase (Auth, Firestore, Storage, Cloud Functions, Hosting), with OpenStreetMap (Leaflet) maps and Open-Meteo weather.

Architecture, design notes, decision records (ADRs), the modernization plan and dated engineering logs live in [docs/](docs/README.md). Record decisions that are costly to reverse as a new ADR in `docs/decisions/`, and measured investigations in `docs/log/`.

| Path | Contents |
|---|---|
| `web/` | The web app (deployed to Firebase Hosting from `web/dist`) |
| `functions/` | Cloud Functions, 2nd gen, Node 22, CommonJS: upload processing and the `api` HTTPS function |
| `tests/emulator/` | Security rules, functions end-to-end and Playwright browser tests against the Firebase emulators |
| `firestore.rules`, `storage.rules` | Owner-only security rules |
| `docs/` | Engineering archive |

## Commands

Web app (`web/`):
- `npm --prefix web run dev`: Vite against production Firebase, configured by `web/.env.local` (gitignored; see `web/.env.example`).
- Against the emulators: `npm --prefix tests/emulator run emulators` in one terminal and `npm --prefix web run dev:emulators` in another (project `demo-mycda`; the header shows "emulators").
- `npm --prefix web test`: Vitest. Run one file from `web/` with `npx vitest run src/core/__tests__/core.test.ts`; `-u` updates snapshots. Tests run in emulator mode via the committed `web/.env.test`. Component tests opt into jsdom per file, and `src/test/setup.ts` adds the browser APIs Mantine needs.
- `npm --prefix web run lint`, `npm --prefix web run build` (`tsc -b` + Vite). `npm --prefix web run test:all-fixtures` sweeps every private ride.

Cloud Functions (`functions/`):
- `npm --prefix functions test`: Node's test runner (`test/**/*.test.js`) covering parsing, format detection, and FIT recovery cases built with `test/fit-builder.js`. `npm --prefix functions run test:all-fixtures` also sweeps the private rides.
- `npm --prefix functions run lint`: ESLint 9 flat config. It also runs as a predeploy step.

Emulator tests (`tests/emulator/`, project `demo-mycda`, needs Java): `npm --prefix tests/emulator test` runs:
- `test:rules`: security rules;
- `test:functions`: upload → `processActivityFile` → `GET /api/activity/:id`, reprocessing, and ownership checks;
- `test:e2e`: Playwright in Chrome against the web app. `SCREENSHOTS=1` also saves review screenshots to `test-results/screens/`.

Deploy: `firebase deploy --only functions|hosting|firestore:rules,storage`. Hosting builds `web/` in a predeploy hook. To try hosting changes without touching the live site, run `firebase hosting:channel:deploy preview`.

CI: `.github/workflows/ci.yml` runs the web, functions and emulator suites on every push (Node 22 with npm 11, Java 21, the runner's Chrome) in about 3 minutes. It doesn't deploy.

## Architecture

### Activity data flow
1. The browser creates `activities/{id}` (`uid`, status `New`) and uploads the file to Storage at `userdata/{uid}/activities/{id}.fit|.csv` (`web/src/data/activities.ts`).
2. `processActivityFile` (Storage trigger, `functions/index.js`) checks the activity belongs to the uploader and parses the file. It writes `{id}.json.gz` next to the original and sets `status`, `statusMessage`, the summary fields and `processedWith` (pipeline version).
3. The activity page fetches `GET /api/activity/:id` (Firebase ID token as Bearer) through TanStack Query (`web/src/data/activityData.ts`).
4. The analysis page saves results to `segments` (`web/src/data/segments.ts`, legacy-compatible shape, ADR-0012). `POST /api/activity/:id/reprocess` re-runs step 2 for stalled or failed uploads.

The data model is in `docs/architecture/data-model.md`. Collection and Storage shapes are shared with years of existing user data, so change them only with an ADR and a migration.

### web/src
- `core/`: framework-free domain logic, all unit-tested. It covers virtual elevation, CdA/Crr fitting, range selection and stats, wind model, hourly weather sampling, air density, loop finder, spike filter, segment stats and units. All of it is metric (ADR-0008); imperial exists only in the UI. `core/__tests__/` also holds golden snapshots: a snapshot diff is a behaviour change, so explain it in the commit.
- `data/`: Firestore, Storage and API access. `services/`: network clients such as `openMeteo.ts`, each with an injectable `fetch`.
- `auth/`: AuthProvider, `useAuth`/`useUser` and RequireAuth (waits for the restored session).
- `pages/`, `layout/`, `components/` and `router.tsx`. The activity and analysis pages are lazy-loaded routes (they pull in Plotly and Leaflet). Legacy `/#/…` URLs are rewritten in `router.tsx` before the router starts.
- `components/PlotlyChart.tsx` wraps plotly.js-basic, loaded on demand. It bumps `datarevision` on every update to work around a plotly 4.1 autorange bug, so charts that should keep the user's zoom set `uirevision`.
- `userprefs` weights are stored in display units (the legacy shape). Analysis converts with `totalMassKg()`.
- Analysis starting values: the saved segment, then the activity's `analysisDefaults` (ride settings), then the profile. Several ranges (e.g. out and back laps) are joined with `core/ranges.ts`. VE holds level at the joins (`breaks`), and the page opens already fitted (run closure, then loops, then elevation). Segments are version 2: ranges plus metric parameters, with no copied series (ADR-0013). The activity page's Tests card (`core/testRuns.ts`) pairs out and back laps into tests and fits each by closure with shared parameters; it opens analyses through `analysisUrl()`, which can carry starting parameters. The roadmap from user feedback is in `docs/plans/feedback-roadmap.md`.

### functions
- `activity.js` holds the Firebase-free parsing, imported by tests in `web/` as well. `parseActivityFile` detects the format from file *contents*, because uploads are named `.fit` unless the name ends in `csv`. It unwraps gzip and zip, parses FIT in list mode, assembles sessions and laps itself, and throws `ActivityFileError` with user-facing messages.
- `index.js` wires the trigger and the Express `api` (ID-token auth, owner checks returning 404 for foreign activities). Bump `PIPELINE_VERSION` when parsing changes in a way that should make old errors retryable.

## Gotchas
- `.gitignore` once had `firebase.*`, which silently ignored `web/src/firebase.ts`. Check `git status --ignored` when files seem to vanish.
- Each package's `.npmrc` sets `legacy-peer-deps=false`, so lockfiles include peer dependencies whatever the user-level npm config says. Without it, `npm ci` fails in CI.
- Firestore keeps a streaming connection open: in Playwright, wait for content, never `networkidle`. Mantine renders some content twice (desktop table and phone cards), so filter text locators with `{ visible: true }`.
- The Hosting emulator is on port 5002, because macOS AirPlay holds 5000. Hosting header regexes are RE2 (no lookahead); use globs.
- Private ride fixtures (`web/src/core/__fixtures__/private/`, gitignored) contain GPS tracks. Refer to them by file ID, never by name or place.
