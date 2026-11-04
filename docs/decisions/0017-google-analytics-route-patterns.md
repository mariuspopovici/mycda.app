# 0017. Report Google Analytics page views as route patterns, from the live site, with consent

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

We want to know how the site is used. Firebase's standard snippet (`getAnalytics(app)`) reports each page's full URL to Google, and some of MyCdA's URLs hold private data:

- `/auth/action?mode=resetPassword&oobCode=…`: a live password reset code, which lets its holder take over the account.
- `/activity/<id>/analysis?ranges=…&name=…&mass=…`: activity IDs, a lap name and the rider's mass (`analysisUrl()`).

Same-site `document.referrer` values can hold the same URLs, because the referrer policy keeps the full URL within an origin.

The snippet would also run wherever the production configuration does: `npm run dev` (which uses production Firebase), preview channels, and the prerender build, whose Chrome would send hits and save the injected gtag script into the static HTML ([ADR-0015](0015-prerender-public-pages.md)).

## Decision

`services/analytics.ts` starts Analytics from `AppLayout`'s first page view:

- **Live site only.** It does nothing unless the origin is exactly `https://mycda.app` and `VITE_FIREBASE_MEASUREMENT_ID` is set.
- **Only after consent.** `components/CookieBanner.tsx` asks every visitor, wherever they are, because the site doesn't know where they are without a lookup of its own. Accept and Decline look the same and the page stays usable around the banner. Nothing from Google loads until Accept, so Google's Consent Mode isn't needed. The choice is kept in `localStorage` (`mycda-analytics-consent`), and **Cookie settings** in the footer reopens the banner. Declining later stops reporting and deletes the `_ga` cookies without a reload, which could lose work on the analysis page.
- **Route patterns only.** `page_location` is the origin plus the path with IDs replaced (`/activity/:id/analysis/:sid`), with no query string or hash. It is set as the default for all events, so automatic ones carry it too, and `send_page_view` is off so that page views go through this one path. `page_referrer` gets the same treatment on this site, and is only the origin from another.
- **Auth action pages don't start it.** gtag never loads on a page whose URL holds a reset code, and reports nothing for it. Leaving to another route within the app starts it from a clean URL.
- **No user ID, and Google signals and ad personalization are off.** Page titles are sent; they come from static page metadata, never ride names.
- **Lazy and failure-proof.** The SDK is in its own chunk, and a blocked or unsupported Analytics is silently ignored.

The measurement ID is public (it ships in client JavaScript), so `deploy.yml` holds it as a literal.

## Alternatives considered

- **The standard snippet** — leaks the data above.
- **Only stripping query strings** — still sends activity IDs, and every future route must be reviewed the same way either way; route patterns are the smaller surface.
- **Banner for the EU and UK only** — needs geolocation, and getting it wrong means tracking someone without consent. Asking everyone costs some measured traffic and is simpler.
- **Google Consent Mode** — loads gtag before consent to send cookieless pings. Loading nothing until Accept is easier to explain and to verify.
- **Self-hosted or cookieless analytics** — no third party or consent question, but another service to run or pay for, against keeping a non-commercial project cheap. A fallback if consent handling becomes a burden.

## Consequences

- A new route with an ID in its path needs an entry in `analyticsPath`, or its IDs reach Google. Query strings are always safe.
- Reports show pages per route, not per activity, by design.
- The stream's enhanced measurement settings are outside this code. Browser checks on 2026-11-03 with the stream's settings at that date found only clean URLs and no duplicate page views. Recheck after changing them.
- Reports undercount: visitors who decline or ignore the banner aren't measured.
- The Firebase installation ID that the SDK stores in IndexedDB stays after declining, though nothing is sent with it any more.
- The stored choice doesn't expire or record a policy version. A material change to what's collected needs a new storage key, so that everyone is asked again.
