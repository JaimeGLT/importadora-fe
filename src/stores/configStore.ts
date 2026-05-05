import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DescuentoConfig {
  id: string
  nombre: string       // "Familia", "Mecánico", etc.
  porcentaje: number   // 10 = 10% de descuento
  color: string        // para UI: "emerald", "amber", "blue", etc.
  activo: boolean
}

export type ModoPrecioCajero = 'solo_importacion' | 'solo_dolar_hoy' | 'ambos'

interface ConfigState {
  descuentos: DescuentoConfig[]
  setDescuentos: (descuentos: DescuentoConfig[]) => void
  addDescuento: (descuento: DescuentoConfig) => void
  updateDescuento: (id: string, data: Partial<DescuentoConfig>) => void
  removeDescuento: (id: string) => void

  tipoCambioHoy: number
  tipoCambioFecha: string
  tipoCambioHabilitado: boolean
  tipoCambioFechaRecordatorio: string
  margenGanancia: number
  modoPrecioCajero: ModoPrecioCajero
  setTipoCambio: (tipoCambio: number) => void
  setMargenGanancia: (margen: number) => void
  setModoPrecioCajero: (modo: ModoPrecioCajero) => void
  setTipoCambioHabilitado: (habilitado: boolean) => void
  setTipoCambioFechaRecordatorio: (fecha: string) => void
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

      tipoCambioHoy: 0,
      tipoCambioFecha: '',
      tipoCambioHabilitado: false,
      tipoCambioFechaRecordatorio: '',
      margenGanancia: 1.20,
      modoPrecioCajero: 'solo_importacion',

      setTipoCambio: (tipoCambio) =>
        set({
          tipoCambioHoy: tipoCambio,
          tipoCambioFecha: new Date().toISOString().split('T')[0],
        }),

      setMargenGanancia: (margen) => set({ margenGanancia: margen }),

      setModoPrecioCajero: (modo) => set({ modoPrecioCajero: modo }),

      setTipoCambioHabilitado: (habilitado) => set({ tipoCambioHabilitado: habilitado }),

      setTipoCambioFechaRecordatorio: (fecha) => set({ tipoCambioFechaRecordatorio: fecha }),
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

// Helper para calcular precio con dólar de hoy
export function calcularPrecioDolarHoy(
  precioCostoBs: number,
  tipoCambioImportacion: number,
  tipoCambioHoy: number,
  margen: number
): number {
  if (tipoCambioImportacion <= 0 || margen <= 0) return 0
  return (precioCostoBs / tipoCambioImportacion) * tipoCambioHoy * margen
}