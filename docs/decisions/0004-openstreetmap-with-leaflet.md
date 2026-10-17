# 0004. Use OpenStreetMap tiles with Leaflet instead of Google Maps

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The map shows the ride's GPS track, start and end markers, and laps or loops. The legacy app uses vue2-google-maps, which needs a Google Maps browser key and billing account. It also uses the Google Elevation API through the `/cors` proxy to look up the altitude at the ride's start for air density. The map needs no Google-specific features.

## Decision

Render maps with Leaflet (`react-leaflet`) and OpenStreetMap tiles. Look up elevation with Open-Meteo ([ADR-0005](0005-open-meteo-for-weather-and-elevation.md)).

## Alternatives considered

- **`@vis.gl/react-google-maps`.** The official React binding with the familiar look. It keeps a billed key and the elevation proxy.
- **MapLibre GL with vector tiles.** Nicer rendering, but it needs a tile provider account. It can be added later.

## Consequences

- No Google key, billing or proxy for maps.
- The public OSM tile servers have a usage policy: identify the app, set a correct referrer, keep traffic modest, and show the attribution. This is fine at MyCdA's scale. Switch to a commercial tile provider if traffic grows.
- The custom dark map style (`src/assets/mapthemes/activitymapstyle.json`) is Google-specific and is dropped. Use a dark tile layer or a CSS filter instead.
