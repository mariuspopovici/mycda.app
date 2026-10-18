# 0013. Segments store ranges and metric parameters (version 2)

- **Status:** Accepted
- **Date:** 2026-10-18
- **Supersedes:** the write rules of [ADR-0012](0012-segments-during-coexistence.md). Reading legacy documents is unchanged.

## Context

Field testers analyze out-and-back runs: an out leg and a back leg, recorded as separate laps with a turnaround lap in between, analyzed as one run so that wind and gradient cancel out ([feedback](../plans/feedback-roadmap.md)). A segment therefore needs several ranges.

The legacy shape (ADR-0012) copied every series into the document. That copying caps a segment at about 7,000 points, the 1 MiB document limit, and it stores mass and VE in display units. The legacy app, which needed that shape, was retired on 2026-10-18.

## Decision

New and edited segments are written as version 2:

| Field | Meaning |
|---|---|
| `version` | `2` |
| `ranges` | `[{start, end}]` timestamps, in ride order: one for a plain range, several for a joined run |
| `range` | `{start, end}` spanning all ranges. It orders the activity's segment list (existing index) |
| `mass` (kg), `rho` (kg/m³), `crr`, `cda`, `dloss` (%) | Metric parameters ([ADR-0008](0008-metric-only-analysis-core.md)) |
| `airspeedSource` | `measured`, `ground`, `wind` or `manual` |
| `wind` | `{speed (km/h), direction (° from)}` for `manual`, otherwise `null` |
| `name`, `description`, `isBaseline` | as before |

- Series are no longer copied. The analysis page reads them from the activity (`GET /api/activity/:id`) and joins the ranges.
- Virtual elevation holds level at each join (`breaks` in `virtualElevation`, [design](../design/virtual-elevation.md#joined-runs)).
- Saving a legacy document rewrites it as version 2 and deletes its copied series (`units`, `ve`, `time`, `power`, `speed`, `airspeed`, `altitude`, `distance`, `location`, `laps`).
- Unedited legacy documents are still read with their own series.

## Alternatives considered

- **Keep copying series alongside the ranges.** This preserves exact reproducibility if an activity is ever reprocessed by a different parser. The cost is the size limit and duplicated data, for a risk that `PIPELINE_VERSION` already makes visible.
- **One segment per range, linked by a run ID.** Splitting a single analysis across several documents complicates listing, deleting and comparing.

## Consequences

- Analyses of any length can be saved, including joined runs.
- A saved analysis depends on its activity's parsed file. Reprocessing an activity with a newer parser can shift its VE slightly. The parameters and ranges stay as saved.
- Opening a version 2 segment fetches the activity data (cached for the session).
