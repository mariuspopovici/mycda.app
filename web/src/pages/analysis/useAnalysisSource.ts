import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { toActivity, type Activity } from '../../data/activities'
import { useActivityData } from '../../data/activityData'
import { getSegment, type AirspeedSource, type ManualWind, type Segment, type TimeRange } from '../../data/segments'
import { useUserPrefs } from '../../data/userPrefs'
import { combineRanges, combineWindows, type CombinedSeries } from '../../core/ranges'

export interface AnalysisSource {
  series: CombinedSeries
  /** The ranges being analysed, saved with the segment. */
  ranges: TimeRange[]
  /** Lap windows, for the laps overlay. */
  laps: TimeRange[]
  defaultName: string
  activity?: Activity
  segment?: Segment
}

/** Encodes ranges for the analysis URL: `from-to,from-to` in epoch ms. */
export const encodeRanges = (ranges: TimeRange[]) => ranges.map((r) => `${r.start.getTime()}-${r.end.getTime()}`).join(',')

/** Starting values passed to a new analysis, e.g. by the tests table. Metric. */
export interface AnalysisStart {
  mass?: number
  rho?: number
  crr?: number
  dloss?: number
  airspeedSource?: AirspeedSource
  wind?: ManualWind
}

/** URL of a new analysis of the given ranges. */
export function analysisUrl (activityId: string, ranges: TimeRange[], name: string, start: AnalysisStart = {}) {
  const params = new URLSearchParams({ ranges: encodeRanges(ranges), name })
  for (const key of ['mass', 'rho', 'crr', 'dloss'] as const) {
    if (start[key] !== undefined) params.set(key, String(start[key]))
  }
  if (start.airspeedSource) params.set('airspeed', start.airspeedSource)
  if (start.wind) params.set('wind', `${start.wind.speed},${start.wind.direction}${start.wind.atRiderHeight ? ',rider' : ''}`)
  return `/activity/${activityId}/analysis?${params}`
}

/** Reads the starting values set by analysisUrl; anything invalid is ignored. */
export function parseAnalysisStart (params: URLSearchParams): AnalysisStart {
  const number = (key: string) => {
    const n = Number(params.get(key) ?? NaN)
    return Number.isFinite(n) && n >= 0 ? n : undefined
  }
  const airspeed = params.get('airspeed')
  const [speedText, directionText, height] = (params.get('wind') ?? '').split(',')
  const speed = Number(speedText)
  const direction = Number(directionText)
  return {
    mass: number('mass'),
    rho: number('rho'),
    crr: number('crr'),
    dloss: number('dloss'),
    airspeedSource: ['measured', 'ground', 'wind', 'manual'].includes(airspeed ?? '') ? airspeed as AirspeedSource : undefined,
    wind: speedText && directionText && Number.isFinite(speed) && Number.isFinite(direction)
      ? { speed, direction, ...(height === 'rider' ? { atRiderHeight: true } : {}) }
      : undefined
  }
}

/** Parses `ranges` (or the legacy single `from`/`to` pair) from the analysis URL. */
export function parseRanges (params: URLSearchParams): TimeRange[] {
  const encoded = params.get('ranges')
  const pairs = encoded
    ? encoded.split(',').map((pair) => pair.split('-').map(Number))
    : [[Number(params.get('from')), Number(params.get('to'))]]
  return pairs
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .map(([a, b]) => ({ start: new Date(a), end: new Date(b) }))
}

/**
 * The data being analysed: ranges of the activity (one, or several joined into a run), or a saved
 * segment. Version 2 segments read their ranges from the activity; legacy segments reproduce the
 * series they copied.
 */
export function useAnalysisSource (activityId: string, segmentId: string | undefined, ranges: TimeRange[], name: string) {
  const { prefs, isLoading: prefsLoading } = useUserPrefs()
  const segmentQuery = useQuery({
    queryKey: ['segment', segmentId, prefs.units],
    queryFn: () => getSegment(segmentId!, prefs.units),
    enabled: !!segmentId && !prefsLoading
  })
  const activityQuery = useQuery({
    queryKey: ['activityDoc', activityId],
    queryFn: async () => {
      const snapshot = await getDoc(doc(db, 'activities', activityId))
      return snapshot.exists() ? toActivity(snapshot.id, snapshot.data()) : undefined
    }
  })
  const segment = segmentQuery.data
  const legacySeries = segment?.series
  const needData = !segmentId || (segmentQuery.isSuccess && !!segment && !legacySeries)
  const dataQuery = useActivityData(activityId, { enabled: needData })

  if (segmentId && segmentQuery.isSuccess && !segment) return { error: new Error('This analysis no longer exists.') }
  const error = segmentQuery.error ?? activityQuery.error ?? (needData ? dataQuery.error : null)
  if (error) return { error }
  if (activityQuery.isLoading || (segmentId && !segmentQuery.isSuccess)) return { loading: true }
  const activity = activityQuery.data ?? undefined

  if (segment && legacySeries) {
    const source: AnalysisSource = {
      series: combineRanges(legacySeries, [{ start: 0, end: legacySeries.time.length - 1 }]),
      ranges: segment.ranges,
      laps: segment.laps.map((lap) => {
        const start = new Date(lap.start_time)
        return { start, end: new Date(start.getTime() + (Number(lap.total_elapsed_time) || 0) * 1000) }
      }),
      defaultName: segment.name,
      activity,
      segment
    }
    return { source }
  }

  const data = dataQuery.data
  if (!data) return { loading: true }
  const wanted = segment ? segment.ranges : ranges
  const series = combineWindows(data.series, wanted)
  if (!series || series.time.length < 2) return { error: new Error('The selected range has too few points to analyze.') }
  const source: AnalysisSource = {
    series,
    ranges: wanted,
    laps: data.laps.map((lap) => ({ start: lap.start, end: new Date(lap.start.getTime() + lap.elapsedTime * 1000) })),
    defaultName: segment?.name ?? name,
    activity,
    segment
  }
  return { source }
}
