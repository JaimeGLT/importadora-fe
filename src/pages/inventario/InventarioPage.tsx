import { useEffect, useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnMeta,
} from '@tanstack/react-table'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Button, Input, ConfirmModal, TablePagination } from '@/components/ui'
import type { Producto, ItemPrestamo, Prestamo } from '@/types'
import { notify } from '@/lib/notify'
import { ProductoModal } from './ProductoModal'
import { ImportarExcelModal, type ImportResult } from './ImportarExcelModal'
import { EtiquetaModal } from './EtiquetaModal'
import { NuevoPrestamoModal } from './NuevoPrestamoModal'
import { usePrestamosStore } from '@/stores/prestamosStore'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { MOCK_PRODUCTOS } from '@/mock/inventario'
import {
  PRODUCTOS_QUERY,
  PRODUCTO_BY_ID_QUERY,
  backendToProducto,
  backendToProductoSimple,
  productoToBackend,
  productoToBackendUpdate,
  productoToBackendBulk,
  type ProductoAPI,
} from '@/lib/queries/inventario.queries'
import { api } from '@/lib/api'
import { clsx } from 'clsx'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right'
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

// ─── UI primitives ────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-steel-100 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 rounded-full bg-brand-600" />
      <h2 className="text-[11px] font-bold text-steel-500 uppercase tracking-widest">{children}</h2>
    </div>
  )
}

