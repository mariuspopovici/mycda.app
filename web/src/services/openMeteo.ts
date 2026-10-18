/**
 * Open-Meteo client for ride weather and elevation (ADR-0005). Free for non-commercial use, no key.
 * https://open-meteo.com/en/docs
 */
import type { HourlyWind } from '../core/weather'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation'

/** The forecast API serves the past ~3 months from high-resolution models; older rides use the reanalysis archive. */
export const FORECAST_HISTORY_DAYS = 90

const HOURLY = ['temperature_2m', 'dew_point_2m', 'pressure_msl', 'wind_speed_10m', 'wind_direction_10m'] as const

export interface HourlyWeather extends HourlyWind {
  /** °C */
  temperature: number[]
  /** °C */
  dewPoint: number[]
  /** Sea-level pressure, hPa. */
  seaLevelPressure: number[]
  /** Elevation of the model grid cell, m. */
  gridElevation: number
  source: 'forecast' | 'archive'
}

export interface WeatherRequest {
  lat: number
  lng: number
  /** Ride start and end; whole UTC days around them are requested. */
  start: Date
  end: Date
  /** Defaults to now; injectable for tests. */
  now?: Date
  fetch?: typeof fetch
}

const utcDate = (d: Date) => d.toISOString().slice(0, 10)

/** Hourly weather around a ride. Wind speed is in km/h, matching ride speeds. */
export async function fetchHourlyWeather (request: WeatherRequest): Promise<HourlyWeather> {
  const { lat, lng, start, end, now = new Date(), fetch: fetchFn = fetch } = request
  const ageDays = (now.getTime() - end.getTime()) / 86_400_000
  const source = ageDays <= FORECAST_HISTORY_DAYS ? 'forecast' : 'archive'

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    start_date: utcDate(start),
    end_date: utcDate(end),
    hourly: HOURLY.join(','),
    wind_speed_unit: 'kmh',
    timeformat: 'unixtime',
    timezone: 'GMT'
  })
  const body = await getJson(`${source === 'forecast' ? FORECAST_URL : ARCHIVE_URL}?${params}`, fetchFn)
  const hourly = body.hourly
  if (!hourly || !Array.isArray(hourly.time) || hourly.time.length === 0) {
    throw new Error('Open-Meteo returned no hourly data for this ride.')
  }

  // drop hours the archive hasn't filled in yet
  const usable = hourly.time
    .map((_: number, i: number) => i)
    .filter((i: number) => HOURLY.every((name) => typeof hourly[name][i] === 'number'))
  if (usable.length === 0) {
    throw new Error('Open-Meteo has no weather data for this ride yet.')
  }
  const pick = (name: string) => usable.map((i: number) => hourly[name][i] as number)

  return {
    time: usable.map((i: number) => hourly.time[i] * 1000),
    temperature: pick('temperature_2m'),
    dewPoint: pick('dew_point_2m'),
    seaLevelPressure: pick('pressure_msl'),
    speed: pick('wind_speed_10m'),
    direction: pick('wind_direction_10m'),
    gridElevation: body.elevation,
    source
  }
}

/** Terrain elevation in m (Copernicus DEM, 90 m resolution). */
export async function fetchElevation (lat: number, lng: number, fetchFn: typeof fetch = fetch): Promise<number> {
  const params = new URLSearchParams({ latitude: lat.toFixed(4), longitude: lng.toFixed(4) })
  const body = await getJson(`${ELEVATION_URL}?${params}`, fetchFn)
  const elevation = body.elevation?.[0]
  if (typeof elevation !== 'number') throw new Error('Open-Meteo returned no elevation.')
  return elevation
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getJson (url: string, fetchFn: typeof fetch): Promise<any> {
  const response = await fetchFn(url)
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.error) {
    throw new Error(`Open-Meteo request failed: ${body.reason ?? response.statusText}`)
  }
  return body
}
