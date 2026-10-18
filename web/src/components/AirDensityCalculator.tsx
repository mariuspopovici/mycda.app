import { useState } from 'react'
import { Alert, Button, Group, NumberInput, SegmentedControl, SimpleGrid, Stack, Text } from '@mantine/core'
import { IconCloudSearch, IconCurrentLocation } from '@tabler/icons-react'
import { airDensity, dewPointFromHumidity } from '../core/airDensity'
import { ftToM, hpaToInHg, inHgToHpa, kgPerM3ToLbPerFt3, mToFt, toCelsius, toFahrenheit, type Units } from '../core/units'
import { fetchElevation, fetchHourlyWeather } from '../services/openMeteo'

export interface WeatherContext {
  lat: number
  lng: number
  /** Ride time; conditions are taken from the nearest hour. */
  time: Date
  /** Ride altitude in m, if the file has it. */
  altitude?: number
}

interface Conditions {
  temperature: number | string
  dewPoint: number | string
  humidity: number | string
  pressure: number | string
  altitude: number | string
}

/** Sea-level pressure is what weather services report; station pressure is what a barometer reads where you are. */
type PressureKind = 'sea' | 'station'
type Moisture = 'dewPoint' | 'humidity'

const n = (v: number | string) => (typeof v === 'number' ? v : parseFloat(v))
const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits

/**
 * Air density from temperature, moisture (dew point or relative humidity) and pressure (sea-level
 * pressure plus altitude, or station pressure), in the user's units.
 */
