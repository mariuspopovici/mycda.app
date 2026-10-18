/**
 * `segments/{id}`: saved CdA/Crr analyses (docs/architecture/data-model.md).
 *
 * While the legacy app is still in use, segments are written in its shape: series copied from the
 * activity in metric, rho in kg/m³, and mass and ve in the owner's display units. `units` records
 * which units mass and ve are in, so they can be migrated to metric after cutover (ADR-0008).
 */
import { useEffect, useState } from 'react'
import {
  collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc, where, writeBatch,
  type DocumentData, type Timestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { lbsToKg, type Units } from '../core/units'
import type { LatLng, Track } from '../core/windModel'

export interface SegmentSummary {
  id: string
  activity: string
  name: string
  description: string
  cda: number
  crr: number
  isBaseline: boolean
  rangeStart: Date
  rangeEnd: Date
}

/** Lap summary in the API/legacy shape, as stored on segments. */
export interface StoredLap {
  start_time: string | Date
  total_elapsed_time?: number
  total_distance?: number
  start_distance?: number
  avg_power?: number | string
  avg_speed?: number | string
}

export interface Segment extends SegmentSummary {
  laps: StoredLap[]
  /** kg */
  mass: number
  /** kg/m³ */
  rho: number
  /** Series as saved (metric). Absent fields mean the activity didn't have them. */
  series?: {
    time: Date[]
    power: number[]
    speed: number[]
    airspeed: number[]
    altitude: number[]
    distance: number[]
    location: Track
  }
}

const toDate = (value: unknown) => ((value as Timestamp)?.toDate ? (value as Timestamp).toDate() : new Date(value as string))
const num = (value: unknown, fallback = 0) => {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

function toSummary (id: string, data: DocumentData): SegmentSummary {
  return {
    id,
    activity: data.activity,
    name: data.name ?? 'Untitled analysis',
    description: data.description ?? '',
    cda: num(data.cda),
    crr: num(data.crr),
    isBaseline: !!data.isBaseline,
    rangeStart: toDate(data.range?.start),
    rangeEnd: toDate(data.range?.end)
  }
}

/**
 * Reads a segment. `ownerUnits` is the owner's display units, used for legacy documents that
 * don't record the units of mass and rho.
 */
export function toSegment (id: string, data: DocumentData, ownerUnits: Units): Segment {
  const units: Units = data.units ?? ownerUnits
  const massValue = num(data.mass)
  const rhoValue = num(data.rho)
  const time: unknown[] | undefined = data.time
  return {
    ...toSummary(id, data),
    mass: units === 'imperial' ? lbsToKg(massValue) : massValue,
    // the legacy app always stored kg/m³
    rho: rhoValue,
    laps: Array.isArray(data.laps)
      ? data.laps.map((lap: StoredLap) => ({ ...lap, start_time: lap.start_time && toDate(lap.start_time).toISOString() }))
      : [],
    series: time && {
      time: time.map(toDate),
      power: (data.power ?? []).map((v: unknown) => num(v)),
      speed: (data.speed ?? []).map((v: unknown) => num(v)),
      airspeed: (data.airspeed ?? data.speed ?? []).map((v: unknown) => num(v)),
      altitude: (data.altitude ?? []).map((v: unknown) => num(v)),
      distance: (data.distance ?? []).map((v: unknown) => num(v)),
      location: (data.location ?? []).map((p: LatLng | null) => (p && p.lat != null ? { lat: Number(p.lat), lng: Number(p.lng) } : null))
    }
  }
}

/** The activity's segments, live, in range order. */
export function useSegments (activityId: string) {
  const [state, setState] = useState<{ segments?: SegmentSummary[], error?: Error }>({})
  useEffect(() => onSnapshot(
    query(collection(db, 'segments'), where('activity', '==', activityId), orderBy('range.start', 'asc')),
    (snapshot) => setState({ segments: snapshot.docs.map((d) => toSummary(d.id, d.data())) }),
    (error) => setState({ error })
  ), [activityId])
  return state
}

export async function getSegment (id: string, ownerUnits: Units): Promise<Segment | undefined> {
  const snapshot = await getDoc(doc(db, 'segments', id))
  return snapshot.exists() ? toSegment(snapshot.id, snapshot.data(), ownerUnits) : undefined
}

export interface SegmentValues {
  name: string
  description: string
  cda: number
  crr: number
  /** kg */
  mass: number
  /** kg/m³ */
  rho: number
  isBaseline: boolean
  /** m */
  ve: number[]
}

/** Converts metric analysis values to the legacy storage units. */
function storedValues (values: SegmentValues, units: Units) {
  const imperial = units === 'imperial'
  return {
    name: values.name,
    description: values.description,
    cda: values.cda,
    crr: values.crr,
    mass: imperial ? values.mass * 2.205 : values.mass,
    rho: values.rho,
    ve: imperial ? values.ve.map((m) => m * 3.281) : values.ve,
    isBaseline: values.isBaseline,
    units
  }
}

/** Only one baseline per activity: clears the flag on the others. */
async function clearOtherBaselines (activityId: string, keepId: string, others: SegmentSummary[]) {
  const batch = writeBatch(db)
  others.filter((s) => s.isBaseline && s.id !== keepId && s.activity === activityId)
    .forEach((s) => batch.update(doc(db, 'segments', s.id), { isBaseline: false }))
  await batch.commit()
}

export async function createSegment (
  activityId: string,
  values: SegmentValues,
  units: Units,
  series: NonNullable<Segment['series']>,
  laps: StoredLap[],
  existing: SegmentSummary[]
): Promise<string> {
  const id = crypto.randomUUID()
  await setDoc(doc(db, 'segments', id), {
    id,
    activity: activityId,
    ...storedValues(values, units),
    range: {
      start: series.time[0],
      end: series.time[series.time.length - 1],
      startDistance: series.distance[0] ?? 0,
      endDistance: series.distance[series.distance.length - 1] ?? 0
    },
    time: series.time,
    power: series.power,
    speed: series.speed,
    airspeed: series.airspeed,
    altitude: series.altitude,
    distance: series.distance,
    location: series.location,
    laps
  })
  if (values.isBaseline) await clearOtherBaselines(activityId, id, existing)
  return id
}

export async function updateSegment (id: string, activityId: string, values: SegmentValues, units: Units, existing: SegmentSummary[]) {
  await updateDoc(doc(db, 'segments', id), storedValues(values, units))
  if (values.isBaseline) await clearOtherBaselines(activityId, id, existing)
}

export async function deleteSegment (id: string) {
  await deleteDoc(doc(db, 'segments', id))
}
