/**
 * Prerenders the public pages of a production build (dist/) into static HTML, so crawlers and link
 * previews that don't run JavaScript see each page's content and metadata (docs/architecture/seo.md).
 *
 * - The pages are the ones in dist/sitemap.xml, rendered in Chrome by the app itself.
 * - "/" becomes dist/index.html, "/faq" dist/faq.html, "/guide/tests" dist/guide/tests.html;
 *   Hosting serves them with cleanUrls. The not-found page becomes dist/404.html.
 * - The empty app shell (Vite's index.html) moves to dist/app.html, which firebase.json rewrites the
 *   signed-in routes to.
 *
 * Needs Chrome (Playwright's "chrome" channel), or CHROME_PATH pointing to a Chrome executable.
 */
import { createServer } from 'node:http'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const DIST = resolve(import.meta.dirname, '../dist')
const SITE_URL = 'https://mycda.app'
const NOT_FOUND = '/__prerender-not-found__'

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain', '.csv': 'text/csv', '.woff2': 'font/woff2'
}

const exists = (path) => access(path).then(() => true, () => false)

/** The empty app shell. A second run finds it in app.html, because index.html is then a prerendered page. */
async function readShell () {
  const saved = join(DIST, 'app.html')
  const html = await readFile(await exists(saved) ? saved : join(DIST, 'index.html'), 'utf8')
  if (!html.includes('<div id="root"></div>')) throw new Error('dist/index.html is not the app shell; run vite build first')
  return html
}

/** Serves dist/ like Hosting does for the signed-in routes: files as they are, anything else the shell. */
function serve (shell) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const file = join(DIST, path)
    if (path !== '/' && file.startsWith(DIST) && extname(file) && await exists(file)) {
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
      res.end(await readFile(file))
      return
    }
    res.writeHead(200, { 'Content-Type': TYPES['.html'] })
    res.end(shell)
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)))
}

const outputFile = (path) =>
  path === '/' ? 'index.html' : path === NOT_FOUND ? '404.html' : `${path.slice(1)}.html`

/** Renders one page and returns its HTML once its own metadata is in place. */
async function render (page, origin, path) {
  await page.goto(origin + path)
  await page.locator('h1').first().waitFor()
  if (path === NOT_FOUND) await page.locator('meta[name="robots"][content="noindex"]').waitFor({ state: 'attached' })
  else await page.locator(`link[rel="canonical"][href="${SITE_URL}${path}"]`).waitFor({ state: 'attached' })
  const html = await page.evaluate(() => {
    const root = document.documentElement.cloneNode(true)
    // light without JavaScript (Mantine's colors need a scheme); the script in index.html switches to the
    // reader's preference before first paint
    root.setAttribute('data-mantine-color-scheme', 'light')
    return '<!doctype html>\n' + root.outerHTML
  })
  if (!/<h1[^>]*>[^<]+/.test(html)) throw new Error(`${path}: no heading in the rendered page`)
  return html
}

const shell = await readShell()
const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8')
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc.replace(SITE_URL, ''))
if (paths.length === 0) throw new Error('dist/sitemap.xml lists no pages')

const server = await serve(shell)
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' })
const outputs = new Map()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.setDefaultTimeout(15_000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error))
  for (const path of [...paths, NOT_FOUND]) {
    try {
      outputs.set(outputFile(path), await render(page, origin, path))
    } catch (error) {
      // a timeout usually means the app crashed: report why
      throw errors.length ? new Error(`${path}: the page failed: ${errors[0].message}`) : error
    }
    if (errors.length) throw new Error(`${path}: the page failed: ${errors[0].message}`)
  }
} finally {
  await browser.close()
  server.close()
}

// written last, so the shell is still index.html while rendering
await writeFile(join(DIST, 'app.html'), shell)
for (const [file, html] of outputs) {
  await mkdir(dirname(join(DIST, file)), { recursive: true })
  await writeFile(join(DIST, file), html)
}
console.log(`Prerendered ${outputs.size} pages: ${[...outputs.keys()].join(', ')}`)
