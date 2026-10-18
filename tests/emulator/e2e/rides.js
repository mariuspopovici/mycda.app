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

/**
 * An out-and-back test like a typical field protocol: warm-up, out leg (lap 2), turnaround
 * (lap 3), back leg (lap 4), cool-down. Straight 2 km legs heading north-west then south-east
 * over a gentle rise, at different speeds, in still air. Power matches TRUE_OUT_BACK exactly,
 * so closing the run recovers CdA 0.26.
 */
export const TRUE_OUT_BACK = { rho: 1.2, mass: 83, crr: 0.005, cda: 0.26 }

export function outAndBackRide () {
  const T = TRUE_OUT_BACK
  const start = new Date('2026-05-02T08:00:00Z')
  const legKm = 2
  const base = { lat: 45.5, lng: -73.6 }
  const north = (km) => ({ lat: base.lat + (km / 111.2) * Math.cos(Math.PI / 4), lng: base.lng - (km / 78.0) * Math.sin(Math.PI / 4) })
  const elevation = (km) => 100 + 2 * Math.sin((Math.PI * km) / legKm)
  const records = []
  let distance = 0
  let km = 0
  const push = (speed, lap) => {
    records.push({ time: new Date(start.getTime() + records.length * 1000), speed, altitude: elevation(Math.max(0, Math.min(legKm, km))), distance, ...north(km), lap })
  }
  const ride = (seconds, speed, direction, lap) => {
    for (let i = 0; i < seconds; i++) {
      if (records.length) { distance += speed / 3.6; km += direction * speed / 3.6 / 1000 }
      push(speed, lap)
    }
  }
  ride(60, 25, 0, 1) // warm-up in place (no GPS movement)
  const outSpeed = 40
  ride(Math.round(legKm * 1000 / (outSpeed / 3.6)), outSpeed, 1, 2)
  ride(20, 15, 0, 3) // turnaround
  const backSpeed = 34
  ride(Math.round(legKm * 1000 / (backSpeed / 3.6)), backSpeed, -1, 4)
  ride(60, 25, 0, 5)
  records.forEach((r, i) => {
    if (i === 0) { r.power = 0; return }
    const p = records[i - 1]
    const v = r.speed / 3.6
    const v0 = p.speed / 3.6
    r.power = Math.max(0, Math.round(T.crr * T.mass * G * v + 0.5 * T.cda * T.rho * v ** 3 + 0.5 * T.mass * (v ** 2 - v0 ** 2) + T.mass * G * (r.altitude - p.altitude)))
  })
  const laps = []
  for (const lap of [1, 2, 3, 4, 5]) {
    const lapRecords = records.filter((r) => r.lap === lap)
    laps.push({ start: lapRecords[0].time, end: new Date(lapRecords[lapRecords.length - 1].time.getTime() + 1000) })
  }
  return buildFit({
    records: records.map(({ lap, ...r }) => r),
    laps,
    session: { sport: 'cycling', start: laps[0].start, end: laps[4].end, avgSpeed: 32, avgPower: 220 }
  })
}
