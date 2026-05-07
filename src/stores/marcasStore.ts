import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Marca } from '@/types'

interface MarcasState {
  marcas: Marca[]
  setMarcas: (marcas: Marca[]) => void
  addMarca: (nombre: string) => void
  updateMarca: (id: string, nombre: string) => void
  removeMarca: (id: string) => void
}

export const useMarcasStore = create<MarcasState>()(
  persist(
    (set) => ({
      marcas: [],

      setMarcas: (marcas) => set({ marcas }),

      addMarca: (nombre) =>
        set((state) => ({
          marcas: [
            ...state.marcas,
            {
              id: crypto.randomUUID(),
              nombre,
              creado_en: new Date().toISOString(),
            },
          ],
        })),

      updateMarca: (id, nombre) =>
        set((state) => ({
          marcas: state.marcas.map((m) =>
            m.id === id ? { ...m, nombre } : m
          ),
        })),

      removeMarca: (id) =>
        set((state) => ({
          marcas: state.marcas.filter((m) => m.id !== id),
        })),
    }),
    {
      name: 'marcas-storage',
    }
  )
)