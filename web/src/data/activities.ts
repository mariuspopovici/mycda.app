/**
 * The `activities` collection and the uploaded files in Storage (docs/architecture/data-model.md).
 */
import { useEffect, useState } from 'react'
import {
  collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, updateDoc, where,
  type DocumentData, type Timestamp
} from 'firebase/firestore'
import { deleteObject, ref, uploadBytesResumable } from 'firebase/storage'
import { db, storage } from '../firebase'

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
    fitFile: data.fitFile
  }
}

/** Newest ride first; activities still uploading sort by upload time. */
export const byRideDateDesc = (a: Activity, b: Activity) =>
  ((b.activityDate ?? b.timestamp)?.getTime() ?? 0) - ((a.activityDate ?? a.timestamp)?.getTime() ?? 0)

/** The user's activities, kept live so processing status updates appear without reloading. */
export function useActivities (uid: string) {
  const [state, setState] = useState<{ activities?: Activity[], error?: Error }>({})

  useEffect(() => onSnapshot(
    query(collection(db, 'activities'), where('uid', '==', uid)),
    (snapshot) => setState({
      activities: snapshot.docs.map((d) => toActivity(d.id, d.data())).sort(byRideDateDesc)
    }),
    (error) => setState({ error })
  ), [uid])

  return state
}

export async function renameActivity (id: string, name: string) {
  await updateDoc(doc(db, 'activities', id), { name })
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
