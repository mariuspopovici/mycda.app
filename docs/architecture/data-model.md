# Data model

The new app must read and write exactly these shapes. Existing user data depends on them, and changing any of them needs an ADR and a migration.

## Firestore

### `activities/{activityId}`

Created by the browser at upload time. The ID is a client-generated UUID, which is also the Storage file name. `processActivityFile` updates the document after parsing.

| Field | Type | Set by | Notes |
|---|---|---|---|
| `id` | string | client | Same as the document ID |
| `uid` | string | client | Owner. The security rules depend on it, and it never changes |
| `name` | string | client | `"New Activity"` until renamed |
| `status` | `"New" \| "Processed" \| "Error"` | client, then function | |
| `statusMessage` | string | function | Only when `status == "Error"` |
| `timestamp` | timestamp | client, overwritten by function | Upload or processing time |
| `activity_date` | timestamp | function | First record's timestamp |
| `distance` | number | function | Session total distance, in km |
| `averageSpeed` | number | function | km/h |
| `averagePower` | number | function | W |
| `fitFile` | string | function | Storage path of the parsed `.json.gz` |
| `notes` | string | client | The rider's notes about the ride |
| `analysisDefaults` | `{mass?, rho?, crr?, dloss?}` | client | Ride-level analysis parameters, metric. They override the profile, and a saved segment's own values override them |
| `processedWith` | number | function | Upload pipeline version that set the status (2 = content detection and fit-file-parser 6). Absent when the legacy pipeline processed the activity |

The activity list queries `where('uid','==',uid).where('status','==','Processed'|'Error')`. See `firestore.indexes.json`.

### `segments/{segmentId}`

A saved CdA/Crr analysis of one or more ranges of an activity.

**Version 2** (`version: 2`, [ADR-0013](../decisions/0013-segments-v2-ranges.md)), written since 2026-10-18:

| Field | Type | Notes |
|---|---|---|
| `id`, `activity`, `name`, `description`, `isBaseline` | | as in the legacy shape below |
| `ranges` | `{start, end}[]` | Analysed time ranges, in ride order; several for a joined run (out and back) |
| `range` | `{start, end}` | Spans all ranges; orders the activity's segment list |
| `mass` | number | kg |
| `rho` | number | kg/m³ |
| `cda`, `crr` | number | |
| `dloss` | number | % |
| `airspeedSource` | `measured` · `ground` · `wind` · `manual` | |
| `wind` | `{speed, direction}` or null | Manual wind: km/h, and degrees the wind blows from |

The series are read from the activity, not stored.

**Legacy** (no `version`), as written by the Vue app and until 2026-10-18. A legacy segment is self-contained: it **copies the data series** for its range, so it can be reopened without re-fetching the activity. Saving one rewrites it as version 2.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Same as the document ID |
| `activity` | string | Parent activity ID. Ownership is checked through it, because segments have no `uid` |
| `name`, `description` | string | |
| `mass` | number | Rider + bike mass, in the user's display units at save time |
| `rho` | number | Air density, in the user's display units at save time |
| `cda`, `crr` | number | |
| `isBaseline` | boolean | One baseline per activity; other segments are compared to it |
| `range` | `{start: timestamp, end: timestamp}` | The segment list is ordered by `range.start` |
| `time` | timestamp[] | |
| `power` | number[] | W |
| `speed`, `airspeed` | number[] | km/h. Converted from mph on save |
| `distance` | number[] | km |
| `altitude` | number[] | m |
| `location` | `{lat, lng}[]` | |
| `ve` | number[] | Virtual elevation at save time, in display units |
| `laps` | object[] | Lap summaries overlapping the range |

> **Size risk:** Firestore documents are capped at 1 MiB. Copying around eight series per point means a segment of roughly an hour or more can exceed the cap. The new app should save the range plus parameters and read series from the activity, or store series in Storage.

> **Unit inconsistency:** `speed`, `distance` and `altitude` are always stored in metric, but `mass`, `rho` and `ve` are stored in whatever units the user had selected. The new app must convert these on read, based on the user's `userprefs.units`, which is the best available signal. See [ADR-0008](../decisions/0008-metric-only-analysis-core.md).

### `userprefs/{uid}`

| Field | Type | Notes |
|---|---|---|
| `uid` | string | |
| `units` | `"metric" \| "imperial"` | Display units |
| `weight`, `bikeWeight` | number | In display units |
| `cda`, `crr` | number | Defaults for new analyses |
| `dloss` | number | Drivetrain loss, in % |

## Storage

```
userdata/{uid}/activities/{activityId}.fit      original upload (or .csv)
userdata/{uid}/activities/{activityId}.json.gz  parsed file, gzipped JSON (written by processActivityFile)
```

## Parsed activity (`api/activity/:id` response)

`parseActivityFile()` in `functions/activity.js` detects the format from the file's contents (the browser names every upload `.fit` unless its name ends in `csv`), unwraps gzip and zip, and returns a FIT-like `activity.sessions[].laps[].records[]` structure; CSV is converted by `functions/csv.js`. `getActivityData()` builds the response below from it.

```ts
{
  timestamp, start_time,        // first record
  total_distance,               // km
  total_elapsed_time,           // s
  avg_power, avg_speed,         // from the session, or computed from records when the file has no session stats
  lap_count,
  laps: [{ start_time, total_elapsed_time, total_distance, start_distance, avg_power, avg_speed }],
  points: [{
    lap,                        // 1-based
    timestamp,
    distance,                   // km
    power,                      // W
    altitude,                   // km (the web app multiplies by 1000)
    speed,                      // km/h (enhanced_speed when the session only has enhanced fields)
    airspeed,                   // km/h: air_speed, else saturated_hemoglobin_percent (a device that writes air speed into the SmO2 field)
    lat, long                   // degrees; absent when the point has no fix
  }]
}
```

Missing values are dropped by the JSON round trip, so treat every point field as optional. `toActivitySeries()` in `web/src/core/activitySeries.ts` turns points into aligned series:

- altitude in m;
- air speed falling back to ground speed;
- power spikes above 1500 W replaced with the average of the last 5 values;
- `location` aligned with the other series, with `null` where a point has no fix.

## CSV upload format

Header row required. Columns are matched by name (case-insensitive), in any order:

| Column | Required | Unit |
|---|---|---|
| `time` | yes | Elapsed `[h:]mm:ss[.s]` or seconds (timed from the upload time; `mm:ss` that wraps past 59:59 adds an hour), 12-hour clock `h:mm[:ss] AM/PM`, or an ISO 8601 date-time (used as-is) |
| `power` | yes | W |
| `speed` | yes | km/h |
| `airspeed` | no | km/h |
| `elevation` | no | m |
| `lap` | no | integer |
| `lat`, `long` | no | degrees |

## Browser storage

The app doesn't persist activity data in the browser. TanStack Query caches it in memory for the session. Browsers that used the legacy app may still hold its `ActivityCache*` keys in `localStorage`, which nothing reads any more.

## Known issues

- The legacy app deleted only the activity document, leaving its Storage files and segments behind. The new app deletes all three.
- The legacy activity list only queried `Processed` and `Error`, so activities whose upload or processing never finished stayed at `New` and were never shown. The new app shows them as **Stalled** after 10 minutes and can retry them (`POST /api/activity/:id/reprocess`).
- CSV files without date-times are dated by their upload time (`object.timeCreated`), since the format carries no date.
- Function URLs are hardcoded to the production project in `Activity.vue`, `services/weather.js` and `services/mapping.js`.
