import { useEffect } from 'react'
import { Link, Navigate, NavLink as RouterNavLink, useLocation, useNavigate, useParams } from 'react-router'
import { Anchor, Box, Button, Grid, Group, NavLink, Select, Stack, Text, Title } from '@mantine/core'
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import { GUIDE_SECTIONS, guideSection } from './sections'

/** The user guide: one page per section, with a contents sidebar (a menu on phones). */
export function GuidePage () {
  const { section: slug } = useParams()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const section = guideSection(slug)
  const index = section ? GUIDE_SECTIONS.indexOf(section) : -1

  // jump to the linked heading, or to the top when changing section
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [slug, hash])

  useEffect(() => {
    if (!section) return
    const previous = document.title
    document.title = `${section.title} · MyCdA guide`
    return () => { document.title = previous }
  }, [section])

  if (!section) return <Navigate to={`/guide/${GUIDE_SECTIONS[0].slug}`} replace />
  const prev = GUIDE_SECTIONS[index - 1]
  const next = GUIDE_SECTIONS[index + 1]
  const { Content } = section

  return (
    <Grid gap='xl' py='md'>
      <Grid.Col span={{ base: 12, md: 3 }} visibleFrom='md'>
        <Box pos='sticky' top={80}>
          <Text size='xs' tt='uppercase' fw={700} c='dimmed' mb='xs'>User guide</Text>
          <nav aria-label='User guide'>
            {GUIDE_SECTIONS.map((s, i) => (
              <NavLink key={s.slug} component={RouterNavLink} to={`/guide/${s.slug}`} label={`${i + 1}. ${s.title}`}
                active={s.slug === section.slug} />
            ))}
          </nav>
        </Box>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 9 }}>
        <Stack gap='md' maw={780}>
          <Select hiddenFrom='md' aria-label='Guide section' allowDeselect={false} value={section.slug}
            data={GUIDE_SECTIONS.map((s, i) => ({ value: s.slug, label: `${i + 1}. ${s.title}` }))}
            onChange={(v) => v && navigate(`/guide/${v}`)} />
          <div>
            <Text size='sm' c='dimmed'>User guide · {index + 1} of {GUIDE_SECTIONS.length}</Text>
            <Title order={1}>{section.title}</Title>
          </div>
          <Content />
          <Group justify='space-between' mt='xl' pt='md' style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            {prev
              ? <Button component={Link} to={`/guide/${prev.slug}`} variant='subtle' leftSection={<IconArrowLeft size={16} />}>{prev.title}</Button>
              : <span />}
            {next && <Button component={Link} to={`/guide/${next.slug}`} variant='subtle' rightSection={<IconArrowRight size={16} />}>{next.title}</Button>}
          </Group>
          <Text size='sm' c='dimmed'>
            Something missing or unclear? Ask the{' '}
            <Anchor href='https://groups.google.com/forum/#!forum/mycda' target='_blank' size='sm'>user community</Anchor> or{' '}
            <Anchor href='mailto:support@mycda.app' size='sm'>contact us</Anchor>.
          </Text>
        </Stack>
      </Grid.Col>
    </Grid>
  )
}
