import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DescuentoConfig {
  id: string
  nombre: string       // "Familia", "Mecánico", etc.
  porcentaje: number   // 10 = 10% de descuento
  color: string        // para UI: "emerald", "amber", "blue", etc.
  activo: boolean
}

interface ConfigState {
  descuentos: DescuentoConfig[]
  setDescuentos: (descuentos: DescuentoConfig[]) => void
  addDescuento: (descuento: DescuentoConfig) => void
  updateDescuento: (id: string, data: Partial<DescuentoConfig>) => void
  removeDescuento: (id: string) => void
}

const DEFAULT_DESCUENTOS: DescuentoConfig[] = [
  { id: 'familia', nombre: 'Familia', porcentaje: 15, color: 'emerald', activo: true },
  { id: 'mecanico', nombre: 'Mecánico', porcentaje: 10, color: 'blue', activo: true },
  { id: 'mayorista', nombre: 'Mayorista', porcentaje: 5, color: 'amber', activo: true },
  { id: 'amigo', nombre: 'Amigo', porcentaje: 8, color: 'purple', activo: true },
]

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      descuentos: DEFAULT_DESCUENTOS,

      setDescuentos: (descuentos) => set({ descuentos }),

      addDescuento: (descuento) =>
        set((state) => ({
          descuentos: [...state.descuentos, descuento],
        })),

      updateDescuento: (id, data) =>
        set((state) => ({
          descuentos: state.descuentos.map((d) =>
            d.id === id ? { ...d, ...data } : d
          ),
        })),

      removeDescuento: (id) =>
        set((state) => ({
          descuentos: state.descuentos.filter((d) => d.id !== id),
        })),
    }),
    {
      name: 'config-storage',
    }
  )
)

// Helper para calcular precio con descuento
export function calcularPrecioConDescuento(precioBase: number, porcentaje: number): number {
  return precioBase * (1 - porcentaje / 100)
}