import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore'
import { deleteObject, getBytes, ref, uploadBytes, uploadString } from 'firebase/storage'

const root = resolve(import.meta.dirname, '../..')
let env

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-mycda',
    firestore: { rules: readFileSync(resolve(root, 'firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(root, 'storage.rules'), 'utf8') }
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'activities/a1'), { uid: 'alice', name: 'Ride' })
    await setDoc(doc(db, 'segments/s1'), {
      activity: 'a1',
      name: 'Lap 1',
      range: { start: 1, end: 2 }
    })
    await setDoc(doc(db, 'userprefs/alice'), { uid: 'alice', units: 'metric' })
    await uploadString(ref(ctx.storage(), 'userdata/alice/activities/a1.fit'), 'data')
  })
})

const alice = () => env.authenticatedContext('alice')
const bob = () => env.authenticatedContext('bob')
const anon = () => env.unauthenticatedContext()

describe('activities', () => {
  it('owner can read, update and delete', async () => {
    const db = alice().firestore()
    await assertSucceeds(getDoc(doc(db, 'activities/a1')))
    await assertSucceeds(updateDoc(doc(db, 'activities/a1'), { name: 'Renamed' }))
    await assertSucceeds(deleteDoc(doc(db, 'activities/a1')))
  })

  it('owner can list own activities by uid', async () => {
    const db = alice().firestore()
    await assertSucceeds(getDocs(query(collection(db, 'activities'), where('uid', '==', 'alice'))))
  })

  it('other users cannot read, list, update or delete', async () => {
    const db = bob().firestore()
    await assertFails(getDoc(doc(db, 'activities/a1')))
    await assertFails(getDocs(query(collection(db, 'activities'), where('uid', '==', 'alice'))))
    await assertFails(getDocs(collection(db, 'activities')))
    await assertFails(updateDoc(doc(db, 'activities/a1'), { name: 'Hacked' }))
    await assertFails(deleteDoc(doc(db, 'activities/a1')))
  })

  it('cannot create an activity for someone else or hand one over', async () => {
    await assertSucceeds(setDoc(doc(alice().firestore(), 'activities/a2'), { uid: 'alice' }))
    await assertFails(setDoc(doc(bob().firestore(), 'activities/a3'), { uid: 'alice' }))
    await assertFails(updateDoc(doc(alice().firestore(), 'activities/a1'), { uid: 'bob' }))
  })

  it('signed-out users have no access', async () => {
    await assertFails(getDoc(doc(anon().firestore(), 'activities/a1')))
  })
})

describe('segments', () => {
  it('activity owner can query, create, update and delete', async () => {
    const db = alice().firestore()
    await assertSucceeds(getDocs(query(
      collection(db, 'segments'),
      where('activity', '==', 'a1'),
      orderBy('range.start', 'asc')
    )))
    await assertSucceeds(setDoc(doc(db, 'segments/s2'), { activity: 'a1' }))
    await assertSucceeds(updateDoc(doc(db, 'segments/s1'), { cda: 0.25 }))
    await assertSucceeds(deleteDoc(doc(db, 'segments/s1')))
  })

  it('other users cannot access segments of an activity they do not own', async () => {
    const db = bob().firestore()
    await assertFails(getDoc(doc(db, 'segments/s1')))
    await assertFails(getDocs(query(collection(db, 'segments'), where('activity', '==', 'a1'))))
    await assertFails(setDoc(doc(db, 'segments/s3'), { activity: 'a1' }))
    await assertFails(updateDoc(doc(db, 'segments/s1'), { cda: 0.1 }))
    await assertFails(deleteDoc(doc(db, 'segments/s1')))
  })

  it('cannot move a segment to another activity', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'activities/b1'), { uid: 'bob' })
    })
    await assertFails(updateDoc(doc(alice().firestore(), 'segments/s1'), { activity: 'b1' }))
  })
})

describe('userprefs', () => {
  it('only the owner can read and write prefs', async () => {
    await assertSucceeds(getDoc(doc(alice().firestore(), 'userprefs/alice')))
    await assertSucceeds(setDoc(doc(alice().firestore(), 'userprefs/alice'), { uid: 'alice' }))
    await assertFails(getDoc(doc(bob().firestore(), 'userprefs/alice')))
    await assertFails(setDoc(doc(bob().firestore(), 'userprefs/alice'), { uid: 'bob' }))
  })
})

describe('storage', () => {
  it('only the owner can read and write their files', async () => {
    const path = 'userdata/alice/activities/a1.fit'
    await assertSucceeds(getBytes(ref(alice().storage(), path)))
    await assertSucceeds(uploadString(ref(alice().storage(), 'userdata/alice/activities/a2.fit'), 'x'))
    await assertFails(getBytes(ref(bob().storage(), path)))
    await assertFails(uploadString(ref(bob().storage(), 'userdata/alice/activities/a3.fit'), 'x'))
    await assertFails(uploadString(ref(alice().storage(), 'other/file.fit'), 'x'))
  })

  it('owners can delete their files but not upload files over 25 MB', async () => {
    const big = new Uint8Array(25 * 1024 * 1024)
    await assertFails(uploadBytes(ref(alice().storage(), 'userdata/alice/activities/big.fit'), big))
    await assertFails(deleteObject(ref(bob().storage(), 'userdata/alice/activities/a1.fit')))
    await assertSucceeds(deleteObject(ref(alice().storage(), 'userdata/alice/activities/a1.fit')))
  })
})
