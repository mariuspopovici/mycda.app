# 0012. Segment documents while both apps are in use

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

Until cutover, a rider may open the same activity in either app, so `segments` documents must stay readable by the legacy app. The legacy shape copies every series of the range into the document. It stores `rho` in kg/m³, but stores `mass` and `ve` in the owner's display units, with nothing recording which units those are. It also lets several segments of an activity be marked as baseline. Copying the series limits a segment to roughly 7,000 points before it hits Firestore's 1 MiB document cap.

## Decision

Until the legacy app is retired, the new app writes segments in the legacy shape:
- the series are copied in metric;
- `rho` is in kg/m³;
- `mass` and `ve` are in the owner's display units;
- `range` includes `startDistance` and `endDistance`;
- `laps` are in the API shape.

It also adds a `units` field recording the units of `mass` and `ve`. When reading, it uses `units`, falling back to the owner's current preference for legacy documents (ADR-0008). Saving a baseline clears the flag on the activity's other segments. Ranges over 7,000 points can't be saved, and the UI explains why.

## Alternatives considered

- **Save the range and parameters only, and read the series from the activity.** The documents would be smaller, with no length limit. The legacy app couldn't open them, though, and opening an analysis would need the activity's file.

## Consequences

- Both apps can open each other's segments.
- After cutover, migrate segments to metric `mass` and `ve` (using `units`), and consider dropping the copied series in favour of the range alone.
- Legacy documents from riders who changed units after saving are read with the wrong mass, as they always were in the legacy app.
