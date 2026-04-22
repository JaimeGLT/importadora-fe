import { create } from 'zustand'
import type { Prestamo, EstadoPrestamo } from '@/types'

interface PrestamosState {
  prestamos: Prestamo[]
  setPrestamos: (prestamos: Prestamo[]) => void
  addPrestamo: (prestamo: Prestamo) => void
  updatePrestamo: (id: string, updates: Partial<Omit<Prestamo, 'id' | 'creado_en'>>) => void
  cancelarPrestamo: (id: string) => void
}

export const usePrestamosStore = create<PrestamosState>((set) => ({
  prestamos: [],
  setPrestamos: (prestamos) => set({ prestamos }),
  addPrestamo: (prestamo) =>
    set((state) => ({ prestamos: [prestamo, ...state.prestamos] })),
  updatePrestamo: (id, updates) =>
    set((state) => ({
      prestamos: state.prestamos.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
  cancelarPrestamo: (id) =>
    set((state) => ({
      prestamos: state.prestamos.map((p) =>
        p.id === id ? { ...p, estado: 'cancelado' as EstadoPrestamo } : p
      ),
    })),
}))
