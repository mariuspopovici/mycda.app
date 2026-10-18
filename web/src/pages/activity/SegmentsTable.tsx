import { Link } from 'react-router'
import { ActionIcon, Anchor, Badge, Group, Table, Text, Tooltip } from '@mantine/core'
import { IconFocus2, IconTrash } from '@tabler/icons-react'
import type { SegmentSummary } from '../../data/segments'
import { compareToBaseline, summarizeCdA } from '../../core/segmentStats'

interface Props {
  activityId: string
  segments: SegmentSummary[]
  onShow: (segment: SegmentSummary) => void
  onDelete: (segment: SegmentSummary) => void
}

const signed = (value: number, digits: number) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`

/** Saved analyses of this ride, compared with the baseline. */
export function SegmentsTable ({ activityId, segments, onShow, onDelete }: Props) {
  const baseline = segments.find((s) => s.isBaseline)
  const summary = summarizeCdA(segments.map((s) => s.cda))

  return (
    <>
      <Table.ScrollContainer minWidth={760}>
        <Table striped highlightOnHover verticalSpacing='xs'>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Range</Table.Th>
              <Table.Th ta='right'>CdA</Table.Th>
              <Table.Th ta='right'>Crr</Table.Th>
              <Table.Th ta='right'>Δ CdA</Table.Th>
              <Table.Th ta='right'>Watts saved*</Table.Th>
              <Table.Th ta='right'>s / 40 km*</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {segments.map((segment) => {
              const comparison = baseline && segment.id !== baseline.id ? compareToBaseline(baseline.cda, segment.cda) : undefined
              const color = comparison ? (comparison.cdaDelta > 0 ? 'green' : comparison.cdaDelta < 0 ? 'red' : undefined) : undefined
              return (
                <Table.Tr key={segment.id}>
                  <Table.Td>
                    <Group gap={6} wrap='nowrap'>
                      <Anchor component={Link} to={`/activity/${activityId}/analysis/${segment.id}`}>{segment.name}</Anchor>
                      {segment.isBaseline && <Badge size='xs' variant='light'>Baseline</Badge>}
                    </Group>
                    {segment.description && <Text size='xs' c='dimmed' lineClamp={1}>{segment.description}</Text>}
                  </Table.Td>
                  <Table.Td>
                    <Text size='sm'>{segment.rangeStart.toLocaleTimeString()}–{segment.rangeEnd.toLocaleTimeString()}</Text>
                    {segment.ranges.length > 1 && <Text size='xs' c='dimmed'>{segment.ranges.length} ranges joined</Text>}
                  </Table.Td>
                  <Table.Td ta='right' fw={600}>{segment.cda.toFixed(3)}</Table.Td>
                  <Table.Td ta='right'>{segment.crr.toFixed(4)}</Table.Td>
                  <Table.Td ta='right' c={color}>{comparison ? `${signed(-comparison.cdaDeltaPct, 1)} %` : '–'}</Table.Td>
                  <Table.Td ta='right' c={color}>{comparison ? signed(comparison.wattsSaved, 1) : '–'}</Table.Td>
                  <Table.Td ta='right' c={color}>{comparison ? signed(comparison.seconds40k, 0) : '–'}</Table.Td>
                  <Table.Td>
                    <Group gap={4} justify='flex-end' wrap='nowrap'>
                      <Tooltip label='Show on chart'>
                        <ActionIcon variant='subtle' color='gray' onClick={() => onShow(segment)} aria-label={`Show ${segment.name} on the chart`}>
                          <IconFocus2 size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label='Delete'>
                        <ActionIcon variant='subtle' color='red' onClick={() => onDelete(segment)} aria-label={`Delete ${segment.name}`}>
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Group justify='space-between' mt='xs' gap='xs'>
        {summary && (
          <Text size='sm'>
            CdA mean <b>{summary.mean.toFixed(3)}</b> · SD <b>{summary.standardDeviation.toFixed(3)}</b> · CV <b>{summary.coefficientOfVariation.toFixed(1)} %</b>
          </Text>
        )}
        <Text size='xs' c='dimmed'>
          {baseline ? '* Estimated at about 48 km/h (30 mph): 0.005 m² CdA ≈ 5 W ≈ 20 s per 40 km.' : 'Mark an analysis as baseline to compare the others with it.'}
        </Text>
      </Group>
    </>
  )
}
