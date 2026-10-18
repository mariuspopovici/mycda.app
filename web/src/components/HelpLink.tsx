import { Link } from 'react-router'
import { ActionIcon, Tooltip } from '@mantine/core'
import { IconHelpCircle } from '@tabler/icons-react'

/** A question-mark button that opens the user guide at `to` (a section slug, optionally with `#heading`). */
export function HelpLink ({ to, topic }: { to: string, topic: string }) {
  const label = `Guide: ${topic}`
  return (
    <Tooltip label={label}>
      <ActionIcon component={Link} to={`/guide/${to}`} variant='subtle' color='gray' size='sm' aria-label={label}>
        <IconHelpCircle size={18} />
      </ActionIcon>
    </Tooltip>
  )
}
