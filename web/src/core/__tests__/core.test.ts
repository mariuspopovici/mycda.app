import { describe, expect, it } from 'vitest'
import { hasLocation, toActivitySeries } from '../activitySeries'
import { findLoops, precisionDigits } from '../loopFinder'
import { compareToBaseline, summarizeCdA } from '../segmentStats'
import { kgPerM3ToLbPerFt3, lbPerFt3ToKgPerM3 } from '../units'
import { MAX_INTEGRATION_GAP_SECONDS, virtualElevation } from '../virtualElevation'
import { windAt } from '../weather'
import { bearing, riderHeightFactor, travelBearings, windModelAirSpeed, yaw } from '../windModel'
import { CSV_FIXTURES, circuitTrack, loadActivityPoints } from './fixtures'

const round = (values: number[]) => values.map((v) => Math.round(v * 1e6) / 1e6)

const PARAMS = { rho: 1.2, mass: 80, crr: 0.004, cda: 0.25 }
const G = 9.81

/**
 * A ride on flat ground whose power is exactly what the given speeds and timestamps need,
 * so a correct VE stays flat.
 */
function flatRide (speedsKmh: number[], times: number[], windKmh = 0) {
  const { rho, mass, crr, cda } = PARAMS
  const power = speedsKmh.map((s, i) => {
    if (i === 0) return 0
    const v = s / 3.6
    const v0 = speedsKmh[i - 1] / 3.6
    const vair = v + windKmh / 3.6
    const dt = (times[i] - times[i - 1]) / 1000
    const energy = crr * mass * G * v * dt + 0.5 * cda * rho * vair * Math.abs(vair) * v * dt + 0.5 * mass * (v ** 2 - v0 ** 2)
    return energy / dt
  })
  return {
    power,
    speed: speedsKmh,
    airspeed: speedsKmh.map((s) => s + windKmh),
    elevation: speedsKmh.map(() => 100),
    time: times
  }
}

const seconds = (n: number, step = 1) => Array.from({ length: n }, (_, i) => i * step * 1000)

describe('virtualElevation', () => {
  it('stays flat at constant speed when power balances rolling and aero resistance', () => {
    const ve = virtualElevation(flatRide(Array(120).fill(40), seconds(120)), PARAMS)
    ve.forEach((e) => expect(e).toBeCloseTo(100, 9))
  })

  it('climbs when there is surplus power', () => {
    const ride = flatRide(Array(60).fill(20), seconds(60))
    const ve = virtualElevation({ ...ride, power: ride.power.map((p) => p + 200) }, PARAMS)
    expect(ve[59]).toBeGreaterThan(ve[1])
  })

  it('stays flat while accelerating, with 1 s and with irregular smart-recording intervals', () => {
    const speeds = Array.from({ length: 40 }, (_, i) => 20 + i * 0.5)
    const times = [0]
    for (let i = 1; i < 40; i++) times.push(times[i - 1] + [1000, 2000, 3000][i % 3])
    for (const t of [seconds(40), times]) {
      virtualElevation(flatRide(speeds, t), PARAMS).forEach((e) => expect(e).toBeCloseTo(100, 9))
    }
  })

  it('keeps the virtual elevation while stopped instead of snapping to the real elevation', () => {
    const ride = flatRide([30, 30, 30, 0, 0, 30, 30], seconds(7))
    ride.elevation = [100, 0, 0, 0, 0, 0, 0]
    ride.power[5] += 300
    const ve = virtualElevation(ride, PARAMS)
    expect(ve[3]).toBeCloseTo(100, 9)
    expect(ve[4]).toBeCloseTo(100, 9)
    expect(ve[5]).toBeGreaterThan(100)
  })

  it(`follows the real elevation change across gaps over ${MAX_INTEGRATION_GAP_SECONDS} s`, () => {
    const ride = flatRide([30, 30, 30, 30], [0, 1000, 2000, 3000])
    ride.time = [0, 1000, 1000 + 600_000, 2000 + 600_000]
    ride.elevation = [100, 100, 130, 130]
    ride.power[2] = 400
    const ve = virtualElevation(ride, PARAMS)
    expect(ve[2]).toBeCloseTo(130, 9)
    expect(ve[3]).toBeCloseTo(130, 9)
  })

  it('treats a tailwind faster than the rider as a push, not drag', () => {
    const ride = flatRide(Array(30).fill(20), seconds(30), -30)
    expect(ride.airspeed[1]).toBeLessThan(0)
    virtualElevation(ride, PARAMS).forEach((e) => expect(e).toBeCloseTo(100, 9))
  })

  for (const fixture of CSV_FIXTURES) {
    it(`matches golden output for ${fixture}`, async () => {
      const s = toActivitySeries(await loadActivityPoints(fixture))
      const ve = virtualElevation(
        { ...s, elevation: s.altitude, drivetrainLoss: 2 },
        { rho: 1.2, mass: 80, crr: 0.005, cda: 0.3 }
      )
      expect(round(ve)).toMatchSnapshot()
    })
  }
})

describe('units', () => {
  it('converts air density for imperial display', () => {
    expect(lbPerFt3ToKgPerM3(0.0749)).toBeCloseTo(1.1998, 4)
    expect(kgPerM3ToLbPerFt3(lbPerFt3ToKgPerM3(0.075))).toBeCloseTo(0.075, 12)
  })
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
    expect(hasLocation(s)).toBe(false)
  })

  it('keeps the GPS track aligned with the other series when fixes are missing', () => {
    const s = toActivitySeries([
      { lap: 1, timestamp: '2026-01-01T10:00:00Z', speed: 30 },
      { lap: 1, timestamp: '2026-01-01T10:00:01Z', speed: 31, lat: 45, long: -73 },
      { lap: 1, timestamp: '2026-01-01T10:00:02Z', speed: 32, lat: null, long: null },
      { lap: 1, timestamp: '2026-01-01T10:00:03Z', speed: 33, lat: 45.001, long: -73 }
    ])
    expect(s.location).toEqual([null, { lat: 45, lng: -73 }, null, { lat: 45.001, lng: -73 }])
    expect(s.location).toHaveLength(s.speed.length)
    expect(hasLocation(s)).toBe(true)
  })

  it('does not crash on a spike before any good reading', () => {
    expect(toActivitySeries([{ lap: 1, timestamp: '2026-01-01T10:00:00Z', power: 5000 }]).power).toEqual([0])
  })
})

