/**
 * Parity and golden tests on real rides from the gitignored __fixtures__/private folder.
 * Skipped when the folder is absent. Golden files are written next to the fixtures so no
 * ride-derived data is committed.
 *
 *   npm test                      the curated rides below
 *   npm run test:all-fixtures     every file in the folder (parity only)
 */
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import LegacyLoopFinder from '../../../../src/services/loopdetect.js'
import LegacyVirtualElevation from '../../../../src/services/ve.js'
import LegacyWindModel from '../../../../src/services/windmodel.js'
import { toActivitySeries } from '../activitySeries'
import { findLoops } from '../loopFinder'
import { virtualElevation } from '../virtualElevation'
import { windModelAirSpeed } from '../windModel'
import { PRIVATE_FIXTURES_DIR, expectClose, loadActivityPoints } from './fixtures'

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

      for (const units of ['metric', 'imperial'] as const) {
        const legacy = new LegacyVirtualElevation(s.power, s.speed, s.airspeed, s.altitude, s.time, units, 2)
        const ve = virtualElevation({ ...s, elevation: s.altitude, units, drivetrainLoss: 2 }, PARAMS)
        expectClose(ve, legacy.calculateVirtualElevation(PARAMS.rho, PARAMS.mass, PARAMS.crr, PARAMS.cda))
      }

      if (s.location.length > 10) {
        const windSpeed = s.speed.map(() => 15)
        const windDirection = s.speed.map(() => 250)
        const legacyWind = new LegacyWindModel([], s.location, s.speed, windSpeed, windDirection).calculateAirSpeed()
        expectClose(
          windModelAirSpeed(s.location, s.speed, windSpeed, windDirection).map((p) => p.airspeed),
          legacyWind.map((p: { airspeed: number }) => p.airspeed)
        )

        const legacyLoops = new LegacyLoopFinder(s.location.map((p) => ({ ...p }))).findLoops(3, 60, 1000)
        expect(findLoops(s.location, 3, 60, 1000)).toEqual(legacyLoops)
      }

      if (!ALL) {
        const ve = virtualElevation({ ...s, elevation: s.altitude, units: 'metric', drivetrainLoss: 2 }, PARAMS)
        const golden = { points: s.time.length, gps: s.location.length, ve: ve.map((v) => Math.round(v * 1e6) / 1e6) }
        await expect(JSON.stringify(golden)).toMatchFileSnapshot(
          resolve(PRIVATE_FIXTURES_DIR, '__golden__', ride.replace(/\.\w+$/, '.json'))
        )
      }
    }, 60_000)
  }
})