export function AirDensityCalculator ({ units, context, onUse }: {
  units: Units
  /** When given, conditions can be looked up for the ride's place and time. */
  context?: WeatherContext
  /** Receives rho in kg/m³. */
  onUse?: (rho: number) => void
}) {
  const metric = units === 'metric'
  const [values, setValues] = useState<Conditions>({
    temperature: metric ? 20 : 68,
    dewPoint: metric ? 10 : 50,
    humidity: 50,
    pressure: metric ? 1013.25 : 29.92,
    altitude: context?.altitude !== undefined ? round(metric ? context.altitude : mToFt(context.altitude), 0) : 0
  })
  const [lookup, setLookup] = useState<{ loading: boolean, error?: string, note?: string }>({ loading: false })
  const [pressureKind, setPressureKind] = useState<PressureKind>('sea')
  const [moisture, setMoisture] = useState<Moisture>('dewPoint')

  const temperature = metric ? n(values.temperature) : toCelsius(n(values.temperature))
  const humidity = n(values.humidity)
  const dewPoint = moisture === 'dewPoint'
    ? (metric ? n(values.dewPoint) : toCelsius(n(values.dewPoint)))
    : dewPointFromHumidity(temperature, humidity)
  const pressure = metric ? n(values.pressure) : inHgToHpa(n(values.pressure))
  const altitude = metric ? n(values.altitude) : ftToM(n(values.altitude))
  const inputs = [temperature, dewPoint, pressure, ...(pressureKind === 'sea' ? [altitude] : [])]
  const humidityValid = moisture === 'dewPoint' || (humidity > 0 && humidity <= 100)
  const valid = inputs.every(Number.isFinite) && humidityValid && dewPoint <= temperature + 0.01
  const rho = valid
    ? pressureKind === 'station'
      ? airDensity({ temperature, dewPoint, stationPressure: pressure })
      : airDensity({ temperature, dewPoint, seaLevelPressure: pressure, altitude })
    : undefined

  const fill = (c: { temperature: number, dewPoint: number, pressure: number, altitude?: number }, note: string) => {
    // weather services report dew point and sea-level pressure
    setPressureKind('sea')
    setMoisture('dewPoint')
    setValues((v) => ({
      humidity: v.humidity,
      temperature: round(metric ? c.temperature : toFahrenheit(c.temperature), 1),
      dewPoint: round(metric ? c.dewPoint : toFahrenheit(c.dewPoint), 1),
      pressure: round(metric ? c.pressure : hpaToInHg(c.pressure), 2),
      altitude: c.altitude !== undefined ? round(metric ? c.altitude : mToFt(c.altitude), 0) : v.altitude
    }))
    setLookup({ loading: false, note })
  }

  const lookUp = async (where: { lat: number, lng: number }, time: Date, altitude?: number, note = '') => {
    setLookup({ loading: true })
    try {
      const weather = await fetchHourlyWeather({ ...where, start: time, end: time })
      let i = 0
      weather.time.forEach((t, k) => { if (Math.abs(t - time.getTime()) < Math.abs(weather.time[i] - time.getTime())) i = k })
      const elevation = altitude ?? await fetchElevation(where.lat, where.lng)
      fill({ temperature: weather.temperature[i], dewPoint: weather.dewPoint[i], pressure: weather.seaLevelPressure[i], altitude: elevation },
        `${note}Weather for ${new Date(weather.time[i]).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} from Open-Meteo.`)
    } catch (e) {
      setLookup({ loading: false, error: (e as Error).message })
    }
  }

  const useMyLocation = () => {
    setLookup({ loading: true })
    navigator.geolocation.getCurrentPosition(
      (p) => lookUp({ lat: p.coords.latitude, lng: p.coords.longitude }, new Date(), undefined, 'Current conditions at your location. '),
      (e) => setLookup({ loading: false, error: `Couldn't get your location: ${e.message}` }),
      { timeout: 15_000 }
    )
  }

  const field = (key: keyof Conditions) => ({
    value: values[key],
    onChange: (v: number | string) => setValues((s) => ({ ...s, [key]: v }))
  })

  return (
    <Stack>
      <Group>
        {context && (
          <Button variant='light' leftSection={<IconCloudSearch size={18} />} loading={lookup.loading}
            onClick={() => lookUp(context, context.time, context.altitude)}>
            Look up the ride's weather
          </Button>
        )}
        {'geolocation' in navigator && (
          <Button variant='default' leftSection={<IconCurrentLocation size={18} />} loading={lookup.loading && !context} onClick={useMyLocation}>
            Use current conditions here
          </Button>
        )}
      </Group>
      {lookup.error && <Alert color='red'>{lookup.error}</Alert>}
      {lookup.note && <Text size='xs' c='dimmed'>{lookup.note}</Text>}
      <Group gap='md'>
        <SegmentedControl size='xs' value={pressureKind} onChange={(v) => setPressureKind(v as PressureKind)}
          data={[{ label: 'Sea-level pressure', value: 'sea' }, { label: 'Station pressure', value: 'station' }]} />
        <SegmentedControl size='xs' value={moisture} onChange={(v) => setMoisture(v as Moisture)}
          data={[{ label: 'Dew point', value: 'dewPoint' }, { label: 'Humidity', value: 'humidity' }]} />
      </Group>
      <Text size='xs' c='dimmed'>
        {pressureKind === 'sea'
          ? 'Weather services and apps report pressure reduced to sea level (around 1013 hPa / 29.92 inHg). It is corrected to your altitude here.'
          : 'Station pressure is the absolute pressure where you rode, as read by a barometer or a weather station at that altitude (lower at altitude, e.g. ~900 hPa at 1000 m). No altitude correction is applied.'}
      </Text>
      <SimpleGrid cols={{ base: 1, xs: 2 }}>
        <NumberInput label={`Temperature (${metric ? '°C' : '°F'})`} decimalScale={1} {...field('temperature')} />
        {moisture === 'dewPoint'
          ? <NumberInput label={`Dew point (${metric ? '°C' : '°F'})`} decimalScale={1} {...field('dewPoint')}
              error={valid || !Number.isFinite(dewPoint) ? undefined : 'Dew point can’t exceed the temperature'} />
          : <NumberInput label='Relative humidity (%)' decimalScale={0} min={1} max={100} {...field('humidity')}
              error={humidityValid ? undefined : 'Enter 1–100 %'} />}
        <NumberInput label={`${pressureKind === 'sea' ? 'Sea-level' : 'Station'} pressure (${metric ? 'hPa' : 'inHg'})`} decimalScale={2} step={metric ? 1 : 0.01} {...field('pressure')} />
        {pressureKind === 'sea' && <NumberInput label={`Altitude (${metric ? 'm' : 'ft'})`} decimalScale={0} {...field('altitude')} description='Where you rode' />}
      </SimpleGrid>
      <Group justify='space-between' align='center'>
        <div>
          <Text size='sm' c='dimmed'>Air density</Text>
          <Text size='xl' fw={700}>
            {rho === undefined ? '–' : metric ? `${rho.toFixed(4)} kg/m³` : `${kgPerM3ToLbPerFt3(rho).toFixed(5)} lb/ft³`}
          </Text>
        </div>
        {onUse && <Button disabled={rho === undefined} onClick={() => rho !== undefined && onUse(rho)}>Use this value</Button>}
      </Group>
    </Stack>
  )
}
