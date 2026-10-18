# Roadmap from user feedback

Feedback came from two riders: one in July 2020, and an experienced field tester with a 10-test out-and-back file (see [log](../log/2026-10-18-out-and-back-runs.md)).

| # | Step | Requests | Status |
|---|---|---|---|
| 1 | Foundations | Ride-level defaults and notes; analyses open already fitted; manual wind; air density inputs (station pressure, humidity) | Done, branch `feature/runs` |
| 2 | Joined runs | Analyze several laps as one run (out and back), holding VE level at joins; segments v2 ([ADR-0013](../decisions/0013-segments-v2-ranges.md)) | Done, branch `feature/runs` |
| 3 | Tests table | Every test of a ride on one screen. Out and back legs are paired automatically (editable), with shared ρ, Crr and mass. Each run shows its stats and fitted CdA, can be saved in one go, and opens the full analysis on click | Next |
| 4 | Better summary statistics | Include or exclude per segment; duration-weighted mean and SD; warn about overlapping segments | |
| 5 | Weather along the route | Sample hourly weather where the rider was at each hour, not only at the start | |

The CdA slider's 0.001 step was also requested; that was already the case.

Also on `feature/runs`, from the developer: the activity list shows new uploads first, sorts by upload time, ride date (either direction) or name (remembered per browser), and has a search box that matches names and notes.

## Step 1–2 details

- **Ride settings** (activity page): mass, ρ (with the calculator), Crr, drivetrain loss and notes, stored on the activity (`notes`, `analysisDefaults`). Starting values come from the saved segment, then the ride, then the profile.
- **Opening fitted:** a new analysis opens at the CdA fitted by run closure for joined runs, by loop closure when loops are found, and otherwise by the elevation profile. A note shows the basis, with "Reset to suggested".
- **Manual wind:** constant speed and direction (degrees it blows from), combined with the GPS track's bearing like the weather wind model. It's saved with the analysis.
- **Air density calculator:** sea-level or station pressure; dew point or relative humidity (Magnus formula), with guidance on which pressure weather services report.
- **Joined runs:** tick laps on the activity page, then "Analyze N as one run". The analysis URL carries `ranges=from-to,from-to`. The chart shows the joins as dashed lines and plots the continuous run distance. Saved segments list "N ranges joined".
