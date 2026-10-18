import { useState } from 'react'
import { useLocation } from 'react-router'
import {
  Alert, Anchor, Button, Card, Group, NumberInput, PasswordInput, SegmentedControl, SimpleGrid, Skeleton,
  Stack, Text, TextInput, Title
} from '@mantine/core'
import { hasLength, isEmail, isInRange, matchesField, useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import {
  EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile, verifyBeforeUpdateEmail,
  type User
} from 'firebase/auth'
import { useUser } from '../auth/AuthContext'
import { authErrorMessage } from '../auth/authErrors'
import { convertPrefsUnits, useSaveUserPrefs, useUserPrefs, type UserPrefs } from '../data/userPrefs'
import { weightUnit } from '../lib/format'
import type { Units } from '../core/units'

const reauthenticate = (user: User, password: string) =>
  reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', password))

function DisplayNameForm ({ user }: { user: User }) {
  const form = useForm({ initialValues: { displayName: user.displayName ?? '' } })
  const submit = form.onSubmit(async ({ displayName }) => {
    try {
      await updateProfile(user, { displayName: displayName.trim() || null })
      form.resetDirty()
      notifications.show({ color: 'green', message: 'Name saved.' })
    } catch (e) {
      form.setFieldError('displayName', authErrorMessage(e))
    }
  })
  return (
    <form onSubmit={submit}>
      <Group align='flex-end'>
        <TextInput label='Display name' autoComplete='name' style={{ flex: 1 }} {...form.getInputProps('displayName')} />
        <Button type='submit' variant='light' loading={form.submitting} disabled={!form.isDirty()}>Save</Button>
      </Group>
    </form>
  )
}

function EmailForm ({ user }: { user: User }) {
  const [sentTo, setSentTo] = useState<string>()
  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => isEmail('Enter a valid email address')(value) ??
        (value.trim().toLowerCase() === user.email?.toLowerCase() ? 'This is already your email address' : null),
      password: hasLength({ min: 1 }, 'Enter your current password')
    }
  })
  const submit = form.onSubmit(async ({ email, password }) => {
    try {
      await reauthenticate(user, password)
      await verifyBeforeUpdateEmail(user, email.trim())
      setSentTo(email.trim())
      form.reset()
    } catch (e) {
      form.setFieldError('password', authErrorMessage(e))
    }
  })
  return (
    <form onSubmit={submit} noValidate>
      <Stack gap='sm'>
        <Text size='sm'>Email: <b>{user.email}</b></Text>
        {sentTo && <Alert color='green'>We sent a confirmation link to {sentTo}. Your email changes when you follow it.</Alert>}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label='New email' type='email' autoComplete='email' {...form.getInputProps('email')} />
          <PasswordInput label='Current password' autoComplete='current-password' {...form.getInputProps('password')} />
        </SimpleGrid>
        <Group justify='flex-end'><Button type='submit' variant='light' loading={form.submitting}>Change email</Button></Group>
      </Stack>
    </form>
  )
}

function PasswordForm ({ user }: { user: User }) {
  const form = useForm({
    initialValues: { current: '', password: '', confirm: '' },
    validate: {
      current: hasLength({ min: 1 }, 'Enter your current password'),
      password: hasLength({ min: 6 }, 'Use at least 6 characters'),
      confirm: matchesField('password', 'Passwords do not match')
    }
  })
  const submit = form.onSubmit(async ({ current, password }) => {
    try {
      await reauthenticate(user, current)
      await updatePassword(user, password)
      form.reset()
      notifications.show({ color: 'green', message: 'Password changed.' })
    } catch (e) {
      form.setFieldError('current', authErrorMessage(e))
    }
  })
  return (
    <form onSubmit={submit} noValidate>
      <Stack gap='sm'>
        <input type='text' name='username' autoComplete='username' value={user.email ?? ''} readOnly hidden />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <PasswordInput label='Current password' autoComplete='current-password' {...form.getInputProps('current')} />
          <PasswordInput label='New password' autoComplete='new-password' description='At least 6 characters' {...form.getInputProps('password')} />
          <PasswordInput label='Repeat new password' autoComplete='new-password' {...form.getInputProps('confirm')} />
        </SimpleGrid>
        <Group justify='flex-end'><Button type='submit' variant='light' loading={form.submitting}>Change password</Button></Group>
      </Stack>
    </form>
  )
}

/** Limits per unit system; the legacy form applied 0–300 to both kg and lbs. */
const WEIGHT_LIMITS: Record<Units, { rider: [number, number], bike: [number, number] }> = {
  metric: { rider: [20, 250], bike: [3, 40] },
  imperial: { rider: [44, 550], bike: [7, 88] }
}

