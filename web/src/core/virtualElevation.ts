import { speedToMetersPerSecond, type Units } from './units'

/**
 * Data series for R. Chung's virtual elevation method, described at
 * http://anonymous.coward.free.fr/wattage/cda/indirect-cda.pdf
 * All series are aligned by index.
 */
export interface VirtualElevationSeries {
  power: number[]
  /** Ground speed in km/h (metric) or mph (imperial). */
  speed: number[]
  /** Air speed in the same unit as speed. Pass ground speed when air speed is unknown. */
  airspeed: number[]
  elevation: number[]
  time: Array<Date | number>
  units: Units
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

const G = 9.81

/**
 * Solves the power equation for slope at each point and integrates it into a virtual elevation profile
 * that starts at the first real elevation point.
 */
export function virtualElevation (series: VirtualElevationSeries, params: VirtualElevationParams): number[] {
  const { power, speed, airspeed, elevation, time, units, drivetrainLoss = 0 } = series
  const { rho, mass, crr, cda } = params
  const vFactor = speedToMetersPerSecond(units)
  const ve: number[] = []

  power.forEach((rawPower, i) => {
    if (i === 0) {
      ve.push(elevation[0])
      return
    }

    const velocity = speed[i] / vFactor
    const vair = airspeed[i] / vFactor

    let interval = (Number(time[i]) - Number(time[i - 1])) / 1000
    if (interval === 0) interval = 1

    if (velocity === 0) {
      // Legacy behaviour: falls back to the *real* previous elevation, not the virtual one.
      ve.push(elevation[i - 1])
      return
    }

    const previousVelocity = speed[i - 1] / vFactor
    const a = (velocity ** 2 - previousVelocity ** 2) / (2 * velocity * interval)
    const p = rawPower * (1 - drivetrainLoss / 100)
    // Legacy behaviour: `a` is already an acceleration, so dividing by interval again is only
    // correct for 1 s recording intervals.
    const slope = p / (velocity * mass * G) - crr - (a / interval) / G - (cda * rho * vair ** 2) / (2 * mass * G)

    ve.push(slope * velocity * interval + ve[i - 1])
  })

  return ve
}
