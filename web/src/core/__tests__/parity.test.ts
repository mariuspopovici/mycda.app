/**
 * Checks the TypeScript ports against the legacy Vue app services in src/services, where the legacy
 * behaviour is correct. Delete this file together with the legacy app; core.test.ts keeps guarding
 * behaviour.
 */
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import LegacyBuffer from '../../../../src/services/buffer.js'
import LegacyLoopFinder from '../../../../src/services/loopdetect.js'
import LegacyUtils from '../../../../src/services/utils.js'
import LegacyVirtualElevation from '../../../../src/services/ve.js'
import LegacyWindModel from '../../../../src/services/windmodel.js'
import { airDensity } from '../airDensity'
import { toActivitySeries } from '../activitySeries'
import { findLoops } from '../loopFinder'
import * as units from '../units'
import { virtualElevation } from '../virtualElevation'
import { yaw } from '../windModel'
import { CSV_FIXTURES, circuitTrack, expectClose, loadActivityPoints, withoutLegacyBugs } from './fixtures'

const PARAM_SETS = [
  { rho: 1.2, mass: 80, crr: 0.005, cda: 0.35, dloss: 0 },
  { rho: 1.15, mass: 72.5, crr: 0.0035, cda: 0.21, dloss: 2.5 }
]

describe('virtual elevation matches legacy outside its bugs', () => {
  for (const fixture of CSV_FIXTURES) {
    it(fixture, async () => {
      const s = withoutLegacyBugs(toActivitySeries(await loadActivityPoints(fixture)))
      for (const p of PARAM_SETS) {
        const legacy = new LegacyVirtualElevation(s.power, s.speed, s.airspeed, s.altitude, s.time, 'metric', p.dloss)
        const expected = legacy.calculateVirtualElevation(p.rho, p.mass, p.crr, p.cda)
        const actual = virtualElevation({ ...s, elevation: s.altitude, drivetrainLoss: p.dloss }, p)
        expectClose(actual, expected, 1e-9)
      }
    })
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

describe('yaw matches legacy', () => {
  const legacy = new LegacyWindModel()
  it.each([[30, 10, 0], [30, 10, 45], [25, 15, 135], [40, 20, 180], [20, 30, 270], [35, 5, -60]])(
    'ground %d, wind %d at %d°',
    (ground, wind, angle) => {
      expect(yaw(ground, wind, angle)).toEqual(legacy._yaw(ground, wind, angle))
    }
  )
})

describe('loop finder matches legacy on a complete track', () => {
  for (const [digits, min, max] of [[3, 60, 1000], [4, 80, 200], [5, 100, 400]]) {
    it(`precision ${digits}, duration ${min}-${max}`, () => {
      const track = circuitTrack(4)
      // the legacy finder mutates its input
      const legacy = new LegacyLoopFinder(track.map((p) => ({ ...p }))).findLoops(digits, min, max)
      expect(findLoops(track, digits, min, max)).toEqual(legacy)
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

describe('air density matches @mariuspopovici/rho', () => {
  const require = createRequire(import.meta.url)
  const rho = require('@mariuspopovici/rho')
  it.each([
    [20.5, 1019.3, 20.5, 0],
    [20, 1010, 20, 2000],
    [11.05, 1003, -7, 1855],
    [-5, 1030, -12, 300],
    [32, 1008, 24, 15]
  ])('%d °C, %d hPa, dew point %d °C, %d m', (temperature, pressure, dewPoint, altitude) => {
    expect(airDensity({ temperature, seaLevelPressure: pressure, dewPoint, altitude }))
      .toBeCloseTo(rho(temperature, pressure, dewPoint, 'metric', altitude), 12)
  })

  it('reproduces the package README values', () => {
    expect(airDensity({ temperature: 20.5, seaLevelPressure: 1019.3, dewPoint: 20.5 }).toFixed(4)).toBe('1.1984')
    expect(airDensity({ temperature: 20, seaLevelPressure: 1010, dewPoint: 20, altitude: 2000 }).toFixed(4)).toBe('0.9402')
  })
})
