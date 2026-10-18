import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { buildFit } = require(resolve(import.meta.dirname, '../../../functions/test/fit-builder.js'))

const G = 9.81
const TRUE = { rho: 1.2, mass: 83, crr: 0.005, cda: 0.26 }

/**
 * Three laps of a ~1.6 km loop with rolling terrain and varying speed, whose power matches TRUE
 * exactly, so the suggested CdA should come out at 0.26.
 */
export function circuitRide () {
  const perLap = 200
  const laps = 3
  const start = new Date('2026-05-01T08:00:00Z')
  const records = []
  let distance = 0
  for (let i = 0; i < laps * perLap; i++) {
    const angle = (2 * Math.PI * i) / perLap
    const speed = 30 + 6 * Math.sin(angle) + 2 * Math.sin(i / 13)
    const altitude = 100 + 1.5 * Math.sin(angle)
    if (i > 0) distance += speed / 3.6
    records.push({ time: new Date(start.getTime() + i * 1000), speed, altitude, distance, lat: 45.5 + 0.0025 * Math.cos(angle), lng: -73.6 + 0.0035 * Math.sin(angle) })
  }
  records.forEach((r, i) => {
    if (i === 0) { r.power = 0; return }
    const p = records[i - 1]
    const v = r.speed / 3.6
    const v0 = p.speed / 3.6
    r.power = Math.round(TRUE.crr * TRUE.mass * G * v + 0.5 * TRUE.cda * TRUE.rho * v ** 3 + 0.5 * TRUE.mass * (v ** 2 - v0 ** 2) + TRUE.mass * G * (r.altitude - p.altitude))
  })
  const at = (s) => new Date(start.getTime() + s * 1000)
  return buildFit({
    records,
    laps: [0, 1, 2].map((k) => ({ start: at(k * perLap), end: at((k + 1) * perLap) })),
    session: { sport: 'cycling', start: at(0), end: at(laps * perLap), avgSpeed: 30, avgPower: 200 }
  })
}
