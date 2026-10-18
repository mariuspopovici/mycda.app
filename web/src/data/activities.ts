/**
 * The `activities` collection and the uploaded files in Storage (docs/architecture/data-model.md).
 */
import { useEffect, useState } from 'react'
import {
  collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, updateDoc, where,
  type DocumentData, type Timestamp
} from 'firebase/firestore'
import { deleteObject, ref, uploadBytesResumable } from 'firebase/storage'
import type { User } from 'firebase/auth'
import { apiUrl, db, storage } from '../firebase'
import { WIND_EXPOSURES, type WindExposure } from '../core/windModel'

export type ActivityStatus = 'New' | 'Processed' | 'Error'

export interface Activity {
  id: string
  uid: string
  name: string
  status: ActivityStatus
  statusMessage?: string
  /** Upload or processing time. */
  timestamp?: Date
  /** Start of the ride. */
  activityDate?: Date
  /** km */
  distance?: number
  /** km/h */
  averageSpeed?: number
  /** W */
  averagePower?: number
  /** Storage path of the parsed .json.gz */
  fitFile?: string
  /** Upload pipeline version that produced the status; absent for the legacy pipeline. */
  processedWith?: number
  /** The rider's notes about the ride. */
  notes?: string
  /** Analysis parameters for this ride, overriding the profile's defaults. */
  analysisDefaults?: RideDefaults
}

/** Ride-level analysis parameters, metric: mass kg, rho kg/m³, dloss %. */
export interface RideDefaults {
  mass?: number
  rho?: number
  crr?: number
  dloss?: number
  /** How exposed the course is to the wind (ADR-0014); unset means mixed. */
  windExposure?: WindExposure
}

/** Wind exposure when neither the analysis nor the ride sets one. */
export const DEFAULT_WIND_EXPOSURE: WindExposure = 'mixed'

export const isWindExposure = (value: unknown): value is WindExposure => WIND_EXPOSURES.includes(value as WindExposure)

function toRideDefaults (data: unknown): RideDefaults | undefined {
  if (!data || typeof data !== 'object') return undefined
  const defaults: RideDefaults = {}
  for (const key of ['mass', 'rho', 'crr', 'dloss'] as const) {
    const value = (data as Record<string, unknown>)[key]
    if (typeof value === 'number' && Number.isFinite(value)) defaults[key] = value
  }
  const exposure = (data as Record<string, unknown>).windExposure
  if (isWindExposure(exposure)) defaults.windExposure = exposure
  return defaults
}

const toDate = (value: unknown) => (value && typeof (value as Timestamp).toDate === 'function'
  ? (value as Timestamp).toDate()
  : value instanceof Date ? value : undefined)

const toNumber = (value: unknown) => {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

/** Maps a Firestore document; older documents store averages as strings. */
export function toActivity (id: string, data: DocumentData): Activity {
  return {
    id,
    uid: data.uid,
    name: data.name ?? 'New Activity',
    status: data.status ?? 'New',
    statusMessage: data.statusMessage,
    timestamp: toDate(data.timestamp),
    activityDate: toDate(data.activity_date),
    distance: toNumber(data.distance),
    averageSpeed: toNumber(data.averageSpeed),
    averagePower: toNumber(data.averagePower),
    fitFile: data.fitFile,
    processedWith: typeof data.processedWith === 'number' ? data.processedWith : undefined,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    analysisDefaults: toRideDefaults(data.analysisDefaults)
  }
}

/** Newest ride first; activities still uploading sort by upload time. */
export const byRideDateDesc = (a: Activity, b: Activity) =>
  ((b.activityDate ?? b.timestamp)?.getTime() ?? 0) - ((a.activityDate ?? a.timestamp)?.getTime() ?? 0)

/** The user's activities (unsorted; see sortActivities), kept live so processing status updates appear without reloading. */
export function useActivities (uid: string) {
  const [state, setState] = useState<{ activities?: Activity[], error?: Error }>({})

  useEffect(() => onSnapshot(
    query(collection(db, 'activities'), where('uid', '==', uid)),
    (snapshot) => setState({
      activities: snapshot.docs.map((d) => toActivity(d.id, d.data()))
    }),
    (error) => setState({ error })
  ), [uid])

  return state
}

export async function renameActivity (id: string, name: string) {
  await updateDoc(doc(db, 'activities', id), { name })
}

/** Saves the ride's notes and analysis parameters (unset parameters fall back to the profile). */
export async function saveRideSettings (id: string, settings: { notes: string, analysisDefaults: RideDefaults }) {
  const defaults = Object.fromEntries(Object.entries(settings.analysisDefaults).filter(([, v]) => v !== undefined))
  await updateDoc(doc(db, 'activities', id), { notes: settings.notes, analysisDefaults: defaults })
}

/** Storage file name for an upload. The server detects the real format from the contents. */
export const uploadExtension = (fileName: string) => (/csv$/i.test(fileName) ? '.csv' : '.fit')

/** Default activity name: the file name without extensions. */
export const nameFromFile = (fileName: string) =>
  fileName.replace(/(\.(fit|csv|gz|zip))+$/i, '').trim() || 'New Activity'

/**
 * Creates the activity document, then uploads the file; processActivityFile picks it up from
 * Storage and updates the document's status.
 */
export async function uploadActivity (uid: string, file: File, onProgress?: (fraction: number) => void) {
  const id = crypto.randomUUID()
  await setDoc(doc(db, 'activities', id), {
    id,
    uid,
    status: 'New',
    timestamp: new Date(),
    name: nameFromFile(file.name),
    distance: null,
    averageSpeed: null,
    averagePower: null
  })

  const task = uploadBytesResumable(
    ref(storage, `userdata/${uid}/activities/${id}${uploadExtension(file.name)}`),
    file
  )
  try {
    await new Promise<void>((resolve, reject) => {
      task.on('state_changed',
        (snapshot) => onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes),
        reject,
        () => resolve())
    })
  } catch (error) {
    // nothing will process this activity; don't leave it stuck at "New"
    await deleteDoc(doc(db, 'activities', id)).catch(() => {})
    throw error
  }
  return id
}

