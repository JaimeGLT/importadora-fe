import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isTokenReady: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isTokenReady, setIsTokenReady] = useState(false)

  useEffect(() => {
    // TODO: reemplazar con /api/auth/me cuando exista el backend
    setIsTokenReady(true)
  }, [])

  const login = async (email: string, password: string) => {
    // TODO: reemplazar con llamada real cuando exista el backend
    const MOCK_USERS: (User & { password: string })[] = [
      { id: '1', nombre: 'Admin',     email: 'admin@importadora.com',    rol: 'admin',      password: 'admin123' },
      { id: '2', nombre: 'Vendedor',  email: 'vendedor@importadora.com', rol: 'vendedor',   password: 'venta123' },
      { id: '3', nombre: 'Almacén',   email: 'almacen@importadora.com',  rol: 'almacenero', password: 'alma123'  },
    ]
    const found = MOCK_USERS.find((u) => u.email === email && u.password === password)
    if (!found) throw new Error('Credenciales inválidas')
    const { password: _, ...user } = found
    setUser(user)
  }

  const logout = async () => {
    // TODO: llamar /api/auth/logout cuando exista el backend
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isTokenReady, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
