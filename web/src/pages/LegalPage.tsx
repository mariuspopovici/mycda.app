import { Typography } from '@mantine/core'
import terms from './legal/terms.html?raw'
import privacy from './legal/privacy.html?raw'
import { usePageMeta } from '../lib/pageMeta'
import { PUBLIC_PAGES } from '../lib/publicPages'

const DOCUMENTS = { terms, privacy }

/** Renders the static legal documents in pages/legal/ (our own markup, not user content). */
export function LegalPage ({ document }: { document: keyof typeof DOCUMENTS }) {
  usePageMeta(PUBLIC_PAGES[document])
  return (
    <Typography py='md' maw={860}>
      <div dangerouslySetInnerHTML={{ __html: DOCUMENTS[document] }} />
    </Typography>
  )
}
