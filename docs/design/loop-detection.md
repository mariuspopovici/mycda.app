# Loop detection

Implementation: `web/src/core/loopFinder.ts`.

VE analysis works best over closed loops: the course starts and ends at the same height, so a correct CdA/Crr returns VE to where it started. The loop finder splits a GPS track into repeated laps so they can be marked on the chart and analysed individually.

## Algorithm

1. Round each fix to `digits` decimal places, from `precisionDigits(precision)`:

   | precision | digits | grid |
   |---|---|---|
   | low | 3 | ~110 m (neighbourhood) |
   | medium | 4 | ~11 m (street) |
   | high | 5 | ~1 m |

2. Walk the track and remember the first index at which each rounded coordinate was seen.
3. On revisiting a coordinate, if the points elapsed are strictly between `minLoopDuration` and `maxLoopDuration`, record a loop `{startIndex, endIndex, distance}` and forget all coordinates seen so far. The next loop then starts after this one.

Durations are point counts, which equal seconds at 1 s recording. Indexes refer to the aligned track, so they index directly into the speed, power and time series. Points without a fix are skipped.

## Behaviour notes

- A revisit outside the duration window is ignored, and the original first-seen index is kept.
- Loops are found greedily in order and never overlap.
- Low precision finds loops on noisy GPS but can join points ~100 m apart. High precision needs the track to pass within ~1 m of itself.
- The legacy implementation rounded the caller's coordinates in place, turning them into strings. The port doesn't mutate its input.
