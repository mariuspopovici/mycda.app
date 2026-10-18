# Security

## Model

Every piece of user data belongs to exactly one Firebase Auth user (email and password). There is no sharing, no admin role, and no public data. See [ADR-0006](../decisions/0006-owner-only-security-rules.md).

| Resource | Owner check |
|---|---|
| `activities/{id}` | `resource.data.uid == request.auth.uid`. `uid` can't be changed or set to another user |
| `segments/{id}` | `get(activities/{resource.data.activity}).data.uid == request.auth.uid`. A segment can't be moved to another activity |
| `userprefs/{uid}` | Document ID equals `request.auth.uid` |
| Storage `userdata/{uid}/**` | Path `uid` equals `request.auth.uid`; nothing outside `userdata/` is accessible |
| Realtime Database | Fully closed (unused) |

Queries must be provably restricted to the caller's own documents, or Firestore rejects them:
- list activities with `where('uid', '==', uid)`;
- list segments with `where('activity', '==', activityId)` (the rule evaluates `get()` on the constrained activity ID).

Cloud Functions use the Admin SDK and bypass the rules, so they must do their own ownership checks. `processActivityFile` only processes `userdata/{uid}/activities/{activityId}.*` when `activities/{activityId}.uid` is that same `uid`. Otherwise a user could upload under their own path with another user's activity ID and overwrite that activity.

## Cloud Functions

`api` (Express) runs `validateFirebaseIdToken` on every route: `Authorization: Bearer <ID token>`, or a `__session` cookie.

| Route | Access control |
|---|---|
| `GET /activity/:id` | Returns 404 unless `activities/{id}.uid` is the caller's. Missing and foreign activities look the same, so activity IDs can't be probed |
| `POST /activity/:id/reprocess` | Same ownership check. Re-runs processing on the caller's own stored upload (`userdata/{uid}/activities/{id}.fit\|.csv`); marks the activity as an error if no upload exists |
| `GET /cors?service=&url=` | `service` must be `openweather` or `maps` (`PROXY_SERVICES`). `url` must be `https`, on exactly that service's host, with no credentials or port. `API_KEY` in the URL is replaced with the service's key from Secret Manager (`OPENWEATHER_API_KEY`, `GOOGLE_MAPS_API_KEY`) |

`/cors` exists only because the legacy app called keyed APIs from the browser. It is removed once weather and elevation move to Open-Meteo ([ADR-0005](../decisions/0005-open-meteo-for-weather-and-elevation.md)).

## Tests

`tests/emulator/rules.test.js` runs against the Firestore and Storage emulators, and `tests/emulator/functions.test.js` exercises the functions' access control end to end:

```bash
npm --prefix tests/emulator test
```

It covers owner access, cross-user denial for reads, lists, updates and deletes, ownership transfer, moving a segment between activities, and signed-out access. Run it whenever `firestore.rules` or `storage.rules` changes.

## History

Until October 2026 the rules allowed any signed-in user to read and write every document and file, `/activity/:id` did not check ownership, and `/cors` would fetch any URL with the real API key substituted in. A signed-in user could therefore read other users' rides or obtain the project's API keys. These were fixed in commit `93f3288` and deployed on 2026-10-17. Rotate the OpenWeatherMap and Google keys if exposure is a concern.
