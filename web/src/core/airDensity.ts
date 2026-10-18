/**
 * Air density from temperature, pressure and dew point, ported from @mariuspopovici/rho 0.1.4.
 * Saturation vapour pressure uses Herman Wobus' polynomial.
 */

// Herman Wobus polynomial coefficients
const C = [
  0.99999683, -0.90826951e-2, 0.78736169e-4, -0.61117958e-6, 0.43884187e-8,
  -0.29883885e-10, 0.21874425e-12, -0.17892321e-14, 0.11112018e-16, -0.30994571e-19
]
const RD = 287.0531 // gas constant for dry air, J/(kg·K)
const RV = 461.4964 // gas constant for water vapour, J/(kg·K)
const G = 9.80665 // m/s²
const M = 0.0289644 // molar mass of air, kg/mol
const R = 8.31432 // universal gas constant, J/(mol·K)

/** Saturation vapour pressure in hPa at `t` °C. */
export function saturationVapourPressure (t: number): number {
  let p = C[9]
  for (let i = 8; i >= 0; i--) p = C[i] + t * p
  return 6.1078 / p ** 8
}

/** Barometric adjustment of sea-level pressure (hPa) to an altitude (m) at temperature `t` °C. */
export function pressureAtAltitude (seaLevelHpa: number, altitude: number, t: number): number {
  return seaLevelHpa * Math.exp((-G * M * altitude) / (R * (t + 273.15)))
}

/**
 * Dew point (°C) from temperature (°C) and relative humidity (%), by the Magnus formula
 * (Alduchov & Eskridge coefficients; within ~0.1 °C for -40–50 °C).
 */
export function dewPointFromHumidity (temperature: number, relativeHumidity: number): number {
  const a = 17.625
  const b = 243.04
  const gamma = Math.log(Math.max(relativeHumidity, 0.1) / 100) + (a * temperature) / (b + temperature)
  return (b * gamma) / (a - gamma)
}

export type AirConditions = {
  /** Air temperature, °C. */
  temperature: number
  /** Dew point, °C. */
  dewPoint: number
} & (
  /** Pressure reduced to sea level, as weather services report it, hPa; adjusted to `altitude`. */
  | { seaLevelPressure: number, altitude?: number, stationPressure?: never }
  /** Pressure measured where you rode (a barometer or altimeter's raw reading), hPa. */
  | { stationPressure: number, seaLevelPressure?: never, altitude?: never }
)

/** Air density in kg/m³. */
export function airDensity (conditions: AirConditions): number {
  const { temperature, dewPoint } = conditions
  const pressure = conditions.stationPressure !== undefined
    ? conditions.stationPressure
    : (conditions.altitude ?? 0) !== 0
        ? pressureAtAltitude(conditions.seaLevelPressure, conditions.altitude ?? 0, temperature)
        : conditions.seaLevelPressure
  const vapour = saturationVapourPressure(dewPoint)
  const dry = pressure - vapour
  const kelvin = temperature + 273.15
  return (vapour * 100) / (RV * kelvin) + (dry * 100) / (RD * kelvin)
}
