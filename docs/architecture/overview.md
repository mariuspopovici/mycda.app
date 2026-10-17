# System overview

MyCdA.app estimates a cyclist's aerodynamic drag area (CdA) and rolling resistance (Crr) from power, speed and elevation data, using R. Chung's virtual elevation (VE) method. Riders upload Garmin `.fit` or `.csv` files, pick a lap or chart range, tune CdA and Crr until the virtual elevation profile matches reality, save the result as a *segment*, and compare segments against a baseline.

The system is mid-migration from a Vue 2 app to a React app (see [plans/modernization.md](../plans/modernization.md)). Both share the same Firebase backend and data.

## Components

```mermaid
flowchart LR
  subgraph Browser
    legacy[Legacy Vue 2 app<br/>src/]
    web[New React app<br/>web/]
    core[Analysis core<br/>web/src/core]
    web --> core
  end

  subgraph Firebase
    auth[Auth<br/>email + password]
    fs[(Firestore<br/>activities · segments · userprefs)]
    st[(Storage<br/>userdata/uid/activities/)]
    subgraph Functions
      proc[processActivityFile<br/>storage trigger]
      api[api<br/>Express: /activity/:id, /cors]
    end
  end

  ext[DarkSky · OpenWeatherMap<br/>Google Elevation]

  legacy --> auth
  legacy --> fs
  legacy -->|upload .fit/.csv| st
  st -->|onFinalize| proc
  proc -->|.json.gz + metadata| st
  proc --> fs
  legacy -->|Bearer ID token| api
  api --> st
  api -->|key injected server-side| ext
```

| Component | Location | Role |
|---|---|---|
| Legacy web app | `src/` | Vue 2, bootstrap-vue, Vuex, plotly, Google Maps. Still in production; to be deleted at cutover |
| New web app | `web/` | React 19, Vite, TypeScript. It contains only the analysis core so far |
| Analysis core | `web/src/core/` | Framework-free TypeScript: VE, wind model, loop finder, spike filter, segment stats, units, weather sampling |
| `processActivityFile` | `functions/index.js` | Runs on upload: parses the file, stores `<id>.json.gz` next to it, updates the activity status and summary |
| `api` | `functions/index.js` | Express app behind Firebase ID-token auth. `/activity/:id` returns parsed points; `/cors` proxies keyed third-party APIs |
| File parsing | `functions/activity.js`, `functions/csv.js` | Firebase-free parsing (`parseFIT`, `parseCSV`, `validateFileContents`, `getActivityData`), importable by tests |

## Activity lifecycle

```mermaid
sequenceDiagram
  participant U as Browser
  participant FS as Firestore
  participant ST as Storage
  participant P as processActivityFile
  participant A as api /activity/:id

  U->>FS: create activities/{id} {uid, name, status}
  U->>ST: upload userdata/{uid}/activities/{id}.fit|.csv
  ST->>P: onFinalize
  P->>ST: download, parse (fit-file-parser / csv.js)
  P->>ST: write {id}.json.gz (gzipped parsed file)
  P->>FS: update {status: Processed|Error, distance, averages, fitFile}
  U->>A: GET /activity/{id} (Bearer token)
  A->>FS: check activity.uid == caller
  A->>ST: read {id}.json.gz
  A-->>U: summary + points[]
  U->>U: cache (localStorage, pako), build series, run VE
  U->>FS: save segments/{sid} with copied series + CdA/Crr
```

## Target state

After the migration (see [ADR-0002](../decisions/0002-rewrite-frontend-in-react.md) to [ADR-0005](../decisions/0005-open-meteo-for-weather-and-elevation.md)):

- `web/` replaces `src/`: React, Mantine, Leaflet with OpenStreetMap tiles, the modular Firebase SDK, TanStack Query.
- Weather and elevation come from Open-Meteo directly from the browser. No API keys, so the `/cors` proxy is deleted.
- Functions move to 2nd gen (Node 22), secrets move to Secret Manager, and `node-fetch`, `node-gzip` and `mkdirp` are replaced with built-ins.
- Firebase Hosting serves the Vite build output.
- Firestore collections and Storage paths stay unchanged, so existing user data needs no migration.

## Related

- [data-model.md](data-model.md): collections, storage layout, payload shapes and units
- [security.md](security.md): auth, rules, function access control
- [../design/](../design/): the analysis algorithms
