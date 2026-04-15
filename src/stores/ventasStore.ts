import { create } from 'zustand'
import type { OrdenVenta, Reserva, ConfigVentas } from '@/types'

interface VentasState {
  ordenes: OrdenVenta[]
  reservas: Reserva[]
  config: ConfigVentas
  setOrdenes: (ordenes: OrdenVenta[]) => void
  addOrden: (orden: OrdenVenta) => void
  updateOrden: (id: string, data: Partial<OrdenVenta>) => void
  setReservas: (reservas: Reserva[]) => void
  addReserva: (reserva: Reserva) => void
  updateReserva: (id: string, data: Partial<Reserva>) => void
  setConfig: (config: ConfigVentas) => void
}

export const useVentasStore = create<VentasState>((set) => ({
  ordenes: [],
  reservas: [],
  config: { tiempo_alerta_minutos: 10 },

  setOrdenes: (ordenes) => set({ ordenes }),
  addOrden: (orden) => set((s) => ({ ordenes: [orden, ...s.ordenes] })),
  updateOrden: (id, data) =>
    set((s) => ({
      ordenes: s.ordenes.map((o) =>
        o.id === id ? { ...o, ...data, actualizado_en: new Date().toISOString() } : o,
      ),
    })),

  setReservas: (reservas) => set({ reservas }),
  addReserva: (reserva) => set((s) => ({ reservas: [reserva, ...s.reservas] })),
  updateReserva: (id, data) =>
    set((s) => ({
      reservas: s.reservas.map((r) =>
        r.id === id ? { ...r, ...data, actualizado_en: new Date().toISOString() } : r,
      ),
    })),

  setConfig: (config) => set({ config }),
}))
