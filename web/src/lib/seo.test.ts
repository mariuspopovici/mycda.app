// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { GUIDE_SECTIONS } from '../pages/guide/sections'
import { applyPageMeta, DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL, type PageMeta } from './pageMeta'
import { guidePageMeta, PUBLIC_PAGES } from './publicPages'

const publicDir = resolve(__dirname, '../../public')
const meta = (selector: string) => document.head.querySelector(selector)?.getAttribute('content') ?? undefined

describe('sitemap', () => {
  it('lists every public page and guide section (run with -u to regenerate)', async () => {
    const paths = [...Object.values(PUBLIC_PAGES).map((p) => p.path), ...GUIDE_SECTIONS.map((s) => guidePageMeta(s).path)]
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...paths.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`),
      '</urlset>',
      ''
    ].join('\n')
    await expect(xml).toMatchFileSnapshot(resolve(publicDir, 'sitemap.xml'))
  })

  it('is announced in robots.txt, which keeps crawlers out of signed-in pages', () => {
    const robots = readFileSync(resolve(publicDir, 'robots.txt'), 'utf8')
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
    for (const path of ['/activities', '/activity/', '/profile']) expect(robots).toContain(`Disallow: ${path}\n`)
    for (const path of Object.values(PUBLIC_PAGES).map((p) => p.path)) expect(robots).not.toContain(`Disallow: ${path}\n`)
  })
})

describe('page metadata', () => {
  afterEach(() => applyPageMeta({}))

  it('matches the defaults in index.html', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')
    expect(html).toContain(`<title>${DEFAULT_TITLE}</title>`)
    expect(html).toContain(`<meta name="description" content="${DEFAULT_DESCRIPTION}" />`)
    expect(html).toContain(`<meta property="og:description" content="${DEFAULT_DESCRIPTION}" />`)
    expect(html).toContain(`<meta property="og:title" content="${DEFAULT_TITLE}" />`)
    expect(html).toContain('<meta http-equiv="content-language" content="en" />')
  })

  it('names the site, the brand and the app in structured data', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]
    const graph: Array<Record<string, unknown>> = JSON.parse(json)['@graph']
    const byType = (type: string) => graph.find((node) => node['@type'] === type)!
    // Google picks the site name from WebSite: it should read "MyCdA", also for searches for "mycda"
    expect(byType('WebSite')).toMatchObject({ name: 'MyCdA', url: `${SITE_URL}/` })
    expect(byType('WebSite').alternateName).toContain('mycda')
    const organization = byType('Organization')
    expect(organization.name).toBe('MyCdA')
    // the logo is served from public/
    const logo = String(organization.logo).replace(SITE_URL, '')
    expect(readFileSync(resolve(publicDir, `.${logo}`)).length).toBeGreaterThan(0)
    expect(organization.sameAs).toContain('https://github.com/mariuspopovici/mycda.app')
    expect(byType('WebApplication')).toMatchObject({ name: 'MyCdA', isAccessibleForFree: true })
  })

  it('sets the title, description, canonical URL and social tags for a page', () => {
    applyPageMeta(PUBLIC_PAGES.faq)
    expect(document.title).toBe('CdA and aero field testing FAQ · MyCdA')
    expect(meta('meta[name="description"]')).toBe(PUBLIC_PAGES.faq.description)
    expect(meta('meta[property="og:title"]')).toBe('CdA and aero field testing FAQ · MyCdA')
    expect(meta('meta[property="og:url"]')).toBe('https://mycda.app/faq')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://mycda.app/faq')
    expect(meta('meta[name="robots"]')).toBeUndefined()
  })

  it('goes back to the defaults, and keeps pages out of search results when asked', () => {
    applyPageMeta({ title: 'Page not found', noindex: true })
    expect(meta('meta[name="robots"]')).toBe('noindex')
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    applyPageMeta({})
    expect(document.title).toBe(DEFAULT_TITLE)
    expect(meta('meta[name="description"]')).toBe(DEFAULT_DESCRIPTION)
    expect(meta('meta[name="robots"]')).toBeUndefined()
    expect(meta('meta[property="og:url"]')).toBeUndefined()
  })

  it('titles guide sections by their search headline, or their summary when they have none', () => {
    const section = (slug: string) => GUIDE_SECTIONS.find((s) => s.slug === slug)!
    expect(guidePageMeta(section('analysis'))).toEqual({
      path: '/guide/analysis',
      title: 'Analyzing a run: virtual elevation (Chung method)',
      description: "Read the virtual elevation chart, fit CdA and Crr with Robert Chung's method, set air density and wind, and save the analysis."
    })
    expect(guidePageMeta(section('uploading'))).toEqual({
      path: '/guide/uploading',
      title: 'Uploading activities – user guide',
      description: 'Supported files, processing, and the activity list. From the MyCdA guide to field testing cycling aerodynamics with a power meter.'
    })
  })

  it('keeps search titles and descriptions to lengths search engines show in full', () => {
    const metas: PageMeta[] = [...Object.values(PUBLIC_PAGES), ...GUIDE_SECTIONS.map(guidePageMeta)]
    for (const { path, title, description } of metas) {
      if (title) expect(`${title} · MyCdA`.length, path).toBeLessThanOrEqual(65)
      if (description) expect(description.length, path).toBeLessThanOrEqual(160)
    }
  })
})
