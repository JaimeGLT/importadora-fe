import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Cliente, Compra } from '@/types'

interface ClientesState {
  clientes: Cliente[]
  _hasHydrated: boolean
  setClientes: (clientes: Cliente[]) => void
  addCliente: (cliente: Cliente) => void
  updateCliente: (cliente: Cliente) => void
  removeCliente: (id: string) => void
  toggleActivo: (id: string) => void
  findByCarnet: (carnet: string) => Cliente | undefined
  addCompra: (clienteId: string, compra: Compra) => void
  setHasHydrated: (state: boolean) => void
}

export const useClientesStore = create<ClientesState>()(
  persist(
    (set, get) => ({
      clientes: [],
      _hasHydrated: false,

      setClientes: (clientes) => set({ clientes }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      addCliente: (cliente) =>
        set((state) => ({
          clientes: [cliente, ...state.clientes],
        })),

      updateCliente: (cliente) =>
        set((state) => ({
          clientes: state.clientes.map((c) =>
            c.id === cliente.id ? cliente : c,
          ),
        })),

      removeCliente: (id) =>
        set((state) => ({
          clientes: state.clientes.filter((c) => c.id !== id),
        })),

      toggleActivo: (id) =>
        set((state) => ({
          clientes: state.clientes.map((c) =>
            c.id === id ? { ...c, activo: !c.activo } : c,
          ),
        })),

      findByCarnet: (carnet) =>
        get().clientes.find((c) => c.carnet === carnet),

      addCompra: (clienteId, compra) =>
        set((state) => ({
          clientes: state.clientes.map((c) =>
            c.id === clienteId ? { ...c, compras: [compra, ...c.compras] } : c,
          ),
        })),
    }),
    {
      name: 'clientes-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)