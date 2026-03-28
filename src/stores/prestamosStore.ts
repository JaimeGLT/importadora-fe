import { create } from 'zustand'
import type { Prestamo } from '@/types'

interface PrestamosState {
  prestamos: Prestamo[]
  setPrestamos: (prestamos: Prestamo[]) => void
  addPrestamo: (prestamo: Prestamo) => void
}

export const usePrestamosStore = create<PrestamosState>((set) => ({
  prestamos: [],
  setPrestamos: (prestamos) => set({ prestamos }),
  addPrestamo: (prestamo) =>
    set((state) => ({ prestamos: [prestamo, ...state.prestamos] })),
}))
