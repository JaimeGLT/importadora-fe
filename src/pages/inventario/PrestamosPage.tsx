import { useEffect, useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnMeta,
} from '@tanstack/react-table'
import { MainLayout } from '@/components/layout/MainLayout'
import { ConfirmModal, TablePagination } from '@/components/ui'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { clsx } from 'clsx'
import { PrestamoModal } from './PrestamoModal'
import {
  PRESTAMOS_QUERY,
  backendToPrestamo,
  type Prestamo,
  type PrestamoAPI,
  type PrestamoCreateData,
} from '@/lib/queries/prestamos.queries'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right'
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-[#e2e8f0]">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
          <div className="flex-1 space-y-1.5">
            <div className="h-[13px] w-32 rounded bg-[#f1f5f9]" />
            <div className="h-3 w-44 rounded bg-[#e2e8f0]" />
          </div>
          <div className="h-3 w-20 rounded bg-[#f1f5f9]" />
          <div className="h-6 w-16 rounded-full bg-[#f1f5f9]" />
          <div className="h-3 w-16 rounded bg-[#e2e8f0]" />
          <div className="flex gap-1.5">
            {[0, 1].map((j) => <div key={j} className="h-8 w-8 rounded-[10px] bg-[#f1f5f9]" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Mobile skeleton ──────────────────────────────────────────────────────────

function MobileSkeletonRows() {
  return (
    <div className="divide-y divide-[#e2e8f0]">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-[42px] h-[42px] rounded-xl bg-[#f1f5f9] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded bg-[#f1f5f9]" />
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew, searching }: { onNew: () => void; searching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
      <div className="w-12 h-12 rounded-xl bg-white border-[1.5px] border-[#e2e8f0] flex items-center justify-center mb-4">
        <i className="ti ti-arrows-exchange text-[#9996b0] text-xl" />
      </div>
      <p className="text-sm font-bold text-[#1e1b2e] mb-1">
        {searching ? 'Sin resultados' : 'Sin préstamos'}
      </p>
      <p className="text-xs text-[#9996b0] font-semibold max-w-xs mb-5">
        {searching
          ? 'No hay préstamos que coincidan con esta búsqueda o filtro.'
          : 'Registra el primer préstamo con el botón de arriba.'}
      </p>
      {!searching && (
        <button
          onClick={onNew}
          className="px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-md"
        >
          <i className="ti ti-plus text-base" />
          Nuevo préstamo
        </button>
      )}
    </div>
  )
}

// ─── Estado badge ──────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'Activo') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#d1fae5] text-[#059669]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#059669] shrink-0" />
        Activo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#dbeafe] text-[#1d4ed8]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8] shrink-0" />
      Devuelto
    </span>
  )
}

// ─── Mobile row ───────────────────────────────────────────────────────────────

function MobilePrestamoRow({ p, onTap }: { p: Prestamo; onTap: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-[#e2e8f0] last:border-0 active:bg-[#f1f5f9] transition-colors cursor-pointer"
      onClick={onTap}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="w-[42px] h-[42px] bg-[#f1f5f9] rounded-xl border-[1.5px] border-[#e2e8f0] flex items-center justify-center shrink-0">
        <i className="ti ti-user text-[#9996b0] text-[18px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[13px] text-[#1e1b2e] leading-tight truncate">{p.clienteNombreCompleto}</div>
        <div className="text-[11px] text-[#9996b0] font-medium mt-0.5">
          {p.detalle.length} producto{p.detalle.length !== 1 ? 's' : ''} · {new Date(p.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <EstadoBadge estado={p.estado} />
        <span className="font-mono text-[12px] font-bold text-[#1e1b2e]">
          Bs. {p.total.toFixed(2)}
        </span>
      </div>
      <i className="ti ti-chevron-right text-[#9996b0] text-lg ml-1" />
    </div>
  )
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function DetailDrawer({
  prestamo,
  open,
  onClose,
  onDevolver,
}: {
  prestamo: Prestamo | null
  open: boolean
  onClose: () => void
  onDevolver: (p: Prestamo) => void
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-50 transition-opacity duration-200"
        style={{
          background: 'rgba(30,27,46,0.4)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white border-l border-[#e2e8f0] z-[60] flex flex-col"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.2, 1)',
          boxShadow: '-24px 0 40px -20px rgba(30,27,46,0.15)',
        }}
      >
        {prestamo && (
          <>
            {/* Header */}
            <div className="px-6 sm:px-8 pt-7 pb-[22px] border-b border-[#e2e8f0] flex items-start justify-between gap-3 shrink-0 bg-[#f1f5f9]">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#9996b0] font-semibold mb-1.5">
                  Detalle de préstamo
                </div>
                <h2 className="font-black text-[26px] text-[#1e1b2e] leading-tight mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {prestamo.clienteNombreCompleto}
                </h2>
                <div className="flex items-center gap-2">
                  <EstadoBadge estado={prestamo.estado} />
                  <span className="text-[12px] text-[#9996b0] font-semibold">
                    {new Date(prestamo.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-[8px] text-[#9996b0] hover:text-[#1e1b2e] hover:bg-[#e2e8f0] transition-colors shrink-0 mt-1"
              >
                <i className="ti ti-x text-xl" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
              {prestamo.cliente.telefono && (
                <div className="flex items-center gap-2 text-[13px] text-[#5a5670]">
                  <i className="ti ti-phone text-[#9996b0] text-base" />
                  {prestamo.cliente.telefono}
                </div>
              )}

              {prestamo.nota && (
                <div className="rounded-xl bg-[#f1f5f9] border border-[#e2e8f0] px-4 py-3 text-[13px] text-[#5a5670]">
                  {prestamo.nota}
                </div>
              )}

              <div>
                <p className="text-[10.5px] uppercase tracking-[0.1em] font-bold text-[#9996b0] mb-3">Productos prestados</p>
                <div className="divide-y divide-[#e2e8f0] border-y border-[#e2e8f0]">
                  {prestamo.detalle.map((det) => (
                    <div key={det.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-bold text-[12.5px] text-[#1e1b2e] tracking-[0.05em]">{det.codigo}</div>
                        <p className="text-[11.5px] text-[#9996b0] truncate mt-0.5">{det.nombre}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-[#9996b0]">
                          Bs. {det.precio.toFixed(2)} × {det.cantidad}
                        </p>
                        <p className="text-[13.5px] font-bold text-[#1e1b2e] tabular-nums">
                          Bs. {det.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[13px] font-semibold text-[#5a5670]">Total préstamo</span>
                <span className="font-mono font-black text-[26px] text-[#1e1b2e]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Bs. {prestamo.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-8 py-[18px] border-t border-[#e2e8f0] bg-[#f1f5f9] flex justify-end gap-2.5 shrink-0">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-[#5a5670] border border-[#e2e8f0] bg-white hover:bg-[#f1f5f9] transition-colors"
              >
                Cerrar
              </button>
              {prestamo.estado === 'Activo' && (
                <button
                  onClick={() => { onClose(); onDevolver(prestamo) }}
                  className="px-5 py-2.5 rounded-xl text-[13.5px] font-bold bg-[#1d4ed8] hover:bg-[#1e40af] text-white transition-colors flex items-center gap-2 shadow-md"
                >
                  <i className="ti ti-arrow-back text-base" />
                  Marcar devuelto
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}

// ─── Column helper ─────────────────────────────────────────────────────────────

const colHelper = createColumnHelper<Prestamo>()

// ─── Format helpers ────────────────────────────────────────────────────────────

const fmtBs = (n: number) =>
  n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })

// ─── Main page ─────────────────────────────────────────────────────────────────

type EstadoFilter = 'todos' | 'Activo' | 'Devuelto'

export function PrestamosPage() {
  const { isTokenReady } = useAuth()

  const [prestamos, setPrestamos]             = useState<Prestamo[]>([])
  const [totalCount, setTotalCount]           = useState(0)
  const [hasNextPage, setHasNextPage]         = useState(false)
  const [endCursor, setEndCursor]             = useState<string | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [sorting, setSorting]                 = useState<SortingState>([])
  const [searchTerm, setSearchTerm]           = useState('')
  const [filterEstado, setFilterEstado]       = useState<EstadoFilter>('todos')
  const [modalOpen, setModalOpen]             = useState(false)
  const [detailPrestamo, setDetailPrestamo]   = useState<Prestamo | null>(null)
  const [detailOpen, setDetailOpen]           = useState(false)
  const [confirmDevolver, setConfirmDevolver] = useState<Prestamo | null>(null)
  const [devolviendo, setDevolviendo]         = useState(false)

  const dateStr = useMemo(() => new Date().toLocaleDateString('es-BO', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }), [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const loadPrestamos = (cursor?: string | null) => {
    setLoading(true)
    gql<{ prestamos: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: PrestamoAPI[] } }>(
      PRESTAMOS_QUERY,
      { first: 50, after: cursor },
    )
      .then((res) => {
        const { totalCount: tc, pageInfo, nodes } = res.prestamos
        setPrestamos((prev) => cursor ? [...prev, ...nodes.map(backendToPrestamo)] : nodes.map(backendToPrestamo))
        setTotalCount(tc)
        setHasNextPage(pageInfo.hasNextPage)
        setEndCursor(pageInfo.endCursor)
      })
      .catch(() => notify.error('Error cargando préstamos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isTokenReady) return
    loadPrestamos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenReady])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSave = async (data: PrestamoCreateData) => {
    await api.post('/Prestamo', data)
    setModalOpen(false)
    loadPrestamos()
    notify.success('Préstamo registrado', { description: `Cliente ID ${data.id_Cliente}` })
  }

  const handleDevolver = async () => {
    if (!confirmDevolver) return
    setDevolviendo(true)
    try {
      await api.post(`/Prestamo/Devolver/${confirmDevolver.id}`)
      setConfirmDevolver(null)
      loadPrestamos()
      notify.success('Préstamo devuelto', { description: confirmDevolver.clienteNombreCompleto })
    } catch {
      notify.error('Error al devolver préstamo')
    } finally {
      setDevolviendo(false)
    }
  }

  // ── Filtered display ───────────────────────────────────────────────────────
  const displayPrestamos = useMemo(() => {
    let list = prestamos
    if (filterEstado !== 'todos') list = list.filter((p) => p.estado === filterEstado)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter((p) =>
        p.clienteNombreCompleto.toLowerCase().includes(q) ||
        p.detalle.some((d) => d.codigo.toLowerCase().includes(q) || d.nombre.toLowerCase().includes(q)) ||
        p.nota.toLowerCase().includes(q) ||
        p.cliente.telefono.includes(q),
      )
    }
    return list
  }, [prestamos, filterEstado, searchTerm])

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => ({
    total:        totalCount || prestamos.length,
    activos:      prestamos.filter((p) => p.estado === 'Activo').length,
    devueltos:    prestamos.filter((p) => p.estado === 'Devuelto').length,
    valorActivo:  prestamos.filter((p) => p.estado === 'Activo').reduce((s, p) => s + p.total, 0),
  }), [prestamos, totalCount])

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    colHelper.accessor('clienteNombreCompleto', {
      header: 'Cliente',
      size: 200,
      meta: { align: 'left' },
      cell: (info) => {
        const p = info.row.original
        return (
          <div>
            <div className="font-semibold text-[13.5px] text-[#1e1b2e] leading-tight">{info.getValue()}</div>
            {p.cliente.telefono && (
              <div className="text-[11px] text-[#9996b0] mt-0.5">{p.cliente.telefono}</div>
            )}
          </div>
        )
      },
    }),
    colHelper.accessor('detalle', {
      header: 'Productos',
      size: 200,
      meta: { align: 'left' },
      enableSorting: false,
      cell: (info) => {
        const det = info.getValue()
        const first = det[0]
        return (
          <div>
            <div className="flex items-center gap-1.5">
              {first && (
                <span className="font-mono font-bold text-[12px] text-[#1e1b2e] tracking-[0.05em]">
                  {first.codigo}
                </span>
              )}
              {det.length > 1 && (
                <span className="text-[10px] font-bold text-[#1d4ed8] bg-[#dbeafe] px-1.5 py-0.5 rounded-full">
                  +{det.length - 1}
                </span>
              )}
            </div>
            {first && (
              <div className="text-[11px] text-[#9996b0] mt-0.5 truncate max-w-[160px]">{first.nombre}</div>
            )}
          </div>
        )
      },
    }),
    colHelper.accessor('fecha', {
      header: 'Fecha',
      size: 130,
      meta: { align: 'left' },
      cell: (info) => (
        <span className="text-[12.5px] text-[#5a5670] font-medium">{fmtFecha(info.getValue())}</span>
      ),
    }),
    colHelper.accessor('total', {
      header: 'Total',
      size: 120,
      meta: { align: 'left' },
      cell: (info) => (
        <div>
          <div className="font-mono font-bold text-[13px] text-[#1e1b2e]">Bs. {fmtBs(info.getValue())}</div>
          <div className="text-[11px] text-[#9996b0] font-medium mt-0.5">Total prestado</div>
        </div>
      ),
    }),
    colHelper.accessor('estado', {
      header: 'Estado',
      size: 120,
      meta: { align: 'left' },
      cell: (info) => <EstadoBadge estado={info.getValue()} />,
    }),
    colHelper.display({
      id: 'acciones',
      header: '',
      size: 100,
      meta: { align: 'right' },
      enableSorting: false,
      cell: (info) => {
        const p = info.row.original
        return (
          <div className="flex justify-end gap-1.5">
            <button
              title="Ver detalle"
              onClick={(e) => { e.stopPropagation(); setDetailPrestamo(p); setDetailOpen(true) }}
              className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#dbeafe] hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-all"
            >
              <i className="ti ti-eye text-[15px]" />
            </button>
            {p.estado === 'Activo' && (
              <button
                title="Marcar devuelto"
                onClick={(e) => { e.stopPropagation(); setConfirmDevolver(p) }}
                className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#d1fae5] hover:text-[#059669] hover:border-[#059669] transition-all"
              >
                <i className="ti ti-arrow-back text-[15px]" />
              </button>
            )}
          </div>
        )
      },
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  // ── Table ──────────────────────────────────────────────────────────────────
  const table = useReactTable({
    data: displayPrestamos,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25, pageIndex: 0 } },
  })

  useEffect(() => {
    table.setPageIndex(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterEstado])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="bg-[#f1f5f9] min-h-screen">

        {/* ── TopBar ──────────────────────────────────────────────────────── */}
        <header className="bg-[#f1f5f9] sticky top-0 z-40 flex justify-between items-center w-full h-[62px] px-7 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2 text-sm text-[#9996b0] font-semibold">
            <span>Operaciones</span>
            <span className="text-[10px] opacity-40">/</span>
            <span>Inventario</span>
            <span className="text-[10px] opacity-40">/</span>
            <strong className="text-[#1e1b2e] font-bold">Préstamos</strong>
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
                className="w-12 h-12 bg-gradient-to-br from-[#0284c7] to-[#059669] rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ boxShadow: '0 6px 18px rgba(2,132,199,0.28)' }}
              >
                <i className="ti ti-arrows-exchange text-2xl" />
              </div>
              <div>
                <h2 className="font-black text-[34px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Préstamos
                </h2>
                <p className="text-sm text-[#9996b0] font-semibold mt-0.5">
                  Control de salida y devolución de productos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setModalOpen(true)}
                className="px-[18px] py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold active:scale-95 transition-all shadow-md"
              >
                <i className="ti ti-plus text-base" />
                Nuevo préstamo
              </button>
            </div>
          </div>

          {/* ── Metrics Grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">

            {/* Total préstamos */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#3b82f6] opacity-10" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#60a5fa] flex items-center justify-center text-white mb-3.5">
                <i className="ti ti-arrows-exchange text-xl" />
              </div>
              <div className="font-black text-[30px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {kpi.total.toLocaleString('es-BO')}
              </div>
              <div className="text-xs font-semibold text-[#9996b0] mt-1">Total préstamos</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0284c7] mt-2">
                <i className="ti ti-circle-check text-[11px]" />
                registrados
              </div>
            </div>

            {/* Activos */}
            <div className={clsx(
              'rounded-2xl border-[1.5px] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200',
              kpi.activos > 0 ? 'bg-[#fef9c3]/40 border-[#ca8a04]/30' : 'bg-white border-[#e2e8f0]',
            )}>
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#f59e0b] opacity-10" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] flex items-center justify-center text-white mb-3.5">
                <i className="ti ti-clock text-xl" />
              </div>
              <div
                className={clsx('font-black text-[30px] leading-none', kpi.activos > 0 ? 'text-[#ca8a04]' : 'text-[#1e1b2e]')}
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {kpi.activos}
              </div>
              <div className="text-xs font-semibold text-[#9996b0] mt-1">Activos</div>
              <div className={clsx(
                'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-2',
                kpi.activos > 0 ? 'bg-[#fef9c3] text-[#ca8a04]' : 'bg-[#d1fae5] text-[#059669]',
              )}>
                <i className={clsx('text-[11px]', kpi.activos > 0 ? 'ti ti-clock' : 'ti ti-mood-smile')} />
                {kpi.activos > 0 ? 'en préstamo' : 'todo devuelto'}
              </div>
            </div>

            {/* Devueltos */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#059669] opacity-10" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#059669] to-[#4eddc4] flex items-center justify-center text-white mb-3.5">
                <i className="ti ti-arrow-back text-xl" />
              </div>
              <div className="font-black text-[30px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {kpi.devueltos}
              </div>
              <div className="text-xs font-semibold text-[#9996b0] mt-1">Devueltos</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#059669] mt-2">
                <i className="ti ti-circle-check text-[11px]" />
                completados
              </div>
            </div>

            {/* Valor activo */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#0284c7] opacity-10" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#81aaff] flex items-center justify-center text-white mb-3.5">
                <i className="ti ti-currency-dollar text-xl" />
              </div>
              <div
                className="font-black text-[22px] text-[#1e1b2e] leading-none flex items-baseline gap-1"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                <span className="text-sm font-bold text-[#0284c7]">Bs.</span>
                {fmtBs(kpi.valorActivo)}
              </div>
              <div className="text-xs font-semibold text-[#9996b0] mt-1">Valor activo</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0284c7] mt-2">
                <i className="ti ti-trending-up text-[11px]" />
                en préstamo
              </div>
            </div>

          </div>

          {/* ── Table Container ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] overflow-hidden">

            {/* Toolbar */}
            <div className="px-5 py-[18px] border-b border-[#e2e8f0] flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h3
                  className="text-lg font-extrabold text-[#1e1b2e] flex items-center gap-2"
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                >
                  Préstamos
                  <span className="bg-[#dbeafe] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {displayPrestamos.length}
                  </span>
                </h3>

                {/* Estado filter tabs */}
                <div className="flex items-center gap-1 bg-[#f1f5f9] rounded-xl p-1 border border-[#e2e8f0]">
                  {(['todos', 'Activo', 'Devuelto'] as EstadoFilter[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterEstado(tab)}
                      className={clsx(
                        'px-3 py-1 text-[12px] font-bold rounded-[8px] transition-all',
                        filterEstado === tab
                          ? 'bg-white text-[#1e1b2e] shadow-sm border border-[#e2e8f0]'
                          : 'text-[#9996b0] hover:text-[#5a5670]',
                      )}
                    >
                      {tab === 'todos' ? 'Todos' : tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 w-full sm:w-auto sm:min-w-[250px] focus-within:border-[#1d4ed8] transition-colors">
                <i className="ti ti-search text-[#9996b0] text-base shrink-0" />
                <input
                  className="flex-1 py-2 bg-transparent text-sm text-[#1e1b2e] font-semibold placeholder:text-[#9996b0] outline-none border-none"
                  placeholder="Buscar cliente, código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Table / skeleton / empty */}
            {loading ? (
              <>
                <div className="hidden md:block"><TableSkeleton /></div>
                <div className="md:hidden"><MobileSkeletonRows /></div>
              </>
            ) : displayPrestamos.length === 0 ? (
              <EmptyState onNew={() => setModalOpen(true)} searching={!!searchTerm || filterEstado !== 'todos'} />
            ) : (
              <>
                {/* Desktop table */}
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
                            const align   = (header.column.columnDef.meta as ColumnMeta<Prestamo, unknown> | undefined)?.align ?? 'left'
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
                          className="border-t border-[#e2e8f0] hover:bg-[#faf9ff] transition-colors cursor-pointer"
                          onClick={() => { setDetailPrestamo(row.original); setDetailOpen(true) }}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const align = (cell.column.columnDef.meta as ColumnMeta<Prestamo, unknown> | undefined)?.align ?? 'left'
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

                {/* Mobile list */}
                <div className="md:hidden">
                  {table.getRowModel().rows.map((row) => (
                    <MobilePrestamoRow
                      key={row.id}
                      p={row.original}
                      onTap={() => { setDetailPrestamo(row.original); setDetailOpen(true) }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Footer */}
            {!loading && displayPrestamos.length > 0 && (
              <div className="px-5 py-3.5 bg-[#f1f5f9] border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[12.5px] text-[#9996b0] font-semibold">
                  Mostrando {displayPrestamos.length} de {totalCount || prestamos.length} préstamos
                </span>
                <div className="flex items-center gap-3">
                  {hasNextPage && (
                    <button
                      onClick={() => loadPrestamos(endCursor)}
                      disabled={loading}
                      className="h-9 px-4 rounded-xl text-[13px] font-bold bg-white border border-[#e2e8f0] text-[#5a5670] hover:border-[#1d4ed8] hover:text-[#1d4ed8] transition-colors disabled:opacity-50"
                    >
                      Cargar más
                    </button>
                  )}
                  <TablePagination table={table} totalRows={displayPrestamos.length} />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <PrestamoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <DetailDrawer
        prestamo={detailPrestamo}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDevolver={(p) => setConfirmDevolver(p)}
      />

      <ConfirmModal
        open={!!confirmDevolver}
        onClose={() => setConfirmDevolver(null)}
        onConfirm={() => void handleDevolver()}
        title="Marcar como devuelto"
        message={`¿Confirmar devolución del préstamo de "${confirmDevolver?.clienteNombreCompleto}"? El stock se restaurará al inventario.`}
        loading={devolviendo}
      />
    </MainLayout>
  )
}
