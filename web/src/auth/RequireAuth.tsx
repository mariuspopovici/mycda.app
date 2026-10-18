import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Center, Loader } from '@mantine/core'
import { useAuth } from './AuthContext'

/** Renders children for signed-in users; sends everyone else to /login and back afterwards. */
export function RequireAuth ({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (user === undefined) {
    return <Center h={240}><Loader /></Center>
  }
  if (!user) {
    return <Navigate to='/login' replace state={{ from: location.pathname + location.search }} />
  }
  return children
}
