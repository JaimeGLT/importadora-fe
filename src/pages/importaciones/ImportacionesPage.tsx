import { useEffect, useMemo, useState } from 'react'
import { useImportacionesStore } from '@/stores/importacionesStore'
import { useInventarioStore } from '@/stores/inventarioStore'
import { useProveedoresStore } from '@/stores/proveedoresStore'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Button, Input, ConfirmModal, TablePagination } from '@/components/ui'
import { MOCK_IMPORTACIONES, MOCK_ORIGENES } from '@/mock/importaciones'
import { MOCK_PRODUCTOS } from '@/mock/inventario'
import { MOCK_PROVEEDORES } from '@/mock/proveedores'
import type { Importacion, EstadoImportacion } from '@/types'
import { NuevaImportacionModal } from './NuevaImportacionModal'
import { ConfigOrigenModal } from './ConfigOrigenModal'
import { ImportacionDetailModal } from './ImportacionDetailModal'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'
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

const ESTADO_CONFIG: Record<EstadoImportacion, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  en_transito: {
    label: 'En tránsito',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V6a1 1 0 011-1h1m-4 13a1 1 0 001-1V6a1 1 0 00-1-1H6a1 1 0 00-1 1v10a1 1 0 001 1h1m4-1a1 1 0 001-1V6a1 1 0 00-1-1h-1" /></svg>,
  },
  en_aduana: {
    label: 'En aduana',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  },
  recibida: {
    label: 'Recibida',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  },
  cancelada: {
    label: 'Cancelada',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  },
}

