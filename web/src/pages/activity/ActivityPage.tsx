import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  Alert, Anchor, Button, Card, Center, Group, Loader, SegmentedControl, SimpleGrid, Stack, Switch, Text, Title
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconChartLine, IconX } from '@tabler/icons-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { toActivity, type Activity } from '../../data/activities'
import { useActivityData, type Lap } from '../../data/activityData'
import { deleteSegment, useSegments, type SegmentSummary } from '../../data/segments'
import { useUserPrefs } from '../../data/userPrefs'
import { findLoops, precisionDigits } from '../../core/loopFinder'
import { lapRange, rangeFromAxis, rangeStats, type IndexRange } from '../../core/selection'
import { secondsToHms } from '../../core/units'
import { hasLocation } from '../../core/activitySeries'
import { RideMap } from '../../components/RideMap'
import { formatDateTime, formatDistance, formatPower, formatSpeed } from '../../lib/format'
import { ActivityChart, type Band, type XAxis } from './ActivityChart'
import { LapsTable } from './LapsTable'
import { LoopSettings } from './LoopSettings'
import { DEFAULT_LOOP_PREFS, type LoopPrefs } from './loopPrefs'
import { SegmentsTable } from './SegmentsTable'

interface Selection extends IndexRange {
  label: string
  lap?: number
}

function useActivityDoc (id: string) {
  const [state, setState] = useState<{ activity?: Activity, missing?: boolean }>({})
  useEffect(() => onSnapshot(doc(db, 'activities', id),
    (snapshot) => setState(snapshot.exists() ? { activity: toActivity(snapshot.id, snapshot.data()) } : { missing: true }),
    () => setState({ missing: true })), [id])
  return state
}

function Stat ({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <Text size='xs' c='dimmed' tt='uppercase' fw={600}>{label}</Text>
      <Text fw={600} size='lg'>{value}</Text>
    </div>
  )
}

