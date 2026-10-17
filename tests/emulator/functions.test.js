/**
 * End-to-end tests of the Cloud Functions in the Auth, Firestore, Storage and Functions emulators:
 * upload → processActivityFile → activities/{id} → GET /api/activity/:id.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { beforeAll, describe, expect, it } from 'vitest'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const require = createRequire(import.meta.url)
const root = resolve(import.meta.dirname, '../..')
const { buildFit, ride } = require(resolve(root, 'functions/test/fit-builder.js'))

const PROJECT = 'demo-mycda'
const BUCKET = `${PROJECT}.appspot.com`
const API = `http://127.0.0.1:5001/${PROJECT}/us-central1/api`
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`

initializeApp({ projectId: PROJECT, storageBucket: BUCKET })
const db = getFirestore()
const bucket = getStorage().bucket()

const users = {}

async function signUp (name) {
  const response = await fetch(`${AUTH}/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${name}-${Date.now()}@example.com`, password: 'secret123', returnSecureToken: true })
  })
  const body = await response.json()
  return { uid: body.localId, token: body.idToken }
}

let nextId = 0
const newActivityId = () => `test-${Date.now()}-${nextId++}`

async function createActivity (owner) {
  const id = newActivityId()
  await db.doc(`activities/${id}`).set({ id, uid: owner.uid, status: 'New', name: 'New Activity' })
  return id
}

async function upload (owner, id, ext, content) {
  await bucket.file(`userdata/${owner.uid}/activities/${id}.${ext}`).save(content)
}

async function waitForStatus (id, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const doc = (await db.doc(`activities/${id}`).get()).data()
    if (doc.status !== 'New') return doc
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`activity ${id} was not processed within ${timeoutMs} ms`)
}

const get = (path, user) => fetch(`${API}${path}`, {
  headers: user ? { Authorization: `Bearer ${user.token}` } : {}
})

const sampleFit = () => {
  const start = new Date('2026-05-01T08:00:00Z')
  const at = (s) => new Date(start.getTime() + s * 1000)
  return buildFit({
    records: ride(60, start),
    laps: [{ start: at(0), end: at(30) }, { start: at(30), end: at(60) }],
    session: { sport: 'cycling', start: at(0), end: at(60), avgSpeed: 36, avgPower: 250 }
  })
}

beforeAll(async () => {
  users.alice = await signUp('alice')
  users.bob = await signUp('bob')
})

describe('processActivityFile', () => {
  it('processes a .FIT upload and stores the parsed file', async () => {
    const id = await createActivity(users.alice)
    await upload(users.alice, id, 'fit', sampleFit())
    const doc = await waitForStatus(id)

    expect(doc).toMatchObject({ status: 'Processed', averagePower: 250, averageSpeed: 36 })
    expect(doc.fitFile).toBe(`userdata/${users.alice.uid}/activities/${id}.json.gz`)
    expect(doc.activity_date.toDate().toISOString()).toBe('2026-05-01T08:00:00.000Z')
    const [exists] = await bucket.file(doc.fitFile).exists()
    expect(exists).toBe(true)
  })

  it('detects a gzipped .FIT uploaded under a .fit name', async () => {
    const id = await createActivity(users.alice)
    await upload(users.alice, id, 'fit', gzipSync(sampleFit()))
    expect((await waitForStatus(id)).status).toBe('Processed')
  })

  it('processes a CSV upload', async () => {
    const id = await createActivity(users.alice)
    await upload(users.alice, id, 'csv', readFileSync(resolve(root, 'functions/test/fixtures/test.csv')))
    expect((await waitForStatus(id)).status).toBe('Processed')
  })

  it('stores a user-facing message for unsupported files', async () => {
    const id = await createActivity(users.alice)
    await upload(users.alice, id, 'fit', Buffer.from('<?xml version="1.0"?><gpx creator="x"></gpx>'))
    const doc = await waitForStatus(id)
    expect(doc.status).toBe('Error')
    expect(doc.statusMessage).toMatch(/GPX files are not supported/)
  })

  it("ignores uploads aimed at another user's activity", async () => {
    const id = await createActivity(users.alice)
    await upload(users.bob, id, 'fit', sampleFit())
    await expect(waitForStatus(id, 5000)).rejects.toThrow(/not processed/)
  })
})

describe('GET /api/activity/:id', () => {
  let id
  beforeAll(async () => {
    id = await createActivity(users.alice)
    await upload(users.alice, id, 'fit', sampleFit())
    await waitForStatus(id)
  })

  it("returns the owner's parsed activity", async () => {
    const response = await get(`/activity/${id}`, users.alice)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.lap_count).toBe(2)
    expect(body.points).toHaveLength(60)
    expect(body.points[0]).toMatchObject({ lap: 1, power: 250, speed: 36 })
  })

  it('looks the same for foreign and missing activities', async () => {
    expect((await get(`/activity/${id}`, users.bob)).status).toBe(404)
    expect((await get('/activity/does-not-exist', users.alice)).status).toBe(404)
  })

  it('requires a valid ID token', async () => {
    expect((await get(`/activity/${id}`)).status).toBe(403)
    expect((await get(`/activity/${id}`, { token: 'not-a-token' })).status).toBe(403)
  })
})

describe('GET /api/cors', () => {
  const cors = (service, url) => get(`/cors?service=${service}&url=${encodeURIComponent(url)}`, users.alice)

  it('only proxies known services on their own host', async () => {
    expect((await cors('darksky', 'https://api.darksky.net/forecast/API_KEY/1,2')).status).toBe(403)
    expect((await cors('openweather', 'https://attacker.example/?k=API_KEY')).status).toBe(403)
    expect((await cors('openweather', 'http://api.openweathermap.org/?k=API_KEY')).status).toBe(403)
    expect((await cors('maps', 'https://maps.googleapis.com:8443/?k=API_KEY')).status).toBe(403)
    expect((await get('/cors?service=maps', users.alice)).status).toBe(400)
  })
})
