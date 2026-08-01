import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { ConfirmModal, ServerPagination } from '@/components/ui'
import type { Sucursal } from '@/types'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { gql } from '@/lib/graphql'
import { isAdminRole } from '@/lib/roles'
import {
  TRASPASOS_HISTORIAL_QUERY,
  backendToTraspasoRow,
  type TraspasoStockAPI,
  type TraspasoStockRow,
} from '@/lib/queries/traspasos.queries'

function generarCodigo(nombre: string) {
  const base = nombre
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 12)
  const sufijo = Date.now().toString(36).toUpperCase().slice(-4)
  return `${base || 'SUC'}-${sufijo}`
}

function fmtFecha(d: Date) {
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
}

function HistorialTraspasosTab() {
  const [historial, setHistorial] = useState<TraspasoStockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const cursors = useRef<(string | null)[]>([null])
  const [search, setSearch] = useState('')
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadHistorial = useCallback((targetPage: number, size: number, q = '') => {
    setLoading(true)
    const where = q.trim() ? {
      or: [
        { producto: { nombre: { contains: q } } },
        { producto: { codigo: { contains: q } } },
        { motivo: { contains: q } },
      ],
    } : undefined
    gql<{ traspasosStock: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: TraspasoStockAPI[] } }>(
      TRASPASOS_HISTORIAL_QUERY,
      { first: size, after: cursors.current[targetPage] ?? null, where, order: [{ fecha: 'DESC' }] },
    )
      .then(res => {
        const { totalCount, pageInfo, nodes } = res.traspasosStock
        setHistorial(nodes.map(backendToTraspasoRow))
        setTotal(totalCount)
        setHasNext(pageInfo.hasNextPage)
        cursors.current[targetPage + 1] = pageInfo.endCursor
        setPage(targetPage)
      })
      .catch(() => notify.error('Error cargando historial de traspasos'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadHistorial(0, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      cursors.current = [null]
      loadHistorial(0, pageSize, val)
    }, 350)
  }

  return (
    <div className="bg-white rounded-xl border border-[#D0CBC4] overflow-hidden">
      <div className="px-[22px] py-[18px] border-b border-[#D0CBC4] flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-[15px] font-semibold text-[#2D2B2A] flex items-center gap-2">
          Historial de traspasos
          <span className="bg-[#F5E8D4] text-[#780e18] text-[11px] font-semibold px-2 py-0.5 rounded-full">{total}</span>
        </h3>
        <div className="flex items-center gap-2 bg-[#F5F0EB] border border-[#D0CBC4] rounded-lg px-3.5 w-full sm:w-auto sm:min-w-[250px] focus-within:border-[#780e18] transition-colors">
          <i className="ti ti-search text-[#7A7571] text-base shrink-0" />
          <input
            className="flex-1 py-2 bg-transparent text-sm text-[#2D2B2A] placeholder:text-[#7A7571] outline-none border-none"
            placeholder="Buscar por producto, código o motivo…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="divide-y divide-[#E8E5E2]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-[14px] animate-pulse">
              <div className="h-3 w-28 rounded bg-[#F5F0EB]" />
              <div className="h-3 w-40 rounded bg-[#F5F0EB]" />
              <div className="h-3 w-16 rounded bg-[#F5F0EB]" />
            </div>
          ))}
        </div>
      ) : historial.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
          <p className="text-sm font-semibold text-[#2D2B2A] mb-1">Sin traspasos registrados</p>
          <p className="text-xs text-[#7A7571] max-w-xs">Los traspasos de stock entre sucursales aparecerán aquí.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F0EB] border-b border-[#D0CBC4]">
                <th className="px-5 py-[11px] text-left text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.12em]">Fecha / Por</th>
                <th className="px-5 py-[11px] text-left text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.12em]">Producto</th>
                <th className="px-5 py-[11px] text-left text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.12em]">Origen → Destino</th>
                <th className="px-5 py-[11px] text-right text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.12em]">Cantidad</th>
                <th className="px-5 py-[11px] text-left text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.12em]">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5E2]">
              {historial.map((r, idx) => {
                const [codigoPrincipal] = r.productoCodigos
                return (
                  <tr key={r.id} className={clsx('border-t border-[#E8E5E2]', idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF5EE]')}>
                    <td className="px-5 py-[14px] whitespace-nowrap">
                      <span className="text-xs text-[#7A7571] font-mono block">{fmtFecha(r.fecha)}</span>
                      <span className="text-[11px] text-[#4A4744] font-medium mt-0.5 block">{r.usuarioNombre}</span>
                    </td>
                    <td className="px-5 py-[14px]">
                      <p className="font-mono font-bold text-[13px] text-[#2D2B2A] tracking-[0.05em] truncate max-w-[200px]">{codigoPrincipal}</p>
                      <p className="text-[11px] text-[#7A7571] truncate max-w-[200px] mt-0.5">{r.productoNombre}</p>
                      {r.piezaNombre && (
                        <p className="text-[10.5px] text-[#780e18] font-semibold truncate max-w-[200px] mt-0.5">
                          Pieza: {r.piezaNombre}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-[14px] text-[12.5px] text-[#4A4744]">
                      {r.sucursalOrigenNombre}
                      <span className="mx-1.5 text-[#7A7571]">→</span>
                      {r.sucursalDestinoNombre}
                    </td>
                    <td className="px-5 py-[14px] text-right font-mono font-bold text-[13px] text-[#2D2B2A]">{r.cantidad}</td>
                    <td className="px-5 py-[14px] text-[12.5px] text-[#4A4744] max-w-[200px] truncate" title={r.nota || r.motivo}>{r.motivo}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="px-[22px] py-[14px] bg-[#F5F0EB] border-t border-[#D0CBC4]">
          <ServerPagination
            totalCount={total}
            page={page}
            pageSize={pageSize}
            hasNextPage={hasNext}
            onPage={p => { cursors.current = cursors.current.slice(0, p + 1); loadHistorial(p, pageSize, search) }}
            onPageSize={size => { cursors.current = [null]; setPageSize(size); loadHistorial(0, size, search) }}
          />
        </div>
      )}
    </div>
  )
}

export function SucursalesPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'sucursales' | 'historial'>('sucursales')
  const [historialTouched, setHistorialTouched] = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Sucursal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Sucursal | null>(null)
  const [saving, setSaving] = useState(false)

  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')

  const load = () => {
    setLoading(true)
    api.get<Sucursal[]>('/Sucursal')
      .then(setSucursales)
      .catch(() => notify.error('Error al cargar sucursales'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return sucursales
    const q = search.toLowerCase()
    return sucursales.filter((s) => s.nombre.toLowerCase().includes(q))
  }, [sucursales, search])

  const handleOpenNew = () => {
    setEditing(null)
    setNombre('')
    setDireccion('')
    setFormOpen(true)
  }

  const handleOpenEdit = (s: Sucursal) => {
    setEditing(s)
    setNombre(s.nombre)
    setDireccion(s.direccion ?? '')
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!nombre.trim()) return notify.error('Ingresa un nombre')
    setSaving(true)
    try {
      const datos = { nombre: nombre.trim(), codigo: editing?.codigo ?? generarCodigo(nombre), direccion: direccion.trim() || undefined, activo: editing?.activo ?? true }
      if (editing) {
        await api.put(`/Sucursal/${editing.id}`, datos)
        setSucursales((prev) => prev.map((s) => (s.id === editing.id ? { ...s, ...datos } : s)))
        notify.success('Sucursal actualizada')
      } else {
        const res = await api.post<{ id: number; nombre: string }>('/Sucursal', datos)
        setSucursales((prev) => [...prev, { id: res.id, nombre: datos.nombre, codigo: datos.codigo, direccion: datos.direccion ?? null, esCasaMatriz: false, activo: true }])
        notify.success('Sucursal creada')
      }
      setFormOpen(false)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al guardar la sucursal')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/Sucursal/${deleteTarget.id}`)
      setSucursales((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      notify.success('Sucursal desactivada')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al eliminar la sucursal')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (!isAdminRole(user?.rol)) {
    return (
      <MainLayout>
        <div className="bg-[#F7F7F7] min-h-screen flex items-center justify-center">
          <div className="bg-white rounded-xl border border-[#D0CBC4] p-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F5C9C0] border border-[#D45040] flex items-center justify-center">
              <i className="ti ti-lock text-[#8A1E12] text-xl" />
            </div>
            <p className="text-sm font-semibold text-[#2D2B2A]">Acceso restringido</p>
            <p className="text-xs text-[#7A7571]">No tienes permisos para esta sección</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="bg-[#F7F7F7] min-h-screen">
        <PageTopBar section="Sistema" title="Sucursales" />

        <div className="px-7 py-6 max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 bg-gradient-to-br from-[#780e18] to-[#D4A333] rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ boxShadow: '0 6px 18px rgba(120,14,24,0.28)' }}
              >
                <i className="ti ti-building-warehouse text-2xl" />
              </div>
              <div>
                <h2 className="font-semibold text-[30px] text-[#2D2B2A] leading-none" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Sucursales
                </h2>
                <p className="text-[13.5px] text-[#7A7571] mt-1.5">Locales donde se distribuye el stock</p>
              </div>
            </div>
            <button
              onClick={handleOpenNew}
              className="px-[18px] py-2.5 bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] rounded-lg flex items-center justify-center gap-1.5 text-sm font-semibold active:scale-95 transition-all shadow-sm w-full md:w-auto"
            >
              <i className="ti ti-plus text-base" />
              Nueva sucursal
            </button>
          </div>

          <div className="flex gap-1 bg-white border border-[#E8E5E2] rounded-xl p-1 w-fit mb-6">
            {(['sucursales', 'historial'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setActiveTab(t); if (t === 'historial') setHistorialTouched(true) }}
                className={clsx(
                  'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                  activeTab === t
                    ? 'bg-[#780e18] text-white shadow-sm'
                    : 'text-[#7A7571] hover:text-[#2D2B2A] hover:bg-[#F0EFEC]'
                )}
              >
                {t === 'sucursales' ? 'Sucursales' : 'Historial de traspasos'}
              </button>
            ))}
          </div>

          {historialTouched && (
            <div className={activeTab !== 'historial' ? 'hidden' : ''}>
              <HistorialTraspasosTab />
            </div>
          )}

          {activeTab === 'sucursales' && (
          <div className="bg-white rounded-xl border border-[#D0CBC4] overflow-hidden">
            <div className="px-[22px] py-[18px] border-b border-[#D0CBC4] flex flex-wrap justify-between items-center gap-3">
              <h3 className="text-[15px] font-semibold text-[#2D2B2A] flex items-center gap-2">
                Lista de sucursales
                <span className="bg-[#F5E8D4] text-[#780e18] text-[11px] font-semibold px-2 py-0.5 rounded-full">{filtered.length}</span>
              </h3>
              <div className="flex items-center gap-2 bg-[#F5F0EB] border border-[#D0CBC4] rounded-lg px-3.5 w-full sm:w-auto sm:min-w-[250px] focus-within:border-[#780e18] transition-colors">
                <i className="ti ti-search text-[#7A7571] text-base shrink-0" />
                <input
                  className="flex-1 py-2 bg-transparent text-sm text-[#2D2B2A] placeholder:text-[#7A7571] outline-none border-none"
                  placeholder="Buscar por nombre…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="divide-y divide-[#E8E5E2]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-[14px] animate-pulse">
                    <div className="h-5 w-40 rounded bg-[#F5F0EB]" />
                    <div className="h-5 w-20 rounded bg-[#F5F0EB]" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
                <p className="text-sm font-semibold text-[#2D2B2A] mb-1">Sin sucursales registradas</p>
                <p className="text-xs text-[#7A7571] max-w-xs mb-5">Crea tu primera sucursal para distribuir el stock entre locales.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F5F0EB] border-b border-[#D0CBC4]">
                    <th className="px-5 py-[11px] text-left text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.12em]">Nombre</th>
                    <th className="px-5 py-[11px] text-left text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.12em]">Dirección</th>
                    <th className="px-5 py-[11px] text-left text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.12em]">Estado</th>
                    <th className="px-5 py-[11px] text-right text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.12em]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5E2]">
                  {filtered.map((s, idx) => (
                    <tr key={s.id} className={clsx('border-t border-[#E8E5E2] hover:bg-[#F5F0EB] transition-colors', idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF5EE]')}>
                      <td className="px-5 py-[14px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#F5E8D4] flex items-center justify-center shrink-0">
                            <i className="ti ti-building-warehouse text-[#780e18] text-[13px]" />
                          </div>
                          <span className="font-semibold text-[13px] text-[#2D2B2A]">{s.nombre}</span>
                          {s.esCasaMatriz && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-[#D4A333] bg-[#F4ECDB] px-1.5 py-0.5 rounded">Casa matriz</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-[14px] text-[12.5px] text-[#7A7571]">{s.direccion || '—'}</td>
                      <td className="px-5 py-[14px]">
                        <span className={clsx(
                          'text-[10.5px] font-semibold px-2 py-0.5 rounded-full',
                          s.activo ? 'bg-[#B8DCCA] text-[#1E5C38]' : 'bg-[#F5C9C0] text-[#8A1E12]',
                        )}>
                          {s.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-5 py-[14px]">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            title="Editar"
                            className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-[#EDE8E3] border border-[#D0CBC4] text-[#5C5654] hover:bg-[#E8D4B8] hover:text-[#780e18] hover:border-[#780e18] transition-all"
                          >
                            <i className="ti ti-edit text-[15px]" />
                          </button>
                          {!s.esCasaMatriz && (
                            <button
                              onClick={() => setDeleteTarget(s)}
                              title="Desactivar"
                              className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-[#EDE8E3] border border-[#D0CBC4] text-[#5C5654] hover:bg-[#F5C9C0] hover:text-[#8A1E12] hover:border-[#D45040] transition-all"
                            >
                              <i className="ti ti-trash text-[15px]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          )}
        </div>
      </div>

      {formOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(45,43,42,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={() => setFormOpen(false)}
          />
          <div className="fixed z-[60] bg-white flex flex-col bottom-0 left-0 right-0 max-h-[80vh] rounded-t-2xl sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:max-h-none sm:w-[420px] sm:rounded-none border-t border-[#E8E5E2] sm:border-t-0 sm:border-l">
            <div className="h-[3px] bg-gradient-to-r from-[#780e18] to-[#D4A333] shrink-0" />
            <div className="px-6 pt-5 pb-[18px] border-b border-[#E8E5E2] flex items-center justify-between gap-3 shrink-0 bg-[#FBFAF7]">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#7A7571] font-semibold mb-1">
                  {editing ? 'Editar sucursal' : 'Nueva sucursal'}
                </div>
                <h2 className="text-[20px] font-semibold text-[#2D2B2A] leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {editing ? editing.nombre : 'Registrar sucursal'}
                </h2>
              </div>
              <button onClick={() => setFormOpen(false)} className="p-1.5 rounded-xl text-[#7A7571] hover:text-[#2D2B2A] hover:bg-[#F0EFEC] transition-colors shrink-0">
                <i className="ti ti-x text-[20px]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#F7F7F7] space-y-4">
              <div>
                <label className="text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.1em] block mb-1.5">
                  Nombre <span className="text-[#B23A2A]">*</span>
                </label>
                <input
                  className="w-full bg-white border border-[#D0CBC4] rounded-lg px-3 py-2 text-[13px] text-[#2D2B2A] placeholder:text-[#7A7571] focus:outline-none focus:ring-2 focus:ring-[#780e18]/20 focus:border-[#780e18] transition-colors"
                  placeholder="Ej: Sucursal Norte"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10.5px] font-semibold text-[#5C5654] uppercase tracking-[0.1em] block mb-1.5">Dirección</label>
                <input
                  className="w-full bg-white border border-[#D0CBC4] rounded-lg px-3 py-2 text-[13px] text-[#2D2B2A] placeholder:text-[#7A7571] focus:outline-none focus:ring-2 focus:ring-[#780e18]/20 focus:border-[#780e18] transition-colors"
                  placeholder="Opcional"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E8E5E2] flex justify-end gap-2.5 shrink-0 bg-white">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border border-[#D0CBC4] text-[13px] text-[#4A4744] font-semibold hover:bg-[#F5F0EB] transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] text-[13px] font-semibold transition-colors disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
              >
                {saving && <i className="ti ti-loader-2 animate-spin text-[14px]" />}
                {editing ? 'Guardar cambios' : 'Crear sucursal'}
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Desactivar sucursal"
        message={`¿Desactivar "${deleteTarget?.nombre}"? Dejará de aparecer como destino en traspasos.`}
      />
    </MainLayout>
  )
}
