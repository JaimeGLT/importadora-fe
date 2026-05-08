import { create } from 'zustand'
import type { Usuario } from '@/types'

interface AuthStore {
  user: Usuario | null
  isAuthenticated: boolean
  setUser: (user: Usuario | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}))