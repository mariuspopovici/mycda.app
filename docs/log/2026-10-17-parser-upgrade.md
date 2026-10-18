# 2026-10-17: Upload parser upgrade

Rewrote the upload parsing in `functions/activity.js` and `functions/csv.js`, and upgraded fit-file-parser from 1.21.0 to 6.2.2. Verified against the old pipeline (old `activity.js`/`csv.js` from git with parser 1.21) on all 312 private files ([survey](2026-10-17-fixture-survey.md)).

## Why uploads failed

Of the 78 `.fit` files the old pipeline rejected, 25 weren't FIT files at all. The browser names every upload `.fit` unless its name ends in lowercase `csv`:

| Files | Actual content |
|---|---|
| 11 | gzip: Strava-style `.fit.gz` (3) and gzipped TrainingPeaks `.pwx` XML (8, all copies of one file) |
| 8 | CSV with an uppercase `.CSV` name |
| 3 | GPX |
| 1 | Garmin Connect zip containing a `.fit` |
| 1 | HTML page |
| 1 | empty |

Those 25 failed with string errors from the parser, which surfaced as an empty message. The new pipeline accepts 12 of them: 8 CSVs, 3 gzipped FIT files and the zip. The remaining 53 were real FIT files rejected by validation:
- the speed check only looked at the very first record;
- a crash on laps with no records;
- no session message, or no lap messages, which left records unassigned;
- a session sport left unset by the device;
- speed and power logged in alternating records.

## Changes

- **Format detection by content:** FIT, CSV, gzip, zip, GPX, TCX, PWX, HTML and empty. Archives are unwrapped up to 2 levels, with a 200 MB cap on uncompressed size.
- **FIT parsed in list mode,** with laps and sessions assembled the same way as fit-file-parser 6's cascade mode. A single lap or session is synthesized when the file has none, and a session's missing sport is taken from the file's `sport` message.
- **Alternating speed-only and power-only records** at most 1 s apart are merged.
- **Validation:**
  - reject only an explicit non-cycling sport;
  - require speed on at least half the records;
  - give every rejection a user-facing message (`ActivityFileError`), which is stored in `statusMessage`.
- **`getActivityData`** tolerates empty laps and missing power (avoiding NaN averages).
- **CSV:**
  - csv-parse 4 → 7, with case-insensitive headers;
  - times relative to the upload time, with hours supported;
  - `mm:ss` wrapping past an hour, 12-hour clock times, and ISO date-times;
  - distance over the real interval, starting at 0;
  - error messages that name the missing column (the old parser reported a missing `power` column as missing `time`).

## Results (old → new)

| Outcome | Files |
|---|---|
| Accepted → identical output | 193 |
| Accepted → different output | 39 |
| Rejected → accepted | 49 |
| Rejected → rejected (now with a specific message) | 31 |
| Accepted → rejected | 0 |

Accepted: **232 → 281 of 312**.

The output differences are all intended:
- 37 CSVs: the first point's distance is 0 instead of one second's travel (totals about 6 m shorter), and fractional seconds are kept. The old code truncated them through `Date.setSeconds()`. On `exported.csv` this moves VE by at most 6.5 cm.
- 1 CSV with `2:00:00 PM` clock times: the old parser misread these by accident, while the new one reads them correctly.
- 1 FIT whose first lap message starts 15 minutes after recording began. fit-file-parser 1.21's cascade mode dropped the 945 records before the first lap, while 6.x keeps them.

Comparing the parsers alone: fit-file-parser 6.2.2 against 1.21 in cascade mode, with the old `getActivityData`, gave identical output on 193 of 194 accepted files. The exception is the dropped-records fix above.

Still rejected, correctly: 8 FIT files with no speed at all (power-only trainer files), 2 more with GPS but no speed field (speed could be derived from GPS in future), 4 runs, 2 FIT files without records, 8 PWX, 3 GPX, 1 HTML, 1 empty, and 2 CSVs without a `time` column.

## Tests

- `functions/test/activity.test.js` (Node's built-in test runner, `npm --prefix functions test`): format detection, archives, unsupported formats, FIT recovery cases built with fit-file-parser's encoder (`test/fit-builder.js`), and CSV time formats.
- `npm --prefix functions run test:all-fixtures` checks that every private file either parses or is rejected with an `ActivityFileError`, never a crash.
