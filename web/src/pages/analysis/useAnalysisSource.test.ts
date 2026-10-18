import { describe, expect, it } from 'vitest'
import { analysisUrl, parseAnalysisStart, parseRanges } from './useAnalysisSource'

const ranges = [{ start: new Date(1000), end: new Date(5000) }, { start: new Date(9000), end: new Date(12000) }]
const paramsOf = (url: string) => new URLSearchParams(url.split('?')[1])

describe('analysisUrl', () => {
  it('round-trips ranges and starting values', () => {
    const url = analysisUrl('a1', ranges, 'Test 1 (laps 2 + 5)', {
      mass: 80.5, rho: 1.18, crr: 0.004, dloss: 0, airspeedSource: 'manual', wind: { speed: 12, direction: 315 }
    })
    expect(url.startsWith('/activity/a1/analysis?')).toBe(true)
    const params = paramsOf(url)
    expect(params.get('name')).toBe('Test 1 (laps 2 + 5)')
    expect(parseRanges(params)).toEqual(ranges)
    expect(parseAnalysisStart(params)).toEqual({
      mass: 80.5, rho: 1.18, crr: 0.004, dloss: 0, airspeedSource: 'manual', wind: { speed: 12, direction: 315 }
    })
  })

  it('leaves out what is not given, and ignores invalid values', () => {
    expect(parseAnalysisStart(paramsOf(analysisUrl('a1', ranges, 'Laps')))).toEqual({})
    const start = parseAnalysisStart(new URLSearchParams('mass=-3&rho=abc&airspeed=gale&wind=12'))
    expect(Object.values(start).every((v) => v === undefined)).toBe(true)
  })
})
