import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Alert, Anchor, Button, Card, Center, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { toActivity, type Activity } from '../data/activities'
import { useUserPrefs } from '../data/userPrefs'
import { formatDateTime, formatDistance, formatPower, formatSpeed } from '../lib/format'

/** Activity summary. The chart, map and analysis arrive in Phase 4; until then the legacy app has them. */
export function ActivityPage () {
  const { id = '' } = useParams()
  const { prefs } = useUserPrefs()
  const [state, setState] = useState<{ activity?: Activity, missing?: boolean, error?: Error }>({})

  useEffect(() => onSnapshot(doc(db, 'activities', id),
    (snapshot) => setState(snapshot.exists() ? { activity: toActivity(snapshot.id, snapshot.data()) } : { missing: true }),
    (error) => setState({ error })), [id])

  if (state.error || state.missing) {
    return (
      <Stack py='md'>
        <Alert color='red' title='Activity not found'>It may have been deleted, or it belongs to another account.</Alert>
        <Anchor component={Link} to='/activities'>Back to activities</Anchor>
      </Stack>
    )
  }
  const { activity } = state
  if (!activity) return <Center py='xl'><Loader /></Center>

  const stats = [
    ['Date', formatDateTime(activity.activityDate ?? activity.timestamp)],
    ['Distance', formatDistance(activity.distance, prefs.units)],
    ['Average speed', formatSpeed(activity.averageSpeed, prefs.units)],
    ['Average power', formatPower(activity.averagePower)]
  ]

  return (
    <Stack gap='lg' py='md'>
      <Anchor component={Link} to='/activities' size='sm'>← Activities</Anchor>
      <Title order={1}>{activity.name}</Title>
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        {stats.map(([label, value]) => (
          <Card key={label} withBorder padding='md'>
            <Text size='sm' c='dimmed'>{label}</Text>
            <Text fw={600} size='lg'>{value}</Text>
          </Card>
        ))}
      </SimpleGrid>
      <Alert color='blue' title='Analysis is moving here soon'>
        <Group justify='space-between' align='center'>
          <Text size='sm'>Charts, the map and CdA analysis are still in the current app.</Text>
          <Button component='a' href={`https://mycda.app/#/activity/${activity.id}`} size='xs' variant='light'>Open in the current app</Button>
        </Group>
      </Alert>
    </Stack>
  )
}
