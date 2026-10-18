import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  Alert, Anchor, Card, Center, Grid, Group, Loader, SegmentedControl, Stack, Switch, Table, Text, Title
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import { hasLocation } from '../../core/activitySeries'
import { fitError, fitParameters, type FitTarget } from '../../core/fit'
import { findLoops, precisionDigits } from '../../core/loopFinder'
import type { CombinedSeries } from '../../core/ranges'
import { rangesForWindows } from '../../core/selection'
import { mToFt } from '../../core/units'
import { virtualElevation } from '../../core/virtualElevation'
import { windModelAirSpeed } from '../../core/windModel'
import { RideMap } from '../../components/RideMap'
import {
  createSegment, deleteSegment, updateSegment, useSegments, type AirspeedSource, type ManualWind, type SegmentValues
} from '../../data/segments'
import { totalMassKg, useUserPrefs, type UserPrefs } from '../../data/userPrefs'
import { csvFileName, downloadText, toCsv } from '../../lib/csv'
import { LoopSettings } from '../activity/LoopSettings'
import { DEFAULT_LOOP_PREFS, type LoopPrefs } from '../activity/loopPrefs'
import { AirspeedCard } from './AirspeedCard'
import { ParametersCard, type FitOption, type FitRequest, type FitTargetKey, type Parameters, type Suggestion } from './ParametersCard'
import { SaveCard, type SaveDetails } from './SaveCard'
import { parseAnalysisStart, parseRanges, useAnalysisSource, type AnalysisSource, type AnalysisStart } from './useAnalysisSource'
import { canModelWind, useWindModel } from './useWindModel'
import { VirtualElevationChart } from './VirtualElevationChart'

type Overlay = 'none' | 'laps' | 'loops'

const hasMeasuredAirspeed = (s: CombinedSeries) => s.airspeed.some((a, i) => Math.abs(a - s.speed[i]) > 0.01)

export function AnalysisPage () {
  const { id = '', sid } = useParams()
  const [params] = useSearchParams()
  const ranges = useMemo(() => parseRanges(params), [params])
  const result = useAnalysisSource(id, sid, ranges, params.get('name') ?? 'Selection')
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
  return <Analysis key={sid ?? params.toString()} activityId={id} source={result.source} start={sid ? {} : parseAnalysisStart(params)} />
}

/** How CdA can be fitted: closure for joined runs and loops, or the elevation profile. */
function fitTargets (series: CombinedSeries, loops: Array<{ startIndex: number, endIndex: number }>) {
  const targets: Record<FitTargetKey, FitTarget | undefined> = {
    run: series.breaks.length ? { kind: 'loops', loops: [{ start: 0, end: series.time.length - 1 }] } : undefined,
    loops: loops.length ? { kind: 'loops', loops: loops.map((l) => ({ start: l.startIndex, end: l.endIndex })) } : undefined,
    elevation: { kind: 'elevation' }
  }
  return targets
}

const BASIS: Record<FitTargetKey, string> = {
  run: 'closure of the run (it ends where it started)',
  loops: 'closure of the loops',
  elevation: 'the recorded elevation'
}

/**
 * Starting values: the saved analysis, then values passed in the URL (the tests table), then the
 * ride's settings, then the user's profile.
 */
function startingParameters (source: AnalysisSource, start: AnalysisStart, prefs: UserPrefs): Parameters {
  const { segment } = source
  const ride = source.activity?.analysisDefaults ?? {}
  return {
    mass: segment?.mass ?? start.mass ?? ride.mass ?? totalMassKg(prefs),
    rho: segment?.rho ?? start.rho ?? ride.rho ?? 1.2,
    crr: segment?.crr ?? start.crr ?? ride.crr ?? prefs.crr,
    cda: segment?.cda ?? prefs.cda,
    dloss: segment?.dloss ?? start.dloss ?? ride.dloss ?? prefs.dloss
  }
}

