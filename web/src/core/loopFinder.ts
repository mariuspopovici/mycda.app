import type { Track } from './windModel'

export type LoopPrecision = 'low' | 'medium' | 'high'

export interface Loop {
  /** Point where the loop closes, rounded to the search precision. */
  coords: { lat: string, lng: string }
  startIndex: number
  endIndex: number
  /** Loop length in number of points. */
  distance: number
}

/**
 * Decimal places used when matching coordinates: 3 ≈ neighbourhood, 4 ≈ individual street,
 * 5 ≈ individual trees / door entrance.
 */
export function precisionDigits (precision: LoopPrecision): number {
  return { low: 3, medium: 4, high: 5 }[precision] ?? 4
}

/**
 * Finds loops in a GPS track by detecting when the track returns to a previously visited
 * (rounded) coordinate. Loop durations and indexes are in points of the aligned track;
 * points without a fix are skipped.
 */
export function findLoops (
  coords: Track,
  digits = 4,
  minLoopDuration = 80,
  maxLoopDuration = 200
): Loop[] {
  let seen = new Map<string, number>()
  const loops: Loop[] = []

  coords.forEach((point, index) => {
    if (!point) return
    const lat = Number(point.lat).toFixed(digits)
    const lng = Number(point.lng).toFixed(digits)
    const key = lat + lng
    const firstIndex = seen.get(key)

    if (firstIndex === undefined) {
      seen.set(key, index)
      return
    }

    const duration = index - firstIndex
    if (duration > minLoopDuration && duration < maxLoopDuration) {
      loops.push({ coords: { lat, lng }, startIndex: firstIndex, endIndex: index, distance: duration })
      seen = new Map()
    }
  })

  return loops
}
