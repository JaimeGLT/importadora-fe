import { useEffect, useMemo, useState } from 'react'
import { useImportacionesStore } from '@/stores/importacionesStore'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Button, Input, TablePagination } from '@/components/ui'
import type { Importacion, Producto, Proveedor, ItemImportacion } from '@/types'
import { NuevaImportacionModal } from './NuevaImportacionModal'
import { ConfigOrigenModal } from './ConfigOrigenModal'
import { ImportacionDetailModal } from './ImportacionDetailModal'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { IMPORTACIONES_QUERY, backendToImportacion } from '@/lib/queries/importaciones.queries'
import { PRODUCTOS_LIST_QUERY, backendToProductoSimple } from '@/lib/queries/inventario.queries'
import { api } from '@/lib/api'
import type { DtoImportacion } from '@/lib/queries/importaciones.queries'
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

const PROVEEDORES_QUERY = `
  query ProveedoresList {
    proveedor {
      nodes {
        id
        nombre
        nota
        pais
        moneda
        terminos
        nombre_Contacto
        email
        telefono
        tiempoReposicion
        sitioWeb
        estado
      }
    }
  }
`

function backendToProveedor(b: {
  id: number; nombre: string; nota: string; pais: string; moneda: string
  terminos: string; nombre_Contacto: string; email: string; telefono: string
  tiempoReposicion: number; sitioWeb: string; estado: boolean
}): Proveedor {
  return {
    id: String(b.id),
    nombre: b.nombre,
    pais: b.pais,
    moneda: b.moneda as Proveedor['moneda'],
    terminos_pago: b.terminos as Proveedor['terminos_pago'],
    contacto: b.nombre_Contacto,
    email: b.email,
    telefono: b.telefono,
    sitio_web: b.sitioWeb,
    notas: b.nota,
    tiempo_reposicion_dias: b.tiempoReposicion,
    estado: b.estado ? 'activo' : 'inactivo',
    creado_en: '',
    actualizado_en: '',
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
          <div className="flex gap-1">{[0, 1].map(j => <div key={j} className="h-7 w-7 rounded-lg bg-steel-50" />)}</div>
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
  const { isTokenReady } = useAuth()
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [detailImport, setDetailImport] = useState<Importacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])

  const { importaciones, setImportaciones } = useImportacionesStore()

  const loadImportaciones = () => {
    let cancelled = false
    setLoading(true)
    gql<{ importacion: { nodes: unknown[] } }>(IMPORTACIONES_QUERY)
      .then(res => {
        if (cancelled) return
        setImportaciones(res.importacion.nodes.map((n: unknown) => backendToImportacion(n as Parameters<typeof backendToImportacion>[0])))
      })
      .catch(() => notify.error('Error cargando importaciones'))
      .finally(() => { if (!cancelled) setLoading(false) })
  }

  const loadProveedores = () => {
    gql<{ proveedor: { nodes: { id: number; nombre: string; nota: string; pais: string; moneda: string; terminos: string; nombre_Contacto: string; email: string; telefono: string; tiempoReposicion: number; sitioWeb: string; estado: boolean }[] } }>(PROVEEDORES_QUERY)
      .then(res => setProveedores(res.proveedor.nodes.map(n => backendToProveedor(n))))
      .catch(() => notify.error('Error cargando proveedores'))
  }

  const loadProductos = () => {
    gql<{ productos: { nodes: { id: string | number; codigo: string; codigoAux: string; codigoAux2: string; nombre: string; marca: string; descripcion: string; unidad_Medida: string; ubicacion: string; stock_Actual: number; stock_Minimo: number; costo: number; precio: number; historialPrecios: { id: number; id_producto: number; fecha: string; costo: number; precio: number; conversionABs: number; nota: string | null }[] }[] } }>(PRODUCTOS_LIST_QUERY)
      .then(res => setProductos(res.productos.nodes.map(backendToProductoSimple)))
      .catch(() => notify.error('Error cargando productos'))
  }

  useEffect(() => {
    if (!isTokenReady) return
    loadImportaciones()
    loadProveedores()
    loadProductos()
  }, [isTokenReady])

  const handleSave = async (
    importacion: Omit<Importacion, 'id' | 'creado_en' | 'actualizado_en'>,
    proveedorId: number,
  ) => {
    const tc = importacion.tipo_cambio
    const fobTotal = importacion.items.reduce((s: number, i: ItemImportacion) => s + i.precio_fob_usd * i.cantidad, 0)
    const payload: DtoImportacion = {
      id_Proveedor: proveedorId,
      fecha: new Date().toISOString(),
      conversionABs: tc,
      costoTotal: fobTotal,
      f_Internacional: importacion.flete_usd,
      aduana_Arancel: importacion.aduana_bs,
      trasporte_Interno: importacion.transporte_interno_bs,
      productos: importacion.items.map(it => ({
        codigo: it.codigo_proveedor,
        codigoAux: it.codigos_adicionales[0] ?? '',
        codigoAux2: it.codigos_adicionales[1] ?? '',
        nombre: it.nombre,
        marca: it.marca ?? '',
        descripcion: it.descripcion ?? '',
        unidad_Medida: it.unidad ?? 'pieza',
        ubicacion: it.ubicacion ?? 'Almacén Central',
        stock_Actual: it.cantidad,
        stock_Minimo: (it as unknown as { stock_minimo: number }).stock_minimo,
        costo: it.costo_unitario_total_bs,
        precio: it.precio_venta_final,
      })),
    }
    await api.post('/Producto/importacion', payload)
    loadImportaciones()
    notify.success('Importación registrada')
  }

  const kpi = useMemo(() => ({
    total: importaciones.length,
    valorTotal: importaciones.reduce((s, i) => s + i.fob_total_usd, 0),
  }), [importaciones])

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

  const columns = useMemo(() => [
    colHelper.accessor('numero', {
      header: 'Importación',
      size: 220,
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
      header: 'Fecha',
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
    colHelper.display({
      id: 'acciones',
      header: '',
      size: 80,
      meta: { align: 'right' },
      cell: (info) => (
        <div className="flex justify-end gap-0.5">
          <button
            onClick={() => setDetailImport(info.row.original)}
            className="p-1.5 rounded-lg text-steel-400 hover:text-steel-700 hover:bg-steel-100 transition-colors"
            title="Ver detalle"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      ),
    }),
  ], [])

  const table = useReactTable({
    data: importaciones,
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
          </div>

          {/* Table content */}
          {loading ? (
            <TableSkeleton />
          ) : importaciones.length === 0 ? (
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
        proveedores={proveedores}
        productos={productos}
        totalImportaciones={importaciones.length}
      />
      <ConfigOrigenModal open={configOpen} onClose={() => setConfigOpen(false)} />
      <ImportacionDetailModal
        open={!!detailImport}
        onClose={() => setDetailImport(null)}
        importacion={detailImport}
      />
    </MainLayout>
  )
}