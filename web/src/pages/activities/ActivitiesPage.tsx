import { useState } from 'react'
import { ActionIcon, Alert, Button, Center, Group, Loader, Modal, Progress, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { useLocalStorage } from '@mantine/hooks'
import { IconSearch, IconX } from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useUser } from '../../auth/AuthContext'
import { ACTIVITY_SORTS, deleteActivity, needsRetry, searchActivities, sortActivities, type ActivitySort, renameActivity, reprocessActivity, useActivities, type Activity } from '../../data/activities'
import { useUserPrefs } from '../../data/userPrefs'
import { ActivitiesTable } from './ActivitiesTable'
import { UploadDropzone } from './UploadDropzone'

function RenameModal ({ activity, onClose }: { activity?: Activity, onClose: () => void }) {
  return (
    <Modal opened={!!activity} onClose={onClose} title='Rename activity'>
      {activity && <RenameForm key={activity.id} activity={activity} onDone={onClose} />}
    </Modal>
  )
}

function RenameForm ({ activity, onDone }: { activity: Activity, onDone: () => void }) {
  const [name, setName] = useState(activity.name)
  const [saving, setSaving] = useState(false)
  const trimmed = name.trim()

  const save = async () => {
    if (!trimmed) return
    setSaving(true)
    try {
      await renameActivity(activity.id, trimmed)
      onDone()
    } catch (error) {
      notifications.show({ color: 'red', title: "Couldn't rename the activity", message: (error as Error).message })
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save() }}>
      <Stack>
        <TextInput label='Name' value={name} onChange={(e) => setName(e.currentTarget.value)} data-autofocus
          error={!trimmed ? 'Enter a name' : undefined} />
        <Group justify='flex-end'>
          <Button variant='default' onClick={onDone}>Cancel</Button>
          <Button type='submit' loading={saving} disabled={!trimmed}>Save</Button>
        </Group>
      </Stack>
    </form>
  )
}

export function ActivitiesPage () {
  const user = useUser()
  const { activities, error } = useActivities(user.uid)
  const { prefs } = useUserPrefs()
  const [renaming, setRenaming] = useState<Activity>()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useLocalStorage<ActivitySort>({ key: 'mycda-activity-sort', defaultValue: 'uploaded' })
  const shown = activities ? searchActivities(sortActivities(activities, sort), query) : undefined
  const [retrying, setRetrying] = useState<Set<string>>(new Set())
  const [batch, setBatch] = useState<{ done: number, total: number }>()

  const retryable = activities?.filter((a) => needsRetry(a)) ?? []

  const retry = async (activity: Activity) => {
    setRetrying((s) => new Set(s).add(activity.id))
    try {
      const result = await reprocessActivity(user, activity.id)
      return result.status === 'Processed'
    } catch (e) {
      notifications.show({ color: 'red', title: `Couldn't retry ${activity.name}`, message: (e as Error).message })
      return false
    } finally {
      setRetrying((s) => {
        const next = new Set(s)
        next.delete(activity.id)
        return next
      })
    }
  }

  const retryOne = async (activity: Activity) => {
    if (await retry(activity)) notifications.show({ color: 'green', message: `${activity.name} is ready.` })
  }

  /** One at a time, to keep the function's load and the user's quota modest. */
  const retryAll = async () => {
    const queue = [...retryable]
    let recovered = 0
    setBatch({ done: 0, total: queue.length })
    for (const [i, activity] of queue.entries()) {
      if (await retry(activity)) recovered++
      setBatch({ done: i + 1, total: queue.length })
    }
    setBatch(undefined)
    notifications.show({
      color: recovered ? 'green' : 'gray',
      title: `${recovered} of ${queue.length} activities recovered`,
      message: recovered < queue.length ? 'The rest show why they could not be processed. Hover over Error for details.' : undefined
    })
  }

  const confirmDelete = (activity: Activity) => modals.openConfirmModal({
    title: 'Delete activity',
    children: <Text size='sm'>Delete “{activity.name}” with its uploaded file and saved analyses? This can't be undone.</Text>,
    labels: { confirm: 'Delete', cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm: () => deleteActivity(activity).catch((e) =>
      notifications.show({ color: 'red', title: "Couldn't delete the activity", message: (e as Error).message }))
  })

  return (
    <Stack gap='lg' py='md'>
      <div>
        <Title order={1}>Activities</Title>
        <Text c='dimmed'>Upload rides recorded with a power meter, then pick laps or ranges to estimate CdA and Crr.</Text>
      </div>
      <UploadDropzone uid={user.uid} />
      {error && <Alert color='red' title="Couldn't load your activities">{error.message}</Alert>}
      {retryable.length > 0 && (
        <Alert color='orange' title={`${retryable.length} ${retryable.length === 1 ? 'activity needs' : 'activities need'} attention`}>
          <Stack gap='xs'>
            <Text size='sm'>
              Some uploads failed or never finished processing. MyCdA now reads more file types, so retrying may recover them.
              Anything that still fails says why, and can be deleted.
            </Text>
            {batch
              ? <Progress value={(batch.done / batch.total) * 100} animated aria-label={`Retried ${batch.done} of ${batch.total}`} />
              : <Group><Button size='xs' variant='light' color='orange' onClick={retryAll}>Retry all</Button></Group>}
          </Stack>
        </Alert>
      )}
      {!activities && !error && <Center py='xl'><Loader /></Center>}
      {activities?.length === 0 && <Text c='dimmed' ta='center' py='xl'>No activities yet. Upload your first ride above.</Text>}
      {activities && activities.length > 0 && shown && (
        <>
          <Group justify='space-between' gap='sm'>
            <TextInput
              placeholder='Search names and notes'
              aria-label='Search activities'
              leftSection={<IconSearch size={16} />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              rightSection={query && (
                <ActionIcon variant='subtle' color='gray' size='sm' onClick={() => setQuery('')} aria-label='Clear search'>
                  <IconX size={14} />
                </ActionIcon>
              )}
              style={{ flex: 1, maxWidth: 420 }}
            />
            <Group gap='xs' wrap='nowrap'>
              {query && <Text size='sm' c='dimmed'>{shown.length} of {activities.length}</Text>}
              <Select aria-label='Sort activities' data={ACTIVITY_SORTS} value={sort} allowDeselect={false}
                onChange={(v) => v && setSort(v as ActivitySort)} w={220} />
            </Group>
          </Group>
          {shown.length === 0
            ? <Text c='dimmed' ta='center' py='lg'>No activities match “{query.trim()}”.</Text>
            : <ActivitiesTable key={`${sort}|${query}`} activities={shown} units={prefs.units} onRename={setRenaming} onDelete={confirmDelete} onRetry={retryOne} retrying={retrying} />}
        </>
      )}
      <RenameModal activity={renaming} onClose={() => setRenaming(undefined)} />
    </Stack>
  )
}
