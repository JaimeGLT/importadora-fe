import { create } from 'zustand'
import type { OrdenVenta } from '@/types'
import { useConfigStore } from './configStore'

interface VentasState {
  ordenes: OrdenVenta[]
  setOrdenes: (ordenes: OrdenVenta[]) => void
  addOrden: (orden: OrdenVenta) => void
  updateOrden: (id: string, data: Partial<OrdenVenta>) => void
  marcarItemFaltante: (ordenId: string, itemId: string, cantidad: number) => void
  cancelarOrdenYLiberarStock: (id: string) => void
}

const broadcast = typeof window !== 'undefined'
  ? new BroadcastChannel('ventas-sync')
  : null

export const useVentasStore = create<VentasState>()((set, get) => ({
  ordenes: [],

  setOrdenes: (ordenes) => set({ ordenes }),

  addOrden: (orden) => {
    set((s) => ({ ordenes: [orden, ...s.ordenes] }))
    broadcast?.postMessage({ type: 'sync', ordenes: get().ordenes })
  },

  updateOrden: (id, data) => {
    set((s) => ({
      ordenes: s.ordenes.map((o) =>
        o.id === id ? { ...o, ...data, actualizado_en: new Date().toISOString() } : o,
      ),
    }))
    broadcast?.postMessage({ type: 'sync', ordenes: get().ordenes })
  },

  marcarItemFaltante: (ordenId, itemId, _cantidad) => {
    set((s) => ({
      ordenes: s.ordenes.map((o) => {
        if (o.id !== ordenId) return o
        return {
          ...o,
          items: o.items.map((i) =>
            i.id === itemId ? { ...i, estado: 'faltante' as const } : i,
          ),
        }
      }),
    }))
    broadcast?.postMessage({ type: 'sync', ordenes: get().ordenes })
    broadcast?.postMessage({ type: 'alert', alertType: 'faltante', ordenId, itemId })
  },

  cancelarOrdenYLiberarStock: (id) => {
    set((s) => ({
      ordenes: s.ordenes.map((o) =>
        o.id === id
          ? { ...o, estado: 'cancelada' as const, actualizado_en: new Date().toISOString() }
          : o,
      ),
    }))
    broadcast?.postMessage({ type: 'sync', ordenes: get().ordenes })
    broadcast?.postMessage({ type: 'alert', alertType: 'cancelado', ordenId: id })
  },
}))

// Recibir sync de otras pestañas
broadcast?.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type === 'sync') {
    useVentasStore.getState().setOrdenes(e.data.ordenes as OrdenVenta[])
  }
})

// ─── Expiración automática ──────────────────────────────────────────────────

let expiracionInterval: ReturnType<typeof setInterval> | null = null

export function iniciarTimersExpiracion() {
  if (expiracionInterval) return
  expiracionInterval = setInterval(() => {
    const { ordenes, cancelarOrdenYLiberarStock } = useVentasStore.getState()
    const config = useConfigStore.getState()
    const ahora = Date.now()

    ordenes.forEach((orden) => {
      if (orden.estado === 'pendiente_almacenero' && orden.caduca_en) {
        if (ahora > new Date(orden.caduca_en).getTime()) {
          cancelarOrdenYLiberarStock(orden.id)
          broadcast?.postMessage({ type: 'alert', alertType: 'expirado', ordenId: orden.id })
        }
      }
      if (orden.estado === 'en_preparacion' && orden.aceptado_en) {
        const limite = new Date(orden.aceptado_en).getTime() + config.tiempoCompletarAlmacenero * 60 * 1000
        if (ahora > limite) {
          cancelarOrdenYLiberarStock(orden.id)
          broadcast?.postMessage({ type: 'alert', alertType: 'expirado', ordenId: orden.id })
        }
      }
    })
  }, 5000)
}

export function detenerTimersExpiracion() {
  if (expiracionInterval) {
    clearInterval(expiracionInterval)
    expiracionInterval = null
  }
}
