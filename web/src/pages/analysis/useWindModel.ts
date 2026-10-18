import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ActivitySeries } from '../../core/activitySeries'
import { windAt } from '../../core/weather'
import { riderHeightFactor, travelBearings, windModelAirSpeed, type WindExposure } from '../../core/windModel'
import type { AirspeedSource, ManualWind } from '../../data/segments'
import { fetchHourlyWeather } from '../../services/openMeteo'

export interface WindModelResult {
  /** Wind at 10 m in km/h, one per point. */
  speed: number[]
  /** Degrees the wind blows from, one per point. */
  direction: number[]
  /** km/h at 10 m */
  meanWindSpeed: number
  /** degrees the wind blows from, at the middle of the range */
  windDirection: number
  source: 'forecast' | 'archive'
}

/** Whether the series has a usable direction of travel for the wind model. */
export const canModelWind = (series: ActivitySeries) => travelBearings(series.location) !== undefined

/** Open-Meteo hourly 10 m wind at each point of the series (docs/design/wind-model.md). */
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
      return {
        speed: wind.speed,
        direction: wind.direction,
        meanWindSpeed: wind.speed.reduce((a, b) => a + b, 0) / wind.speed.length,
        windDirection: wind.direction[Math.floor(wind.direction.length / 2)],
        source: weather.source
      }
    }
  })
}

/**
 * Air speed along the direction of travel for the chosen source, km/h. Weather and manual winds are
 * 10 m values scaled to rider height by the exposure (ADR-0014), unless a manual wind was measured at
 * rider height. Undefined while the weather loads or when it couldn't be fetched.
 */
export function useAirspeed (
  series: ActivitySeries,
  source: AirspeedSource,
  manualWind: ManualWind,
  exposure: WindExposure,
  windPossible: boolean
) {
  const model = useWindModel(series, source === 'wind' && windPossible)
  const airspeed = useMemo(() => {
    if (source === 'measured') return series.airspeed
    if (source === 'ground' || !windPossible) return series.speed
    const factor = riderHeightFactor(exposure)
    if (source === 'wind') {
      return model.data && windModelAirSpeed(series.location, series.speed, model.data.speed.map((w) => w * factor), model.data.direction)
        .map((p) => p.airspeed)
    }
    const speed = manualWind.atRiderHeight ? manualWind.speed : manualWind.speed * factor
    return windModelAirSpeed(series.location, series.speed, series.speed.map(() => speed), series.speed.map(() => manualWind.direction))
      .map((p) => p.airspeed)
  }, [source, series, windPossible, exposure, model.data, manualWind])
  return { airspeed, model }
}
