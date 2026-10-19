# 0016. Explain runs with Gemini through Firebase AI Logic, sending computed numbers only

- **Status:** Accepted (trial)
- **Date:** 2026-10-19

## Context

Riders struggle to read a virtual elevation chart: whether a run closes, what a drift on one leg means, which input to measure better. A language model can turn the analysis's numbers into a plain-language read and next steps. Two constraints shape how:

- The CdA must stay MyCdA's own deterministic fit. A model that estimates or rounds physics numbers would undermine the product's first principle, "trust the number" ([roadmap](../plans/roadmap.md)).
- MyCdA is non-commercial. The trial should cost nothing and need no server code or stored secret.

## Decision

- **Firebase AI Logic** calls Gemini from the browser through Firebase's proxy, with the **Gemini Developer API** backend (free tier) for the trial. The model is `gemini-3.5-flash` by default, overridable with `VITE_GEMINI_MODEL`.
- **App Check** with reCAPTCHA Enterprise protects the endpoint; AI Logic enforces it. App Check and the AI SDK load lazily, on the first explanation, in their own chunk.
- **Only computed numbers are sent** (`core/runDiagnostics.ts` → `services/assistant.ts`'s `explainRunPrompt`): run and leg durations, distances, speeds, power, elevation and VE changes, closure and RMS errors, the parameters, CdA sensitivities and data-quality counts. No GPS track, activity name, notes or account details. Nothing is sent until the rider presses Explain.
- **The model explains, never computes.** The system instruction forbids new numbers, and the answer is a JSON schema (verdict, headline, findings, next steps) that the app validates before showing.

## Alternatives considered

- **A Cloud Function calling the Claude API** — any model, prompts kept server-side, but a function, a secret in Secret Manager and per-user rate limiting to build, and paid from the first call.
- **AI Logic with the Vertex AI backend** — Google doesn't use the data to improve its products, but it needs Blaze billing per call. It's the planned step if the trial is kept: the code changes only the backend class.
- **Sending ride notes too** — richer context, but notes are the rider's own words and the free tier's terms let Google use what is sent. Left out.

## Consequences

- The Gemini Developer API's terms allow Google to use requests to improve its products. The privacy policy says so, and only derived numbers are sent.
- The Firebase config now needs the registered web app's `appId` (`VITE_FIREBASE_APP_ID`), and production builds need `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`. The explainer is hidden when the site key is missing.
- AI Logic isn't emulated: browser tests mock the Gemini endpoint, and model quality needs separate checks against real rides.
- Prompts live in the client. A signed-in user could send their own prompts against the project's quota; App Check and AI Logic's per-user rate limit bound that.
