import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useQueryClient } from '@tanstack/react-query'
import { auth } from '../firebase'
import { AuthContext } from './AuthContext'

export function AuthProvider ({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const queryClient = useQueryClient()

  useEffect(() => onAuthStateChanged(auth, (next) => {
    // cached data belongs to the previous user
    if (!next) queryClient.clear()
    setUser(next)
  }), [queryClient])

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}
