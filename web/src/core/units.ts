export type Units = 'metric' | 'imperial'

const KM_PER_MI = 1.609
const FT_PER_M = 3.281
const LBS_PER_KG = 2.205
const HPA_PER_INHG = 33.863886666667

export const kmToMi = (km: number) => km / KM_PER_MI
export const miToKm = (mi: number) => mi * KM_PER_MI
export const mToFt = (m: number) => m * FT_PER_M
export const ftToM = (ft: number) => ft / FT_PER_M
export const kgToLbs = (kg: number) => kg * LBS_PER_KG
export const lbsToKg = (lbs: number) => lbs / LBS_PER_KG
export const hpaToInHg = (hpa: number) => hpa / HPA_PER_INHG
export const inHgToHpa = (inHg: number) => inHg * HPA_PER_INHG
export const toFahrenheit = (c: number) => (c * 9) / 5 + 32
export const toCelsius = (f: number) => ((f - 32) * 5) / 9

const KG_M3_PER_LB_FT3 = 16.018463
/** Air density conversions; analysis always uses kg/m³. */
export const lbPerFt3ToKgPerM3 = (rho: number) => rho * KG_M3_PER_LB_FT3
export const kgPerM3ToLbPerFt3 = (rho: number) => rho / KG_M3_PER_LB_FT3

/** Formats seconds as hh:mm:ss. */
export function secondsToHms (seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor((seconds % 3600) % 60)
  const pad = (n: number) => ('0' + n).slice(-2)
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