/**
 * Deletes an activity with its segments and files. Segments go first because their security
 * rule checks the parent activity's owner.
 */
export async function deleteActivity (activity: Activity) {
  const segments = await getDocs(query(collection(db, 'segments'), where('activity', '==', activity.id)))
  await Promise.all(segments.docs.map((d) => deleteDoc(d.ref)))

  const dir = `userdata/${activity.uid}/activities`
  const paths = [`${dir}/${activity.id}.fit`, `${dir}/${activity.id}.csv`, activity.fitFile ?? `${dir}/${activity.id}.json.gz`]
  await Promise.all(paths.map((path) => deleteObject(ref(storage, path)).catch((error) => {
    if (error?.code !== 'storage/object-not-found') throw error
  })))

  await deleteDoc(doc(db, 'activities', activity.id))
}

/** Processing normally takes seconds; after this an activity still at "New" is considered stalled. */
export const STALLED_AFTER_MS = 10 * 60_000

/** Upload or processing that never finished (the legacy app hid these). */
export const isStalled = (activity: Activity, now = Date.now()) =>
  activity.status === 'New' && (activity.timestamp?.getTime() ?? 0) < now - STALLED_AFTER_MS

/** Version of the current upload pipeline (functions/index.js PIPELINE_VERSION). */
export const PIPELINE_VERSION = 2

/**
 * Activities worth retrying in bulk: stalled ones, and errors from the legacy parser that the
 * current one may read. Errors from the current parser are final unless the file changes.
 */
export const needsRetry = (activity: Activity, now = Date.now()) =>
  isStalled(activity, now) || (activity.status === 'Error' && (activity.processedWith ?? 0) < PIPELINE_VERSION)

/** Activities whose processing can be retried. */
export const canRetry = (activity: Activity, now = Date.now()) => activity.status === 'Error' || isStalled(activity, now)

/** Runs processing again on the stored upload; the activity document updates with the outcome. */
export async function reprocessActivity (user: User, id: string, fetchFn: typeof fetch = fetch) {
  const response = await fetchFn(`${apiUrl}/activity/${encodeURIComponent(id)}/reprocess`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}` }
  })
  if (!response.ok) throw new Error(`Retry failed (${response.status}).`)
  return await response.json() as { status: ActivityStatus, statusMessage: string | null }
}

export type ActivitySort = 'uploaded' | 'rideNewest' | 'rideOldest' | 'name'

export const ACTIVITY_SORTS: Array<{ value: ActivitySort, label: string }> = [
  { value: 'uploaded', label: 'Recently uploaded' },
  { value: 'rideNewest', label: 'Ride date, newest first' },
  { value: 'rideOldest', label: 'Ride date, oldest first' },
  { value: 'name', label: 'Name' }
]

const uploaded = (a: Activity) => a.timestamp?.getTime() ?? a.activityDate?.getTime() ?? 0
const rideDate = (a: Activity) => a.activityDate?.getTime() ?? a.timestamp?.getTime() ?? 0
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Sorts a copy. "Recently uploaded" puts new uploads first, before their ride date is known. */
export function sortActivities (activities: Activity[], sort: ActivitySort): Activity[] {
  const list = [...activities]
  switch (sort) {
    case 'rideNewest': return list.sort((a, b) => rideDate(b) - rideDate(a))
    case 'rideOldest': return list.sort((a, b) => rideDate(a) - rideDate(b))
    case 'name': return list.sort((a, b) => collator.compare(a.name, b.name) || uploaded(b) - uploaded(a))
    default: return list.sort((a, b) => uploaded(b) - uploaded(a))
  }
}

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Activities whose name or notes contain every word of the query (case- and accent-insensitive). */
export function searchActivities (activities: Activity[], query: string): Activity[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return activities
  return activities.filter((a) => {
    const text = fold(`${a.name} ${a.notes ?? ''}`)
    return words.every((w) => text.includes(w))
  })
}
