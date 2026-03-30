import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useInventarioStore } from '@/stores/inventarioStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button, Input, Select, ConfirmModal } from '@/components/ui'
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
  const [expandedId, setExpandedId]             = useState<string | null>(null)

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
  const totalActivos  = productos.filter((p) => p.estado === 'activo').length

  // 8. Render
  const COL = '2fr 110px 100px 130px 120px'

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
              } title="Importar Excel">
                <span className="hidden sm:inline">Importar Excel</span>
              </Button>
              <Button onClick={handleNew} icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              } title="Nuevo producto">
                <span className="hidden sm:inline">Nuevo producto</span>
              </Button>
            </>
          }
        />

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <MetricCard
            label="Productos"
            value={productos.length}
            sublabel={`${totalActivos} activos`}
            bg="#DDE8FF"
            valueColor="#1A40C4"
            sublabelColor="#5270C8"
          />
          <MetricCard
            label="Unidades en stock"
            value={totalUnidades.toLocaleString()}
            sublabel="total disponible"
            bg="#C9F5E5"
            valueColor="#0A6645"
            sublabelColor="#2A8A60"
          />
          <MetricCard
            label="Stock bajo"
            value={stockBajo}
            sublabel="requieren reposición"
            warn={stockBajo > 0}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-4">
          {/* Buscador — ancho completo en mobile */}
          <div className="w-full sm:w-64">
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
            />
          </div>

          {/* Selects — mitad cada uno en mobile, ancho fijo en desktop */}
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-40">
              <Select
                value={filters.categoria ?? ''}
                onChange={(e) => setFilters({ categoria: e.target.value as CategoriaProducto | '' })}
                options={CATEGORIAS.map((c) => ({ value: c, label: c }))}
                placeholder="Categoría"
              />
            </div>
            <div className="flex-1 sm:w-36">
              <Select
                value={filters.estado ?? ''}
                onChange={(e) => setFilters({ estado: e.target.value as Producto['estado'] | '' })}
                options={[
                  { value: 'activo',        label: 'Activo' },
                  { value: 'sin_stock',     label: 'Sin stock' },
                  { value: 'descontinuado', label: 'Descontinuado' },
                ]}
                placeholder="Estado"
              />
            </div>
          </div>

          {/* Contador */}
          <span className="text-[12px] text-steel-400 sm:ml-auto">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Lista */}
        {!isTokenReady ? (
          <ListSkeleton cols={COL} />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[13px] text-steel-300">No se encontraron productos</p>
          </div>
        ) : (
          <>
            {/* ── Desktop ─────────────────────────────────────────── */}
            <div className="hidden md:block">
              <div
                className="grid items-center px-4 pb-1.5 mb-0.5"
                style={{ gridTemplateColumns: COL, gap: '0 16px' }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">Producto</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">Categoría</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-steel-400 text-right">Stock</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-steel-400 text-right">Precio</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-steel-400 text-right">Acciones</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filtered.map((p) => {
                  const altCodes    = p.codigos_alternativos.filter(Boolean)
                  const esStockBajo = p.stock > 0 && p.stock <= p.stock_minimo
                  const sinStock    = p.stock === 0
                  return (
                    <div
                      key={p.id}
                      className="bg-white grid items-center px-4 py-3 rounded-lg transition-colors hover:bg-steel-50"
                      style={{
                        gridTemplateColumns: COL,
                        gap: '0 16px',
                        border: '0.5px solid #D1D1D1',
                        borderLeft: sinStock ? '3px solid #E24B4A' : '0.5px solid #D1D1D1',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-medium text-steel-900 leading-snug">{p.nombre}</span>
                          <StateBadge estado={p.estado} />
                        </div>
                        {(p.marca || p.vehiculo) && (
                          <p className="text-[12px] text-steel-400 mt-0.5">
                            {p.marca}{p.vehiculo ? ` · ${p.vehiculo}` : ''}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <CodePill color="brand">{p.codigo_universal}</CodePill>
                          {altCodes.map((c) => <CodePill key={c}>{c}</CodePill>)}
                        </div>
                      </div>
                      <span className="text-[12px] text-steel-500">{p.categoria}</span>
                      <StockCell stock={p.stock} min={p.stock_minimo} unidad={p.unidad} sinStock={sinStock} bajo={esStockBajo} />
                      <div className="text-right">
                        <span className="text-[14px] font-semibold text-steel-900">Bs {p.precio_venta.toFixed(2)}</span>
                        <p className="text-[11px] text-steel-400 mt-0.5">{p.ubicacion}</p>
                      </div>
                      <ActionButtons
                        sinStock={sinStock}
                        onPrestamo={() => setPrestamoProducto(p)}
                        onEtiqueta={() => setEtiquetaProducto(p)}
                        onEdit={() => handleEdit(p)}
                        onDelete={() => setConfirmDelete(p)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Mobile ──────────────────────────────────────────── */}
            <div className="md:hidden flex flex-col gap-1.5">
              {filtered.map((p) => (
                <MobileCard
                  key={p.id}
                  producto={p}
                  expanded={expandedId === p.id}
                  onToggle={() => setExpandedId((id) => (id === p.id ? null : p.id))}
                  onPrestamo={() => setPrestamoProducto(p)}
                  onEtiqueta={() => setEtiquetaProducto(p)}
                  onEdit={() => handleEdit(p)}
                  onDelete={() => setConfirmDelete(p)}
                />
              ))}
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

// ── Sub-componentes ───────────────────────────────────────────────────────────

// ── Componentes atómicos reutilizables ───────────────────────────────────────

function CodePill({ children, color }: { children: string; color?: 'brand' }) {
  return (
    <span
      className={clsx('font-mono text-[11px] px-1.5 py-px rounded', color === 'brand' ? 'text-brand-600' : 'text-steel-500')}
      style={{ background: '#F5F5F5', border: '0.5px solid #D1D1D1' }}
    >
      {children}
    </span>
  )
}

function StockCell({ stock, min, unidad, sinStock, bajo }: {
  stock: number; min: number; unidad: string; sinStock: boolean; bajo: boolean
}) {
  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1.5">
        <div className="rounded-full shrink-0" style={{
          width: 6, height: 6,
          background: sinStock ? '#E24B4A' : bajo ? '#D97706' : '#639922',
        }} />
        <span className="font-medium leading-none" style={{
          fontSize: 16,
          color: sinStock ? '#E24B4A' : bajo ? '#D97706' : '#1A1A1A',
        }}>
          {stock}
        </span>
      </div>
      <p className="text-[11px] text-steel-400 mt-0.5">
        mín. {min} · <span className="capitalize">{unidad}</span>
      </p>
    </div>
  )
}

interface ActionButtonsProps {
  sinStock: boolean
  onPrestamo: () => void
  onEtiqueta: () => void
  onEdit: () => void
  onDelete: () => void
  className?: string
}

function ActionButtons({ sinStock, onPrestamo, onEtiqueta, onEdit, onDelete, className }: ActionButtonsProps) {
  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <button onClick={onPrestamo} disabled={sinStock}
        className="p-1.5 rounded text-steel-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
        title="Registrar préstamo">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </button>
      <button onClick={onEtiqueta}
        className="p-1.5 rounded text-steel-400 hover:text-steel-700 hover:bg-steel-100 transition-colors"
        title="Imprimir etiqueta">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      </button>
      <button onClick={onEdit}
        className="p-1.5 rounded text-steel-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        title="Editar">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button onClick={onDelete}
        className="p-1.5 rounded text-steel-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Eliminar">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

// ── Tarjeta mobile expandible ─────────────────────────────────────────────────

interface MobileCardProps {
  producto: Producto
  expanded: boolean
  onToggle: () => void
  onPrestamo: () => void
  onEtiqueta: () => void
  onEdit: () => void
  onDelete: () => void
}

function MobileCard({ producto: p, expanded, onToggle, onPrestamo, onEtiqueta, onEdit, onDelete }: MobileCardProps) {
  const sinStock    = p.stock === 0
  const bajo        = p.stock > 0 && p.stock <= p.stock_minimo
  const altCodes    = p.codigos_alternativos.filter(Boolean)
  const stockColor  = sinStock ? '#E24B4A' : bajo ? '#D97706' : '#639922'

  return (
    <div
      className="bg-white rounded-lg overflow-hidden"
      style={{
        border: '0.5px solid #D1D1D1',
        borderLeft: sinStock ? '3px solid #E24B4A' : '0.5px solid #D1D1D1',
      }}
    >
      {/* Fila siempre visible — tap para expandir */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-medium text-steel-900 leading-snug">{p.nombre}</span>
            <StateBadge estado={p.estado} />
          </div>
          {(p.marca || p.vehiculo) && (
            <p className="text-[12px] text-steel-400 mt-0.5 truncate">
              {p.marca}{p.vehiculo ? ` · ${p.vehiculo}` : ''}
            </p>
          )}
        </div>

        {/* Stock + precio */}
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <div className="rounded-full" style={{ width: 6, height: 6, background: stockColor }} />
            <span className="text-[15px] font-medium" style={{ color: stockColor }}>{p.stock}</span>
          </div>
          <span className="text-[13px] font-semibold text-steel-900">Bs {p.precio_venta.toFixed(2)}</span>
        </div>

        {/* Chevron */}
        <svg
          className={clsx('h-4 w-4 text-steel-300 shrink-0 transition-transform duration-200', expanded && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detalle expandible */}
      <div className={clsx(
        'overflow-hidden transition-all duration-200 ease-in-out',
        expanded ? 'max-h-80' : 'max-h-0',
      )}>
        <div className="px-4 pb-4 pt-2 border-t border-steel-100 space-y-3">

          {/* Códigos */}
          <div className="flex flex-wrap gap-1">
            <CodePill color="brand">{p.codigo_universal}</CodePill>
            {altCodes.map((c) => <CodePill key={c}>{c}</CodePill>)}
          </div>

          {/* Detalles en grid 2 col */}
          <div className="grid grid-cols-2 gap-y-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-steel-400">Categoría</p>
              <p className="text-[13px] text-steel-700 mt-0.5">{p.categoria}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-steel-400">Stock mín.</p>
              <p className="text-[13px] text-steel-700 mt-0.5 capitalize">{p.stock_minimo} · {p.unidad}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-steel-400">Ubicación</p>
              <p className="text-[13px] text-steel-700 mt-0.5">{p.ubicacion}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-steel-400">Precio costo</p>
              <p className="text-[13px] text-steel-700 mt-0.5">Bs {p.precio_costo.toFixed(2)}</p>
            </div>
          </div>

          {/* Acciones */}
          <ActionButtons
            sinStock={sinStock}
            onPrestamo={onPrestamo}
            onEtiqueta={onEtiqueta}
            onEdit={onEdit}
            onDelete={onDelete}
            className="pt-1 justify-start"
          />
        </div>
      </div>
    </div>
  )
}

function StateBadge({ estado }: { estado: Producto['estado'] }) {
  if (estado === 'activo') return (
    <span style={{ background: '#EAF3DE', color: '#3B6D11', borderRadius: 99, fontSize: 11, padding: '2px 8px', fontWeight: 500, lineHeight: 1 }}>
      Activo
    </span>
  )
  if (estado === 'sin_stock') return (
    <span style={{ background: '#FCEBEB', color: '#A32D2D', borderRadius: 99, fontSize: 11, padding: '2px 8px', fontWeight: 500, lineHeight: 1 }}>
      Sin stock
    </span>
  )
  return (
    <span style={{ background: '#F5F5F5', color: '#6B7280', borderRadius: 99, fontSize: 11, padding: '2px 8px', fontWeight: 500, lineHeight: 1 }}>
      Descontinuado
    </span>
  )
}

interface MetricCardProps {
  label: string
  value: number | string
  sublabel: string
  warn?: boolean
  bg?: string
  valueColor?: string
  sublabelColor?: string
}

function MetricCard({ label, value, sublabel, warn = false, bg, valueColor, sublabelColor }: MetricCardProps) {
  const isWarn = warn && Number(value) > 0
  const bgColor      = isWarn ? '#FAEEDA' : (bg ?? '#F5F5F5')
  const numColor     = isWarn ? '#7C4214' : (valueColor ?? '#1A1A1A')
  const subColor     = isWarn ? '#A06030' : (sublabelColor ?? '#8C8C8C')
  const labelColor   = isWarn ? '#A06030' : (sublabelColor ?? '#8C8C8C')
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: bgColor }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: labelColor }}>{label}</p>
      <p className="font-bold leading-none" style={{ fontSize: 28, color: numColor }}>{value}</p>
      <p className="text-[11px] mt-1.5" style={{ color: subColor }}>{sublabel}</p>
    </div>
  )
}

function ListSkeleton({ cols }: { cols: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="grid items-center px-4 py-3 rounded-lg animate-pulse"
          style={{ gridTemplateColumns: cols, gap: '0 16px', background: '#F5F5F5', border: '0.5px solid #D1D1D1' }}
        >
          <div className="space-y-2">
            <div className="h-3.5 w-48 bg-steel-200 rounded" />
            <div className="h-3 w-24 bg-steel-200 rounded" />
            <div className="flex gap-1.5">
              <div className="h-3 w-16 bg-steel-200 rounded" />
              <div className="h-3 w-20 bg-steel-200 rounded" />
            </div>
          </div>
          <div className="h-3 w-16 bg-steel-200 rounded" />
          <div className="h-4 w-10 bg-steel-200 rounded ml-auto" />
          <div className="h-3.5 w-20 bg-steel-200 rounded ml-auto" />
          <div />
        </div>
      ))}
    </div>
  )
}
