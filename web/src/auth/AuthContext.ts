import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'

export interface AuthState {
  /** undefined while Firebase restores the session, null when signed out. */
  user: User | null | undefined
}

export const AuthContext = createContext<AuthState>({ user: undefined })

export const useAuth = () => useContext(AuthContext)

/** The signed-in user; only call below <RequireAuth>. */
export function useUser (): User {
  const { user } = useAuth()
  if (!user) throw new Error('useUser() called without a signed-in user')
  return user
}
