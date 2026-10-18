# Virtual elevation

Implementation: `web/src/core/virtualElevation.ts`. Method: R. Chung, *Estimating CdA with a power meter* ([PDF](http://anonymous.coward.free.fr/wattage/cda/indirect-cda.pdf)).

## Idea

Power in is spent on rolling resistance, aerodynamic drag, changes in kinetic energy, and climbing. Given measured power and speed, and guessed CdA and Crr, whatever energy is left over must have gone into climbing. Integrating that gives a *virtual* elevation profile. With the right CdA and Crr, the virtual profile matches the real course. On a loop it returns to its start height, and on a flat track it stays flat. With wrong values it drifts. The rider tunes CdA and Crr until the drift disappears.

## Equation

For each pair of consecutive points *i−1 → i*:

```
m·g·Δh = P·η·Δt − Crr·m·g·v·Δt − ½·CdA·ρ·v_air·|v_air|·v·Δt − ½·m·(v² − v₀²)
```

| Symbol | Meaning | Unit | Source |
|---|---|---|---|
| P | power | W | file |
| η | drivetrain efficiency, `1 − dloss/100` | – | user prefs |
| Δt | time between points | s | timestamps |
| v, v₀ | ground speed at *i*, *i−1* | m/s | file (km/h ÷ 3.6) |
| v_air | air speed at *i*; negative when a tailwind is faster than the rider | m/s | file, wind model, or ground speed |
| m | rider + bike mass | kg | user |
| ρ | air density | kg/m³ | user, or computed from weather |
| g | 9.81 | m/s² | |

`VE[0]` is the first real elevation, and `VE[i] = VE[i−1] + Δh`.

The aero term uses air speed squared (the force) times *ground* speed (the distance covered), which is the correct work done against drag in wind. `v_air·|v_air|` keeps the sign, so a strong tailwind pushes rather than drags.

## When not to integrate

At some points the equation has nothing meaningful to integrate. There, VE follows the **real** elevation change (`Δh = elevation[i] − elevation[i−1]`):

| Condition | Why |
|---|---|
| `v ≤ 0` (stopped) | No distance is covered, and power at a standstill isn't propulsion. The real change is ~0 when stationary |
| `Δt > 10 s` (`MAX_INTEGRATION_GAP_SECONDS`) | Auto-pause or dropout. Integrating one power reading over minutes produces jumps of tens of metres. Real rides contain gaps of 20+ minutes while "moving" |
| `Δt ≤ 0` | Repeated or out-of-order timestamps |

Smart recording produces moving gaps of 2–6 s, which are integrated normally. The energy form is exact for any Δt.

Following the real *change*, rather than snapping to the real *value*, keeps accumulated drift visible. Drift is the signal CdA and Crr are tuned against. See [ADR-0009](../decisions/0009-virtual-elevation-gap-and-stop-handling.md).

## Units

The core is metric only: km/h, m, kg and kg/m³ in, m out. Imperial is a display concern. The UI converts inputs (lb → kg, lb/ft³ → kg/m³ with `lbPerFt3ToKgPerM3`) and outputs (m → ft). See [ADR-0008](../decisions/0008-metric-only-analysis-core.md).

## Inputs from the activity

`toActivitySeries()` prepares the series:
- altitude from km to m;
- missing air speed replaced by ground speed;
- power above 1500 W replaced by the mean of the previous 5 accepted values (sensor spikes).

## Fitting

`web/src/core/fit.ts` ("Suggest CdA") finds the CdA, and optionally Crr, that best explains the ride. It uses golden-section search, with an inner search over CdA for each Crr. There are two targets:

- **Elevation:** minimise the RMS difference between VE and the recorded elevation. This needs trustworthy elevation, such as a barometric altimeter or a flat track.
- **Loops:** minimise the RMS of each loop's drift, `(VE[end] − VE[start]) − (elevation[end] − elevation[start])`. This is the classic Chung approach. Each loop starts and ends at the same place, so a correct CdA and Crr close it, regardless of how noisy the recorded elevation is between those points.

Fitting Crr as well only works when speed varies enough to separate the two terms (see below). On a synthetic ride with known parameters, both targets recover CdA to within 0.001 (`fit.test.ts`, and the end-to-end test).

## Interpreting results

- Analyse stretches without stops, braking or drafting. Loops, out-and-backs and velodromes work best.
- CdA and Crr are correlated: on a constant-speed segment, only their combination is identifiable. Speed variation separates them.
- The segment comparison rules of thumb (`segmentStats.ts`): 0.005 m² CdA ≈ 5 W ≈ 20 s per 40 km at typical TT speeds.

## Legacy behaviour (fixed in `4eaf00c`)

The Vue app's `src/services/ve.js` differed in ways that changed results:

1. The acceleration term was divided by Δt twice. This was correct only for 1 s recording.
2. At `v = 0`, VE snapped to the real elevation, hiding drift.
3. Gaps were integrated using the single power reading at the end of the gap.
4. Air speed was squared, so a tailwind faster than the rider added drag.
5. In imperial mode, ρ in lb/ft³ (~16× too small) was passed into SI equations, and VE mixed feet with metre-sized steps.

[log/2026-10-17-physics-fixes-evaluation.md](../log/2026-10-17-physics-fixes-evaluation.md) has the measured effect on real rides.