export function ActivityPage () {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { prefs } = useUserPrefs()
  const units = prefs.units
  const { activity, missing } = useActivityDoc(id)
  const { data, error, isLoading } = useActivityData(id)
  const { segments = [] } = useSegments(id)

  const [xAxis, setXAxis] = useState<XAxis>('time')
  const [selection, setSelection] = useState<Selection>()
  const [hovered, setHovered] = useState<number>()
  const [showLaps, setShowLaps] = useState(false)
  const [showLoops, setShowLoops] = useState(false)
  const [loopPrefs, setLoopPrefs] = useState<LoopPrefs>(DEFAULT_LOOP_PREFS)

  const series = data?.series
  const gps = !!series && hasLocation(series)

  const loops = useMemo(() => (series && gps && showLoops
    ? findLoops(series.location, precisionDigits(loopPrefs.precision), loopPrefs.minDuration, loopPrefs.maxDuration)
    : []), [series, gps, showLoops, loopPrefs])

  const bands = useMemo<Band[]>(() => {
    if (!data) return []
    if (showLoops) return loops.map((loop, i) => ({ start: loop.startIndex, end: loop.endIndex, label: `Loop ${i + 1}` }))
    if (showLaps) {
      return data.laps.flatMap((lap) => {
        const range = lapRange(data.lapOfPoint, lap.number)
        return range ? [{ ...range, label: `Lap ${lap.number}` }] : []
      })
    }
    return []
  }, [data, showLaps, showLoops, loops])

  if (missing || error) {
    return (
      <Stack py='md'>
        <Alert color='red' title="Couldn't open this activity">
          {missing ? 'It may have been deleted, or it belongs to another account.' : (error as Error).message}
        </Alert>
        <Anchor component={Link} to='/activities'>Back to activities</Anchor>
      </Stack>
    )
  }
  if (activity && activity.status !== 'Processed') {
    return (
      <Stack py='md'>
        <Title order={1}>{activity.name}</Title>
        <Alert color={activity.status === 'Error' ? 'red' : 'blue'}>
          {activity.status === 'Error' ? activity.statusMessage ?? 'This file could not be processed.' : 'This activity is still being processed.'}
        </Alert>
        <Anchor component={Link} to='/activities'>Back to activities</Anchor>
      </Stack>
    )
  }
  if (isLoading || !data || !series || !activity) return <Center py={80}><Loader /></Center>

  const selectAxisRange = (from: number, to: number) => {
    const axis = xAxis === 'time' ? series.time.map((t) => t.getTime()) : series.distance
    const range = rangeFromAxis(axis, from, to)
    if (range) setSelection({ ...range, label: 'Selection' })
  }
  const selectLap = (lap: Lap) => {
    const range = lapRange(data.lapOfPoint, lap.number)
    if (range) setSelection({ ...range, label: `Lap ${lap.number}`, lap: lap.number })
  }
  const selectLoops = () => {
    if (loops.length) setSelection({ start: loops[0].startIndex, end: loops[loops.length - 1].endIndex, label: `Loops 1–${loops.length}` })
  }
  const showSegment = (segment: SegmentSummary) => {
    const range = rangeFromAxis(series.time.map((t) => t.getTime()), segment.rangeStart.getTime(), segment.rangeEnd.getTime())
    if (range) setSelection({ ...range, label: segment.name })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const confirmDeleteSegment = (segment: SegmentSummary) => modals.openConfirmModal({
    title: 'Delete analysis',
    children: <Text size='sm'>Delete “{segment.name}”? This can't be undone.</Text>,
    labels: { confirm: 'Delete', cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm: () => deleteSegment(segment.id).catch((e) =>
      notifications.show({ color: 'red', title: "Couldn't delete the analysis", message: (e as Error).message }))
  })
  const analyze = () => {
    if (!selection) return
    const params = new URLSearchParams({
      from: String(series.time[selection.start].getTime()),
      to: String(series.time[selection.end].getTime()),
      name: selection.label
    })
    navigate(`/activity/${id}/analysis?${params}`)
  }

  const stats = selection ? rangeStats(series, selection) : undefined

  return (
    <Stack gap='lg' py='md'>
      <Anchor component={Link} to='/activities' size='sm'>← Activities</Anchor>
      <div>
        <Title order={1}>{activity.name}</Title>
        <Text c='dimmed'>{formatDateTime(data.start)}</Text>
      </div>

      <Card withBorder padding='lg'>
        <Group justify='space-between' align='flex-start' mb='sm' gap='sm'>
          <div>
            <Text fw={600}>{selection ? selection.label : 'Whole ride'}</Text>
            <Text size='sm' c='dimmed'>
              {selection ? 'Analyze it, or drag on the chart to change the selection. Double-click the chart to zoom out.' : 'Drag across the chart to zoom into a range, or pick a lap or loops.'}
            </Text>
          </div>
          <Group gap='xs'>
            {selection && <Button variant='default' leftSection={<IconX size={16} />} onClick={() => setSelection(undefined)}>Clear</Button>}
            <Button leftSection={<IconChartLine size={18} />} disabled={!selection} onClick={analyze}>Analyze selection</Button>
          </Group>
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 4, md: 6 }} spacing='md' mb='md'>
          {stats
            ? (
              <>
                <Stat label='Duration' value={secondsToHms(stats.duration)} />
                <Stat label='Distance' value={formatDistance(stats.distance, units)} />
                <Stat label='Avg. speed' value={formatSpeed(stats.averageSpeed, units)} />
                <Stat label='Avg. power' value={formatPower(stats.averagePower)} />
                <Stat label='Max. power' value={formatPower(stats.maxPower)} />
                <Stat label='Elevation gain' value={`${Math.round(units === 'metric' ? stats.elevationGain : stats.elevationGain * 3.281)} ${units === 'metric' ? 'm' : 'ft'}`} />
              </>
              )
            : (
              <>
                <Stat label='Duration' value={secondsToHms(data.elapsedTime)} />
                <Stat label='Distance' value={formatDistance(data.distance, units)} />
                <Stat label='Avg. speed' value={formatSpeed(data.averageSpeed, units)} />
                <Stat label='Avg. power' value={formatPower(data.averagePower)} />
                <Stat label='Laps' value={String(data.laps.length)} />
              </>
              )}
        </SimpleGrid>
        <Group justify='space-between' gap='sm'>
          <SegmentedControl size='xs' value={xAxis} onChange={(v) => setXAxis(v as XAxis)}
            data={[{ label: 'Time', value: 'time' }, { label: 'Distance', value: 'distance' }]} />
          <Group gap='md'>
            {data.laps.length > 1 && <Switch label='Show laps' checked={showLaps} onChange={(e) => { setShowLaps(e.currentTarget.checked); if (e.currentTarget.checked) setShowLoops(false) }} />}
            {gps && (
              <Group gap={6}>
                <Switch label='Find loops' checked={showLoops} onChange={(e) => { setShowLoops(e.currentTarget.checked); if (e.currentTarget.checked) setShowLaps(false) }} />
                {showLoops && <LoopSettings value={loopPrefs} onChange={setLoopPrefs} />}
              </Group>
            )}
          </Group>
        </Group>
        {showLoops && (
          <Group mt='xs' gap='xs'>
            <Text size='sm' c='dimmed'>{loops.length ? `${loops.length} loops found.` : 'No loops found. Try a lower precision or a wider duration range.'}</Text>
            {loops.length > 0 && <Button size='compact-sm' variant='light' onClick={selectLoops}>Select all loops</Button>}
          </Group>
        )}
        <ActivityChart
          series={series}
          units={units}
          xAxis={xAxis}
          selection={selection}
          bands={bands}
          onSelect={selectAxisRange}
          onClear={() => setSelection(undefined)}
          onHover={setHovered}
        />
      </Card>

      <SimpleGrid cols={{ base: 1, md: gps ? 2 : 1 }}>
        <Card withBorder padding='lg'>
          <Title order={3} mb='sm'>Laps</Title>
          <LapsTable laps={data.laps} units={units} selectedLap={selection?.lap} onSelect={selectLap} />
        </Card>
        {gps && (
          <Card withBorder padding={0} style={{ overflow: 'hidden' }}>
            <RideMap track={series.location} selection={selection} marker={hovered} height={400} />
          </Card>
        )}
      </SimpleGrid>

      <Card withBorder padding='lg'>
        <Title order={3} mb='sm'>Saved analyses</Title>
        {segments.length
          ? <SegmentsTable activityId={id} segments={segments} onShow={showSegment} onDelete={confirmDeleteSegment} />
          : <Text size='sm' c='dimmed'>None yet. Select a range above and analyze it.</Text>}
      </Card>
    </Stack>
  )
}
