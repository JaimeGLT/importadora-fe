import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '@/types'
import { api } from '@/lib/api'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isTokenReady: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

interface ApiUserResponse {
  id?: string | number
  nombre?: string
  name?: string
  email?: string
  correo?: string
  rol?: string
  role?: string
}

function mapToUser(data: ApiUserResponse): User | null {
  const email = data.correo ?? data.email ?? ''
  const id = data.id ? String(data.id) : (email.split('@')[0] || null)
  const nombre = data.nombre ?? data.name ?? email.split('@')[0] ?? ''
  const rawRol = (data.rol ?? data.role ?? '').toLowerCase()
  const ROL_MAP: Record<string, User['rol']> = {
    admin: 'admin',
    administrador: 'admin',
    vendedor: 'vendedor',
    sales: 'vendedor',
    almacenero: 'almacenero',
    almacen: 'almacenero',
    warehouse: 'almacenero',
  }
  const rol: User['rol'] = ROL_MAP[rawRol] ?? 'vendedor'
  if (!id || !email) return null
  return { id, nombre, email, rol }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isTokenReady, setIsTokenReady] = useState(false)

  useEffect(() => {
    api.post<ApiUserResponse>('/Auth/refresh')
      .then((data) => {
        const u = mapToUser(data)
        if (u) setUser(u)
      })
      .catch(() => {
        // no active session — stay logged out
      })
      .finally(() => setIsTokenReady(true))
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    const data = await api.post<ApiUserResponse>('/Auth/login', { email, password })
    const u = mapToUser(data ?? {})
    if (!u) throw new Error('No se pudo obtener datos del usuario')
    setUser(u)
    return u
  }

  const logout = async () => {
    try { await api.post('/Auth/logout') } catch { /* ignore */ }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isTokenReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
