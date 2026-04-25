import { create } from 'zustand'
import type { Producto, Proveedor, Filters } from '@/types'

interface InventarioState {
  productos: Producto[]
  total: number
  proveedores: Proveedor[]
  filters: Filters
  sorting: import('@tanstack/react-table').SortingState
  selectedRows: Set<string>
  modalOpen: boolean
  importOpen: boolean
  setProductos: (productos: Producto[], total: number) => void
  setProveedores: (proveedores: Proveedor[]) => void
  setFilters: (filters: Partial<Filters>) => void
  resetFilters: () => void
  addProducto: (producto: Producto) => void
  updateProducto: (producto: Producto) => void
  removeProducto: (id: string) => void
  reservarStock: (id: string, qty: number) => void
  liberarReserva: (id: string, qty: number) => void
  confirmarSalida: (id: string, qty: number) => void
  setSorting: (sorting: import('@tanstack/react-table').SortingState) => void
  toggleRowSelection: (id: string) => void
  clearSelection: () => void
  setModalOpen: (open: boolean) => void
  setImportOpen: (open: boolean) => void
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  categoria: '',
  estado: '',
  page: 1,
  pageSize: 20,
}

export const useInventarioStore = create<InventarioState>()((set) => ({
  productos: [],
  total: 0,
  proveedores: [],
  filters: DEFAULT_FILTERS,
  sorting: [],
  selectedRows: new Set(),
  modalOpen: false,
  importOpen: false,

  setProductos: (productos, total) => set({ productos, total }),
  setProveedores: (proveedores) => set({ proveedores }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters, page: 1 } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  addProducto: (producto) =>
    set((state) => ({
      productos: [producto, ...state.productos],
      total: state.total + 1,
    })),
  updateProducto: (producto) =>
    set((state) => ({
      productos: state.productos.map(p =>
        p.id === producto.id ? producto : p,
      ),
    })),
  removeProducto: (id) =>
    set((state) => ({
      productos: state.productos.filter(p => p.id !== id),
      total: Math.max(0, state.total - 1),
    })),
  reservarStock: (id, qty) =>
    set((state) => ({
      productos: state.productos.map(p =>
        p.id === id ? { ...p, stock_reservado: (p.stock_reservado ?? 0) + qty } : p,
      ),
    })),
  liberarReserva: (id, qty) =>
    set((state) => ({
      productos: state.productos.map(p =>
        p.id === id ? { ...p, stock_reservado: Math.max(0, (p.stock_reservado ?? 0) - qty) } : p,
      ),
    })),
  confirmarSalida: (id, qty) =>
    set((state) => ({
      productos: state.productos.map(p =>
        p.id === id
          ? {
              ...p,
              stock: Math.max(0, p.stock - qty),
              stock_reservado: Math.max(0, (p.stock_reservado ?? 0) - qty),
            }
          : p,
      ),
    })),

  setSorting: (sorting) => set({ sorting }),

  toggleRowSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedRows)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedRows: next }
    }),

  clearSelection: () => set({ selectedRows: new Set() }),

  setModalOpen: (open) => set({ modalOpen: open }),
  setImportOpen: (open) => set({ importOpen: open }),
}))