describe('wind model', () => {
  it('adds a direct headwind and subtracts a tailwind', () => {
    expect(yaw(30, 10, 0)).toEqual({ airspeed: 40, apparent: 40, yaw: 0 })
    expect(yaw(30, 10, 180)).toEqual({ airspeed: 20, apparent: 20, yaw: 0 })
  })

  it('counts only the head component of a crosswind as air speed', () => {
    const p = yaw(30, 10, 90)
    expect(p.airspeed).toBeCloseTo(30, 9)
    expect(p.apparent).toBeCloseTo(Math.sqrt(1000), 9)
    expect(p.yaw).toBeCloseTo(18.43, 2)
    // from the left (270°) mirrors the right
    expect(yaw(30, 10, 270).airspeed).toBeCloseTo(30, 9)
  })

  it('gives negative air speed when a tailwind outruns the rider', () => {
    const p = yaw(10, 25, 180)
    expect(p.airspeed).toBe(-15)
    expect(p.apparent).toBe(15)
    expect(p.yaw).toBeCloseTo(180, 9)
  })

  it('scales the 10 m wind to rider height by exposure', () => {
    expect(riderHeightFactor('open')).toBeCloseTo(0.6, 1)
    expect(riderHeightFactor('mixed')).toBeCloseTo(0.5, 9)
    expect(riderHeightFactor('sheltered')).toBeCloseTo(0.41, 2)
  })

  it('computes compass bearings', () => {
    const origin = { lat: 45, lng: -73 }
    expect(bearing(origin, { lat: 45.01, lng: -73 })).toBeCloseTo(0, 6)
    expect(bearing(origin, { lat: 45, lng: -72.99 })).toBeCloseTo(90, 0)
    expect(bearing(origin, { lat: 44.99, lng: -73 })).toBeCloseTo(180, 6)
  })

  it('riding north into a north wind is a headwind', () => {
    const track = Array.from({ length: 30 }, (_, i) => ({ lat: 45 + i * 0.0001, lng: -73 }))
    const result = windModelAirSpeed(track, Array(30).fill(30), Array(30).fill(10), Array(30).fill(0))
    result.forEach((p) => expect(p.airspeed).toBeCloseTo(40, 6))
  })

  it('follows the direction of travel without lagging behind a turn', () => {
    // 20 points north, then 20 points east
    const track = [
      ...Array.from({ length: 20 }, (_, i) => ({ lat: 45 + i * 0.0001, lng: -73 })),
      ...Array.from({ length: 20 }, (_, i) => ({ lat: 45.0019, lng: -73 + (i + 1) * 0.00014 }))
    ]
    const bearings = travelBearings(track)!
    expect(bearings[5]).toBeCloseTo(0, 6)
    expect(bearings[30]).toBeCloseTo(90, 0)
  })

  it('uses the right GPS point for each sample when fixes are missing', () => {
    // heading north; every other point has no fix
    const track = Array.from({ length: 40 }, (_, i) => (i % 2 ? null : { lat: 45 + i * 0.0001, lng: -73 }))
    const result = windModelAirSpeed(track, Array(40).fill(30), Array(40).fill(10), Array(40).fill(0))
    result.forEach((p) => expect(p.airspeed).toBeCloseTo(40, 6))
  })

  it('handles short tracks and refuses tracks without GPS', () => {
    expect(windModelAirSpeed([{ lat: 45, lng: -73 }, { lat: 45.001, lng: -73 }], [30, 30], [10, 10], [0, 0])).toHaveLength(2)
    expect(() => windModelAirSpeed([null, null], [30, 30], [10, 10], [0, 0])).toThrow()
  })
})

describe('windAt', () => {
  const hour = 3600_000
  const t0 = Date.UTC(2019, 4, 6, 10)
  const hourly = { time: [t0, t0 + hour, t0 + 2 * hour], speed: [10, 20, 20], direction: [350, 10, 90] }

  it('samples by absolute time, interpolating speed and the shorter arc of direction', () => {
    const w = windAt(hourly, [new Date(t0 + hour / 2), t0 + hour])
    expect(w.speed).toEqual([15, 20])
    expect(w.direction[0]).toBeCloseTo(0, 9)
    expect(w.direction[1]).toBeCloseTo(10, 9)
  })

  it('clamps to the first and last observation', () => {
    const w = windAt(hourly, [t0 - hour, t0 + 5 * hour])
    expect(w.speed).toEqual([10, 20])
    expect(w.direction).toEqual([350, 90])
  })
})

describe('findLoops', () => {
  it('finds each lap of a circuit', () => {
    const loops = findLoops(circuitTrack(4), precisionDigits('medium'), 100, 200)
    expect(loops.map((l) => [l.startIndex, l.endIndex])).toEqual([[0, 150], [151, 301], [302, 452]])
  })

  it('reports indexes in the aligned track when fixes are missing', () => {
    const track = circuitTrack(2).map((p, i) => (i % 7 === 4 ? null : p))
    const loops = findLoops(track, precisionDigits('medium'), 100, 200)
    expect(loops[0]).toMatchObject({ startIndex: 0, endIndex: 150 })
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
