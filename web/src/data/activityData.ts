/**
 * Parsed activity data from `GET /api/activity/:id` (docs/architecture/data-model.md).
 */
import { useQuery } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { useUser } from '../auth/AuthContext'
import { apiUrl } from '../firebase'
import { toActivitySeries, type ActivityPoint, type ActivitySeries } from '../core/activitySeries'
import { lapRange, rangeStats } from '../core/selection'

export interface Lap {
  number: number
  start: Date
  /** s */
  elapsedTime: number
  /** km */
  distance: number
  /** km from the start of the ride */
  startDistance: number
  averagePower?: number
  averageSpeed?: number
}

export interface ActivityData {
  start: Date
  /** s */
  elapsedTime: number
  /** km */
  distance: number
  averagePower?: number
  averageSpeed?: number
  laps: Lap[]
  series: ActivitySeries
  /** Lap number (1-based) of each point. */
  lapOfPoint: number[]
}

interface ApiLap {
  start_time: string
  total_elapsed_time?: number
  total_distance?: number
  start_distance?: number
  avg_power?: number | string
  avg_speed?: number | string
}

interface ApiActivity {
  timestamp: string
  start_time: string
  total_elapsed_time?: number
  total_distance?: number
  avg_power?: number | string
  avg_speed?: number | string
  laps: ApiLap[]
  points: ActivityPoint[]
}

const num = (value: unknown) => {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

/** Lap summaries from the file, with gaps filled in from the lap's points. */
function toLaps (body: ApiActivity, series: ActivitySeries, lapOfPoint: number[]): Lap[] {
  return body.laps.map((lap, i) => {
    const range = lapRange(lapOfPoint, i + 1)
    const stats = range && rangeStats(series, range)
    return {
      number: i + 1,
      start: new Date(lap.start_time),
      elapsedTime: num(lap.total_elapsed_time) ?? stats?.duration ?? 0,
      distance: num(lap.total_distance) || stats?.distance || 0,
      startDistance: num(lap.start_distance) ?? (range ? series.distance[range.start] : 0),
      averagePower: num(lap.avg_power) ?? stats?.averagePower,
      averageSpeed: num(lap.avg_speed) ?? stats?.averageSpeed
    }
  })
}

export function toActivityData (body: ApiActivity): ActivityData {
  const series = toActivitySeries(body.points)
  const lapOfPoint = body.points.map((p) => p.lap)
  return {
    start: new Date(body.start_time ?? body.timestamp),
    elapsedTime: num(body.total_elapsed_time) ?? 0,
    distance: num(body.total_distance) ?? series.distance.at(-1) ?? 0,
    averagePower: num(body.avg_power),
    averageSpeed: num(body.avg_speed),
    laps: toLaps(body, series, lapOfPoint),
    series,
    lapOfPoint
  }
}

export async function fetchActivityData (user: User, id: string, fetchFn: typeof fetch = fetch): Promise<ActivityData> {
  const token = await user.getIdToken()
  const response = await fetchFn(`${apiUrl}/activity/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (response.status === 404) throw new Error('Activity not found.')
  if (!response.ok) throw new Error(`Couldn't load the activity data (${response.status}).`)
  return toActivityData(await response.json())
}

/** Activity data, cached for the session: files don't change once processed. */
export function useActivityData (id: string, options: { enabled?: boolean } = {}) {
  const user = useUser()
  return useQuery({
    queryKey: ['activityData', id],
    queryFn: () => fetchActivityData(user, id),
    enabled: options.enabled ?? true,
    staleTime: Infinity,
    gcTime: 30 * 60_000
  })
}
