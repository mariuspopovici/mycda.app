import { Checkbox, Table, Text } from '@mantine/core'
import type { Lap } from '../../data/activityData'
import { secondsToHms, type Units } from '../../core/units'
import { formatDistance, formatPower, formatSpeed } from '../../lib/format'

interface Props {
  laps: Lap[]
  units: Units
  /** Lap numbers in the selection. */
  selectedLaps: number[]
  /** Clicking a row selects only that lap. */
  onSelect: (lap: Lap) => void
  /** The checkbox adds or removes the lap, to join several laps (e.g. out and back) into one run. */
  onToggle: (lap: Lap) => void
}

/** The ride's laps. Click a row to select that lap; tick several to analyze them together. */
export function LapsTable ({ laps, units, selectedLaps, onSelect, onToggle }: Props) {
  if (laps.length < 2) return <Text size='sm' c='dimmed'>This ride has a single lap.</Text>
  return (
    <Table.ScrollContainer minWidth={520}>
      <Table highlightOnHover verticalSpacing={6} fz='sm'>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={36} />
            <Table.Th>Lap</Table.Th>
            <Table.Th>Start</Table.Th>
            <Table.Th ta='right'>Time</Table.Th>
            <Table.Th ta='right'>Distance</Table.Th>
            <Table.Th ta='right'>Avg. speed</Table.Th>
            <Table.Th ta='right'>Avg. power</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {laps.map((lap) => (
            <Table.Tr
              key={lap.number}
              onClick={() => onSelect(lap)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(lap) } }}
              tabIndex={0}
              aria-selected={selectedLaps.includes(lap.number)}
              bg={selectedLaps.includes(lap.number) ? 'var(--mantine-color-yellow-light)' : undefined}
              style={{ cursor: 'pointer' }}
            >
              <Table.Td onClick={(e) => e.stopPropagation()}>
                <Checkbox size='xs' checked={selectedLaps.includes(lap.number)} onChange={() => onToggle(lap)}
                  aria-label={`Include lap ${lap.number}`} />
              </Table.Td>
              <Table.Td>{lap.number}</Table.Td>
              <Table.Td>{lap.start.toLocaleTimeString()}</Table.Td>
              <Table.Td ta='right'>{secondsToHms(lap.elapsedTime)}</Table.Td>
              <Table.Td ta='right'>{formatDistance(lap.distance, units)}</Table.Td>
              <Table.Td ta='right'>{formatSpeed(lap.averageSpeed, units)}</Table.Td>
              <Table.Td ta='right'>{formatPower(lap.averagePower)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
