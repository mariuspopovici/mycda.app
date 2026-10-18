import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ActionIcon, Anchor, Badge, Button, Card, Grid, Group, Modal, MultiSelect, SimpleGrid, Table, Text, Title, Tooltip
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCalculator, IconFocus2, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react'
import { AirDensityCalculator, type WeatherContext } from '../../components/AirDensityCalculator'
import { DraftNumberInput } from '../../components/DraftNumberInput'
import type { ActivitySeries } from '../../core/activitySeries'
import { summarizeCdA } from '../../core/segmentStats'
import { detectTests, evaluateTest, lapGeometries, type SharedParameters, type TestResult } from '../../core/testRuns'
import { kgPerM3ToLbPerFt3, kgToLbs, lbPerFt3ToKgPerM3, lbsToKg, secondsToHms } from '../../core/units'
import { DEFAULT_WIND_EXPOSURE, type Activity } from '../../data/activities'
import type { ActivityData } from '../../data/activityData'
import { createSegment, type AirspeedSource, type ManualWind, type SegmentSummary, type TimeRange } from '../../data/segments'
import { totalMassKg, type UserPrefs } from '../../data/userPrefs'
import { formatDistance, formatPower, formatSpeed } from '../../lib/format'
import { AirspeedCard } from '../analysis/AirspeedCard'
import { analysisUrl } from '../analysis/useAnalysisSource'
import { canModelWind, useAirspeed } from '../analysis/useWindModel'

interface Props {
  activity: Activity
  data: ActivityData
  prefs: UserPrefs
  segments: SegmentSummary[]
  /** Shows the test's laps on the chart. */
  onShow: (laps: number[]) => void
}

const lapsLabel = (laps: number[]) => (laps.length === 1 ? `lap ${laps[0]}` : `laps ${laps.join(' + ')}`)
const sameRanges = (a: TimeRange[], b: TimeRange[]) => a.length === b.length &&
  a.every((r, i) => r.start.getTime() === b[i].start.getTime() && r.end.getTime() === b[i].end.getTime())
const hasMeasuredAirspeed = (s: ActivitySeries) => s.airspeed.some((a, i) => Math.abs(a - s.speed[i]) > 0.01)

/**
 * Every test of the ride on one screen. Out and back legs are paired automatically (editable); each
 * test is fitted by closure with shared parameters, and can be saved or opened as an analysis.
 */
