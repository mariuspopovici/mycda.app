import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alert, Anchor, Button, Center, Loader, PasswordInput, Stack, TextInput } from '@mantine/core'
import { hasLength, matchesField, useForm } from '@mantine/form'
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '../firebase'
import { AuthCard } from '../auth/AuthCard'
import { usePageMeta } from '../lib/pageMeta'
import { ACCOUNT_PAGES } from '../lib/publicPages'
import { authErrorMessage } from '../auth/authErrors'

/**
 * Handles links from Firebase Auth emails (/auth/action?mode=…&oobCode=…): password reset,
 * email verification and email change confirmation or recovery.
 */
export function AuthActionPage () {
  usePageMeta(ACCOUNT_PAGES.authAction)
  const [params] = useSearchParams()
  const mode = params.get('mode')
  const code = params.get('oobCode')

  if (!code) {
    return <ActionResult title='Invalid link' error='This link is missing its code. Use the link from your email again.' />
  }
  if (mode === 'resetPassword') return <ResetPasswordForm code={code} />
  if (mode === 'verifyEmail' || mode === 'verifyAndChangeEmail' || mode === 'recoverEmail') {
    return <ApplyCode mode={mode} code={code} />
  }
  return <ActionResult title='Invalid link' error='This link is not supported.' />
}

const SUCCESS: Record<string, string> = {
  verifyEmail: 'Your email address is verified.',
  verifyAndChangeEmail: 'Your email address has been changed. Sign in with the new address.',
  recoverEmail: 'Your previous email address has been restored. Consider resetting your password.'
}

function ApplyCode ({ mode, code }: { mode: string, code: string }) {
  const [result, setResult] = useState<{ ok: boolean, message: string }>()
  useEffect(() => {
    applyActionCode(auth, code)
      .then(() => setResult({ ok: true, message: SUCCESS[mode] }))
      .catch((e) => setResult({ ok: false, message: authErrorMessage(e) }))
  }, [mode, code])

  if (!result) return <AuthCard title='Just a moment' image='/images/oos-1200px.jpg'><Center><Loader /></Center></AuthCard>
  return <ActionResult title={result.ok ? 'Done' : 'Something went wrong'} error={result.ok ? undefined : result.message} success={result.ok ? result.message : undefined} />
}

function ActionResult ({ title, error, success }: { title: string, error?: string, success?: string }) {
  return (
    <AuthCard title={title} image='/images/oos-1200px.jpg'>
      <Stack>
        {error && <Alert color='red'>{error}</Alert>}
        {success && <Alert color='green'>{success}</Alert>}
        <Anchor component={Link} to='/login'>Go to sign in</Anchor>
      </Stack>
    </AuthCard>
  )
}

function ResetPasswordForm ({ code }: { code: string }) {
  const [email, setEmail] = useState<string>()
  const [error, setError] = useState<string>()
  const [done, setDone] = useState(false)
  const form = useForm({
    initialValues: { password: '', confirm: '' },
    validate: {
      password: hasLength({ min: 6 }, 'Use at least 6 characters'),
      confirm: matchesField('password', 'Passwords do not match')
    }
  })

  useEffect(() => {
    verifyPasswordResetCode(auth, code).then(setEmail).catch((e) => setError(authErrorMessage(e)))
  }, [code])

  const submit = form.onSubmit(async ({ password }) => {
    setError(undefined)
    try {
      await confirmPasswordReset(auth, code, password)
      setDone(true)
    } catch (e) {
      setError(authErrorMessage(e))
    }
  })

  if (done) return <ActionResult title='Password changed' success='Your password has been changed. Sign in with your new password.' />
  if (error && !email) return <ActionResult title='Reset your password' error={error} />
  if (!email) return <AuthCard title='Reset your password' image='/images/oos-1200px.jpg'><Center><Loader /></Center></AuthCard>

  return (
    <AuthCard title='Choose a new password' image='/images/oos-1200px.jpg'>
      <form onSubmit={submit} noValidate>
        <Stack>
          {error && <Alert color='red' role='alert'>{error}</Alert>}
          <TextInput label='Email' value={email} readOnly autoComplete='username' />
          <PasswordInput label='New password' autoComplete='new-password' description='At least 6 characters' required {...form.getInputProps('password')} />
          <PasswordInput label='Repeat new password' autoComplete='new-password' required {...form.getInputProps('confirm')} />
          <Button type='submit' loading={form.submitting} fullWidth>Change password</Button>
        </Stack>
      </form>
    </AuthCard>
  )
}
