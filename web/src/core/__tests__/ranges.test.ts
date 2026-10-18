import { describe, expect, it } from 'vitest'
import { combineRanges, combineWindows } from '../ranges'
import { virtualElevation } from '../virtualElevation'
import { fitParameters } from '../fit'
import type { ActivitySeries } from '../activitySeries'

const G = 9.81
const P = { rho: 1.2, mass: 80, crr: 0.004, cda: 0.26 }

/** One leg at constant ground speed into a constant head/tailwind, with power that keeps VE flat. */
function leg (startS: number, seconds: number, speed: number, wind: number, startKm: number) {
  const v = speed / 3.6
  const vair = (speed + wind) / 3.6
  const watts = P.crr * P.mass * G * v + 0.5 * P.cda * P.rho * vair * Math.abs(vair) * v
  return Array.from({ length: seconds }, (_, i) => ({
    time: new Date((startS + i) * 1000), power: watts, speed, airspeed: speed + wind, altitude: 50, distance: startKm + (v * i) / 1000
  }))
}

function toSeries (points: ReturnType<typeof leg>): ActivitySeries {
  return {
    time: points.map((p) => p.time),
    power: points.map((p) => p.power),
    speed: points.map((p) => p.speed),
    airspeed: points.map((p) => p.airspeed),
    altitude: points.map((p) => p.altitude),
    distance: points.map((p) => p.distance),
    location: points.map(() => null)
  }
}

// out at 44 km/h with a tailwind, a slow turnaround, back at 36 km/h into the wind
const out = leg(0, 200, 44, -8, 0)
const turn = leg(200, 40, 20, 0, 2.44)
const back = leg(240, 240, 36, 8, 2.66)
const ride = toSeries([...out, ...turn, ...back])

describe('combineRanges', () => {
  const run = combineRanges(ride, [{ start: 0, end: 199 }, { start: 240, end: 479 }])

  it('joins ranges, marks the join and keeps run distance continuous', () => {
    expect(run.time).toHaveLength(440)
    expect(run.breaks).toEqual([200])
    expect(run.runDistance[0]).toBe(0)
    expect(run.runDistance[200]).toBeCloseTo(run.runDistance[199], 9)
    expect(run.runDistance[439]).toBeCloseTo((199 * 44 / 3.6 + 239 * 36 / 3.6) / 1000, 9)
    expect(run.distance[200]).toBe(ride.distance[240])
  })

  it('holds VE level across the join despite the speed change', () => {
    const ve = virtualElevation({ ...run, elevation: run.altitude }, P)
    ve.forEach((v) => expect(v).toBeCloseTo(50, 6))
  })

  it('matters for adjacent legs, where no pause separates them', () => {
    // back-to-back laps: the 44 → 36 km/h change happens between consecutive seconds
    const adjacent = toSeries([...out, ...leg(200, 240, 36, 8, 2.44)])
    const run2 = combineRanges(adjacent, [{ start: 0, end: 199 }, { start: 200, end: 439 }])
    const held = virtualElevation({ ...run2, elevation: run2.altitude }, P)
    held.forEach((v) => expect(v).toBeCloseTo(50, 6))
    // integrating across the join instead turns the lost kinetic energy into a ~2.5 m climb
    const naive = virtualElevation({ ...run2, elevation: run2.altitude, breaks: [] }, P)
    expect(naive[200] - 50).toBeCloseTo(((44 / 3.6) ** 2 - (36 / 3.6) ** 2) / (2 * G), 6)
  })

  it('lets the fit recover CdA from closure of the out-and-back run', () => {
    const series = { ...run, elevation: run.altitude }
    const fit = fitParameters(series, { ...P, cda: 0.4 }, { kind: 'loops', loops: [{ start: 0, end: run.time.length - 1 }] })
    expect(fit.cda).toBeCloseTo(P.cda, 3)
  })

  it('combines saved time windows, skipping empty ones', () => {
    const run2 = combineWindows(ride, [
      { start: new Date(0), end: new Date(199_000) },
      { start: new Date(9_000_000), end: new Date(9_100_000) },
      { start: new Date(240_000), end: new Date(479_000) }
    ])!
    expect(run2.breaks).toEqual([200])
    expect(combineWindows(ride, [{ start: new Date(9e6), end: new Date(9.1e6) }])).toBeUndefined()
  })
})
