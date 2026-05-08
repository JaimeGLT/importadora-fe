import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button, Input, Modal, ConfirmModal, WarmMetric } from '@/components/ui'
import { notify } from '@/lib/notify'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { CLIENTES_QUERY, backendToCliente, type ClienteAPI } from '@/lib/queries/clientes.queries'
import { AutopartsWatermark } from '@/pages/inventario/AutopartsWatermark'
import type { Cliente } from '@/types'

// ─── Icons ────────────────────────────────────────────────────────────────────

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
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
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
function IcoUser() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-5 mb-7 md:mb-11">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-hair p-4 md:p-7 bg-white/82 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-3 w-24 rounded bg-cream-2" />
            <div className="h-[34px] w-[34px] rounded-[10px] bg-cream-2" />
          </div>
          <div className="h-9 w-32 rounded bg-cream-2" />
          <div className="h-3 w-20 rounded bg-hair mt-2" />
        </div>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-hair">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-[22px] py-4 animate-pulse">
          <div className="h-9 w-9 rounded-xl bg-cream-2 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-[13px] w-48 rounded bg-cream-2" />
            <div className="h-3 w-32 rounded bg-hair" />
          </div>
          <div className="h-3 w-20 rounded bg-cream-2" />
        </div>
      ))}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-[60px] px-5 text-center text-muted">
      <div className="h-[38px] w-[38px] rounded-lg bg-cream-2 border border-hair flex items-center justify-center mb-4">
        <svg className="h-5 w-5 text-muted-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-ink-2 mb-1">Sin clientes</p>
      <p className="text-xs text-muted max-w-xs mb-5">
        Agrega el primer cliente del sistema.
      </p>
      <button
        onClick={onNew}
        className="h-[38px] px-4 rounded-[10px] bg-terra text-white text-sm font-semibold flex items-center gap-2 hover:bg-terra-deep transition-colors">
        <IcoPlus /> Nuevo cliente
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ClientesPage() {
  const { isTokenReady } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [endCursor, setEndCursor] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Cliente | null>(null)
  const [deleting, setDeleting] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }, [])

  const loadClientes = (cursor?: string | null) => {
    if (cursor) setLoadingMore(true)
    else setLoading(true)

    gql<{ clientes: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: ClienteAPI[] } }>(
      CLIENTES_QUERY,
      { first: 25, after: cursor }
    )
      .then(res => {
        const { totalCount, pageInfo, nodes } = res.clientes
        setClientes(prev => cursor ? [...prev, ...nodes.map(backendToCliente)] : nodes.map(backendToCliente))
        setTotalCount(totalCount)
        setHasNextPage(pageInfo.hasNextPage)
        setEndCursor(pageInfo.endCursor)
      })
      .catch(() => notify.error('Error cargando clientes'))
      .finally(() => { setLoading(false); setLoadingMore(false) })
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      // Búsqueda local de los resultados ya cargados
    }, 300)
  }

  useEffect(() => {
    if (!isTokenReady) return
    loadClientes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenReady])

  const filtered = useMemo(() => {
    if (!search.trim()) return clientes
    const q = search.toLowerCase()
    return clientes.filter(c =>
      c.nombre?.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q) ||
      c.telefono?.includes(q)
    )
  }, [clientes, search])

  const kpi = useMemo(() => ({
    total: totalCount,
    conTelefono: clientes.filter(c => c.telefono?.trim()).length,
    busqueda: filtered.length,
  }), [clientes, totalCount, filtered.length])

  const openNew = () => { setEditingCliente(null); setFormOpen(true) }
  const openEdit = (c: Cliente) => { setEditingCliente(c); setFormOpen(true) }

  const handleSave = async (data: Omit<Cliente, 'id'>) => {
    try {
      if (editingCliente) {
        await api.put(`/Cliente/${editingCliente.id}`, data)
        notify.success('Cliente actualizado')
      } else {
        await api.post(`/Cliente`, data)
        notify.success('Cliente registrado')
      }
      setFormOpen(false)
      setEditingCliente(null)
      loadClientes()
    } catch (err) {
      notify.error((err as Error).message || 'Error al guardar cliente')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await api.delete(`/Cliente/${confirmDelete.id}`)
      notify.success('Cliente eliminado')
      setConfirmDelete(null)
      loadClientes()
    } catch {
      notify.error('Error al eliminar cliente')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="relative px-4 sm:px-8 md:px-14 py-5 md:py-9 pb-10 md:pb-20 min-h-screen"
           style={{ background: 'linear-gradient(180deg, #F4EFE6 0%, #FAF8F5 200px, #FAF8F5 100%)' }}>

        <div className="relative z-[1]">
          <AutopartsWatermark />

          {/* ── Topbar ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-9">
            <div className="flex items-center gap-1.5 text-[12.5px] text-muted tracking-[0.02em]">
              <span>Operaciones</span>
              <span className="opacity-50">/</span>
              <span>Ventas</span>
              <span className="opacity-50">/</span>
              <span className="text-ink">Clientes</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-[38px] px-3.5 border border-hair bg-paper rounded-[10px] items-center gap-2 text-[13px] text-ink-2">
                <IcoCal /><span>{dateStr}</span>
              </div>
              <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors relative"
                      title="Notificaciones">
                <IcoBell />
                <span className="absolute top-[9px] right-[10px] w-[7px] h-[7px] rounded-full bg-terra border-2 border-paper" />
              </button>
              <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors"
                      title="Configuración">
                <IcoSettings />
              </button>
            </div>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8 mb-7 md:mb-10">
            <div>
              <h1 className="font-serif text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] m-0 mb-2.5 text-ink">
                Clientes<em className="italic text-terra">.</em>
              </h1>
              <p className="text-base text-muted max-w-[520px]">
                Gestión de clientes del sistema — registra y administra la información de tus clientes.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={openNew}
                className="h-[46px] px-[22px] rounded-[12px] text-sm font-semibold flex items-center gap-2 bg-terra text-white hover:bg-terra-deep transition-all hover:-translate-y-px active:translate-y-0"
                style={{ boxShadow: '0 1px 2px rgba(200,80,31,0.3), 0 6px 16px -8px rgba(200,80,31,0.5)' }}>
                <IcoPlus /> <span>Nuevo cliente</span>
              </button>
            </div>
          </div>

          {/* ── Metrics ─────────────────────────────────────────────────── */}
          {loading ? <MetricsSkeleton /> : (
            <div className="grid grid-cols-3 gap-3 md:gap-5 mb-7 md:mb-11">
              <WarmMetric
                label="Total clientes"
                value={kpi.total.toLocaleString('es-BO')}
                icon={<IcoUser />}
                sublabel="en sistema"
              />
              <WarmMetric
                label="Con teléfono"
                value={kpi.conTelefono.toLocaleString('es-BO')}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
                sublabel="registrados"
              />
              <WarmMetric
                label="Mostrando"
                value={kpi.busqueda.toLocaleString('es-BO')}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
                sublabel={search ? 'resultados' : 'del sistema'}
              />
            </div>
          )}

          {/* ── Table card ──────────────────────────────────────────────── */}
          <div className="rounded-[18px] border border-hair overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(2px)' }}>

            {/* Toolbar */}
            <div className="flex items-center gap-3.5 px-4 md:px-7 py-4 md:py-[22px] border-b border-hair flex-wrap">
              <div>
                <span className="font-serif text-[28px] leading-[1] tracking-[-0.01em] text-ink">Clientes</span>
                <span className="text-base text-muted ml-2.5 font-normal">
                  {totalCount > 0 ? totalCount : filtered.length}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="h-10 flex items-center gap-2.5 px-3.5 border border-hair rounded-[10px] bg-cream min-w-0 w-full sm:w-auto sm:min-w-[260px] md:min-w-[320px] transition-colors focus-within:border-terra focus-within:bg-paper">
                  <IcoSearch />
                  <input
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-ink placeholder-muted-2"
                    placeholder="Buscar por nombre o teléfono…"
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState onNew={openNew} />
            ) : (
              <>
                {/* ── Desktop table ── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col style={{ width: 80 }} />
                      <col style={{ width: 200 }} />
                      <col style={{ width: 150 }} />
                      <col style={{ width: 120 }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-hair" style={{ background: 'rgba(250,248,245,0.7)' }}>
                        {['ID', 'Cliente', 'Teléfono', 'Acciones'].map(h => (
                          <th key={h} className="px-[22px] py-4 text-[11.5px] font-semibold text-muted uppercase tracking-[0.1em] text-left">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, idx) => (
                        <tr key={c.id}
                          className="border-b border-hair transition-colors"
                          style={{
                            background: idx % 2 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(250,250,248,0.45)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,239,230,0.8)')}
                          onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(250,250,248,0.45)')}
                        >
                          <td className="px-[22px] py-[7px] text-[13px] text-muted font-mono">#{c.id}</td>
                          <td className="px-[22px] py-[7px]">
                            <div className="text-[14px] font-semibold text-ink truncate">{c.nombre} {c.apellido}</div>
                          </td>
                          <td className="px-[22px] py-[7px] text-[13px] text-steel-600">{c.telefono || '—'}</td>
                          <td className="px-[22px] py-[7px]">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEdit(c)} title="Editar"
                                className="p-[7px] rounded-lg text-muted hover:text-ink hover:bg-cream-2 transition-colors">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => setConfirmDelete(c)} title="Eliminar"
                                className="p-[7px] rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Mobile cards ── */}
                <div className="md:hidden">
                  {filtered.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3.5 border-b border-hair">
                      <div>
                        <div className="text-[13px] font-semibold text-ink">#{c.id} — {c.nombre} {c.apellido}</div>
                        <div className="text-[11px] text-muted mt-0.5">{c.telefono || 'Sin teléfono'}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-steel-400 hover:text-brand-600 hover:bg-brand-50">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setConfirmDelete(c)} className="p-2 rounded-lg text-steel-400 hover:text-red-600 hover:bg-red-50">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Footer */}
            {!loading && filtered.length > 0 && (
              <div className="px-4 md:px-7 py-4 border-t border-hair bg-cream flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[12.5px] text-muted">
                  Mostrando {filtered.length} de {totalCount} clientes
                </span>
                <div className="flex items-center gap-3">
                  {hasNextPage && (
                    <button
                      onClick={() => loadClientes(endCursor)}
                      disabled={loadingMore}
                      className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-paper border border-hair text-ink hover:border-ink transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? 'Cargando...' : 'Cargar más'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <ClienteFormModal
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingCliente(null) }}
          onSave={handleSave}
          cliente={editingCliente}
        />

        <ConfirmModal
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => void handleDelete()}
          title="Eliminar cliente"
          message={`¿Eliminar a "${confirmDelete?.nombre} ${confirmDelete?.apellido}"? Esta acción no se puede deshacer.`}
          loading={deleting}
        />
      </div>
    </MainLayout>
  )
}

// ─── Cliente form modal ────────────────────────────────────────────────────────

interface ClienteFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Cliente, 'id'>) => void
  cliente: Cliente | null
}

