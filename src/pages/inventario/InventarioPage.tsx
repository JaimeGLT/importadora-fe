import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useInventarioStore } from '@/stores/inventarioStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button, Input, ConfirmModal } from '@/components/ui'
import { MOCK_PRODUCTOS, MOCK_PROVEEDORES } from '@/mock/inventario'
import type { Producto } from '@/types'
import { ProductoModal } from './ProductoModal'
import { ImportarExcelModal } from './ImportarExcelModal'
import { EtiquetaModal } from './EtiquetaModal'
import { NuevoPrestamoModal } from './NuevoPrestamoModal'
import { usePrestamosStore } from '@/stores/prestamosStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

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
    return productos.filter((p) => matchSearch(p, q))
  }, [productos, filters])

  const stockBajo = useMemo(
    () => productos.filter((p) => p.stock <= p.stock_minimo).length,
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
  const COL = '1fr 130px 140px 108px'

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
            sublabel="en catálogo"
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
              placeholder="Buscar por código, nombre o marca…"
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
              {/* Cabecera */}
              <div
                className="grid items-center px-5 pb-2 mb-1"
                style={{ gridTemplateColumns: COL, gap: '0 16px' }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">Códigos / Producto</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-steel-400 text-center">Stock</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-steel-400 text-right">Precio</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-steel-400 text-right">Acciones</span>
              </div>

              {/* Filas */}
              <div className="flex flex-col gap-2">
                {filtered.map((p) => {
                  const allCodes    = [p.codigo_universal, ...p.codigos_alternativos.filter(Boolean)]
                  const esStockBajo = p.stock > 0 && p.stock <= p.stock_minimo
                  const sinStock    = p.stock === 0
                  return (
                    <div
                      key={p.id}
                      className="grid items-center px-5 rounded-xl"
                      style={{
                        gridTemplateColumns: COL,
                        gap: '0 16px',
                        background: '#FFFFFF',
                        border: '1px solid #E8EDF3',
                        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                        paddingTop: 12,
                        paddingBottom: 12,
                        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                        cursor: 'default',
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.boxShadow = '0 4px 12px rgba(15,23,42,0.09)'
                        el.style.borderColor = '#C7D3E0'
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)'
                        el.style.borderColor = '#E8EDF3'
                      }}
                    >
                      {/* Columna 1: Códigos + nombre */}
                      <div className="min-w-0">
                        <div className="mb-1.5">
                          <CodeLine codes={allCodes} />
                        </div>
                        <p className="text-[13px] font-medium leading-snug truncate" style={{ color: '#374151' }}>{p.nombre}</p>
                        {(p.marca || p.vehiculo) && (
                          <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
                            {p.marca}{p.vehiculo ? ` · ${p.vehiculo}` : ''}
                          </p>
                        )}
                      </div>

                      {/* Columna 2: Stock */}
                      <StockCell stock={p.stock} unidad={p.unidad} sinStock={sinStock} bajo={esStockBajo} />

                      {/* Columna 4: Precio */}
                      <div className="text-right">
                        <span className="font-semibold tabular-nums" style={{ fontSize: 14, color: '#111827', letterSpacing: '-0.01em' }}>
                          Bs {p.precio_venta.toFixed(2)}
                        </span>
                        {p.ubicacion && (
                          <p className="text-[11px] mt-0.5 font-mono" style={{ color: '#9CA3AF' }}>{p.ubicacion}</p>
                        )}
                      </div>

                      {/* Columna 5: Acciones */}
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

/**
 * Todos los códigos del producto al mismo nivel visual, en un único chip.
 * Separados por · con color más suave para no competir con el texto.
 */
function CodeLine({ codes }: { codes: string[] }) {
  return (
    <span
      className="font-mono font-semibold inline-flex items-center flex-wrap gap-x-0 shrink-0"
      style={{
        fontSize: 13,
        background: '#EEF2FF',
        color: '#3730A3',
        border: '1px solid #C7D2FE',
        borderRadius: 8,
        padding: '5px 11px',
        letterSpacing: '0.045em',
        lineHeight: 1,
        boxShadow: '0 1px 2px rgba(99,102,241,0.08)',
      }}
    >
      {codes.map((c, i) => (
        <span key={c} className="inline-flex items-center">
          {i > 0 && (
            <span style={{ color: '#A5B4FC', margin: '0 7px', fontWeight: 400, letterSpacing: 0 }}>·</span>
          )}
          {c}
        </span>
      ))}
    </span>
  )
}

function StockCell({ stock, unidad, sinStock, bajo }: {
  stock: number; unidad: string; sinStock: boolean; bajo: boolean
}) {
  const bg    = sinStock ? '#FEF2F2' : bajo ? '#FFFBEB' : '#F0FDF4'
  const bdr   = sinStock ? '#FECACA' : bajo ? '#FDE68A' : '#BBF7D0'
  const color = sinStock ? '#DC2626' : bajo ? '#B45309' : '#15803D'
  const label = sinStock ? 'Sin stock' : bajo ? 'Stock bajo' : 'Normal'

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="inline-flex items-center gap-1.5 font-semibold tabular-nums"
        style={{
          fontSize: 13,
          background: bg,
          color,
          border: `1px solid ${bdr}`,
          borderRadius: 20,
          padding: '4px 10px',
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>{stock}</span>
        <span className="text-[10px] capitalize font-normal" style={{ opacity: 0.8 }}>{unidad}</span>
      </span>
      <span className="text-[10px] font-medium" style={{ color, opacity: 0.75 }}>{label}</span>
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
    <div className={clsx('flex items-center justify-end gap-0.5', className)}>
      <button onClick={onPrestamo} disabled={sinStock}
        className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: '#9CA3AF' }}
        onMouseEnter={(e) => { if (!sinStock) { (e.currentTarget as HTMLButtonElement).style.color = '#D97706'; (e.currentTarget as HTMLButtonElement).style.background = '#FEF3C7' } }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        title="Registrar préstamo">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </button>
      <button onClick={onEtiqueta}
        className="p-2 rounded-lg transition-colors"
        style={{ color: '#9CA3AF' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        title="Imprimir etiqueta">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      </button>
      <button onClick={onEdit}
        className="p-2 rounded-lg transition-colors"
        style={{ color: '#9CA3AF' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#4F46E5'; (e.currentTarget as HTMLButtonElement).style.background = '#EEF2FF' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        title="Editar">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button onClick={onDelete}
        className="p-2 rounded-lg transition-colors"
        style={{ color: '#9CA3AF' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        title="Eliminar">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
  const sinStock  = p.stock === 0
  const bajo      = p.stock > 0 && p.stock <= p.stock_minimo
  const allCodes  = [p.codigo_universal, ...p.codigos_alternativos.filter(Boolean)]
  const stockColor = sinStock ? '#DC2626' : bajo ? '#B45309' : '#15803D'

  return (
    <div
      className="bg-white rounded-xl overflow-hidden"
      style={{ border: '1px solid #E8EDF3', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
    >
      {/* ── Header siempre visible ── */}
      <button className="w-full px-4 pt-3.5 pb-3 text-left" onClick={onToggle}>

        {/* Fila 1: todos los códigos */}
        <div className="mb-2">
          <CodeLine codes={allCodes} />
        </div>

        {/* Fila 2: nombre + stock/precio + chevron */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium leading-snug truncate" style={{ color: '#374151' }}>{p.nombre}</p>
            {(p.marca || p.vehiculo) && (
              <p className="text-[11px] mt-0.5 truncate" style={{ color: '#9CA3AF' }}>
                {p.marca}{p.vehiculo ? ` · ${p.vehiculo}` : ''}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-1 mb-0.5">
              <span className="font-bold tabular-nums leading-none" style={{ fontSize: 16, color: stockColor }}>{p.stock}</span>
              <span className="text-[10px] capitalize" style={{ color: '#9CA3AF' }}>{p.unidad}</span>
            </div>
            <span className="font-semibold tabular-nums" style={{ fontSize: 13, color: '#111827' }}>Bs {p.precio_venta.toFixed(2)}</span>
          </div>

          <svg
            className={clsx('h-4 w-4 shrink-0 transition-transform duration-200', expanded && 'rotate-180')}
            style={{ color: '#D1D5DB' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ── Panel expandible ── */}
      <div className={clsx(
        'overflow-hidden transition-all duration-200 ease-in-out',
        expanded ? 'max-h-64' : 'max-h-0',
      )}>
        <div className="mx-4 mb-3 rounded-xl px-3 py-3 space-y-3" style={{ background: '#F9FAFB', border: '1px solid #F0F0F5' }}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Ubicación</p>
              <p className="text-[12px]" style={{ color: '#374151' }}>{p.ubicacion}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Stock mín.</p>
              <p className="text-[12px] capitalize" style={{ color: '#374151' }}>{p.stock_minimo} {p.unidad}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Precio costo</p>
              <p className="text-[12px]" style={{ color: '#374151' }}>Bs {p.precio_costo.toFixed(2)}</p>
            </div>
          </div>
          <div className="pt-2" style={{ borderTop: '1px solid #E5E7EB' }}>
            <ActionButtons
              sinStock={sinStock}
              onPrestamo={onPrestamo}
              onEtiqueta={onEtiqueta}
              onEdit={onEdit}
              onDelete={onDelete}
              className="justify-start"
            />
          </div>
        </div>
      </div>
    </div>
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
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="grid items-center px-5 py-3 rounded-xl animate-pulse"
          style={{ gridTemplateColumns: cols, gap: '0 16px', background: '#FFFFFF', border: '1px solid #E8EDF3', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}
        >
          <div className="space-y-2">
            <div className="h-6 w-56 rounded-lg" style={{ background: '#EEF2FF' }} />
            <div className="h-3 w-36 rounded" style={{ background: '#F1F5F9' }} />
            <div className="h-2.5 w-24 rounded" style={{ background: '#F1F5F9' }} />
          </div>
          <div className="h-3 w-14 rounded" style={{ background: '#F1F5F9' }} />
          <div className="flex flex-col items-center gap-1">
            <div className="h-7 w-20 rounded-full" style={{ background: '#F0FDF4' }} />
            <div className="h-2 w-12 rounded" style={{ background: '#F1F5F9' }} />
          </div>
          <div className="h-4 w-20 rounded ml-auto" style={{ background: '#F1F5F9' }} />
          <div />
        </div>
      ))}
    </div>
  )
}
