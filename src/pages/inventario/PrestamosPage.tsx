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
import { ConfirmModal, TablePagination, WarmMetric } from '@/components/ui'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { clsx } from 'clsx'
import { AutopartsWatermark } from './AutopartsWatermark'
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

// ─── Icons ─────────────────────────────────────────────────────────────────────

function IcoCal() {
  return (
    <svg className="w-[15px] h-[15px] text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>
    </svg>
  )
}
function IcoBell() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  )
}
function IcoSettings() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function IcoPlus() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  )
}
function IcoSearch() {
  return (
    <svg className="h-4 w-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
    </svg>
  )
}
function IcoHandshake() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 11l-5-5-5 5m5-5v12"/><path d="M3 7l4 4m10-4l-4 4"/>
    </svg>
  )
}
function IcoActive() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
    </svg>
  )
}
function IcoReturn() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-1"/>
    </svg>
  )
}
function IcoMoney() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v1m0 8v1m-3-5h6m-6 0a2 2 0 1 0 2-2h-2a2 2 0 1 0 2 2"/>
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-hair">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-[22px] py-3.5 animate-pulse">
          <div className="flex-1 space-y-1.5">
            <div className="h-[13px] w-32 rounded bg-cream-2" />
            <div className="h-3 w-44 rounded bg-hair" />
          </div>
          <div className="h-3 w-20 rounded bg-cream-2" />
          <div className="h-6 w-16 rounded-full bg-cream-2" />
          <div className="h-3 w-16 rounded bg-hair" />
          <div className="flex gap-1">
            {[0, 1].map((j) => <div key={j} className="h-7 w-7 rounded-lg bg-cream-2" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew, searching }: { onNew: () => void; searching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-[60px] px-5 text-center text-muted">
      <div className="h-[38px] w-[38px] rounded-lg bg-cream-2 border border-hair flex items-center justify-center mb-4">
        <svg className="h-5 w-5 text-muted-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-ink-2 mb-1">{searching ? 'Sin resultados' : 'Sin préstamos'}</p>
      <p className="text-xs text-muted max-w-xs mb-5">
        {searching
          ? 'No hay préstamos que coincidan con esta búsqueda o filtro.'
          : 'Registra el primer préstamo con el botón de arriba.'}
      </p>
      {!searching && (
        <button
          onClick={onNew}
          className="h-[38px] px-4 rounded-[10px] bg-terra text-white text-sm font-semibold flex items-center gap-2 hover:bg-terra-deep transition-colors"
        >
          <IcoPlus /> Nuevo préstamo
        </button>
      )}
    </div>
  )
}

// ─── Mobile row ───────────────────────────────────────────────────────────────

