// Screenshots of the main screens for visual review: SCREENSHOTS=1 npm run test:e2e
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { expect, test } from '@playwright/test'
import { circuitRide } from './rides.js'

const require = createRequire(import.meta.url)
const { buildFit, ride } = require(resolve(import.meta.dirname, '../../../functions/test/fit-builder.js'))
const out = (name) => resolve(import.meta.dirname, '../test-results/screens', `${name}.png`)

test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1')

test('screens', async ({ page }) => {
  test.setTimeout(180_000)
  // README shots: viewport only, without the development "emulators" badge
  const readme = async (name) => {
    await page.evaluate(() => document.querySelectorAll('header p').forEach((p) => { if (p.textContent === 'emulators') p.style.display = 'none' }))
    await page.screenshot({ path: out(`readme-${name}`) })
  }
  const shoot = async (name, scheme = 'light') => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.evaluate((s) => localStorage.setItem('mycda-color-scheme', s), scheme)
    await page.reload()
    // Firestore keeps a streaming connection open, so wait for content rather than network idle
    await page.locator('main h1, main h2').first().waitFor()
    await page.waitForTimeout(800)
    await page.screenshot({ path: out(`${name}-${scheme}`), fullPage: true })
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await shoot('landing'); await shoot('landing', 'dark')
  await readme('landing')
  await page.goto('/login'); await shoot('login', 'dark')

  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(`screens-${Date.now()}@example.com`)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('secret123')
  await page.getByRole('textbox', { name: 'Repeat password', exact: true }).fill('secret123')
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Welcome to MyCdA')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save preferences' })).toBeVisible()
  await page.screenshot({ path: out('profile-dark'), fullPage: true })

  await page.goto('/activities')
  const start = new Date('2026-05-01T08:00:00Z')
  const at = (s) => new Date(start.getTime() + s * 1000)
  const fit = buildFit({ records: ride(600, start), laps: [{ start: at(0), end: at(600) }], session: { sport: 'cycling', start: at(0), end: at(600), avgSpeed: 36, avgPower: 250 } })
  await page.locator('input[type=file]').setInputFiles([
    { name: 'Velodrome laps.fit', mimeType: 'application/octet-stream', buffer: fit },
    { name: 'Hill repeats.fit.gz', mimeType: 'application/gzip', buffer: gzipSync(fit) },
    { name: 'route.fit', mimeType: 'application/octet-stream', buffer: Buffer.from('<?xml version="1.0"?><gpx></gpx>') }
  ])
  await expect(page.getByText('Ready').filter({ visible: true })).toHaveCount(2, { timeout: 60_000 })
  await shoot('activities'); await shoot('activities', 'dark')
  await readme('activities')
  await page.locator('input[type=file]').setInputFiles({ name: 'Circuit.fit', mimeType: 'application/octet-stream', buffer: circuitRide() })
  await page.getByRole('link', { name: 'Circuit' }).click({ timeout: 60_000 })
  await expect(page.locator('.leaflet-container')).toBeVisible()
  await page.getByRole('switch', { name: 'Find loops' }).check()
  await page.getByRole('row', { name: /^2 / }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: out('activity-dark'), fullPage: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await readme('activity')
  await page.getByRole('button', { name: 'Analyze selection' }).click()
  await expect(page.locator('.js-plotly-plot')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('radiogroup').getByText('Loops', { exact: true }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: out('analysis-dark'), fullPage: true })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.evaluate(() => localStorage.setItem('mycda-color-scheme', 'light'))
  await page.reload()
  await expect(page.locator('.js-plotly-plot')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: out('analysis-light'), fullPage: true })
  await page.getByRole('button', { name: 'Suggest CdA' }).click()
  await page.getByRole('menuitem', { name: 'Match recorded elevation' }).click()
  // let the suggestion notification close
  await page.waitForTimeout(5500)
  await readme('analysis')
  await page.goto('/faq'); await shoot('faq')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/activities'); await shoot('activities-mobile')
  await readme('mobile')
  await page.getByRole('button', { name: 'Toggle navigation' }).click()
  await page.screenshot({ path: out('nav-mobile-light') })
})
