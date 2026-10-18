import { expect, test } from '@playwright/test'
import { outAndBackRide } from './rides.js'

test('ride settings, an out-and-back run opened at its fitted CdA, manual wind, and save', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(`runs-${Date.now()}@example.com`)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('secret123')
  await page.getByRole('textbox', { name: 'Repeat password', exact: true }).fill('secret123')
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  // profile: 83 kg, but a Crr (0.004) that is wrong for this ride
  await page.getByRole('textbox', { name: 'Crr', exact: true }).fill('0.004')
  await page.getByRole('textbox', { name: 'Drivetrain loss (%)', exact: true }).fill('0')
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.getByText('Preferences saved.')).toBeVisible()

  await page.goto('/activities')
  await page.locator('input[type=file]').setInputFiles({ name: 'Out and back.fit', mimeType: 'application/octet-stream', buffer: outAndBackRide() })
  await page.getByRole('link', { name: 'Out and back' }).first().click({ timeout: 60_000 })
  await expect(page.locator('.js-plotly-plot')).toBeVisible({ timeout: 30_000 })

  // ride settings override the profile for this ride
  const settings = page.locator('.mantine-Card-root', { has: page.getByRole('heading', { name: 'Ride settings' }) })
  await settings.getByRole('textbox', { name: 'Crr', exact: true }).fill('0.005')
  await settings.getByRole('textbox', { name: 'Notes' }).fill('Still morning, TT bike, new helmet')
  await settings.getByRole('button', { name: 'Save ride settings' }).click()
  await expect(page.getByText('Ride settings saved.')).toBeVisible()
  await page.reload()
  await expect(settings.getByRole('textbox', { name: 'Notes' })).toHaveValue('Still morning, TT bike, new helmet')

  // tick the out and back legs and analyze them as one run
  await page.getByRole('checkbox', { name: 'Include lap 2' }).check()
  await page.getByRole('checkbox', { name: 'Include lap 4' }).check()
  await expect(page.getByText('Laps 2 + 4', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Analyze 2 as one run' }).click()
  await expect(page).toHaveURL(/\/analysis\?ranges=\d+-\d+(,|%2C)\d+-\d+&name=Laps\+2\+%2B\+4/)
  await expect(page.getByText('2 ranges joined', { exact: false })).toBeVisible()

  // it opens at the CdA that closes the run, with the ride's Crr
  await expect(page.getByRole('textbox', { name: 'Crr', exact: true })).toHaveValue('0.005')
  await expect(page.getByRole('textbox', { name: 'CdA', exact: true })).toHaveValue(/^0\.26\d$/)
  await expect(page.getByText(/Suggested CdA 0\.26\d from closure of the run/)).toBeVisible()
  await expect(page.getByText(/Run closure error: 0\.0\d m/)).toBeVisible()

  // manual wind changes air speed, and Reset returns to the suggestion
  await page.getByRole('radiogroup').filter({ hasText: 'Manual' }).getByText('Manual').click()
  await page.getByRole('textbox', { name: /Wind speed/ }).fill('12')
  await page.getByRole('textbox', { name: /^From/ }).fill('315')
  await expect(page.getByText('Air speed', { exact: true }).first()).toBeVisible()
  await page.getByRole('textbox', { name: 'CdA', exact: true }).fill('0.300')
  await page.getByRole('button', { name: 'Reset to suggested' }).click()
  await expect(page.getByRole('textbox', { name: 'CdA', exact: true })).toHaveValue(/^0\.26\d$/)

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page).toHaveURL(/\/analysis\/[0-9a-f-]{36}$/)
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'CdA', exact: true })).toHaveValue(/^0\.26\d$/)
  await expect(page.getByRole('textbox', { name: /Wind speed/ })).toHaveValue('12')
  await expect(page.getByText('2 ranges joined', { exact: false })).toBeVisible()

  await page.getByRole('link', { name: '← Activity' }).click()
  await expect(page.getByRole('row', { name: /Laps 2 \+ 4/ }).getByText('2 ranges joined')).toBeVisible()
})

test('air density from humidity and station pressure', async ({ page }) => {
  await page.goto('/rho')
  await page.getByText('Humidity', { exact: true }).click()
  await page.getByRole('textbox', { name: 'Temperature (°C)' }).fill('20')
  await page.getByRole('textbox', { name: 'Relative humidity (%)' }).fill('50')
  await page.getByRole('textbox', { name: 'Sea-level pressure (hPa)' }).fill('1013.25')
  await page.getByRole('textbox', { name: 'Altitude (m)' }).fill('0')
  await expect(page.getByText(/^1\.198\d kg\/m³$/)).toBeVisible()
  await page.getByText('Station pressure', { exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Altitude (m)' })).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Station pressure (hPa)' }).fill('900')
  await expect(page.getByText(/^1\.06\d\d kg\/m³$/)).toBeVisible()
})