const ESTADOS_FLOW: EstadoImportacion[] = ['en_transito', 'en_aduana', 'recibida']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-steel-100 ${className}`}>{children}</div>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 rounded-full bg-brand-600" />
      <h2 className="text-[11px] font-bold text-steel-500 uppercase tracking-widest">{children}</h2>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, dark = false }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; dark?: boolean
}) {
  if (dark) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-steel-900 p-5 text-white shadow-md">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-steel-800" />
        <div className="absolute right-2 -bottom-8 h-24 w-24 rounded-full bg-brand-900 opacity-40" />
        <div className="relative">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">{icon}</div>
          <p className="text-2xl font-black tabular-nums leading-tight">{value}</p>
          <p className="text-xs text-steel-400 font-semibold mt-0.5">{label}</p>
          <p className="text-[10px] text-steel-500 mt-2">{sub}</p>
        </div>
      </div>
    )
  }
  return (
    <Card className="p-5">
      <div className="h-9 w-9 rounded-xl bg-steel-50 flex items-center justify-center mb-3">{icon}</div>
      <p className="text-2xl font-black tabular-nums text-steel-900 leading-tight">{value}</p>
      <p className="text-xs text-steel-500 font-semibold mt-0.5">{label}</p>
      <p className="text-[10px] text-steel-400 mt-2">{sub}</p>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-steel-50">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 rounded bg-steel-100" />
            <div className="h-3 w-48 rounded bg-steel-50" />
          </div>
          <div className="h-4 w-20 rounded bg-steel-100" />
          <div className="h-4 w-24 rounded bg-steel-100" />
          <div className="h-6 w-24 rounded-full bg-steel-100" />
          <div className="flex gap-1">{[0, 1, 2].map(j => <div key={j} className="h-7 w-7 rounded-lg bg-steel-50" />)}</div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="h-14 w-14 rounded-2xl bg-steel-50 border border-steel-100 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-steel-700 mb-1">Sin importaciones</h3>
      <p className="text-xs text-steel-400 text-center max-w-xs mb-5">Registra tu primera importación para empezar</p>
      <Button onClick={onNew} icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}>Nueva importación</Button>
    </div>
  )
}

// ─── Column helper ────────────────────────────────────────────────────────────

const colHelper = createColumnHelper<Importacion>()

// ─── Main page ────────────────────────────────────────────────────────────────

export function ImportacionesPage() {
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [detailImport, setDetailImport] = useState<Importacion | null>(null)
  const [changeEstadoModal, setChangeEstadoModal] = useState<{ imp: Importacion; nextEstado: EstadoImportacion } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [filterEstado, setFilterEstado] = useState<EstadoImportacion | ''>('')

  const { importaciones, setImportaciones, setOrigenes, addImportacion, updateImportacion } = useImportacionesStore()
  const { productos, setProductos } = useInventarioStore()
  const { setProveedores } = useProveedoresStore()

  // Cargar datos
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      if (!cancelled) {
        if (importaciones.length === 0) setImportaciones(MOCK_IMPORTACIONES)
        setOrigenes(MOCK_ORIGENES)
        if (productos.length === 0) setProductos(MOCK_PRODUCTOS, MOCK_PRODUCTOS.length)
        setProveedores(MOCK_PROVEEDORES)
        setLoading(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [importaciones.length, productos.length, setImportaciones, setOrigenes, setProductos, setProveedores])

  // Handlers
  const handleSave = (data: Omit<Importacion, 'id' | 'creado_en' | 'actualizado_en'>) => {
    const ahora = new Date().toISOString()
    const nueva: Importacion = { ...data, id: crypto.randomUUID(), creado_en: ahora, actualizado_en: ahora }
    addImportacion(nueva)

    const updatedProductos = [...productos]
    for (const item of nueva.items) {
      if (item.es_nuevo) {
        updatedProductos.push({
          id: crypto.randomUUID(),
          codigo_universal: item.codigo_proveedor,
          codigos_alternativos: item.codigos_adicionales,
          nombre: item.nombre,
          descripcion: item.descripcion ?? '',
          categoria: 'Otro',
          marca: item.marca ?? '',
          vehiculo: '',
          unidad: item.unidad ?? 'pieza',
          stock: item.cantidad,
          stock_minimo: 5,
          precio_costo: item.costo_unitario_total_bs,
          precio_venta: item.precio_venta_final,
          conversionABs: nueva.tipo_cambio,
          historial_precios: [{ fecha: ahora, precio_costo: item.costo_unitario_total_bs, precio_venta: item.precio_venta_final, tipo_cambio: nueva.tipo_cambio }],
          ubicacion: item.ubicacion ?? 'Almacén Central',
          estado: 'activo',
          proveedor_id: nueva.proveedor,
          creado_en: ahora,
          actualizado_en: ahora,
        })
      } else {
        const idx = updatedProductos.findIndex((p) => p.id === item.producto_id)
        if (idx >= 0) {
          const prev = updatedProductos[idx]
          const actualizarPrecio = item.usar_precio_nuevo !== false
          updatedProductos[idx] = {
            ...prev,
            stock: prev.stock + item.cantidad,
            ...(actualizarPrecio && {
              precio_costo: item.costo_unitario_total_bs,
              precio_venta: item.precio_venta_final,
              conversionABs: nueva.tipo_cambio,
              historial_precios: [
                ...prev.historial_precios,
                {
                  fecha: ahora,
                  precio_costo: prev.precio_costo,
                  precio_venta: prev.precio_venta,
                  tipo_cambio: prev.historial_precios[prev.historial_precios.length - 1]?.tipo_cambio ?? nueva.tipo_cambio,
                },
              ],
            }),
            actualizado_en: ahora,
          }
        }
      }
    }
    setProductos(updatedProductos, updatedProductos.length)
    notify.success(`Importación ${nueva.numero} registrada`)
  }

  const handleChangeEstado = async () => {
    if (!changeEstadoModal) return
    const { imp, nextEstado } = changeEstadoModal
    updateImportacion(imp.id, { estado: nextEstado })
    notify.success(`Estado actualizado a "${ESTADO_CONFIG[nextEstado].label}"`)
    setChangeEstadoModal(null)
  }

  // KPIs
  const kpi = useMemo(() => ({
    total: importaciones.length,
    enTransito: importaciones.filter((i) => i.estado === 'en_transito').length,
    enAduana: importaciones.filter((i) => i.estado === 'en_aduana').length,
    valorTotal: importaciones.reduce((s, i) => s + i.fob_total_usd, 0),
  }), [importaciones])

  // Datos filtrados
  const filteredImportaciones = useMemo(() => {
    return filterEstado
      ? importaciones.filter((i) => i.estado === filterEstado)
      : importaciones
  }, [importaciones, filterEstado])

  // Global filter
  const globalFilterFn = (row: { original: Importacion }, _columnId: string, filterValue: string): boolean => {
    const imp = row.original
    const search = filterValue.toLowerCase().trim()
    if (!search) return true
    return (
      imp.numero.toLowerCase().includes(search) ||
      imp.proveedor.toLowerCase().includes(search) ||
      imp.origen.toLowerCase().includes(search)
    )
  }

  // Columns
  const columns = useMemo(() => [
    colHelper.accessor('numero', {
      header: 'Importación',
      size: 200,
      meta: { align: 'left' },
      cell: (info) => {
        const imp = info.row.original
        return (
          <div>
            <p className="text-sm font-semibold text-steel-900">{imp.numero}</p>
            <p className="text-[11px] text-steel-400 mt-0.5">{imp.proveedor} · {imp.origen}</p>
          </div>
        )
      },
    }),
    colHelper.accessor('fecha_estimada_llegada', {
      header: 'Llegada',
      size: 120,
      meta: { align: 'center' },
      cell: (info) => {
        const imp = info.row.original
        return (
          <div className="text-center">
            <p className="text-xs text-steel-700">{fmtDate(imp.fecha_estimada_llegada)}</p>
            <p className="text-[10px] text-steel-400">{imp.items.length} productos</p>
          </div>
        )
      },
    }),
    colHelper.accessor('fob_total_usd', {
      header: 'FOB',
      size: 100,
      meta: { align: 'right' },
      cell: (info) => (
        <span className="text-sm font-bold text-steel-900 tabular-nums">{fmtUSD(info.getValue())}</span>
      ),
    }),
    colHelper.accessor('estado', {
      header: 'Estado',
      size: 120,
      meta: { align: 'center' },
      cell: (info) => {
        const estado = ESTADO_CONFIG[info.getValue()]
        return (
          <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold', estado.bg, estado.text, estado.border, 'border')}>
            {estado.icon}
            {estado.label}
          </span>
        )
      },
    }),
    colHelper.display({
      id: 'acciones',
      header: 'Acciones',
      size: 130,
      meta: { align: 'right' },
      cell: (info) => {
        const imp = info.row.original
        const currentIndex = ESTADOS_FLOW.indexOf(imp.estado)
        const nextEstado: EstadoImportacion | null = currentIndex >= 0 && currentIndex < ESTADOS_FLOW.length - 1
          ? ESTADOS_FLOW[currentIndex + 1]
          : null

        return (
          <div className="flex justify-end gap-0.5">
            <button
              onClick={() => setDetailImport(imp)}
              className="p-1.5 rounded-lg text-steel-400 hover:text-steel-700 hover:bg-steel-100 transition-colors"
              title="Ver detalle"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            {nextEstado && (
              <button
                onClick={() => setChangeEstadoModal({ imp, nextEstado })}
                className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                title={`Cambiar a ${ESTADO_CONFIG[nextEstado].label}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        )
      },
    }),
  ], [])

  // Table
  const table = useReactTable({
    data: filteredImportaciones,
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

  useEffect(() => {
    table.setPageIndex(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter])

  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <MainLayout>
      <PageContainer>
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">Control de compras</p>
            <h1 className="text-3xl font-black text-steel-900 tracking-tight">Importaciones</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" onClick={() => setConfigOpen(true)} icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }>
              <span className="hidden sm:inline">Configurar</span>
            </Button>
            <Button onClick={() => setNuevaOpen(true)} icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            }>
              Nueva importación
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard dark
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
            label="Total importaciones"
            value={kpi.total}
            sub="registradas"
          />
          <KpiCard
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9" /></svg>}
            label="En tránsito"
            value={kpi.enTransito}
            sub="en camino"
          />
          <KpiCard
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            label="En aduana"
            value={kpi.enAduana}
            sub="pendientes"
          />
          <KpiCard
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Valor FOB total"
            value={fmtUSD(kpi.valorTotal)}
            sub="acumulado USD"
          />
        </div>

        {/* Table */}
        <Card>
          {/* Toolbar */}
          <div className="px-5 pt-5 pb-4 border-b border-steel-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <SectionTitle>Lista de importaciones</SectionTitle>
              <div className="flex-1" />
              <div className="flex items-center gap-3">
                <div className="w-64">
                  <Input
                    placeholder="Buscar número, proveedor..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    leftIcon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
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

            {/* Tabs de filtro */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {(['', 'en_transito', 'en_aduana', 'recibida', 'cancelada'] as const).map((estado) => {
                const cfg = estado ? ESTADO_CONFIG[estado] : null
                const count = estado
                  ? importaciones.filter((i) => i.estado === estado).length
                  : importaciones.length
                return (
                  <button
                    key={estado}
                    onClick={() => setFilterEstado(estado)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      filterEstado === estado
                        ? 'bg-steel-800 text-white border-steel-800'
                        : 'bg-white text-steel-600 border-steel-200 hover:border-steel-300'
                    )}
                  >
                    {cfg ? cfg.label : 'Todas'}
                    <span className={clsx('ml-1.5', filterEstado === estado ? 'text-white/70' : 'text-steel-400')}>
                      ({count})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Table content */}
          {loading ? (
            <TableSkeleton />
          ) : filteredImportaciones.length === 0 ? (
            <EmptyState onNew={() => setNuevaOpen(true)} />
          ) : filteredCount === 0 ? (
            <EmptyState onNew={() => setNuevaOpen(true)} />
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
                        void header.column.getIsSorted()
                        const align = (header.column.columnDef.meta as ColumnMeta<Importacion, unknown> | undefined)?.align ?? 'left'
                        return (
                          <th
                            key={header.id}
                            className={clsx(
                              'px-3 py-3 text-[10px] font-bold text-steel-400 uppercase tracking-widest select-none whitespace-nowrap',
                              align === 'center' && 'text-center',
                              align === 'right' && 'text-right',
                              align === 'left' && 'text-left',
                              canSort && 'cursor-pointer hover:text-steel-600 transition-colors',
                              header.id === 'acciones' && 'pr-5',
                            )}
                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          >
                            <span className={clsx(
                              'inline-flex items-center gap-1',
                              align === 'center' && 'justify-center w-full',
                              align === 'right' && 'justify-end w-full',
                            )}>
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                        const align = (cell.column.columnDef.meta as ColumnMeta<Importacion, unknown> | undefined)?.align ?? 'left'
                        return (
                          <td
                            key={cell.id}
                            className={clsx(
                              'px-3 py-3',
                              align === 'center' && 'text-center',
                              align === 'right' && 'text-right',
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
          {!loading && importaciones.length > 0 && (
            <div className="px-5 py-4 border-t border-steel-100">
              <TablePagination table={table} totalRows={filteredCount} />
            </div>
          )}
        </Card>
      </PageContainer>

      <NuevaImportacionModal
        open={nuevaOpen}
        onClose={() => setNuevaOpen(false)}
        onSave={handleSave}
        productos={productos}
        totalImportaciones={importaciones.length}
      />
      <ConfigOrigenModal open={configOpen} onClose={() => setConfigOpen(false)} />
      <ImportacionDetailModal
        open={!!detailImport}
        onClose={() => setDetailImport(null)}
        importacion={detailImport}
      />
      <ConfirmModal
        open={!!changeEstadoModal}
        onClose={() => setChangeEstadoModal(null)}
        onConfirm={handleChangeEstado}
        title="Cambiar estado"
        message={`¿Cambiar estado a "${changeEstadoModal ? ESTADO_CONFIG[changeEstadoModal.nextEstado].label : ''}"?`}
      />
    </MainLayout>
  )
}