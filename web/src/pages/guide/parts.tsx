import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Alert, Anchor, List, Title } from '@mantine/core'
import { IconAlertTriangle, IconBulb } from '@tabler/icons-react'

/** A heading other pages can link to (`/guide/section#id`). */
export function H2 ({ id, children }: { id: string, children: ReactNode }) {
  return <Title order={2} id={id} mt='xl' style={{ scrollMarginTop: 80 }}>{children}</Title>
}

export function H3 ({ id, children }: { id?: string, children: ReactNode }) {
  return <Title order={3} id={id} mt='md' style={{ scrollMarginTop: 80 }}>{children}</Title>
}

export function Tip ({ title, children }: { title?: string, children: ReactNode }) {
  return <Alert variant='light' color='blue' icon={<IconBulb size={18} />} title={title}>{children}</Alert>
}

export function Caution ({ title, children }: { title?: string, children: ReactNode }) {
  return <Alert variant='light' color='orange' icon={<IconAlertTriangle size={18} />} title={title}>{children}</Alert>
}

/** A link to another part of the guide: `to` is a section slug, optionally with `#heading`. */
export function GuideLink ({ to, children }: { to: string, children: ReactNode }) {
  return <Anchor component={Link} to={`/guide/${to}`}>{children}</Anchor>
}

/** A link to a page of the app. */
export function AppLink ({ to, children }: { to: string, children: ReactNode }) {
  return <Anchor component={Link} to={to}>{children}</Anchor>
}

export function Steps ({ children }: { children: ReactNode }) {
  return <List type='ordered' spacing='xs'>{children}</List>
}

export function Bullets ({ children }: { children: ReactNode }) {
  return <List spacing='xs'>{children}</List>
}

/** The name of something on screen: a button, field or menu item. */
export function Ui ({ children }: { children: ReactNode }) {
  return <b>{children}</b>
}
