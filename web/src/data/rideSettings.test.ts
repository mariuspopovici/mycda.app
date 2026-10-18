import { describe, expect, it } from 'vitest'
import { toActivity } from './activities'
import { segmentDocument, toSegment, type SegmentValues } from './segments'

const ranges = [{ start: new Date(1000), end: new Date(5000) }]
const values: SegmentValues = {
  name: 'Test 1', description: '', isBaseline: false, cda: 0.26, crr: 0.004, mass: 80, rho: 1.2, dloss: 2,
  airspeedSource: 'wind', windExposure: 'open'
}

describe('wind exposure (ADR-0014)', () => {
  it('reads the ride setting and drops invalid values', () => {
    const ride = (analysisDefaults: unknown) => toActivity('a1', { uid: 'u', analysisDefaults }).analysisDefaults
    expect(ride({ mass: 80, windExposure: 'sheltered' })).toEqual({ mass: 80, windExposure: 'sheltered' })
    expect(ride({ crr: 'x', windExposure: 'gale' })).toEqual({})
    expect(ride(undefined)).toBeUndefined()
  })

  it('saves the exposure with analyses that use a wind', () => {
    expect(segmentDocument(values, ranges).windExposure).toBe('open')
    expect(segmentDocument({ ...values, airspeedSource: 'manual', wind: { speed: 10, direction: 0 } }, ranges).windExposure).toBe('open')
    expect(segmentDocument({ ...values, airspeedSource: 'ground' }, ranges).windExposure).toBeNull()
  })

  it('reads it back, with the manual wind height', () => {
    const doc = { activity: 'a1', ...segmentDocument({ ...values, airspeedSource: 'manual', wind: { speed: 6, direction: 90, atRiderHeight: true } }, ranges) }
    const segment = toSegment('s1', doc, 'metric')
    expect(segment.windExposure).toBe('open')
    expect(segment.wind).toEqual({ speed: 6, direction: 90, atRiderHeight: true })
    // analyses saved before ADR-0014 have neither
    const old = toSegment('s2', { ...doc, windExposure: undefined, wind: { speed: 6, direction: 90 } }, 'metric')
    expect(old.windExposure).toBeUndefined()
    expect(old.wind).toEqual({ speed: 6, direction: 90 })
  })
})
