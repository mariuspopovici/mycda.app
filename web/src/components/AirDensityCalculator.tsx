import { useState } from 'react'
import { Alert, Button, Group, NumberInput, SimpleGrid, Stack, Text } from '@mantine/core'
import { IconCloudSearch, IconCurrentLocation } from '@tabler/icons-react'
import { airDensity } from '../core/airDensity'
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
  pressure: number | string
  altitude: number | string
}

const n = (v: number | string) => (typeof v === 'number' ? v : parseFloat(v))
const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits

/** Air density from temperature, dew point, sea-level pressure and altitude, in the user's units. */
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
    pressure: metric ? 1013.25 : 29.92,
    altitude: context?.altitude !== undefined ? round(metric ? context.altitude : mToFt(context.altitude), 0) : 0
  })
  const [lookup, setLookup] = useState<{ loading: boolean, error?: string, note?: string }>({ loading: false })

  const parsed = {
    temperature: metric ? n(values.temperature) : toCelsius(n(values.temperature)),
    dewPoint: metric ? n(values.dewPoint) : toCelsius(n(values.dewPoint)),
    seaLevelPressure: metric ? n(values.pressure) : inHgToHpa(n(values.pressure)),
    altitude: metric ? n(values.altitude) : ftToM(n(values.altitude))
  }
  const valid = Object.values(parsed).every(Number.isFinite) && parsed.dewPoint <= parsed.temperature + 0.01
  const rho = valid ? airDensity(parsed) : undefined

  const fill = (c: { temperature: number, dewPoint: number, pressure: number, altitude?: number }, note: string) => {
    setValues((v) => ({
      temperature: round(metric ? c.temperature : toFahrenheit(c.temperature), 1),
      dewPoint: round(metric ? c.dewPoint : toFahrenheit(c.dewPoint), 1),
      pressure: round(metric ? c.pressure : hpaToInHg(c.pressure), metric ? 1 : 2),
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
      <SimpleGrid cols={{ base: 1, xs: 2 }}>
        <NumberInput label={`Temperature (${metric ? '°C' : '°F'})`} decimalScale={1} {...field('temperature')} />
        <NumberInput label={`Dew point (${metric ? '°C' : '°F'})`} decimalScale={1} {...field('dewPoint')}
          error={valid || !Number.isFinite(parsed.dewPoint) ? undefined : 'Dew point can’t exceed the temperature'} />
        <NumberInput label={`Sea-level pressure (${metric ? 'hPa' : 'inHg'})`} decimalScale={2} step={metric ? 1 : 0.01} {...field('pressure')}
          description='As reported by weather services' />
        <NumberInput label={`Altitude (${metric ? 'm' : 'ft'})`} decimalScale={0} {...field('altitude')} description='Where you rode' />
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
