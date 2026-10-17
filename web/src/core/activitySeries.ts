import type { LatLng } from './windModel'

/** A data point as returned by the `api/activity/:id` endpoint. */
export interface ActivityPoint {
  lap: number
  timestamp: string
  distance?: number | null
  power?: number | null
  /** Altitude in km. */
  altitude?: number | null
  speed?: number | null
  airspeed?: number | null
  lat?: number | null
  long?: number | null
}

export interface ActivitySeries {
  time: Date[]
  power: number[]
  /** Altitude in m. */
  altitude: number[]
  speed: number[]
  airspeed: number[]
  distance: number[]
  location: LatLng[]
}

/** Power readings above this are treated as sensor spikes. */
export const POWER_SPIKE_WATTS = 1500
const SPIKE_WINDOW = 5

/**
 * Turns activity points into aligned series. Power spikes are replaced with the average of the
 * last 5 accepted values.
 */
export function toActivitySeries (points: ActivityPoint[]): ActivitySeries {
  const series: ActivitySeries = {
    time: [], power: [], altitude: [], speed: [], airspeed: [], distance: [], location: []
  }
  const recentPower: number[] = []

  points.forEach((point) => {
    let power = point.power
    if (power != null && power > POWER_SPIKE_WATTS) {
      power = recentPower.length > 0
        ? recentPower.reduce((sum, p) => sum + p, 0) / recentPower.length
        : 0
    }
    if (recentPower.length === SPIKE_WINDOW) recentPower.shift()
    recentPower.push(power ?? 0)

    series.time.push(new Date(point.timestamp))
    series.power.push(power ?? 0)
    series.altitude.push(point.altitude != null ? point.altitude * 1000 : 0)
    series.speed.push(point.speed ?? 0)
    series.airspeed.push(point.airspeed ?? point.speed ?? 0)
    series.distance.push(point.distance ?? 0)
    if ('lat' in point && 'long' in point) {
      series.location.push({ lat: Number(point.lat), lng: Number(point.long) })
    }
  })

  return series
}
