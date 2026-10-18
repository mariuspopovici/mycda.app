import { describe, expect, it } from 'vitest'
import type { ActivitySeries } from '../activitySeries'
import { detectTests, evaluateTest, haversineKm, lapGeometries, type LapGeometry } from '../testRuns'
import type { LatLng } from '../windModel'

const ORIGIN = { lat: 45.5, lng: -73.6 }
const KM_LAT = 1 / 111.2
/** A point `north` km north and `east` km east of ORIGIN. */
const at = (north: number, east = 0): LatLng => ({ lat: ORIGIN.lat + north * KM_LAT, lng: ORIGIN.lng + east * KM_LAT / Math.cos(ORIGIN.lat * Math.PI / 180) })

let next = 0
const lap = (number: number, distance: number, start: LatLng, end: LatLng): LapGeometry =>
  ({ number, distance, start, end, range: { start: next, end: (next += 10) } })

describe('haversineKm', () => {
  it('measures a km north', () => expect(haversineKm(at(0), at(1))).toBeCloseTo(1, 2))
})

describe('detectTests', () => {
  it('pairs out and back legs across turnaround laps', () => {
    const laps = [
      lap(1, 4, at(0), at(0.3)), // warm-up loop: not a test in a ride with out and backs
      lap(2, 2.5, at(0), at(2.5)),
      lap(3, 0.2, at(2.5), at(2.5, 0.05)), // turnaround
      lap(4, 2.5, at(2.5, 0.05), at(0.02)),
      lap(5, 0.35, at(0), at(0.01)), // recovery loop
      lap(6, 0.7, at(0), at(0.7)),
      lap(7, 0.72, at(0.7), at(0))
    ]
    expect(detectTests(laps)).toEqual([[2, 4], [6, 7]])
  })

  it("doesn't pair legs of different lengths, the same direction, or ending far from the start", () => {
    expect(detectTests([lap(1, 2.5, at(0), at(2.5)), lap(2, 1.5, at(2.5), at(1))])).toEqual([])
    expect(detectTests([lap(1, 2.5, at(0), at(2.5)), lap(2, 2.5, at(2.5), at(5))])).toEqual([])
    expect(detectTests([lap(1, 2.5, at(0), at(2.5)), lap(2, 2.5, at(2.5, 1), at(0, 1))])).toEqual([])
  })

  it('looks only a few laps ahead for the back leg', () => {
    const laps = [lap(1, 2.5, at(0), at(2.5)), ...[2, 3, 4, 5, 6].map((n) => lap(n, 0.1, at(2.5), at(2.5))), lap(7, 2.5, at(2.5), at(0))]
    expect(detectTests(laps)).toEqual([])
  })

  it('takes closed laps as tests when there are no out and backs, leaving out short ones', () => {
    const laps = [lap(1, 3, at(0), at(0.01)), lap(2, 0.5, at(0), at(0.01)), lap(3, 3.1, at(0), at(0)), lap(4, 2.9, at(0), at(0.02))]
    expect(detectTests(laps)).toEqual([[1], [3], [4]])
  })

  it('needs GPS', () => {
    expect(detectTests([{ number: 1, distance: 3, range: { start: 0, end: 5 } }])).toEqual([])
  })
})

describe('lapGeometries', () => {
  it('uses the first and last fix of each lap', () => {
    const series = {
      time: [], power: [], speed: [], airspeed: [], altitude: [],
      distance: [0, 1, 2, 3, 4],
      location: [null, at(0), at(1), at(2), null]
    } as unknown as ActivitySeries
    expect(lapGeometries(series, [1, 1, 1, 2, 2], [1, 2, 3])).toEqual([
      { number: 1, range: { start: 0, end: 2 }, distance: 2, start: at(0), end: at(1) },
      { number: 2, range: { start: 3, end: 4 }, distance: 1, start: at(2), end: at(2) }
    ])
  })
})

describe('evaluateTest', () => {
  const G = 9.81
  const P = { rho: 1.2, mass: 80, crr: 0.004, cda: 0.26 }
  // out with a tailwind and back into it, power from the true CdA, measured air speed
  const leg = (startS: number, seconds: number, speed: number, wind: number) => {
    const v = speed / 3.6
    const vair = (speed + wind) / 3.6
    const watts = P.crr * P.mass * G * v + 0.5 * P.cda * P.rho * vair * Math.abs(vair) * v
    return Array.from({ length: seconds }, (_, i) => ({ t: startS + i, watts, speed, air: speed + wind }))
  }
  const points = [...leg(0, 200, 44, -8), ...leg(200, 40, 20, 0), ...leg(240, 240, 36, 8)]
  let km = 0
  const series: ActivitySeries = {
    time: points.map((p) => new Date(p.t * 1000)),
    power: points.map((p) => p.watts),
    speed: points.map((p) => p.speed),
    airspeed: points.map((p) => p.air),
    altitude: points.map(() => 50),
    distance: points.map((p) => (km += p.speed / 3600)),
    location: points.map(() => null)
  }

  it('fits the CdA that closes the run and reports its stats', () => {
    const result = evaluateTest(series, [{ start: 0, end: 199 }, { start: 240, end: 479 }], { ...P, dloss: 0 })
    expect(result.cda).toBeCloseTo(0.26, 3)
    expect(Math.abs(result.closureError)).toBeLessThan(0.01)
    expect(result.stats.duration).toBe(199 + 239)
  })
})
