import { useEffect, useState, useMemo } from 'react'
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
import { usePrestamosStore } from '@/stores/prestamosStore'
import { useInventarioStore } from '@/stores/inventarioStore'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Button, Input, TablePagination } from '@/components/ui'
import { NuevoPrestamoModal } from './NuevoPrestamoModal'
import { MOCK_PRESTAMOS } from '@/mock/prestamos'
import { MOCK_PRODUCTOS, MOCK_PROVEEDORES } from '@/mock/inventario'
import type { Prestamo } from '@/types'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right'
  }
}

// ─── UI primitives ───────────────────────────────────────────────────────────

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

function TableSkeleton() {
  return (
    <div className="divide-y divide-steel-50">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 rounded bg-steel-100" />
            <div className="h-3 w-20 rounded bg-steel-50" />
          </div>
          <div className="h-4 w-24 rounded bg-steel-100" />
          <div className="h-4 w-12 rounded bg-steel-100" />
          <div className="h-4 w-20 rounded bg-steel-100" />
          <div className="h-4 w-20 rounded bg-steel-100" />
          <div className="h-4 w-24 rounded bg-steel-50" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onNew, searching }: { onNew: () => void; searching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-14 w-14 rounded-2xl bg-steel-50 border border-steel-100 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-steel-700 mb-1">
        {searching ? 'Sin resultados' : 'Sin préstamos'}
      </h3>
      <p className="text-xs text-steel-400 text-center max-w-xs mb-5">
        {searching
          ? 'No hay préstamos que coincidan con la búsqueda.'
          : 'Registra un nuevo préstamo desde el botón arriba.'}
      </p>
      {!searching && (
        <Button onClick={onNew} icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        }>
          Nuevo préstamo
        </Button>
      )}
    </div>
  )
}

// ─── Column helper ───────────────────────────────────────────────────────────

const colHelper = createColumnHelper<Prestamo>()

// ─── Main page ───────────────────────────────────────────────────────────────

