import { kmToMi, type Units } from '../core/units'

export const distanceUnit = (units: Units) => (units === 'metric' ? 'km' : 'mi')
export const speedUnit = (units: Units) => (units === 'metric' ? 'km/h' : 'mph')
export const weightUnit = (units: Units) => (units === 'metric' ? 'kg' : 'lbs')

/** Formats a distance given in km. */
export function formatDistance (km: number | undefined, units: Units): string {
  if (km === undefined) return '–'
  return `${(units === 'metric' ? km : kmToMi(km)).toFixed(1)} ${distanceUnit(units)}`
}

/** Formats a speed given in km/h. */
export function formatSpeed (kmh: number | undefined, units: Units): string {
  if (kmh === undefined) return '–'
  return `${(units === 'metric' ? kmh : kmToMi(kmh)).toFixed(1)} ${speedUnit(units)}`
}

export function formatPower (watts: number | undefined): string {
  return watts === undefined ? '–' : `${Math.round(watts)} W`
}

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatDateTime (date: Date | undefined): string {
  return date ? dateTime.format(date) : '–'
}
