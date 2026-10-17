# 0002. Rewrite the frontend in React + Vite + TypeScript

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The frontend is Vue 2 (end of life 31 Dec 2023), built with webpack 3 and Babel 6 from the 2017 `vuejs-templates/webpack` scaffold. `node-sass@4` has no build for arm64 or current Node, so the app can't be built on a current developer machine.

Moving to Vue 3 doesn't preserve the UI layer. bootstrap-vue (about 250 `<b-*>` tags in the templates), vue2-google-maps, `@statnett/vue-plotly`, vue2-dropzone, vuelidate and vue-slider-component are all Vue-2-only, so every template has to be rewritten either way. The parts worth keeping, the analysis math and the parsing, don't depend on the framework.

The codebase is small: about 6k lines, with most of the work in two screens (activity details and CdA analysis).

## Decision

Rewrite the frontend as a new app in `web/`, using React 19, Vite, TypeScript and Vitest. Move the domain logic into a framework-free core first ([ADR-0007](0007-framework-free-core-with-parity-tests.md)). Run the legacy app until the new one reaches parity, then delete it.

Supporting choices: React Router; TanStack Query for Firestore and API data; React context for the session and user prefs (the Vuex store is about 50 lines); plotly.js kept behind a thin wrapper of our own, because VE tuning relies on `relayout`, shapes and range selection.

## Alternatives considered

- **Vue 3 + bootstrap-vue-next.** Equally viable technically. It saves no effort, because the UI libraries are replaced either way, and bootstrap-vue-next is less complete than bootstrap-vue was.
- **Patch the Vue 2 build (swap `node-sass` for `sass`, `--openssl-legacy-provider`).** Keeps an end-of-life framework, and only postpones the rewrite.

## Consequences

- Typed domain code, a modern toolchain, and a larger ecosystem: an official Leaflet binding, current Firebase SDK patterns.
- Two frontends coexist during the migration. Both must keep reading and writing the unchanged Firestore and Storage shapes ([data model](../architecture/data-model.md)).
- The visual design changes ([ADR-0003](0003-mantine-ui-library.md)).
