import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { airDensity, pressureAtAltitude, saturationVapourPressure } from '../airDensity'

describe('air density matches @mariuspopovici/rho', () => {
  const require = createRequire(import.meta.url)
  const rho = require('@mariuspopovici/rho')
  it.each([
    [20.5, 1019.3, 20.5, 0],
    [20, 1010, 20, 2000],
    [11.05, 1003, -7, 1855],
    [-5, 1030, -12, 300],
    [32, 1008, 24, 15]
  ])('%d °C, %d hPa, dew point %d °C, %d m', (temperature, pressure, dewPoint, altitude) => {
    expect(airDensity({ temperature, seaLevelPressure: pressure, dewPoint, altitude }))
      .toBeCloseTo(rho(temperature, pressure, dewPoint, 'metric', altitude), 12)
  })

  it('reproduces the package README values', () => {
    expect(airDensity({ temperature: 20.5, seaLevelPressure: 1019.3, dewPoint: 20.5 }).toFixed(4)).toBe('1.1984')
    expect(airDensity({ temperature: 20, seaLevelPressure: 1010, dewPoint: 20, altitude: 2000 }).toFixed(4)).toBe('0.9402')
  })
})

describe('air density physics', () => {
  it('drops with altitude, temperature and humidity', () => {
    const base = { temperature: 15, dewPoint: 5, seaLevelPressure: 1013.25 }
    expect(airDensity({ ...base, altitude: 1000 })).toBeLessThan(airDensity(base))
    expect(airDensity({ ...base, temperature: 30 })).toBeLessThan(airDensity(base))
    expect(airDensity({ ...base, dewPoint: 14 })).toBeLessThan(airDensity(base))
    expect(pressureAtAltitude(1013.25, 0, 15)).toBe(1013.25)
    expect(saturationVapourPressure(0)).toBeCloseTo(6.1078, 3)
  })
})

describe('air density inputs', () => {
  it('converts relative humidity to dew point', async () => {
    const { dewPointFromHumidity } = await import('../airDensity')
    expect(dewPointFromHumidity(20, 100)).toBeCloseTo(20, 6)
    expect(dewPointFromHumidity(20, 50)).toBeCloseTo(9.26, 1)
    expect(dewPointFromHumidity(30, 30)).toBeCloseTo(10.5, 0)
  })

  it('accepts station pressure without an altitude adjustment', () => {
    const station = pressureAtAltitude(1013.25, 800, 18)
    expect(airDensity({ temperature: 18, dewPoint: 8, stationPressure: station }))
      .toBeCloseTo(airDensity({ temperature: 18, dewPoint: 8, seaLevelPressure: 1013.25, altitude: 800 }), 12)
  })
})
