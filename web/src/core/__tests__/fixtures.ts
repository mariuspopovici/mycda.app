import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import type { ActivityPoint } from '../activitySeries'
import type { LatLng } from '../windModel'

const require = createRequire(import.meta.url)
const { parseActivityFile, validateFileContents, getActivityData } = require('../../../../functions/activity.js')

export const FIXTURES_DIR = resolve(import.meta.dirname, '../__fixtures__')
/** Personal activity files, gitignored. Tests using them are skipped when the folder is absent. */
export const PRIVATE_FIXTURES_DIR = resolve(FIXTURES_DIR, 'private')

export const CSV_FIXTURES = ['bommycdatest.csv', 'exported.csv', 'mycda.csv', 'mytest.csv', 'test.csv']

/** CSV files carry only elapsed time; production dates them by upload time. */
const CSV_START_TIME = new Date('2026-01-01T10:00:00Z')

/**
 * Runs an activity file through the Cloud Functions parsing pipeline and a JSON round trip,
 * producing the points the web app receives from `api/activity/:id`.
 * @param fixture file name in FIXTURES_DIR, or an absolute path
 */
export async function loadActivityPoints (fixture: string): Promise<ActivityPoint[]> {
  const parsed = await parseActivityFile(readFileSync(resolve(FIXTURES_DIR, fixture)), { startTime: CSV_START_TIME })
  const validation = validateFileContents(parsed)
  if (validation.invalid) throw new Error(validation.message)
  return JSON.parse(JSON.stringify(getActivityData(parsed))).points
}

/** A circuit of `laps` laps around a ~600 m radius circle, one point per second. */
export function circuitTrack (laps = 3, pointsPerLap = 150): LatLng[] {
  const center = { lat: 45.5, lng: -73.6 }
  const track: LatLng[] = []
  for (let i = 0; i < laps * pointsPerLap; i++) {
    const angle = (2 * Math.PI * i) / pointsPerLap
    track.push({ lat: center.lat + 0.0055 * Math.cos(angle), lng: center.lng + 0.0077 * Math.sin(angle) })
  }
  return track
}

/**
 * Removes the conditions where the legacy VE was wrong (non-1 s intervals, stops, tailwinds faster
 * than the rider) so legacy and current VE must agree.
 */
export function withoutLegacyBugs<T extends { time: Date[], speed: number[], airspeed: number[] }> (s: T): T {
  return {
    ...s,
    time: s.time.map((_, i) => new Date(i * 1000)),
    speed: s.speed.map((v) => Math.max(v, 0.5)),
    airspeed: s.airspeed.map((v) => Math.max(v, 0))
  }
}

/** Compares two numeric arrays with a relative tolerance. */
export function expectClose (actual: number[], expected: number[], relTol = 1e-12) {
  if (actual.length !== expected.length) {
    throw new Error(`length ${actual.length} !== ${expected.length}`)
  }
  actual.forEach((a, i) => {
    const e = expected[i]
    if (Number.isNaN(a) && Number.isNaN(e)) return
    const tol = relTol * Math.max(1, Math.abs(e))
    if (!(Math.abs(a - e) <= tol)) {
      throw new Error(`index ${i}: ${a} !== ${e}`)
    }
  })
}
