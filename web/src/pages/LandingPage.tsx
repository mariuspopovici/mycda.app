import { Link } from 'react-router'
import { BackgroundImage, Box, Button, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconChartArea, IconClipboardCheck, IconCloudUpload } from '@tabler/icons-react'
import { useAuth } from '../auth/AuthContext'

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
  return (
    <Stack gap='xl' py='md'>
      <BackgroundImage src='/images/tuck-1200px.jpg' radius='md'>
        <Box p={{ base: 'xl', sm: 60 }} style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.15))', borderRadius: 'var(--mantine-radius-md)' }}>
          <Stack gap='md' maw={560}>
            <Title order={1} c='white' fz={{ base: 36, sm: 52 }}>What's your CdA?</Title>
            <Text c='white' size='xl'>Your aerodynamics field testing companion.</Text>
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