export function PrestamosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const { prestamos, setPrestamos, addPrestamo } = usePrestamosStore()
  const { productos, setProductos, setProveedores } = useInventarioStore()

  // Cargar datos
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      if (!cancelled) {
        if (prestamos.length === 0) setPrestamos(MOCK_PRESTAMOS)
        if (productos.length === 0) {
          setProductos(MOCK_PRODUCTOS, MOCK_PRODUCTOS.length)
          setProveedores(MOCK_PROVEEDORES)
        }
        setLoading(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [prestamos.length, productos.length, setPrestamos, setProductos, setProveedores])

  // Handler
  const handleSave = (data: Omit<Prestamo, 'id' | 'creado_en'>) => {
    const nuevo: Prestamo = { ...data, id: crypto.randomUUID(), creado_en: new Date().toISOString() }
    addPrestamo(nuevo)
    const updated = productos.map((p) =>
      p.id === nuevo.producto_id
        ? { ...p, stock: p.stock - nuevo.cantidad, actualizado_en: new Date().toISOString() }
        : p,
    )
    setProductos(updated, updated.length)
    notify.success('Préstamo registrado')
    setModalOpen(false)
  }

  // KPIs
  const kpi = useMemo(() => ({
    total: prestamos.length,
    totalBs: prestamos.reduce((s, p) => s + p.precio_total, 0),
    pendientes: prestamos.filter((p) => {
      const days = (Date.now() - new Date(p.fecha).getTime()) / (1000 * 60 * 60 * 24)
      return days > 7
    }).length,
  }), [prestamos])

  // Columns
  const columns = useMemo(() => [
    colHelper.accessor('producto_nombre', {
      header: 'Producto',
      size: 280,
      meta: { align: 'left' },
      cell: (info) => {
        const p = info.row.original
        return (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-brand-600 text-white text-[10px] font-mono font-bold">
                {p.producto_codigo}
              </span>
            </div>
            <p className="text-[11px] text-steel-500 truncate">{p.producto_nombre}</p>
          </div>
        )
      },
    }),
    colHelper.accessor('prestado_a', {
      header: 'Prestado a',
      size: 150,
      meta: { align: 'left' },
      cell: (info) => (
        <span className="text-sm font-medium text-steel-700">{info.getValue()}</span>
      ),
    }),
    colHelper.accessor('cantidad', {
      header: 'Cant.',
      size: 80,
      meta: { align: 'center' },
      cell: (info) => (
        <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg bg-steel-100 text-sm font-bold text-steel-700">
          {info.getValue()}
        </span>
      ),
    }),
    colHelper.accessor('precio_unitario', {
      header: 'P. Unitario',
      size: 100,
      meta: { align: 'right' },
      cell: (info) => (
        <span className="text-sm text-steel-600 tabular-nums">Bs {info.getValue().toFixed(2)}</span>
      ),
    }),
    colHelper.accessor('precio_total', {
      header: 'Total',
      size: 100,
      meta: { align: 'right' },
      cell: (info) => (
        <span className="text-sm font-bold text-steel-900 tabular-nums">Bs {info.getValue().toFixed(2)}</span>
      ),
    }),
    colHelper.accessor('fecha', {
      header: 'Fecha',
      size: 120,
      meta: { align: 'left' },
      cell: (info) => (
        <span className="text-xs text-steel-500">
          {new Date(info.getValue()).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    }),
    colHelper.accessor('notas', {
      header: 'Notas',
      size: 150,
      meta: { align: 'left' },
      cell: (info) => (
        <span className="text-xs text-steel-400 truncate block max-w-[140px]">
          {info.getValue() || '—'}
        </span>
      ),
    }),
  ], [])

  // Custom global filter
  const globalFilterFn = (row: { original: Prestamo }, _columnId: string, filterValue: string): boolean => {
    const p = row.original
    const search = filterValue.toLowerCase().trim()
    if (!search) return true
    return (
      p.producto_nombre.toLowerCase().includes(search) ||
      p.producto_codigo.toLowerCase().includes(search) ||
      p.prestado_a.toLowerCase().includes(search) ||
      p.notas?.toLowerCase().includes(search)
    )
  }

  // Table
  const table = useReactTable({
    data: prestamos,
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
            <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">
              Control de salida
            </p>
            <h1 className="text-3xl font-black text-steel-900 tracking-tight">Préstamos</h1>
          </div>
          <Button onClick={() => setModalOpen(true)} icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }>
            Nuevo préstamo
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KpiCard dark
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
            label="Total préstamos"
            value={kpi.total}
            sub="registros activos"
          />
          <KpiCard
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Valor total"
            value={`Bs ${kpi.totalBs.toFixed(0)}`}
            sub="en préstamo"
          />
          <KpiCard
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Antiguos"
            value={kpi.pendientes}
            sub="+7 días"
          />
        </div>

        {/* Table */}
        <Card>
          {/* Toolbar */}
          <div className="px-5 pt-5 pb-4 border-b border-steel-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <SectionTitle>Lista de préstamos</SectionTitle>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="w-72">
                <Input
                  placeholder="Buscar código, nombre, persona..."
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
          ) : prestamos.length === 0 ? (
            <EmptyState onNew={() => setModalOpen(true)} searching={false} />
          ) : filteredCount === 0 ? (
            <EmptyState onNew={() => setModalOpen(true)} searching={!!globalFilter} />
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
                        const align   = (header.column.columnDef.meta as ColumnMeta<Prestamo, unknown> | undefined)?.align ?? 'left'
                        return (
                          <th
                            key={header.id}
                            className={clsx(
                              'px-3 py-3 text-[10px] font-bold text-steel-400 uppercase tracking-widest select-none whitespace-nowrap',
                              align === 'center' && 'text-center',
                              align === 'right'  && 'text-right',
                              align === 'left'   && 'text-left',
                              canSort && 'cursor-pointer hover:text-steel-600 transition-colors',
                            )}
                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          >
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                        const align = (cell.column.columnDef.meta as ColumnMeta<Prestamo, unknown> | undefined)?.align ?? 'left'
                        return (
                          <td
                            key={cell.id}
                            className={clsx(
                              'px-3 py-3',
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
          {!loading && prestamos.length > 0 && (
            <div className="px-5 py-4 border-t border-steel-100">
              <TablePagination table={table} totalRows={filteredCount} />
            </div>
          )}
        </Card>

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