export interface LatLng {
  lat: number
  lng: number
}

/** A GPS track aligned with the other activity series; null where a point has no fix. */
export type Track = Array<LatLng | null>

export interface AirSpeedPoint {
  /** Air speed in the same unit as the ground and wind speeds. */
  airspeed: number
  /** Yaw angle in degrees. */
  yaw: number
}

/** Points on either side used to estimate the direction of travel. */
const BEARING_HALF_WINDOW = 5

const radians = (degrees: number) => (degrees * Math.PI) / 180
const degrees = (rad: number) => (rad * 180) / Math.PI

/** Initial compass bearing from one point to another, in [0, 360). */
export function bearing (from: LatLng, to: LatLng): number {
  const phi1 = radians(from.lat)
  const phi2 = radians(to.lat)
  const deltaLambda = radians(to.lng - from.lng)

  const y = Math.sin(deltaLambda) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)
  return (degrees(Math.atan2(y, x)) + 360) % 360
}

/**
 * Direction of travel at each point, from the GPS fixes up to BEARING_HALF_WINDOW points before and
 * after it. Points without a usable bearing (no fix nearby, standing still) take the nearest known one.
 * Returns undefined when the track has no usable bearing at all.
 */
export function travelBearings (track: Track): number[] | undefined {
  const n = track.length
  const bearings: Array<number | undefined> = track.map((_, i) => {
    let from = Math.max(0, i - BEARING_HALF_WINDOW)
    while (from < i && !track[from]) from++
    let to = Math.min(n - 1, i + BEARING_HALF_WINDOW)
    while (to > i && !track[to]) to--
    const a = track[from]
    const b = track[to]
    if (!a || !b || from === to || (a.lat === b.lat && a.lng === b.lng)) return undefined
    return bearing(a, b)
  })

  const firstKnown = bearings.find((b) => b !== undefined)
  if (firstKnown === undefined) return undefined

  let last = firstKnown
  return bearings.map((b) => (last = b ?? last))
}

/**
 * Combines ground speed with wind into air speed and yaw.
 * @param windAngle wind direction relative to the direction of travel, in degrees
 */
export function yaw (groundSpeed: number, windSpeed: number, windAngle: number): AirSpeedPoint {
  let angle = windAngle - Math.floor(windAngle / 360) * 360
  if (angle > 180) angle = 360 - angle

  const angleRad = radians(angle)
  const headWind = Math.abs(groundSpeed) + windSpeed * Math.cos(angleRad)
  const sideWind = angle !== 180 ? Math.sin(angleRad) * windSpeed : 0

  return {
    airspeed: Math.sqrt(headWind ** 2 + sideWind ** 2),
    yaw: (Math.atan(sideWind / headWind) * 180) / Math.PI
  }
}

/**
 * Estimates air speed at each point from the GPS track and the wind.
 * @param track GPS fixes aligned with `speed`
 * @param windDirection meteorological wind direction (where the wind blows from), in degrees
 * @throws when the track has no usable GPS data
 */
export function windModelAirSpeed (
  track: Track,
  speed: number[],
  windSpeed: number[],
  windDirection: number[]
): AirSpeedPoint[] {
  const bearings = travelBearings(track)
  if (!bearings) throw new Error('The wind model needs GPS data.')
  return speed.map((groundSpeed, i) => yaw(groundSpeed, windSpeed[i], windDirection[i] - bearings[i]))
}