export function ClienteFormModal({ open, onClose, onSave, cliente }: ClienteFormModalProps) {
  const [nombre, setNombre] = useState(cliente?.nombre ?? '')
  const [apellido, setApellido] = useState(cliente?.apellido ?? '')
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '')

  useEffect(() => {
    if (open) {
      setNombre(cliente?.nombre ?? '')
      setApellido(cliente?.apellido ?? '')
      setTelefono(cliente?.telefono ?? '')
    }
  }, [open, cliente])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) { notify.error('Ingresa el nombre'); return }
    if (!apellido.trim()) { notify.error('Ingresa el apellido'); return }
    onSave({ nombre: nombre.trim(), apellido: apellido.trim(), telefono: telefono.trim() })
  }

  return (
    <Modal open={open} onClose={onClose} title={cliente ? 'Editar cliente' : 'Nuevo cliente'}>
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-semibold text-steel-600 mb-1.5">Nombre *</label>
          <Input
            type="text"
            placeholder="Nombre del cliente"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            maxLength={100}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-steel-600 mb-1.5">Apellido *</label>
          <Input
            type="text"
            placeholder="Apellido del cliente"
            value={apellido}
            onChange={e => setApellido(e.target.value)}
            maxLength={100}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-steel-600 mb-1.5">Teléfono</label>
          <Input
            type="text"
            placeholder="Número de teléfono"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            maxLength={20}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1">{cliente ? 'Actualizar' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  )
}