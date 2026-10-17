# 0011. Cloud Functions on 2nd gen with Secret Manager

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The functions used `firebase-functions` 3 and `firebase-admin` 9 (2021), the 1st-gen API, and `functions.config()`, which is deprecated in favour of params and Secret Manager. They also depended on `node-fetch`, `cors` (both undeclared, resolved transitively), `node-gzip`, `mkdirp-promise` and temp files. The ESLint 4 config (`ecmaVersion: 6`) couldn't parse modern syntax, and it runs as a predeploy step.

## Decision

- Use the 2nd-gen API (`onRequest`, `onObjectFinalized`) with `firebase-functions` 7.4, `firebase-admin` 14.5, Express 5, Node 22.
- Put the proxy keys in Secret Manager (`OPENWEATHER_API_KEY`, `GOOGLE_MAPS_API_KEY`) through `defineSecret`. Drop DarkSky, whose API is gone.
- Use built-ins: `fetch`, `zlib`, in-memory buffers instead of temp files. Use the v2 `cors` option instead of the `cors` package.
- Give `processActivityFile` 512 MiB and a 120 s timeout.
- Lint with ESLint 9 flat config.
- Keep function names and region (`api`, `processActivityFile`, `us-central1`), so the URL `https://us-central1-mycda-c43c6.cloudfunctions.net/api/...` that the legacy app hardcodes keeps working.

## Alternatives considered

- **Stay on 1st gen with updated SDKs.** Less deployment risk, but 1st gen is the legacy path and `functions.config()` is on its way out.
- **Rename the functions to deploy v2 alongside v1 with no downtime.** The legacy app hardcodes `/api`, so it would need a release, and the legacy app's build is broken on current toolchains.

## Consequences

- Secrets have to be created before the first v2 deploy, and the emulator needs `functions/.secret.local` (`tests/emulator/setup-secrets.mjs` writes dummy values).
- The `/cors` proxy only serves `openweather` and `maps` until the legacy app is retired.

## Deployment

The Firebase CLI doesn't upgrade a deployed 1st-gen function to 2nd gen in place. Because the names stay the same, the v1 functions have to be deleted first. That causes a few minutes of downtime: API calls fail, and uploads in that window aren't processed (their activities stay "New" and need re-uploading).

1. Copy the current keys into Secret Manager. `firebase functions:config:get` shows the existing `openweather.key` and `maps.key`.
   ```bash
   firebase functions:secrets:set OPENWEATHER_API_KEY
   firebase functions:secrets:set GOOGLE_MAPS_API_KEY
   ```
2. Delete the v1 functions:
   ```bash
   firebase functions:delete api processActivityFile --region us-central1 --force
   ```
3. Deploy. The CLI may enable Eventarc, Cloud Run and Artifact Registry APIs and grant the Storage service agent Pub/Sub publisher on the first 2nd-gen Storage trigger:
   ```bash
   firebase deploy --only functions
   ```
4. Smoke test: an unauthenticated `GET /api/activity/x` returns 403. Upload a ride in the app and see it reach "Processed".
5. Remove the old runtime config once nothing reads it: `firebase functions:config:unset openweather maps darksky`.
