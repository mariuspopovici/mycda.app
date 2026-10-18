import type { ActivitySeries } from './activitySeries'
import { fitParameters } from './fit'
import { combineRanges } from './ranges'
import { lapRange, multiRangeStats, type IndexRange, type RangeStats } from './selection'
import type { VirtualElevationParams } from './virtualElevation'
import { bearing, type LatLng } from './windModel'

/** A lap's shape: where it starts and ends, and how far it goes. */
export interface LapGeometry {
  number: number
  range: IndexRange
  /** km ridden */
  distance: number
  start?: LatLng
  end?: LatLng
}

const EARTH_RADIUS_KM = 6371

/** Great-circle distance in km. */
export function haversineKm (a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Each lap's range, distance and first and last GPS fix. Laps with fewer than two points are left out. */
export function lapGeometries (series: ActivitySeries, lapOfPoint: number[], lapNumbers: number[]): LapGeometry[] {
  return lapNumbers.flatMap((number) => {
    const range = lapRange(lapOfPoint, number)
    if (!range) return []
    let first: LatLng | undefined
    let last: LatLng | undefined
    for (let i = range.start; i <= range.end; i++) {
      const p = series.location[i]
      if (p) { first ??= p; last = p }
    }
    return [{ number, range, distance: series.distance[range.end] - series.distance[range.start], start: first, end: last }]
  })
}

/** Shorter laps are turnarounds, recoveries or lap-button slips, not tests. */
export const MIN_TEST_KM = 0.3
/** A leg's straight-line length must be at least this fraction of the distance ridden. */
const MIN_STRAIGHTNESS = 0.5
/** The back leg must head within this many degrees of the opposite way. */
const MAX_HEADING_ERROR = 30
/** The legs' distances may differ by this fraction of the longer one. */
const MAX_LENGTH_MISMATCH = 0.25
/** How many laps after the out leg the back leg may start (turnaround laps in between). */
const MAX_LAPS_BETWEEN = 4

/** How far apart a run may start and end and still be closed: 50 m, or 10 % of a long run. */
const closeEnough = (a: LatLng, b: LatLng, km: number) => haversineKm(a, b) <= Math.max(0.05, 0.1 * km)

const headingError = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Finds the tests in a ride's laps, as lists of lap numbers in ride order:
 * - a straight lap followed, within a few laps, by one of similar length heading back the other
 *   way and ending near its start is an out and back test;
 * - otherwise, closed laps (they end where they started: loops, or an out and back in one lap)
 *   are tests, leaving out those under half the typical length (recovery laps).
 * Rides with out and back pairs don't list closed laps: there they're warm-ups and turnarounds.
 * Laps without GPS are never matched.
 */
export function detectTests (laps: LapGeometry[]): number[][] {
  const used = new Set<number>()
  const pairs: number[][] = []
  const closed: LapGeometry[] = []
  const candidates = laps.filter((l) => l.distance >= MIN_TEST_KM && l.start && l.end)

  for (const lap of candidates) {
    if (used.has(lap.number)) continue
    const start = lap.start!
    const end = lap.end!
    if (closeEnough(start, end, lap.distance)) {
      closed.push(lap)
      continue
    }
    if (haversineKm(start, end) < MIN_STRAIGHTNESS * lap.distance) continue
    const heading = bearing(start, end)
    const back = candidates.find((other) => other.number > lap.number &&
      other.number <= lap.number + MAX_LAPS_BETWEEN + 1 &&
      !used.has(other.number) &&
      Math.abs(other.distance - lap.distance) <= MAX_LENGTH_MISMATCH * Math.max(other.distance, lap.distance) &&
      haversineKm(other.start!, other.end!) >= MIN_STRAIGHTNESS * other.distance &&
      headingError(bearing(other.start!, other.end!), (heading + 180) % 360) <= MAX_HEADING_ERROR &&
      closeEnough(other.end!, start, lap.distance + other.distance))
    if (back) {
      used.add(lap.number)
      used.add(back.number)
      pairs.push([lap.number, back.number])
    }
  }
  if (pairs.length) return pairs
  const typical = closed.length ? median(closed.map((l) => l.distance)) : 0
  return closed.filter((l) => l.distance >= typical / 2).map((l) => [l.number])
}

/** Analysis parameters shared by every test of a ride; CdA is what each test fits. */
export interface SharedParameters extends Omit<VirtualElevationParams, 'cda'> {
  /** % */
  dloss: number
}

export interface TestResult {
  stats: RangeStats
  /** CdA fitted by run closure */
  cda: number
  /** m, VE start-to-end change minus the recorded one at the fitted CdA */
  closureError: number
}

/**
 * Fits a test's CdA by closure: VE must return to the starting height, holding level at the joins
 * between legs. `series.airspeed` is the air speed to use.
 */
export function evaluateTest (series: ActivitySeries, ranges: IndexRange[], params: SharedParameters): TestResult {
  const run = combineRanges(series, ranges)
  const last = run.time.length - 1
  const fit = fitParameters(
    { ...run, elevation: run.altitude, drivetrainLoss: params.dloss },
    { rho: params.rho, mass: params.mass, crr: params.crr, cda: 0.3 },
    { kind: 'loops', loops: [{ start: 0, end: last }] }
  )
  return { stats: multiRangeStats(series, ranges), cda: fit.cda, closureError: fit.error }
}
