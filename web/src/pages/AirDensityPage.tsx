import { Card, SegmentedControl, Stack, Text, Title, Group } from '@mantine/core'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { AirDensityCalculator } from '../components/AirDensityCalculator'
import type { Units } from '../core/units'
import { HelpLink } from '../components/HelpLink'
import { usePageMeta } from '../lib/pageMeta'
import { PUBLIC_PAGES } from '../lib/publicPages'

/** Standalone air density calculator (/rho); works signed out. */
export function AirDensityPage () {
  const { user } = useAuth()
  usePageMeta(PUBLIC_PAGES.rho)
  const [units, setUnits] = useState<Units>('metric')
  return (
    <Stack gap='md' py='md' maw={720}>
      <Group gap={6}><Title order={1}>Air density calculator</Title><HelpLink to='analysis#air-density' topic='Air density' /></Group>
      <Text c='dimmed'>
        Air density changes drag as much as small position changes do. Enter the conditions, or look up the current
        weather where you are.
      </Text>
      <SegmentedControl w={220} value={units} onChange={(v) => setUnits(v as Units)}
        data={[{ label: 'Metric', value: 'metric' }, { label: 'Imperial', value: 'imperial' }]} />
      <Card withBorder padding='lg'>
        <AirDensityCalculator key={units} units={units} />
      </Card>
      {!user && <Text size='sm' c='dimmed'>Sign in to look up the weather for a recorded ride from its analysis screen.</Text>}
    </Stack>
  )
}
