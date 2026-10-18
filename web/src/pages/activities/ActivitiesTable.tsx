import { useState } from 'react'
import { Link } from 'react-router'
import { ActionIcon, Anchor, Badge, Box, Card, Group, Loader, Pagination, Popover, Stack, Table, Text, Tooltip, VisuallyHidden } from '@mantine/core'
import { IconAlertCircle, IconCheck, IconPencil, IconTrash } from '@tabler/icons-react'
import type { Activity } from '../../data/activities'
import type { Units } from '../../core/units'
import { formatDateTime, formatDistance, formatPower, formatSpeed } from '../../lib/format'

export const PAGE_SIZE = 15

function StatusBadge ({ activity }: { activity: Activity }) {
  if (activity.status === 'Processed') {
    return <Badge color='green' variant='light' leftSection={<IconCheck size={12} />}>Ready</Badge>
  }
  if (activity.status === 'Error') {
    return (
      <Popover width={300} position='bottom-start' withArrow>
        <Popover.Target>
          <Badge component='button' color='red' variant='light' leftSection={<IconAlertCircle size={12} />} style={{ cursor: 'pointer' }}>
            Error
          </Badge>
        </Popover.Target>
        <Popover.Dropdown>
          <Text size='sm'>{activity.statusMessage || 'This file could not be processed.'}</Text>
        </Popover.Dropdown>
      </Popover>
    )
  }
  return <Badge color='gray' variant='light' leftSection={<Loader size={10} />}>Processing</Badge>
}

function ActivityName ({ activity }: { activity: Activity }) {
  return activity.status === 'Processed'
    ? <Anchor component={Link} to={`/activity/${activity.id}`} fw={500}>{activity.name}</Anchor>
    : <Text size='sm' fw={500}>{activity.name}</Text>
}

function RowActions ({ activity, onRename, onDelete }: Pick<Props, 'onRename' | 'onDelete'> & { activity: Activity }) {
  return (
    <Group gap={4} justify='flex-end' wrap='nowrap'>
      <Tooltip label='Rename'>
        <ActionIcon variant='subtle' color='gray' onClick={() => onRename(activity)} aria-label={`Rename ${activity.name}`}>
          <IconPencil size={18} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label='Delete'>
        <ActionIcon variant='subtle' color='red' onClick={() => onDelete(activity)} aria-label={`Delete ${activity.name}`}>
          <IconTrash size={18} />
        </ActionIcon>
      </Tooltip>
    </Group>
  )
}

interface Props {
  activities: Activity[]
  units: Units
  onRename: (activity: Activity) => void
  onDelete: (activity: Activity) => void
}

export function ActivitiesTable ({ activities, units, onRename, onDelete }: Props) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(activities.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = activities.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <>
      <Stack gap='sm' hiddenFrom='sm'>
        {rows.map((activity) => (
          <Card key={activity.id} withBorder padding='sm'>
            <Group justify='space-between' wrap='nowrap' align='flex-start'>
              <Box miw={0}>
                <ActivityName activity={activity} />
                <Text size='xs' c='dimmed'>{formatDateTime(activity.activityDate ?? activity.timestamp)}</Text>
              </Box>
              <StatusBadge activity={activity} />
            </Group>
            <Group justify='space-between' mt='xs' wrap='nowrap'>
              <Text size='sm' c={activity.status === 'Processed' ? undefined : 'dimmed'} lineClamp={2}>
                {activity.status === 'Processed'
                  ? `${formatDistance(activity.distance, units)} · ${formatSpeed(activity.averageSpeed, units)} · ${formatPower(activity.averagePower)}`
                  : activity.status === 'Error' ? activity.statusMessage || 'This file could not be processed.' : 'Processing…'}
              </Text>
              <RowActions activity={activity} onRename={onRename} onDelete={onDelete} />
            </Group>
          </Card>
        ))}
      </Stack>
      <Table.ScrollContainer minWidth={720} visibleFrom='sm'>
        <Table striped highlightOnHover verticalSpacing='sm'>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th ta='right'>Distance</Table.Th>
              <Table.Th ta='right'>Avg. speed</Table.Th>
              <Table.Th ta='right'>Avg. power</Table.Th>
              <Table.Th><VisuallyHidden>Actions</VisuallyHidden></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((activity) => (
              <Table.Tr key={activity.id}>
                <Table.Td><ActivityName activity={activity} /></Table.Td>
                <Table.Td><StatusBadge activity={activity} /></Table.Td>
                <Table.Td>{formatDateTime(activity.activityDate ?? activity.timestamp)}</Table.Td>
                <Table.Td ta='right'>{formatDistance(activity.distance, units)}</Table.Td>
                <Table.Td ta='right'>{formatSpeed(activity.averageSpeed, units)}</Table.Td>
                <Table.Td ta='right'>{formatPower(activity.averagePower)}</Table.Td>
                <Table.Td><RowActions activity={activity} onRename={onRename} onDelete={onDelete} /></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {pages > 1 && <Group justify='center' mt='md'><Pagination total={pages} value={current} onChange={setPage} /></Group>}
    </>
  )
}
