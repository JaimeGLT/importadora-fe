import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  updateProductoStock: (productoId: string, delta: number) => void
  addProducto: (producto: Producto) => void
  updateProducto: (producto: Producto) => void
  removeProducto: (id: string) => void
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  categoria: '',
  estado: '',
  page: 1,
  pageSize: 20,
}

export const useInventarioStore = create<InventarioState>()(
  persist(
    (set) => ({
      productos: [],
      total: 0,
      proveedores: [],
      filters: DEFAULT_FILTERS,

      setProductos: (productos, total) => set({ productos, total }),
      setProveedores: (proveedores) => set({ proveedores }),
      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters, page: 1 } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),
      updateProductoStock: (productoId, delta) =>
        set((state) => ({
          productos: state.productos.map(p =>
            p.id === productoId ? { ...p, stock: Math.max(0, p.stock + delta) } : p,
          ),
        })),
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
    }),
    {
      name: 'inventario-storage',
    }
  )
)
