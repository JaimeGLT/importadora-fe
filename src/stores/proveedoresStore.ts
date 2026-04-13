import { create } from 'zustand'
import type { Proveedor, ProductoProveedor, EvaluacionProveedor } from '@/types'

interface ProveedoresState {
  proveedores: Proveedor[]
  productosProveedor: ProductoProveedor[]
  evaluaciones: EvaluacionProveedor[]

  setProveedores: (items: Proveedor[]) => void
  addProveedor: (item: Proveedor) => void
  updateProveedor: (id: string, data: Partial<Proveedor>) => void

  setProductosProveedor: (items: ProductoProveedor[]) => void
  addProductoProveedor: (item: ProductoProveedor) => void
  updateProductoProveedor: (id: string, data: Partial<ProductoProveedor>) => void
  deleteProductoProveedor: (id: string) => void

  setEvaluaciones: (items: EvaluacionProveedor[]) => void
  addEvaluacion: (item: EvaluacionProveedor) => void
}

export const useProveedoresStore = create<ProveedoresState>((set) => ({
  proveedores: [],
  productosProveedor: [],
  evaluaciones: [],

  setProveedores: (proveedores) => set({ proveedores }),
  addProveedor: (item) =>
    set((s) => ({ proveedores: [item, ...s.proveedores] })),
  updateProveedor: (id, data) =>
    set((s) => ({
      proveedores: s.proveedores.map((p) =>
        p.id === id ? { ...p, ...data, actualizado_en: new Date().toISOString() } : p,
      ),
    })),

  setProductosProveedor: (productosProveedor) => set({ productosProveedor }),
  addProductoProveedor: (item) =>
    set((s) => ({ productosProveedor: [...s.productosProveedor, item] })),
  updateProductoProveedor: (id, data) =>
    set((s) => ({
      productosProveedor: s.productosProveedor.map((p) =>
        p.id === id ? { ...p, ...data } : p,
      ),
    })),
  deleteProductoProveedor: (id) =>
    set((s) => ({ productosProveedor: s.productosProveedor.filter((p) => p.id !== id) })),

  setEvaluaciones: (evaluaciones) => set({ evaluaciones }),
  addEvaluacion: (item) =>
    set((s) => ({ evaluaciones: [item, ...s.evaluaciones] })),
}))
