import { describe, expect, it } from 'vitest'
import { airDensity } from '../airDensity'
import { decodeWeatherData, impellerAirSpeed, readingAirDensity, updateRate } from '../weatherMeter'

function packet ({ rpm = 0, x = 0, y = 0, z = 0, temperature = 0, humidity = 0, pressure = 0 }) {
  const view = new DataView(new ArrayBuffer(16))
  view.setUint16(0, rpm & 0xffff, true)
  view.setInt16(2, x, true)
  view.setInt16(4, y, true)
  view.setInt16(6, z, true)
  view.setInt16(8, temperature, true)
  view.setInt16(10, humidity, true)
  view.setUint16(12, pressure, true)
  view.setUint8(14, rpm >> 16)
  return view
}

describe('decodeWeatherData', () => {
  it('reads the fields little endian, with their exponents', () => {
    expect(decodeWeatherData(packet({ rpm: 37750, x: -120, y: 45, z: 300, temperature: 215, humidity: 50, pressure: 10132 }))).toEqual({
      rpm: 37750,
      magnetometer: { x: -120, y: 45, z: 300 },
      temperature: 21.5,
      humidity: 50,
      pressure: 1013.2
    })
  })

  it('reads known bytes in the documented order', () => {
    const bytes = [0x76, 0x93, 0x88, 0xff, 0x2d, 0x00, 0x2c, 0x01, 0xd7, 0x00, 0x32, 0x00, 0x94, 0x27, 0x00, 0x00]
    const reading = decodeWeatherData(new DataView(new Uint8Array(bytes).buffer))
    expect(reading).toMatchObject({ rpm: 37750, temperature: 21.5, humidity: 50, pressure: 1013.2 })
    expect(reading.magnetometer.x).toBe(-120)
  })

  it('adds the high byte of the RPM, and handles temperatures below zero', () => {
    const reading = decodeWeatherData(packet({ rpm: 70000, temperature: -55 }))
    expect(reading.rpm).toBe(70000)
    expect(reading.temperature).toBe(-5.5)
  })

  it('refuses a short packet', () => {
    expect(() => decodeWeatherData(new DataView(new ArrayBuffer(10)))).toThrow('Expected 16 bytes')
  })
})

describe('impellerAirSpeed', () => {
  it('converts both calibrations to km/h at riding speed', () => {
    // about 40 km/h: (0.000279 * 37750 + 0.577) and (0.000755 * 14020 + 0.524) m/s
    expect(impellerAirSpeed(37750, 'optical')).toBeCloseTo(39.99, 2)
    expect(impellerAirSpeed(14020, 'hall')).toBeCloseTo(39.99, 2)
  })

  it('is zero below the cut-in', () => {
    expect(impellerAirSpeed(239, 'optical')).toBe(0)
    expect(impellerAirSpeed(240, 'optical')).toBeCloseTo(0.2379 * 3.6, 3)
    expect(impellerAirSpeed(59, 'hall')).toBe(0)
    expect(impellerAirSpeed(60, 'hall')).toBeCloseTo(0.2135 * 3.6, 3)
  })

  it('changes calibration above the knee', () => {
    expect(impellerAirSpeed(2800, 'optical')).toBeCloseTo((0.000437 * 2800 + 0.133) * 3.6, 6)
    expect(impellerAirSpeed(2801, 'optical')).toBeCloseTo((0.000279 * 2801 + 0.577) * 3.6, 6)
    expect(impellerAirSpeed(1680, 'hall')).toBeCloseTo((0.000975 * 1680 + 0.155) * 3.6, 6)
    expect(impellerAirSpeed(1681, 'hall')).toBeCloseTo((0.000755 * 1681 + 0.524) * 3.6, 6)
  })
})

describe('readingAirDensity', () => {
  const reading = { rpm: 0, magnetometer: { x: 0, y: 0, z: 0 }, temperature: 20, humidity: 50, pressure: 1013.25 }

  it('uses the pressure as measured where the meter is', () => {
    expect(readingAirDensity(reading)).toBeCloseTo(1.199, 2)
    expect(readingAirDensity({ ...reading, pressure: 900 })).toBeLessThan(airDensity({ temperature: 20, dewPoint: 9.3, stationPressure: 1000 }))
  })

  it('is undefined for models without a pressure sensor', () => {
    expect(readingAirDensity({ ...reading, pressure: 0 })).toBeUndefined()
  })
})

describe('updateRate', () => {
  it('averages over the timestamps', () => {
    expect(updateRate([1000, 1500, 2000, 2500])).toBe(2)
    expect(updateRate([1000])).toBeUndefined()
    expect(updateRate([1000, 1000])).toBeUndefined()
  })
})
