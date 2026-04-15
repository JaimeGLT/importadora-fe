import { useState, useEffect, useMemo, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import Select from 'react-select'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { useAuth } from '@/contexts/AuthContext'
import { useVentasStore } from '@/stores/ventasStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button, Badge } from '@/components/ui'
import { MOCK_RESERVAS } from '@/mock/ventas'
import type { Reserva, OrdenVenta } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBs(n: number) {
  return `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── ReservaTimer ─────────────────────────────────────────────────────────────

function ReservaTimer({ expira_en }: { expira_en: string }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expira_en).getTime() - Date.now()) / 1000)),
  )
  useEffect(() => {
    const id = setInterval(() =>
      setRemaining(Math.max(0, Math.floor((new Date(expira_en).getTime() - Date.now()) / 1000))), 1000)
    return () => clearInterval(id)
  }, [expira_en])

  if (remaining === 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      Vencida
    </span>
  )

  const hours   = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const secs    = remaining % 60
  const isUrgent = remaining < 3600

  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-mono font-semibold tabular-nums',
      isUrgent ? 'text-red-600' : 'text-steel-500')}>
      {isUrgent && (
        <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${secs.toString().padStart(2, '0')}s`}
    </span>
  )
}

// ─── CancelDialog ─────────────────────────────────────────────────────────────

interface CancelDialogProps {
  reserva: Reserva | null
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

function CancelDialog({ reserva, loading, onClose, onConfirm }: CancelDialogProps) {
  return (
    <Transition show={!!reserva} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <DialogPanel className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <DialogTitle className="text-sm font-semibold text-steel-900">Cancelar reserva</DialogTitle>
                  <p className="text-xs text-steel-400">{reserva?.numero}</p>
                </div>
              </div>
              <p className="text-sm text-steel-600 mb-5">
                El stock reservado de {reserva?.items.reduce((s, i) => s + i.cantidad, 0)} ítem{(reserva?.items.reduce((s, i) => s + i.cantidad, 0) ?? 0) !== 1 ? 's' : ''} será liberado.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Volver</Button>
                <Button variant="danger" size="sm" loading={loading} onClick={onConfirm}>Cancelar reserva</Button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

// ─── Column helper ────────────────────────────────────────────────────────────

const col = createColumnHelper<Reserva>()

const CANAL_LABEL = { presencial: '🏪 Presencial', whatsapp: '📱 WhatsApp' }
const CANAL_COLOR: Record<Reserva['canal'], 'blue' | 'green'> = { presencial: 'blue', whatsapp: 'green' }
const ESTADO_COLOR: Record<Reserva['estado'], 'blue' | 'gray' | 'red'> = { activa: 'blue', convertida: 'gray', cancelada: 'red' }
const ESTADO_LABEL: Record<Reserva['estado'], string> = { activa: 'Activa', convertida: 'Convertida', cancelada: 'Cancelada' }

// React Select custom styles matching project palette
const selectStyles = {
  control: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: '36px',
    borderColor: state.isFocused ? '#4F46E5' : '#E2E8F0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(79,70,229,.2)' : 'none',
    borderRadius: '8px',
    fontSize: '13px',
    '&:hover': { borderColor: '#CBD5E1' },
  }),
  option: (base: object, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    fontSize: '13px',
    backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#EEF2FF' : 'white',
    color: state.isSelected ? 'white' : '#0F172A',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (base: object) => ({ ...base, borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,.12)', overflow: 'hidden' }),
}

// ─── ReservasPage ─────────────────────────────────────────────────────────────

type EstadoFilter = { value: string; label: string }
type CanalFilter  = { value: string; label: string }

const ESTADO_OPTIONS: EstadoFilter[] = [
  { value: '',           label: 'Todos los estados' },
  { value: 'activa',     label: '🟢 Activa' },
  { value: 'convertida', label: '✅ Convertida' },
  { value: 'cancelada',  label: '❌ Cancelada' },
]

const CANAL_OPTIONS: CanalFilter[] = [
  { value: '',           label: 'Todos los canales' },
  { value: 'presencial', label: '🏪 Presencial' },
  { value: 'whatsapp',   label: '📱 WhatsApp' },
]

export function ReservasPage() {
  const { user, isTokenReady } = useAuth()
  const navigate = useNavigate()

  const [cancelTarget, setCancelTarget]     = useState<Reserva | null>(null)
  const [convertLoading, setConvertLoading] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading]   = useState(false)
  const [sorting, setSorting]               = useState<SortingState>([])
  const [columnFilters, setColumnFilters]   = useState<ColumnFiltersState>([])
  const [estadoFilter, setEstadoFilter]     = useState<EstadoFilter>(ESTADO_OPTIONS[0])
  const [canalFilter, setCanalFilter]       = useState<CanalFilter>(CANAL_OPTIONS[0])

  const { reservas, ordenes, setReservas, updateReserva, addOrden } = useVentasStore()

  // Load & auto-cancel expired
  useEffect(() => {
    if (!isTokenReady) return
    if (reservas.length === 0) setReservas(MOCK_RESERVAS)
  }, [isTokenReady])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reservas.forEach(r => {
      if (r.estado === 'activa' && new Date(r.expira_en).getTime() <= Date.now()) {
        updateReserva(r.id, { estado: 'cancelada' })
      }
    })
  }, [reservas])  // eslint-disable-line react-hooks/exhaustive-deps

