# 0014. Scale wind to rider height and use the head component for drag

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

The wind model ([design](../design/wind-model.md)) had three problems. Each one biases CdA rather than adding noise.

1. **Wind height.** Open-Meteo reports wind at 10 m, and the model used that value as the wind at the rider. By the logarithmic wind profile, wind at about 1 m is roughly 60 % of the 10 m value over open ground and 40 % among trees or buildings. On an out-and-back, drag per distance goes as (v+w)² + (v−w)² = 2(v² + w²), so an overstated w inflates the drag the model expects. At 36 km/h, with 15 km/h at 10 m and 8 km/h at the rider, this fits CdA about 11 % low. Ignoring the wind altogether would be about 5 % high, so in that case the wind model was worse than no wind model. Manual winds have the same problem, because people usually type in a forecast or weather-station value.
2. **Crosswind.** Virtual elevation used the apparent wind magnitude `√(head² + side²)` squared. The force that opposes motion is the head component; Martin et al. (1998), the usual reference for the power model, use the air velocity along the direction of travel and put the effect of yaw into CdA. The magnitude form overstates drag by about 1/cos(yaw): 1.5 % at 10° and 6 % at 20°.
3. **Strong tailwind.** Air speed was always ≥ 0, but `virtualElevation` uses `v_air·|v_air|` so that a tailwind faster than the rider pushes. With a magnitude, it counted as drag.

How sheltered a course is depends on hedges, trees, buildings and open water. The app can't tell those apart from a GPS track, and the rider knows them.

## Decision

- **Air speed is the signed head component.** `yaw()` returns `airspeed` = ground speed + wind·cos θ along the direction of travel, negative when a tailwind outruns the rider, plus `apparent` (the magnitude) and `yaw` for display. `virtualElevation` is unchanged: its `v_air·|v_air|·v` term now receives the head component, which is Martin's form.
- **Weather and manual winds are scaled to rider height** by `riderHeightFactor(exposure)` = ln(1 m / z₀) / ln(10 m / z₀):

  | Exposure | z₀ | Factor | Shown as |
  |---|---|---|---|
  | `open` | 0.03 m | 0.60 | fields, seafront |
  | `mixed` (default) | 0.1 m | 0.50 | hedges, scattered trees |
  | `sheltered` | 0.2 m | 0.41 | suburbs, woods |

- **Exposure is a ride setting**, `activities/{id}.analysisDefaults.windExposure`. It describes the course, so the tests table and every new analysis of the ride share it. Unset means `mixed`.
- **Saved analyses record it.** Segments gain `windExposure` (the exposure used, for the `wind` and `manual` sources, otherwise `null`). A saved analysis reopens with its own exposure. If the ride's setting has since changed, the analysis page says so and offers to switch to it.
- **A manual wind can be marked as measured at rider height**, `wind.atRiderHeight: true`. That wind is used as entered.
- **Exposure is never fitted.** A closure can't separate a wind scale from CdA (the same reason Crr isn't fitted from a single closure), so fitting it would absorb real CdA changes.

The new fields are optional and additive; no migration is needed.

## Alternatives considered

- **A fixed factor, no setting.** Simpler, but it is right on average and wrong for any particular course, by up to ±20 % in wind speed.
- **A per-analysis exposure control next to CdA.** It would become a free knob for tuning closure, and tests on one ride could use different values, which makes the spread between them meaningless.
- **Fit a wind scale with CdA.** Underdetermined for a single closure; see above.
- **Keep the apparent magnitude and model CdA(yaw).** We have no yaw-dependent CdA data for riders, and the head component is the established convention.

## Consequences

- CdA from the wind model is less biased on windy days. Manual winds from forecasts are handled correctly.
- **Results change for analyses that use the wind model or a manual wind.** Saved analyses still open at their saved CdA, but their virtual elevation profile and closure error shift. Analyses saved before this ADR have no `windExposure` and take the ride's setting (or `mixed`). Their manual winds are treated as 10 m values.
- Measured air speed and still air are unaffected. So are the golden snapshots, which use ground speed.
- The rider has one more setting to understand. The analysis and tests cards show the 10 m wind, the wind at rider height and the factor, so its effect is visible.
