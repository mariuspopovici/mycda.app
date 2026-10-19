import { describe, expect, it } from 'vitest'
import type { RunDiagnostics } from '../core/runDiagnostics'
import { explainRunPrompt, parseExplanation } from './assistant'

const diagnostics: RunDiagnostics = {
  duration: 479,
  distance: 4.82,
  partsKind: 'legs',
  parts: [
    { seconds: 199, distance: 2.43, averageSpeed: 44, averageAirspeed: 36, averagePower: 230, elevationChange: 0.4, virtualElevationChange: 1.9 },
    { seconds: 239, distance: 2.39, averageSpeed: 36, averageAirspeed: 44, averagePower: 250, elevationChange: -0.4, virtualElevationChange: -1.7 }
  ],
  closureError: 0.2,
  elevationRms: 0.9,
  fittedCda: 0.2614,
  fittedAtBound: false,
  sensitivity: { massPlus1kg: -0.0011, powerPlus1Percent: 0.0031, crrPlus00005: -0.0072, rhoPlus001: -0.0022, airspeedPlus2kmh: -0.0204 },
  dataQuality: { gaps: 0, zeroPowerWhileMoving: 1.2, maxPower: 612, minSpeed: 18, maxSpeed: 47 }
}
const context = {
  diagnostics,
  parameters: { mass: 80, rho: 1.2, crr: 0.004, cda: 0.25, dloss: 1 },
  airspeedSource: 'ground' as const,
  fitBasis: 'closure of the run (it ends where it started)',
  units: 'metric' as const
}

describe('explainRunPrompt', () => {
  it('states the computed facts and nothing about the rider', () => {
    const prompt = explainRunPrompt(context)
    expect(prompt).toContain('2 legs joined')
    expect(prompt).toContain('Suggested CdA from closure of the run (it ends where it started): 0.261')
    expect(prompt).toContain('run closure error +0.20 m')
    expect(prompt).toContain('Leg 1: 199 s, 2.43 km, ground speed 44.0 km/h, air speed 36.0 km/h, power 230 W')
    expect(prompt).toContain('virtual elevation change +1.90 m')
    expect(prompt).toContain('air speed +2 km/h throughout: -0.0204')
    expect(prompt).toContain('still air')
    expect(prompt).not.toMatch(/lat|lng|location|notes/i)
  })

  it('converts lengths and speeds for imperial riders', () => {
    const prompt = explainRunPrompt({ ...context, units: 'imperial' })
    expect(prompt).toContain('Units: imperial')
    expect(prompt).toContain('total mass 176.4 lbs')
    expect(prompt).toContain('ground speed 27.3 mph')
  })

  it('flags a fit at the edge of the range', () => {
    expect(explainRunPrompt({ ...context, diagnostics: { ...diagnostics, fittedAtBound: true } })).toContain('AT THE EDGE')
  })
})

describe('parseExplanation', () => {
  it('accepts a well-formed answer', () => {
    const answer = { verdict: 'check', headline: 'Wind shows on both legs.', findings: [{ title: 'Wind', detail: 'VE rises out, falls back.' }], nextSteps: ['Try the Weather air speed.'] }
    expect(parseExplanation(JSON.stringify(answer))).toEqual(answer)
  })

  it('rejects anything else', () => {
    expect(() => parseExplanation('{"verdict":"great","headline":"x","findings":[],"nextSteps":[]}')).toThrow(/unexpected shape/)
    expect(() => parseExplanation('{"verdict":"good","headline":"x","findings":[{"title":1}],"nextSteps":[]}')).toThrow(/unexpected shape/)
    expect(() => parseExplanation('not json')).toThrow()
  })
})
