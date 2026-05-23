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

// ─── Status badge ─────────────────────────────────────────────────────────────

function StockBadgeMd3({ stock, stockMinimo }: { stock: number; stockMinimo: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#fee2e2] text-[#dc2626]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] shrink-0" />
        Sin stock
      </span>
    )
  }
  if (stock <= stockMinimo) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#fee2e2] text-[#dc2626]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] shrink-0" />
        Stock bajo
      </span>
    )
  }
  if (stock <= stockMinimo * 2) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#fff7ed] text-[#ea580c]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] shrink-0" />
        Limitado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#d1fae5] text-[#059669]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#059669] shrink-0" />
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
        className="w-[42px] h-[42px] rounded-xl border-[1.5px] border-[#e2e8f0] object-cover"
      />
    )
  }
  return (
    <div className="w-[42px] h-[42px] bg-[#f1f5f9] rounded-xl border-[1.5px] border-[#e2e8f0] flex items-center justify-center">
      <i className="ti ti-photo text-[#9996b0] text-[18px]" />
    </div>
  )
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-[#e2e8f0]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
          <div className="w-[42px] h-[42px] rounded-xl bg-[#f1f5f9] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded bg-[#f1f5f9]" />
            <div className="h-2.5 w-40 rounded bg-[#e2e8f0]" />
          </div>
          <div className="h-2.5 w-20 rounded bg-[#f1f5f9]" />
          <div className="h-5 w-20 rounded-full bg-[#f1f5f9]" />
          <div className="h-2.5 w-20 rounded bg-[#f1f5f9]" />
          <div className="h-2.5 w-16 rounded bg-[#e2e8f0]" />
          <div className="flex gap-1.5">
            {[0, 1, 2].map(j => <div key={j} className="h-8 w-8 rounded-[10px] bg-[#f1f5f9]" />)}
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
      <div className="w-12 h-12 rounded-xl bg-white border-[1.5px] border-[#e2e8f0] flex items-center justify-center mb-4">
        <i className="ti ti-package text-[#9996b0] text-xl" />
      </div>
      <p className="text-sm font-bold text-[#1e1b2e] mb-1">
        {searching ? 'Sin resultados' : 'Sin productos'}
      </p>
      <p className="text-xs text-[#9996b0] font-semibold max-w-xs mb-5">
        {searching
          ? 'No hay productos que coincidan con esta búsqueda.'
          : 'Agrega tu primer producto o importa desde Excel.'}
      </p>
      {!searching && (
        <button onClick={onNew}
          className="px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-md">
          <i className="ti ti-plus text-base" />
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
      className={clsx(
        'flex items-center gap-3 px-4 py-3 border-b border-[#e2e8f0] last:border-0 active:bg-[#f1f5f9] transition-colors cursor-pointer',
        p.es_kit && 'border-l-[3px] border-l-[#1d4ed8]',
      )}
      onClick={onTap}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <ProductThumb src={p.imagen} nombre={p.nombre} />
      <div className="flex-1 min-w-0">
        <div className="font-mono font-bold text-[13px] text-[#1e1b2e] tracking-[0.05em] leading-tight">
          {p.codigo_universal}
        </div>
        <div className="text-[11.5px] text-[#9996b0] font-semibold truncate leading-tight mt-0.5">{p.nombre}</div>
        {marcaNombre && (
          <div className="text-[10.5px] text-[#9996b0] mt-0.5">{marcaNombre}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <StockBadgeMd3 stock={p.stock} stockMinimo={p.stock_minimo} />
        <span className="font-mono text-[12px] font-bold text-[#1e1b2e]">
          Bs. {p.precio_venta.toFixed(2)}
        </span>
      </div>
      <i className="ti ti-chevron-right text-[#9996b0] text-lg ml-1" />
    </div>
  )
}

function MobileSkeletonRows() {
  return (
    <div className="divide-y divide-[#e2e8f0]">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-[42px] h-[42px] rounded-xl bg-[#f1f5f9] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-[#f1f5f9]" />
            <div className="h-2.5 w-36 rounded bg-[#e2e8f0]" />
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="h-5 w-16 rounded-full bg-[#f1f5f9]" />
            <div className="h-2.5 w-14 rounded bg-[#e2e8f0]" />
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
      header: '',
      size: 60,
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
            <div className="font-mono font-bold text-[15px] text-[#1e1b2e] tracking-[0.05em] leading-tight">
              {p.codigo_universal || '—'}
            </div>
            <div className="text-xs text-[#9996b0] font-medium truncate max-w-[180px] mt-0.5">{p.nombre}</div>
            {p.es_kit && (
              <span className="text-[9px] font-bold text-[#1d4ed8] uppercase tracking-wider">Kit</span>
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
            <div className="inline-flex items-center gap-1.5 bg-[#dbeafe] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8] shrink-0" />
              {nombre || '—'}
            </div>
            <div className="text-[10px] text-[#9996b0] font-medium flex items-center gap-1">
              <i className="ti ti-map-pin text-[10px]" />
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
        const isOk   = p.stock > p.stock_minimo * 2
        const isWarn = p.stock > p.stock_minimo && p.stock <= p.stock_minimo * 2
        return (
          <div>
            <div className="font-mono font-black text-[15px] text-[#1e1b2e] leading-none">{p.stock.toLocaleString('es-BO')}</div>
            <div className="w-[60px] h-[5px] bg-[#e2e8f0] rounded-full overflow-hidden mt-1.5">
              <div
                className={clsx(
                  'h-full rounded-full',
                  isOk ? 'bg-gradient-to-r from-[#059669] to-[#0284c7]'
                  : isWarn ? 'bg-gradient-to-r from-[#ea580c] to-[#f59e0b]'
                  : 'bg-gradient-to-r from-[#ea580c] to-[#f97316]'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      },
    }),
    colHelper.display({
      id: 'estado',
      header: 'Estado',
      size: 120,
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
          <div className="font-mono font-bold text-[13px] text-[#1e1b2e]">Bs. {info.getValue().toFixed(2)}</div>
          <div className="text-[11px] text-[#9996b0] font-medium mt-0.5">PVP Unitario</div>
        </div>
      ),
    }),
    colHelper.accessor('precio_costo', {
      header: 'P. Costo / Margen',
      size: 150,
      meta: { align: 'left' },
      cell: (info) => {
        const sale = info.row.original.precio_venta
        const cost = info.getValue()
        const margen = sale > 0 && cost > 0 ? Math.round(((sale - cost) / sale) * 100) : null
        return (
          <div>
            <div className="font-mono text-[13px] text-[#5a5670] font-semibold">Bs. {cost.toFixed(2)}</div>
            {margen !== null && (
              <div className={clsx(
                'inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-1',
                margen > 0 ? 'bg-[#d1fae5] text-[#059669]'
                : margen < 0 ? 'bg-[#fee2e2] text-[#dc2626]'
                : 'bg-[#fff7ed] text-[#ea580c]'
              )}>
                {margen}% margen
              </div>
            )}
          </div>
        )
      },
    }),
    colHelper.display({
      id: 'acciones',
      header: '',
      size: 120,
      meta: { align: 'right' },
      enableSorting: false,
      cell: (info) => {
        const p = info.row.original
        return (
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => handleEdit(p)}
              title="Editar"
              className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#dbeafe] hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-all"
            >
              <i className="ti ti-edit text-[15px]" />
            </button>
            <button
              onClick={() => setEtiquetaProducto(p)}
              title="Etiqueta"
              className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#dbeafe] hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-all"
            >
              <i className="ti ti-printer text-[15px]" />
            </button>
            <button
              onClick={() => setConfirmDelete(p)}
              title="Eliminar"
              className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#dc2626] transition-all"
            >
              <i className="ti ti-trash text-[15px]" />
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
      <div className="bg-[#f1f5f9] min-h-screen">

        {/* ── TopBar ──────────────────────────────────────────────────────── */}
        <header className="bg-[#f1f5f9] sticky top-0 z-40 flex justify-between items-center w-full h-[62px] px-7 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2 text-sm text-[#9996b0] font-semibold">
            <span>Operaciones</span>
            <span className="text-[10px] opacity-40">/</span>
            <strong className="text-[#1e1b2e] font-bold">Inventario</strong>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex bg-white px-3.5 py-1.5 rounded-xl items-center gap-2 border-[1.5px] border-[#e2e8f0]">
              <i className="ti ti-calendar text-[#9996b0] text-[15px]" />
              <span className="text-xs font-semibold text-[#5a5670]">{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-white border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#f1f5f9] transition-colors relative"
                title="Notificaciones"
              >
                <i className="ti ti-bell text-[18px]" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
              </button>
              <button
                className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-white border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#f1f5f9] transition-colors"
                title="Configuración"
              >
                <i className="ti ti-settings text-[18px]" />
              </button>
            </div>
          </div>
        </header>

        <div className="px-7 py-6 max-w-[1400px] mx-auto">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 bg-gradient-to-br from-[#0284c7] to-[#ea580c] rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ boxShadow: '0 6px 18px rgba(2,132,199,0.28)' }}
              >
                <i className="ti ti-package text-2xl" />
              </div>
              <div>
                <h2 className="font-black text-[34px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Inventario
                </h2>
                <p className="text-sm text-[#9996b0] font-semibold mt-0.5">
                  Gestión de repuestos y autopartes
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
              <button
                onClick={() => setImportOpen(true)}
                className="px-[18px] py-2.5 bg-white border-[1.5px] border-[#e2e8f0] rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold text-[#5a5670] hover:bg-[#f1f5f9] transition-all"
              >
                <i className="ti ti-upload text-base" />
                Importar
              </button>
              <button
                onClick={handleNew}
                className="px-[18px] py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold active:scale-95 transition-all shadow-md"
              >
                <i className="ti ti-plus text-base" />
                Nuevo producto
              </button>
            </div>
          </div>

          {/* ── Metrics Grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">

            {/* Total Productos */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#3b82f6] opacity-10" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#60a5fa] flex items-center justify-center text-white mb-3.5">
                <i className="ti ti-box text-xl" />
              </div>
              <div className="font-black text-[30px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {kpi.total.toLocaleString('es-BO')}
              </div>
              <div className="text-xs font-semibold text-[#9996b0] mt-1">Total productos</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0284c7] mt-2">
                <i className="ti ti-circle-check text-[11px]" />
                en catálogo
              </div>
            </div>

            {/* Stock Crítico */}
            <div className={clsx(
              'rounded-2xl border-[1.5px] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200',
              kpi.stockBajo > 0 ? 'bg-[#dc2626]/5 border-[#dc2626]/30' : 'bg-white border-[#e2e8f0]'
            )}>
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#dc2626] opacity-10" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#dc2626] to-[#ff9090] flex items-center justify-center text-white mb-3.5">
                <i className="ti ti-alert-triangle text-xl" />
              </div>
              <div
                className={clsx('font-black text-[30px] leading-none', kpi.stockBajo > 0 ? 'text-[#dc2626]' : 'text-[#1e1b2e]')}
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {kpi.stockBajo}
              </div>
              <div className="text-xs font-semibold text-[#9996b0] mt-1">Stock crítico</div>
              <div className={clsx(
                'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-2',
                kpi.stockBajo > 0 ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#d1fae5] text-[#059669]'
              )}>
                <i className={clsx('text-[11px]', kpi.stockBajo > 0 ? 'ti ti-mood-sad' : 'ti ti-mood-smile')} />
                {kpi.stockBajo > 0 ? 'requiere acción' : 'todo bien'}
              </div>
            </div>

            {/* Valor Almacén */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#059669] opacity-10" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#059669] to-[#4eddc4] flex items-center justify-center text-white mb-3.5">
                <i className="ti ti-currency-dollar text-xl" />
              </div>
              <div
                className="font-black text-[22px] text-[#1e1b2e] leading-none flex items-baseline gap-1"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                <span className="text-sm font-bold text-[#059669]">Bs.</span>
                {fmtBs(kpi.totalValor)}
              </div>
              <div className="text-xs font-semibold text-[#9996b0] mt-1">Valor almacén</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#059669] mt-2">
                <i className="ti ti-trending-up text-[11px]" />
                al costo
              </div>
            </div>

            {/* Unidades Totales */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#0284c7] opacity-10" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#81aaff] flex items-center justify-center text-white mb-3.5">
                <i className="ti ti-stack text-xl" />
              </div>
              <div className="font-black text-[30px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {kpi.totalUnidades.toLocaleString('es-BO')}
              </div>
              <div className="text-xs font-semibold text-[#9996b0] mt-1">Unidades en stock</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0284c7] mt-2">
                <i className="ti ti-building-warehouse text-[11px]" />
                físico
              </div>
            </div>

          </div>

          {/* ── Table Container ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] overflow-hidden">

            {/* Toolbar */}
            <div className="px-5 py-[18px] border-b border-[#e2e8f0] flex flex-wrap justify-between items-center gap-4">
              <h3
                className="text-lg font-extrabold text-[#1e1b2e] flex items-center gap-2"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                Productos
                <span className="bg-[#dbeafe] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {totalCount > 0 ? totalCount : displayProducts.length}
                </span>
              </h3>
              <div className="flex items-center gap-2 bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 w-full sm:w-auto sm:min-w-[250px] focus-within:border-[#1d4ed8] transition-colors">
                <i className="ti ti-search text-[#9996b0] text-base shrink-0" />
                <input
                  className="flex-1 py-2 bg-transparent text-sm text-[#1e1b2e] font-semibold placeholder:text-[#9996b0] outline-none border-none"
                  placeholder="Buscar código, nombre o marca…"
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
                    <thead className="bg-[#f1f5f9]">
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
                                  'px-4 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide select-none whitespace-nowrap',
                                  align === 'center' && 'text-center',
                                  align === 'right'  && 'text-right',
                                  canSort && 'cursor-pointer hover:text-[#5a5670] transition-colors',
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
                                    <i className={clsx(
                                      'text-[12px]',
                                      sorted === 'asc' ? 'ti ti-arrow-up'
                                      : sorted === 'desc' ? 'ti ti-arrow-down'
                                      : 'ti ti-selector'
                                    )} />
                                  )}
                                </span>
                              </th>
                            )
                          })}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-[#e2e8f0] hover:bg-[#faf9ff] transition-colors"
                        >
                          {row.getVisibleCells().map((cell, cellIdx) => {
                            const align = (cell.column.columnDef.meta as ColumnMeta<Producto, unknown> | undefined)?.align ?? 'left'
                            const isKit = row.original.es_kit
                            return (
                              <td
                                key={cell.id}
                                className={clsx(
                                  'px-4 py-3.5 align-middle text-sm',
                                  align === 'center' && 'text-center',
                                  align === 'right'  && 'text-right',
                                  cellIdx === 0 && isKit && 'border-l-[3px] border-l-[#1d4ed8]',
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
              <div className="px-5 py-3.5 bg-[#f1f5f9] border-t border-[#e2e8f0]">
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
        marcas={marcas}
      />
      <ProductoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProducto(null) }}
        onSave={handleSave}
        onDelete={editingProducto ? () => { setModalOpen(false); setConfirmDelete(editingProducto) } : undefined}
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
