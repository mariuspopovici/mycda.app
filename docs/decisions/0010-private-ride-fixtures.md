# 0010. Personal rides as gitignored test fixtures

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The committed CSV fixtures are short, synthetic-looking files with no stops, gaps, or (mostly) GPS. They miss the behaviours where the legacy physics was wrong. The developer has about 300 real uploads in Storage. These contain GPS tracks that reveal where they live and ride, and the repository may be public.

## Decision

Download personal rides into `web/src/core/__fixtures__/private/`, which is gitignored.
- A curated list of about 10 rides runs in every `npm test`, and is skipped when the folder is absent (CI, other machines).
- Golden outputs for those rides are written into the same ignored folder with `toMatchFileSnapshot`.
- `npm run test:all-fixtures` runs parity over every file.

## Consequences

- Real-world coverage without committing location data.
- CI and other contributors don't run the private tests, so the committed fixtures and physics-invariant tests must carry the core guarantees on their own.
- The curated list in `private.test.ts` names files by UUID. Its labels currently include ride names, some of which contain place names. Strip these if the repository is public.
- A future option: a script that shifts and rotates GPS tracks so representative rides can be committed.
