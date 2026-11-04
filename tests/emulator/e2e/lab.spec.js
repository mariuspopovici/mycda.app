import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

/** 16-byte weather data notification: rpm 37750, 21.5 °C, 50 %, 1013.2 hPa. */
const WEATHER_DATA = [0x76, 0x93, 0x88, 0xff, 0x2d, 0x00, 0x2c, 0x01, 0xd7, 0x00, 0x32, 0x00, 0x94, 0x27, 0x00, 0x00]

/** Stands in for the browser's Web Bluetooth API and the meter. */
const fakeMeter = () => {
  const characteristic = new EventTarget()
  characteristic.startNotifications = async () => {}
  window.__notify = (bytes) => {
    characteristic.value = new DataView(new Uint8Array(bytes).buffer)
    characteristic.dispatchEvent(new Event('characteristicvaluechanged'))
  }
  const device = new EventTarget()
  device.name = 'WEATHERmeter 1234'
  device.gatt = {
    connect: async () => ({
      getPrimaryService: async (service) => {
        window.__service = service
        return {
          getCharacteristic: async (uuid) => {
            window.__characteristic = uuid
            return characteristic
          }
        }
      }
    }),
    disconnect: () => device.dispatchEvent(new Event('gattserverdisconnected'))
  }
  Object.defineProperty(navigator, 'bluetooth', { value: { requestDevice: async () => device } })
}

test('WEATHERmeter bench: connects, shows readings, records a CSV and disconnects', async ({ page }) => {
  await page.addInitScript(fakeMeter)
  await page.goto('/lab/weathermeter')
  await expect(page.getByRole('heading', { name: 'WEATHERmeter bench' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  await expect(page.getByRole('button', { name: 'Record' })).toBeDisabled()

  await page.getByRole('button', { name: 'Connect' }).click()
  await expect(page.getByText('WEATHERmeter 1234')).toBeVisible()
  expect(await page.evaluate(() => [window.__service, window.__characteristic]))
    .toEqual(['961f0001-d2d6-43e3-a417-3bb8217e0e01', '961f0005-d2d6-43e3-a417-3bb8217e0e01'])

  await page.evaluate((bytes) => window.__notify(bytes), WEATHER_DATA)
  await expect(page.getByLabel('Air speed')).toHaveText('40.0 km/h')
  await expect(page.getByLabel('Impeller')).toHaveText('37750 rpm')
  await expect(page.getByLabel('Temperature')).toHaveText('21.5 °C')
  await expect(page.getByLabel('Humidity')).toHaveText('50 %')
  await expect(page.getByLabel('Pressure')).toHaveText('1013.2 hPa')
  await expect(page.getByLabel('Air density')).toHaveText(/^1\.19\d\d kg\/m³$/)
  if (process.env.SCREENSHOTS) await page.screenshot({ path: 'test-results/screens/weathermeter.png', fullPage: true })

  // the other calibration gives another speed for the same RPM
  await page.getByText('Hall effect', { exact: true }).click()
  await expect(page.getByLabel('Air speed')).toHaveText('104.5 km/h')
  await page.getByText('Optical', { exact: true }).click()

  await page.getByRole('button', { name: 'Record' }).click()
  await page.evaluate((bytes) => { window.__notify(bytes); window.__notify(bytes) }, WEATHER_DATA)
  await expect(page.getByText('Recording: 2 readings')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
  await page.getByRole('button', { name: 'Stop' }).click()

  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download CSV' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toMatch(/^weathermeter-.*\.csv$/)
  const [header, row, row2, end] = readFileSync(await download.path(), 'utf8').split('\n')
  expect(header).toBe('time,rpm,airspeed,temperature_c,humidity_pct,pressure_hpa,air_density')
  expect(row).toMatch(/^\d{4}-\d\d-\d\dT[\d:.]+Z,37750,39\.99\d*,21\.5,50,1013\.2,1\.19\d*$/)
  expect(row2).toBeTruthy()
  expect(end).toBe('')

  await page.getByRole('button', { name: 'Disconnect' }).click()
  await expect(page.getByText('Not connected')).toBeVisible()
})

test('WEATHERmeter bench: explains when the browser has no Web Bluetooth', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'bluetooth', { value: undefined }))
  await page.goto('/lab/weathermeter')
  await expect(page.getByText('Web Bluetooth is not available here')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Connect' })).toBeDisabled()
})
