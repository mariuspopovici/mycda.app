/**
 * Golden and robustness tests on real rides from the gitignored __fixtures__/private folder.
 * Skipped when the folder is absent. Golden files are written next to the fixtures so no
 * ride-derived data is committed.
 *
 *   npm test                      the curated rides below
 *   npm run test:all-fixtures     every file in the folder (robustness only)
 */
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasLocation, toActivitySeries } from '../activitySeries'
import { findLoops } from '../loopFinder'
import { detectTests, evaluateTest, lapGeometries } from '../testRuns'
import { virtualElevation } from '../virtualElevation'
import { travelBearings, windModelAirSpeed } from '../windModel'
import { PRIVATE_FIXTURES_DIR, loadActivityPoints } from './fixtures'

const CURATED_RIDES: Record<string, string> = {
  '179e07b9-7ef4-424c-9fdb-8dc0c7f01608.fit': 'GPS loops — 1 s, one long gap',
  'ca984087-2ec1-4765-b886-07c0f7cf7ae8.fit': 'GPS loops — 7 laps, many stops, long gaps',
  'c4ae4df8-f099-4ddf-a9ed-d97ec0e0eb6f.fit': 'Velodrome — clean 1 s',
  '83ad24d3-5744-4921-b7d9-6a1bea5716be.fit': 'Track A — irregular intervals, partial GPS',
  'b72dc6ed-a5b8-46b2-8359-140f32cce922.fit': 'Track B — irregular intervals, partial GPS, gaps while moving',
  '0e8b35f1-64a5-4afc-84ff-52796811c25a.fit': 'Crit course — 6 laps, no GPS',
  '0315645a-1ddf-4a71-a7ba-6ca6e83485ff.fit': 'Short GPS loops — 5 laps',
  '16c21302-4f75-49d7-9dc3-953d13574423.fit': 'Time trial — no GPS',
  'a5512ec6-da7f-4480-bd66-818d5d30aadc.csv': 'CSV — 33 km, 9 laps, measured air speed',
  '18e78a02-002c-4c37-ad77-75e928f951c4.csv': 'CSV — 30 km with GPS columns'
}

const ALL = process.env.ALL_FIXTURES === '1'
const available = existsSync(PRIVATE_FIXTURES_DIR)
  ? readdirSync(PRIVATE_FIXTURES_DIR).filter((f) => /\.(fit|csv)$/i.test(f))
  : []
const rides = ALL ? available : Object.keys(CURATED_RIDES).filter((f) => available.includes(f))

const PARAMS = { rho: 1.2, mass: 80, crr: 0.005, cda: 0.3 }

describe.skipIf(rides.length === 0)('private rides', () => {
  for (const ride of rides) {
    const label = CURATED_RIDES[ride] ? `${ride.slice(0, 8)} ${CURATED_RIDES[ride]}` : ride

    it(label, async () => {
      let points
      try {
        points = await loadActivityPoints(resolve(PRIVATE_FIXTURES_DIR, ride))
      } catch (error) {
        // the sweep includes files the upload pipeline rejects too
        if (ALL) return
        throw error
      }
      const s = toActivitySeries(points)

      const ve = virtualElevation({ ...s, elevation: s.altitude, drivetrainLoss: 2 }, PARAMS)
      expect(ve.every(Number.isFinite)).toBe(true)

      if (hasLocation(s)) {
        if (travelBearings(s.location)) {
          const air = windModelAirSpeed(s.location, s.speed, s.speed.map(() => 15), s.speed.map(() => 250))
          expect(air.every((p) => Number.isFinite(p.airspeed))).toBe(true)
        }

        const loops = findLoops(s.location, 3, 60, 1000)
        expect(loops.every((l) => l.endIndex < s.time.length && s.location[l.startIndex] && s.location[l.endIndex])).toBe(true)
      }

      if (!ALL) {
        const golden = { points: s.time.length, gps: s.location.filter((p) => p !== null).length, ve: ve.map((v) => Math.round(v * 1e6) / 1e6) }
        await expect(JSON.stringify(golden)).toMatchFileSnapshot(
          resolve(PRIVATE_FIXTURES_DIR, '__golden__', ride.replace(/\.\w+$/, '.json'))
        )
      }
    }, 60_000)
  }
})

const OUT_AND_BACK = 'lanier-elemnt-out-and-back.fit'

describe.skipIf(!available.includes(OUT_AND_BACK))('out and back test file', () => {
  // docs/log/2026-10-18-out-and-back-runs.md
  it('finds the 10 tests and fits each by closure', async () => {
    const points = await loadActivityPoints(resolve(PRIVATE_FIXTURES_DIR, OUT_AND_BACK))
    const s = toActivitySeries(points)
    const lapOfPoint = points.map((p) => p.lap)
    const geometries = lapGeometries(s, lapOfPoint, [...new Set(lapOfPoint)])
    const tests = detectTests(geometries)
    expect(tests).toEqual([[2, 5], [7, 9], [11, 13], [15, 17], [19, 21], [23, 25], [27, 29], [31, 33], [35, 37], [39, 41]])

    const cdas = tests.map((laps) => evaluateTest(s, laps.map((n) => geometries.find((g) => g.number === n)!.range),
      { rho: 1.2, mass: 80, crr: 0.004, dloss: 0 }).cda)
    expect(cdas.map((c) => Math.round(c * 1000) / 1000)).toEqual([0.227, 0.229, 0.29, 0.224, 0.23, 0.232, 0.221, 0.216, 0.214, 0.213])
  }, 60_000)
})
