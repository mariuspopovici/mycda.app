import { useQuery } from '@tanstack/react-query'
import type { ActivitySeries } from '../../core/activitySeries'
import { windAt } from '../../core/weather'
import { travelBearings, windModelAirSpeed } from '../../core/windModel'
import { fetchHourlyWeather } from '../../services/openMeteo'

export interface WindModelResult {
  /** km/h, one per point */
  airspeed: number[]
  /** km/h */
  meanWindSpeed: number
  /** degrees the wind blows from, at the middle of the range */
  windDirection: number
  source: 'forecast' | 'archive'
}

/** Whether the series has a usable direction of travel for the wind model. */
export const canModelWind = (series: ActivitySeries) => travelBearings(series.location) !== undefined

/** Air speed from Open-Meteo hourly wind and the GPS track (docs/design/wind-model.md). */
export function useWindModel (series: ActivitySeries, enabled: boolean) {
  const start = series.time[0]
  const end = series.time[series.time.length - 1]
  return useQuery({
    queryKey: ['windModel', start.getTime(), end.getTime(), series.location.find((p) => p)],
    enabled,
    staleTime: Infinity,
    queryFn: async (): Promise<WindModelResult> => {
      const where = series.location.find((p) => p)
      if (!where) throw new Error('The wind model needs GPS data.')
      const weather = await fetchHourlyWeather({ lat: where.lat, lng: where.lng, start, end })
      const wind = windAt(weather, series.time)
      const airspeed = windModelAirSpeed(series.location, series.speed, wind.speed, wind.direction).map((p) => p.airspeed)
      return {
        airspeed,
        meanWindSpeed: wind.speed.reduce((a, b) => a + b, 0) / wind.speed.length,
        windDirection: wind.direction[Math.floor(wind.direction.length / 2)],
        source: weather.source
      }
    }
  })
}