export function TestsCard ({ activity, data, prefs, segments, onShow }: Props) {
  const navigate = useNavigate()
  const { series, lapOfPoint } = data
  const units = prefs.units
  const metric = units === 'metric'
  const lapNumbers = useMemo(() => data.laps.map((l) => l.number), [data.laps])
  const geometries = useMemo(() => lapGeometries(series, lapOfPoint, lapNumbers), [series, lapOfPoint, lapNumbers])
  const [tests, setTests] = useState<number[][]>(() => detectTests(geometries))

  const ride = activity.analysisDefaults ?? {}
  const [shared, setShared] = useState<SharedParameters>(() => ({
    mass: ride.mass ?? totalMassKg(prefs), rho: ride.rho ?? 1.2, crr: ride.crr ?? prefs.crr, dloss: ride.dloss ?? prefs.dloss
  }))
  const set = (patch: Partial<SharedParameters>) => setShared((p) => ({ ...p, ...patch }))

  const measured = hasMeasuredAirspeed(series)
  const windPossible = canModelWind(series)
  const [airspeedSource, setAirspeedSource] = useState<AirspeedSource>(measured ? 'measured' : 'ground')
  const [manualWind, setManualWind] = useState<ManualWind>({ speed: 10, direction: 270 })
  // follows the ride settings as they're saved (ADR-0014)
  const exposure = activity.analysisDefaults?.windExposure ?? DEFAULT_WIND_EXPOSURE
  const { airspeed, model: wind } = useAirspeed(series, airspeedSource, manualWind, exposure, windPossible)

  const rows = useMemo(() => tests.map((laps) => {
    const parts = laps.flatMap((n) => geometries.filter((g) => g.number === n))
    const ranges = parts.map((g) => g.range)
    const timeRanges = ranges.map((r) => ({ start: series.time[r.start], end: series.time[r.end] }))
    const result: TestResult | undefined = airspeed && ranges.length ? evaluateTest({ ...series, airspeed }, ranges, shared) : undefined
    const saved = segments.find((s) => sameRanges(s.ranges, timeRanges))
    return { laps, timeRanges, result, saved }
  }), [tests, geometries, series, airspeed, shared, segments])

  const fitted = rows.flatMap((r) => (r.result ? [r.result.cda] : []))
  const summary = fitted.length > 1 ? summarizeCdA(fitted) : undefined
  const unsaved = rows.filter((r) => r.result && !r.saved)
  const [saving, setSaving] = useState(false)

  const nameOf = (index: number) => `Test ${index + 1} (${lapsLabel(rows[index].laps)})`
  const values = (result: TestResult, index: number) => ({
    name: nameOf(index),
    description: '',
    isBaseline: false,
    cda: Math.round(result.cda * 1000) / 1000,
    crr: shared.crr,
    mass: shared.mass,
    rho: shared.rho,
    dloss: shared.dloss,
    airspeedSource,
    wind: airspeedSource === 'manual' ? manualWind : undefined,
    windExposure: exposure
  })

  const saveAll = async () => {
    setSaving(true)
    try {
      for (const row of unsaved) await createSegment(activity.id, values(row.result!, rows.indexOf(row)), row.timeRanges, segments)
      notifications.show({ color: 'green', message: `Saved ${unsaved.length} ${unsaved.length === 1 ? 'test' : 'tests'}.` })
    } catch (e) {
      notifications.show({ color: 'red', title: "Couldn't save the tests", message: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const open = (index: number) => {
    const row = rows[index]
    if (row.saved) {
      navigate(`/activity/${activity.id}/analysis/${row.saved.id}`)
      return
    }
    navigate(analysisUrl(activity.id, row.timeRanges, nameOf(index), {
      ...shared, airspeedSource, wind: airspeedSource === 'manual' ? manualWind : undefined
    }))
  }

  const setLaps = (index: number, laps: number[]) =>
    setTests((all) => all.map((t, i) => (i === index ? [...new Set(laps)].sort((a, b) => a - b) : t)))
  const lapOptions = data.laps.map((l) => ({ value: String(l.number), label: `Lap ${l.number} · ${formatDistance(l.distance, units)}` }))
  const height = (m: number) => (metric ? m : m * 3.281)

  // the calculator looks up the weather where and when the first test starts, else at the ride's start
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const firstStart = rows.find((r) => r.timeRanges.length)?.timeRanges[0].start
  const startIndex = firstStart ? Math.max(series.time.findIndex((t) => t.getTime() >= firstStart.getTime()), 0) : 0
  const startFix = series.location.slice(startIndex).find((p) => p)
  const weatherContext: WeatherContext | undefined = startFix
    ? { lat: startFix.lat, lng: startFix.lng, time: series.time[startIndex], altitude: series.altitude[startIndex] }
    : undefined

  return (
    <Card withBorder padding='lg'>
      <Group justify='space-between' align='flex-start' mb={4} gap='xs'>
        <Title order={3}>Tests</Title>
        <Group gap='xs'>
          <Button size='xs' variant='default' leftSection={<IconRefresh size={14} />} onClick={() => setTests(detectTests(geometries))}>Find again</Button>
          <Button size='xs' variant='default' leftSection={<IconPlus size={14} />} onClick={() => setTests((t) => [...t, []])}>Add test</Button>
        </Group>
      </Group>
      <Text size='sm' c='dimmed' mb='md'>
        Out and back legs are paired from the laps (pick other laps to change a test). Each test's CdA is fitted so the run
        ends at the height it started, with the parameters below. Starting values come from the ride settings.
      </Text>

      <Grid gap='md' mb='md'>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            <DraftNumberInput size='xs' label={`Mass (${metric ? 'kg' : 'lbs'})`} decimalScale={1} step={0.5}
              min={metric ? 30 : 66} max={metric ? 300 : 660}
              value={Math.round((metric ? shared.mass : kgToLbs(shared.mass)) * 10) / 10}
              onCommit={(n) => set({ mass: metric ? n : lbsToKg(n) })} />
            <DraftNumberInput size='xs' label={`ρ (${metric ? 'kg/m³' : 'lb/ft³'})`} decimalScale={metric ? 4 : 5} step={metric ? 0.001 : 0.0001}
              min={metric ? 0.5 : 0.03} max={metric ? 1.5 : 0.095}
              value={metric ? Math.round(shared.rho * 1e4) / 1e4 : Math.round(kgPerM3ToLbPerFt3(shared.rho) * 1e5) / 1e5}
              onCommit={(n) => set({ rho: metric ? n : lbPerFt3ToKgPerM3(n) })}
              rightSection={(
                <Tooltip label='Air density calculator'>
                  <ActionIcon size='sm' variant='subtle' onClick={() => setCalculatorOpen(true)} aria-label='Open the air density calculator'>
                    <IconCalculator size={16} />
                  </ActionIcon>
                </Tooltip>
              )} />
            <DraftNumberInput size='xs' label='Crr' decimalScale={4} step={0.0005} min={0} max={0.05}
              value={shared.crr} onCommit={(crr) => set({ crr })} />
            <DraftNumberInput size='xs' label='Drivetrain loss (%)' decimalScale={1} step={0.5} min={0} max={10}
              value={shared.dloss} onCommit={(dloss) => set({ dloss })} />
          </SimpleGrid>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <AirspeedCard source={airspeedSource} onSourceChange={setAirspeedSource} wind={manualWind} onWindChange={setManualWind}
            units={units} measuredAvailable={measured} windPossible={windPossible} model={wind} exposure={exposure}
            exposureNote='Set the exposure in the ride settings below.' />
        </Grid.Col>
      </Grid>

      {rows.length === 0
        ? <Text size='sm' c='dimmed'>No out and back tests or closed laps found. Add a test and pick its laps.</Text>
        : (
          <Table.ScrollContainer minWidth={860}>
            <Table highlightOnHover verticalSpacing={6} fz='sm'>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Test</Table.Th>
                  <Table.Th miw={180}>Laps</Table.Th>
                  <Table.Th ta='right'>Time</Table.Th>
                  <Table.Th ta='right'>Distance</Table.Th>
                  <Table.Th ta='right'>Avg. speed</Table.Th>
                  <Table.Th ta='right'>Avg. power</Table.Th>
                  <Table.Th ta='right'>CdA</Table.Th>
                  <Table.Th ta='right'>Closure</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <Anchor component='button' onClick={() => open(i)} disabled={!row.result} fz='sm'>Test {i + 1}</Anchor>
                      {row.saved && (
                        <Tooltip label={`Saved as “${row.saved.name}”, CdA ${row.saved.cda.toFixed(3)}`}>
                          <Badge size='xs' variant='light' ml={6}>Saved</Badge>
                        </Tooltip>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <MultiSelect size='xs' data={lapOptions} value={row.laps.map(String)} placeholder='Pick laps'
                        aria-label={`Laps of test ${i + 1}`} onChange={(v) => setLaps(i, v.map(Number))} />
                    </Table.Td>
                    <Table.Td ta='right'>{row.result ? secondsToHms(row.result.stats.duration) : '–'}</Table.Td>
                    <Table.Td ta='right'>{row.result ? formatDistance(row.result.stats.distance, units) : '–'}</Table.Td>
                    <Table.Td ta='right'>{row.result ? formatSpeed(row.result.stats.averageSpeed, units) : '–'}</Table.Td>
                    <Table.Td ta='right'>{row.result ? formatPower(row.result.stats.averagePower) : '–'}</Table.Td>
                    <Table.Td ta='right' fw={600}>{row.result ? row.result.cda.toFixed(3) : '–'}</Table.Td>
                    <Table.Td ta='right'>{row.result ? `${height(row.result.closureError).toFixed(2)} ${metric ? 'm' : 'ft'}` : '–'}</Table.Td>
                    <Table.Td>
                      <Group gap={4} justify='flex-end' wrap='nowrap'>
                        <Tooltip label='Show on chart'>
                          <ActionIcon variant='subtle' color='gray' disabled={!row.laps.length} aria-label={`Show test ${i + 1} on the chart`}
                            onClick={() => { onShow(row.laps); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                            <IconFocus2 size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label='Remove from the list'>
                          <ActionIcon variant='subtle' color='gray' aria-label={`Remove test ${i + 1}`}
                            onClick={() => setTests((all) => all.filter((_, k) => k !== i))}>
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          )}

      <Group justify='space-between' mt='sm' gap='xs'>
        <Text size='sm'>
          {airspeedSource === 'wind' && !airspeed
            ? wind.isLoading ? 'Fetching the wind…' : "Couldn't get the wind."
            : summary
              ? <>CdA mean <b>{summary.mean.toFixed(3)}</b> · SD <b>{summary.standardDeviation.toFixed(3)}</b> · CV <b>{summary.coefficientOfVariation.toFixed(1)} %</b></>
              : null}
        </Text>
        <Group gap='xs'>
          {rows.some((r) => r.saved) && <Text size='xs' c='dimmed'>Saved tests keep their saved values; open one to change it.</Text>}
          <Button size='sm' onClick={saveAll} loading={saving} disabled={unsaved.length === 0}>
            {unsaved.length ? `Save ${unsaved.length} ${unsaved.length === 1 ? 'test' : 'tests'}` : 'All tests saved'}
          </Button>
        </Group>
      </Group>

      <Modal opened={calculatorOpen} onClose={() => setCalculatorOpen(false)} title='Air density calculator' size='lg'>
        <AirDensityCalculator units={units} context={weatherContext}
          onUse={(rho) => { set({ rho }); setCalculatorOpen(false) }} />
      </Modal>
    </Card>
  )
}
