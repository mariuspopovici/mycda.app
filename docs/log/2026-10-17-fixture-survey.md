# 2026-10-17: Survey of real ride files

Downloaded the developer's uploads from `gs://mycda-c43c6.appspot.com/userdata/<uid>/activities/` into the gitignored `web/src/core/__fixtures__/private/`, and ran them through `functions/activity.js`, the same parsing production uses.

## Inventory

| Type | Files | Distinct contents | Notes |
|---|---|---|---|
| `.fit` | 272 | fewer: many re-uploads | One ride was uploaded 14 times, another 5 times, another twice (identical MD5) |
| `.csv` | 40 | 11 | 22 copies are byte-identical to the committed `functions/test/bommycdatest.csv` |

Re-uploading the same file creates a new activity each time. Deduplicating by content hash at upload would help.

## Parse and validation failures (`.fit`)

78 of 272 files (29%) are rejected by the upload pipeline:

| Count | Reason |
|---|---|
| 25 | Exception with an empty message |
| 23 | `Invalid file. Missing speed data.` (checks only the first record of the first lap) |
| 10 | `Invalid file. Missing lap data.` |
| 8 | `Invalid file. Missing FIT session data.` |
| 6 | `Invalid file. Could not locate a cycling session within .FIT file.` |
| 6 | `Cannot use 'in' operator to search for 'speed' in undefined`: a crash on a lap without records |

The speed check looks only at `laps[0].records[0]`, so files whose first record lacks speed are rejected even if the rest of the ride has it. Phase 2 should revisit all of these.

One CSV (`3f079df8`) has no `time` column and is rejected as expected. Note that `validate()` in `functions/csv.js` reports a missing `power` column as "Missing required <time> column".

## Recording characteristics of the curated rides

| Ride | Points | Laps | Intervals | Stopped points | GPS fixes | Air speed |
|---|---|---|---|---|---|---|
| `179e07b9` | 4892 | 1 | 1 s, one 27 s gap | 44 | all | – |
| `ca984087` | 3524 | 7 | 1 s; 2–3 s ×2; 35 s, 283 s gaps | 297 | all | – |
| `c4ae4df8` | 3746 | 1 | 1 s | 68 | all | – |
| `83ad24d3` | 5920 | 10 | 1 s; 2–3 s ×16; gaps up to 1198 s | 620 | 62% | – |
| `b72dc6ed` | 5366 | 20 | 1 s; 2–6 s; gaps up to 1273 s, some while moving | 808 | 63% | – |
| `0e8b35f1` | 1600 | 6 | 1 s | 41 | none | – |
| `0315645a` | 1036 | 5 | 1 s; 2–5 s; 29 s, 266 s gaps | 5 | all | – |
| `16c21302` | 3343 | 1 | 1 s; two gaps > 3 s | 7 | none | – |
| `a5512ec6` (CSV) | 3301 | 9 | not measured | not measured | none | 3298 points |
| `18e78a02` (CSV) | 3253 | 1 | not measured | not measured | all | – |

No power spikes above 1500 W in the eight `.fit` rides (CSV rides not checked).

Findings that drove fixes ([ADR-0009](../decisions/0009-virtual-elevation-gap-and-stop-handling.md)):
- **Gaps while moving.** For example, 1273 s with speed 11 → 8 km/h at either end. The legacy VE integrated the single power reading at the end of the gap over the whole gap.
- **Partial GPS.** `83ad24d3` and `b72dc6ed` have fixes on only about 60% of their points. The legacy `processData` dropped missing fixes, so the GPS array was shorter than and shifted against speed and time, and the wind model paired speeds with the wrong positions.
- **No usable bearing.** One ride in the full set (`54015ff2`) has GPS fixes that never move. The wind model now refuses tracks with no usable bearing.

## Other observations

- Two activities show list start times that differ from their file's first record, by about 1 h (`ca984087`) and 26 min (`0e8b35f1`). Not investigated.
- CSV-uploaded rides take the upload date as their date (see the data model's known issues).
