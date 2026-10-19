import { fitError, fitParameters, type FitTarget } from './fit'
import { MAX_INTEGRATION_GAP_SECONDS, virtualElevation, type VirtualElevationParams, type VirtualElevationSeries } from './virtualElevation'

/** One part of a run: a leg of a joined run, or a third of a single range. */
export interface PartDiagnostics {
  /** s */
  seconds: number
  /** km */
  distance: number
  /** km/h, ground speed */
  averageSpeed: number
  /** km/h */
  averageAirspeed: number
  /** W */
  averagePower: number
  /** m, recorded elevation change across the part */
  elevationChange: number
  /** m, virtual elevation change across the part at the current parameters */
  virtualElevationChange: number
}

/** How far the fitted CdA moves when one input changes by a typical measurement error. */
export interface Sensitivity {
  /** m² of CdA per +1 kg of mass */
  massPlus1kg: number
  /** per +1 % of power */
  powerPlus1Percent: number
  /** per +0.0005 of Crr */
  crrPlus00005: number
  /** per +0.01 kg/m³ of air density */
  rhoPlus001: number
  /** per +2 km/h of air speed throughout (an air speed or wind error) */
  airspeedPlus2kmh: number
}

/**
 * What an analysis shows, as numbers: computed here so that anything explaining the run (a person or
 * a language model) works from the same facts and never computes CdA itself. All metric.
 */
export interface RunDiagnostics {
  /** s */
  duration: number
  /** km */
  distance: number
  /** 'legs' for a run joined from several ranges (out and back), 'thirds' otherwise */
  partsKind: 'legs' | 'thirds'
  parts: PartDiagnostics[]
  /** m, VE change minus recorded elevation change over the whole run, at the current parameters (0 = closes) */
  closureError: number
  /** m, RMS difference between VE and the recorded elevation, at the current parameters */
  elevationRms: number
  /** the CdA that best meets the fit target, with the other parameters as they are */
  fittedCda: number
  /** the fit ended at the edge of the search range */
  fittedAtBound: boolean
  sensitivity: Sensitivity
  dataQuality: {
    /** gaps between samples over 10 s (pauses, dropouts, smart recording) */
    gaps: number
    /** % of moving samples (over 10 km/h) with zero power: coasting or power dropouts */
    zeroPowerWhileMoving: number
    /** W */
    maxPower: number
    /** km/h */
    minSpeed: number
    maxSpeed: number
  }
}

const sum = (values: number[]) => values.reduce((s, v) => s + v, 0)

/** Splits a run at its joins, or into thirds when it is a single range. */
function partsOf (length: number, breaks: number[]): Array<[number, number]> {
  if (breaks.length) {
    const starts = [0, ...breaks]
    return starts.map((start, i) => [start, (starts[i + 1] ?? length) - 1])
  }
  const third = Math.floor(length / 3)
  return [[0, third - 1], [third, 2 * third - 1], [2 * third, length - 1]]
}

/** Seconds between two samples. */
const dtAt = (time: Array<Date | number>, i: number) => (Number(time[i]) - Number(time[i - 1])) / 1000

/**
 * Diagnostics for a run (the analysis page's series, with the air speed it uses) at the current
 * parameters, with `target` the fit behind its suggested CdA.
 */
export function runDiagnostics (
  series: VirtualElevationSeries & { distance: number[] },
  params: VirtualElevationParams,
  target: FitTarget
): RunDiagnostics {
  const n = series.power.length
  const { time, elevation, speed, airspeed, power, distance, breaks = [] } = series
  const ve = virtualElevation(series, params)
  const last = n - 1

  const parts = partsOf(n, breaks).map(([a, b]): PartDiagnostics => {
    // average over moving time, like the activity page's stats
    let weight = 0; let watts = 0; let ground = 0; let air = 0
    for (let i = a + 1; i <= b; i++) {
      const dt = dtAt(time, i)
      if (dt > 0 && dt <= MAX_INTEGRATION_GAP_SECONDS) {
        weight += dt; watts += power[i] * dt; ground += speed[i] * dt; air += airspeed[i] * dt
      }
    }
    return {
      seconds: (Number(time[b]) - Number(time[a])) / 1000,
      distance: distance[b] - distance[a],
      averageSpeed: weight ? ground / weight : 0,
      averageAirspeed: weight ? air / weight : 0,
      averagePower: weight ? watts / weight : 0,
      elevationChange: elevation[b] - elevation[a],
      virtualElevationChange: ve[b] - ve[a]
    }
  })

  const fit = (s: typeof series, p: VirtualElevationParams) => fitParameters(s, p, target).cda
  const fitted = fitParameters(series, params, target)
  const delta = (s: typeof series, p: VirtualElevationParams) => fit(s, p) - fitted.cda

  let gaps = 0; let moving = 0; let zero = 0
  for (let i = 1; i < n; i++) if (dtAt(time, i) > MAX_INTEGRATION_GAP_SECONDS) gaps++
  for (let i = 0; i < n; i++) {
    if (speed[i] > 10) {
      moving++
      if (power[i] === 0) zero++
    }
  }

  return {
    duration: (Number(time[last]) - Number(time[0])) / 1000,
    distance: sum(parts.map((p) => p.distance)),
    partsKind: breaks.length ? 'legs' : 'thirds',
    parts,
    closureError: (ve[last] - ve[0]) - (elevation[last] - elevation[0]),
    elevationRms: fitError(series, params, { kind: 'elevation' }),
    fittedCda: fitted.cda,
    fittedAtBound: fitted.atBound,
    sensitivity: {
      massPlus1kg: delta(series, { ...params, mass: params.mass + 1 }),
      powerPlus1Percent: delta({ ...series, power: power.map((w) => w * 1.01) }, params),
      crrPlus00005: delta(series, { ...params, crr: params.crr + 0.0005 }),
      rhoPlus001: delta(series, { ...params, rho: params.rho + 0.01 }),
      airspeedPlus2kmh: delta({ ...series, airspeed: airspeed.map((a) => a + 2) }, params)
    },
    dataQuality: {
      gaps,
      zeroPowerWhileMoving: moving ? (zero / moving) * 100 : 0,
      maxPower: Math.max(0, ...power),
      minSpeed: Math.min(...speed),
      maxSpeed: Math.max(...speed)
    }
  }
}
