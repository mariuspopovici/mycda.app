/** A contiguous range of points, inclusive. */
export interface IndexRange {
  start: number
  end: number
}

/** Index of the first value ≥ target in an ascending array (binary search). */
export function lowerBound (values: ArrayLike<number>, target: number): number {
  let lo = 0
  let hi = values.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (values[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** Index of the first value > target in an ascending array. */
export function upperBound (values: ArrayLike<number>, target: number): number {
  let lo = 0
  let hi = values.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (values[mid] <= target) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Points whose x value lies within [from, to]. `x` must be ascending (time in ms, or distance).
 * Returns undefined when fewer than two points fall inside.
 */
export function rangeFromAxis (x: ArrayLike<number>, from: number, to: number): IndexRange | undefined {
  const [lo, hi] = from <= to ? [from, to] : [to, from]
  const start = lowerBound(x, lo)
  const end = upperBound(x, hi) - 1
  return end - start >= 1 ? { start, end } : undefined
}

/** The points recorded in a lap (1-based lap number). */
export function lapRange (lapOfPoint: number[], lap: number): IndexRange | undefined {
  const start = lapOfPoint.indexOf(lap)
  if (start < 0) return undefined
  const end = lapOfPoint.lastIndexOf(lap)
  return end > start ? { start, end } : undefined
}

export const sliceRange = <T>(values: T[], range: IndexRange): T[] => values.slice(range.start, range.end + 1)

export interface RangeStats {
  /** s */
  duration: number
  /** km */
  distance: number
  /** W, time-weighted over moving points */
  averagePower: number
  /** km/h, distance over moving time */
  averageSpeed: number
  maxPower: number
  maxSpeed: number
  /** m, sum of rises */
  elevationGain: number
  points: number
}

/** Summary statistics for a range of an activity. */
export function rangeStats (
  series: { time: Date[], power: number[], speed: number[], distance: number[], altitude: number[] },
  range: IndexRange
): RangeStats {
  const { start, end } = range
  let weightedPower = 0
  let weight = 0
  let maxPower = 0
  let maxSpeed = 0
  let gain = 0
  for (let i = start; i <= end; i++) {
    maxPower = Math.max(maxPower, series.power[i])
    maxSpeed = Math.max(maxSpeed, series.speed[i])
    if (i > start) {
      const dt = (series.time[i].getTime() - series.time[i - 1].getTime()) / 1000
      if (dt > 0 && dt <= 10) {
        weightedPower += series.power[i] * dt
        weight += dt
      }
      const rise = series.altitude[i] - series.altitude[i - 1]
      if (rise > 0) gain += rise
    }
  }
  const duration = (series.time[end].getTime() - series.time[start].getTime()) / 1000
  const distance = series.distance[end] - series.distance[start]
  return {
    duration,
    distance,
    averagePower: weight > 0 ? weightedPower / weight : 0,
    averageSpeed: weight > 0 ? distance / (weight / 3600) : 0,
    maxPower,
    maxSpeed,
    elevationGain: gain,
    points: end - start + 1
  }
}

/** Index ranges of the points falling in each time window (e.g. laps); windows with fewer than two points are dropped. */
export function rangesForWindows (time: Date[], windows: Array<{ start: Date, end: Date }>): Array<IndexRange & { window: number }> {
  const ms = time.map((t) => t.getTime())
  return windows.flatMap((w, window) => {
    const range = rangeFromAxis(ms, w.start.getTime(), w.end.getTime())
    return range ? [{ ...range, window }] : []
  })
}
