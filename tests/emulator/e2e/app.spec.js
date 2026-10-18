import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const require = createRequire(import.meta.url)
const { buildFit, ride } = require(resolve(import.meta.dirname, '../../../functions/test/fit-builder.js'))

const email = `rider-${Date.now()}@example.com`
const password = 'secret123'

function sampleFit () {
  const start = new Date('2026-05-01T08:00:00Z')
  const at = (s) => new Date(start.getTime() + s * 1000)
  return buildFit({
    records: ride(120, start),
    laps: [{ start: at(0), end: at(60) }, { start: at(60), end: at(120) }],
    session: { sport: 'cycling', start: at(0), end: at(120), avgSpeed: 36, avgPower: 250 }
  })
}

test.describe.configure({ mode: 'serial' })

test('sign up, set preferences, upload, rename, open and delete an activity', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: "What's your CdA?" })).toBeVisible()
  await page.getByRole('link', { name: 'Sign up free' }).click()

  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password)
  await page.getByRole('textbox', { name: 'Repeat password', exact: true }).fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Accept the terms and conditions to continue')).toBeVisible()
  await page.getByRole('checkbox', { name: /I accept the/ }).check()
  await page.getByRole('button', { name: 'Create account' }).click()

  // new accounts land on the profile with suggested values
  await expect(page.getByText('Welcome to MyCdA')).toBeVisible()
  await expect(page.getByText('These are suggested starting values')).toBeVisible()
  await page.getByText('Imperial').click()
  await expect(page.getByRole('textbox', { name: 'Rider weight (lbs)', exact: true })).toHaveValue('165.4')
  await page.getByText('Metric').click()
  await page.getByRole('textbox', { name: 'Rider weight (kg)', exact: true }).fill('72.5')
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.getByText('Preferences saved.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Rider weight (kg)', exact: true })).toHaveValue('72.5')

  await page.getByRole('link', { name: 'Activities' }).first().click()
  await expect(page.getByText('No activities yet')).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({ name: 'Morning Ride.fit', mimeType: 'application/octet-stream', buffer: sampleFit() })

  const row = page.getByRole('row', { name: /Morning Ride/ })
  await expect(row.getByText('Ready')).toBeVisible()
  await expect(row.getByText('1.2 km')).toBeVisible()
  await expect(row.getByText('250 W')).toBeVisible()

  await row.getByRole('button', { name: 'Rename Morning Ride' }).click()
  await page.getByRole('dialog').getByRole('textbox', { name: 'Name', exact: true }).fill('Velodrome test')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('link', { name: 'Velodrome test' })).toBeVisible()

  await page.getByRole('link', { name: 'Velodrome test' }).click()
  await expect(page.getByRole('heading', { name: 'Velodrome test' })).toBeVisible()
  await expect(page.getByText('36.0 km/h').first()).toBeVisible()
  const activityUrl = page.url()

  await page.goBack()
  await page.getByRole('button', { name: 'Delete Velodrome test' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('No activities yet')).toBeVisible()

  await page.goto(activityUrl)
  await expect(page.getByText("Couldn't open this activity")).toBeVisible()
})

test('rejected files show why, and legacy hash URLs redirect after signing in', async ({ page }) => {
  await page.goto('/#/profile')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Incorrect email or password')
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/profile$/)

  await page.goto('/#/home')
  await expect(page).toHaveURL(/\/activities$/)
  await page.locator('input[type=file]').setInputFiles({ name: 'route.fit', mimeType: 'application/octet-stream', buffer: Buffer.from('<?xml version="1.0"?><gpx creator="x"></gpx>') })
  const row = page.getByRole('row', { name: /route/ })
  await row.getByRole('button', { name: 'Error' }).click()
  await expect(page.getByText('GPX files are not supported').filter({ visible: true })).toBeVisible()

  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
