# Search engines and link previews

Implementation: `web/src/lib/pageMeta.ts`, `web/src/lib/publicPages.ts`, `web/scripts/prerender.mjs`, `firebase.json` (hosting). Decision: [ADR-0015](../decisions/0015-prerender-public-pages.md).

The app renders in the browser, but crawlers and link previews (Strava, Slack, WhatsApp, forums) often don't run JavaScript. The public pages are therefore prerendered at build time into static HTML that already contains their content and metadata. Signed-in pages stay client-rendered.

## Public pages and their metadata

`PUBLIC_PAGES` in `lib/publicPages.ts` lists the landing page, FAQ, About, the air density calculator, privacy and terms; `guidePageMeta()` covers each guide section. Each page calls `usePageMeta()`, which sets:

| Tag | Value |
|---|---|
| `<title>` | "*Page* · MyCdA", or the default title |
| `meta description`, `og:description` | the page's description, or the default |
| `og:title` | as the title |
| `link rel=canonical`, `og:url` | `https://mycda.app` + the page's path |
| `meta robots` | `noindex` on the not-found page |

Pages without metadata of their own (sign-in, the activity pages) get the defaults back when shown. `index.html` holds the defaults, the preview image (`public/og-image.jpg`, 1200×630), the Twitter card type and a `WebApplication` structured-data block. A test checks that its defaults match `lib/pageMeta.ts`.

**Adding a public page:** add it to `PUBLIC_PAGES`, call `usePageMeta()` in it, run `npx vitest run src/lib/seo.test.ts -u` to regenerate `public/sitemap.xml`, and commit the sitemap. The page is then prerendered too, because the prerenderer reads the sitemap.

## robots.txt and the sitemap

`public/robots.txt` keeps crawlers out of the signed-in pages and points to `public/sitemap.xml`. `lib/seo.test.ts` generates the sitemap from `PUBLIC_PAGES` and the guide sections, and fails when the committed file differs.

## Prerendering

`npm --prefix web run build:site` runs the Vite build, then `scripts/prerender.mjs`:

1. It serves `dist/` on a local port, answering any path that isn't a file with the app shell (as Hosting does for app routes).
2. It opens each page of `dist/sitemap.xml`, plus a not-found URL, in Chrome (Playwright's `chrome` channel, or `CHROME_PATH`), waits for the page's own canonical link (or `noindex` for the not-found page), and saves the DOM.
3. It writes `/` to `dist/index.html`, `/faq` to `dist/faq.html`, `/guide/tests` to `dist/guide/tests.html`, the not-found page to `dist/404.html`, and the original shell to `dist/app.html`.

It fails when a page throws or doesn't render a heading, and reports the page's error. The production build needs a Firebase API key to start (it comes from `web/.env.local`); CI uses a placeholder, because signed-out pages make no Firebase calls.

The saved pages keep `data-mantine-color-scheme="light"`, so they are styled without JavaScript. A script at the top of `index.html` (Mantine's `ColorSchemeScript`, inlined) switches to the reader's scheme before first paint.

In the browser, `main.tsx` mounts the app only after the router has loaded the initial route. For a lazy route (the guide), mounting earlier would replace the prerendered content with an empty page until the route's code arrived. The app then replaces the prerendered DOM with identical content; there is no hydration.

## How Hosting serves a URL

`firebase.json` sets `cleanUrls`, so `/faq` serves `faq.html` (and `/faq.html` redirects to `/faq`).

| URL | Served |
|---|---|
| A public page (`/`, `/faq`, `/guide/tests`, …) | its prerendered file |
| `/guide`, `/landing` | 301 to the first guide section, or `/` |
| An app route (`/login`, `/activities`, `/activity/**`, `/profile`, …) | `app.html` (rewrite) |
| Anything else | `404.html`, with status 404 |

**Adding an app route:** add a rewrite to `/app.html` in `firebase.json` as well. `lib/hosting.test.ts` checks that every route in `router.tsx` is prerendered, redirected or rewritten, and fails otherwise.

Legacy `/#/…` links arrive at `/`, so they load the prerendered landing page; `router.tsx` rewrites the path before the router starts, as before.

`vite preview` falls back to `index.html`, which after prerendering is the landing page. Deep links still work there, because the app renders the route, but use the Hosting emulator to check routing: `firebase emulators:start --only hosting --project demo-mycda` serves `web/dist` on port 5002.
