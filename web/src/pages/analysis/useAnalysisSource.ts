import { useQuery } from '@tanstack/react-query'
import { useActivityData, type ActivityData } from '../../data/activityData'
import { getSegment, type Segment, type StoredLap } from '../../data/segments'
import { useUserPrefs } from '../../data/userPrefs'
import type { ActivitySeries } from '../../core/activitySeries'
import { rangeFromAxis, sliceRange } from '../../core/selection'

export interface AnalysisSource {
  series: ActivitySeries
  laps: StoredLap[]
  defaultName: string
  segment?: Segment
}

/** Laps in the stored shape, so new segments stay readable by the legacy app. */
function storedLaps (data: ActivityData): StoredLap[] {
  return data.laps.map((lap) => ({
    start_time: lap.start.toISOString(),
    total_elapsed_time: lap.elapsedTime,
    total_distance: lap.distance,
    start_distance: lap.startDistance,
    avg_power: lap.averagePower,
    avg_speed: lap.averageSpeed
  }))
}

function sliceSeries (series: ActivitySeries, from: number, to: number): ActivitySeries | undefined {
  const range = rangeFromAxis(series.time.map((t) => t.getTime()), from, to)
  if (!range) return undefined
  return {
    time: sliceRange(series.time, range),
    power: sliceRange(series.power, range),
    altitude: sliceRange(series.altitude, range),
    speed: sliceRange(series.speed, range),
    airspeed: sliceRange(series.airspeed, range),
    distance: sliceRange(series.distance, range),
    location: sliceRange(series.location, range)
  }
}

/**
 * The data being analysed: a time range of the activity, or a saved segment. Saved segments use
 * their own copy of the series, so they reproduce exactly what was saved.
 */
export function useAnalysisSource (activityId: string, segmentId: string | undefined, from: number, to: number, name: string) {
  const { prefs, isLoading: prefsLoading } = useUserPrefs()
  const segmentQuery = useQuery({
    queryKey: ['segment', segmentId, prefs.units],
    queryFn: () => getSegment(segmentId!, prefs.units),
    enabled: !!segmentId && !prefsLoading
  })
  const segment = segmentQuery.data
  // saved segments without their own series fall back to the activity
  const needActivity = !segmentId || (segmentQuery.isSuccess && !segment?.series)
  const activityQuery = useActivityData(activityId, { enabled: needActivity })

  if (segmentId && segmentQuery.isSuccess && !segment) return { error: new Error('This analysis no longer exists.') }
  const error = segmentQuery.error ?? (needActivity ? activityQuery.error : null)
  if (error) return { error }

  if (segment?.series) {
    const source: AnalysisSource = { series: segment.series, laps: segment.laps, defaultName: segment.name, segment }
    return { source }
  }
  const data = activityQuery.data
  if (!data || (segmentId && !segment)) return { loading: true }

  const range = segment ? [segment.rangeStart.getTime(), segment.rangeEnd.getTime()] : [from, to]
  const series = sliceSeries(data.series, range[0], range[1])
  if (!series) return { error: new Error('The selected range has too few points to analyze.') }
  const source: AnalysisSource = { series, laps: storedLaps(data), defaultName: segment?.name ?? name, segment }
  return { source }
}
