export interface LatLng {
  lat: number
  lng: number
}

/** A GPS track aligned with the other activity series; null where a point has no fix. */
export type Track = Array<LatLng | null>

export interface AirSpeedPoint {
  /**
   * Air speed along the direction of travel (the head component), in the same unit as the ground and
   * wind speeds. Negative when a tailwind is faster than the rider. This is what opposes motion, and
   * what virtualElevation expects (Martin et al. 1998); crosswind effects belong in CdA.
   */
  airspeed: number
  /** Apparent wind speed: the full magnitude, including the crosswind. */
  apparent: number
  /** Yaw angle in degrees, 0 for wind from straight ahead. */
  yaw: number
}

/**
 * How exposed the course is to the wind, which sets how much slower the wind is at rider height than
 * the 10 m wind that weather models and stations report.
 */
export type WindExposure = 'open' | 'mixed' | 'sheltered'

export const WIND_EXPOSURES: WindExposure[] = ['open', 'mixed', 'sheltered']

/** Aerodynamic roughness length z₀ in m for each exposure (Davenport classes). */
const ROUGHNESS_M: Record<WindExposure, number> = { open: 0.03, mixed: 0.1, sheltered: 0.2 }

/** Height of a rider's torso, where most of the drag is, in m. */
const RIDER_HEIGHT_M = 1
const REFERENCE_HEIGHT_M = 10

/**
 * Ratio of the wind at rider height to the 10 m wind, from the logarithmic wind profile
 * u(z) ∝ ln(z / z₀): about 0.6 open, 0.5 mixed, 0.4 sheltered.
 */
export function riderHeightFactor (exposure: WindExposure): number {
  const z0 = ROUGHNESS_M[exposure]
  return Math.log(RIDER_HEIGHT_M / z0) / Math.log(REFERENCE_HEIGHT_M / z0)
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
 * @param windAngle wind direction relative to the direction of travel, in degrees (0 = headwind)
 */
export function yaw (groundSpeed: number, windSpeed: number, windAngle: number): AirSpeedPoint {
  let angle = windAngle - Math.floor(windAngle / 360) * 360
  if (angle > 180) angle = 360 - angle

  const angleRad = radians(angle)
  const headWind = Math.abs(groundSpeed) + windSpeed * Math.cos(angleRad)
  const sideWind = angle !== 180 ? Math.sin(angleRad) * windSpeed : 0

  return {
    airspeed: headWind,
    apparent: Math.sqrt(headWind ** 2 + sideWind ** 2),
    yaw: degrees(Math.atan2(sideWind, headWind))
  }
}

/**
 * Estimates air speed at each point from the GPS track and the wind.
 * @param track GPS fixes aligned with `speed`
 * @param windSpeed wind at rider height (scale a 10 m wind with riderHeightFactor first)
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

/** The wind at one point of a run, relative to the rider. */
export interface WindArrow {
  /** Index of the point in the series. */
  index: number
  /** km/h at rider height */
  speed: number
  /** Degrees the wind blows from (meteorological). */
  direction: number
  /** Degrees the wind comes from relative to the direction of travel: 0 headwind, 90 from the right, 180 tailwind. */
  relative: number
  /** Yaw angle in degrees at that point's ground speed. */
  yaw: number
}

/**
 * The wind relative to the rider at `count` evenly spaced points, for drawing arrows along a run.
 * Returns an empty list when the track has no usable direction of travel.
 */
export function windArrows (
  track: Track,
  speed: number[],
  windSpeed: number[],
  windDirection: number[],
  count = 24
): WindArrow[] {
  const bearings = travelBearings(track)
  const n = speed.length
  if (!bearings || n === 0) return []
  const step = n / count
  return Array.from({ length: Math.min(count, n) }, (_, k) => {
    const index = Math.min(n - 1, Math.floor(step * (k + 0.5)))
    const relative = (((windDirection[index] - bearings[index]) % 360) + 360) % 360
    return { index, speed: windSpeed[index], direction: windDirection[index], relative, yaw: yaw(speed[index], windSpeed[index], relative).yaw }
  })
}

/** "Headwind", "Tailwind" or a crosswind side, from the wind's angle relative to the direction of travel. */
export function windKind (relative: number): string {
  if (relative <= 45 || relative >= 315) return 'Headwind'
  if (relative >= 135 && relative <= 225) return 'Tailwind'
  return relative < 180 ? 'Crosswind from the right' : 'Crosswind from the left'
}
