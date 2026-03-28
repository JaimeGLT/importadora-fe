import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePrestamosStore } from '@/stores/prestamosStore'
import { useInventarioStore } from '@/stores/inventarioStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button, Input } from '@/components/ui'
import { NuevoPrestamoModal } from './NuevoPrestamoModal'
import { MOCK_PRESTAMOS } from '@/mock/prestamos'
import { MOCK_PRODUCTOS, MOCK_PROVEEDORES } from '@/mock/inventario'
import type { Prestamo } from '@/types'
import toast from 'react-hot-toast'

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function PrestamosPage() {
  // 1. Auth
  const { isTokenReady } = useAuth()

  // 2. Estado local
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch]       = useState('')

  // 3. Stores
  const { prestamos, setPrestamos, addPrestamo } = usePrestamosStore()
  const { productos, setProductos, setProveedores } = useInventarioStore()

  // 4. Fetch mock
  useEffect(() => {
    if (!isTokenReady) return
    if (prestamos.length === 0) setPrestamos(MOCK_PRESTAMOS)
    if (productos.length === 0) {
      setProductos(MOCK_PRODUCTOS, MOCK_PRODUCTOS.length)
      setProveedores(MOCK_PROVEEDORES)
    }
  }, [isTokenReady, prestamos.length, productos.length, setPrestamos, setProductos, setProveedores])

  // 5. Datos derivados
  const q = search.toLowerCase()
  const listado = q
    ? prestamos.filter(
        (p) =>
          p.producto_nombre.toLowerCase().includes(q) ||
          p.producto_codigo.toLowerCase().includes(q) ||
          p.prestado_a.toLowerCase().includes(q),
      )
    : prestamos

  const totalBs = listado.reduce((s, p) => s + p.precio_total, 0)

  // 6. Handler
  const handleSave = (data: Omit<Prestamo, 'id' | 'creado_en'>) => {
    const nuevo: Prestamo = { ...data, id: crypto.randomUUID(), creado_en: new Date().toISOString() }
    addPrestamo(nuevo)

    // Descontar stock
    const updated = productos.map((p) =>
      p.id === nuevo.producto_id
        ? { ...p, stock: p.stock - nuevo.cantidad, actualizado_en: new Date().toISOString() }
        : p,
    )
    setProductos(updated, updated.length)
    toast.success('Préstamo registrado')
    setModalOpen(false)
  }

  // 7. Render
  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Préstamos"
          description={`${listado.length} registro${listado.length !== 1 ? 's' : ''}`}
          actions={
            <Button
              onClick={() => setModalOpen(true)}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Nuevo préstamo
            </Button>
          }
        />

        {/* Búsqueda */}
        <div className="flex items-center gap-3 mb-4">
          <Input
            placeholder="Buscar por producto, código o persona…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            }
            className="w-72"
          />
          {listado.length > 0 && (
            <p className="text-sm text-steel-500 ml-auto">
              Total: <strong className="text-steel-900">Bs {totalBs.toFixed(2)}</strong>
            </p>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-steel-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-100 bg-steel-50">
                <th className="px-4 py-3 text-left font-medium text-steel-500">Producto</th>
                <th className="px-4 py-3 text-left font-medium text-steel-500 w-40">Prestado a</th>
                <th className="px-4 py-3 text-center font-medium text-steel-500 w-20">Cant.</th>
                <th className="px-4 py-3 text-right font-medium text-steel-500 w-32">Precio unit.</th>
                <th className="px-4 py-3 text-right font-medium text-steel-500 w-32">Total</th>
                <th className="px-4 py-3 text-left font-medium text-steel-500 w-32">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {listado.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-steel-400 text-sm">
                    No hay registros de préstamos
                  </td>
                </tr>
              ) : (
                listado.map((pr) => (
                  <tr key={pr.id} className="hover:bg-steel-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-steel-900">{pr.producto_nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                          {pr.producto_codigo}
                        </span>
                        {pr.notas && (
                          <span className="text-xs text-steel-400 truncate max-w-[180px]">{pr.notas}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-steel-700">{pr.prestado_a}</td>
                    <td className="px-4 py-3 text-center font-medium text-steel-900">{pr.cantidad}</td>
                    <td className="px-4 py-3 text-right text-steel-600">Bs {pr.precio_unitario.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-steel-900">
                      Bs {pr.precio_total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-steel-500 text-sm">{formatFecha(pr.fecha)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {listado.length > 1 && (
              <tfoot>
                <tr className="border-t border-steel-200 bg-steel-50">
                  <td colSpan={4} className="px-4 py-2.5 text-sm font-medium text-steel-500 text-right">
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-steel-900">
                    Bs {totalBs.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </PageContainer>

      <NuevoPrestamoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        productos={productos}
      />
    </MainLayout>
  )
}
