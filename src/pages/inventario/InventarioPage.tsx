import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useInventarioStore } from '@/stores/inventarioStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button, Input, Select, Badge, ConfirmModal } from '@/components/ui'
import { MOCK_PRODUCTOS, MOCK_PROVEEDORES } from '@/mock/inventario'
import type { Producto, CategoriaProducto } from '@/types'
import { ProductoModal } from './ProductoModal'
import { ImportarExcelModal } from './ImportarExcelModal'
import { EtiquetaModal } from './EtiquetaModal'
import { NuevoPrestamoModal } from './NuevoPrestamoModal'
import { usePrestamosStore } from '@/stores/prestamosStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const CATEGORIAS: CategoriaProducto[] = [
  'Motor', 'Transmisión', 'Suspensión', 'Frenos',
  'Eléctrico', 'Carrocería', 'Enfriamiento', 'Escape', 'Otro',
]

function estadoColor(estado: Producto['estado']): 'green' | 'red' | 'gray' {
  if (estado === 'activo') return 'green'
  if (estado === 'sin_stock') return 'red'
  return 'gray'
}

function estadoLabel(estado: Producto['estado']): string {
  if (estado === 'activo') return 'Activo'
  if (estado === 'sin_stock') return 'Sin stock'
  return 'Descontinuado'
}

function matchSearch(p: Producto, q: string): boolean {
  if (!q) return true
  const lower = q.toLowerCase()
  return (
    p.codigo_universal.toLowerCase().includes(lower) ||
    p.nombre.toLowerCase().includes(lower) ||
    p.marca.toLowerCase().includes(lower) ||
    p.codigos_alternativos.some((c) => c.toLowerCase().includes(lower))
  )
}

