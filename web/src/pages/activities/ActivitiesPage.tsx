import { useState } from 'react'
import { Alert, Button, Center, Group, Loader, Modal, Stack, Text, TextInput, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useUser } from '../../auth/AuthContext'
import { deleteActivity, renameActivity, useActivities, type Activity } from '../../data/activities'
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
      {!activities && !error && <Center py='xl'><Loader /></Center>}
      {activities?.length === 0 && <Text c='dimmed' ta='center' py='xl'>No activities yet. Upload your first ride above.</Text>}
      {activities && activities.length > 0 && (
        <ActivitiesTable activities={activities} units={prefs.units} onRename={setRenaming} onDelete={confirmDelete} />
      )}
      <RenameModal activity={renaming} onClose={() => setRenaming(undefined)} />
    </Stack>
  )
}