function Analysis ({ activityId, source, start: urlStart }: { activityId: string, source: AnalysisSource, start: AnalysisStart }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { prefs } = useUserPrefs()
  const units = prefs.units
  const { series, segment } = source
  const { segments = [] } = useSegments(activityId)
  const gps = hasLocation(series)
  const measured = hasMeasuredAirspeed(series)
  const windPossible = gps && canModelWind(series)

  const [airspeedSource, setAirspeedSource] = useState<AirspeedSource>(() => {
    const saved = segment?.airspeedSource ?? urlStart.airspeedSource
    if (saved && (saved !== 'measured' || measured) && (!['wind', 'manual'].includes(saved) || windPossible)) return saved
    return measured ? 'measured' : 'ground'
  })
  const [manualWind, setManualWind] = useState<ManualWind>(segment?.wind ?? urlStart.wind ?? { speed: 10, direction: 270 })
  const [xAxis, setXAxis] = useState<'time' | 'distance'>(series.runDistance.some((d) => d > 0) ? 'distance' : 'time')
  const [showElevation, setShowElevation] = useState(true)
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [loopPrefs, setLoopPrefs] = useState<LoopPrefs>(DEFAULT_LOOP_PREFS)
  const [hovered, setHovered] = useState<number>()

  const wind = useWindModel(series, airspeedSource === 'wind')
  const manualAirspeed = useMemo(() => (airspeedSource === 'manual' && windPossible
    ? windModelAirSpeed(series.location, series.speed, series.speed.map(() => manualWind.speed), series.speed.map(() => manualWind.direction)).map((p) => p.airspeed)
    : undefined), [airspeedSource, windPossible, series, manualWind])
  const airspeed = airspeedSource === 'measured'
    ? series.airspeed
    : airspeedSource === 'wind' && wind.data
      ? wind.data.airspeed
      : airspeedSource === 'manual' && manualAirspeed ? manualAirspeed : series.speed

  const loops = useMemo(() => (gps
    ? findLoops(series.location, precisionDigits(loopPrefs.precision), loopPrefs.minDuration, loopPrefs.maxDuration)
    : []), [gps, series, loopPrefs])
  const targets = fitTargets(series, loops)
  const defaultTarget: FitTargetKey = targets.run ? 'run' : targets.loops ? 'loops' : 'elevation'

  // new analyses open at the fitted CdA; saved ones at their saved values
  const [initial] = useState(() => {
    const start = startingParameters(source, urlStart, prefs)
    const veInput = { ...series, airspeed, elevation: series.altitude, drivetrainLoss: start.dloss }
    const fitted = fitParameters(veInput, start, targets[defaultTarget]!)
    const suggestion: Suggestion = { cda: Math.round(fitted.cda * 1000) / 1000, basis: BASIS[defaultTarget] }
    return { parameters: segment ? start : { ...start, cda: suggestion.cda }, suggestion }
  })
  const [parameters, setParameters] = useState<Parameters>(initial.parameters)
  const [details, setDetails] = useState<SaveDetails>({
    name: source.defaultName, description: segment?.description ?? '', isBaseline: segment?.isBaseline ?? false
  })
  const snapshot = () => JSON.stringify({ parameters, details, airspeedSource, manualWind: airspeedSource === 'manual' ? manualWind : null })
  const [saved, setSaved] = useState(() => (segment ? snapshot() : undefined))
  const [saving, setSaving] = useState(false)

  const veSeries = useMemo(() => ({
    ...series, airspeed, elevation: series.altitude, drivetrainLoss: parameters.dloss
  }), [series, airspeed, parameters.dloss])

  // keep the slider responsive on long ranges
  const deferred = useDeferredValue(parameters)
  const ve = useMemo(() => virtualElevation(veSeries, deferred), [veSeries, deferred])

  const lapBands = useMemo(() => rangesForWindows(series.time, source.laps), [series, source.laps])
  const bands = overlay === 'loops'
    ? loops.map((l, i) => ({ start: l.startIndex, end: l.endIndex, label: `Loop ${i + 1}` }))
    : overlay === 'laps' ? lapBands.map((l) => ({ start: l.start, end: l.end, label: `Lap ${l.window + 1}` })) : []

  const elevationError = fitError(veSeries, deferred, { kind: 'elevation' })
  const runDrift = targets.run ? fitError(veSeries, deferred, targets.run) : undefined
  const loopDrifts = loops.map((l) => (ve[l.endIndex] - ve[l.startIndex]) - (series.altitude[l.endIndex] - series.altitude[l.startIndex]))
  const height = (m: number) => (units === 'metric' ? m : mToFt(m))
  const heightUnit = units === 'metric' ? 'm' : 'ft'

  const dirty = saved !== snapshot()
  useEffect(() => {
    if (!dirty || !segment) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, segment])

  const fitOptions: FitOption[] = [
    ...(targets.run ? [{ key: 'run' as const, label: 'Close the run (out and back)' }] : []),
    { key: 'loops', label: targets.loops ? 'Close the loops' : 'Close the loops (none found)', disabled: !targets.loops },
    { key: 'elevation', label: 'Match recorded elevation' }
  ]

  const fit = ({ target, fitCrr }: FitRequest) => {
    const result = fitParameters(veSeries, parameters, targets[target]!, { fitCrr })
    setParameters((p) => ({ ...p, cda: Math.round(result.cda * 1000) / 1000, crr: fitCrr ? Math.round(result.crr * 10000) / 10000 : p.crr }))
    notifications.show({
      title: `Suggested CdA ${result.cda.toFixed(3)}${fitCrr ? `, Crr ${result.crr.toFixed(4)}` : ''}`,
      message: `${target === 'elevation' ? 'RMS difference from recorded elevation' : 'RMS closure error'}: ${height(result.error).toFixed(2)} ${heightUnit}. Check that the profile makes sense before saving.`
    })
  }

  const values = (): SegmentValues => ({
    name: details.name.trim(),
    description: details.description,
    isBaseline: details.isBaseline,
    cda: parameters.cda,
    crr: parameters.crr,
    mass: parameters.mass,
    rho: parameters.rho,
    dloss: parameters.dloss,
    airspeedSource,
    wind: airspeedSource === 'manual' ? manualWind : undefined
  })

  const save = async () => {
    setSaving(true)
    try {
      if (segment) {
        await updateSegment(segment.id, activityId, values(), source.ranges, segments)
        await queryClient.invalidateQueries({ queryKey: ['segment', segment.id] })
        setSaved(snapshot())
      } else {
        const newId = await createSegment(activityId, values(), source.ranges, segments)
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
    run_distance_km: series.runDistance,
    power_w: series.power,
    speed_kmh: series.speed,
    airspeed_kmh: airspeed,
    elevation_m: series.altitude,
    virtual_elevation_m: ve
  }))

  const start = series.location.find((p) => p)
  const joined = series.breaks.length > 0

  return (
    <Stack gap='lg' py='md'>
      <Anchor component={Link} to={`/activity/${activityId}`} size='sm'>← Activity</Anchor>
      <div>
        <Title order={1}>{details.name.trim() || 'Analysis'}</Title>
        <Text c='dimmed'>
          {series.time[0].toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} – {series.time[series.time.length - 1].toLocaleTimeString(undefined, { timeStyle: 'short' })}
          {joined ? ` · ${source.ranges.length} ranges joined; virtual elevation holds level at each join.` : ''}
          {' '}Adjust CdA until the virtual elevation follows the recorded elevation and the run returns to its starting height.
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
                    { label: 'Laps', value: 'laps', disabled: lapBands.length < 2 },
                    { label: 'Loops', value: 'loops', disabled: !gps }
                  ]} />
                {overlay === 'loops' && <LoopSettings value={loopPrefs} onChange={setLoopPrefs} />}
              </Group>
            </Group>
            <VirtualElevationChart
              time={series.time} distance={series.runDistance} elevation={series.altitude} ve={ve}
              airspeed={airspeedSource === 'ground' ? undefined : airspeed}
              units={units} xAxis={xAxis} showElevation={showElevation} bands={bands} joins={series.breaks} onHover={setHovered}
            />
            <Group gap='xl' mt='xs'>
              <Text size='sm'>Difference from recorded elevation (RMS): <b>{height(elevationError).toFixed(2)} {heightUnit}</b></Text>
              {runDrift !== undefined && (
                <Text size='sm'>Run closure error: <b>{height(runDrift).toFixed(2)} {heightUnit}</b></Text>
              )}
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
              fitOptions={fitOptions} suggestion={segment ? undefined : initial.suggestion}
              weatherContext={start ? { lat: start.lat, lng: start.lng, time: series.time[0], altitude: series.altitude[0] } : undefined} />
            <AirspeedCard source={airspeedSource} onSourceChange={setAirspeedSource} wind={manualWind} onWindChange={setManualWind}
              units={units} measuredAvailable={measured} windPossible={windPossible} model={wind} />
          </Stack>
        </Grid.Col>
      </Grid>

      <Grid gap='lg'>
        <Grid.Col span={{ base: 12, md: gps ? 6 : 12 }}>
          <SaveCard value={details} onChange={setDetails} onSave={save} onExport={exportCsv}
            onDelete={segment ? remove : undefined} saving={saving} dirty={dirty} isNew={!segment} />
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
