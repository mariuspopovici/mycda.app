import { useState } from 'react'
import { ActionIcon, Button, Popover, RangeSlider, SegmentedControl, Stack, Text, Tooltip } from '@mantine/core'
import { IconAdjustmentsHorizontal } from '@tabler/icons-react'
import type { LoopPrecision } from '../../core/loopFinder'
import type { LoopPrefs } from './loopPrefs'

/** Popover to tune loop detection: how close the track must pass, and how long a loop may take. */
export function LoopSettings ({ value, onChange }: { value: LoopPrefs, onChange: (prefs: LoopPrefs) => void }) {
  const [draft, setDraft] = useState(value)
  const [opened, setOpened] = useState(false)
  return (
    <Popover opened={opened} onChange={setOpened} width={300} position='bottom-end' withArrow trapFocus>
      <Popover.Target>
        <Tooltip label='Loop detection settings'>
          <ActionIcon variant='default' size='lg' onClick={() => { setDraft(value); setOpened((o) => !o) }} aria-label='Loop detection settings'>
            <IconAdjustmentsHorizontal size={18} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap='sm'>
          <div>
            <Text size='sm' fw={500} mb={4}>Matching precision</Text>
            <SegmentedControl fullWidth size='xs' value={draft.precision}
              onChange={(precision) => setDraft((d) => ({ ...d, precision: precision as LoopPrecision }))}
              data={[{ label: '~110 m', value: 'low' }, { label: '~11 m', value: 'medium' }, { label: '~1 m', value: 'high' }]} />
          </div>
          <div>
            <Text size='sm' fw={500}>Loop duration: {draft.minDuration}–{draft.maxDuration} s</Text>
            <RangeSlider min={30} max={3600} step={10} minRange={30} value={[draft.minDuration, draft.maxDuration]}
              onChange={([minDuration, maxDuration]) => setDraft((d) => ({ ...d, minDuration, maxDuration }))}
              label={null} mt='xs' />
          </div>
          <Button size='xs' onClick={() => { onChange(draft); setOpened(false) }}>Apply</Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