  const filteredData = useMemo(() => {
    return reservas.filter(r => {
      const mine = user?.rol === 'admin' || r.cajero_id === user?.id || !user
      const estadoOk = !estadoFilter.value || r.estado === estadoFilter.value
      const canalOk  = !canalFilter.value  || r.canal  === canalFilter.value
      return mine && estadoOk && canalOk
    })
  }, [reservas, user, estadoFilter, canalFilter])

  // Convert reservation → order
  const handleConvertir = async (reserva: Reserva) => {
    setConvertLoading(reserva.id)
    await new Promise(r => setTimeout(r, 400))
    const orden: OrdenVenta = {
      id: crypto.randomUUID(),
      numero: `ORD-${String(ordenes.length + 1).padStart(3, '0')}`,
      cajero_id: reserva.cajero_id,
      cajero_nombre: reserva.cajero_nombre,
      items: reserva.items.map(item => ({ ...item, id: crypto.randomUUID() })),
      total: reserva.total,
      estado: 'pendiente',
      nota: reserva.nota,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    }
    addOrden(orden)
    updateReserva(reserva.id, { estado: 'convertida' })
    setConvertLoading(null)
    toast.success(`Reserva convertida → ${orden.numero}`)
    navigate('/ventas/caja')
  }

  const handleCancelar = async () => {
    if (!cancelTarget) return
    setCancelLoading(true)
    await new Promise(r => setTimeout(r, 300))
    updateReserva(cancelTarget.id, { estado: 'cancelada' })
    setCancelLoading(false)
    setCancelTarget(null)
    toast.success(`Reserva ${cancelTarget.numero} cancelada`)
  }

  const canCancel = (r: Reserva) =>
    r.estado === 'activa' && (user?.rol === 'admin' || r.cajero_id === user?.id || !user)

  // ─── Table columns ────────────────────────────────────────────────────────

