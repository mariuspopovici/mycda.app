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

  // ride settings override the profile for this ride; they open in a drawer from the header
  await expect(page.getByRole('button', { name: 'Ride settings: from your profile' })).toBeVisible()
  await page.getByRole('button', { name: 'Ride settings', exact: true }).click()
  const settings = page.getByRole('dialog')
  await settings.getByRole('textbox', { name: 'Crr', exact: true }).fill('0.005')
  await settings.getByRole('textbox', { name: 'Notes' }).fill('Still morning, TT bike, new helmet')
  await settings.getByRole('combobox', { name: 'Wind exposure' }).click()
  await page.getByRole('option', { name: /^Open: fields, seafront/ }).click()
  await settings.getByRole('button', { name: 'Save ride settings' }).click()
  await expect(page.getByText('Ride settings saved.')).toBeVisible()
  await expect(settings).toHaveCount(0)
  await page.reload()
  // the summary names what the ride overrides, and the button counts it
  await page.getByRole('button', { name: 'Ride settings: Crr, wind exposure' }).click()
  await expect(settings.getByRole('textbox', { name: 'Notes' })).toHaveValue('Still morning, TT bike, new helmet')
  await expect(settings.getByRole('combobox', { name: 'Wind exposure' })).toHaveValue(/^Open/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /^Ride settings 2$/ })).toBeVisible()

  // tick the out and back legs and analyze them as one run (the Tests tab opens first on this ride)
  await page.getByRole('tab', { name: /^Laps/ }).click()
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

  // manual wind changes air speed, the suggestion is refitted for it, and Reset returns to it
  await page.getByRole('radiogroup').filter({ hasText: 'Manual' }).getByText('Manual').click()
  await page.getByRole('textbox', { name: /Wind speed/ }).fill('12')
  await page.getByRole('textbox', { name: /^From/ }).fill('315')
  await expect(page.getByText('Air speed', { exact: true }).first()).toBeVisible()
  // a manual wind is a 10 m value, scaled by the ride's exposure, unless measured at rider height
  await expect(page.getByText(/about 7\.2 km\/h at rider height \(open exposure, ×0\.60\)/)).toBeVisible()
  await page.getByRole('checkbox', { name: 'Measured at rider height' }).check()
  await expect(page.getByText('The speed is used as entered.', { exact: false })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Measured at rider height' }).uncheck()
  await page.getByRole('textbox', { name: 'CdA', exact: true }).fill('0.300')
  const reset = page.getByRole('button', { name: /^Reset to 0\.\d{3}$/ })
  const suggested = (await reset.textContent()).replace('Reset to ', '')
  await expect(page.getByText(`Suggested CdA ${suggested} from closure of the run`)).toBeVisible()
  await reset.click()
  await expect(page.getByRole('textbox', { name: 'CdA', exact: true })).toHaveValue(suggested)

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page).toHaveURL(/\/analysis\/[0-9a-f-]{36}$/)
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'CdA', exact: true })).toHaveValue(suggested)
  await expect(page.getByRole('textbox', { name: /Wind speed/ })).toHaveValue('12')
  await expect(page.getByText(/open exposure, ×0\.60/)).toBeVisible()
  await expect(page.getByText('2 ranges joined', { exact: false })).toBeVisible()

  await page.getByRole('link', { name: '← Activity' }).click()
  await page.getByRole('button', { name: '1 saved analysis' }).click()
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

