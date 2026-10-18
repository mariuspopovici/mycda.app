# 0003. Use Mantine as the UI library

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The legacy UI uses bootstrap-vue, plus separate libraries for file drop (vue2-dropzone), sliders (vue-slider-component), form validation (vuelidate), icons (FontAwesome) and toasts. The rewrite needs forms, modals, tables with pagination, tabs, dropdowns, popovers, sliders, a dropzone, notifications, an app shell, and dark mode.

## Decision

Use Mantine (`@mantine/core`, `@mantine/form`, `@mantine/dropzone`, `@mantine/notifications`) for all UI. Accept a partial visual redesign.

## Alternatives considered

- **react-bootstrap.** Maps almost one-to-one onto the existing `<b-*>` components and keeps today's look. It still needs separate dropzone, slider, validation and notification libraries, and its forms story is weaker.
- **Tailwind + shadcn/ui.** Very flexible, but every component is our own code to maintain, which is more work than this hobby-scale app justifies.

## Consequences

- One dependency family replaces five, with built-in dark mode, which the legacy app supported through a theme prop.
- The look changes. Screenshots in `README.md` will need updating at cutover.
