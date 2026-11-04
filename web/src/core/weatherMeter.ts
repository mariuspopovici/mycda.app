import { airDensity, dewPointFromHumidity } from './airDensity'

/**
 * Readings from a WeatherFlow/Tempest WEATHERmeter, decoded from its BLE "weather data"
 * characteristic (WEATHERmeter BLE Protocol). All values are little endian.
 */
export interface WeatherMeterReading {
  /** Impeller speed, revolutions per minute. */
  rpm: number
  /** Raw magnetometer values. */
  magnetometer: { x: number, y: number, z: number }
  /** °C */
  temperature: number
  /** Relative humidity, %. */
  humidity: number
  /** Station pressure, hPa. Absent models report 0. */
  pressure: number
}

/** How the impeller's rotation is detected, which sets its calibration. */
export type ImpellerSensor = 'optical' | 'hall'

export const WEATHER_DATA_BYTES = 16

export function decodeWeatherData (data: DataView): WeatherMeterReading {
  if (data.byteLength < WEATHER_DATA_BYTES) throw new Error(`Expected ${WEATHER_DATA_BYTES} bytes, got ${data.byteLength}.`)
  return {
    // the protocol document multiplies the high byte by 65535; it is the byte above 16 bits, so 65536
    rpm: data.getUint16(0, true) + data.getUint8(14) * 65536,
    magnetometer: { x: data.getInt16(2, true), y: data.getInt16(4, true), z: data.getInt16(6, true) },
    temperature: data.getInt16(8, true) / 10,
    humidity: data.getInt16(10, true),
    pressure: data.getUint16(12, true) / 10
  }
}

/**
 * Air speed along the impeller's axis in km/h, from the protocol's piecewise calibration.
 * Optical models are WFPSM-02C, WFPSM-02d, WFPSM-02e and WFANO-02E; all others use a hall-effect sensor.
 */
export function impellerAirSpeed (rpm: number, sensor: ImpellerSensor): number {
  const [cutIn, knee, low, high] = sensor === 'optical'
    ? [240, 2800, { a: 0.000437, b: 0.133 }, { a: 0.000279, b: 0.577 }]
    : [60, 1680, { a: 0.000975, b: 0.155 }, { a: 0.000755, b: 0.524 }]
  if (rpm < cutIn) return 0
  const { a, b } = rpm > knee ? high : low
  return (a * rpm + b) * 3.6
}

/** Air density in kg/m³ from a reading; undefined when the model reports no pressure. */
export function readingAirDensity ({ temperature, humidity, pressure }: WeatherMeterReading): number | undefined {
  if (pressure <= 0) return undefined
  return airDensity({ temperature, dewPoint: dewPointFromHumidity(temperature, humidity), stationPressure: pressure })
}

/** Average updates per second over timestamps in ms, oldest first; undefined until there are two. */
export function updateRate (timestamps: number[]): number | undefined {
  if (timestamps.length < 2) return undefined
  const span = timestamps[timestamps.length - 1] - timestamps[0]
  return span > 0 ? ((timestamps.length - 1) * 1000) / span : undefined
}