export function InventarioPage() {
  // 1. Auth
  const { isTokenReady } = useAuth()

  // 2. Estado local
  const [modalOpen, setModalOpen]               = useState(false)
  const [importOpen, setImportOpen]             = useState(false)
  const [etiquetaProducto, setEtiquetaProducto] = useState<Producto | null>(null)
  const [prestamoProducto, setPrestamoProducto] = useState<Producto | null>(null)
  const [editingProducto, setEditingProducto]   = useState<Producto | null>(null)
  const [confirmDelete, setConfirmDelete]       = useState<Producto | null>(null)
  const [deleting, setDeleting]                 = useState(false)

  // 3. Stores
  const { productos, proveedores, filters, setProductos, setProveedores, setFilters } =
    useInventarioStore()
  const { addPrestamo } = usePrestamosStore()

  // 4. Fetch con isTokenReady (mock por ahora)
  useEffect(() => {
    if (!isTokenReady) return
    setProductos(MOCK_PRODUCTOS, MOCK_PRODUCTOS.length)
    setProveedores(MOCK_PROVEEDORES)
  }, [isTokenReady, setProductos, setProveedores])

  // 5. Datos derivados
  const filtered = useMemo(() => {
    const q = filters.search?.trim() ?? ''
    return productos.filter((p) => {
      const matchCat = !filters.categoria || p.categoria === filters.categoria
      const matchEst = !filters.estado || p.estado === filters.estado
      return matchSearch(p, q) && matchCat && matchEst
    })
  }, [productos, filters])

  const stockBajo = useMemo(
    () => productos.filter((p) => p.stock <= p.stock_minimo && p.estado !== 'descontinuado').length,
    [productos],
  )

  // 6. Handlers
  const handleEdit = (p: Producto) => { setEditingProducto(p); setModalOpen(true) }
  const handleNew  = () => { setEditingProducto(null); setModalOpen(true) }

  const handleSave = (data: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>) => {
    if (editingProducto) {
      const updated = productos.map((p) =>
        p.id === editingProducto.id
          ? { ...p, ...data, actualizado_en: new Date().toISOString() }
          : p,
      )
      setProductos(updated, updated.length)
      toast.success('Producto actualizado')
    } else {
      const nuevo: Producto = {
        ...data,
        id: crypto.randomUUID(),
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      }
      setProductos([nuevo, ...productos], productos.length + 1)
      toast.success('Producto creado')
    }
    setModalOpen(false)
  }

  const handleNuevoPrestamo = (data: Omit<import('@/types').Prestamo, 'id' | 'creado_en'>) => {
    const nuevo: import('@/types').Prestamo = { ...data, id: crypto.randomUUID(), creado_en: new Date().toISOString() }
    addPrestamo(nuevo)
    const updated = productos.map((p) =>
      p.id === nuevo.producto_id
        ? { ...p, stock: p.stock - nuevo.cantidad, actualizado_en: new Date().toISOString() }
        : p,
    )
    setProductos(updated, updated.length)
    toast.success('Préstamo registrado')
    setPrestamoProducto(null)
  }

  const handleImport = (nuevos: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>[]) => {
    const ahora = new Date().toISOString()
    const conId: Producto[] = nuevos.map((p) => ({
      ...p,
      id: crypto.randomUUID(),
      creado_en: ahora,
      actualizado_en: ahora,
    }))
    setProductos([...conId, ...productos], productos.length + conId.length)
    toast.success(`${conId.length} producto${conId.length !== 1 ? 's' : ''} importados`)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    await new Promise((r) => setTimeout(r, 500))
    const updated = productos.filter((p) => p.id !== confirmDelete.id)
    setProductos(updated, updated.length)
    toast.success('Producto eliminado')
    setDeleting(false)
    setConfirmDelete(null)
  }

  // 7. Datos para métricas
  const totalUnidades = productos.reduce((s, p) => s + p.stock, 0)

  // 8. Render
  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Inventario"
          actions={
            <>
              <Button variant="secondary" onClick={() => setImportOpen(true)} icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              }>
                Importar Excel
              </Button>
              <Button onClick={handleNew} icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }>
                Nuevo producto
              </Button>
            </>
          }
        />

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MetricCard
            label="Productos"
            value={productos.length}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V11" />
              </svg>
            }
          />
          <MetricCard
            label="Unidades en stock"
            value={totalUnidades.toLocaleString()}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <MetricCard
            label="Stock bajo"
            value={stockBajo}
            warn={stockBajo > 0}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            }
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <Input
            placeholder="Buscar por nombre, código o marca…"
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value })}
            leftIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            }
            className="w-64"
          />
          <Select
            value={filters.categoria ?? ''}
            onChange={(e) => setFilters({ categoria: e.target.value as CategoriaProducto | '' })}
            options={CATEGORIAS.map((c) => ({ value: c, label: c }))}
            placeholder="Categoría"
            className="w-40"
          />
          <Select
            value={filters.estado ?? ''}
            onChange={(e) => setFilters({ estado: e.target.value as Producto['estado'] | '' })}
            options={[
              { value: 'activo',        label: 'Activo' },
              { value: 'sin_stock',     label: 'Sin stock' },
              { value: 'descontinuado', label: 'Descontinuado' },
            ]}
            placeholder="Estado"
            className="w-36"
          />
          <span className="ml-auto text-sm text-steel-400">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Lista de productos */}
        {!isTokenReady ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-steel-300 text-sm">No se encontraron productos</p>
          </div>
        ) : (
          <>
          {/* Header de columnas */}
          <div className="flex items-center gap-4 px-5 pb-1 mb-1">
            <div className="w-11 shrink-0" />
            <div className="flex-1 text-xs font-semibold text-steel-400 uppercase tracking-wide">Producto</div>
            <div className="hidden md:block shrink-0 w-24 text-xs font-semibold text-steel-400 uppercase tracking-wide">Categoría</div>
            <div className="shrink-0 w-24 text-xs font-semibold text-steel-400 uppercase tracking-wide text-right">Stock</div>
            <div className="shrink-0 w-28 text-xs font-semibold text-steel-400 uppercase tracking-wide text-right">Precio</div>
            <div className="shrink-0 w-36" />
          </div>

          <div className="space-y-1">
            {filtered.map((p) => {
              const altCodes  = p.codigos_alternativos.filter(Boolean)
              const stockBajo = p.stock > 0 && p.stock <= p.stock_minimo
              const sinStock  = p.stock === 0
              const catStyle  = categoriaStyle(p.categoria)
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-steel-100 px-5 py-3 hover:border-steel-200 hover:shadow-sm transition-all duration-150"
                >
                  <div className="flex items-center gap-4">

                    {/* Ícono de producto */}
                    <div className={clsx(
                      'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
                      catStyle.bg, catStyle.text,
                    )}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10zm0 0h2l3-5h-3.5M13 16H9m8.5-5H17l1 5" />
                      </svg>
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-steel-900 text-[15px] leading-snug">
                          {p.nombre}
                        </span>
                        <Badge color={estadoColor(p.estado)}>{estadoLabel(p.estado)}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="font-mono text-[11px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md">
                          {p.codigo_universal}
                        </span>
                        {altCodes.map((c) => (
                          <span key={c} className="font-mono text-[11px] text-steel-400 bg-steel-100 px-1.5 py-0.5 rounded-md">
                            {c}
                          </span>
                        ))}
                        {(p.marca || p.vehiculo) && (
                          <span className="text-xs text-steel-400">
                            {p.marca}{p.vehiculo ? ` · ${p.vehiculo}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Categoría */}
                    <div className="hidden md:block shrink-0">
                      <span className="text-xs text-steel-400 px-2.5 py-1 rounded-full bg-steel-50 border border-steel-100">
                        {p.categoria}
                      </span>
                    </div>

                    {/* Stock */}
                    <div className="shrink-0 text-right w-24">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className={clsx(
                          'w-2 h-2 rounded-full shrink-0',
                          sinStock  ? 'bg-red-400' :
                          stockBajo ? 'bg-amber-400' : 'bg-emerald-400',
                        )} />
                        <span className={clsx(
                          'font-bold text-base',
                          sinStock  ? 'text-red-500' :
                          stockBajo ? 'text-amber-600' : 'text-steel-900',
                        )}>
                          {p.stock}
                        </span>
                        <span className="text-xs text-steel-300">/{p.stock_minimo}</span>
                      </div>
                      <p className="text-[11px] text-steel-400 mt-0.5 capitalize">{p.unidad}</p>
                    </div>

                    {/* Precio */}
                    <div className="shrink-0 text-right w-28">
                      <p className="font-bold text-steel-900 text-base">
                        Bs {p.precio_venta.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-steel-400 mt-0.5">{p.ubicacion}</p>
                    </div>

                    {/* Acciones */}
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => setPrestamoProducto(p)}
                        disabled={p.stock === 0}
                        className="p-1.5 rounded-lg text-steel-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Registrar préstamo"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEtiquetaProducto(p)}
                        className="p-1.5 rounded-lg text-steel-400 hover:text-steel-700 hover:bg-steel-100 transition-colors"
                        title="Imprimir etiqueta"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-1.5 rounded-lg text-steel-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Editar"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="p-1.5 rounded-lg text-steel-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </PageContainer>

      <NuevoPrestamoModal
        open={!!prestamoProducto}
        onClose={() => setPrestamoProducto(null)}
        onSave={handleNuevoPrestamo}
        productos={productos}
        productoInicial={prestamoProducto}
      />
      <EtiquetaModal
        open={!!etiquetaProducto}
        onClose={() => setEtiquetaProducto(null)}
        producto={etiquetaProducto}
      />
      <ImportarExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
      <ProductoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        producto={editingProducto}
        proveedores={proveedores}
        categorias={CATEGORIAS}
      />
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar producto"
        message={`¿Estás seguro de eliminar "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        loading={deleting}
      />
    </MainLayout>
  )
}

// ── Helpers de diseño ─────────────────────────────────────────────────────────

function categoriaStyle(_cat: CategoriaProducto) {
  return { bg: 'bg-steel-100', text: 'text-steel-500', pill: 'bg-steel-100 text-steel-500' }
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: number | string
  icon: ReactNode
  warn?: boolean
}

function MetricCard({ label, value, icon, warn = false }: MetricCardProps) {
  return (
    <div className={clsx(
      'rounded-2xl border px-5 py-4 flex items-center gap-4',
      warn ? 'bg-amber-50 border-amber-100' : 'bg-white border-steel-100',
    )}>
      <div className={clsx(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        warn ? 'bg-amber-100 text-amber-600' : 'bg-steel-100 text-steel-500',
      )}>
        {icon}
      </div>
      <div>
        <p className={clsx('text-2xl font-bold leading-none', warn ? 'text-amber-600' : 'text-steel-900')}>
          {value}
        </p>
        <p className="text-xs text-steel-400 mt-1">{label}</p>
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-steel-100 px-5 py-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-steel-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-steel-100 rounded-lg" />
              <div className="flex gap-2">
                <div className="h-3.5 w-20 bg-steel-100 rounded-md" />
                <div className="h-3.5 w-28 bg-steel-50 rounded-md" />
              </div>
            </div>
            <div className="h-5 w-20 bg-steel-100 rounded-full" />
            <div className="h-6 w-12 bg-steel-100 rounded-lg" />
            <div className="h-6 w-20 bg-steel-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
