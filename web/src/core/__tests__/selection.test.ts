import { describe, expect, it } from 'vitest'
import { lapRange, lowerBound, rangeFromAxis, rangeStats, sliceRange } from '../selection'

describe('selection', () => {
  it('finds indexes on an ascending axis', () => {
    const x = [0, 10, 20, 30, 40]
    expect(lowerBound(x, 15)).toBe(2)
    expect(lowerBound(x, -5)).toBe(0)
    expect(lowerBound(x, 99)).toBe(5)
    expect(rangeFromAxis(x, 10, 30)).toEqual({ start: 1, end: 3 })
    expect(rangeFromAxis(x, 35, 5)).toEqual({ start: 1, end: 3 })
    expect(rangeFromAxis(x, 11, 19)).toBeUndefined()
    expect(rangeFromAxis(x, -100, 100)).toEqual({ start: 0, end: 4 })
  })

  it('finds lap ranges', () => {
    const laps = [1, 1, 1, 2, 2, 3]
    expect(lapRange(laps, 2)).toEqual({ start: 3, end: 4 })
    expect(lapRange(laps, 3)).toBeUndefined()
    expect(lapRange(laps, 9)).toBeUndefined()
    expect(sliceRange(['a', 'b', 'c', 'd'], { start: 1, end: 2 })).toEqual(['b', 'c'])
  })

  it('computes range statistics over moving time', () => {
    const t0 = Date.UTC(2026, 0, 1)
    const seconds = [0, 1, 2, 3, 63, 64]
    const series = {
      time: seconds.map((s) => new Date(t0 + s * 1000)),
      power: [0, 200, 220, 240, 300, 260],
      speed: [0, 30, 36, 36, 20, 36],
      distance: [0, 0.01, 0.02, 0.03, 0.03, 0.04],
      altitude: [100, 101, 100, 102, 102, 101]
    }
    const stats = rangeStats(series, { start: 0, end: 5 })
    expect(stats.duration).toBe(64)
    expect(stats.distance).toBeCloseTo(0.04, 12)
    // the 60 s gap is excluded from moving time: (200 + 220 + 240 + 260) / 4
    expect(stats.averagePower).toBe(230)
    expect(stats.averageSpeed).toBeCloseTo(0.04 / (4 / 3600), 9)
    expect(stats.maxPower).toBe(300)
    expect(stats.elevationGain).toBe(3)
  })
})

describe('rangesForWindows', () => {
  it('maps time windows to index ranges', async () => {
    const { rangesForWindows } = await import('../selection')
    const time = [0, 1, 2, 3, 4, 5].map((s) => new Date(s * 1000))
    expect(rangesForWindows(time, [
      { start: new Date(-5000), end: new Date(1000) },
      { start: new Date(2000), end: new Date(2500) },
      { start: new Date(3000), end: new Date(9000) }
    ])).toEqual([{ start: 0, end: 1, window: 0 }, { start: 3, end: 5, window: 2 }])
  })
})

describe('multiRangeStats', () => {
  it('adds totals and weights averages by moving time', async () => {
    const { multiRangeStats, rangeStats } = await import('../selection')
    const t0 = Date.UTC(2026, 0, 1)
    const series = {
      time: Array.from({ length: 10 }, (_, i) => new Date(t0 + i * 1000)),
      power: [100, 100, 100, 100, 100, 0, 300, 300, 300, 300],
      speed: [36, 36, 36, 36, 36, 0, 18, 18, 18, 18],
      distance: [0, 0.01, 0.02, 0.03, 0.04, 0.04, 0.045, 0.05, 0.055, 0.06],
      altitude: Array(10).fill(10)
    }
    const a = { start: 0, end: 4 }
    const b = { start: 6, end: 9 }
    const both = multiRangeStats(series, [a, b])
    expect(both.distance).toBeCloseTo(0.04 + 0.015, 12)
    expect(both.duration).toBe(4 + 3)
    expect(both.averagePower).toBeCloseTo((100 * 4 + 300 * 3) / 7, 9)
    expect(both.averageSpeed).toBeCloseTo(0.055 / (7 / 3600), 9)
    expect(multiRangeStats(series, [a])).toEqual(rangeStats(series, a))
  })
})
