import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnMeta,
} from '@tanstack/react-table'
import { MainLayout } from '@/components/layout/MainLayout'
import { ConfirmModal, ServerPagination } from '@/components/ui'
import type { Producto } from '@/types'
import { notify } from '@/lib/notify'
import { ProductoModal, type PriceUpdate } from './ProductoModal'
import { ImportarExcelModal, type ImportResult } from './ImportarExcelModal'
import { EtiquetaModal } from './EtiquetaModal'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import {
  PRODUCTOS_QUERY,
  PRODUCTO_BY_ID_QUERY,
  backendToProducto,
  backendToProductoSimple,
  productoToBackend,
  productoToBackendUpdate,
  productoToBackendBulk,
  type ProductoAPI,
  type KitOps,
} from '@/lib/queries/inventario.queries'
import { MARCAS_QUERY, backendToMarca } from '@/lib/queries/marcas.queries'
import type { Marca } from '@/types'
import { api } from '@/lib/api'
import { clsx } from 'clsx'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right'
  }
}

// ─── Stock badge MD3 ──────────────────────────────────────────────────────────

function StockBadgeMd3({ stock, stockMinimo }: { stock: number; stockMinimo: number }) {
  if (stock === 0) {
    return (
      <span className="px-2 py-0.5 rounded-full bg-error text-white text-[10px] font-bold tracking-wide">
        Sin stock
      </span>
    )
  }
  if (stock <= stockMinimo) {
    return (
      <span className="px-2 py-0.5 rounded-full bg-error/80 text-white text-[10px] font-bold tracking-wide">
        Stock bajo
      </span>
    )
  }
  if (stock <= stockMinimo * 2) {
    return (
      <span className="px-2 py-0.5 rounded-full bg-[#F59E0B] text-white text-[10px] font-bold tracking-wide">
        Limitado
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full bg-[#3B82F6] text-white text-[10px] font-bold tracking-wide">
      En stock
    </span>
  )
}

// ─── Product thumbnail ────────────────────────────────────────────────────────

function ProductThumb({ src, nombre }: { src?: string; nombre: string }) {
  const [err, setErr] = useState(false)
  if (src && !err) {
    return (
      <img
        src={src} alt={nombre} onError={() => setErr(true)}
        className="w-12 h-12 rounded border border-outline-variant object-cover"
      />
    )
  }
  return (
    <div className="w-12 h-12 bg-surface-container-low rounded border border-outline-variant flex items-center justify-center">
      <span className="material-symbols-outlined text-on-surface-variant/30 text-xl">image</span>
    </div>
  )
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-outline-variant">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-3 animate-pulse">
          <div className="w-12 h-12 rounded bg-surface-container-low shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded bg-surface-container-low" />
            <div className="h-2.5 w-40 rounded bg-surface-container" />
          </div>
          <div className="h-2.5 w-20 rounded bg-surface-container-low" />
          <div className="h-5 w-20 rounded-full bg-surface-container-low" />
          <div className="h-2.5 w-20 rounded bg-surface-container-low" />
          <div className="h-2.5 w-16 rounded bg-surface-container" />
          <div className="flex gap-1">
            {[0, 1, 2].map(j => <div key={j} className="h-8 w-8 rounded bg-surface-container-low" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew, searching }: { onNew: () => void; searching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
      <div className="w-12 h-12 rounded bg-surface-container-low border border-outline-variant flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-on-surface-variant/30 text-2xl">inventory_2</span>
      </div>
      <p className="text-sm font-semibold text-on-surface mb-1">
        {searching ? 'Sin resultados' : 'Sin productos'}
      </p>
      <p className="text-xs text-on-surface-variant/60 max-w-xs mb-5">
        {searching
          ? 'No hay productos que coincidan con esta búsqueda.'
          : 'Agrega tu primer producto o importa desde Excel.'}
      </p>
      {!searching && (
        <button onClick={onNew}
          className="px-5 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full flex items-center gap-2 text-sm font-semibold transition-all shadow-sm">
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo producto
        </button>
      )}
    </div>
  )
}

// ─── Mobile product row ───────────────────────────────────────────────────────

function MobileProductRow({ p, marcaNombre, onTap }: { p: Producto; marcaNombre: string; onTap: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant last:border-0 active:bg-surface-container-low transition-colors cursor-pointer"
      onClick={onTap}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <ProductThumb src={p.imagen} nombre={p.nombre} />
      <div className="flex-1 min-w-0">
        <div className="font-mono font-bold text-[13px] text-on-surface tracking-[0.05em] leading-tight">
          {p.codigo_universal}
        </div>
        <div className="text-[11.5px] text-on-surface-variant/60 truncate leading-tight mt-0.5">{p.nombre}</div>
        {marcaNombre && (
          <div className="text-[10.5px] text-on-surface-variant/50 mt-0.5">{marcaNombre}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <StockBadgeMd3 stock={p.stock} stockMinimo={p.stock_minimo} />
        <span className="font-mono text-[12px] font-semibold text-on-surface">
          Bs. {p.precio_venta.toFixed(2)}
        </span>
      </div>
      <span className="material-symbols-outlined text-on-surface-variant/30 text-lg ml-1">chevron_right</span>
    </div>
  )
}

function MobileSkeletonRows() {
  return (
    <div className="divide-y divide-outline-variant">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-12 h-12 rounded bg-surface-container-low shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-surface-container-low" />
            <div className="h-2.5 w-36 rounded bg-surface-container" />
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="h-5 w-16 rounded-full bg-surface-container-low" />
            <div className="h-2.5 w-14 rounded bg-surface-container" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Column helper ────────────────────────────────────────────────────────────

const colHelper = createColumnHelper<Producto>()

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBs = (n: number) =>
  n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function getMarcaNombre(marcaId: number | null | undefined, marcas: Marca[]): string {
  if (!marcaId) return ''
  return marcas.find((m) => m.id === marcaId)?.nombre ?? ''
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function InventarioPage() {
  const { isTokenReady } = useAuth()
  const [modalOpen, setModalOpen]               = useState(false)
  const [importOpen, setImportOpen]             = useState(false)
  const [etiquetaProducto, setEtiquetaProducto] = useState<Producto | null>(null)
  const [editingProducto, setEditingProducto]   = useState<Producto | null>(null)
  const [confirmDelete, setConfirmDelete]       = useState<Producto | null>(null)
  const [deleting, setDeleting]                 = useState(false)
  const [loading, setLoading]                   = useState(true)
  const [loadingModal, setLoadingModal]         = useState(false)
  const [products, setProducts]                 = useState<Producto[]>([])
  const [marcas, setMarcas]                     = useState<Marca[]>([])
  const [totalCount, setTotalCount]             = useState(0)
  const [hasNextPage, setHasNextPage]           = useState(false)
  const [page, setPage]                         = useState(0)
  const [pageSize, setPageSize]                 = useState(25)
  const [searchTerm, setSearchTerm]             = useState('')
  const [searching, setSearching]               = useState(false)
  const cursors                                 = useRef<(string | null)[]>([null])
  const searchDebounce                          = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [sorting, setSorting] = useState<SortingState>([])

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }, [])

  // ── Load products ──────────────────────────────────────────────────────────
  const loadProducts = (targetPage: number, size: number, q: string = '') => {
    setLoading(true)
    const where = q.trim() ? {
      or: [
        { codigo:      { contains: q } },
        { codigoAux:   { contains: q } },
        { codigoAux2:  { contains: q } },
        { nombre:      { contains: q } },
        { descripcion: { contains: q } },
      ],
    } : undefined
    gql<{ productos: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: ProductoAPI[] } }>(
      PRODUCTOS_QUERY,
      { first: size, after: cursors.current[targetPage] ?? null, where }
    )
      .then(res => {
        const { totalCount, pageInfo, nodes } = res.productos
        setProducts(nodes.map(backendToProductoSimple))
        setTotalCount(totalCount)
        setHasNextPage(pageInfo.hasNextPage)
        cursors.current[targetPage + 1] = pageInfo.endCursor
        setPage(targetPage)
      })
      .catch(() => notify.error('Error cargando productos'))
      .finally(() => { setLoading(false); setSearching(false) })
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      setSearching(true)
      setProducts([])
      cursors.current = [null]
      loadProducts(0, pageSize, value)
    }, 350)
  }

  const handlePage = (p: number) => loadProducts(p, pageSize, searchTerm)
  const handlePageSize = (size: number) => {
    cursors.current = [null]
    setPageSize(size)
    loadProducts(0, size, searchTerm)
  }

  const loadMarcas = () => {
    gql<{ marca: { nodes: { id: number; nombre: string }[] } }>(MARCAS_QUERY)
      .then((data) => setMarcas(data.marca.nodes.map(backendToMarca)))
      .catch(() => {})
  }

  useEffect(() => {
    if (!isTokenReady) return
    loadProducts(0, pageSize)
    loadMarcas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenReady])

  const displayProducts = products

  // ── Mutations ──────────────────────────────────────────────────────────────
  const handleEdit = (p: Producto) => {
    setEditingProducto(p)
    setLoadingModal(true)
    setModalOpen(true)
    gql<{ productos: { nodes: ProductoAPI[] } }>(PRODUCTO_BY_ID_QUERY, { id: Number(p.id) })
      .then(res => { if (res.productos?.nodes?.[0]) setEditingProducto(backendToProducto(res.productos.nodes[0])) })
      .catch(() => notify.error('Error cargando producto'))
      .finally(() => setLoadingModal(false))
  }
  const handleNew  = () => { setEditingProducto(null); setModalOpen(true) }

  const handleSave = async (data: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>, kitOps: KitOps, priceUpdate?: PriceUpdate) => {
    try {
      if (editingProducto) {
        const updatePayload = productoToBackendUpdate(data)
        await api.put(`/Producto/${editingProducto.id}`, updatePayload)
        if (priceUpdate) {
          await api.post(`/Producto/CambiarPrecio/${editingProducto.id}`, priceUpdate)
        }
        if (kitOps.mode === 'convertirKit') {
          await api.put(`/Producto/ConvertirKit/${editingProducto.id}`, { piezas: kitOps.piezas ?? [] })
        } else if (kitOps.mode === 'convertirRegular') {
          await api.put(`/Producto/ConvertirRegular/${editingProducto.id}`, { stockManual: kitOps.stockManual ?? null })
        } else if (kitOps.mode === 'managePieces' && kitOps.pieceOps?.length) {
          for (const op of kitOps.pieceOps) {
            if (op.type === 'add') {
              await api.post(`/Producto/${editingProducto.id}/Piezas`, { piezas: [op.data] })
            } else if (op.type === 'update') {
              await api.put(`/Producto/${editingProducto.id}/Piezas/${op.piezaId}`, op.data)
            } else if (op.type === 'delete') {
              await api.delete(`/Producto/${editingProducto.id}/Piezas/${op.piezaId}`)
            }
          }
        }
        loadProducts(page, pageSize, searchTerm)
        loadMarcas()
        notify.success('Producto actualizado', { description: `${data.codigo_universal || '(sin código)'} - ${data.nombre}` })
      } else {
        const createPayload = productoToBackend(data)
        const res = await api.post<{ id: number }>('/Producto', createPayload)
        if (kitOps.mode === 'convertirKit' && kitOps.piezas?.length) {
          await api.put(`/Producto/ConvertirKit/${res.id}`, { piezas: kitOps.piezas })
        }
        cursors.current = [null]
        loadProducts(0, pageSize, searchTerm)
        loadMarcas()
        notify.success('Producto creado', { description: `${data.codigo_universal || '(sin código)'} - ${data.nombre}` })
      }
      setModalOpen(false)
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al guardar producto')
    }
  }

  const handleImport = async (results: ImportResult[]) => {
    const productosParaEnviar = results.map((r) => productoToBackendBulk(r.data))
    await api.post('/Producto/lista', { productos: productosParaEnviar })
    cursors.current = [null]
    loadProducts(0, pageSize, searchTerm)
    const creados      = results.filter((r) => r.action === 'create').length
    const actualizados = results.filter((r) => r.action === 'update').length
    const msg = creados > 0 && actualizados > 0
      ? `${creados} creados, ${actualizados} actualizados`
      : creados > 0 ? `${creados} productos creados` : `${actualizados} productos actualizados`
    notify.success(msg)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await api.delete(`/Producto/${confirmDelete.id}`)
      setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id))
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
    total:         totalCount || products.length,
    totalUnidades: products.reduce((s, p) => s + p.stock, 0),
    totalValor:    products.reduce((s, p) => s + p.precio_costo * p.stock, 0),
    stockBajo:     products.filter((p) => p.stock <= p.stock_minimo).length,
  }), [products, totalCount])

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    colHelper.display({
      id: 'imagen',
      header: 'Foto',
      size: 68,
      meta: { align: 'center' },
      enableSorting: false,
      cell: (info) => (
        <ProductThumb src={info.row.original.imagen} nombre={info.row.original.nombre} />
      ),
    }),
    colHelper.accessor('nombre', {
      header: 'Código / Producto',
      size: 220,
      meta: { align: 'left' },
      cell: (info) => {
        const p = info.row.original
        return (
          <div>
            <div className="font-label-mono font-bold text-[15px] text-on-surface tracking-[0.05em] leading-tight">
              {p.codigo_universal || '—'}
            </div>
            <div className="text-xs text-on-surface-variant/60 truncate max-w-[180px] mt-0.5">{p.nombre}</div>
            {p.es_kit && (
              <span className="text-[9px] font-bold text-tertiary uppercase tracking-wider">Kit</span>
            )}
          </div>
        )
      },
    }),
    colHelper.display({
      id: 'marca',
      header: 'Marca / Ubic.',
      size: 160,
      meta: { align: 'left' },
      cell: (info) => {
        const p = info.row.original
        const nombre = getMarcaNombre(p.marcaId, marcas)
        return (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <span className="text-xs font-medium text-on-surface">{nombre || '—'}</span>
            </div>
            <div className="text-[10px] text-on-surface-variant/60 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[10px]">location_on</span>
              <span>{p.almacen} {p.estante} {p.fila} {p.columna}</span>
            </div>
          </div>
        )
      },
    }),
    colHelper.accessor('stock', {
      header: 'Stock',
      size: 90,
      meta: { align: 'left' },
      cell: (info) => {
        const p = info.row.original
        const pct = Math.min(100, p.stock_minimo > 0
          ? (p.stock / (p.stock_minimo * 4)) * 100
          : p.stock > 0 ? 50 : 0)
        const barColor = p.stock === 0 || p.stock <= p.stock_minimo
          ? 'bg-[#EF4444]'
          : p.stock <= p.stock_minimo * 2
            ? 'bg-[#F59E0B]'
            : 'bg-[#3B82F6]'
        return (
          <div>
            <div className="font-label-mono text-sm text-on-surface mb-1">{p.stock.toLocaleString('es-BO')}</div>
            <div className="w-14 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
              <div className={clsx('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    }),
    colHelper.display({
      id: 'estado',
      header: 'Estado',
      size: 110,
      meta: { align: 'left' },
      enableSorting: false,
      cell: (info) => {
        const p = info.row.original
        return <StockBadgeMd3 stock={p.stock} stockMinimo={p.stock_minimo} />
      },
    }),
    colHelper.accessor('precio_venta', {
      header: 'P. Venta',
      size: 130,
      meta: { align: 'left' },
      cell: (info) => (
        <div>
          <div className="font-label-mono text-sm text-on-surface">Bs. {info.getValue().toFixed(2)}</div>
          <div className="text-[10px] text-on-surface-variant/40">PVP Unitario</div>
        </div>
      ),
    }),
    colHelper.accessor('precio_costo', {
      header: 'P. Costo',
      size: 130,
      meta: { align: 'left' },
      cell: (info) => {
        const sale = info.row.original.precio_venta
        const cost = info.getValue()
        const margen = sale > 0 && cost > 0 ? Math.round(((sale - cost) / sale) * 100) : null
        return (
          <div>
            <div className="font-label-mono text-xs text-on-surface-variant">Bs. {cost.toFixed(2)}</div>
            {margen !== null && (
              <div className="text-[10px] text-tertiary font-bold">{margen}% Margen</div>
            )}
          </div>
        )
      },
    }),
    colHelper.display({
      id: 'acciones',
      header: 'Acciones',
      size: 160,
      meta: { align: 'right' },
      enableSorting: false,
      cell: (info) => {
        const p = info.row.original
        return (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => handleEdit(p)}
              title="Editar"
              className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <button
              onClick={() => setEtiquetaProducto(p)}
              title="Etiqueta"
              className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-sm">print</span>
            </button>
            <button
              onClick={() => setConfirmDelete(p)}
              title="Eliminar"
              className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-error/10 hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        )
      },
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [marcas])

  // ── TanStack Table ─────────────────────────────────────────────────────────
  const table = useReactTable({
    data: displayProducts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="bg-[#f9f9ff] min-h-screen font-hanken">

        {/* ── TopBar ──────────────────────────────────────────────────────── */}
        <header className="bg-[#f9f9ff] sticky top-0 z-40 flex justify-between items-center w-full h-16 px-6 border-b border-outline-variant">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>Operaciones</span>
            <span className="text-[10px] opacity-40">/</span>
            <span className="text-primary font-bold">Inventario</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex bg-surface-container-low px-3 py-1.5 rounded items-center gap-2 border border-outline-variant">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_today</span>
              <span className="text-xs font-medium text-on-surface">{dateStr}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant relative"
                title="Notificaciones"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error border-2 border-[#f9f9ff]" />
              </button>
              <button
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
                title="Configuración"
              >
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
          </div>
        </header>

        <div className="px-6 py-6 max-w-[1400px] mx-auto">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-headline-lg text-on-surface mb-1">
                Inventario.
              </h2>
              <p className="text-sm text-on-surface-variant/80">
                Gestión de repuestos y autopartes — control en tiempo real de existencias, costos y movimientos.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                onClick={() => setImportOpen(true)}
                className="px-5 py-2 border border-outline-variant rounded flex items-center gap-2 text-sm font-semibold hover:bg-surface-container transition-all text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Importar
              </button>
              <button
                onClick={handleNew}
                className="px-5 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full flex items-center gap-2 text-sm font-semibold active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Nuevo producto
              </button>
            </div>
          </div>

          {/* ── Metrics Grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-8">

            {/* Total Productos */}
            <div className="bg-white border border-outline-variant border-l-[4px] border-l-[#3B82F6] p-card-padding flex flex-col justify-between h-32 rounded-xl">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-[#3B82F6] uppercase tracking-widest">
                  Total Productos
                </span>
                <div className="p-1.5 bg-[#3B82F6] rounded">
                  <span className="material-symbols-outlined text-[18px] text-white">inventory_2</span>
                </div>
              </div>
              <div>
                <div className="font-mono text-[28px] text-on-surface leading-none mb-1">
                  {kpi.total.toLocaleString('es-BO')}
                </div>
                <div className="text-[11px] text-on-surface-variant/70">en catálogo</div>
              </div>
            </div>

            {/* Stock Crítico */}
            <div className={clsx(
              'border border-l-[4px] p-card-padding flex flex-col justify-between h-32 rounded-xl',
              kpi.stockBajo > 0
                ? 'bg-[#EF4444]/5 border-[#EF4444]/30 border-l-[#EF4444]'
                : 'bg-white border-outline-variant border-l-[#3B82F6]'
            )}>
              <div className="flex justify-between items-start">
                <span className={clsx(
                  'text-[11px] font-bold uppercase tracking-widest',
                  kpi.stockBajo > 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'
                )}>
                  Stock Crítico
                </span>
                <div className={clsx('p-1.5 rounded', kpi.stockBajo > 0 ? 'bg-[#EF4444]' : 'bg-[#3B82F6]')}>
                  <span className="material-symbols-outlined text-[18px] text-white">
                    warning
                  </span>
                </div>
              </div>
              <div>
                <div className={clsx('font-mono text-[28px] leading-none mb-1', kpi.stockBajo > 0 ? 'text-[#EF4444]' : 'text-on-surface')}>
                  {kpi.stockBajo}
                </div>
                <div className={clsx('text-[11px] font-medium', kpi.stockBajo > 0 ? 'text-[#EF4444]' : 'text-on-surface-variant/70')}>
                  {kpi.stockBajo > 0 ? 'requiere acción inmediata' : 'bajo mínimo'}
                </div>
              </div>
            </div>

            {/* Valor Almacén */}
            <div className="bg-white border border-outline-variant border-l-[4px] border-l-[#047857] p-card-padding flex flex-col justify-between h-32 rounded-xl">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-[#047857] uppercase tracking-widest">
                  Valor Almacén
                </span>
                <div className="p-1.5 bg-[#047857] rounded">
                  <span className="material-symbols-outlined text-[18px] text-white">account_balance_wallet</span>
                </div>
              </div>
              <div>
                <div className="font-mono text-[28px] text-on-surface leading-none mb-1 flex items-baseline gap-1">
                  <span className="text-sm font-normal text-[#047857]">Bs.</span>
                  {fmtBs(kpi.totalValor)}
                </div>
                <div className="text-[11px] text-on-surface-variant/70">al precio de costo</div>
              </div>
            </div>

            {/* Unidades Totales */}
            <div className="bg-white border border-outline-variant border-l-[4px] border-l-[#EF4444] p-card-padding flex flex-col justify-between h-32 rounded-xl">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-[#EF4444] uppercase tracking-widest">
                  Unidades Totales
                </span>
                <div className="p-1.5 bg-[#EF4444] rounded">
                  <span className="material-symbols-outlined text-[18px] text-white">package_2</span>
                </div>
              </div>
              <div>
                <div className="font-mono text-[28px] text-on-surface leading-none mb-1">
                  {kpi.totalUnidades.toLocaleString('es-BO')}
                </div>
                <div className="text-[11px] text-on-surface-variant/70">en stock físico</div>
              </div>
            </div>

          </div>

          {/* ── Table Container ──────────────────────────────────────────── */}
          <div className="bg-white border border-outline-variant overflow-hidden relative rounded-xl">
            {/* Decorative watermark */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.018 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMaxYMax meet"
                   style={{ width: '100%', height: '100%', display: 'block' }}>
                <g fill="#2a313d">
                  <g transform="translate(580,60) rotate(10)">
                    <circle cx="50" cy="50" r="38"/>
                    <rect x="47" y="0" width="6" height="14"/>
                    <rect x="47" y="86" width="6" height="14"/>
                    <rect x="0" y="47" width="14" height="6"/>
                    <rect x="86" y="47" width="14" height="6"/>
                    <rect x="20" y="9" width="6" height="14" transform="rotate(-45 23 16)"/>
                    <rect x="74" y="9" width="6" height="14" transform="rotate(45 77 16)"/>
                    <rect x="20" y="77" width="6" height="14" transform="rotate(45 23 84)"/>
                    <rect x="74" y="77" width="6" height="14" transform="rotate(-45 77 84)"/>
                    <circle cx="50" cy="50" r="20" fill="white"/>
                    <circle cx="50" cy="50" r="6"/>
                  </g>
                  <g transform="translate(660,300)">
                    <circle cx="52" cy="52" r="50"/>
                    <circle cx="52" cy="52" r="32" fill="white"/>
                    <circle cx="52" cy="52" r="9"/>
                    <circle cx="52" cy="10" r="4" fill="white"/>
                    <circle cx="52" cy="94" r="4" fill="white"/>
                    <circle cx="10" cy="52" r="4" fill="white"/>
                    <circle cx="94" cy="52" r="4" fill="white"/>
                    <circle cx="80" cy="24" r="4" fill="white"/>
                    <circle cx="24" cy="80" r="4" fill="white"/>
                    <circle cx="24" cy="24" r="4" fill="white"/>
                    <circle cx="80" cy="80" r="4" fill="white"/>
                  </g>
                  <g transform="translate(720,480) rotate(-15)">
                    <path d="M30 2 L56 16 L56 44 L30 58 L4 44 L4 16 Z"/>
                    <circle cx="30" cy="30" r="9" fill="white"/>
                  </g>
                </g>
              </svg>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-outline-variant flex flex-wrap justify-between items-center gap-4 bg-white">
              <h3 className="text-headline-sm text-on-surface">
                Productos
                <span className="text-sm font-normal text-on-surface-variant/50 ml-2">
                  {totalCount > 0 ? totalCount : displayProducts.length} resultados
                </span>
              </h3>
              <div className="relative w-full sm:w-auto sm:min-w-[320px] md:min-w-[380px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[20px]">
                  search
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded bg-surface-container-lowest text-sm focus:ring-0 focus:border-primary outline-none transition-all text-on-surface placeholder:text-on-surface-variant/40"
                  placeholder="Buscar por código, nombre o marca..."
                  value={searchTerm}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table / skeleton / empty */}
            {(loading || searching) ? (
              <>
                <div className="hidden md:block"><TableSkeleton /></div>
                <div className="md:hidden"><MobileSkeletonRows /></div>
              </>
            ) : displayProducts.length === 0 ? (
              <EmptyState onNew={handleNew} searching={!!searchTerm} />
            ) : (
              <>
                {/* ── Desktop table ── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <colgroup>
                      {table.getFlatHeaders().map((h) => (
                        <col key={h.id} style={{ width: h.column.getSize() }} />
                      ))}
                    </colgroup>
                    <thead className="bg-surface-container-low/50">
                      {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                          {hg.headers.map((header) => {
                            const canSort = header.column.getCanSort()
                            const sorted  = header.column.getIsSorted()
                            const align   = (header.column.columnDef.meta as ColumnMeta<Producto, unknown> | undefined)?.align ?? 'left'
                            return (
                              <th
                                key={header.id}
                                className={clsx(
                                  'px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider select-none whitespace-nowrap',
                                  align === 'center' && 'text-center',
                                  align === 'right'  && 'text-right',
                                  canSort && 'cursor-pointer hover:text-on-surface transition-colors',
                                )}
                                onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                              >
                                <span className={clsx(
                                  'inline-flex items-center gap-1',
                                  align === 'center' && 'justify-center w-full',
                                  align === 'right'  && 'justify-end w-full',
                                )}>
                                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                  {canSort && (
                                    <span className="material-symbols-outlined text-[12px]">
                                      {sorted === 'asc' ? 'arrow_upward' : sorted === 'desc' ? 'arrow_downward' : 'unfold_more'}
                                    </span>
                                  )}
                                </span>
                              </th>
                            )
                          })}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {table.getRowModel().rows.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={clsx(
                            'transition-colors hover:bg-surface-container-lowest',
                            idx % 2 !== 0 && 'bg-surface-container-low/20',
                          )}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const align = (cell.column.columnDef.meta as ColumnMeta<Producto, unknown> | undefined)?.align ?? 'left'
                            return (
                              <td
                                key={cell.id}
                                className={clsx(
                                  'px-6 py-table-cell-padding align-middle text-sm',
                                  align === 'center' && 'text-center',
                                  align === 'right'  && 'text-right',
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

                {/* ── Mobile list ── */}
                <div className="md:hidden">
                  {table.getRowModel().rows.map(row => (
                    <MobileProductRow
                      key={row.id}
                      p={row.original}
                      marcaNombre={getMarcaNombre(row.original.marcaId, marcas)}
                      onTap={() => handleEdit(row.original)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Footer */}
            {!loading && (
              <div className="px-6 py-4 bg-white border-t border-outline-variant">
                <ServerPagination
                  totalCount={totalCount}
                  page={page}
                  pageSize={pageSize}
                  hasNextPage={hasNextPage}
                  loading={loading}
                  onPage={handlePage}
                  onPageSize={handlePageSize}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <EtiquetaModal
        open={!!etiquetaProducto}
        onClose={() => setEtiquetaProducto(null)}
        producto={etiquetaProducto}
        marcaNombre={etiquetaProducto ? getMarcaNombre(etiquetaProducto.marcaId, marcas) : ''}
      />
      <ImportarExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        productosExistentes={products}
      />
      <ProductoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProducto(null) }}
        onSave={handleSave}
        producto={editingProducto}
        loading={loadingModal}
        productosExistentes={products}
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
