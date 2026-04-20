import { create } from 'zustand'
import type { OrdenVenta } from '@/types'
import { MOCK_ORDENES } from '@/mock/ventas'

interface VentasState {
  ordenes: OrdenVenta[]
  setOrdenes: (ordenes: OrdenVenta[]) => void
  addOrden: (orden: OrdenVenta) => void
  updateOrden: (id: string, data: Partial<OrdenVenta>) => void
}

const broadcast = typeof window !== 'undefined'
  ? new BroadcastChannel('ventas-sync')
  : null

export const useVentasStore = create<VentasState>()((set, get) => ({
  ordenes: MOCK_ORDENES,

  setOrdenes: (ordenes) => set({ ordenes }),

  addOrden: (orden) => {
    set(s => ({ ordenes: [orden, ...s.ordenes] }))
    broadcast?.postMessage({ type: 'sync', ordenes: get().ordenes })
  },

  updateOrden: (id, data) => {
    set(s => ({
      ordenes: s.ordenes.map(o =>
        o.id === id ? { ...o, ...data, actualizado_en: new Date().toISOString() } : o,
      ),
    }))
    broadcast?.postMessage({ type: 'sync', ordenes: get().ordenes })
  },
}))

// Recibir cambios de otras pestañas
broadcast?.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type === 'sync') {
    useVentasStore.getState().setOrdenes(e.data.ordenes as OrdenVenta[])
  }
})
