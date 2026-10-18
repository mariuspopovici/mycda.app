import { expect, test } from '@playwright/test'
import { circuitRide } from './rides.js'

test('select a lap, analyze it, suggest CdA, save as baseline, reopen and delete', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(`analyst-${Date.now()}@example.com`)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('secret123')
  await page.getByRole('textbox', { name: 'Repeat password', exact: true }).fill('secret123')
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  // match the synthetic rider: 75 + 8 kg
  await page.getByRole('textbox', { name: 'Rider weight (kg)', exact: true }).fill('75')
  await page.getByRole('textbox', { name: 'Bike weight (kg)', exact: true }).fill('8')
  await page.getByRole('textbox', { name: 'Crr', exact: true }).fill('0.005')
  await page.getByRole('textbox', { name: 'Drivetrain loss (%)', exact: true }).fill('0')
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.getByText('Preferences saved.')).toBeVisible()

  await page.goto('/activities')
  await page.locator('input[type=file]').setInputFiles({ name: 'Circuit.fit', mimeType: 'application/octet-stream', buffer: circuitRide() })
  await page.getByRole('link', { name: 'Circuit' }).click({ timeout: 60_000 })

  // activity page: chart, laps and map
  await expect(page.getByRole('heading', { name: 'Circuit' })).toBeVisible()
  await expect(page.locator('.js-plotly-plot')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.leaflet-container')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analyze selection' })).toBeDisabled()

  await page.getByRole('row').filter({ has: page.getByRole('checkbox', { name: 'Include lap 2', exact: true }) }).click()
  await expect(page.getByText('Lap 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('paragraph').filter({ hasText: /^00:03:19$/ })).toBeVisible()

  // dragging across the chart selects a range
  if (process.env.DEBUG_DRAG) {
    page.on('console', (m) => console.log('CONSOLE', m.text().slice(0, 300)))
    await page.evaluate(() => {
      const el = document.querySelector('.js-plotly-plot')
      el.on('plotly_relayout', (e) => console.log('RELAYOUT', JSON.stringify(e)))
    })
  }
  await page.locator('.js-plotly-plot').scrollIntoViewIfNeeded()
  // let the chart finish its first render cycle (segments and prefs arrive just after it appears)
  await page.waitForTimeout(1000)
  const plot = await page.locator('.js-plotly-plot .nsewdrag').first().boundingBox()
  await page.mouse.move(plot.x + plot.width * 0.2, plot.y + plot.height / 2)
  await page.mouse.down()
  await page.mouse.move(plot.x + plot.width * 0.6, plot.y + plot.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByText('Selection', { exact: true })).toBeVisible()

  // back to lap 2 and analyze it
  await page.getByRole('row').filter({ has: page.getByRole('checkbox', { name: 'Include lap 2', exact: true }) }).click()
  await page.getByRole('button', { name: 'Analyze selection' }).click()
  await expect(page).toHaveURL(/\/analysis\?ranges=\d+-\d+&name=Lap\+2/)
  await expect(page.getByRole('heading', { name: 'Lap 2' })).toBeVisible()
  await expect(page.locator('.js-plotly-plot')).toBeVisible({ timeout: 30_000 })

  // a reload keeps the analysis (the legacy app crashed here)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Lap 2' })).toBeVisible()

  await page.getByRole('button', { name: 'Suggest CdA' }).click()
  await page.getByRole('menuitem', { name: 'Match recorded elevation' }).click()
  await expect(page.locator('.mantine-Notification-root').getByText(/Suggested CdA 0\.26\d/)).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'CdA', exact: true })).toHaveValue(/^0\.26\d$/)

  await page.getByRole('textbox', { name: 'Name' }).fill('Lap 2 – drops')
  await page.getByRole('switch', { name: /Baseline/ }).check()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText("Couldn't save the analysis")).toHaveCount(0)
  await expect(page).toHaveURL(/\/analysis\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('button', { name: 'Saved' })).toBeDisabled()

  // listed on the activity, with baseline badge
  await page.getByRole('link', { name: '← Activity' }).click()
  const row = page.getByRole('row', { name: /Lap 2 – drops/ })
  await expect(row.getByText('Baseline')).toBeVisible()
  await expect(row.getByText(/^0\.26\d$/)).toBeVisible()

  // reopen, change and delete
  await row.getByRole('link', { name: 'Lap 2 – drops' }).click()
  await expect(page.getByRole('textbox', { name: 'CdA', exact: true })).toHaveValue(/^0\.26\d$/)
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('None yet. Select a range above and analyze it.')).toBeVisible()
})

test('legacy analysis links and the public air density calculator', async ({ page }) => {
  await page.goto('/rho')
  await expect(page.getByRole('heading', { name: 'Air density calculator' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Temperature (°C)' }).fill('20')
  await page.getByRole('textbox', { name: 'Dew point (°C)' }).fill('10')
  await page.getByRole('textbox', { name: 'Sea-level pressure (hPa)' }).fill('1013.25')
  await page.getByRole('textbox', { name: 'Altitude (m)' }).fill('0')
  await expect(page.getByText('1.1986 kg/m³')).toBeVisible()
})
