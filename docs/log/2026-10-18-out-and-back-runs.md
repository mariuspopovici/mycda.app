# 2026-10-18: Joined out-and-back runs on a real test file

A field tester sent a test file recorded on a Wahoo ELEMNT BOLT. It's a private fixture (`lanier-elemnt-out-and-back.fit`), not committed, and nothing here identifies the location.

The file contains 10 out-and-back tests, each split into separate laps:

| Leg | Laps | Heading | Distance |
|---|---|---|---|
| Out | 2, 7, 11, 15, 19, 23, 27, 31, 35, 39 | ~319° | 2.5 km (0.73 km for 11 and 23) |
| Back | 5, 9, 13, 17, 21, 25, 29, 33, 37, 41 | ~139° | 2.5 km (0.73 km for 13 and 25) |

Short turnaround and recovery laps sit in between. The legacy parser rejected the file ("missing speed": only its first record lacked speed). Pipeline v2 reads 5,448 points and 43 laps.

## Closure fit per test

Each out and back pair was joined with `combineRanges`, then CdA was fitted by run closure (`fitParameters`, loops target over the whole run). The tester's real values aren't known, so the inputs are assumptions: ρ 1.2, mass 80 kg, Crr 0.004, no drivetrain loss. Only the relative values are meaningful.

| Laps | Run | CdA | Closure error | Without join handling |
|---|---|---|---|---|
| 2 + 5 | 4.97 km | 0.227 | 0.001 m | 0.228 |
| 7 + 9 | 4.97 km | 0.229 | 0.001 m | 0.230 |
| 11 + 13 | 1.45 km | 0.290 | 0.000 m | 0.294 |
| 15 + 17 | 4.96 km | 0.224 | 0.000 m | 0.225 |
| 19 + 21 | 4.96 km | 0.230 | 0.000 m | 0.232 |
| 23 + 25 | 1.46 km | 0.232 | 0.000 m | 0.241 |
| 27 + 29 | 4.95 km | 0.221 | 0.001 m | 0.222 |
| 31 + 33 | 4.96 km | 0.216 | 0.001 m | 0.217 |
| 35 + 37 | 4.96 km | 0.214 | 0.000 m | 0.214 |
| 39 + 41 | 4.95 km | 0.213 | 0.000 m | 0.213 |

- **The 8 long tests are consistent:** mean 0.222, SD 0.0065, CV 2.9 %. Their downward trend, 0.227 to 0.213, suggests the rider changed position or equipment between tests.
- **The 1.45 km tests are noisier,** and one (0.290) is a clear outlier. Excluding segments from the summary statistics would handle that ([roadmap](../plans/feedback-roadmap.md) step 4).
- **Join handling** changes CdA by at most 0.009 on this file. A turnaround lap separates each out and back leg here, so the time gap already stops integration across the join. Holding level matters most for back-to-back laps, where a speed change at the lap button would otherwise integrate as a ~2.5 m step (`ranges.test.ts`).
