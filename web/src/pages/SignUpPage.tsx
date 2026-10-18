import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert, Anchor, Button, Checkbox, PasswordInput, Stack, Text, TextInput } from '@mantine/core'
import { hasLength, isEmail, matchesField, useForm } from '@mantine/form'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { AuthCard } from '../auth/AuthCard'
import { authErrorMessage } from '../auth/authErrors'

export function SignUpPage () {
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const form = useForm({
    initialValues: { email: '', password: '', confirm: '', terms: false },
    validate: {
      email: isEmail('Enter a valid email address'),
      password: hasLength({ min: 6 }, 'Use at least 6 characters'),
      confirm: matchesField('password', 'Passwords do not match'),
      terms: (value) => (value ? null : 'Accept the terms and conditions to continue')
    }
  })

  const submit = form.onSubmit(async ({ email, password }) => {
    setError(undefined)
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password)
      navigate('/profile', { replace: true, state: { welcome: true } })
    } catch (e) {
      setError(authErrorMessage(e))
    }
  })

  return (
    <AuthCard title='Create your account' image='/images/tt-1200px.jpg'>
      <form onSubmit={submit} noValidate>
        <Stack>
          {error && <Alert color='red' role='alert'>{error}</Alert>}
          <TextInput label='Email' type='email' autoComplete='email' required {...form.getInputProps('email')} />
          <PasswordInput label='Password' autoComplete='new-password' required description='At least 6 characters' {...form.getInputProps('password')} />
          <PasswordInput label='Repeat password' autoComplete='new-password' required {...form.getInputProps('confirm')} />
          <Checkbox
            label={<>I accept the <Anchor component={Link} to='/terms' target='_blank'>terms and conditions</Anchor></>}
            {...form.getInputProps('terms', { type: 'checkbox' })}
          />
          <Button type='submit' loading={form.submitting} fullWidth>Create account</Button>
          <Text size='sm'>
            Already have an account? <Anchor component={Link} to='/login'>Sign in</Anchor>
          </Text>
        </Stack>
      </form>
    </AuthCard>
  )
}