  const columns = useMemo(() => [
    col.accessor('numero', {
      header: '#',
      cell: info => (
        <span className="font-bold text-steel-900 font-mono text-sm">{info.getValue()}</span>
      ),
    }),
    col.accessor('canal', {
      header: 'Canal',
      cell: info => (
        <Badge color={CANAL_COLOR[info.getValue()]}>{CANAL_LABEL[info.getValue()]}</Badge>
      ),
    }),
    col.accessor('cliente_nombre', {
      header: 'Cliente',
      cell: info => {
        const row = info.row.original
        return (
          <div>
            <p className="text-sm font-medium text-steel-900">{info.getValue() ?? <span className="text-steel-300 italic">Sin nombre</span>}</p>
            {row.cliente_telefono && <p className="text-xs text-steel-400">{row.cliente_telefono}</p>}
          </div>
        )
      },
    }),
    col.accessor('items', {
      header: 'Productos',
      enableSorting: false,
      cell: info => {
        const items = info.getValue()
        return (
          <div className="space-y-0.5 max-w-[220px]">
            {items.slice(0, 2).map(item => (
              <p key={item.id} className="text-xs text-steel-600 truncate">
                <span className="font-mono text-brand-600">{item.producto_codigo}</span>
                {' '}× {item.cantidad}
              </p>
            ))}
            {items.length > 2 && (
              <p className="text-xs text-steel-400">+{items.length - 2} más</p>
            )}
          </div>
        )
      },
    }),
    col.accessor('total', {
      header: 'Total',
      cell: info => <span className="text-sm font-bold text-steel-900">{fmtBs(info.getValue())}</span>,
    }),
    col.accessor('expira_en', {
      header: 'Vence en',
      cell: info => {
        const r = info.row.original
        if (r.estado !== 'activa') return <span className="text-xs text-steel-300">—</span>
        return <ReservaTimer expira_en={info.getValue()} />
      },
    }),
    col.accessor('estado', {
      header: 'Estado',
      cell: info => (
        <Badge color={ESTADO_COLOR[info.getValue()]}>{ESTADO_LABEL[info.getValue()]}</Badge>
      ),
    }),
    col.accessor('cajero_nombre', {
      header: 'Cajero',
      cell: info => <span className="text-xs text-steel-500">{info.getValue()}</span>,
    }),
    col.display({
      id: 'acciones',
      header: '',
      cell: info => {
        const r = info.row.original
        const isConverting = convertLoading === r.id
        if (r.estado !== 'activa') return null
        return (
          <div className="flex items-center gap-1.5 justify-end">
            {canCancel(r) && (
              <button
                onClick={() => setCancelTarget(r)}
                className="p-1.5 rounded-lg text-steel-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Cancelar reserva">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <Button size="sm" loading={isConverting} onClick={() => void handleConvertir(r)}
              icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>}>
              Convertir
            </Button>
          </div>
        )
      },
    }),
  ], [convertLoading, canCancel, handleConvertir])  // eslint-disable-line react-hooks/exhaustive-deps

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const activeCount = filteredData.filter(r => r.estado === 'activa').length

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Reservas"
          actions={
            <Button variant="secondary" size="sm" onClick={() => navigate('/ventas/caja')}
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>}>
              Volver a caja
            </Button>
          }
        />

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Activas',     count: reservas.filter(r => r.estado === 'activa').length,     color: 'text-brand-700 bg-brand-50 border-brand-200' },
            { label: 'Convertidas', count: reservas.filter(r => r.estado === 'convertida').length, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Canceladas',  count: reservas.filter(r => r.estado === 'cancelada').length,  color: 'text-steel-500 bg-steel-50 border-steel-200' },
          ].map(s => (
            <div key={s.label} className={clsx('rounded-xl border px-4 py-3 flex flex-col', s.color)}>
              <span className="text-2xl font-bold tabular-nums">{s.count}</span>
              <span className="text-xs font-medium mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="w-44">
            <Select<EstadoFilter>
              options={ESTADO_OPTIONS}
              value={estadoFilter}
              onChange={v => v && setEstadoFilter(v)}
              styles={selectStyles as object}
              isSearchable={false}
            />
          </div>
          <div className="w-44">
            <Select<CanalFilter>
              options={CANAL_OPTIONS}
              value={canalFilter}
              onChange={v => v && setCanalFilter(v)}
              styles={selectStyles as object}
              isSearchable={false}
            />
          </div>
          {(estadoFilter.value || canalFilter.value) && (
            <button
              onClick={() => { setEstadoFilter(ESTADO_OPTIONS[0]); setCanalFilter(CANAL_OPTIONS[0]) }}
              className="text-xs text-steel-400 hover:text-steel-600 flex items-center gap-1 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          )}
        </div>

        {/* Table */}
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-steel-200">
            <div className="h-14 w-14 rounded-full bg-steel-100 flex items-center justify-center mb-3">
              <svg className="h-7 w-7 text-steel-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-steel-500">Sin reservas</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/ventas/caja')}>
              Crear desde caja
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-steel-200 shadow-sm overflow-hidden">
            {/* Mobile: card list */}
            <div className="sm:hidden divide-y divide-steel-100">
              {table.getRowModel().rows.map(row => {
                const r = row.original
                const isConverting = convertLoading === r.id
                return (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-steel-900 font-mono">{r.numero}</span>
                        <Badge color={ESTADO_COLOR[r.estado]}>{ESTADO_LABEL[r.estado]}</Badge>
                        <Badge color={CANAL_COLOR[r.canal]}>{CANAL_LABEL[r.canal]}</Badge>
                      </div>
                      <span className="text-sm font-bold text-steel-900">{fmtBs(r.total)}</span>
                    </div>
                    {r.cliente_nombre && <p className="text-sm text-steel-600">{r.cliente_nombre}</p>}
                    <div className="flex items-center justify-between">
                      {r.estado === 'activa' ? <ReservaTimer expira_en={r.expira_en} /> : <span />}
                      {r.estado === 'activa' && (
                        <div className="flex items-center gap-1.5">
                          {canCancel(r) && (
                            <button onClick={() => setCancelTarget(r)}
                              className="p-1.5 rounded-lg text-steel-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <Button size="sm" loading={isConverting} onClick={() => void handleConvertir(r)}>
                            Convertir
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: TanStack Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id} className="border-b border-steel-100 bg-steel-50/60">
                      {hg.headers.map(header => (
                        <th key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className={clsx(
                            'px-4 py-2.5 text-xs font-semibold text-steel-500 uppercase tracking-wider whitespace-nowrap',
                            header.column.getCanSort() && 'cursor-pointer select-none hover:text-steel-700',
                          )}>
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              <span className="text-steel-300">
                                {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ' ↕'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-steel-50">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id}
                      className={clsx(
                        'hover:bg-steel-50/50 transition-colors',
                        row.original.estado === 'convertida' && 'bg-green-50/30',
                        row.original.estado === 'cancelada' && 'opacity-50',
                      )}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-3 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table footer */}
              <div className="px-4 py-2.5 border-t border-steel-100 flex items-center justify-between">
                <span className="text-xs text-steel-400">
                  {table.getRowModel().rows.length} reserva{table.getRowModel().rows.length !== 1 ? 's' : ''}
                  {activeCount > 0 && <span className="ml-2 text-brand-600 font-medium">· {activeCount} activa{activeCount !== 1 ? 's' : ''}</span>}
                </span>
              </div>
            </div>
          </div>
        )}
      </PageContainer>

      <CancelDialog
        reserva={cancelTarget}
        loading={cancelLoading}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => void handleCancelar()}
      />
    </MainLayout>
  )
}