type BadgeVariant = 'red' | 'amber' | 'green'
const BADGE_STYLES: Record<BadgeVariant, string> = {
  red:   'bg-brand-600 text-white',
  amber: 'bg-amber-500 text-white',
  green: 'bg-emerald-500 text-white',
}
function StockBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${BADGE_STYLES[variant]}`}>
      {label}
    </span>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, dark = false }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; dark?: boolean
}) {
  if (dark) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-steel-900 p-5 text-white shadow-md">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-steel-800" />
        <div className="absolute right-2 -bottom-8 h-24 w-24 rounded-full bg-brand-900 opacity-40" />
        <div className="relative">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
            <div className="text-white">{icon}</div>
          </div>
          <p className="text-2xl font-black tabular-nums leading-tight">{value}</p>
          <p className="text-xs text-steel-400 font-semibold mt-0.5">{label}</p>
          <p className="text-[10px] text-steel-500 mt-2">{sub}</p>
        </div>
      </div>
    )
  }
  return (
    <Card className="p-5">
      <div className="h-9 w-9 rounded-xl bg-steel-50 flex items-center justify-center mb-3">
        <div className="text-steel-500">{icon}</div>
      </div>
      <p className="text-2xl font-black tabular-nums text-steel-900 leading-tight">{value}</p>
      <p className="text-xs text-steel-500 font-semibold mt-0.5">{label}</p>
      <p className="text-[10px] text-steel-400 mt-2">{sub}</p>
    </Card>
  )
}

// ─── Product image ────────────────────────────────────────────────────────────

function ProductThumb({ src, nombre }: { src?: string; nombre: string }) {
  const [err, setErr] = useState(false)
  if (src && !err) {
    return (
      <img
        src={src}
        alt={nombre}
        onError={() => setErr(true)}
        className="h-10 w-10 rounded-xl object-cover border border-steel-100 shrink-0"
      />
    )
  }
  return (
    <div className="h-10 w-10 rounded-xl bg-steel-50 border border-steel-100 flex items-center justify-center shrink-0">
      <svg className="h-5 w-5 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    </div>
  )
}

// ─── Action button ────────────────────────────────────────────────────────────

type ActionIcon = 'prestamo' | 'etiqueta' | 'editar' | 'eliminar'
const ACTION_ICONS: Record<ActionIcon, React.ReactNode> = {
  prestamo: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  etiqueta: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>,
  editar:   <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  eliminar: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
}

function ActionBtn({ icon, onClick, disabled, danger, title }: {
  icon: ActionIcon; onClick: () => void; disabled?: boolean; danger?: boolean; title: string
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={clsx('p-1.5 rounded-lg transition-all duration-150',
        disabled ? 'text-steel-200 cursor-not-allowed'
        : danger  ? 'text-steel-400 hover:text-brand-600 hover:bg-brand-50'
        :           'text-steel-400 hover:text-steel-700 hover:bg-steel-100',
      )}>
      {ACTION_ICONS[icon]}
    </button>
  )
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (!direction) return (
    <svg className="h-3 w-3 text-steel-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
  return direction === 'asc' ? (
    <svg className="h-3 w-3 text-brand-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="h-3 w-3 text-brand-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-steel-50">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
          <div className="h-10 w-10 rounded-xl bg-steel-100 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex gap-1.5">
              <div className="h-5 w-20 rounded bg-steel-100" />
              <div className="h-5 w-16 rounded bg-steel-50" />
            </div>
            <div className="h-4 w-40 rounded bg-steel-100" />
          </div>
          <div className="h-4 w-20 rounded bg-steel-100" />
          <div className="h-6 w-16 rounded-full bg-steel-100" />
          <div className="h-4 w-20 rounded bg-steel-100" />
          <div className="h-4 w-20 rounded bg-steel-50" />
          <div className="flex gap-1">
            {[0,1,2,3].map(j => <div key={j} className="h-7 w-7 rounded-lg bg-steel-50" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew, searching }: { onNew: () => void; searching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="h-14 w-14 rounded-2xl bg-steel-50 border border-steel-100 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-steel-700 mb-1">
        {searching ? 'Sin resultados' : 'Sin productos'}
      </h3>
      <p className="text-xs text-steel-400 text-center max-w-xs mb-5">
        {searching
          ? 'No hay productos que coincidan con la búsqueda.'
          : 'Agrega tu primer producto o importa desde Excel.'}
      </p>
      {!searching && (
        <Button onClick={onNew} icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        }>
          Nuevo producto
        </Button>
      )}
    </div>
  )
}

// ─── Column helper ────────────────────────────────────────────────────────────

const colHelper = createColumnHelper<Producto>()

// ─── Main page ────────────────────────────────────────────────────────────────

export function InventarioPage() {
  const { isTokenReady } = useAuth()
  const [modalOpen, setModalOpen]               = useState(false)
  const [importOpen, setImportOpen]             = useState(false)
  const [etiquetaProducto, setEtiquetaProducto] = useState<Producto | null>(null)
  const [prestamoProducto, setPrestamoProducto] = useState<Producto | null>(null)
  const [editingProducto, setEditingProducto]   = useState<Producto | null>(null)
  const [confirmDelete, setConfirmDelete]       = useState<Producto | null>(null)
  const [deleting, setDeleting]                 = useState(false)
  const [loading, setLoading]                   = useState(true)
  const [loadingModal, setLoadingModal]         = useState(false)
  const [allProducts, setAllProducts]           = useState<Producto[]>([])

  const [sorting, setSorting]     = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const { addPrestamo } = usePrestamosStore()

  // ── Load products from backend ──────────────────────────────────────────────
  const fetchProducts = (after: string | null, acc: ProductoAPI[]): Promise<ProductoAPI[]> => {
    return gql<{ productos: { nodes: ProductoAPI[]; pageInfo: { hasNextPage: boolean; endCursor: string } } }>(
      PRODUCTOS_QUERY,
      { first: 50, after }
    ).then(res => {
      const { nodes, pageInfo } = res.productos
      const all = [...acc, ...nodes]
      if (pageInfo?.hasNextPage && pageInfo.endCursor) {
        return fetchProducts(pageInfo.endCursor, all)
      }
      return all
    })
  }

  const loadProducts = () => {
    let cancelled = false
    setLoading(true)
    fetchProducts(null, [])
      .then((raw) => {
        if (cancelled) return
        const backend = raw.map(backendToProductoSimple)
        const mockKitYpiezas = MOCK_PRODUCTOS.filter(p => p.es_kit || p.kit_id)
        setAllProducts(backend.length > 0 ? [...backend, ...mockKitYpiezas] : MOCK_PRODUCTOS as typeof backend)
      })
      .catch(() => {
        if (!cancelled) notify.error('Error cargando productos')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
  }

  useEffect(() => {
    if (!isTokenReady) return
    let cancelled = false
    setLoading(true)
    fetchProducts(null, [])
      .then((raw) => {
        if (cancelled) return
        const backend = raw.map(backendToProductoSimple)
        const mockKitYpiezas = MOCK_PRODUCTOS.filter(p => p.es_kit || p.kit_id)
        setAllProducts(backend.length > 0 ? [...backend, ...mockKitYpiezas] : MOCK_PRODUCTOS as typeof backend)
      })
      .catch(() => {
        if (!cancelled) notify.error('Error cargando productos')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [isTokenReady])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const handleEdit = (p: Producto) => {
    setEditingProducto(p)
    setLoadingModal(true)
    setModalOpen(true)
    gql<{ productos: { nodes: ProductoAPI[] } }>(PRODUCTO_BY_ID_QUERY, { id: Number(p.id) })
      .then((res) => {
        if (res.productos?.nodes?.[0]) {
          setEditingProducto(backendToProducto(res.productos.nodes[0]))
        }
      })
      .catch(() => notify.error('Error cargando producto'))
      .finally(() => setLoadingModal(false))
  }
  const handleNew  = () => { setEditingProducto(null); setModalOpen(true) }

  const handleSave = async (data: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>) => {
    const hasPriceChange = editingProducto &&
      (data.precio_costo !== editingProducto.precio_costo ||
       data.precio_venta !== editingProducto.precio_venta ||
       data.conversionABs !== editingProducto.conversionABs)

    if (editingProducto) {
      const updatePayload = productoToBackendUpdate(data)
      await api.put(`/Producto/${editingProducto.id}`, updatePayload)
      if (hasPriceChange) {
        const pricePayload = {
          costo: data.precio_costo,
          precio: data.precio_venta,
          conversionABs: data.conversionABs,
          nota: data.historial_precios[data.historial_precios.length - 1]?.nota ?? '',
        }
        await api.post(`/Producto/CambiarPrecio/${editingProducto.id}`, pricePayload)
      }
      setAllProducts((prev) => prev.map((p) => p.id === editingProducto.id ? { ...p, ...data } : p))
      notify.success('Producto actualizado', {
        description: `${data.codigo_universal || '(sin código)'} - ${data.nombre}`,
      })
    } else {
      const createPayload = productoToBackend(data)
      await api.post('/Producto', createPayload)
      loadProducts()
      notify.success('Producto creado', {
        description: `${data.codigo_universal || '(sin código)'} - ${data.nombre}`,
      })
    }
    setModalOpen(false)
  }

  const handleNuevoPrestamo = (items: ItemPrestamo[], prestado_a: string, fecha: string, notas: string) => {
    const nuevo: Prestamo = {
      id: crypto.randomUUID(),
      items,
      prestado_a,
      fecha,
      notas,
      estado: 'activo',
      creado_en: new Date().toISOString(),
    }
    addPrestamo(nuevo)
    setAllProducts((prev) => {
      const updated = prev.map((p) => {
        const item = items.find((i) => i.producto_id === p.id)
        if (!item) return p
        return { ...p, stock: p.stock - item.cantidad }
      })
      return updated
    })
    notify.success('Préstamo registrado')
    setPrestamoProducto(null)
  }

  const handleImport = async (results: ImportResult[]) => {
    const productosParaEnviar = results.map((r) => productoToBackendBulk(r.data))
    await api.post('/Producto/lista', { productos: productosParaEnviar })

    loadProducts()

    const creados = results.filter((r) => r.action === 'create').length
    const actualizados = results.filter((r) => r.action === 'update').length
    const msg = creados > 0 && actualizados > 0
      ? `${creados} creados, ${actualizados} actualizados`
      : creados > 0
        ? `${creados} productos creados`
        : `${actualizados} productos actualizados`
    notify.success(msg)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await api.delete(`/Producto/${confirmDelete.id}`)
      setAllProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id))
      notify.success('Producto eliminado', { description: confirmDelete.nombre })
    } catch {
      notify.error('Error al eliminar producto')
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => ({
    total:         allProducts.length,
    totalUnidades: allProducts.reduce((s, p) => s + p.stock, 0),
    totalValor:    allProducts.reduce((s, p) => s + p.precio_venta * p.stock, 0),
    stockBajo:     allProducts.filter((p) => p.stock <= p.stock_minimo).length,
  }), [allProducts])

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    colHelper.display({
      id: 'imagen',
      header: 'Foto',
      size: 64,
      meta: { align: 'center' },
      enableSorting: false,
      cell: (info) => (
        <ProductThumb src={info.row.original.imagen} nombre={info.row.original.nombre} />
      ),
    }),
    colHelper.accessor('nombre', {
      header: 'Producto',
      size: 280,
      meta: { align: 'left' },
      cell: (info) => {
        const p = info.row.original
        const allCodes = [p.codigo_universal, ...p.codigos_alternativos.filter(Boolean)]
        return (
          <div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {allCodes.slice(0, 3).map((code, i) => (
                <span key={`${code}-${i}`} className={clsx(
                  'inline-flex items-center px-2.5 py-1 rounded-lg font-mono font-black tracking-wider',
                  i === 0
                    ? 'text-sm bg-brand-600 text-white shadow-sm'
                    : 'text-xs bg-steel-800 text-steel-100',
                )}>
                  {code}
                </span>
              ))}
              {allCodes.length > 3 && (
                <span className="text-[10px] text-steel-400 self-center">+{allCodes.length - 3}</span>
              )}
            </div>
            <p className="text-[11px] text-steel-400 truncate">{p.nombre}</p>
            {p.descripcion && (
              <p className="text-[10px] text-steel-300 truncate mt-0.5">{p.descripcion}</p>
            )}
          </div>
        )
      },
    }),
    colHelper.accessor('marca', {
      header: 'Marca / Ubic.',
      size: 150,
      meta: { align: 'left' },
      cell: (info) => {
        const p = info.row.original
        return (
          <div>
            <p className="text-xs font-medium text-steel-700">{p.marca || '—'}</p>
            {p.ubicacion && (
              <p className="text-[10px] text-steel-400 font-mono mt-0.5">{p.ubicacion}</p>
            )}
          </div>
        )
      },
    }),
    colHelper.accessor('stock', {
      header: 'Stock',
      size: 100,
      meta: { align: 'center' },
      cell: (info) => {
        const p = info.row.original
        const sinStock = p.stock === 0
        const bajo = p.stock > 0 && p.stock <= p.stock_minimo
        if (sinStock) return <StockBadge label="Sin stock" variant="red" />
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className={clsx('text-sm font-black tabular-nums', bajo ? 'text-amber-600' : 'text-emerald-600')}>
              {p.stock}
            </span>
            <StockBadge label={bajo ? 'Bajo' : 'OK'} variant={bajo ? 'amber' : 'green'} />
          </div>
        )
      },
    }),
    colHelper.accessor('precio_venta', {
      header: 'P. Venta',
      size: 110,
      meta: { align: 'right' },
      cell: (info) => (
        <span className="text-sm font-bold text-steel-900 tabular-nums">
          Bs {info.getValue().toFixed(2)}
        </span>
      ),
    }),
    colHelper.accessor('precio_costo', {
      header: 'P. Costo',
      size: 110,
      meta: { align: 'right' },
      cell: (info) => (
        <span className="text-xs font-semibold text-steel-400 tabular-nums">
          Bs {info.getValue().toFixed(2)}
        </span>
      ),
    }),
    colHelper.display({
      id: 'acciones',
      header: 'Acciones',
      size: 120,
      meta: { align: 'right' },
      enableSorting: false,
      cell: (info) => {
        const p = info.row.original
        const sinStock = p.stock === 0
        return (
          <div className="flex justify-end gap-0.5">
            <ActionBtn icon="prestamo" onClick={() => setPrestamoProducto(p)} disabled={sinStock} title="Préstamo" />
            <ActionBtn icon="etiqueta" onClick={() => setEtiquetaProducto(p)} title="Etiqueta" />
            <ActionBtn icon="editar"   onClick={() => handleEdit(p)} title="Editar" />
            <ActionBtn icon="eliminar" onClick={() => setConfirmDelete(p)} danger title="Eliminar" />
          </div>
        )
      },
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  // ── Custom global filter function ──────────────────────────────────────────
  const globalFilterFn = (row: { original: Producto }, _columnId: string, filterValue: string): boolean => {
    const p = row.original
    const search = filterValue.toLowerCase().trim()
    if (!search) return true

    // Buscar en todos los campos relevantes
    const fields = [
      p.codigo_universal,
      p.codigos_alternativos[0] ?? '',
      p.codigos_alternativos[1] ?? '',
      p.nombre,
      p.marca,
      p.descripcion,
    ]

    return fields.some(field => field.toLowerCase().includes(search))
  }

  // ── TanStack Table ─────────────────────────────────────────────────────────
  const table = useReactTable({
    data: allProducts,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
    initialState: { pagination: { pageSize: 25, pageIndex: 0 } },
  })

  // Reset to page 1 when search changes
  useEffect(() => {
    table.setPageIndex(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter])

  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <MainLayout>
      <PageContainer>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">
              Gestión de stock
            </p>
            <h1 className="text-3xl font-black text-steel-900 tracking-tight">Inventario</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" onClick={() => setImportOpen(true)} icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            }>
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button onClick={handleNew} icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }>
              <span className="hidden sm:inline">Nuevo producto</span>
            </Button>
          </div>
        </div>

        {/* ── KPIs ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard dark
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
            label="Total productos"
            value={kpi.total.toLocaleString()}
            sub="en catálogo"
          />
          <KpiCard
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>}
            label="Unidades totales"
            value={kpi.totalUnidades.toLocaleString()}
            sub="en stock"
          />
          <KpiCard
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Valor total"
            value={fmtBs(kpi.totalValor)}
            sub="en inventario"
          />
          <KpiCard
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            label="Stock bajo"
            value={kpi.stockBajo}
            sub="bajo mínimo"
          />
        </div>

        {/* ── Tabla ──────────────────────────────────────────────────── */}
        <Card>
          {/* Toolbar */}
          <div className="px-5 pt-5 pb-4 border-b border-steel-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <SectionTitle>Productos</SectionTitle>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="w-72">
                <Input
                  placeholder="Buscar código, nombre, marca..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  leftIcon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                  }
                />
              </div>
              {globalFilter && (
                <span className="text-xs font-semibold text-steel-500 bg-steel-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                  {filteredCount} resultado{filteredCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Table content */}
          {loading ? (
            <TableSkeleton />
          ) : allProducts.length === 0 ? (
            <EmptyState onNew={handleNew} searching={false} />
          ) : filteredCount === 0 ? (
            <EmptyState onNew={handleNew} searching={!!globalFilter} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  {table.getFlatHeaders().map((h) => (
                    <col key={h.id} style={{ width: h.column.getSize() }} />
                  ))}
                </colgroup>
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-steel-100">
                      {hg.headers.map((header) => {
                        const canSort = header.column.getCanSort()
                        const sorted  = header.column.getIsSorted()
                        const align   = (header.column.columnDef.meta as ColumnMeta<Producto, unknown> | undefined)?.align ?? 'left'
                        return (
                          <th
                            key={header.id}
                            className={clsx(
                              'px-3 py-3 text-[10px] font-bold text-steel-400 uppercase tracking-widest select-none whitespace-nowrap',
                              align === 'center' && 'text-center',
                              align === 'right'  && 'text-right',
                              align === 'left'   && 'text-left',
                              canSort && 'cursor-pointer hover:text-steel-600 transition-colors',
                              header.id === 'imagen'   && 'pl-5',
                              header.id === 'acciones' && 'pr-5',
                            )}
                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          >
                            <span className={clsx(
                              'inline-flex items-center gap-1',
                              align === 'center' && 'justify-center w-full',
                              align === 'right'  && 'justify-end w-full',
                            )}>
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                              {canSort && <SortIcon direction={sorted} />}
                            </span>
                          </th>
                        )
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-steel-50">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="group hover:bg-[#FAFAF9] transition-colors">
                      {row.getVisibleCells().map((cell) => {
                        const align = (cell.column.columnDef.meta as ColumnMeta<Producto, unknown> | undefined)?.align ?? 'left'
                        return (
                          <td
                            key={cell.id}
                            className={clsx(
                              'px-3 py-3',
                              align === 'center' && 'text-center',
                              align === 'right'  && 'text-right',
                              cell.column.id === 'imagen'   && 'pl-5',
                              cell.column.id === 'acciones' && 'pr-5',
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {!loading && allProducts.length > 0 && (
            <div className="px-5 py-4 border-t border-steel-100">
              <TablePagination table={table} totalRows={filteredCount} />
            </div>
          )}
        </Card>

      </PageContainer>

      <NuevoPrestamoModal
        open={!!prestamoProducto}
        onClose={() => setPrestamoProducto(null)}
        onSave={handleNuevoPrestamo}
        productos={allProducts}
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
        productosExistentes={allProducts}
      />
      <ProductoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProducto(null) }}
        onSave={handleSave}
        producto={editingProducto}
        loading={loadingModal}
        productosExistentes={allProducts}
      />
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar producto"
        message={`¿Eliminar "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        loading={deleting}
      />
    </MainLayout>
  )
}