function MobilePrestamoRow({ p, onTap }: { p: Prestamo; onTap: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-hair last:border-0 active:bg-[#F4EFE6] transition-colors cursor-pointer"
      onClick={onTap}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="h-[38px] w-[38px] rounded-lg bg-cream-2 border border-hair flex items-center justify-center shrink-0">
        <svg className="h-4 w-4 text-muted-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px] text-ink leading-tight truncate">{p.clienteNombreCompleto}</div>
        <div className="text-[11px] text-muted-2 mt-0.5">
          {p.detalle.length} producto{p.detalle.length !== 1 ? 's' : ''} · {new Date(p.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={clsx(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
          p.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700',
        )}>
          {p.estado}
        </span>
        <span className="text-[12px] font-semibold text-ink tabular-nums">
          Bs. {p.total.toFixed(2)}
        </span>
      </div>
      <svg className="h-4 w-4 text-muted-2 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}

function MobileSkeletonRows() {
  return (
    <div className="divide-y divide-hair">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="h-[38px] w-[38px] rounded-lg bg-cream-2 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-[13px] w-28 rounded bg-cream-2" />
            <div className="h-[11px] w-36 rounded bg-hair" />
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="h-5 w-14 rounded-full bg-cream-2" />
            <div className="h-[11px] w-14 rounded bg-hair" />
          </div>
          <div className="h-4 w-4 rounded bg-cream-2 ml-1" />
        </div>
      ))}
    </div>
  )
}

// ─── Detail drawer ─────────────────────────────────────────────────────────────

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
          background: 'rgba(36,30,24,0.35)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] border-l border-hair z-[60] flex flex-col"
        style={{
          background: '#FDFCFA',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.2, 1)',
          boxShadow: '-24px 0 40px -20px rgba(36,30,24,0.2)',
        }}
      >
        {prestamo && (
          <>
            <div
              className="px-6 sm:px-8 pt-7 pb-[22px] border-b border-hair flex items-start justify-between gap-3 shrink-0"
              style={{ background: 'linear-gradient(180deg, #F4EFE6 0%, #FDFCFA 100%)' }}
            >
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted font-semibold mb-1.5">
                  Detalle de préstamo
                </div>
                <h2 className="font-serif text-[28px] sm:text-[32px] leading-[1.05] tracking-[-0.02em] m-0 mb-1.5 text-ink">
                  {prestamo.clienteNombreCompleto}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold',
                    prestamo.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200',
                  )}>
                    {prestamo.estado}
                  </span>
                  <span className="text-[12px] text-muted-2">
                    {new Date(prestamo.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-[8px] text-muted hover:text-ink hover:bg-cream-2 transition-colors shrink-0 mt-1"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
              {/* Cliente info */}
              {prestamo.cliente.telefono && (
                <div className="flex items-center gap-2 text-[13px] text-muted-2">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h2l3 6-2 2a16 16 0 006 6l2-2 6 3v2A18 18 0 013 5z"/></svg>
                  {prestamo.cliente.telefono}
                </div>
              )}

              {/* Nota */}
              {prestamo.nota && (
                <div className="rounded-[10px] bg-cream border border-hair px-4 py-3 text-[13px] text-ink-2">
                  {prestamo.nota}
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-muted mb-3">Productos prestados</p>
                <div className="divide-y divide-hair border-y border-hair">
                  {prestamo.detalle.map((det) => (
                    <div key={det.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-bold text-[12.5px] text-ink tracking-[0.05em]">{det.codigo}</div>
                        <p className="text-[11.5px] text-muted-2 truncate mt-0.5">{det.nombre}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-muted-2">
                          Bs. {det.precio.toFixed(2)} × {det.cantidad}
                        </p>
                        <p className="text-[13.5px] font-semibold text-ink tabular-nums">
                          Bs. {det.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[13px] font-semibold text-muted">Total préstamo</span>
                <span className="font-serif text-[28px] leading-[1] tracking-[-0.02em] text-ink">
                  Bs. {prestamo.total.toFixed(2)}
                </span>
              </div>
            </div>

            <div
              className="px-6 sm:px-8 py-[18px] border-t border-hair flex justify-end gap-2.5 shrink-0"
              style={{ background: '#F4EFE6' }}
            >
              <button
                onClick={onClose}
                className="h-[44px] px-5 rounded-[10px] text-[13.5px] font-semibold text-ink-2 border border-hair hover:bg-cream-2 transition-colors"
              >
                Cerrar
              </button>
              {prestamo.estado === 'Activo' && (
                <button
                  onClick={() => { onClose(); onDevolver(prestamo) }}
                  className="h-[44px] px-6 rounded-[10px] text-[13.5px] font-semibold bg-ink text-cream hover:bg-ink/90 transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4 4-4M5 10h11a4 4 0 0 1 0 8h-1"/></svg>
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

  const [prestamos, setPrestamos]           = useState<Prestamo[]>([])
  const [totalCount, setTotalCount]         = useState(0)
  const [hasNextPage, setHasNextPage]       = useState(false)
  const [endCursor, setEndCursor]           = useState<string | null>(null)
  const [loading, setLoading]               = useState(true)
  const [sorting, setSorting]               = useState<SortingState>([])
  const [searchTerm, setSearchTerm]         = useState('')
  const [filterEstado, setFilterEstado]     = useState<EstadoFilter>('todos')
  const [modalOpen, setModalOpen]           = useState(false)
  const [detailPrestamo, setDetailPrestamo] = useState<Prestamo | null>(null)
  const [detailOpen, setDetailOpen]         = useState(false)
  const [confirmDevolver, setConfirmDevolver] = useState<Prestamo | null>(null)
  const [devolviendo, setDevolviendo]       = useState(false)

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
    total: totalCount || prestamos.length,
    activos: prestamos.filter((p) => p.estado === 'Activo').length,
    devueltos: prestamos.filter((p) => p.estado === 'Devuelto').length,
    valorActivo: prestamos.filter((p) => p.estado === 'Activo').reduce((s, p) => s + p.total, 0),
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
            <div className="font-medium text-[13.5px] text-ink leading-tight">{info.getValue()}</div>
            {p.cliente.telefono && (
              <div className="text-[11px] text-muted-2 mt-0.5">{p.cliente.telefono}</div>
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
                <span className="font-mono font-bold text-[11.5px] text-ink tracking-[0.05em]">
                  {first.codigo}
                </span>
              )}
              {det.length > 1 && (
                <span className="text-[10px] font-semibold text-muted-2 bg-cream-2 border border-hair px-1.5 py-0.5 rounded-full">
                  +{det.length - 1}
                </span>
              )}
            </div>
            {first && (
              <div className="text-[11px] text-muted-2 mt-0.5 truncate max-w-[160px]">{first.nombre}</div>
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
        <span className="text-[12.5px] text-muted-2">{fmtFecha(info.getValue())}</span>
      ),
    }),
    colHelper.accessor('total', {
      header: 'Total',
      size: 110,
      meta: { align: 'right' },
      cell: (info) => (
        <div className="text-right">
          <span className="font-semibold text-[13.5px] text-ink tabular-nums">
            <span className="text-[10.5px] text-muted-2 font-medium mr-0.5">Bs.</span>
            {fmtBs(info.getValue())}
          </span>
        </div>
      ),
    }),
    colHelper.accessor('estado', {
      header: 'Estado',
      size: 100,
      meta: { align: 'center' },
      cell: (info) => {
        const est = info.getValue()
        return (
          <span className={clsx(
            'inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold',
            est === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700',
          )}>
            {est}
          </span>
        )
      },
    }),
    colHelper.display({
      id: 'acciones',
      header: '',
      size: 90,
      meta: { align: 'right' },
      enableSorting: false,
      cell: (info) => {
        const p = info.row.original
        return (
          <div className="flex justify-end gap-0.5">
            <button
              title="Ver detalle"
              onClick={(e) => { e.stopPropagation(); setDetailPrestamo(p); setDetailOpen(true) }}
              className="p-[7px] rounded-lg text-muted hover:text-ink hover:bg-cream-2 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            {p.estado === 'Activo' && (
              <button
                title="Marcar devuelto"
                onClick={(e) => { e.stopPropagation(); setConfirmDevolver(p) }}
                className="p-[7px] rounded-lg text-muted hover:text-ink hover:bg-cream-2 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4 4-4M5 10h11a4 4 0 0 1 0 8h-1"/>
                </svg>
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
      <div
        className="relative px-4 sm:px-8 md:px-14 py-5 md:py-9 pb-10 md:pb-20 min-h-screen"
        style={{ background: 'linear-gradient(180deg, #F4EFE6 0%, #FAF8F5 200px, #FAF8F5 100%)' }}
      >
        <AutopartsWatermark />

        <div className="relative z-[1]">

          {/* ── Topbar ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-9">
            <div className="flex items-center gap-1.5 text-[12.5px] text-muted tracking-[0.02em]">
              <span>Operaciones</span>
              <span className="opacity-50">/</span>
              <span>Inventario</span>
              <span className="opacity-50">/</span>
              <span className="text-ink">Préstamos</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-[38px] px-3.5 border border-hair bg-paper rounded-[10px] items-center gap-2 text-[13px] text-ink-2">
                <IcoCal /><span>{dateStr}</span>
              </div>
              <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors relative" title="Notificaciones">
                <IcoBell />
                <span className="absolute top-[9px] right-[10px] w-[7px] h-[7px] rounded-full bg-terra border-2 border-paper" />
              </button>
              <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors" title="Configuración">
                <IcoSettings />
              </button>
            </div>
          </div>

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8 mb-7 md:mb-10">
            <div>
              <h1 className="font-serif text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] m-0 mb-2.5 text-ink">
                Préstamos<em className="italic text-terra">.</em>
              </h1>
              <p className="text-base text-muted max-w-[520px]">
                Control de salida de productos — registro de préstamos a clientes y seguimiento de devoluciones.
              </p>
            </div>
            <div className="shrink-0">
              <button
                onClick={() => setModalOpen(true)}
                className="h-[46px] px-[22px] rounded-[12px] text-sm font-semibold flex items-center gap-2 bg-terra text-white hover:bg-terra-deep transition-all hover:-translate-y-px active:translate-y-0"
                style={{ boxShadow: '0 1px 2px rgba(200,80,31,0.3), 0 6px 16px -8px rgba(200,80,31,0.5)' }}
              >
                <IcoPlus /> <span>Nuevo préstamo</span>
              </button>
            </div>
          </div>

          {/* ── Metrics ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-7 md:mb-11">
            <WarmMetric label="Total préstamos" value={kpi.total.toLocaleString('es-BO')} icon={<IcoHandshake />} sublabel="registrados" />
            <WarmMetric label="Activos" value={kpi.activos} icon={<IcoActive />} tone={kpi.activos > 0 ? 'warn' : undefined} sublabel="en préstamo" />
            <WarmMetric label="Devueltos" value={kpi.devueltos} icon={<IcoReturn />} sublabel="completados" />
            <WarmMetric label="Valor activo" value={fmtBs(kpi.valorActivo)} unit="Bs." icon={<IcoMoney />} sublabel="en préstamo" />
          </div>

          {/* ── Table card ───────────────────────────────────────────────── */}
          <div
            className="rounded-[18px] border border-hair overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(2px)' }}
          >

            {/* Toolbar */}
            <div className="flex items-center gap-3.5 px-4 md:px-7 py-4 md:py-[22px] border-b border-hair flex-wrap">
              <div>
                <span className="font-serif text-[28px] leading-[1] tracking-[-0.01em] text-ink">Préstamos</span>
                <span className="text-base text-muted ml-2.5 font-normal">
                  {displayPrestamos.length}
                </span>
              </div>

              {/* Estado filter tabs */}
              <div className="flex items-center gap-1 bg-cream rounded-[10px] p-1 border border-hair">
                {(['todos', 'Activo', 'Devuelto'] as EstadoFilter[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterEstado(tab)}
                    className={clsx(
                      'px-3 py-1.5 text-[12px] font-semibold rounded-[8px] transition-all',
                      filterEstado === tab
                        ? 'bg-ink text-cream shadow-sm'
                        : 'text-muted hover:text-ink-2',
                    )}
                  >
                    {tab === 'todos' ? 'Todos' : tab}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="h-10 flex items-center gap-2.5 px-3.5 border border-hair rounded-[10px] bg-cream min-w-0 w-full sm:w-auto sm:min-w-[260px] md:min-w-[300px] transition-colors focus-within:border-terra focus-within:bg-paper">
                  <IcoSearch />
                  <input
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-ink placeholder-muted-2"
                    placeholder="Buscar cliente, código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Body */}
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
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      {table.getFlatHeaders().map((h) => (
                        <col key={h.id} style={{ width: h.column.getSize() }} />
                      ))}
                    </colgroup>
                    <thead>
                      {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id} className="border-b border-hair" style={{ background: 'rgba(250,248,245,0.7)' }}>
                          {hg.headers.map((header) => {
                            const canSort = header.column.getCanSort()
                            const sorted  = header.column.getIsSorted()
                            const align   = (header.column.columnDef.meta as ColumnMeta<Prestamo, unknown> | undefined)?.align ?? 'left'
                            return (
                              <th
                                key={header.id}
                                className={clsx(
                                  'px-[22px] py-4 text-[11.5px] font-semibold text-muted uppercase tracking-[0.1em] select-none whitespace-nowrap',
                                  align === 'center' && 'text-center',
                                  align === 'right' && 'text-right',
                                  canSort && 'cursor-pointer hover:text-ink-2 transition-colors',
                                )}
                                onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                              >
                                <span className={clsx(
                                  'inline-flex items-center gap-1',
                                  align === 'center' && 'justify-center w-full',
                                  align === 'right' && 'justify-end w-full',
                                )}>
                                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                  {canSort && sorted !== false && (
                                    <svg className="h-3 w-3 text-terra shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sorted === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                                    </svg>
                                  )}
                                </span>
                              </th>
                            )
                          })}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row, idx) => (
                        <tr
                          key={row.id}
                          className="border-b border-hair transition-colors cursor-pointer"
                          style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(250,250,248,0.45)' }}
                          onClick={() => { setDetailPrestamo(row.original); setDetailOpen(true) }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,239,230,0.8)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(250,250,248,0.45)')}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const align = (cell.column.columnDef.meta as ColumnMeta<Prestamo, unknown> | undefined)?.align ?? 'left'
                            return (
                              <td
                                key={cell.id}
                                className={clsx(
                                  'px-[22px] py-[9px] align-middle text-[13.5px]',
                                  align === 'center' && 'text-center',
                                  align === 'right' && 'text-right',
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
              <div className="px-4 md:px-7 py-4 border-t border-hair bg-cream flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[12.5px] text-muted">
                  Mostrando {displayPrestamos.length} de {totalCount || prestamos.length} préstamos
                </span>
                <div className="flex items-center gap-3">
                  {hasNextPage && (
                    <button
                      onClick={() => loadPrestamos(endCursor)}
                      disabled={loading}
                      className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-paper border border-hair text-ink hover:border-ink transition-colors disabled:opacity-50"
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
