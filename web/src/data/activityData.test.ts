import { describe, expect, it } from 'vitest'
import { fetchActivityData, toActivityData } from './activityData'

const t0 = Date.UTC(2026, 4, 1, 8)
const points = Array.from({ length: 6 }, (_, i) => ({
  lap: i < 3 ? 1 : 2,
  timestamp: new Date(t0 + i * 1000).toISOString(),
  distance: i * 0.01,
  power: 200 + i * 10,
  altitude: 0.1,
  speed: 36
}))

describe('toActivityData', () => {
  it('keeps lap summaries from the file and fills missing ones from the points', () => {
    const data = toActivityData({
      timestamp: points[0].timestamp,
      start_time: points[0].timestamp,
      total_elapsed_time: 5,
      total_distance: 0.05,
      avg_power: '225',
      avg_speed: 36,
      laps: [
        { start_time: points[0].timestamp, total_elapsed_time: 3, total_distance: 0.03, start_distance: 0, avg_power: 210, avg_speed: '36.0' },
        { start_time: points[3].timestamp }
      ],
      points
    })
    expect(data.averagePower).toBe(225)
    expect(data.laps[0]).toMatchObject({ number: 1, elapsedTime: 3, distance: 0.03, averagePower: 210, averageSpeed: 36 })
    expect(data.laps[1]).toMatchObject({ number: 2, elapsedTime: 2, startDistance: 0.03, averagePower: 245 })
    expect(data.laps[1].distance).toBeCloseTo(0.02, 12)
    expect(data.lapOfPoint).toEqual([1, 1, 1, 2, 2, 2])
    expect(data.series.altitude[0]).toBeCloseTo(100, 9)
  })
})

describe('fetchActivityData', () => {
  const user = { getIdToken: async () => 'token' } as never

  it('sends the ID token and reports missing activities', async () => {
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toMatch(/\/activity\/abc%2Fdef$/)
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token')
      return new Response('nope', { status: 404 })
    }
    await expect(fetchActivityData(user, 'abc/def', fetchFn as typeof fetch)).rejects.toThrow('Activity not found.')
  })
})
