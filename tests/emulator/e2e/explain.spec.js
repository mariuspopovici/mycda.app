import { expect, test } from '@playwright/test'
import { outAndBackRide } from './rides.js'

const ANSWER = {
  verdict: 'check',
  headline: 'The run closes, but the legs disagree in a way that suggests wind.',
  findings: [
    { title: 'Closure', detail: 'The run ends 0.05 m from where it started.' },
    { title: 'Legs', detail: 'Virtual elevation rises on the out leg and falls on the back leg.' }
  ],
  nextSteps: ['Try the Weather air speed source.']
}

test('explain this run: sends computed numbers only and shows the answer', async ({ page }) => {
  test.setTimeout(120_000)
  // Firebase AI Logic isn't emulated: answer for Gemini, and keep what the page sent
  const requests = []
  await page.route('**/firebasevertexai.googleapis.com/**', async (route) => {
    requests.push(route.request().postData() ?? '')
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ candidates: [{ index: 0, finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify(ANSWER) }] } }] })
    })
  })

  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(`explain-${Date.now()}@example.com`)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('secret123')
  await page.getByRole('textbox', { name: 'Repeat password', exact: true }).fill('secret123')
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('button', { name: 'Save preferences' })).toBeVisible()

  await page.goto('/activities')
  await page.locator('input[type=file]').setInputFiles({ name: 'Out and back.fit', mimeType: 'application/octet-stream', buffer: outAndBackRide() })
  await page.getByRole('link', { name: 'Out and back' }).first().click({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Test 1', exact: true }).click({ timeout: 30_000 })
  await expect(page.locator('.js-plotly-plot')).toBeVisible({ timeout: 30_000 })

  const card = page.locator('.mantine-Card-root', { has: page.getByRole('heading', { name: 'Explain this run' }) })
  await card.getByRole('button', { name: 'Explain', exact: true }).click()
  await expect(card.getByText(ANSWER.headline)).toBeVisible()
  await expect(card.getByText('Worth checking')).toBeVisible()
  await expect(card.getByText('Try the Weather air speed source.')).toBeVisible()

  // the request carries the computed facts, and nothing that identifies the ride or the rider
  expect(requests).toHaveLength(1)
  const body = requests[0]
  expect(body).toContain('2 legs joined')
  expect(body).toContain('run closure error')
  expect(body).toContain('Suggested CdA from closure of the run')
  expect(body).not.toMatch(/"lat"|"lng"|Out and back|example\.com/)

  // changing the analysis marks the explanation out of date
  await page.getByRole('textbox', { name: 'CdA', exact: true }).fill('0.300')
  await expect(card.getByText('The analysis changed since this was written.')).toBeVisible()
})
