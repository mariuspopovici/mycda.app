import { Typography } from '@mantine/core'
import terms from './legal/terms.html?raw'
import privacy from './legal/privacy.html?raw'

const DOCUMENTS = { terms, privacy }

/** Renders the static legal documents in pages/legal/ (our own markup, not user content). */
export function LegalPage ({ document }: { document: keyof typeof DOCUMENTS }) {
  return (
    <Typography py='md' maw={860}>
      <div dangerouslySetInnerHTML={{ __html: DOCUMENTS[document] }} />
    </Typography>
  )
}