function PreferencesForm ({ initial, saved }: { initial: UserPrefs, saved: boolean }) {
  const save = useSaveUserPrefs()
  const form = useForm<UserPrefs>({
    initialValues: initial,
    validate: {
      weight: (v, values) => isInRange({ min: WEIGHT_LIMITS[values.units].rider[0], max: WEIGHT_LIMITS[values.units].rider[1] },
        `Enter ${WEIGHT_LIMITS[values.units].rider.join('–')} ${weightUnit(values.units)}`)(v),
      bikeWeight: (v, values) => isInRange({ min: WEIGHT_LIMITS[values.units].bike[0], max: WEIGHT_LIMITS[values.units].bike[1] },
        `Enter ${WEIGHT_LIMITS[values.units].bike.join('–')} ${weightUnit(values.units)}`)(v),
      cda: isInRange({ min: 0.05, max: 1 }, 'Enter 0.05–1'),
      crr: isInRange({ min: 0.0005, max: 0.05 }, 'Enter 0.0005–0.05'),
      dloss: isInRange({ min: 0, max: 10 }, 'Enter 0–10 %')
    }
  })
  const unit = weightUnit(form.values.units)

  const changeUnits = (units: string) => form.setValues(convertPrefsUnits(form.values, units as Units))
  const submit = form.onSubmit(async (values) => {
    try {
      await save.mutateAsync(values)
      form.resetDirty(values)
      notifications.show({ color: 'green', message: 'Preferences saved.' })
    } catch (e) {
      notifications.show({ color: 'red', title: "Couldn't save your preferences", message: (e as Error).message })
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        {!saved && <Alert color='blue'>These are suggested starting values. Adjust them to your setup and save.</Alert>}
        <div>
          <Text size='sm' fw={500} mb={4}>Units</Text>
          <SegmentedControl data={[{ label: 'Metric', value: 'metric' }, { label: 'Imperial', value: 'imperial' }]}
            value={form.values.units} onChange={changeUnits} />
        </div>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput label={`Rider weight (${unit})`} description='Including kit, shoes and helmet' decimalScale={1} step={0.1} {...form.getInputProps('weight')} />
          <NumberInput label={`Bike weight (${unit})`} description='As set up for testing, with bottles and tools' decimalScale={1} step={0.1} {...form.getInputProps('bikeWeight')} />
          <NumberInput label='CdA (m²)' description='Typical 0.200–0.350; very fast positions 0.170–0.200' decimalScale={3} step={0.005} {...form.getInputProps('cda')} />
          <NumberInput label='Crr' decimalScale={4} step={0.0005} {...form.getInputProps('crr')}
            description={<>Typically 0.003–0.008; 0.005 for average tires on good asphalt. <Anchor href='https://docs.google.com/spreadsheets/d/1vTm2AQYKeDuabP8Qiv5_AjatJVNYSY_DRBOeFmO3-_8/edit?usp=sharing' target='_blank' size='xs'>Roller test data</Anchor> needs scaling: ×1.8 rough chipseal, ×1.5 good asphalt, ×1.4 concrete, ×1.2 unpolished wood track, ×1.1 polished wood.</>} />
          <NumberInput label='Drivetrain loss (%)' description='Typically 1–5 %, more for crank-based power meters and worn drivetrains' decimalScale={1} step={0.5} {...form.getInputProps('dloss')} />
        </SimpleGrid>
        <Group justify='flex-end'>
          <Button type='submit' loading={save.isPending} disabled={saved && !form.isDirty()}>Save preferences</Button>
        </Group>
      </Stack>
    </form>
  )
}

export function ProfilePage () {
  const user = useUser()
  const location = useLocation()
  const welcome = (location.state as { welcome?: boolean } | null)?.welcome
  const { prefs, saved, isLoading } = useUserPrefs()

  return (
    <Stack gap='lg' py='md' maw={900}>
      <Title order={1}>Profile</Title>
      {welcome && <Alert color='green' title='Welcome to MyCdA'>Set up your preferences below, then upload your first ride.</Alert>}
      <Card withBorder padding='lg'>
        <Title order={3} mb='xs'>Analysis preferences</Title>
        <Text size='sm' c='dimmed' mb='md'>Defaults for new analyses. If you don't know a value, keep the suggestion as a baseline.</Text>
        {isLoading ? <Skeleton h={260} /> : <PreferencesForm key={String(saved)} initial={prefs} saved={saved} />}
      </Card>
      <Card withBorder padding='lg'>
        <Title order={3} mb='md'>Account</Title>
        <Stack gap='xl'>
          <DisplayNameForm user={user} />
          <EmailForm user={user} />
          <PasswordForm user={user} />
        </Stack>
      </Card>
    </Stack>
  )
}
