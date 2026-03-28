import { create } from 'zustand'
import type { Producto, Proveedor, Filters } from '@/types'

interface InventarioState {
  productos: Producto[]
  total: number
  proveedores: Proveedor[]
  filters: Filters
  setProductos: (productos: Producto[], total: number) => void
  setProveedores: (proveedores: Proveedor[]) => void
  setFilters: (filters: Partial<Filters>) => void
  resetFilters: () => void
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  categoria: '',
  estado: '',
  page: 1,
  pageSize: 20,
}

export const useInventarioStore = create<InventarioState>((set) => ({
  productos: [],
  total: 0,
  proveedores: [],
  filters: DEFAULT_FILTERS,

  setProductos: (productos, total) => set({ productos, total }),
  setProveedores: (proveedores) => set({ proveedores }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters, page: 1 } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}))
