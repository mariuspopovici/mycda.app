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

The activity list queries `where('uid','==',uid).where('status','==','Processed'|'Error')`. See `firestore.indexes.json`.

### `segments/{segmentId}`

A saved CdA/Crr analysis of part of an activity. A segment is self-contained: it **copies the data series** for its range, so it can be reopened without re-fetching the activity.

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

`getActivityData()` in `functions/activity.js` builds this from the parsed FIT structure. CSV uploads are first converted into the same FIT-like structure by `functions/csv.js`.

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

Header row required. Columns are matched by name, in any order:

| Column | Required | Unit |
|---|---|---|
| `time` | yes | `mm:ss.s` or `h:mm:ss`. Only minutes and seconds are applied, on top of the current date and hour (see known issues) |
| `power` | yes | W |
| `speed` | yes | km/h |
| `airspeed` | no | km/h |
| `elevation` | no | m |
| `lap` | no | integer |
| `lat`, `long` | no | degrees |

## Browser storage

The legacy app caches the last 5 fetched activities in `localStorage` (`ActivityCache*` keys, pako-deflated). The new app must use different keys, or clear these, to avoid reading stale shapes.

## Known issues

- Deleting an activity removes only its Firestore document. Its Storage files and segments are orphaned.
- `functions/csv.js` builds timestamps from `new Date()` with only minutes and seconds replaced, so a CSV ride's date is the upload date, and its absolute times depend on the server clock and time zone.
- Function URLs are hardcoded to the production project in `Activity.vue`, `services/weather.js` and `services/mapping.js`.
