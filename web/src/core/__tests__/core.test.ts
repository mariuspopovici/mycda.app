import { describe, expect, it } from 'vitest'
import { toActivitySeries } from '../activitySeries'
import { findLoops, precisionDigits } from '../loopFinder'
import { compareToBaseline, summarizeCdA } from '../segmentStats'
import { virtualElevation } from '../virtualElevation'
import { bearing, windModelAirSpeed, yaw } from '../windModel'
import { CSV_FIXTURES, circuitTrack, loadActivityPoints } from './fixtures'

const round = (values: number[]) => values.map((v) => Math.round(v * 1e6) / 1e6)

describe('virtualElevation', () => {
  it('stays flat when power exactly balances rolling and aero resistance', () => {
    const params = { rho: 1.2, mass: 80, crr: 0.004, cda: 0.25 }
    const v = 40 / 3.6
    const watts = (params.crr * params.mass * 9.81 + 0.5 * params.cda * params.rho * v ** 2) * v
    const n = 120
    const ve = virtualElevation({
      power: Array(n).fill(watts),
      speed: Array(n).fill(40),
      airspeed: Array(n).fill(40),
      elevation: Array(n).fill(100),
      time: Array.from({ length: n }, (_, i) => i * 1000),
      units: 'metric'
    }, params)
    ve.forEach((e) => expect(e).toBeCloseTo(100, 9))
  })

  it('climbs when there is surplus power', () => {
    const n = 60
    const ve = virtualElevation({
      power: Array(n).fill(400),
      speed: Array(n).fill(20),
      airspeed: Array(n).fill(20),
      elevation: Array(n).fill(0),
      time: Array.from({ length: n }, (_, i) => i * 1000),
      units: 'metric'
    }, { rho: 1.2, mass: 80, crr: 0.004, cda: 0.25 })
    expect(ve[n - 1]).toBeGreaterThan(ve[1])
  })

  for (const fixture of CSV_FIXTURES) {
    it(`matches golden output for ${fixture}`, async () => {
      const s = toActivitySeries(await loadActivityPoints(fixture))
      const ve = virtualElevation(
        { ...s, elevation: s.altitude, units: 'metric', drivetrainLoss: 2 },
        { rho: 1.2, mass: 80, crr: 0.005, cda: 0.3 }
      )
      expect(round(ve)).toMatchSnapshot()
    })
  }
})

describe('toActivitySeries', () => {
  it('converts altitude from km to m and falls back to ground speed for air speed', () => {
    const s = toActivitySeries([
      { lap: 1, timestamp: '2026-01-01T10:00:00Z', power: 250, altitude: 0.1234, speed: 36, distance: 0.01 },
      { lap: 1, timestamp: '2026-01-01T10:00:01Z', power: 260, altitude: null, speed: 37, airspeed: 40 }
    ])
    expect(s.altitude[0]).toBeCloseTo(123.4, 9)
    expect(s.altitude[1]).toBe(0)
    expect(s.airspeed).toEqual([36, 40])
    expect(s.distance).toEqual([0.01, 0])
    expect(s.location).toEqual([])
  })

  it('does not crash on a spike before any good reading', () => {
    expect(toActivitySeries([{ lap: 1, timestamp: '2026-01-01T10:00:00Z', power: 5000 }]).power).toEqual([0])
  })
})

describe('wind model', () => {
  it('adds a direct headwind and subtracts a tailwind', () => {
    expect(yaw(30, 10, 0)).toEqual({ airspeed: 40, yaw: 0 })
    expect(yaw(30, 10, 180)).toEqual({ airspeed: 20, yaw: 0 })
  })

  it('computes compass bearings', () => {
    const origin = { lat: 45, lng: -73 }
    expect(bearing(origin, { lat: 45.01, lng: -73 })).toBe(0)
    expect(bearing(origin, { lat: 45, lng: -72.99 })).toBe(89)
    expect(bearing(origin, { lat: 44.99, lng: -73 })).toBe(180)
  })

  it('riding north into a north wind is a headwind', () => {
    const track = Array.from({ length: 30 }, (_, i) => ({ lat: 45 + i * 0.0001, lng: -73 }))
    const result = windModelAirSpeed(track, Array(30).fill(30), Array(30).fill(10), Array(30).fill(0))
    result.forEach((p) => expect(p.airspeed).toBeCloseTo(40, 9))
  })

  it('handles tracks shorter than the 10-point bearing window', () => {
    const track = [{ lat: 45, lng: -73 }, { lat: 45.001, lng: -73 }]
    expect(windModelAirSpeed(track, [30, 30], [10, 10], [0, 0])).toHaveLength(2)
  })
})

describe('findLoops', () => {
  it('finds each lap of a circuit', () => {
    const loops = findLoops(circuitTrack(4), precisionDigits('medium'), 100, 200)
    expect(loops.map((l) => [l.startIndex, l.endIndex])).toEqual([[0, 150], [151, 301], [302, 452]])
  })
})

describe('segment stats', () => {
  it('summarizes CdA values', () => {
    const summary = summarizeCdA([0.3, 0.32, 0.28])!
    expect(summary.mean).toBeCloseTo(0.3, 12)
    expect(summary.standardDeviation).toBeCloseTo(Math.sqrt(0.0008 / 3), 12)
    expect(summary.coefficientOfVariation).toBeCloseTo((Math.sqrt(0.0008 / 3) / 0.3) * 100, 9)
    expect(summarizeCdA([])).toBeUndefined()
  })

  it('compares a segment to the baseline', () => {
    const c = compareToBaseline(0.3, 0.29)
    expect(c.cdaDelta).toBeCloseTo(0.01, 12)
    expect(c.wattsSaved).toBeCloseTo(10, 9)
    expect(c.seconds40k).toBe(40)
    expect(c.cdaDeltaPct).toBeCloseTo((0.01 / 0.295) * 100, 9)
  })
})
