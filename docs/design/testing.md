# Testing strategy

## Suites

| Suite | Command | What it guards |
|---|---|---|
| Analysis core | `npm --prefix web test` | Physics, wind, loops, series preparation, stats |
| Full ride sweep | `npm --prefix web run test:all-fixtures` | Every private ride (~3 min) |
| Upload parsing | `npm --prefix functions test` | Format detection, archives, FIT structure recovery, CSV formats |
| Upload parsing sweep | `npm --prefix functions run test:all-fixtures` | Every private ride parses or is rejected with a message |
| Emulator | `npm --prefix tests/emulator test` | Security rules, and the functions end to end (needs Java) |

Run a single file or test from `web/`: `npx vitest run src/core/__tests__/core.test.ts -t windAt`. Add `-u` to accept snapshot changes after reviewing them.

## Analysis core tests (`web/src/core/__tests__/`)

| File | Kind | Notes |
|---|---|---|
| `core.test.ts` | Behaviour + golden | Physics invariants, one test per fixed bug, golden snapshots of VE on the committed CSV fixtures |
| `parity.test.ts` | Legacy parity | Runs the legacy `src/services/*.js` on the same inputs. VE parity uses `withoutLegacyBugs()` (1 s spacing, always moving, no reverse air speed), where both implementations must agree. Delete this file with the legacy app |
| `private.test.ts` | Real rides | Curated rides from the gitignored `__fixtures__/private/`. Skipped when absent |
| `fixtures.ts` | Helpers | `loadActivityPoints()` runs a `.fit`/`.csv` through the real Cloud Functions parsing (`functions/activity.js`) and a JSON round trip, the same path production data takes |

### Physics invariants

The strongest VE tests don't depend on stored outputs. `flatRide()` generates power that *exactly* balances rolling, aero and kinetic energy for given speeds and timestamps, so a correct VE must stay flat. This holds:
- at constant speed;
- while accelerating, at 1 s and at irregular 1–3 s intervals;
- in a tailwind faster than the rider.

### Golden outputs

Snapshots pin the exact current output so that refactors can't change results unnoticed. A snapshot change is a **behaviour change**: review it, explain it in the commit, and record a measurable change in [log/](../log/).

## Private ride fixtures

The developer's own rides, downloaded from Storage into `web/src/core/__fixtures__/private/` (gitignored, because the files contain GPS tracks). See [ADR-0010](../decisions/0010-private-ride-fixtures.md).

```bash
gcloud storage cp "gs://mycda-c43c6.appspot.com/userdata/<UID>/activities/*.fit" web/src/core/__fixtures__/private/
gcloud storage cp "gs://mycda-c43c6.appspot.com/userdata/<UID>/activities/*.csv" web/src/core/__fixtures__/private/
```

- The curated list in `private.test.ts` covers 1 s and smart recording, stops, long gaps, partial GPS, no GPS, laps, loops and measured air speed. See [log/2026-10-17-fixture-survey.md](../log/2026-10-17-fixture-survey.md).
- Golden files for private rides are written to `private/__golden__/` with `toMatchFileSnapshot`, so nothing derived from a ride is committed.
- The full sweep (`ALL_FIXTURES=1`) runs parity on every file and skips files the upload pipeline rejects.

## Upload parsing tests

`functions/test/activity.test.js` uses Node's built-in test runner. FIT edge cases are generated with fit-file-parser's low-level encoder (`functions/test/fit-builder.js`, which uses FIT SDK message and field numbers): no session, no laps, an empty first lap, records before the first lap, alternating speed-only and power-only records, missing speed, and other sports. Prefer adding a builder case over committing binary fixtures.

## Emulator tests

`tests/emulator/functions.test.js` runs the real functions in the Auth, Functions, Firestore and Storage emulators. It uploads files with the Admin SDK, waits for `processActivityFile`, and calls `/api` with ID tokens from the Auth emulator. `setup-secrets.mjs` writes dummy secrets to `functions/.secret.local`.

`tests/emulator/rules.test.js` uses `@firebase/rules-unit-testing` against the emulators started by `firebase emulators:exec` (project `demo-mycda`, so nothing real is touched). Seed data is written with rules disabled. Each test then asserts allow or deny as a specific user. `PERMISSION_DENIED` lines in the output are expected.
