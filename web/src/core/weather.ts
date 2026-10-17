/** Hourly wind observations, e.g. from Open-Meteo with `timeformat=unixtime`. */
export interface HourlyWind {
  /** Observation times, epoch ms, ascending. */
  time: number[]
  /** Wind speed in the unit the caller uses for ground speed. */
  speed: number[]
  /** Meteorological wind direction (where the wind blows from), degrees. */
  direction: number[]
}

export interface WindSeries {
  speed: number[]
  direction: number[]
}

/**
 * Samples hourly wind at each timestamp. Times are absolute, so the result doesn't depend on the
 * browser's or the ride's time zone. Speed is interpolated linearly and direction along the shorter
 * arc; times outside the observations take the nearest one.
 */
export function windAt (hourly: HourlyWind, at: Array<Date | number>): WindSeries {
  const { time, speed, direction } = hourly
  if (time.length === 0) throw new Error('No hourly wind data.')

  const result: WindSeries = { speed: [], direction: [] }
  let j = 0
  for (const t of at.map(Number)) {
    while (j < time.length - 2 && time[j + 1] <= t) j++
    const t0 = time[j]
    const t1 = time[Math.min(j + 1, time.length - 1)]
    const f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0
    const k = Math.min(j + 1, time.length - 1)

    result.speed.push(speed[j] + (speed[k] - speed[j]) * f)
    const turn = ((direction[k] - direction[j] + 540) % 360) - 180
    result.direction.push((direction[j] + turn * f + 360) % 360)
  }
  return result
}
