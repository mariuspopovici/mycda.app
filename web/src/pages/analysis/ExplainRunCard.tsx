import { useState } from 'react'
import { Alert, Badge, Button, Card, Group, List, Stack, Text, Title } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import { HelpLink } from '../../components/HelpLink'
import { explainRun, type ExplainRunContext, type RunExplanation, type Verdict } from '../../services/assistant'

const VERDICT: Record<Verdict, { label: string, color: string }> = {
  good: { label: 'Looks good', color: 'green' },
  check: { label: 'Worth checking', color: 'orange' },
  unreliable: { label: 'Unreliable', color: 'red' }
}

interface Props {
  /** Builds the facts sent to the model, from the analysis as it is now. */
  context: () => ExplainRunContext
  /** Changes whenever the analysis changes, to mark an explanation as out of date. */
  stateKey: string
}

/** A plain-language read of the run by Gemini, from numbers computed in the browser. */
export function ExplainRunCard ({ context, stateKey }: Props) {
  const [state, setState] = useState<{ explanation?: RunExplanation, error?: string, loading?: boolean, key?: string }>({})

  const explain = async () => {
    setState({ loading: true })
    try {
      setState({ explanation: await explainRun(context()), key: stateKey })
    } catch (e) {
      setState({ error: (e as Error).message })
    }
  }

  const { explanation } = state
  const stale = explanation && state.key !== stateKey
  return (
    <Card withBorder padding='lg'>
      <Group justify='space-between' align='flex-start' gap='sm' mb='xs'>
        <Group gap={6}>
          <Title order={3}>Explain this run</Title>
          <Badge variant='light' size='sm'>Beta</Badge>
          <HelpLink to='analysis#explain' topic='Explain this run' />
        </Group>
        <Button variant='light' leftSection={<IconSparkles size={16} />} loading={state.loading} onClick={explain}>
          {explanation ? 'Explain again' : 'Explain'}
        </Button>
      </Group>
      {!explanation && !state.error && (
        <Text size='sm' c='dimmed'>
          A plain-language read of the virtual elevation, the fit and what to check next, written by Google Gemini from the numbers
          on this page.
        </Text>
      )}
      {state.error && <Alert color='red' title="Couldn't get an explanation">{state.error}</Alert>}
      {explanation && (
        <Stack gap='sm' style={{ opacity: stale ? 0.55 : 1 }}>
          {stale && <Text size='sm' c='orange'>The analysis changed since this was written. Explain again to update it.</Text>}
          <Group gap='sm' wrap='nowrap' align='flex-start'>
            <Badge color={VERDICT[explanation.verdict].color} variant='light' style={{ flexShrink: 0 }}>{VERDICT[explanation.verdict].label}</Badge>
            <Text fw={600}>{explanation.headline}</Text>
          </Group>
          <List spacing='xs'>
            {explanation.findings.map((f) => (
              <List.Item key={f.title}><Text span fw={600}>{f.title}.</Text> {f.detail}</List.Item>
            ))}
          </List>
          {explanation.nextSteps.length > 0 && (
            <div>
              <Text size='sm' fw={600} mb={4}>Next steps</Text>
              <List type='ordered' spacing={4} size='sm'>
                {explanation.nextSteps.map((step) => <List.Item key={step}>{step}</List.Item>)}
              </List>
            </div>
          )}
        </Stack>
      )}
      <Text size='xs' c='dimmed' mt='sm'>
        Only numbers computed on this page are sent to Google: no GPS track, names or notes. The CdA comes from MyCdA's own fit;
        the explanation can still be wrong.
      </Text>
    </Card>
  )
}
