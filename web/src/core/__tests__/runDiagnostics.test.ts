import { describe, expect, it } from 'vitest'
import { combineRanges } from '../ranges'
import { runDiagnostics } from '../runDiagnostics'
import type { ActivitySeries } from '../activitySeries'

const G = 9.81
const P = { rho: 1.2, mass: 80, crr: 0.004, cda: 0.26 }

/** A leg at constant ground speed into a constant head or tailwind, with the power that keeps VE flat. */
function leg (startS: number, seconds: number, speed: number, wind: number) {
  const v = speed / 3.6
  const vair = (speed + wind) / 3.6
  const watts = P.crr * P.mass * G * v + 0.5 * P.cda * P.rho * vair * Math.abs(vair) * v
  return Array.from({ length: seconds }, (_, i) => ({ t: startS + i, watts, speed, air: speed + wind }))
}

// out with a tailwind, a turnaround, back into the wind; air speed measured
const points = [...leg(0, 200, 44, -8), ...leg(200, 40, 20, 0), ...leg(240, 240, 36, 8)]
let km = 0
const ride: ActivitySeries = {
  time: points.map((p) => new Date(p.t * 1000)),
  power: points.map((p) => p.watts),
  speed: points.map((p) => p.speed),
  airspeed: points.map((p) => p.air),
  altitude: points.map(() => 50),
  distance: points.map((p) => (km += p.speed / 3600)),
  location: points.map(() => null)
}
const run = combineRanges(ride, [{ start: 0, end: 199 }, { start: 240, end: 479 }])
const series = { ...run, elevation: run.altitude }
const closure = { kind: 'loops' as const, loops: [{ start: 0, end: run.time.length - 1 }] }

describe('runDiagnostics', () => {
  it('reports a run that closes at the true CdA, per leg', () => {
    const d = runDiagnostics(series, P, closure)
    expect(d.partsKind).toBe('legs')
    expect(d.parts).toHaveLength(2)
    expect(d.parts[0].averageSpeed).toBeCloseTo(44, 6)
    expect(d.parts[0].averageAirspeed).toBeCloseTo(36, 6)
    expect(d.parts[1].averageAirspeed).toBeCloseTo(44, 6)
    expect(d.parts[0].virtualElevationChange).toBeCloseTo(0, 6)
    expect(d.closureError).toBeCloseTo(0, 6)
    expect(d.fittedCda).toBeCloseTo(0.26, 3)
    expect(d.fittedAtBound).toBe(false)
    expect(d.duration).toBe(479)
  })

  it('shows the drift of a wrong CdA leg by leg', () => {
    const d = runDiagnostics(series, { ...P, cda: 0.22 }, closure)
    // too little drag modelled: the leftover power climbs on both legs
    expect(d.parts[0].virtualElevationChange).toBeGreaterThan(0.5)
    expect(d.parts[1].virtualElevationChange).toBeGreaterThan(0.5)
    expect(d.closureError).toBeGreaterThan(1)
    expect(d.fittedCda).toBeCloseTo(0.26, 3)
  })

  it('measures how far CdA moves with each input', () => {
    const { sensitivity } = runDiagnostics(series, P, closure)
    // more mass or Crr explains more of the power as rolling resistance: less left for drag
    expect(sensitivity.massPlus1kg).toBeLessThan(0)
    expect(sensitivity.crrPlus00005).toBeLessThan(0)
    // more power, or the same drag at lower density, means a larger CdA
    expect(sensitivity.powerPlus1Percent).toBeGreaterThan(0)
    expect(sensitivity.rhoPlus001).toBeLessThan(0)
    // faster air: the same drag from a smaller CdA
    expect(sensitivity.airspeedPlus2kmh).toBeLessThan(0)
    expect(Math.abs(sensitivity.powerPlus1Percent)).toBeGreaterThan(0.002)
  })

  it('splits a single range into thirds and counts data problems', () => {
    const single = { ...ride, elevation: ride.altitude, breaks: [] }
    const gappy = { ...single, time: single.time.map((t, i) => new Date(t.getTime() + (i >= 100 ? 30_000 : 0))), power: single.power.map((w, i) => (i % 10 === 0 ? 0 : w)) }
    const d = runDiagnostics(gappy, P, { kind: 'elevation' })
    expect(d.partsKind).toBe('thirds')
    expect(d.parts).toHaveLength(3)
    expect(d.dataQuality.gaps).toBe(1)
    expect(d.dataQuality.zeroPowerWhileMoving).toBeCloseTo(10, 0)
  })
})
