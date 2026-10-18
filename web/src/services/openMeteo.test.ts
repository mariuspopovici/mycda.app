import { describe, expect, it, vi } from 'vitest'
import { airDensity } from '../core/airDensity'
import { windAt } from '../core/weather'
import { fetchElevation, fetchHourlyWeather } from './openMeteo'

const respond = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }))
const requestedUrl = (fetchFn: ReturnType<typeof respond>) => String(fetchFn.mock.calls[0][0])

const t0 = Date.UTC(2026, 4, 1, 8) / 1000
const hourlyBody = {
  elevation: 42,
  hourly: {
    time: [t0, t0 + 3600, t0 + 7200],
    temperature_2m: [15, 16, null],
    dew_point_2m: [8, 8.5, null],
    pressure_msl: [1015, 1014, null],
    wind_speed_10m: [12, 18, null],
    wind_direction_10m: [270, 280, null]
  }
}

const ride = { lat: 45.50123456, lng: -73.60123456, start: new Date('2026-05-01T08:10:00Z'), end: new Date('2026-05-01T09:40:00Z') }

describe('fetchHourlyWeather', () => {
  it('requests UTC hourly data in km/h for the ride days and drops unfilled hours', async () => {
    const fetchFn = respond(hourlyBody)
    const weather = await fetchHourlyWeather({ ...ride, now: new Date('2026-05-03T00:00:00Z'), fetch: fetchFn })

    const url = new URL(requestedUrl(fetchFn))
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      latitude: '45.5012',
      longitude: '-73.6012',
      start_date: '2026-05-01',
      end_date: '2026-05-01',
      wind_speed_unit: 'kmh',
      timeformat: 'unixtime',
      timezone: 'GMT'
    })
    expect(url.searchParams.get('hourly')!.split(',')).toEqual(
      ['temperature_2m', 'dew_point_2m', 'pressure_msl', 'wind_speed_10m', 'wind_direction_10m'])

    expect(weather).toMatchObject({
      time: [t0 * 1000, (t0 + 3600) * 1000],
      temperature: [15, 16],
      seaLevelPressure: [1015, 1014],
      speed: [12, 18],
      direction: [270, 280],
      gridElevation: 42,
      source: 'forecast'
    })
  })

  it('uses the archive for rides older than the forecast history', async () => {
    const fetchFn = respond(hourlyBody)
    const weather = await fetchHourlyWeather({ ...ride, now: new Date('2026-10-17T00:00:00Z'), fetch: fetchFn })
    expect(requestedUrl(fetchFn)).toMatch(/^https:\/\/archive-api\.open-meteo\.com\/v1\/archive\?/)
    expect(weather.source).toBe('archive')
  })

  it('reports API errors and missing data', async () => {
    await expect(fetchHourlyWeather({ ...ride, fetch: respond({ error: true, reason: 'Latitude must be in range' }, 400) }))
      .rejects.toThrow('Latitude must be in range')
    await expect(fetchHourlyWeather({ ...ride, fetch: respond({ hourly: { time: [] } }) }))
      .rejects.toThrow(/no hourly data/)
    const empty = { hourly: { ...hourlyBody.hourly, temperature_2m: [null, null, null] } }
    await expect(fetchHourlyWeather({ ...ride, fetch: respond(empty) })).rejects.toThrow(/no weather data/)
  })

  it('feeds windAt and airDensity', async () => {
    const weather = await fetchHourlyWeather({ ...ride, now: new Date('2026-05-03T00:00:00Z'), fetch: respond(hourlyBody) })
    const wind = windAt(weather, [new Date((t0 + 1800) * 1000)])
    expect(wind.speed[0]).toBeCloseTo(15, 9)
    expect(wind.direction[0]).toBeCloseTo(275, 9)
    const rho = airDensity({ temperature: weather.temperature[0], dewPoint: weather.dewPoint[0], seaLevelPressure: weather.seaLevelPressure[0], altitude: 50 })
    expect(rho).toBeGreaterThan(1.1)
    expect(rho).toBeLessThan(1.3)
  })
})

describe('fetchElevation', () => {
  it('returns the terrain elevation', async () => {
    const fetchFn = respond({ elevation: [37.5] })
    expect(await fetchElevation(45.5, -73.6, fetchFn)).toBe(37.5)
    expect(requestedUrl(fetchFn)).toBe('https://api.open-meteo.com/v1/elevation?latitude=45.5000&longitude=-73.6000')
  })
})

describe.skipIf(!process.env.LIVE_API)('Open-Meteo live (LIVE_API=1)', () => {
  it('returns archive weather for an old ride', async () => {
    const weather = await fetchHourlyWeather({ lat: 51.8, lng: -0.2, start: new Date('2019-03-21T15:00:00Z'), end: new Date('2019-03-21T16:00:00Z') })
    expect(weather.source).toBe('archive')
    expect(weather.time.length).toBeGreaterThanOrEqual(24)
  })

  it('returns recent weather and elevation', async () => {
    const end = new Date(Date.now() - 2 * 86_400_000)
    const weather = await fetchHourlyWeather({ lat: 45.5, lng: -73.6, start: end, end })
    expect(weather.source).toBe('forecast')
    expect(await fetchElevation(45.5, -73.6)).toBeGreaterThan(0)
  })
})
