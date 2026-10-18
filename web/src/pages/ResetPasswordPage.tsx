import { useState } from 'react'
import { Link } from 'react-router'
import { Alert, Anchor, Button, Stack, Text, TextInput } from '@mantine/core'
import { isEmail, useForm } from '@mantine/form'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase'
import { AuthCard } from '../auth/AuthCard'
import { authErrorMessage } from '../auth/authErrors'

export function ResetPasswordPage () {
  const [error, setError] = useState<string>()
  const [sentTo, setSentTo] = useState<string>()
  const form = useForm({ initialValues: { email: '' }, validate: { email: isEmail('Enter a valid email address') } })

  const submit = form.onSubmit(async ({ email }) => {
    setError(undefined)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSentTo(email.trim())
    } catch (e) {
      setError(authErrorMessage(e))
    }
  })

  return (
    <AuthCard title='Reset your password' image='/images/oos-1200px.jpg'>
      {sentTo
        ? (
          <Stack>
            <Alert color='green'>We sent a password reset link to {sentTo}. Follow it to choose a new password.</Alert>
            <Anchor component={Link} to='/login'>Back to sign in</Anchor>
          </Stack>
          )
        : (
          <form onSubmit={submit} noValidate>
            <Stack>
              <Text size='sm' c='dimmed'>Enter your account's email address and we'll send you a link to reset your password.</Text>
              {error && <Alert color='red' role='alert'>{error}</Alert>}
              <TextInput label='Email' type='email' autoComplete='email' required {...form.getInputProps('email')} />
              <Button type='submit' loading={form.submitting} fullWidth>Send reset link</Button>
              <Anchor component={Link} to='/login' size='sm'>Back to sign in</Anchor>
            </Stack>
          </form>
          )}
    </AuthCard>
  )
}
