# 0015. Prerender the public pages at build time

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

The app was served as one empty HTML shell for every URL (`"source": "**"` → `index.html`). Crawlers that don't run JavaScript (Bing, DuckDuckGo, AI search crawlers) and link previews saw the same 928-byte page everywhere: no content, one title, no social tags. Google runs JavaScript, but later and less reliably. `robots.txt`, `sitemap.xml` and every unknown URL also returned that shell with status 200 (soft 404s).

The public content worth finding (the 9-section user guide, the FAQ and the air density calculator) is static and changes only with deploys. The signed-in pages hold each rider's private data and have nothing to index.

## Decision

- **Prerender the public pages at build time** by rendering the built app in headless Chrome (`web/scripts/prerender.mjs`, Playwright) and saving each page's DOM: the pages listed in the sitemap, plus a `404.html`.
- **Serve the files directly**, with `cleanUrls`. Rewrite only the signed-in app routes to the shell, now `app.html`, and let every other URL return `404.html` with status 404.
- **No hydration:** the app mounts with `createRoot` as before and replaces the prerendered DOM. It waits for the router to load the initial route first, so a lazy route doesn't flash empty.
- The Hosting deploy runs `build:site` (build + prerender). CI runs it too, so a page that fails to prerender fails CI.
- A unit test keeps `router.tsx` and the Hosting rewrites in step.

## Alternatives considered

- **Server-side rendering with `react-dom/server`.** The output would be the same, but it needs a server-safe build of the app: a static router, Firebase and `window` kept out of module scope, and lazy routes handled. That's a lot of change for 16 static pages.
- **A prerendering service, or rendering on request in a Cloud Function.** That adds cost, latency and a moving part, for content that only changes with deploys.
- **Rely on Google rendering JavaScript.** It doesn't help other search engines, AI crawlers or link previews, and it doesn't fix the soft 404s.
- **Keep the `**` rewrite and prerender anyway.** Unknown URLs would keep returning 200.

## Consequences

- Each public page is served with its own content, title, description, canonical URL and social tags. Unknown URLs return 404.
- Deploying needs Chrome on the machine running `firebase deploy`, and a `web/.env.local`, as before.
- A new app route needs a rewrite in `firebase.json`. `lib/hosting.test.ts` fails until it has one. A new public page needs an entry in `PUBLIC_PAGES` and a regenerated sitemap ([design](../architecture/seo.md)).
- The prerendered HTML reflects the signed-out view (the header's Sign in button, the landing page's sign-up buttons). The app swaps in the signed-in view after it mounts, as it did before.
