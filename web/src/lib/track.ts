import type { LatLngTuple } from 'leaflet'
import type { Track } from '../core/windModel'

/** Splits a track at missing fixes so gaps aren't drawn as straight lines. */
export function trackSegments (track: Track, from = 0, to = track.length - 1): LatLngTuple[][] {
  const segments: LatLngTuple[][] = []
  let current: LatLngTuple[] = []
  for (let i = Math.max(0, from); i <= Math.min(to, track.length - 1); i++) {
    const p = track[i]
    if (p) {
      current.push([p.lat, p.lng])
    } else if (current.length) {
      segments.push(current)
      current = []
    }
  }
  if (current.length) segments.push(current)
  return segments
}
