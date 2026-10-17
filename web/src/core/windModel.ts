export interface LatLng {
  lat: number
  lng: number
}

export interface AirSpeedPoint {
  /** Air speed in the same unit as the ground and wind speeds. */
  airspeed: number
  /** Yaw angle in degrees. */
  yaw: number
}

const radians = (degrees: number) => (degrees * Math.PI) / 180
const degrees = (rad: number) => (rad * 180) / Math.PI

/** Initial bearing from one point to another, truncated to whole degrees in [0, 360). */
export function bearing (from: LatLng, to: LatLng): number {
  const phi1 = radians(from.lat)
  const phi2 = radians(to.lat)
  const deltaLambda = radians(to.lng - from.lng)

  const y = Math.sin(deltaLambda) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)
  return (Math.trunc(degrees(Math.atan2(y, x))) + 360) % 360
}

/** Direction of travel at each point, re-evaluated every 10 points. */
export function travelBearings (location: LatLng[]): number[] {
  let start = location[0]
  let current = bearing(start, location[Math.min(10, location.length - 1)])

  return location.map((point, index) => {
    if (index > 0 && index % 10 === 0) {
      current = bearing(start, point)
      start = point
    }
    return current
  })
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
 * @param windDirection meteorological wind direction (where the wind blows from), in degrees
 */
export function windModelAirSpeed (
  location: LatLng[],
  speed: number[],
  windSpeed: number[],
  windDirection: number[]
): AirSpeedPoint[] {
  const bearings = travelBearings(location)
  return speed.map((groundSpeed, i) =>
    yaw(groundSpeed, windSpeed[i], (windDirection[i] - bearings[i]) % 360)
  )
}
