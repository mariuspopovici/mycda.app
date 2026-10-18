import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  Alert, Anchor, Card, Center, Grid, Group, Loader, SegmentedControl, Stack, Switch, Table, Text, Title
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import { hasLocation, type ActivitySeries } from '../../core/activitySeries'
import { fitError, fitParameters, type FitTarget } from '../../core/fit'
import { findLoops, precisionDigits } from '../../core/loopFinder'
import { rangesForWindows } from '../../core/selection'
import { mToFt } from '../../core/units'
import { virtualElevation } from '../../core/virtualElevation'
import { RideMap } from '../../components/RideMap'
import {
  createSegment, deleteSegment, updateSegment, useSegments, type SegmentValues, type StoredLap
} from '../../data/segments'
import { totalMassKg, useUserPrefs } from '../../data/userPrefs'
import { csvFileName, downloadText, toCsv } from '../../lib/csv'
import { LoopSettings } from '../activity/LoopSettings'
import { DEFAULT_LOOP_PREFS, type LoopPrefs } from '../activity/loopPrefs'
import { ParametersCard, type FitRequest, type Parameters } from './ParametersCard'
import { SaveCard, type SaveDetails } from './SaveCard'
import { useAnalysisSource, type AnalysisSource } from './useAnalysisSource'
import { VirtualElevationChart } from './VirtualElevationChart'
import { canModelWind, useWindModel } from './useWindModel'

/** Firestore documents are capped at 1 MiB; segments copy every series, so long ranges don't fit. */
const MAX_SEGMENT_POINTS = 7000

type AirspeedSource = 'measured' | 'ground' | 'wind'
type Overlay = 'none' | 'laps' | 'loops'

const hasMeasuredAirspeed = (s: ActivitySeries) => s.airspeed.some((a, i) => Math.abs(a - s.speed[i]) > 0.01)

export function AnalysisPage () {
  const { id = '', sid } = useParams()
  const [params] = useSearchParams()
  const from = Number(params.get('from'))
  const to = Number(params.get('to'))
  const result = useAnalysisSource(id, sid, from, to, params.get('name') ?? 'Selection')
  // starting values come from the user's preferences, so wait for them
  const { isLoading: prefsLoading } = useUserPrefs()

  if ('error' in result && result.error) {
    return (
      <Stack py='md'>
        <Alert color='red' title="Couldn't open this analysis">{(result.error as Error).message}</Alert>
        <Anchor component={Link} to={`/activity/${id}`}>Back to the activity</Anchor>
      </Stack>
    )
  }
  if (prefsLoading || !('source' in result) || !result.source) return <Center py={80}><Loader /></Center>
  // remount when switching between analyses so state starts fresh
  return <Analysis key={sid ?? `${from}-${to}`} activityId={id} source={result.source} />
}

