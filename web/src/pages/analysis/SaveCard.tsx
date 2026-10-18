import { Alert, Button, Card, Group, Switch, Stack, Textarea, TextInput, Title } from '@mantine/core'
import { IconDeviceFloppy, IconDownload, IconTrash } from '@tabler/icons-react'

export interface SaveDetails {
  name: string
  description: string
  isBaseline: boolean
}

interface Props {
  value: SaveDetails
  onChange: (value: SaveDetails) => void
  onSave: () => void
  onExport: () => void
  onDelete?: () => void
  saving: boolean
  dirty: boolean
  isNew: boolean
  /** Why saving isn't possible, if it isn't. */
  blocked?: string
}

export function SaveCard ({ value, onChange, onSave, onExport, onDelete, saving, dirty, isNew, blocked }: Props) {
  const nameMissing = !value.name.trim()
  return (
    <Card withBorder padding='lg'>
      <Title order={3} mb='sm'>{isNew ? 'Save this analysis' : 'Saved analysis'}</Title>
      <Stack gap='sm'>
        <TextInput label='Name' value={value.name} maxLength={255} required
          error={nameMissing ? 'Enter a name' : undefined}
          onChange={(e) => onChange({ ...value, name: e.currentTarget.value })} />
        <Textarea label='Notes' autosize minRows={2} maxRows={6}
          placeholder='Conditions, equipment, position…'
          value={value.description} onChange={(e) => onChange({ ...value, description: e.currentTarget.value })} />
        <Switch label='Baseline for this ride' description='Other analyses of the ride are compared with the baseline.'
          checked={value.isBaseline} onChange={(e) => onChange({ ...value, isBaseline: e.currentTarget.checked })} />
        {blocked && <Alert color='orange'>{blocked}</Alert>}
        <Group justify='space-between'>
          <Group gap='xs'>
            <Button variant='default' leftSection={<IconDownload size={16} />} onClick={onExport}>Export CSV</Button>
            {onDelete && <Button variant='subtle' color='red' leftSection={<IconTrash size={16} />} onClick={onDelete}>Delete</Button>}
          </Group>
          <Button leftSection={<IconDeviceFloppy size={16} />} loading={saving} disabled={!!blocked || nameMissing || (!isNew && !dirty)} onClick={onSave}>
            {isNew ? 'Save' : dirty ? 'Save changes' : 'Saved'}
          </Button>
        </Group>
      </Stack>
    </Card>
  )
}