test('tests table: pairs the out and back legs, fits, saves and opens the test', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(`tests-${Date.now()}@example.com`)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('secret123')
  await page.getByRole('textbox', { name: 'Repeat password', exact: true }).fill('secret123')
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('button', { name: 'Save preferences' })).toBeVisible()

  await page.goto('/activities')
  await page.locator('input[type=file]').setInputFiles({ name: 'Out and back.fit', mimeType: 'application/octet-stream', buffer: outAndBackRide() })
  await page.getByRole('link', { name: 'Out and back' }).first().click({ timeout: 60_000 })

  const card = page.locator('.mantine-Card-root', { has: page.getByRole('heading', { name: 'Tests' }) })
  // the summary under the title counts the tests found, and the Tests tab opens first
  await expect(page.getByRole('button', { name: '1 test found' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('tab', { name: /^Tests/ })).toHaveAttribute('aria-selected', 'true')
  await expect(card.getByRole('row', { name: /Test 1/ })).toBeVisible({ timeout: 30_000 })
  await expect(card.getByRole('row')).toHaveCount(2)
  // the legs are laps 2 and 4, around a turnaround lap
  await expect(card.getByRole('row', { name: /Test 1/ }).getByText('Lap 2 ·')).toBeVisible()
  await expect(card.getByRole('row', { name: /Test 1/ }).getByText('Lap 4 ·')).toBeVisible()

  // shared parameters: the profile's Crr and drivetrain loss are wrong for this synthetic ride
  const setShared = async () => {
    await card.getByRole('textbox', { name: 'Crr', exact: true }).fill('0.005')
    await card.getByRole('textbox', { name: 'Drivetrain loss (%)', exact: true }).fill('0')
    await expect(card.getByRole('row', { name: /Test 1/ }).getByRole('cell', { name: /^0\.26\d$/ })).toBeVisible()
  }
  await setShared()

  // ρ can come from the air density calculator
  await card.getByRole('button', { name: 'Open the air density calculator' }).click()
  const calculator = page.getByRole('dialog', { name: 'Air density calculator' })
  await calculator.getByText('Humidity', { exact: true }).click()
  await calculator.getByRole('textbox', { name: 'Temperature (°C)' }).fill('20')
  await calculator.getByRole('textbox', { name: 'Relative humidity (%)' }).fill('50')
  await calculator.getByRole('textbox', { name: 'Sea-level pressure (hPa)' }).fill('1013.25')
  await calculator.getByRole('textbox', { name: 'Altitude (m)' }).fill('0')
  await calculator.getByRole('button', { name: 'Use this value' }).click()
  await expect(calculator).toBeHidden()
  await expect(card.getByRole('textbox', { name: /^ρ/ })).toHaveValue(/^1\.198\d$/)
  await card.getByRole('textbox', { name: /^ρ/ }).fill('1.2')

  // an unsaved test opens a new analysis with the table's parameters
  await card.getByRole('button', { name: 'Test 1', exact: true }).click()
  await expect(page).toHaveURL(/\/analysis\?ranges=.*&crr=0\.005&dloss=0/)
  // the URL changes before the lazy analysis route renders: wait for it, or the activity page's fields still match
  await expect(page.getByRole('button', { name: 'Suggest CdA' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Crr', exact: true })).toHaveValue('0.005')
  await expect(page.getByRole('textbox', { name: 'CdA', exact: true })).toHaveValue(/^0\.26\d$/)
  await page.goBack()
  await setShared()

  await card.getByRole('button', { name: 'Save 1 test' }).click()
  await expect(page.getByText('Saved 1 test.')).toBeVisible()
  await expect(card.getByRole('button', { name: 'All tests saved' })).toBeDisabled()
  if (process.env.SCREENSHOTS) await card.screenshot({ path: 'test-results/screens/tests-card.png' })
  await page.getByRole('tab', { name: /^Saved analyses/ }).click()
  await expect(page.getByRole('row', { name: /Test 1 \(laps 2 \+ 4\)/ }).getByText('2 ranges joined')).toBeVisible()
  await page.getByRole('tab', { name: /^Tests/ }).click()

  // opening a saved test opens its analysis
  await card.getByRole('button', { name: 'Test 1', exact: true }).click()
  await expect(page).toHaveURL(/\/analysis\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('button', { name: 'Suggest CdA' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Crr', exact: true })).toHaveValue('0.005')
  await expect(page.getByRole('textbox', { name: 'CdA', exact: true })).toHaveValue(/^0\.26\d$/)
})
