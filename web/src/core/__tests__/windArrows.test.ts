import { describe, expect, it } from 'vitest'
import { windArrows, windKind, type LatLng } from '../windModel'

const KM_LAT = 1 / 111.2
/** An out and back due north and back south, one point per 10 m. */
const track: LatLng[] = [
  ...Array.from({ length: 100 }, (_, i) => ({ lat: 45 + i * 0.01 * KM_LAT, lng: -73 })),
  ...Array.from({ length: 100 }, (_, i) => ({ lat: 45 + (99 - i) * 0.01 * KM_LAT, lng: -73 }))
]
const speed = track.map(() => 36)

describe('windArrows', () => {
  it('turns a steady north wind into a headwind out and a tailwind back', () => {
    const arrows = windArrows(track, speed, track.map(() => 10), track.map(() => 0), 4)
    expect(arrows.map((a) => a.index)).toEqual([25, 75, 125, 175])
    expect(arrows[0].relative).toBeCloseTo(0, 0)
    expect(arrows[3].relative).toBeCloseTo(180, 0)
    expect(arrows.every((a) => a.speed === 10 && a.direction === 0)).toBe(true)
    expect(Math.abs(arrows[0].yaw)).toBeLessThan(0.5)
  })

  it('gives a crosswind from the right 90° and a yaw angle', () => {
    // riding north, wind from the east
    const [arrow] = windArrows(track.slice(0, 100), speed.slice(0, 100), track.map(() => 10), track.map(() => 90), 1)
    expect(arrow.relative).toBeCloseTo(90, 0)
    expect(arrow.yaw).toBeCloseTo(Math.atan2(10, 36) * 180 / Math.PI, 1)
  })

  it('needs GPS', () => {
    expect(windArrows([null, null], [30, 30], [5, 5], [0, 0])).toEqual([])
  })
})

describe('windKind', () => {
  it('names the wind by where it comes from relative to the rider', () => {
    expect(windKind(10)).toBe('Headwind')
    expect(windKind(350)).toBe('Headwind')
    expect(windKind(180)).toBe('Tailwind')
    expect(windKind(90)).toBe('Crosswind from the right')
    expect(windKind(270)).toBe('Crosswind from the left')
  })
})
