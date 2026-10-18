import type { IndexRange } from './selection'
import { virtualElevation, type VirtualElevationParams, type VirtualElevationSeries } from './virtualElevation'

/**
 * How well a virtual elevation profile explains the ride:
 * - `elevation`: RMS difference from the recorded elevation over the whole range;
 * - `loops`: RMS of each loop's virtual elevation drift (start-to-end change in VE minus the change
 *   in recorded elevation). On a closed loop a correct CdA/Crr returns VE to where it started, so
 *   this works even when the recorded elevation is noisy.
 */
export type FitTarget = { kind: 'elevation' } | { kind: 'loops', loops: IndexRange[] }

export function fitError (series: VirtualElevationSeries, params: VirtualElevationParams, target: FitTarget): number {
  const ve = virtualElevation(series, params)
  const { elevation } = series
  if (target.kind === 'loops') {
    if (target.loops.length === 0) return NaN
    const drifts = target.loops.map(({ start, end }) => (ve[end] - ve[start]) - (elevation[end] - elevation[start]))
    return Math.sqrt(drifts.reduce((sum, d) => sum + d * d, 0) / drifts.length)
  }
  // compare shapes, not absolute heights: VE starts at the first recorded elevation
  return Math.sqrt(ve.reduce((sum, v, i) => sum + (v - elevation[i]) ** 2, 0) / ve.length)
}

/** Minimizes a unimodal function on [lo, hi] by golden-section search. */
export function goldenSection (f: (x: number) => number, lo: number, hi: number, tolerance = 1e-5): number {
  const ratio = (Math.sqrt(5) - 1) / 2
  let a = lo
  let b = hi
  let c = b - ratio * (b - a)
  let d = a + ratio * (b - a)
  let fc = f(c)
  let fd = f(d)
  while (b - a > tolerance) {
    if (fc < fd) {
      b = d; d = c; fd = fc
      c = b - ratio * (b - a); fc = f(c)
    } else {
      a = c; c = d; fc = fd
      d = a + ratio * (b - a); fd = f(d)
    }
  }
  return (a + b) / 2
}

/**
 * Minimizes f on [lo, hi]: a coarse scan finds the lowest of `steps` evenly spaced points, then
 * golden-section search refines between its neighbours. The scan keeps a local dip in a noisy error
 * curve from trapping the search.
 */
export function minimize (f: (x: number) => number, lo: number, hi: number, tolerance = 1e-5, steps = 16): number {
  const step = (hi - lo) / steps
  let best = 0
  let bestValue = Infinity
  for (let i = 0; i <= steps; i++) {
    const value = f(lo + i * step)
    if (value < bestValue) { best = i; bestValue = value }
  }
  return goldenSection(f, lo + Math.max(best - 1, 0) * step, lo + Math.min(best + 1, steps) * step, tolerance)
}

export const CDA_BOUNDS: [number, number] = [0.05, 0.8]
export const CRR_BOUNDS: [number, number] = [0.001, 0.02]

export interface FitResult {
  cda: number
  crr: number
  /** Value of the fit target at the result, m. */
  error: number
  /** The best value lies at the edge of the search range, so the data or the other parameters are likely off. */
  atBound: boolean
}

/**
 * Whether the target can tell CdA and Crr apart. A single closure is one equation in two unknowns:
 * any pair along a line closes it, so Crr needs the elevation profile or at least two loops.
 */
export function canFitCrr (target: FitTarget): boolean {
  return target.kind === 'elevation' || target.loops.length >= 2
}

const nearBound = (x: number, [lo, hi]: [number, number]) => x - lo < (hi - lo) * 1e-3 || hi - x < (hi - lo) * 1e-3

/**
 * Finds the CdA (and optionally Crr) that best explains the ride, keeping the other parameters.
 * Crr is fitted only when the target can separate it from CdA (see canFitCrr).
 */
export function fitParameters (
  series: VirtualElevationSeries,
  params: VirtualElevationParams,
  target: FitTarget,
  options: { fitCrr?: boolean } = {}
): FitResult {
  const bestCda = (crr: number) => minimize((cda) => fitError(series, { ...params, crr, cda }, target), ...CDA_BOUNDS)
  if (!options.fitCrr || !canFitCrr(target)) {
    const cda = bestCda(params.crr)
    return { cda, crr: params.crr, error: fitError(series, { ...params, cda }, target), atBound: nearBound(cda, CDA_BOUNDS) }
  }
  const crr = minimize((c) => fitError(series, { ...params, crr: c, cda: bestCda(c) }, target), ...CRR_BOUNDS, 1e-6, 8)
  const cda = bestCda(crr)
  return {
    cda, crr, error: fitError(series, { ...params, cda, crr }, target),
    atBound: nearBound(cda, CDA_BOUNDS) || nearBound(crr, CRR_BOUNDS)
  }
}
