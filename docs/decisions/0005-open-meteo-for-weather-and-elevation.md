# 0005. Use Open-Meteo for weather and elevation

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

Weather feeds the air density calculation (temperature, pressure, dew point or humidity, and the elevation at the ride's location) and the wind model (hourly wind speed and direction). Both production and development configs select DarkSky, whose API shut down on 31 March 2023, so the wind model and automatic air density have been broken since then. The OpenWeatherMap fallback calls `/data/2.5/weather`, which returns *current* conditions, not conditions at the time of the ride. All of these keyed APIs are called through the `/cors` proxy, which existed only to hide the keys and had a key-leak flaw ([security](../architecture/security.md)).

MyCdA.app is non-commercial.

## Decision

Use Open-Meteo directly from the browser:
- Historical Weather API (`archive-api.open-meteo.com`) for rides older than about 5 days;
- Forecast API with `past_days` (up to 92 days back) for recent rides, because the archive lags by several days;
- Elevation API for the ride's starting altitude.

Request `timeformat=unixtime` with UTC times and sample them with `windAt()` ([wind model](../design/wind-model.md)). Delete the `/cors` proxy once the legacy app is retired.

## Alternatives considered

- **OpenWeatherMap One Call 3.0 `timemachine`.** Historical, but keyed and billed per call, so it keeps the proxy.
- **Visual Crossing, Meteostat.** Keyed or rate-limited free tiers, for no gain.

## Consequences

- No API keys, no proxy, no billing. The weather path has no server code.
- The free tier is for non-commercial use only. **Revisit if MyCdA becomes commercial.**
- The data is gridded reanalysis or model output, not station observations. See the limitations in [wind model](../design/wind-model.md).
