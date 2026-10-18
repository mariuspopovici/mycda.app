import { Link } from 'react-router'
import { Anchor, Badge, Button, Card, Group, List, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core'
import { IconBook, IconCheck, IconSparkles } from '@tabler/icons-react'

/** What the relaunch rebuilt. */
const REBUILT = [
  'A faster, modern app that works on phones, with a dark theme',
  'Maps from OpenStreetMap, and weather and air density lookups from Open-Meteo',
  'A new file reader: more FIT files, .fit.gz and Garmin zip downloads, and a retry button for old uploads that failed',
  'Corrected physics: pauses, gaps and lap joins no longer distort the virtual elevation'
]

/** Features added since the relaunch, most useful first. Each links to its part of the guide. */
const NEW_FEATURES: Array<{ title: string, text: string, guide: string }> = [
  { title: 'Tests table', text: 'Every out and back test of a ride, paired automatically, fitted and saved in one go.', guide: 'tests' },
  { title: 'Joined runs', text: 'Analyze the out and back legs of a test as one run, held level at the turnaround.', guide: 'activity#selecting' },
  { title: 'Opens already fitted', text: 'New analyses start at the CdA that closes the run, with a warning when no plausible value does.', guide: 'analysis#suggest' },
  { title: 'Ride settings and notes', text: 'Mass, air density, Crr and drivetrain loss per ride, for when you tested another bike or kit.', guide: 'activity#ride-settings' },
  { title: 'Wind', text: 'Weather or your own wind, scaled to rider height for how sheltered the course is.', guide: 'analysis#airspeed' },
  { title: 'Air density', text: "Look up the ride's weather, or enter station pressure or humidity.", guide: 'analysis#air-density' },
  { title: 'Find your rides', text: 'New uploads at the top, sorting by ride date or name, and search across names and notes.', guide: 'uploading#list' },
  { title: 'User guide', text: 'From collecting good data to telling real differences from noise.', guide: 'getting-started' }
]

/** The relaunch announcement on the landing page. */
export function RelaunchAnnouncement () {
  return (
    <Card withBorder padding='xl' radius='md' component='section' aria-labelledby='relaunch'>
      <Group gap='xs' mb='xs'>
        <Badge variant='light' leftSection={<IconSparkles size={12} />}>October 2026</Badge>
      </Group>
      <Title order={2} id='relaunch' mb='xs'>MyCdA is back</Title>
      <Text mb='md'>
        MyCdA has been rebuilt from the ground up. Your account, rides and saved analyses are all still here, and there's a lot that's
        new, much of it suggested by riders who field test every week.
      </Text>

      <Title order={4} mb='xs'>Rebuilt</Title>
      <List spacing={6} mb='lg' icon={<ThemeIcon size={20} radius='xl' variant='light' color='green'><IconCheck size={12} /></ThemeIcon>}>
        {REBUILT.map((item) => <List.Item key={item}>{item}</List.Item>)}
      </List>

      <Title order={4} mb='sm'>New since the relaunch</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='md' verticalSpacing='sm' mb='lg'>
        {NEW_FEATURES.map(({ title, text, guide }) => (
          <div key={title}>
            <Anchor component={Link} to={`/guide/${guide}`} fw={600}>{title}</Anchor>
            <Text size='sm' c='dimmed'>{text}</Text>
          </div>
        ))}
      </SimpleGrid>

      <Group gap='sm'>
        <Button component={Link} to='/guide' variant='light' leftSection={<IconBook size={16} />}>Read the user guide</Button>
        <Text size='sm' c='dimmed'>
          Ideas or problems? Tell us in the{' '}
          <Anchor href='https://groups.google.com/forum/#!forum/mycda' target='_blank' size='sm'>user community</Anchor>.
        </Text>
      </Group>
    </Card>
  )
}
