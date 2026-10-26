import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Alert, Anchor, Button, PasswordInput, Stack, Text, TextInput } from '@mantine/core'
import { isEmail, isNotEmpty, useForm } from '@mantine/form'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { AuthCard } from '../auth/AuthCard'
import { usePageMeta } from '../lib/pageMeta'
import { ACCOUNT_PAGES } from '../lib/publicPages'
import { useAuth } from '../auth/AuthContext'
import { authErrorMessage } from '../auth/authErrors'

export function LoginPage () {
  usePageMeta(ACCOUNT_PAGES.login)
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/activities'
  const [error, setError] = useState<string>()
  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: { email: isEmail('Enter a valid email address'), password: isNotEmpty('Enter your password') }
  })

  if (user) return <Navigate to={from} replace />

  const submit = form.onSubmit(async ({ email, password }) => {
    setError(undefined)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate(from, { replace: true })
    } catch (e) {
      setError(authErrorMessage(e))
    }
  })

  return (
    <AuthCard title='Sign in' image='/images/oos-1200px.jpg'>
      <form onSubmit={submit} noValidate>
        <Stack>
          {error && <Alert color='red' role='alert'>{error}</Alert>}
          <TextInput label='Email' type='email' autoComplete='email' required {...form.getInputProps('email')} />
          <PasswordInput label='Password' autoComplete='current-password' required {...form.getInputProps('password')} />
          <Button type='submit' loading={form.submitting} fullWidth>Sign in</Button>
          <Text size='sm'>
            New to MyCdA? <Anchor component={Link} to='/signup'>Create an account</Anchor>
          </Text>
          <Anchor component={Link} to='/reset' size='sm'>Forgot your password?</Anchor>
        </Stack>
      </form>
    </AuthCard>
  )
}
