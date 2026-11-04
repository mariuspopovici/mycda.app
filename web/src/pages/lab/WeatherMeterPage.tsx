import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Group, SegmentedControl, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { IconBluetooth, IconDownload, IconPlayerRecord, IconPlayerStop } from '@tabler/icons-react'
import { impellerAirSpeed, readingAirDensity, updateRate, type ImpellerSensor, type WeatherMeterReading } from '../../core/weatherMeter'
import { downloadText, toCsv } from '../../lib/csv'
import { usePageMeta } from '../../lib/pageMeta'
import { connectWeatherMeter, webBluetooth, type WeatherMeterConnection } from '../../services/weatherMeterBle'

interface Row {
  time: Date
  reading: WeatherMeterReading
}

/** Readings to average the update rate over. */
const RATE_WINDOW = 20

function Stat ({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <Text size='xs' c='dimmed' tt='uppercase' fw={600}>{label}</Text>
      <Text fw={600} size='xl' aria-label={label}>{value}</Text>
    </div>
  )
}

const fixed = (value: number | undefined, digits: number, unit: string) => (value === undefined ? '–' : `${value.toFixed(digits)} ${unit}`)

/**
 * Unlisted test page for the WEATHERmeter wind sensor: shows its live readings and records them to
 * CSV for comparing measured air speed with a ride (docs/plans/realtime-cda.md).
 */
export function WeatherMeterPage () {
  usePageMeta({ title: 'WEATHERmeter bench', noindex: true })
  const [sensor, setSensor] = useState<ImpellerSensor>('optical')
  const [connection, setConnection] = useState<WeatherMeterConnection>()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string>()
  const [reading, setReading] = useState<WeatherMeterReading>()
  const [rate, setRate] = useState<number>()
  const [recording, setRecording] = useState(false)
  const [recorded, setRecorded] = useState(0)
  const timestamps = useRef<number[]>([])
  const rows = useRef<Row[]>([])
  const isRecording = useRef(false)
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  const active = useRef<WeatherMeterConnection | undefined>(undefined)

  useEffect(() => () => {
    active.current?.disconnect()
    void wakeLock.current?.release()
  }, [])

  const onReading = (next: WeatherMeterReading) => {
    const now = Date.now()
    timestamps.current = [...timestamps.current, now].slice(-RATE_WINDOW)
    setRate(updateRate(timestamps.current))
    setReading(next)
    if (isRecording.current) {
      rows.current.push({ time: new Date(now), reading: next })
      setRecorded(rows.current.length)
    }
  }

  const connect = async () => {
    setError(undefined)
    setConnecting(true)
    try {
      const opened = await connectWeatherMeter(onReading, () => {
        active.current = undefined
        setConnection(undefined)
      })
      active.current = opened
      setConnection(opened)
    } catch (e) {
      // closing the browser's chooser isn't a problem to report
      if ((e as Error).name !== 'NotFoundError') setError((e as Error).message)
    } finally {
      setConnecting(false)
    }
  }

  const startRecording = async () => {
    rows.current = []
    setRecorded(0)
    isRecording.current = true
    setRecording(true)
    // a phone that sleeps stops receiving notifications
    try {
      wakeLock.current = await navigator.wakeLock?.request('screen') ?? null
    } catch {
      wakeLock.current = null
    }
  }

  const stopRecording = () => {
    isRecording.current = false
    setRecording(false)
    void wakeLock.current?.release()
    wakeLock.current = null
  }

  const download = () => {
    const data = rows.current
    downloadText(`weathermeter-${data[0].time.toISOString().replace(/[:.]/g, '-')}.csv`, toCsv({
      time: data.map((r) => r.time),
      rpm: data.map((r) => r.reading.rpm),
      airspeed: data.map((r) => impellerAirSpeed(r.reading.rpm, sensor)),
      temperature_c: data.map((r) => r.reading.temperature),
      humidity_pct: data.map((r) => r.reading.humidity),
      pressure_hpa: data.map((r) => r.reading.pressure),
      air_density: data.map((r) => readingAirDensity(r.reading))
    }))
  }

  const supported = webBluetooth() !== undefined
  return (
    <Stack gap='md' py='md' maw={720}>
      <div>
        <Title order={1}>WEATHERmeter bench</Title>
        <Text c='dimmed'>Test page: connect a WEATHERmeter, watch its readings, and record them to a CSV file.</Text>
      </div>
      {!supported && (
        <Alert color='orange' title='Web Bluetooth is not available here'>
          Open this page in Chrome on a computer or an Android phone, over HTTPS or on localhost. Safari on iPhone doesn't support it.
        </Alert>
      )}
      {error && <Alert color='red' title="Couldn't connect">{error}</Alert>}

      <Card withBorder padding='lg'>
        <Stack gap='sm'>
          <Group justify='space-between'>
            {connection
              ? <Text>Connected to <b>{connection.name}</b></Text>
              : <Text c='dimmed'>Not connected</Text>}
            {connection
              ? <Button variant='default' onClick={() => connection.disconnect()}>Disconnect</Button>
              : <Button leftSection={<IconBluetooth size={18} />} onClick={connect} loading={connecting} disabled={!supported}>Connect</Button>}
          </Group>
          <div>
            <Text size='sm' fw={500} mb={4}>Impeller sensor</Text>
            <SegmentedControl size='xs' value={sensor} onChange={(v) => setSensor(v as ImpellerSensor)}
              data={[{ label: 'Optical', value: 'optical' }, { label: 'Hall effect', value: 'hall' }]} />
            <Text size='xs' c='dimmed' mt={4}>Optical models: WFPSM-02C, WFPSM-02d, WFPSM-02e, WFANO-02E. All others are hall effect. It sets the calibration.</Text>
          </div>
        </Stack>
      </Card>

      <Card withBorder padding='lg'>
        <SimpleGrid cols={{ base: 2, sm: 3 }}>
          <Stat label='Air speed' value={fixed(reading && impellerAirSpeed(reading.rpm, sensor), 1, 'km/h')} />
          <Stat label='Impeller' value={fixed(reading?.rpm, 0, 'rpm')} />
          <Stat label='Update rate' value={fixed(rate, 1, 'Hz')} />
          <Stat label='Temperature' value={fixed(reading?.temperature, 1, '°C')} />
          <Stat label='Humidity' value={fixed(reading?.humidity, 0, '%')} />
          <Stat label='Pressure' value={fixed(reading?.pressure, 1, 'hPa')} />
          <Stat label='Air density' value={fixed(reading && readingAirDensity(reading), 4, 'kg/m³')} />
        </SimpleGrid>
      </Card>

      <Card withBorder padding='lg'>
        <Group justify='space-between'>
          <Text>{recording ? `Recording: ${recorded} readings` : recorded ? `Recorded ${recorded} readings` : 'Record readings to compare with a ride.'}</Text>
          <Group gap='xs'>
            {recording
              ? <Button color='red' variant='light' leftSection={<IconPlayerStop size={18} />} onClick={stopRecording}>Stop</Button>
              : <Button variant='light' leftSection={<IconPlayerRecord size={18} />} onClick={startRecording} disabled={!connection}>Record</Button>}
            <Button variant='default' leftSection={<IconDownload size={18} />} onClick={download} disabled={recording || recorded === 0}>Download CSV</Button>
          </Group>
        </Group>
      </Card>
    </Stack>
  )
}
