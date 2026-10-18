// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { RouteObject } from 'react-router'
import { routes } from '../router'

interface Hosting {
  cleanUrls: boolean
  redirects: Array<{ source: string, destination: string }>
  rewrites: Array<{ source: string, destination: string }>
}
const hosting: Hosting = JSON.parse(readFileSync(resolve(__dirname, '../../../firebase.json'), 'utf8')).hosting
const sitemap = readFileSync(resolve(__dirname, '../../public/sitemap.xml'), 'utf8')
const prerendered = [...sitemap.matchAll(/<loc>https:\/\/mycda\.app([^<]+)<\/loc>/g)].map(([, path]) => path)

/** Hosting globs as firebase.json uses them: exact paths, or a prefix followed by /**. */
const matches = (glob: string, path: string) =>
  glob.endsWith('/**') ? path.startsWith(glob.slice(0, -2)) : glob === path

/** An example URL for a route path: parameters filled in, optional ones too. */
const example = (path: string) => '/' + path.replace(/:\w+\??/g, 'x')

function routePaths (list: RouteObject[], prefix = ''): string[] {
  return list.flatMap((route) => {
    const path = route.index ? prefix : route.path ? `${prefix}${prefix ? '/' : ''}${route.path}` : prefix
    return [...(route.index || route.path ? [path] : []), ...routePaths(route.children ?? [], path)]
  })
}

/** How Hosting answers a URL: a prerendered file, a redirect, the app shell, or nothing (404). */
function served (path: string) {
  if (prerendered.includes(path)) return 'prerendered'
  if (hosting.redirects.some((r) => matches(r.source, path))) return 'redirect'
  if (hosting.rewrites.some((r) => matches(r.source, path) && r.destination === '/app.html')) return 'app'
  return 'not found'
}

describe('Hosting', () => {
  it('serves every route of the app: prerendered, redirected, or through the app shell', () => {
    const paths = routePaths(routes).filter((p) => p !== '*')
    expect(paths.length).toBeGreaterThan(15)
    for (const path of paths) {
      const url = example(path)
      // a public page with a parameter (the guide) is prerendered for each value instead
      const isGuide = path.startsWith('guide/')
      expect(isGuide ? served('/guide/tests') : served(url), url).not.toBe('not found')
    }
  })

  it('leaves unknown URLs to 404.html, and serves public pages as files with clean URLs', () => {
    expect(hosting.cleanUrls).toBe(true)
    expect(served('/no-such-page')).toBe('not found')
    expect(served('/guide/no-such-section')).toBe('not found')
    expect(served('/')).toBe('prerendered')
    expect(served('/activity/abc/analysis/def')).toBe('app')
    expect(served('/guide')).toBe('redirect')
  })
})
