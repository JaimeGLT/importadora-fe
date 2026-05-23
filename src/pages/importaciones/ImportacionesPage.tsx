import { useEffect, useMemo, useState } from 'react'
import { useImportacionesStore } from '@/stores/importacionesStore'
import { MainLayout } from '@/components/layout/MainLayout'
import { TablePagination } from '@/components/ui'
import type { Importacion, Producto, Proveedor, ItemImportacion } from '@/types'
import { NuevaImportacionModal } from './NuevaImportacionModal'
import { ImportacionDetailModal } from './ImportacionDetailModal'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { IMPORTACIONES_QUERY, backendToImportacion } from '@/lib/queries/importaciones.queries'
import { PRODUCTOS_QUERY, backendToProductoSimple } from '@/lib/queries/inventario.queries'
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-[#e2e8f0]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 rounded bg-[#f1f5f9]" />
            <div className="h-3 w-48 rounded bg-[#e2e8f0]" />
          </div>
          <div className="h-4 w-20 rounded bg-[#f1f5f9]" />
          <div className="h-4 w-24 rounded bg-[#f1f5f9]" />
          <div className="flex gap-1.5">
            {[0].map(j => <div key={j} className="h-8 w-8 rounded-[10px] bg-[#f1f5f9]" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-12 h-12 rounded-xl bg-white border-[1.5px] border-[#e2e8f0] flex items-center justify-center mb-4">
        <i className="ti ti-package-import text-[#9996b0] text-xl" />
      </div>
      <p className="text-sm font-bold text-[#1e1b2e] mb-1">Sin importaciones</p>
      <p className="text-xs text-[#9996b0] font-semibold max-w-xs text-center mb-5">
        Registra tu primera importación para empezar
      </p>
      <button
        onClick={onNew}
        className="px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-md"
      >
        <i className="ti ti-plus text-base" />
        Nueva importación
      </button>
    </div>
  )
}

// ─── Column helper ────────────────────────────────────────────────────────────

const colHelper = createColumnHelper<Importacion>()

// ─── Main page ────────────────────────────────────────────────────────────────

export function ImportacionesPage() {
  const { isTokenReady } = useAuth()
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [detailImport, setDetailImport] = useState<Importacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])

  const { importaciones, setImportaciones } = useImportacionesStore()

  const dateStr = useMemo(() => new Date().toLocaleDateString('es-BO', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }), [])

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
    gql(PRODUCTOS_QUERY, { first: 5000 })
      .then((res: any) => setProductos(res.productos.nodes.map(backendToProductoSimple)))
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
      fecha: new Date(importacion.fecha_estimada_llegada).toISOString(),
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
        marcaId: it.marcaId ?? null,
        descripcion: it.descripcion ?? '',
        unidad_Medida: it.unidad ?? 'unidad',
        ubicacion: it.ubicacion ?? 'Almacén Central',
        cantidad: it.cantidad,
        stock_Minimo: (it as unknown as { stock_minimo: number }).stock_minimo,
        piezas: it.piezas ?? 1,
        conversionABs: tc,
        costo: it.costo_unitario_total_bs,
        precio: it.precio_venta_final,
      })),
    }
    await api.post('/Producto/importacion', payload)
    loadImportaciones()
    loadProductos()
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
            <div className="text-[13.5px] font-bold text-[#1e1b2e]">{imp.numero}</div>
            <div className="text-[11px] text-[#9996b0] mt-0.5">{imp.proveedor} · {imp.origen}</div>
          </div>
        )
      },
    }),
    colHelper.accessor('fecha_creacion', {
      header: 'Fecha',
      size: 120,
      meta: { align: 'left' },
      cell: (info) => (
        <span className="text-[12.5px] text-[#5a5670] font-medium">{fmtDate(info.getValue())}</span>
      ),
    }),
    colHelper.accessor('fob_total_usd', {
      header: 'FOB Total',
      size: 110,
      meta: { align: 'left' },
      cell: (info) => (
        <div>
          <div className="font-mono font-bold text-[13px] text-[#1e1b2e]">{fmtUSD(info.getValue())}</div>
          <div className="text-[11px] text-[#9996b0] font-medium mt-0.5">USD</div>
        </div>
      ),
    }),
    colHelper.display({
      id: 'costos',
      header: 'Costos adicionales',
      size: 180,
      meta: { align: 'left' },
      cell: (info) => {
        const imp = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#9996b0]">Flete:</span>
              <span className="font-semibold text-[#5a5670] tabular-nums">${imp.flete_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#9996b0]">Aduana:</span>
              <span className="font-semibold text-[#5a5670] tabular-nums">Bs {imp.aduana_bs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#9996b0]">Transp.:</span>
              <span className="font-semibold text-[#5a5670] tabular-nums">Bs {imp.transporte_interno_bs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )
      },
    }),
    colHelper.accessor('tipo_cambio', {
      header: 'Tipo Cambio',
      size: 110,
      meta: { align: 'left' },
      cell: (info) => (
        <div>
          <div className="font-mono font-bold text-[13px] text-[#1e1b2e]">Bs {info.getValue().toFixed(2)}</div>
          <div className="text-[11px] text-[#9996b0] font-medium mt-0.5">por USD</div>
        </div>
      ),
    }),
    colHelper.display({
      id: 'acciones',
      header: '',
      size: 60,
      meta: { align: 'right' },
      cell: (info) => (
        <div className="flex justify-end">
          <button
            onClick={() => setDetailImport(info.row.original)}
            title="Ver detalle"
            className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#dbeafe] hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-all"
          >
            <i className="ti ti-eye text-[15px]" />
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
      <div className="bg-[#f1f5f9] min-h-screen">

        {/* ── TopBar ──────────────────────────────────────────────────────── */}
        <header className="bg-[#f1f5f9] sticky top-0 z-40 flex justify-between items-center w-full h-[62px] px-7 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2 text-sm text-[#9996b0] font-semibold">
            <span>Operaciones</span>
            <span className="text-[10px] opacity-40">/</span>
            <strong className="text-[#1e1b2e] font-bold">Importaciones</strong>
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
                className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#0284c7] rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ boxShadow: '0 6px 18px rgba(124,58,237,0.28)' }}
              >
                <i className="ti ti-package-import text-2xl" />
              </div>
              <div>
                <h2 className="font-black text-[34px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Importaciones
                </h2>
                <p className="text-sm text-[#9996b0] font-semibold mt-0.5">
                  Control de compras y entrada de mercadería
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <button
                onClick={() => setNuevaOpen(true)}
                className="px-[18px] py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold active:scale-95 transition-all shadow-md"
              >
                <i className="ti ti-plus text-base" />
                Nueva importación
              </button>
            </div>
          </div>

          {/* ── KPI Cards ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">

            {/* Total importaciones */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#7c3aed] opacity-10" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#0284c7] flex items-center justify-center text-white mb-3.5">
                <i className="ti ti-package-import text-xl" />
              </div>
              <div className="font-black text-[30px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {kpi.total.toLocaleString('es-BO')}
              </div>
              <div className="text-xs font-semibold text-[#9996b0] mt-1">Total importaciones</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#ede9fe] text-[#7c3aed] mt-2">
                <i className="ti ti-circle-check text-[11px]" />
                registradas
              </div>
            </div>

            {/* Valor FOB total */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#059669] opacity-10" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#059669] to-[#4eddc4] flex items-center justify-center text-white mb-3.5">
                <i className="ti ti-currency-dollar text-xl" />
              </div>
              <div
                className="font-black text-[22px] text-[#1e1b2e] leading-none flex items-baseline gap-1"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                <span className="text-sm font-bold text-[#059669]">USD</span>
                {kpi.valorTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs font-semibold text-[#9996b0] mt-1">Valor FOB total</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#059669] mt-2">
                <i className="ti ti-trending-up text-[11px]" />
                acumulado
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
                Importaciones
                <span className="bg-[#dbeafe] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {globalFilter ? filteredCount : importaciones.length}
                </span>
              </h3>
              <div className="flex items-center gap-2 bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 w-full sm:w-auto sm:min-w-[250px] focus-within:border-[#1d4ed8] transition-colors">
                <i className="ti ti-search text-[#9996b0] text-base shrink-0" />
                <input
                  className="flex-1 py-2 bg-transparent text-sm text-[#1e1b2e] font-semibold placeholder:text-[#9996b0] outline-none border-none"
                  placeholder="Buscar número, proveedor..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Table / skeleton / empty */}
            {loading ? (
              <TableSkeleton />
            ) : importaciones.length === 0 || filteredCount === 0 ? (
              <EmptyState onNew={() => setNuevaOpen(true)} />
            ) : (
              <div className="overflow-x-auto">
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
                          const align   = (header.column.columnDef.meta as ColumnMeta<Importacion, unknown> | undefined)?.align ?? 'left'
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
                                    sorted === 'asc'  ? 'ti ti-arrow-up'
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
                        {row.getVisibleCells().map((cell) => {
                          const align = (cell.column.columnDef.meta as ColumnMeta<Importacion, unknown> | undefined)?.align ?? 'left'
                          return (
                            <td
                              key={cell.id}
                              className={clsx(
                                'px-4 py-3.5 align-middle text-sm',
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
            )}

            {/* Footer */}
            {!loading && importaciones.length > 0 && (
              <div className="px-5 py-3.5 bg-[#f1f5f9] border-t border-[#e2e8f0]">
                <TablePagination table={table} totalRows={filteredCount} />
              </div>
            )}

          </div>
        </div>
      </div>

      <NuevaImportacionModal
        open={nuevaOpen}
        onClose={() => setNuevaOpen(false)}
        onSave={handleSave}
        proveedores={proveedores}
        productos={productos}
        totalImportaciones={importaciones.length}
      />
      <ImportacionDetailModal
        open={!!detailImport}
        onClose={() => setDetailImport(null)}
        importacion={detailImport}
      />
    </MainLayout>
  )
}
