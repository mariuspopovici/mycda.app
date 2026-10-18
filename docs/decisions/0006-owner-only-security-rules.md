# 0006. Owner-only security rules

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The Firestore rules allowed any signed-in user to read and write every document (`request.auth.uid != null`), and the Storage rules did the same for every file. `GET /api/activity/:id` returned any activity to any signed-in user. Anyone who signed up could read or delete every rider's data.

Activities and user prefs carry the owner's `uid`. Segments don't: they reference their activity.

## Decision

Restrict every resource to its owner ([security](../architecture/security.md)). Segments are authorized through their parent activity with `get()`, rather than adding `uid` to segments. Cloud Functions check ownership explicitly, and return 404 for foreign activities so IDs can't be probed. Cover the rules with emulator tests in `tests/rules/`.

## Alternatives considered

- **Add `uid` to segments and backfill.** Simpler rules and no `get()` read cost. It needs a data migration and changes to the legacy app's queries while it's still in production. Revisit when the new app owns all writes.

## Consequences

- Each segment read or write costs one extra document read for the `get()`.
- The existing legacy queries already satisfy the rules, so no client change is needed. This is verified in the emulator, including the segment list query.
- The rules only protect production once deployed (`firebase deploy --only firestore:rules,storage`).
