import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useQueryClient } from '@tanstack/react-query'
import { auth } from '../firebase'
import { AuthContext } from './AuthContext'

export function AuthProvider ({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  // User.reload() updates the same object, so count reloads to re-render
  const [, setReloads] = useState(0)
  const queryClient = useQueryClient()

  useEffect(() => onAuthStateChanged(auth, (next) => {
    // cached data belongs to the previous user
    if (!next) queryClient.clear()
    setUser(next)
  }), [queryClient])

  const reload = useCallback(async () => {
    if (!auth.currentUser) return
    await auth.currentUser.reload()
    setReloads((n) => n + 1)
  }, [])

  return <AuthContext.Provider value={{ user, reload }}>{children}</AuthContext.Provider>
}
