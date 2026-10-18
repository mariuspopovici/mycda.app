/**
 * Data series for R. Chung's virtual elevation method, described at
 * http://anonymous.coward.free.fr/wattage/cda/indirect-cda.pdf
 * All series are aligned by index and in metric units; convert for display only.
 */
export interface VirtualElevationSeries {
  /** Power in W. */
  power: number[]
  /** Ground speed in km/h. */
  speed: number[]
  /** Air speed in km/h, negative for a tailwind faster than the rider. Pass ground speed when unknown. */
  airspeed: number[]
  /** Elevation in m. */
  elevation: number[]
  time: Array<Date | number>
  /** Drivetrain loss in percent, applied to power. */
  drivetrainLoss?: number
}

export interface VirtualElevationParams {
  /** Air density in kg/m³. */
  rho: number
  /** Rider + bike mass in kg. */
  mass: number
  crr: number
  cda: number
}

/**
 * Gaps longer than this are treated as pauses (auto-pause, dropouts) instead of integrating one
 * power reading over the whole gap. Smart recording produces moving gaps of a few seconds, which
 * are integrated normally.
 */
export const MAX_INTEGRATION_GAP_SECONDS = 10

const G = 9.81
const KMH_PER_MS = 3.6

/**
 * Integrates the energy balance between consecutive points into a virtual elevation profile that
 * starts at the first real elevation point:
 *
 *   m·g·Δh = P·Δt − Crr·m·g·v·Δt − ½·CdA·ρ·v_air·|v_air|·v·Δt − ½·m·(v² − v₀²)
 *
 * Where there is nothing to integrate (stopped, pauses, repeated timestamps) the virtual elevation
 * follows the real elevation change, which is ~0 while standing still. Unlike snapping to the real
 * elevation, this keeps any drift visible, and drift is what CdA and Crr are tuned to remove.
 */
export function virtualElevation (series: VirtualElevationSeries, params: VirtualElevationParams): number[] {
  const { power, speed, airspeed, elevation, time, drivetrainLoss = 0 } = series
  const { rho, mass, crr, cda } = params
  const efficiency = 1 - drivetrainLoss / 100
  const ve: number[] = []

  power.forEach((watts, i) => {
    if (i === 0) {
      ve.push(elevation[0])
      return
    }

    const dt = (Number(time[i]) - Number(time[i - 1])) / 1000
    const v = speed[i] / KMH_PER_MS
    const v0 = speed[i - 1] / KMH_PER_MS
    const vair = airspeed[i] / KMH_PER_MS

    if (v <= 0 || dt <= 0 || dt > MAX_INTEGRATION_GAP_SECONDS) {
      ve.push(ve[i - 1] + elevation[i] - elevation[i - 1])
      return
    }

    const work = watts * efficiency * dt
    const rolling = crr * mass * G * v * dt
    const aero = 0.5 * cda * rho * vair * Math.abs(vair) * v * dt
    const kinetic = 0.5 * mass * (v ** 2 - v0 ** 2)

    ve.push(ve[i - 1] + (work - rolling - aero - kinetic) / (mass * G))
  })

  return ve
}
