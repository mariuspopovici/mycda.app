# Real-time CdA with a wind sensor

As of 2026-11-03. Whether a bike computer can show CdA while riding, using a [WEATHERmeter](https://shop.tempest.earth/products/weathermeter) wind sensor.

## Why a sensor

From power and speed alone, CdA can't be trusted second by second. At 40 km/h with 80 kg and a CdA of 0.25 (about 206 W of drag), 0.1 % of road grade is about 4 % of CdA and 1 km/h of headwind about 5 %. A WEATHERmeter measures air speed and everything air density needs (temperature, humidity, station pressure), over Bluetooth LE. What's left is mostly altitude noise, which averages out over a rolling window: with ±0.5 m from the barometer (an assumption to check), about 6 % at 30 s, 3 % at 60 s and 1.6 % at 2 minutes. Lap closure remains the most precise number.

## Steps

Each step decides whether the next is worth doing.

- [x] **1. Bench page** at `/lab/weathermeter` (`core/weatherMeter.ts`, `services/weatherMeterBle.ts`): unlisted; connects over Web Bluetooth, shows decoded readings and the update rate, and records to CSV.
- [ ] **Bench check with a real meter:** a first 4-second recording on 2026-11-03 confirms the connection and the packet layout (see *Measured* below). The meter is a WFANO-02E, so it uses the optical calibration, the page's default. Still open: a longer recording against a known air speed.
- [ ] **2. Ride test, the go/no-go:** log the meter on an Android phone during a calm out-and-back session, merge it with the FIT file by time, and upload as CSV (it has an `airspeed` column; analyses have a "Measured" source). Compare the scatter of repeated runs with and without measured air speed. Check the air speed reading against ground speed over out-and-back legs: the ratio is the mount's correction factor, because the rider and bars disturb the flow and 1 % of air speed is 2 % of CdA. Also look at how it reads in crosswinds; nothing documents the impeller's off-axis response.
- [ ] **3. Connect IQ data field:** rolling and lap CdA and live air density, saving air speed to the FIT file as developer fields. `Toybox.BluetoothLowEnergy` is available to data fields (Connect IQ 3.1+), but check support on the target device; the simulator needs a Nordic nRF kit for Bluetooth, so keep the physics separate and test Bluetooth on hardware.
- [ ] **4. MyCdA reads it back:** `functions/activity.js` reads `air_speed` and a legacy workaround field but no developer fields; add them.

## Protocol notes

From the vendor's *WEATHERmeter BLE Protocol* document, as implemented in `core/weatherMeter.ts`:

- Service `961f0001-d2d6-43e3-a417-3bb8217e0e01`; weather data `961f0005-…` (notify, read), 16 bytes, little endian.
- The document gives RPM as `low + high * 65535`. The high byte sits above 16 bits, so we use 65536; the difference is 1 RPM per step of the high byte.
- The calibration depends on the model: optical (WFPSM-02C, -02d, -02e, WFANO-02E) or hall effect (all others). 40 km/h is about 37,750 RPM on optical models and 14,000 on hall effect.
- The magnetometer gives the meter's heading. With the meter fixed to the bike that's the bike's heading, not the wind's, and it isn't needed: the impeller's reading along the direction of travel is the air speed virtual elevation uses (ADR-0014).

## Measured

First real recording, 2026-11-03: 9 readings over 4 s, blowing on the impeller indoors.

- **Update rate:** 2 Hz (0.48–0.51 s between notifications), fast enough for a data field that computes once a second.
- **RPM resolution:** every reading is a multiple of 30 RPM. That's about 0.03 km/h on the optical calibration and 0.08 km/h on hall effect, or 0.15–0.4 % of CdA at 40 km/h for a single reading, so it's negligible once averaged.
- **Air data:** 24.2 °C, 62–63 % humidity and 1017.2–1017.3 hPa gave 1.1835 kg/m³. The values are plausible and pressure looks like hPa. Whether it's station pressure, as we assume, needs comparing with a local report at a known altitude.
- **Sensor type:** WFANO-02E, optical, the calibration this recording used.
- **Not measured yet:** dropouts, and how fast the impeller responds. The RPM falling from 7020 to 4830 over 2 s may be the impeller slowing down or just the breath fading.
