/**
 * `segments/{id}`: saved CdA/Crr analyses (docs/architecture/data-model.md, ADR-0013).
 *
 * Version 2 documents store the analysed time ranges (one or more, e.g. the out and back legs of a
 * test) and metric parameters; the series are read from the activity. Legacy documents (no
 * `version`) copy the series and store mass and ve in the owner's display units (ADR-0012); they
 * are still read as before, and editing one rewrites it as version 2.
 */
import { useEffect, useState } from 'react'
import {
  collection, deleteDoc, deleteField, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc, where, writeBatch,
  type DocumentData, type Timestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { lbsToKg, type Units } from '../core/units'
import type { LatLng, Track, WindExposure } from '../core/windModel'
import { isWindExposure } from './activities'

export const SEGMENT_VERSION = 2

export interface TimeRange {
  start: Date
  end: Date
}

export type AirspeedSource = 'measured' | 'ground' | 'wind' | 'manual'

/** A constant wind entered by the user. */
export interface ManualWind {
  /** km/h */
  speed: number
  /** Degrees the wind blows from. */
  direction: number
  /**
   * The speed was measured at rider height. Otherwise it is a 10 m value (a forecast or weather
   * station) and is scaled down by the wind exposure.
   */
  atRiderHeight?: boolean
}

/** Air speed sources that use a wind, and so the wind exposure. */
export const usesWind = (source: AirspeedSource) => source === 'wind' || source === 'manual'

export interface SegmentSummary {
  id: string
  activity: string
  name: string
  description: string
  cda: number
  crr: number
  isBaseline: boolean
  /** Start of the first range and end of the last. */
  rangeStart: Date
  rangeEnd: Date
  /** The analysed ranges, in order; one for legacy segments. */
  ranges: TimeRange[]
}

/** Lap summary in the API/legacy shape, as stored on legacy segments. */
export interface StoredLap {
  start_time: string | Date
  total_elapsed_time?: number
  total_distance?: number
  start_distance?: number
  avg_power?: number | string
  avg_speed?: number | string
}

export interface Segment extends SegmentSummary {
  version: number
  /** kg */
  mass: number
  /** kg/m³ */
  rho: number
  /** % (version 2; legacy segments used the profile's) */
  dloss?: number
  airspeedSource?: AirspeedSource
  wind?: ManualWind
  /** Wind exposure the analysis was saved with (wind and manual sources; ADR-0014). */
  windExposure?: WindExposure
  /** Legacy segments only. */
  laps: StoredLap[]
  /** Series copied into legacy segments (metric). Version 2 segments read the activity instead. */
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
const optionalNum = (value: unknown) => {
  const n = num(value, NaN)
  return Number.isFinite(n) ? n : undefined
}

function toSummary (id: string, data: DocumentData): SegmentSummary {
  const rangeStart = toDate(data.range?.start)
  const rangeEnd = toDate(data.range?.end)
  const ranges: TimeRange[] = Array.isArray(data.ranges) && data.ranges.length
    ? data.ranges.map((r: { start: unknown, end: unknown }) => ({ start: toDate(r.start), end: toDate(r.end) }))
    : [{ start: rangeStart, end: rangeEnd }]
  return {
    id,
    activity: data.activity,
    name: data.name ?? 'Untitled analysis',
    description: data.description ?? '',
    cda: num(data.cda),
    crr: num(data.crr),
    isBaseline: !!data.isBaseline,
    rangeStart,
    rangeEnd,
    ranges
  }
}

/**
 * Reads a segment. `ownerUnits` is the owner's display units, used for legacy documents that
 * don't record the units of mass.
 */
export function toSegment (id: string, data: DocumentData, ownerUnits: Units): Segment {
  const version = num(data.version, 1)
  const units: Units = version >= 2 ? 'metric' : data.units ?? ownerUnits
  const massValue = num(data.mass)
  const time: unknown[] | undefined = version >= 2 ? undefined : data.time
  const source = data.airspeedSource
  return {
    ...toSummary(id, data),
    version,
    mass: units === 'imperial' ? lbsToKg(massValue) : massValue,
    // always kg/m³, including in legacy documents
    rho: num(data.rho),
    dloss: optionalNum(data.dloss),
    airspeedSource: ['measured', 'ground', 'wind', 'manual'].includes(source) ? source : undefined,
    wind: data.wind && Number.isFinite(data.wind.speed) && Number.isFinite(data.wind.direction)
      ? { speed: data.wind.speed, direction: data.wind.direction, ...(data.wind.atRiderHeight === true ? { atRiderHeight: true } : {}) }
      : undefined,
    windExposure: isWindExposure(data.windExposure) ? data.windExposure : undefined,
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
  /** % */
  dloss: number
  isBaseline: boolean
  airspeedSource: AirspeedSource
  wind?: ManualWind
  windExposure?: WindExposure
}

/** The version 2 document body; legacy-only fields are removed on update. */
export function segmentDocument (values: SegmentValues, ranges: TimeRange[]) {
  return {
    version: SEGMENT_VERSION,
    name: values.name,
    description: values.description,
    cda: values.cda,
    crr: values.crr,
    mass: values.mass,
    rho: values.rho,
    dloss: values.dloss,
    isBaseline: values.isBaseline,
    airspeedSource: values.airspeedSource,
    wind: values.airspeedSource === 'manual' && values.wind ? values.wind : null,
    windExposure: usesWind(values.airspeedSource) && values.windExposure ? values.windExposure : null,
    // range spans all ranges: it orders the activity's segment list
    range: { start: ranges[0].start, end: ranges[ranges.length - 1].end },
    ranges: ranges.map((r) => ({ start: r.start, end: r.end }))
  }
}

const LEGACY_FIELDS = ['units', 've', 'time', 'power', 'speed', 'airspeed', 'altitude', 'distance', 'location', 'laps']

/** Only one baseline per activity: clears the flag on the others. */
async function clearOtherBaselines (activityId: string, keepId: string, others: SegmentSummary[]) {
  const batch = writeBatch(db)
  others.filter((s) => s.isBaseline && s.id !== keepId && s.activity === activityId)
    .forEach((s) => batch.update(doc(db, 'segments', s.id), { isBaseline: false }))
  await batch.commit()
}

export async function createSegment (activityId: string, values: SegmentValues, ranges: TimeRange[], existing: SegmentSummary[]): Promise<string> {
  const id = crypto.randomUUID()
  await setDoc(doc(db, 'segments', id), { id, activity: activityId, ...segmentDocument(values, ranges) })
  if (values.isBaseline) await clearOtherBaselines(activityId, id, existing)
  return id
}

/** Saves an analysis, rewriting legacy documents as version 2. */
export async function updateSegment (id: string, activityId: string, values: SegmentValues, ranges: TimeRange[], existing: SegmentSummary[]) {
  await updateDoc(doc(db, 'segments', id), {
    ...segmentDocument(values, ranges),
    ...Object.fromEntries(LEGACY_FIELDS.map((f) => [f, deleteField()]))
  })
  if (values.isBaseline) await clearOtherBaselines(activityId, id, existing)
}

export async function deleteSegment (id: string) {
  await deleteDoc(doc(db, 'segments', id))
}
