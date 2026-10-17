# 0009. Virtual elevation gap and stop handling

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

Real rides contain stops (speed 0), smart-recording gaps of 2–6 s while moving, and pauses or dropouts lasting minutes. Some are over 20 minutes long with the rider moving at both ends ([fixture survey](../log/2026-10-17-fixture-survey.md)). The legacy VE:
- divided the acceleration term by Δt a second time, which is wrong for any Δt ≠ 1 s;
- integrated one power reading over a whole gap;
- at speed 0, snapped VE to the *real* elevation.

Snapping hides drift. Drift is the signal CdA and Crr are tuned against, and snapping also makes junk segments look well-fitted.

## Decision

- Integrate the energy balance per step: `m·g·Δh = P·η·Δt − Crr·m·g·v·Δt − ½·CdA·ρ·v_air·|v_air|·v·Δt − ½·m·(v² − v₀²)`. This is exact for any Δt.
- Where there is nothing to integrate (speed ≤ 0, Δt ≤ 0, or Δt > 10 s), make VE follow the real elevation *change*: `Δh = elevation[i] − elevation[i−1]`.
- Treat gaps up to 10 s (`MAX_INTEGRATION_GAP_SECONDS`) as moving and integrate them.

## Alternatives considered

- **Hold VE flat across stops and gaps.** Correct while standing still, but wrong after a pause where the rider resumes at a different height.
- **Snap to real elevation (legacy).** Hides drift, as above.
- **Split VE into separate traces at gaps.** More honest visually, but complicates fitting and charting. It can be layered on top later.

## Consequences

Measured on 10 real rides ([evaluation](../log/2026-10-17-physics-fixes-evaluation.md)): on clean laps, mean CdA is unchanged, VE error is equal or lower, and lap-to-lap CdA consistency is equal or better. Fits over laps containing stops and pauses change a lot, because the legacy snapping had been masking how poorly those laps constrain CdA.
