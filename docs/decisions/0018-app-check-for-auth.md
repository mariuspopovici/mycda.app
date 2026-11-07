# 0018. Start App Check wherever Auth is used, then enforce it for Authentication

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

Scripts have been creating accounts in bulk and then requesting password resets for them; the accounts drew attention in early November 2026. The addresses included Gmail dot variants (`j.u.stin…@gmail.com`), which reach one inbox but count as separate accounts. This is the pattern of email bombing: Firebase's emails come from a trusted sender, and a victim's inbox floods with them. The scripts call the Auth REST API with the public browser API key, so the email verification gate added in 2.4.0, which only guards the app's pages, can't stop them.

App Check's metrics for Authentication over 7 days to Nov 8 showed about 1.3k requests: 95% "unknown origin" (not from the Firebase SDK, so scripted) and 5% "outdated client" (the real app, sending no token). The scripted traffic goes back to about Oct 19, as far as the metrics go (App Check was registered for the explainer then), so the abuse may be older. None were verified, because App Check started only with the run explainer (ADR-0016). Enforcing then would have locked every real user out.

It isn't documented whether enforcement for Authentication also covers token refresh for sessions that are already signed in.

## Decision

- `services/appCheck.ts` starts App Check with the reCAPTCHA Enterprise key already registered for the explainer. It starts before Auth's first request:
  - on the account pages (`/login`, `/signup`, `/reset`, `/auth/action`), at startup and on navigation;
  - at startup in a browser that was signed in on its last visit (a `mycda-session` flag in localStorage), because Auth may refresh the restored session straight away;
  - whenever Auth reports a signed-in user.
- Visitors who only read the public pages never load reCAPTCHA. Nothing starts under the emulators or without a site key.
- Enforcement is switched on in the console (App Check → Authentication) only once the metrics show the real traffic as verified and "outdated client" near zero, a few days after release.

## Alternatives considered

- **Start App Check on every page.** Simplest, and covers token refresh without the flag, but loads Google's reCAPTCHA for every reader of the guide and FAQ.
- **Start it only on the account pages.** Leaves signed-in sessions on other pages without tokens; if enforcement covers token refresh, those users would be signed out.
- **Identity Platform blocking functions or reCAPTCHA for email/password.** Stronger checks at sign-up, but an upgrade to Identity Platform and more moving parts. App Check comes first; revisit if abuse continues.

## Consequences

- The App Check SDK is in the main `firebase` chunk (it has to run before Auth restores a session), about 5 kB gzipped; the reCAPTCHA script itself loads only when App Check starts. 2.4.1 left it in the explainer's `firebase-ai` chunk, so every page preloaded that chunk until 2.4.2 moved it.
- reCAPTCHA runs on `/auth/action`, whose URL holds a single-use code that is consumed seconds later. Analytics stays off that page (ADR-0017).
- A browser signed in before this release has no flag on its first visit to a public page, so App Check starts only once Auth reports the user. Waiting a few days before enforcing lets the flag get set.
- Local development against production needs a registered App Check debug token (`VITE_APPCHECK_DEBUG_TOKEN`) once enforcement is on. Preview channels need their domain on the reCAPTCHA key.
- The privacy policy (effective November 7, 2026) describes reCAPTCHA, and the landing page notice mentions the change.
- Enforcement for Authentication was switched on on 2026-11-07, the day 2.4.1 shipped, after a real browser's token exchange on mycda.app returned 200; signing out and back in afterwards showed as verified requests.
