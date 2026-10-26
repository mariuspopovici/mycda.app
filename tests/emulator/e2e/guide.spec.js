import { expect, test } from '@playwright/test'

test('the footer and the About page link to Buy me a coffee', async ({ page }) => {
  await page.goto('/about')
  const support = 'https://buymeacoffee.com/mariuspopovici'
  // the About page's button, and the footer link (the footer is inside main)
  await expect(page.locator('a.mantine-Button-root', { hasText: 'Buy me a coffee' })).toHaveAttribute('href', support)
  await expect(page.locator('footer').getByRole('link', { name: 'Buy me a coffee' })).toHaveAttribute('href', support)
})

test('the landing page announces the relaunch and links into the guide', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'MyCdA is back' })).toBeVisible()
  await page.getByRole('link', { name: 'Tests table' }).click()
  await expect(page).toHaveURL(/\/guide\/tests$/)
  await expect(page.getByRole('heading', { level: 1, name: 'The Tests table' })).toBeVisible()
  if (process.env.SCREENSHOTS) {
    await page.goto('/')
    await page.screenshot({ path: 'test-results/screens/landing-relaunch.png', fullPage: true })
  }
})

test('guide: contents, next and previous, deep links and the phone menu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/guide')
  await expect(page).toHaveURL(/\/guide\/getting-started$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible()
  await expect(page).toHaveTitle('Getting started – user guide · MyCdA')

  const contents = page.getByRole('navigation', { name: 'User guide' })
  await expect(contents.getByRole('link')).toHaveCount(9)
  await contents.getByRole('link', { name: '6. Analyzing a run' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Analyzing a run' })).toBeVisible()
  await page.getByRole('link', { name: 'Comparing setups' }).last().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Comparing setups' })).toBeVisible()

  // links to a heading scroll to it
  await page.goto('/guide/analysis#airspeed')
  await expect(page.getByRole('heading', { name: 'Air speed', exact: true })).toBeInViewport()

  // every internal guide link points at an existing section and heading
  const slugs = ['getting-started', 'collecting-data', 'uploading', 'activity', 'tests', 'analysis', 'comparing', 'troubleshooting', 'reference']
  for (const slug of slugs) {
    await page.goto(`/guide/${slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    if (process.env.SCREENSHOTS) await page.screenshot({ path: `test-results/screens/guide-${slug}.png`, fullPage: true })
    const hrefs = await page.locator('main a[href^="/guide/"]').evaluateAll((links) => links.map((a) => a.getAttribute('href')))
    for (const href of hrefs) {
      const [path, id] = href.split('#')
      expect(slugs, href).toContain(path.replace('/guide/', ''))
      if (id) {
        await page.goto(href)
        await expect(page.locator(`[id="${id}"]`), href).toHaveCount(1)
      }
    }
  }

  // phones get a menu instead of the sidebar
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/guide/uploading')
  await page.getByRole('combobox', { name: 'Guide section' }).click()
  await page.getByRole('option', { name: '9. Reference' }).click()
  await expect(page).toHaveURL(/\/guide\/reference$/)
})

test('help links open the guide at the matching heading', async ({ page }) => {
  await page.goto('/rho')
  await page.getByRole('link', { name: 'Guide: Air density' }).click()
  await expect(page).toHaveURL(/\/guide\/analysis#air-density$/)
  await expect(page.getByRole('heading', { name: 'Air density', exact: true })).toBeInViewport()
})

test('public pages have their own title, description and canonical URL; robots.txt and the sitemap are served', async ({ page, request }) => {
  const canonical = page.locator('link[rel="canonical"]')
  await page.goto('/faq')
  await expect(page).toHaveTitle('Frequently asked questions · MyCdA')
  await expect(canonical).toHaveAttribute('href', 'https://mycda.app/faq')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Answers about MyCdA/)

  // client-side navigation updates them, and pages without their own go back to the defaults
  await page.getByRole('link', { name: 'user guide' }).first().click()
  await expect(page).toHaveTitle('Getting started – user guide · MyCdA')
  await expect(canonical).toHaveAttribute('href', 'https://mycda.app/guide/getting-started')
  // account pages: sign-in and sign-up have their own, the password reset stays out of search
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Sign in' }).last()).toBeVisible()
  await expect(page).toHaveTitle('Sign in · MyCdA')
  await expect(canonical).toHaveAttribute('href', 'https://mycda.app/login')
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page).toHaveTitle('Create a free account · MyCdA')
  await expect(canonical).toHaveAttribute('href', 'https://mycda.app/signup')
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  await page.goto('/reset')
  await expect(page).toHaveTitle('Reset password · MyCdA')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  await expect(canonical).toHaveCount(0)

  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')

  const robots = await request.get('/robots.txt')
  expect(await robots.text()).toContain('Sitemap: https://mycda.app/sitemap.xml')
  const sitemap = await request.get('/sitemap.xml')
  expect(await sitemap.text()).toContain('<loc>https://mycda.app/guide/tests</loc>')
})
