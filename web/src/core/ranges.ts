import type { ActivitySeries } from './activitySeries'
import { rangesForWindows, sliceRange, type IndexRange } from './selection'

/** A run joined from one or more ranges of an activity, e.g. the out and back legs of a test. */
export interface CombinedSeries extends ActivitySeries {
  /** Indexes where each range after the first starts (for virtualElevation's `breaks`). */
  breaks: number[]
  /** km along the run, continuous across joins. */
  runDistance: number[]
}

/**
 * Concatenates ranges of a series in the given order. Distance restarts from where the previous
 * range ended, so a run joined from separate laps reads as one continuous distance.
 */
export function combineRanges (series: ActivitySeries, ranges: IndexRange[]): CombinedSeries {
  const out: CombinedSeries = {
    time: [], power: [], altitude: [], speed: [], airspeed: [], distance: [], location: [], breaks: [], runDistance: []
  }
  let offset = 0
  ranges.forEach((range, k) => {
    if (k > 0) out.breaks.push(out.time.length)
    const distance = sliceRange(series.distance, range)
    const start = distance[0] ?? 0
    out.time.push(...sliceRange(series.time, range))
    out.power.push(...sliceRange(series.power, range))
    out.altitude.push(...sliceRange(series.altitude, range))
    out.speed.push(...sliceRange(series.speed, range))
    out.airspeed.push(...sliceRange(series.airspeed, range))
    out.distance.push(...distance)
    out.location.push(...sliceRange(series.location, range))
    out.runDistance.push(...distance.map((d) => offset + d - start))
    offset += (distance[distance.length - 1] ?? start) - start
  })
  return out
}

/** Combines the points recorded in time windows (saved segment ranges); windows without data are skipped. */
export function combineWindows (series: ActivitySeries, windows: Array<{ start: Date, end: Date }>): CombinedSeries | undefined {
  const ranges = rangesForWindows(series.time, windows)
  return ranges.length ? combineRanges(series, ranges) : undefined
}
