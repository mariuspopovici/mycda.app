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

export interface AirConditions {
  /** Air temperature, °C. */
  temperature: number
  /** Dew point, °C. */
  dewPoint: number
  /** Sea-level pressure, hPa. */
  seaLevelPressure: number
  /** Altitude of the ride, m. */
  altitude?: number
}

/** Air density in kg/m³. */
export function airDensity ({ temperature, dewPoint, seaLevelPressure, altitude = 0 }: AirConditions): number {
  const pressure = altitude !== 0 ? pressureAtAltitude(seaLevelPressure, altitude, temperature) : seaLevelPressure
  const vapour = saturationVapourPressure(dewPoint)
  const dry = pressure - vapour
  const kelvin = temperature + 273.15
  return (vapour * 100) / (RV * kelvin) + (dry * 100) / (RD * kelvin)
}
