import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { authErrorMessage } from '../auth/authErrors'
import { byRideDateDesc, nameFromFile, toActivity, uploadExtension } from '../data/activities'
import { convertPrefsUnits, DEFAULT_PREFS, toUserPrefs, totalMassKg } from '../data/userPrefs'
import { formatDistance, formatPower, formatSpeed } from './format'
import { pathFromLegacyHash } from './legacyUrls'

describe('pathFromLegacyHash', () => {
  it('maps legacy hash routes to paths', () => {
    expect(pathFromLegacyHash('#/activity/abc')).toBe('/activity/abc')
    expect(pathFromLegacyHash('#/activity/abc/cda/s1')).toBe('/activity/abc/cda/s1')
    expect(pathFromLegacyHash('#/home')).toBe('/activities')
    expect(pathFromLegacyHash('#/')).toBe('/')
    expect(pathFromLegacyHash('#/landing')).toBe('/')
    expect(pathFromLegacyHash('#/auth/action?mode=resetPassword&oobCode=x')).toBe('/auth/action?mode=resetPassword&oobCode=x')
  })

  it('ignores in-page anchors', () => {
    expect(pathFromLegacyHash('#csv')).toBeUndefined()
    expect(pathFromLegacyHash('')).toBeUndefined()
  })
})

describe('activities', () => {
  it('maps legacy documents, including averages stored as strings', () => {
    const a = toActivity('a1', {
      uid: 'u', name: 'Track', status: 'Processed', distance: 33.7, averageSpeed: '32.35', averagePower: 153,
      activity_date: Timestamp.fromDate(new Date('2018-02-22T14:54:15Z')), timestamp: new Date('2018-02-23T00:00:00Z')
    })
    expect(a).toMatchObject({ id: 'a1', averageSpeed: 32.35, averagePower: 153, distance: 33.7 })
    expect(a.activityDate?.toISOString()).toBe('2018-02-22T14:54:15.000Z')
    expect(toActivity('a2', { uid: 'u', averageSpeed: null, distance: 'NaN' })).toMatchObject({ name: 'New Activity', status: 'New', averageSpeed: undefined, distance: undefined })
  })

  it('sorts by ride date, falling back to upload time', () => {
    const list = [
      { id: 'old', activityDate: new Date('2018-01-01') },
      { id: 'uploading', timestamp: new Date('2026-10-17') },
      { id: 'new', activityDate: new Date('2019-01-01') }
    ].map((a) => ({ uid: 'u', name: a.id, status: 'Processed' as const, ...a }))
    expect(list.sort(byRideDateDesc).map((a) => a.id)).toEqual(['uploading', 'new', 'old'])
  })

  it('names uploads after the file and keeps the legacy storage extension rule', () => {
    expect(nameFromFile('Morning Ride.fit')).toBe('Morning Ride')
    expect(nameFromFile('export.fit.gz')).toBe('export')
    expect(nameFromFile('.fit')).toBe('New Activity')
    expect(uploadExtension('ride.CSV')).toBe('.csv')
    expect(uploadExtension('ride.fit.gz')).toBe('.fit')
  })
})

describe('user prefs', () => {
  it('reads legacy documents with string values and falls back to defaults', () => {
    expect(toUserPrefs({ units: 'imperial', weight: '165.3', bikeWeight: '17.6', cda: 0.25, crr: '0.004', dloss: 2 }))
      .toEqual({ units: 'imperial', weight: 165.3, bikeWeight: 17.6, cda: 0.25, crr: 0.004, dloss: 2 })
    expect(toUserPrefs(undefined)).toEqual(DEFAULT_PREFS)
    expect(toUserPrefs({ weight: 'abc' }).weight).toBe(DEFAULT_PREFS.weight)
  })

  it('converts weights between unit systems and computes total mass in kg', () => {
    const metric = { ...DEFAULT_PREFS, weight: 70, bikeWeight: 8 }
    const imperial = convertPrefsUnits(metric, 'imperial')
    expect(imperial).toMatchObject({ units: 'imperial', weight: 154.4, bikeWeight: 17.6 })
    expect(totalMassKg(imperial)).toBeCloseTo(78, 1)
    expect(totalMassKg(metric)).toBe(78)
    expect(convertPrefsUnits(metric, 'metric')).toBe(metric)
  })
})

describe('format', () => {
  it('formats in the user units', () => {
    expect(formatDistance(40, 'metric')).toBe('40.0 km')
    expect(formatDistance(40, 'imperial')).toBe('24.9 mi')
    expect(formatSpeed(36, 'imperial')).toBe('22.4 mph')
    expect(formatPower(249.6)).toBe('250 W')
    expect(formatDistance(undefined, 'metric')).toBe('–')
  })
})

describe('authErrorMessage', () => {
  it('maps Firebase error codes and falls back to the message', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe('Incorrect email or password.')
    expect(authErrorMessage(new Error('boom'))).toBe('boom')
    expect(authErrorMessage(undefined)).toMatch(/Something went wrong/)
  })
})
