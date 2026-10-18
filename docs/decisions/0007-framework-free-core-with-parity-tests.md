# 0007. Framework-free analysis core, ported with parity tests

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The product's value is its analysis: virtual elevation, the wind model, loop detection, spike filtering and segment statistics. In the legacy app this logic is split between `src/services/*.js` and the Vue components (`processData` in `Activity.vue`, stats in watchers, wind and air-density orchestration in `CdA.vue`). It had no tests. Rewriting the UI risks silently changing results that riders compare across years.

## Decision

Put all analysis logic in `web/src/core/` as pure TypeScript functions, with no React, Firebase or browser APIs. Port it in two steps:

1. **Faithful port.** Reproduce legacy behaviour exactly, including known bugs (marked in comments), and prove it with parity tests that run the legacy JS on the same inputs: committed CSV fixtures, private real rides, and a generated GPS circuit.
2. **Deliberate fixes.** Change behaviour in separate commits, each with a targeted test, updated golden snapshots, and a log entry with measured impact.

Golden snapshots of the core's output keep guarding behaviour after the legacy code and parity tests are deleted.

## Consequences

- Any change in results is visible in review as a snapshot diff.
- The core can be reused in a Worker, a CLI, or Cloud Functions later.
- Parsing stays in `functions/` (CommonJS) for now. Tests import it through `functions/activity.js`, which was split out of `index.js` so tests don't initialize Firebase Admin.
