import { describe, expect, it } from 'vitest'
import { fitError, fitParameters, goldenSection } from '../fit'

const G = 9.81
const TRUE = { rho: 1.2, mass: 80, crr: 0.0045, cda: 0.26 }

/**
 * A ride over rolling terrain with varying speed whose power exactly matches TRUE parameters,
 * built on the same energy balance as virtualElevation.
 */
function syntheticRide (laps = 3, pointsPerLap = 240) {
  const n = laps * pointsPerLap
  const speed = Array.from({ length: n }, (_, i) => 28 + 8 * Math.sin((2 * Math.PI * i) / pointsPerLap) + 3 * Math.sin(i / 17))
  const elevation = Array.from({ length: n }, (_, i) => 100 + 6 * Math.sin((2 * Math.PI * i) / pointsPerLap))
  const time = Array.from({ length: n }, (_, i) => i * 1000)
  const power = speed.map((s, i) => {
    if (i === 0) return 0
    const v = s / 3.6
    const v0 = speed[i - 1] / 3.6
    const energy = TRUE.crr * TRUE.mass * G * v + 0.5 * TRUE.cda * TRUE.rho * v ** 3 + 0.5 * TRUE.mass * (v ** 2 - v0 ** 2) +
      TRUE.mass * G * (elevation[i] - elevation[i - 1])
    return energy
  })
  const loops = Array.from({ length: laps }, (_, k) => ({ start: k * pointsPerLap, end: (k + 1) * pointsPerLap - 1 }))
  return { series: { power, speed, airspeed: speed, elevation, time }, loops }
}

describe('goldenSection', () => {
  it('finds the minimum of a unimodal function', () => {
    expect(goldenSection((x) => (x - 0.3) ** 2, 0, 1)).toBeCloseTo(0.3, 4)
  })
})

describe('fitParameters', () => {
  const { series, loops } = syntheticRide()
  const start = { rho: TRUE.rho, mass: TRUE.mass, crr: TRUE.crr, cda: 0.4 }

  it('recovers CdA from the elevation profile', () => {
    const result = fitParameters(series, start, { kind: 'elevation' })
    expect(result.cda).toBeCloseTo(TRUE.cda, 3)
    expect(result.error).toBeLessThan(0.01)
  })

  it('recovers CdA from loop closure', () => {
    const result = fitParameters(series, start, { kind: 'loops', loops })
    expect(result.cda).toBeCloseTo(TRUE.cda, 3)
  })

  it('recovers CdA and Crr together when speed varies', () => {
    const result = fitParameters(series, { ...start, crr: 0.008 }, { kind: 'elevation' }, { fitCrr: true })
    expect(result.cda).toBeCloseTo(TRUE.cda, 2)
    expect(result.crr).toBeCloseTo(TRUE.crr, 3)
  })

  it('reports how far off a guess is', () => {
    expect(fitError(series, { ...TRUE, cda: 0.35 }, { kind: 'loops', loops })).toBeGreaterThan(1)
    expect(fitError(series, TRUE, { kind: 'loops', loops })).toBeLessThan(1e-6)
    expect(fitError(series, TRUE, { kind: 'loops', loops: [] })).toBeNaN()
  })
})
