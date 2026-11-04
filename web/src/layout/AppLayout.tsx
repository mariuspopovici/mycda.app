import { useEffect, useState } from 'react'
import { Link, NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  ActionIcon, Anchor, AppShell, Box, Burger, Button, Container, Divider, Group, Image, Menu, NavLink,
  Stack, Text, Tooltip, useComputedColorScheme, useMantineColorScheme, VisuallyHidden
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { signOut } from 'firebase/auth'
import { IconCoffee, IconLogout, IconMoon, IconSun, IconUser, IconUserCircle } from '@tabler/icons-react'
import logo from '../assets/logo.svg'
import { useAuth } from '../auth/AuthContext'
import { CookieBanner } from '../components/CookieBanner'
import { auth, useEmulators } from '../firebase'
import { SUPPORT_URL } from '../lib/links'
import { analyticsOffered, trackPageView } from '../services/analytics'

const COMMUNITY_URL = 'https://groups.google.com/forum/#!forum/mycda'

const NAV = [
  { to: '/activities', label: 'Activities', auth: true },
  { to: '/guide', label: 'Guide' },
  { to: '/faq', label: 'FAQ' },
  { to: '/about', label: 'About' }
]

function ColorSchemeToggle () {
  const { setColorScheme } = useMantineColorScheme()
  const scheme = useComputedColorScheme('light')
  const next = scheme === 'dark' ? 'light' : 'dark'
  return (
    <Tooltip label={`Switch to ${next} theme`}>
      <ActionIcon variant='subtle' color='gray' size='lg' onClick={() => setColorScheme(next)} aria-label={`Switch to ${next} theme`}>
        {scheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
      </ActionIcon>
    </Tooltip>
  )
}

function UserMenu () {
  const { user } = useAuth()
  const navigate = useNavigate()
  if (!user) {
    return <Button component={Link} to='/login' size='sm'>Sign in</Button>
  }
  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login', { replace: true })
  }
  return (
    <Menu position='bottom-end' width={220}>
      <Menu.Target>
        <ActionIcon variant='subtle' color='gray' size='lg' aria-label='Account'>
          <IconUserCircle size={22} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{user.displayName || user.email}</Menu.Label>
        <Menu.Item component={Link} to='/profile' leftSection={<IconUser size={16} />}>Profile</Menu.Item>
        <Menu.Item onClick={handleSignOut} leftSection={<IconLogout size={16} />}>Sign out</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

function Footer ({ onCookieSettings }: { onCookieSettings: () => void }) {
  return (
    <Box component='footer' py='lg' mt='xl'>
      <Divider mb='md' />
      <Group justify='space-between' gap='xs'>
        <Group gap='md'>
          <Anchor component={Link} to='/about' size='sm' c='dimmed'>About</Anchor>
          <Anchor href='mailto:support@mycda.app' size='sm' c='dimmed'>Contact</Anchor>
          <Anchor component={Link} to='/privacy' size='sm' c='dimmed'>Privacy</Anchor>
          <Anchor component={Link} to='/terms' size='sm' c='dimmed'>Terms</Anchor>
          {analyticsOffered() && <Anchor component='button' type='button' onClick={onCookieSettings} size='sm' c='dimmed'>Cookie settings</Anchor>}
          <Anchor href={SUPPORT_URL} target='_blank' rel='noopener' size='sm' c='dimmed'
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <IconCoffee size={14} aria-hidden /> Buy me a coffee
          </Anchor>
        </Group>
        <Text size='sm' c='dimmed'>© MyCdA 2019–{new Date().getFullYear()} · v{__APP_VERSION__}</Text>
      </Group>
    </Box>
  )
}

export function AppLayout () {
  const { user } = useAuth()
  const [opened, { toggle, close }] = useDisclosure()
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false)
  const links = NAV.filter((item) => !item.auth || user)

  // after the page's own effects, so the page view carries its title
  const { pathname } = useLocation()
  useEffect(() => trackPageView(pathname), [pathname])

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 240, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }} padding='md'>
      <AppShell.Header>
        <Container size='xl' h='100%'>
          <Group h='100%' justify='space-between' wrap='nowrap'>
            <Group gap='lg' wrap='nowrap'>
              <Burger opened={opened} onClick={toggle} hiddenFrom='sm' size='sm' aria-label='Toggle navigation' />
              <Anchor component={Link} to='/' underline='never' c='inherit'>
                <Group gap={8} wrap='nowrap'>
                  <Image src={logo} h={30} w='auto' alt='' />
                  <Text fw={700} size='lg'>MyCdA</Text>
                  {useEmulators && <Text size='xs' c='orange'>emulators</Text>}
                </Group>
              </Anchor>
              <Group gap={4} visibleFrom='sm'>
                {links.map((item) => (
                  <Button key={item.to} component={RouterNavLink} to={item.to} variant='subtle' color='gray' size='sm'>
                    {item.label}
                  </Button>
                ))}
                <Button component='a' href={COMMUNITY_URL} target='_blank' rel='noreferrer' variant='subtle' color='gray' size='sm'>
                  Community<VisuallyHidden> (opens in a new tab)</VisuallyHidden>
                </Button>
              </Group>
            </Group>
            <Group gap='xs' wrap='nowrap'>
              <ColorSchemeToggle />
              <UserMenu />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p='md'>
        <Stack gap={4}>
          {links.map((item) => (
            <NavLink key={item.to} component={RouterNavLink} to={item.to} label={item.label} onClick={close} />
          ))}
          <NavLink component='a' href={COMMUNITY_URL} target='_blank' rel='noreferrer' label='Community' />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size='xl'>
          <Outlet />
          <Footer onCookieSettings={() => setCookieSettingsOpen(true)} />
        </Container>
      </AppShell.Main>
      <CookieBanner settingsOpen={cookieSettingsOpen} onClose={() => setCookieSettingsOpen(false)} />
    </AppShell>
  )
}
