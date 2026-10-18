# 2026-10-17: Effect of the virtual elevation fixes on real rides

Compares the legacy VE (`src/services/ve.js`) with the fixed core (`web/src/core/virtualElevation.ts`, commit `4eaf00c`) on the curated private rides ([survey](2026-10-17-fixture-survey.md)). Decision: [ADR-0009](../decisions/0009-virtual-elevation-gap-and-stop-handling.md).

## Method

- Fixed ρ = 1.2 kg/m³, m = 80 kg, Crr = 0.004, no drivetrain loss, metric, ground speed as air speed unless the file has measured air speed.
- For each ride or lap, fit CdA ∈ [0.02, 1.0] by ternary search to minimise the RMS of (VE − real elevation).
- Lap-level comparisons use laps with at least 120 points moving above 5 km/h.
- "Clean" laps additionally have no gap over 10 s and at most 5 stopped points.

The scripts were ad hoc, kept in the session scratchpad, and are not committed. To reproduce, compose `toActivitySeries` and `virtualElevation` with the legacy class the same way `private.test.ts` does.

## Whole ride (misleading, kept for the record)

| Ride | Legacy CdA | RMS | Fixed CdA | RMS |
|---|---|---|---|---|
| `179e07b9` | 0.373 | 7.4 m | 0.378 | 7.5 m |
| `ca984087` | 0.183 | 21.1 m | 0.206 | 8.2 m |
| `c4ae4df8` | 0.252 | 6.9 m | 0.247 | 4.8 m |
| `83ad24d3` | 0.255 | 4.0 m | 0.270 | 7.4 m |
| `b72dc6ed` | 0.255 | 6.1 m | 0.287 | 12.7 m |
| `0e8b35f1` | 0.328 | 3.6 m | 0.324 | 4.3 m |
| `0315645a` | 0.313 | 3.9 m | 0.312 | 3.9 m |
| `16c21302` | 0.229 | 5.6 m | 0.223 | 6.7 m |
| `a5512ec6` | 0.213 | 2.9 m | 0.215 | 2.7 m |
| `18e78a02` | 0.205 | 7.0 m | 0.205 | 7.0 m |

These figures are from an intermediate version that held VE flat across gaps, before the switch to following the real elevation change. Whole-ride RMS favours the legacy code on rides with many stops, because snapping VE to the real elevation at every stop resets the error. That is the masking the fix removes, not a better fit. `ca984087` shows the reverse: a long gap integrated with one power reading inflated the legacy error to 21 m.

## Per lap, all usable laps (final version)

| Ride | Laps | Legacy mean / CV / RMS | Fixed mean / CV / RMS |
|---|---|---|---|
| `ca984087` | 3 | 0.202 / 2.8% / 1.3 m | 0.202 / 2.7% / 1.4 m |
| `83ad24d3` | 6 | 0.268 / 4.8% / 2.1 m | 0.323 / 36.6% / 2.3 m |
| `b72dc6ed` | 10 | 0.280 / 12.8% / 1.7 m | 0.296 / 21.2% / 1.5 m |
| `0e8b35f1` | 3 | 0.339 / 10.8% / 1.5 m | 0.339 / 10.9% / 1.8 m |
| `0315645a` | 2 | 0.303 / 0.4% / 2.6 m | 0.303 / 0.4% / 2.6 m |
| `a5512ec6` | 8 | 0.218 / 13.6% / 1.3 m | 0.222 / 11.8% / 1.2 m |

The CV jump on `83ad24d3` comes entirely from laps 1 and 10, which are the warm-up and cool-down:

| Lap | Points | Stopped | Gaps > 1 s | Legacy CdA | Fixed CdA |
|---|---|---|---|---|---|
| 1 | 946 | 98 | 117 s | 0.268 | 0.308 |
| 2 | 1257 | 2 | – | 0.258 | 0.258 |
| 4 | 950 | 1 | – | 0.267 | 0.265 |
| 6 | 743 | 0 | – | 0.267 | 0.267 |
| 9 | 963 | 0 | – | 0.255 | 0.255 |
| 10 | 344 | 2 | 206 s | 0.294 | 0.584 |

Such laps barely constrain CdA. The legacy snapping made almost any CdA look plausible on them, so they appeared consistent with the test laps.

## Clean laps only (final version)

| Ride | Laps | Legacy mean / SD / CV / RMS | Fixed mean / SD / CV / RMS |
|---|---|---|---|
| `83ad24d3` | 4 | 0.262 / 0.005 / 2.1% / 1.8 m | 0.261 / 0.005 / 1.9% / 1.6 m |
| `b72dc6ed` | 7 | 0.271 / 0.013 / 4.9% / 1.5 m | 0.271 / 0.013 / 4.9% / 1.3 m |
| `ca984087` | 2 | 0.203 / 0.006 / 3.2% / 1.3 m | 0.203 / 0.006 / 3.2% / 1.3 m |
| `a5512ec6` | 8 | 0.218 / 0.030 / 13.6% / 1.3 m | 0.222 / 0.026 / 11.8% / 1.2 m |
| `0e8b35f1` | 2 | 0.347 / 0.042 / 12.2% / 0.6 m | 0.347 / 0.042 / 12.2% / 0.6 m |

## Conclusions

- On the segments riders should analyse, the fixes don't move mean CdA by more than 0.004. VE error is equal or lower, and lap-to-lap consistency is equal or better.
- The fixes matter most where the legacy code was most wrong: long gaps while moving, smart recording, and measured air speed with tailwinds.
- Segments containing stops or pauses now show their drift instead of hiding it. The new UI should warn when a selected range contains stops or gaps over 10 s.
- Imperial-mode results (not measured here) change substantially, because the legacy imperial ρ handling was wrong ([ADR-0008](../decisions/0008-metric-only-analysis-core.md)).
