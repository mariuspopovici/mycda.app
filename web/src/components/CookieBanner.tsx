import { useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { Anchor, Button, Group, Paper, Portal, Text } from '@mantine/core'
import { analyticsOffered, getAnalyticsConsent, setAnalyticsConsent, subscribeAnalyticsConsent, type AnalyticsConsent } from '../services/analytics'

/**
 * Asks before Google Analytics loads (ADR-0017), and again from Cookie settings in the footer. Not
 * modal, and the two answers look the same, so declining is as easy as accepting.
 */
export function CookieBanner ({ settingsOpen, onClose }: { settingsOpen: boolean, onClose: () => void }) {
  const consent = useSyncExternalStore(subscribeAnalyticsConsent, getAnalyticsConsent)
  if (!analyticsOffered() || (consent && !settingsOpen)) return null

  const choose = (choice: AnalyticsConsent) => {
    setAnalyticsConsent(choice)
    onClose()
  }
  const current = { granted: ' You have accepted.', denied: ' You have declined.' }
  return (
    <Portal>
      <Paper
        role='region' aria-label='Cookie choice' withBorder shadow='md' p='md' radius='md'
        style={{ position: 'fixed', zIndex: 300, bottom: 16, left: 16, right: 16, maxWidth: 480, marginInline: 'auto' }}
      >
        <Text size='sm' mb='sm'>
          May we use Google Analytics cookies to learn which pages get used? Your rides are never included.
          {consent && current[consent]} <Anchor component={Link} to='/privacy' size='sm' inherit>Privacy policy</Anchor>
        </Text>
        <Group gap='xs' grow>
          <Button variant='default' size='sm' onClick={() => choose('denied')}>Decline</Button>
          <Button variant='default' size='sm' onClick={() => choose('granted')}>Accept</Button>
        </Group>
      </Paper>
    </Portal>
  )
}
