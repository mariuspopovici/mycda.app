import { Link } from 'react-router'
import { Button, Stack, Text, Title } from '@mantine/core'

export function NotFoundPage () {
  return (
    <Stack align='center' py={80} gap='md'>
      <Title order={1}>Page not found</Title>
      <Text c='dimmed'>The page you're looking for doesn't exist or has moved.</Text>
      <Button component={Link} to='/'>Go home</Button>
    </Stack>
  )
}
