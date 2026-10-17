# 0008. Metric-only analysis core

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The legacy VE took a `units` flag and converted speed with a unit-specific divisor, while mass was converted to kg. In imperial mode, air density in lb/ft³ went straight into an SI equation, about 16× too small, and the VE started in feet but integrated metre-sized steps. Imperial results were therefore wrong. Unit handling was spread across components, and saved segments mix metric series with display-unit `mass`, `rho` and `ve`.

## Decision

The analysis core accepts and returns metric units only: km/h, m, kg, kg/m³, W. Imperial exists only at the UI boundary, through the conversions in `units.ts`, including `lbPerFt3ToKgPerM3`. The core has no `units` parameter.

## Consequences

- Imperial correctness follows from the design rather than from per-function care.
- The new app must convert legacy segments' `mass`, `rho` and `ve` from the owner's display units when reading, and should store metric going forward. Record this in the data model when segment writes are implemented.
- Imperial users will see different (correct) VE than the legacy app showed.
