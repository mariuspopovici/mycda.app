/**
 * Checks the TypeScript ports against the legacy Vue app services in src/services.
 * Delete this file together with the legacy app; core.test.ts snapshots keep guarding behaviour.
 */
import { describe, expect, it } from 'vitest'
import LegacyBuffer from '../../../../src/services/buffer.js'
import LegacyLoopFinder from '../../../../src/services/loopdetect.js'
import LegacyUtils from '../../../../src/services/utils.js'
import LegacyVirtualElevation from '../../../../src/services/ve.js'
import LegacyWindModel from '../../../../src/services/windmodel.js'
import { toActivitySeries } from '../activitySeries'
import { findLoops } from '../loopFinder'
import * as units from '../units'
import { virtualElevation } from '../virtualElevation'
import { windModelAirSpeed } from '../windModel'
import { CSV_FIXTURES, circuitTrack, expectClose, loadActivityPoints } from './fixtures'

const PARAM_SETS = [
  { rho: 1.2, mass: 80, crr: 0.005, cda: 0.35, dloss: 0 },
  { rho: 1.15, mass: 72.5, crr: 0.0035, cda: 0.21, dloss: 2.5 }
]

describe('virtual elevation matches legacy', () => {
  for (const fixture of CSV_FIXTURES) {
    for (const u of ['metric', 'imperial'] as const) {
      it(`${fixture} (${u})`, async () => {
        const s = toActivitySeries(await loadActivityPoints(fixture))
        for (const p of PARAM_SETS) {
          const legacy = new LegacyVirtualElevation(s.power, s.speed, s.airspeed, s.altitude, s.time, u, p.dloss)
          const expected = legacy.calculateVirtualElevation(p.rho, p.mass, p.crr, p.cda)
          const actual = virtualElevation(
            { ...s, elevation: s.altitude, units: u, drivetrainLoss: p.dloss },
            p
          )
          expectClose(actual, expected)
        }
      })
    }
  }
})

describe('power spike filter matches legacy Buffer logic', () => {
  it('replaces spikes with the average of the last 5 values', () => {
    const watts = [200, 210, 4000, 220, 230, 240, 250, 9999, 9999, 260]
    const buffer = new LegacyBuffer(5)
    const expected = watts.map((w) => {
      const p = w > 1500 ? buffer.average() : w
      buffer.add(p)
      return p
    })
    const points = watts.map((power, i) => ({ lap: 1, timestamp: new Date(i * 1000).toISOString(), power, speed: 30 }))
    expect(toActivitySeries(points).power).toEqual(expected)
  })
})

describe('wind model matches legacy', () => {
  it('computes the same air speed and yaw on a circuit', () => {
    const track = circuitTrack(2)
    const speed = track.map((_, i) => 30 + 5 * Math.sin(i / 7))
    const windSpeed = track.map((_, i) => (i < 150 ? 12 : 18))
    const windDirection = track.map((_, i) => (i < 150 ? 225 : 300))

    const legacy = new LegacyWindModel([], track, speed, windSpeed, windDirection).calculateAirSpeed()
    const actual = windModelAirSpeed(track, speed, windSpeed, windDirection)

    expectClose(actual.map((p) => p.airspeed), legacy.map((p: { airspeed: number }) => p.airspeed))
    expectClose(actual.map((p) => p.yaw), legacy.map((p: { yaw: number }) => p.yaw))
  })
})

describe('loop finder matches legacy', () => {
  for (const [digits, min, max] of [[3, 60, 1000], [4, 80, 200], [5, 100, 400]]) {
    it(`precision ${digits}, duration ${min}-${max}`, () => {
      const track = circuitTrack(4)
      // the legacy finder mutates its input
      const legacy = new LegacyLoopFinder(track.map((p) => ({ ...p }))).findLoops(digits, min, max)
      expect(findLoops(track, digits, min, max)).toEqual(legacy)
      expect(track[0].lat).toBeTypeOf('number')
    })
  }
})

describe('unit conversions match legacy', () => {
  const legacy = new LegacyUtils()
  it.each([0, 1, 12.5, 100, 1013.25])('%d', (v) => {
    expect(units.kmToMi(v)).toBe(legacy.kmToMi(v))
    expect(units.miToKm(v)).toBe(legacy.miToKm(v))
    expect(units.mToFt(v)).toBe(legacy.mToFt(v))
    expect(units.ftToM(v)).toBe(legacy.ftToM(v))
    expect(units.kgToLbs(v)).toBe(legacy.kgToLbs(v))
    expect(units.lbsToKg(v)).toBe(legacy.lbsToKg(v))
    expect(units.hpaToInHg(v).toFixed(2)).toBe(legacy.hpaToInHg(v))
    expect(units.inHgToHpa(v).toFixed(2)).toBe(legacy.inHgTohpa(v))
    expect(units.toFahrenheit(v).toFixed(2)).toBe(legacy.toFahrenheit(v))
    expect(units.toCelsius(v).toFixed(2)).toBe(legacy.toCelcius(v))
    expect(units.secondsToHms(v * 37)).toBe(legacy.secondsToHms(v * 37))
  })
})
