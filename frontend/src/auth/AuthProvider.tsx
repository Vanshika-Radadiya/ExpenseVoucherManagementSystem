import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../api/client'
import type { User } from '../api/types'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    const onUnauthorized = () => setUser(null)
    window.addEventListener('voucher:unauthorized', onUnauthorized)
    api.restoreSession()
      .then((auth) => {
        if (active && auth?.user) setUser(auth.user)
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
      window.removeEventListener('voucher:unauthorized', onUnauthorized)
    }
  }, [])

  async function signIn(email: string, password: string) {
    const auth = await api.login(email, password)
    setUser(auth.user)
  }

  async function signOut() {
    try {
      await api.logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