function Analysis ({ activityId, source }: { activityId: string, source: AnalysisSource }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { prefs } = useUserPrefs()
  const units = prefs.units
  const { series, segment } = source
  const { segments = [] } = useSegments(activityId)

  const [parameters, setParameters] = useState<Parameters>(() => ({
    mass: segment?.mass ?? totalMassKg(prefs),
    rho: segment?.rho ?? 1.2,
    crr: segment?.crr ?? prefs.crr,
    cda: segment?.cda ?? prefs.cda,
    dloss: prefs.dloss
  }))
  const [details, setDetails] = useState<SaveDetails>({
    name: source.defaultName, description: segment?.description ?? '', isBaseline: segment?.isBaseline ?? false
  })
  const [saved, setSaved] = useState(() => segment ? JSON.stringify({ parameters, details }) : undefined)
  const [saving, setSaving] = useState(false)

  const measured = hasMeasuredAirspeed(series)
  const gps = hasLocation(series)
  const windPossible = gps && canModelWind(series)
  const [airspeedSource, setAirspeedSource] = useState<AirspeedSource>(measured ? 'measured' : 'ground')
  const [xAxis, setXAxis] = useState<'time' | 'distance'>(series.distance.some((d) => d > 0) ? 'distance' : 'time')
  const [showElevation, setShowElevation] = useState(true)
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [loopPrefs, setLoopPrefs] = useState<LoopPrefs>(DEFAULT_LOOP_PREFS)
  const [hovered, setHovered] = useState<number>()

  const wind = useWindModel(series, airspeedSource === 'wind')
  const airspeed = airspeedSource === 'measured'
    ? series.airspeed
    : airspeedSource === 'wind' && wind.data ? wind.data.airspeed : series.speed

  const veSeries = useMemo(() => ({
    power: series.power, speed: series.speed, airspeed, elevation: series.altitude, time: series.time, drivetrainLoss: parameters.dloss
  }), [series, airspeed, parameters.dloss])

  // keep the slider responsive on long ranges
  const deferred = useDeferredValue(parameters)
  const ve = useMemo(() => virtualElevation(veSeries, deferred), [veSeries, deferred])

  const loops = useMemo(() => (gps
    ? findLoops(series.location, precisionDigits(loopPrefs.precision), loopPrefs.minDuration, loopPrefs.maxDuration)
    : []), [gps, series, loopPrefs])
  const laps = useMemo(() => rangesForWindows(series.time, source.laps.map((lap: StoredLap) => ({
    start: new Date(lap.start_time),
    end: new Date(new Date(lap.start_time).getTime() + (Number(lap.total_elapsed_time) || 0) * 1000)
  }))), [series, source.laps])

  const bands = overlay === 'loops'
    ? loops.map((l, i) => ({ start: l.startIndex, end: l.endIndex, label: `Loop ${i + 1}` }))
    : overlay === 'laps' ? laps.map((l) => ({ start: l.start, end: l.end, label: `Lap ${l.window + 1}` })) : []

  const loopTarget: FitTarget = { kind: 'loops', loops: loops.map((l) => ({ start: l.startIndex, end: l.endIndex })) }
  const elevationError = fitError(veSeries, deferred, { kind: 'elevation' })
  const loopDrifts = loops.map((l) => (ve[l.endIndex] - ve[l.startIndex]) - (series.altitude[l.endIndex] - series.altitude[l.startIndex]))
  const height = (m: number) => (units === 'metric' ? m : mToFt(m))
  const heightUnit = units === 'metric' ? 'm' : 'ft'

  const dirty = saved !== JSON.stringify({ parameters, details })
  useEffect(() => {
    if (!dirty || !segment) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, segment])

  const fit = ({ target, fitCrr }: FitRequest) => {
    const result = fitParameters(veSeries, parameters, target === 'loops' ? loopTarget : { kind: 'elevation' }, { fitCrr })
    setParameters((p) => ({ ...p, cda: Math.round(result.cda * 1000) / 1000, crr: fitCrr ? Math.round(result.crr * 10000) / 10000 : p.crr }))
    notifications.show({
      title: `Suggested CdA ${result.cda.toFixed(3)}${fitCrr ? `, Crr ${result.crr.toFixed(4)}` : ''}`,
      message: `${target === 'loops' ? 'RMS loop drift' : 'RMS difference from recorded elevation'}: ${height(result.error).toFixed(2)} ${heightUnit}. Check that the profile makes sense before saving.`
    })
  }

  const values = (): SegmentValues => ({ ...details, name: details.name.trim(), cda: parameters.cda, crr: parameters.crr, mass: parameters.mass, rho: parameters.rho, ve })

  const save = async () => {
    setSaving(true)
    try {
      if (segment) {
        await updateSegment(segment.id, activityId, values(), units, segments)
        await queryClient.invalidateQueries({ queryKey: ['segment', segment.id] })
        setSaved(JSON.stringify({ parameters, details }))
      } else {
        const newId = await createSegment(activityId, values(), units, series, source.laps, segments)
        navigate(`/activity/${activityId}/analysis/${newId}`, { replace: true })
      }
      notifications.show({ color: 'green', message: 'Analysis saved.' })
    } catch (e) {
      notifications.show({ color: 'red', title: "Couldn't save the analysis", message: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const remove = () => segment && modals.openConfirmModal({
    title: 'Delete analysis',
    children: <Text size='sm'>Delete “{segment.name}”? This can't be undone.</Text>,
    labels: { confirm: 'Delete', cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm: async () => {
      await deleteSegment(segment.id)
      navigate(`/activity/${activityId}`, { replace: true })
    }
  })

  const exportCsv = () => downloadText(csvFileName(details.name), toCsv({
    time: series.time,
    distance_km: series.distance,
    power_w: series.power,
    speed_kmh: series.speed,
    airspeed_kmh: airspeed,
    elevation_m: series.altitude,
    virtual_elevation_m: ve
  }))

  const start = series.location.find((p) => p)

  return (
    <Stack gap='lg' py='md'>
      <Anchor component={Link} to={`/activity/${activityId}`} size='sm'>← Activity</Anchor>
      <div>
        <Title order={1}>{details.name.trim() || 'Analysis'}</Title>
        <Text c='dimmed'>
          {series.time[0].toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} – {series.time[series.time.length - 1].toLocaleTimeString(undefined, { timeStyle: 'short' })}
          {' · '}Adjust CdA until the virtual elevation follows the recorded elevation and each loop returns to its starting height.
        </Text>
      </div>

      <Grid gap='lg'>
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card withBorder padding='lg'>
            <Group justify='space-between' gap='sm' mb='xs'>
              <SegmentedControl size='xs' value={xAxis} onChange={(v) => setXAxis(v as 'time' | 'distance')}
                data={[{ label: 'Distance', value: 'distance' }, { label: 'Time', value: 'time' }]} />
              <Group gap='md'>
                <Switch size='sm' label='Recorded elevation' checked={showElevation} onChange={(e) => setShowElevation(e.currentTarget.checked)} />
                <SegmentedControl size='xs' value={overlay} onChange={(v) => setOverlay(v as Overlay)}
                  data={[
                    { label: 'No overlay', value: 'none' },
                    { label: 'Laps', value: 'laps', disabled: laps.length < 2 },
                    { label: 'Loops', value: 'loops', disabled: !gps }
                  ]} />
                {overlay === 'loops' && <LoopSettings value={loopPrefs} onChange={setLoopPrefs} />}
              </Group>
            </Group>
            <VirtualElevationChart
              time={series.time} distance={series.distance} elevation={series.altitude} ve={ve}
              airspeed={airspeedSource === 'ground' ? undefined : airspeed}
              units={units} xAxis={xAxis} showElevation={showElevation} bands={bands} onHover={setHovered}
            />
            <Group gap='xl' mt='xs'>
              <Text size='sm'>Difference from recorded elevation (RMS): <b>{height(elevationError).toFixed(2)} {heightUnit}</b></Text>
              {overlay === 'loops' && (
                <Text size='sm'>
                  {loops.length
                    ? <>Loop drift (RMS): <b>{height(Math.sqrt(loopDrifts.reduce((s, d) => s + d * d, 0) / loopDrifts.length)).toFixed(2)} {heightUnit}</b></>
                    : 'No loops found in this range. Try other loop settings.'}
                </Text>
              )}
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack>
            <ParametersCard value={parameters} units={units} onChange={setParameters} onFit={fit}
              canFitLoops={loops.length > 0}
              weatherContext={start ? { lat: start.lat, lng: start.lng, time: series.time[0], altitude: series.altitude[0] } : undefined} />
            <Card withBorder padding='lg'>
              <Text size='sm' fw={500} mb={6}>Air speed</Text>
              <SegmentedControl fullWidth size='xs' value={airspeedSource} onChange={(v) => setAirspeedSource(v as AirspeedSource)}
                data={[
                  { label: 'Measured', value: 'measured', disabled: !measured },
                  { label: 'Still air', value: 'ground' },
                  { label: 'Wind model', value: 'wind', disabled: !windPossible }
                ]} />
              <Text size='xs' c='dimmed' mt={6}>
                {airspeedSource === 'measured' && 'Using the air speed recorded in the file.'}
                {airspeedSource === 'ground' && 'Air speed equals ground speed: best on windless days.'}
                {airspeedSource === 'wind' && (wind.isLoading
                  ? 'Fetching hourly wind from Open-Meteo…'
                  : wind.error
                    ? `Couldn't get the wind: ${(wind.error as Error).message}`
                    : wind.data && `Wind ${wind.data.meanWindSpeed.toFixed(1)} km/h from ${Math.round(wind.data.windDirection)}° (Open-Meteo ${wind.data.source === 'archive' ? 'reanalysis' : 'forecast models'}, 10 m). Treat results as indicative.`)}
                {!windPossible && airspeedSource !== 'wind' && ' The wind model needs a GPS track.'}
              </Text>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      <Grid gap='lg'>
        <Grid.Col span={{ base: 12, md: gps ? 6 : 12 }}>
          <SaveCard value={details} onChange={setDetails} onSave={save} onExport={exportCsv}
            onDelete={segment ? remove : undefined} saving={saving} dirty={dirty} isNew={!segment}
            blocked={!segment && series.time.length > MAX_SEGMENT_POINTS
              ? `This range is too long to save (${series.time.length} points, limit ${MAX_SEGMENT_POINTS}). Analyze a shorter range, such as a lap or a set of loops.`
              : undefined} />
        </Grid.Col>
        {gps && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder padding={0} style={{ overflow: 'hidden' }}>
              <RideMap track={series.location} marker={hovered} height={360} />
            </Card>
          </Grid.Col>
        )}
      </Grid>

      {overlay === 'loops' && loops.length > 0 && (
        <Card withBorder padding='lg'>
          <Title order={3} mb='sm'>Loops</Title>
          <Table fz='sm' maw={480}>
            <Table.Thead><Table.Tr><Table.Th>Loop</Table.Th><Table.Th ta='right'>Points</Table.Th><Table.Th ta='right'>VE drift ({heightUnit})</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {loops.map((l, i) => (
                <Table.Tr key={l.startIndex}>
                  <Table.Td>{i + 1}</Table.Td>
                  <Table.Td ta='right'>{l.distance}</Table.Td>
                  <Table.Td ta='right'>{height(loopDrifts[i]).toFixed(2)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  )
}
