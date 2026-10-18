import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const require = createRequire(import.meta.url)
const { initializeApp, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')
const { getStorage } = require('firebase-admin/storage')
const { buildFit, ride } = require(resolve(import.meta.dirname, '../../../functions/test/fit-builder.js'))

if (!getApps().length) initializeApp({ projectId: 'demo-mycda', storageBucket: 'demo-mycda.appspot.com' })

test('stalled uploads and legacy errors can be retried', async ({ page }) => {
  const email = `retry-${Date.now()}@example.com`
  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('secret123')
  await page.getByRole('textbox', { name: 'Repeat password', exact: true }).fill('secret123')
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Welcome to MyCdA')).toBeVisible()

  const { uid } = await getAuth().getUserByEmail(email)
  const db = getFirestore()
  const hourAgo = new Date(Date.now() - 3600_000)
  // an upload that never finished: the document exists, the file doesn't
  await db.doc('activities/stalled-1').set({ id: 'stalled-1', uid, status: 'New', name: 'Interrupted upload', timestamp: hourAgo })
  // a file the legacy parser rejected: stored before its document, so the trigger skipped it
  const start = new Date('2026-05-01T08:00:00Z')
  const fit = buildFit({ records: ride(60, start), session: { sport: 'cycling', start, end: new Date(start.getTime() + 60_000) } })
  await getStorage().bucket().file(`userdata/${uid}/activities/legacy-1.fit`).save(fit)
  await new Promise((r) => setTimeout(r, 1500))
  await db.doc('activities/legacy-1').set({ id: 'legacy-1', uid, status: 'Error', statusMessage: 'Invalid file. Missing lap data.', name: 'Old failure', timestamp: hourAgo })

  await page.goto('/activities')
  await expect(page.getByText('2 activities need attention')).toBeVisible()
  await expect(page.getByRole('row', { name: /Interrupted upload/ }).getByText('Stalled')).toBeVisible()

  await page.getByRole('button', { name: 'Retry all' }).click()
  await expect(page.getByText('1 of 2 activities recovered')).toBeVisible()
  await expect(page.getByRole('row', { name: /Old failure/ }).getByText('Ready')).toBeVisible()
  await page.getByRole('row', { name: /Interrupted upload/ }).getByRole('button', { name: 'Error' }).click()
  await expect(page.getByText("The upload didn't finish").filter({ visible: true })).toBeVisible()
  // results from the current parser are final, so the banner goes away
  await expect(page.getByText('need attention')).toHaveCount(0)
})
