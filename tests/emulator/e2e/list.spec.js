import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const require = createRequire(import.meta.url)
const { buildFit, ride } = require(resolve(import.meta.dirname, '../../../functions/test/fit-builder.js'))

const rideOn = (iso) => {
  const start = new Date(iso)
  return buildFit({ records: ride(60, start), session: { sport: 'cycling', start, end: new Date(start.getTime() + 60_000), avgSpeed: 36, avgPower: 250 } })
}
const names = async (page) => (await page.getByRole('row').filter({ has: page.getByRole('button', { name: /^Rename/ }) }).allInnerTexts())
  .map((t) => t.split('\n')[0].trim())

test('new uploads appear at the top; sort by ride date; search', async ({ page }) => {
  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(`list-${Date.now()}@example.com`)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('secret123')
  await page.getByRole('textbox', { name: 'Repeat password', exact: true }).fill('secret123')
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Welcome to MyCdA')).toBeVisible()

  await page.goto('/activities')
  const input = page.locator('input[type=file]')
  await input.setInputFiles({ name: 'Recent ride.fit', mimeType: 'application/octet-stream', buffer: rideOn('2026-05-01T08:00:00Z') })
  await expect(page.getByText('Ready').filter({ visible: true })).toHaveCount(1, { timeout: 60_000 })
  await input.setInputFiles({ name: 'Old ride from 2020.fit', mimeType: 'application/octet-stream', buffer: rideOn('2020-06-01T08:00:00Z') })
  await expect(page.getByText('Ready').filter({ visible: true })).toHaveCount(2, { timeout: 60_000 })

  // the latest upload is first, although its ride is older
  expect(await names(page)).toEqual(['Old ride from 2020', 'Recent ride'])

  await page.getByRole('combobox', { name: 'Sort activities' }).click()
  await page.getByRole('option', { name: 'Ride date, newest first' }).click()
  expect(await names(page)).toEqual(['Recent ride', 'Old ride from 2020'])
  // the choice is remembered
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Sort activities' })).toHaveValue('Ride date, newest first')
  await expect.poll(() => names(page)).toEqual(['Recent ride', 'Old ride from 2020'])

  await page.getByRole('textbox', { name: 'Search activities' }).fill('2020')
  await expect.poll(() => names(page)).toEqual(['Old ride from 2020'])
  await expect(page.getByText('1 of 2')).toBeVisible()
  await page.getByRole('textbox', { name: 'Search activities' }).fill('velodrome')
  await expect(page.getByText('No activities match “velodrome”.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect.poll(() => names(page)).toHaveLength(2)
})
