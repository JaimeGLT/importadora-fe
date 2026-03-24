import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppUser, UserRole } from '@/types';
import { mockUsers } from '@/mock/data';

const uid = () => Math.random().toString(36).slice(2, 10);

interface AuthState {
  user: Omit<AppUser, 'password'> | null;
  isAuthenticated: boolean;
  loginError: string | null;
  users: AppUser[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  clearError: () => void;
  addUser: (data: Omit<AppUser, 'id'>) => void;
  updateUser: (id: string, data: Partial<Omit<AppUser, 'id'>>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      loginError: null,
      users: mockUsers,

      login: (username, password) => {
        const clean = String(username).trim().toLowerCase();
        const found = get().users.find(
          (u) => u.username.toLowerCase() === clean && u.password === String(password) && u.activo
        );
        if (found) {
          const { password: _pw, ...safe } = found;
          set({ user: safe, isAuthenticated: true, loginError: null });
          return true;
        }
        set({ loginError: 'Usuario o contraseña incorrectos.' });
        return false;
      },

      logout: () => set({ user: null, isAuthenticated: false, loginError: null }),
      clearError: () => set({ loginError: null }),

      addUser: (data) => {
        const nuevo: AppUser = { id: uid(), ...data };
        set((s) => ({ users: [...s.users, nuevo] }));
      },

      updateUser: (id, data) =>
        set((s) => ({
          users: s.users.map((u) => u.id === id ? { ...u, ...data } : u),
        })),
    }),
    {
      name: 'ap-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated, users: s.users }),
    }
  )
);

export const roleLabels: Record<UserRole, string> = {
  administrador: 'Administrador',
  vendedor: 'Vendedor',
  almacenero: 'Almacenero',
  reservero: 'Reservero',
};

export const roleHome: Record<UserRole, string> = {
  administrador: '/dashboard',
  vendedor: '/ventas',
  almacenero: '/logistica',
  reservero: '/almacen-reserva',
};
