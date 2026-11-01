import { Link } from 'react-router'
import { Anchor, BackgroundImage, Box, Button, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconChartArea, IconClipboardCheck, IconCloudUpload } from '@tabler/icons-react'
import { useAuth } from '../auth/AuthContext'
import { usePageMeta } from '../lib/pageMeta'
import { PUBLIC_PAGES } from '../lib/publicPages'
import { RelaunchAnnouncement } from './RelaunchAnnouncement'

const FEATURES = [
  {
    icon: IconCloudUpload,
    title: 'Upload',
    text: 'Upload rides as Garmin .FIT or .CSV files. Explore power, speed and elevation for the whole ride, a selection or individual laps.'
  },
  {
    icon: IconChartArea,
    title: 'Analyze',
    text: 'Pick laps or a range, then estimate your drag area (CdA) and rolling resistance (Crr) with the virtual elevation method.'
  },
  {
    icon: IconClipboardCheck,
    title: 'Compare',
    text: 'Compare CdA and Crr across runs against a baseline, in watts saved and seconds per 40 km.'
  }
]

export function LandingPage () {
  const { user } = useAuth()
  usePageMeta(PUBLIC_PAGES.home)
  return (
    <Stack gap='xl' py='md'>
      <BackgroundImage src='/images/tuck-1200px.jpg' radius='md'>
        <Box p={{ base: 'xl', sm: 60 }} style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.15))', borderRadius: 'var(--mantine-radius-md)' }}>
          <Stack gap='md' maw={560}>
            <Title order={1} c='white' fz={{ base: 36, sm: 52 }}>What's your CdA?</Title>
            <Text c='white' size='xl'>A free CdA calculator for cyclists: measure your drag area and rolling resistance with your power meter.</Text>
            <Group>
              {user
                ? <Button component={Link} to='/activities' size='md'>Go to your activities</Button>
                : (
                  <>
                    <Button component={Link} to='/signup' size='md'>Sign up free</Button>
                    <Button component={Link} to='/login' size='md' variant='white'>Sign in</Button>
                  </>
                  )}
            </Group>
          </Stack>
        </Box>
      </BackgroundImage>
      <Box component='section' aria-labelledby='what-is-mycda' maw={860}>
        <Title order={2} id='what-is-mycda' mb='xs'>Measure your CdA without a wind tunnel</Title>
        <Text>
          MyCdA is a free online CdA calculator for cyclists and triathletes. Upload a ride from your bike computer and it
          estimates your aerodynamic drag area (CdA) and rolling resistance (Crr) from power, speed and elevation, with
          Robert Chung's <Anchor component={Link} to='/guide/analysis'>virtual elevation method</Anchor>. Test positions,
          helmets, wheels or tyres on a <Anchor component={Link} to='/guide/collecting-data'>loop or out-and-back course</Anchor>,
          and see the difference in watts. It runs in your browser, like an online version of Golden Cheetah's Aerolab.
        </Text>
      </Box>
      <RelaunchAnnouncement />
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <Card key={title} withBorder padding='lg'>
            <ThemeIcon size={44} radius='md' variant='light' mb='md'><Icon size={26} /></ThemeIcon>
            <Title order={3} mb='xs'>{title}</Title>
            <Text c='dimmed'>{text}</Text>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  )
}
