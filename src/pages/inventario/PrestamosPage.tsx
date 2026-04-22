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
import { Button, Input, TablePagination, ConfirmModal, Modal } from '@/components/ui'
import { NuevoPrestamoModal } from './NuevoPrestamoModal'
import { MOCK_PRESTAMOS } from '@/mock/prestamos'
import { MOCK_PRODUCTOS, MOCK_PROVEEDORES } from '@/mock/inventario'
import type { Prestamo, ItemPrestamo } from '@/types'
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
          <div className="h-4 w-20 rounded bg-steel-50" />
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
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [prestamoToCancel, setPrestamoToCancel] = useState<Prestamo | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [prestamoToDetail, setPrestamoToDetail] = useState<Prestamo | null>(null)
  const [filterTab, setFilterTab] = useState<'todos' | 'activo' | 'cancelado'>('activo')
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const { prestamos, setPrestamos, addPrestamo, cancelarPrestamo } = usePrestamosStore()
  const { productos, setProductos, setProveedores } = useInventarioStore()

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

  const handleSave = (items: ItemPrestamo[], prestado_a: string, fecha: string, notas: string) => {
    const total = items.reduce((s, i) => s + i.precio_total, 0)
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
    items.forEach((item) => {
      const updated = productos.map((p) =>
        p.id === item.producto_id
          ? { ...p, stock: p.stock - item.cantidad, actualizado_en: new Date().toISOString() }
          : p,
      )
      setProductos(updated, updated.length)
    })
    notify.success('Préstamo registrado')
    setModalOpen(false)
  }

  const handleCancel = () => {
    if (!prestamoToCancel) return
    cancelarPrestamo(prestamoToCancel.id)
    prestamoToCancel.items.forEach((item) => {
      const updated = productos.map((p) =>
        p.id === item.producto_id
          ? { ...p, stock: p.stock + item.cantidad, actualizado_en: new Date().toISOString() }
          : p,
      )
      setProductos(updated, updated.length)
    })
    notify.success('Préstamo cancelado')
    setCancelModalOpen(false)
    setPrestamoToCancel(null)
  }

  const openCancelModal = (prestamo: Prestamo) => {
    setPrestamoToCancel(prestamo)
    setCancelModalOpen(true)
  }

  const openDetailModal = (prestamo: Prestamo) => {
    setPrestamoToDetail(prestamo)
    setDetailModalOpen(true)
  }

  const filteredPrestamos = useMemo(() => {
    if (filterTab === 'todos') return prestamos
    return prestamos.filter((p) => p.estado === filterTab)
  }, [prestamos, filterTab])

  const kpi = useMemo(() => {
    const activos = prestamos.filter((p) => p.estado === 'activo')
    return {
      total: activos.length,
      totalBs: activos.reduce((s, p) => s + p.items.reduce((si, i) => si + i.precio_total, 0), 0),
      pendientes: activos.filter((p) => {
        const days = (Date.now() - new Date(p.fecha).getTime()) / (1000 * 60 * 60 * 24)
        return days > 7
      }).length,
    }
  }, [prestamos])

  const columns = useMemo(() => [
    colHelper.accessor('items', {
      header: 'Productos',
      size: 280,
      meta: { align: 'left' },
      cell: (info) => {
        const items = info.getValue()
        const first = items[0]
        return (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-brand-600 text-white text-[10px] font-mono font-bold">
                {first.producto_codigo}
              </span>
              {items.length > 1 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-steel-100 text-[10px] font-semibold text-steel-600">
                  +{items.length - 1}
                </span>
              )}
            </div>
            <p className="text-[11px] text-steel-500 truncate">{first.producto_nombre}</p>
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
    colHelper.accessor('items', {
      header: 'Cant.',
      size: 80,
      meta: { align: 'center' },
      cell: (info) => {
        const total = info.getValue().reduce((s, i) => s + i.cantidad, 0)
        return (
          <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg bg-steel-100 text-sm font-bold text-steel-700">
            {total}
          </span>
        )
      },
    }),
    colHelper.accessor('items', {
      header: 'Total',
      size: 100,
      meta: { align: 'right' },
      cell: (info) => {
        const total = info.getValue().reduce((s, i) => s + i.precio_total, 0)
        return (
          <span className="text-sm font-bold text-steel-900 tabular-nums">Bs {total.toFixed(2)}</span>
        )
      },
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
    colHelper.accessor('estado', {
      header: 'Estado',
      size: 100,
      meta: { align: 'center' },
      cell: (info) => {
        const estado = info.getValue()
        return (
          <span className={clsx(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
            estado === 'activo' && 'bg-emerald-100 text-emerald-700',
            estado === 'cancelado' && 'bg-red-100 text-red-700',
            estado === 'devuelto' && 'bg-blue-100 text-blue-700',
          )}>
            {estado.charAt(0).toUpperCase() + estado.slice(1)}
          </span>
        )
      },
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
    colHelper.display({
      id: 'actions',
      header: '',
      size: 80,
      meta: { align: 'right' },
      cell: (info) => {
        const prestamo = info.row.original
        if (prestamo.estado !== 'activo') return null
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              openCancelModal(prestamo)
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )
      },
    }),
  ], [])

  const globalFilterFn = (row: { original: Prestamo }, _columnId: string, filterValue: string): boolean => {
    const p = row.original
    const search = filterValue.toLowerCase().trim()
    if (!search) return true
    return (
      p.items.some((i) => i.producto_nombre.toLowerCase().includes(search) || i.producto_codigo.toLowerCase().includes(search)) ||
      p.prestado_a.toLowerCase().includes(search) ||
      p.notas?.toLowerCase().includes(search)
    )
  }

  const table = useReactTable({
    data: filteredPrestamos,
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KpiCard dark
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
            label="Préstamos activos"
            value={kpi.total}
            sub="registros"
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

        <Card>
          <div className="px-5 pt-5 pb-4 border-b border-steel-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-4">
              <SectionTitle>Lista de préstamos</SectionTitle>
              <div className="flex items-center gap-1 bg-steel-100 rounded-lg p-0.5">
                {(['todos', 'activo', 'cancelado'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                      filterTab === tab
                        ? 'bg-white text-steel-900 shadow-sm'
                        : 'text-steel-500 hover:text-steel-700'
                    )}
                  >
                    {tab === 'todos' ? 'Todos' : tab === 'activo' ? 'Prestados' : 'Cancelados'}
                  </button>
                ))}
              </div>
            </div>
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
                    <tr
                      key={row.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        openDetailModal(row.original)
                      }}
                      className={clsx(
                        'group transition-all cursor-pointer',
                        row.original.estado === 'cancelado'
                          ? 'hover:bg-red-50 hover:shadow-[inset_0_0_0_2px_#dc2626]'
                          : 'hover:bg-brand-50 hover:shadow-[inset_0_0_0_2px_#dc2626]'
                      )}
                    >
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

      <ConfirmModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancel}
        title="Cancelar préstamo"
        message={`¿Cancelar el préstamo a "${prestamoToCancel?.prestado_a}"? Se devolverá el stock al inventario.`}
        confirmText="Cancelar préstamo"
        variant="danger"
      />

      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Préstamo a ${prestamoToDetail?.prestado_a}`}
        size="md"
      >
        {prestamoToDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-steel-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 01225-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span>
                {new Date(prestamoToDetail.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {prestamoToDetail.notas && (
              <p className="text-xs text-steel-400 bg-steel-50 px-3 py-2 rounded-lg">{prestamoToDetail.notas}</p>
            )}

            <div className="divide-y divide-steel-100 border-y border-steel-100">
              {prestamoToDetail.items.map((item) => (
                <div key={item.producto_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-sm bg-brand-600 text-white px-2 py-0.5 rounded">
                        {item.producto_codigo}
                      </span>
                    </div>
                    <p className="text-xs text-steel-500 truncate">{item.producto_nombre}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-steel-400">Bs {item.precio_unitario.toFixed(2)} × {item.cantidad}</p>
                    <p className="text-sm font-bold text-steel-900">Bs {item.precio_total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-steel-200">
              <span className="text-sm font-semibold text-steel-600">Total</span>
              <span className="text-lg font-black text-steel-900">
                Bs {prestamoToDetail.items.reduce((s, i) => s + i.precio_total, 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  )
}