import { useEffect, useState } from 'react'
import { Alert, Anchor, Button, Stack, Text } from '@mantine/core'
import { sendEmailVerification, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { AuthCard } from './AuthCard'
import { useAuth, useUser } from './AuthContext'
import { authErrorMessage } from './authErrors'

type Notice = { color: 'green' | 'yellow' | 'red', message: string }

/** Shown by RequireAuth until a new account opens the link emailed at sign-up. */
export function VerifyEmail () {
  const user = useUser()
  const { reload } = useAuth()
  const [notice, setNotice] = useState<Notice>()
  const [busy, setBusy] = useState<'check' | 'resend'>()

  // the link usually opens in another tab: check again when the user comes back to this one
  useEffect(() => {
    const onFocus = () => { reload().catch(() => {}) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  const check = async () => {
    setBusy('check')
    setNotice(undefined)
    try {
      await reload()
      if (!user.emailVerified) {
        setNotice({ color: 'yellow', message: "Your email address isn't verified yet. Open the link in the email, then try again." })
      }
    } catch (e) {
      setNotice({ color: 'red', message: authErrorMessage(e) })
    } finally {
      setBusy(undefined)
    }
  }

  const resend = async () => {
    setBusy('resend')
    setNotice(undefined)
    try {
      await sendEmailVerification(user)
      setNotice({ color: 'green', message: `We sent a new link to ${user.email}.` })
    } catch (e) {
      setNotice({ color: 'red', message: authErrorMessage(e) })
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <AuthCard title='Verify your email' image='/images/tt-1200px.jpg'>
      <Stack>
        <Text>
          We sent a link to <Text span fw={600}>{user.email}</Text>. Open it to verify your email address, then come back here
          to continue.
        </Text>
        <Text size='sm' c='dimmed'>Can't find it? Check your spam folder, or send a new link.</Text>
        {notice && <Alert color={notice.color} role='alert'>{notice.message}</Alert>}
        <Button onClick={check} loading={busy === 'check'} disabled={busy === 'resend'} fullWidth>I've verified my email</Button>
        <Button variant='default' onClick={resend} loading={busy === 'resend'} disabled={busy === 'check'} fullWidth>
          Send a new link
        </Button>
        <Anchor component='button' type='button' size='sm' onClick={() => signOut(auth)}>Sign out</Anchor>
      </Stack>
    </AuthCard>
  )
}
