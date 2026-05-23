import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ServerPagination } from '@/components/ui'
import { notify } from '@/lib/notify'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import {
  PRODUCTOS_QUERY,
  PRODUCTO_BY_ID_QUERY,
  backendToProductoSimple,
  backendToProducto,
  type ProductoAPI,
} from '@/lib/queries/inventario.queries'
import {
  AJUSTES_HISTORIAL_QUERY,
  backendToAjusteRow,
  type AjusteStockAPI,
  type AjusteStockRow,
} from '@/lib/queries/ajustes.queries'
import type { Producto, PiezaKit } from '@/types'
import { clsx } from 'clsx'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOTIVOS = [
  'Conteo físico',
  'Merma / daño',
  'Error de registro',
  'Devolución de cliente',
  'Ajuste por importación',
  'Otro',
]

// ─── Shared sub-components ────────────────────────────────────────────────────

function MotivoField({ motivo, setMotivo, motivoCustom, setMotivoCustom }: {
  motivo: string; setMotivo: (m: string) => void
  motivoCustom: string; setMotivoCustom: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#1e1b2e] mb-1.5">Motivo *</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {MOTIVOS.map(m => (
          <button key={m} type="button" onClick={() => setMotivo(m)}
            className={clsx('px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all',
              motivo === m
                ? 'bg-[#1d4ed8] text-white border-[#1d4ed8]'
                : 'bg-white text-[#5a5670] border-[#e2e8f0] hover:border-[#1d4ed8] hover:text-[#1d4ed8]')}>
            {m}
          </button>
        ))}
      </div>
      {motivo === 'Otro' && (
        <input type="text" value={motivoCustom} onChange={e => setMotivoCustom(e.target.value)}
          maxLength={200} placeholder="Describe el motivo…" required
          className="w-full h-10 px-3.5 rounded-xl border border-[#e2e8f0] bg-white text-[#1e1b2e] text-sm focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/10 transition-all" />
      )}
    </div>
  )
}

function NotaField({ nota, setNota }: { nota: string; setNota: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#1e1b2e] mb-1.5">
        Nota <span className="font-normal text-[#9996b0]">(opcional)</span>
      </label>
      <textarea value={nota} onChange={e => setNota(e.target.value)} maxLength={500} rows={2}
        placeholder="Detalles adicionales…"
        className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] bg-white text-[#1e1b2e] text-sm resize-none focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/10 transition-all" />
    </div>
  )
}

// ─── Table skeletons ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-[#e2e8f0]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-3.5 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded bg-[#f1f5f9]" />
            <div className="h-2.5 w-40 rounded bg-[#e2e8f0]" />
          </div>
          <div className="h-2.5 w-16 rounded bg-[#f1f5f9]" />
          <div className="h-2.5 w-16 rounded bg-[#f1f5f9]" />
          <div className="h-6 w-14 rounded bg-[#f1f5f9]" />
          <div className="h-7 w-20 rounded-lg bg-[#f1f5f9]" />
        </div>
      ))}
    </div>
  )
}

function MobileSkeletonRows() {
  return (
    <div className="divide-y divide-[#e2e8f0]">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-[#f1f5f9]" />
            <div className="h-2.5 w-36 rounded bg-[#e2e8f0]" />
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="h-5 w-10 rounded bg-[#f1f5f9]" />
            <div className="h-2.5 w-14 rounded bg-[#e2e8f0]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function HistorialSkeleton() {
  return (
    <div className="divide-y divide-[#e2e8f0]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-3.5 animate-pulse">
          <div className="h-2.5 w-28 rounded bg-[#f1f5f9]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-[#f1f5f9]" />
            <div className="h-2.5 w-24 rounded bg-[#e2e8f0]" />
          </div>
          <div className="h-6 w-12 rounded-full bg-[#f1f5f9]" />
          <div className="h-2.5 w-24 rounded bg-[#f1f5f9]" />
          <div className="h-2.5 w-20 rounded bg-[#f1f5f9]" />
        </div>
      ))}
    </div>
  )
}

// ─── AjusteModal ─────────────────────────────────────────────────────────────

type ModalTab = 'kit' | 'piezas'

interface PiezaAjuste {
  pieza: PiezaKit
  deltaStr: string
}

function AjusteModal({
  producto,
  onClose,
  onSuccess,
}: {
  producto: Producto
  onClose: () => void
  onSuccess: (id: string, nuevoStock: number) => void
}) {
  const [tab, setTab] = useState<ModalTab>('kit')
  const [deltaStr, setDeltaStr] = useState('')
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [motivoCustom, setMotivoCustom] = useState('')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingPiezas, setLoadingPiezas] = useState(false)
  const [piezasAjuste, setPiezasAjuste] = useState<PiezaAjuste[]>([])
  const [motivoPiezas, setMotivoPiezas] = useState(MOTIVOS[0])
  const [motivoPiezasCustom, setMotivoPiezasCustom] = useState('')
  const [notaPiezas, setNotaPiezas] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (tab === 'piezas' && producto.es_kit && piezasAjuste.length === 0 && !loadingPiezas) {
      setLoadingPiezas(true)
      gql<{ productos: { nodes: ProductoAPI[] } }>(PRODUCTO_BY_ID_QUERY, { id: Number(producto.id) })
        .then(data => {
          const raw = data.productos?.nodes?.[0]
          if (raw) {
            const full = backendToProducto(raw)
            setPiezasAjuste((full.piezas_kit ?? []).map(p => ({ pieza: p, deltaStr: '' })))
          }
        })
        .catch(() => notify.error('Error cargando piezas'))
        .finally(() => setLoadingPiezas(false))
    }
  }, [tab, producto, piezasAjuste.length, loadingPiezas])

  const delta = deltaStr === '' ? NaN : parseInt(deltaStr, 10)
  const deltaValido = !isNaN(delta) && delta !== 0
  const nuevoStock = producto.stock + delta
  const nuevoStockValido = deltaValido && nuevoStock >= 0
  const motivoFinal = motivo === 'Otro' ? motivoCustom.trim() : motivo
  const motivoPiezasFinal = motivoPiezas === 'Otro' ? motivoPiezasCustom.trim() : motivoPiezas

  const piezasConCambio = piezasAjuste.filter(pa => {
    const d = parseInt(pa.deltaStr, 10)
    return pa.deltaStr !== '' && !isNaN(d) && d !== 0 && (pa.pieza.stock_actual + d) >= 0
  })

  const handleSubmitKit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoStockValido || !motivoFinal) return
    setSaving(true)
    try {
      const res = await api.post<{ cantidadNueva: number }>(`/AjusteStock/${producto.id}`, {
        delta,
        motivo: motivoFinal,
        nota: nota.trim(),
      })
      notify.success('Stock ajustado', {
        description: `${producto.nombre}: ${producto.stock} → ${res?.cantidadNueva ?? nuevoStock}`,
      })
      onSuccess(producto.id, res?.cantidadNueva ?? nuevoStock)
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al ajustar stock')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitPiezas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motivoPiezasFinal || piezasConCambio.length === 0) return
    setSaving(true)
    try {
      for (const pa of piezasConCambio) {
        const d = parseInt(pa.deltaStr, 10)
        await api.post(`/AjusteStock/${producto.id}/Piezas/${pa.pieza.id}`, {
          delta: d,
          motivo: motivoPiezasFinal,
          nota: notaPiezas.trim(),
        })
      }
      notify.success(`${piezasConCambio.length} pieza(s) ajustada(s)`)
      onSuccess(producto.id, -1)
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al ajustar piezas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden border border-[#e2e8f0]">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#e2e8f0]">
          <div className="flex items-start gap-3">
            <div className={clsx(
              'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white',
              producto.es_kit
                ? 'bg-gradient-to-br from-[#7c3aed] to-[#1d4ed8]'
                : 'bg-gradient-to-br from-[#0284c7] to-[#60a5fa]'
            )}>
              <i className={clsx('text-[18px]', producto.es_kit ? 'ti ti-stack' : 'ti ti-package')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono font-bold text-[#1e1b2e] truncate tracking-[0.05em]">{producto.codigo_universal}</p>
              {(producto.codigos_alternativos?.filter(Boolean) ?? []).length > 0 && (
                <div className="flex flex-wrap gap-x-1.5 mt-0.5">
                  {producto.codigos_alternativos!.filter(Boolean).map((c, i) => (
                    <span key={i} className="text-[12px] font-mono text-[#9996b0]">{c}</span>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-[#9996b0] truncate mt-0.5">{producto.nombre}</p>
              {producto.marca && <p className="text-[10px] text-[#9996b0]/70 mt-0.5">{producto.marca}</p>}
            </div>
            <button onClick={onClose} className="text-[#9996b0] hover:text-[#1e1b2e] transition-colors p-1 rounded-lg hover:bg-[#f1f5f9]">
              <i className="ti ti-x text-[18px]" />
            </button>
          </div>

          {producto.es_kit && (
            <div className="flex gap-1 mt-4 p-1 bg-[#f1f5f9] rounded-xl border border-[#e2e8f0]">
              <button
                onClick={() => setTab('kit')}
                className={clsx('flex-1 h-8 rounded-lg text-[12px] font-semibold transition-all',
                  tab === 'kit'
                    ? 'bg-white text-[#1e1b2e] shadow-sm border border-[#e2e8f0]'
                    : 'text-[#9996b0] hover:text-[#1e1b2e]')}
              >
                Kit completo
              </button>
              <button
                onClick={() => setTab('piezas')}
                className={clsx('flex-1 h-8 rounded-lg text-[12px] font-semibold transition-all',
                  tab === 'piezas'
                    ? 'bg-white text-[#1e1b2e] shadow-sm border border-[#e2e8f0]'
                    : 'text-[#9996b0] hover:text-[#1e1b2e]')}
              >
                Por pieza
              </button>
            </div>
          )}
        </div>

        {/* ── Tab: Kit completo ── */}
        {tab === 'kit' && (
          <form onSubmit={handleSubmitKit} className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#f1f5f9] rounded-xl px-4 py-3 text-center border border-[#e2e8f0]">
                <p className="text-[10px] text-[#9996b0] uppercase tracking-wider mb-1 font-bold">Actual</p>
                <p className="text-[28px] font-mono font-black text-[#1e1b2e] leading-none">{producto.stock}</p>
                {producto.es_kit && <p className="text-[10px] text-[#1d4ed8] font-bold mt-1">kits</p>}
              </div>
              <div className="text-[#9996b0]">
                <i className="ti ti-arrow-right text-[20px]" />
              </div>
              <div className={clsx('flex-1 rounded-xl px-4 py-3 text-center border-2 transition-all',
                !deltaValido || !nuevoStockValido
                  ? 'bg-[#f1f5f9] border-[#e2e8f0]'
                  : delta > 0
                    ? 'bg-[#d1fae5] border-[#059669]/30'
                    : 'bg-[#fee2e2] border-[#dc2626]/30'
              )}>
                <p className="text-[10px] text-[#9996b0] uppercase tracking-wider mb-1 font-bold">Resultado</p>
                <p className={clsx('text-[28px] font-mono font-black leading-none',
                  !deltaValido || !nuevoStockValido ? 'text-[#9996b0]'
                  : delta > 0 ? 'text-[#059669]' : 'text-[#dc2626]'
                )}>
                  {deltaValido && nuevoStockValido ? nuevoStock : '—'}
                </p>
                {deltaValido && nuevoStockValido && (
                  <p className={clsx('text-[11px] font-bold mt-1', delta > 0 ? 'text-[#059669]' : 'text-[#dc2626]')}>
                    {delta > 0 ? `+${delta}` : delta}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1e1b2e] mb-1.5">
                Ajuste <span className="font-normal text-[#9996b0]">(usa − para restar, p.ej. −3 o +5)</span>
              </label>
              <input
                ref={inputRef}
                type="number"
                value={deltaStr}
                onChange={e => setDeltaStr(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-[#e2e8f0] bg-white text-[#1e1b2e] text-lg text-center font-bold focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/10 transition-all"
                placeholder="0"
              />
              {deltaValido && !nuevoStockValido && (
                <p className="text-xs text-[#dc2626] mt-1 font-medium">El resultado sería negativo — ajuste no permitido.</p>
              )}
            </div>

            <MotivoField motivo={motivo} setMotivo={setMotivo} motivoCustom={motivoCustom} setMotivoCustom={setMotivoCustom} />
            <NotaField nota={nota} setNota={setNota} />

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} disabled={saving}
                className="flex-1 h-10 rounded-xl border border-[#e2e8f0] text-sm font-semibold text-[#5a5670] hover:bg-[#f1f5f9] transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving || !nuevoStockValido || !motivoFinal}
                className="flex-1 h-10 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md">
                {saving ? 'Guardando…' : 'Confirmar ajuste'}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab: Por pieza ── */}
        {tab === 'piezas' && (
          <form onSubmit={handleSubmitPiezas} className="px-6 py-5 space-y-4">
            {loadingPiezas ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-7 w-7 rounded-full border-2 border-[#e2e8f0] border-t-[#1d4ed8] animate-spin" />
              </div>
            ) : piezasAjuste.length === 0 ? (
              <p className="text-sm text-[#9996b0] text-center py-8 font-semibold">Sin piezas registradas</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {piezasAjuste.map((pa, idx) => {
                  const d = parseInt(pa.deltaStr, 10)
                  const dValido = pa.deltaStr !== '' && !isNaN(d) && d !== 0
                  const resultado = pa.pieza.stock_actual + d
                  const resultadoValido = dValido && resultado >= 0
                  return (
                    <div key={pa.pieza.id}
                      className={clsx('flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors',
                        dValido && resultadoValido
                          ? 'border-[#1d4ed8]/30 bg-[#dbeafe]/40'
                          : dValido && !resultadoValido
                            ? 'border-[#dc2626]/30 bg-[#fee2e2]/50'
                            : 'border-[#e2e8f0] bg-[#f1f5f9]/50'
                      )}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#1e1b2e] truncate">{pa.pieza.nombre}</p>
                        <p className="text-[10px] text-[#9996b0] font-mono">{pa.pieza.codigo_universal}</p>
                      </div>
                      <div className="text-right shrink-0 w-12">
                        <p className="text-[10px] text-[#9996b0] font-semibold">actual</p>
                        <p className="text-sm font-mono font-bold text-[#1e1b2e]">{pa.pieza.stock_actual}</p>
                      </div>
                      <div className="shrink-0 w-20">
                        <input
                          type="number"
                          value={pa.deltaStr}
                          onChange={e => setPiezasAjuste(prev => prev.map((x, i) => i === idx ? { ...x, deltaStr: e.target.value } : x))}
                          className="w-full h-8 px-2 rounded-lg border border-[#e2e8f0] bg-white text-[#1e1b2e] text-sm text-center font-bold focus:outline-none focus:border-[#1d4ed8] transition-all"
                          placeholder="±0"
                        />
                      </div>
                      <div className="shrink-0 w-10 text-right">
                        {dValido && resultadoValido && (
                          <span className={clsx('text-[12px] font-mono font-bold',
                            d > 0 ? 'text-[#059669]' : 'text-[#dc2626]')}>
                            {resultado}
                          </span>
                        )}
                        {dValido && !resultadoValido && (
                          <span className="text-[10px] text-[#dc2626] font-bold">−</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!loadingPiezas && piezasAjuste.length > 0 && (
              <>
                <MotivoField motivo={motivoPiezas} setMotivo={setMotivoPiezas} motivoCustom={motivoPiezasCustom} setMotivoCustom={setMotivoPiezasCustom} />
                <NotaField nota={notaPiezas} setNota={setNotaPiezas} />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={onClose} disabled={saving}
                    className="flex-1 h-10 rounded-xl border border-[#e2e8f0] text-sm font-semibold text-[#5a5670] hover:bg-[#f1f5f9] transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button type="submit"
                    disabled={saving || piezasConCambio.length === 0 || !motivoPiezasFinal}
                    className="flex-1 h-10 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md">
                    {saving ? 'Guardando…' : `Ajustar${piezasConCambio.length > 0 ? ` (${piezasConCambio.length})` : ''}`}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

// ─── HistorialTab ─────────────────────────────────────────────────────────────

function fmtFecha(d: Date) {
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
}

function HistorialTab() {
  const [historial, setHistorial] = useState<AjusteStockRow[]>([])
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
    gql<{ ajustesStock: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: AjusteStockAPI[] } }>(
      AJUSTES_HISTORIAL_QUERY,
      { first: size, after: cursors.current[targetPage] ?? null, where, order: [{ fecha: 'DESC' }] },
    )
      .then(res => {
        const { totalCount, pageInfo, nodes } = res.ajustesStock
        setHistorial(nodes.map(backendToAjusteRow))
        setTotal(totalCount)
        setHasNext(pageInfo.hasNextPage)
        cursors.current[targetPage + 1] = pageInfo.endCursor
        setPage(targetPage)
      })
      .catch(() => notify.error('Error cargando historial'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadHistorial(0, pageSize) }, [loadHistorial, pageSize])

  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      cursors.current = [null]
      loadHistorial(0, pageSize, val)
    }, 350)
  }

  return (
    <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] overflow-hidden">
      <div className="px-5 py-[18px] border-b border-[#e2e8f0] flex flex-wrap justify-between items-center gap-4">
        <h3 className="text-lg font-extrabold text-[#1e1b2e] flex items-center gap-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Historial
          <span className="bg-[#dbeafe] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full">{total}</span>
        </h3>
        <div className="flex items-center gap-2 bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 w-full sm:w-auto sm:min-w-[250px] focus-within:border-[#1d4ed8] transition-colors">
          <i className="ti ti-search text-[#9996b0] text-base shrink-0" />
          <input
            className="flex-1 py-2 bg-transparent text-sm text-[#1e1b2e] font-semibold placeholder:text-[#9996b0] outline-none border-none"
            placeholder="Buscar por producto, código o motivo…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <HistorialSkeleton />
      ) : historial.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-5">
          <div className="w-12 h-12 rounded-xl bg-white border-[1.5px] border-[#e2e8f0] flex items-center justify-center mb-4">
            <i className="ti ti-history text-[#9996b0] text-xl" />
          </div>
          <p className="text-sm font-bold text-[#1e1b2e] mb-1">Sin registros</p>
          <p className="text-xs text-[#9996b0] font-semibold max-w-xs">No hay ajustes de stock registrados aún.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f1f5f9]">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide whitespace-nowrap">Fecha</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide">Producto</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide text-center">Delta</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide text-center">Anterior → Nuevo</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide">Motivo</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide hidden lg:table-cell">Nota</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((r) => (
                <tr key={r.id} className="border-t border-[#e2e8f0] hover:bg-[#faf9ff] transition-colors">
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className="text-xs text-[#9996b0] font-mono">{fmtFecha(r.fecha)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-semibold text-[#1e1b2e] truncate max-w-[200px]">{r.productoNombre}</p>
                    <p className="text-[11px] font-mono text-[#9996b0]">{r.productoCodigo}</p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={clsx(
                      'font-mono font-bold text-sm px-2.5 py-0.5 rounded-full',
                      r.delta > 0 ? 'text-[#059669] bg-[#d1fae5]' : 'text-[#dc2626] bg-[#fee2e2]'
                    )}>
                      {r.delta > 0 ? `+${r.delta}` : r.delta}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="font-mono text-sm text-[#5a5670]">
                      {r.cantidadAnterior}
                      <span className="mx-1.5 text-[#9996b0]">→</span>
                      {r.cantidadNueva}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-[#1e1b2e] truncate max-w-[180px] block">{r.motivo}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-xs text-[#9996b0] truncate max-w-[160px] block">{r.nota || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="px-5 py-3.5 bg-[#f1f5f9] border-t border-[#e2e8f0]">
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

// ─── AjustesPage ─────────────────────────────────────────────────────────────

export function AjustesPage() {
  const [activeTab, setActiveTab] = useState<'ajustes' | 'historial'>('ajustes')
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'bajo' | 'kits'>('todos')
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const cursors = useRef<(string | null)[]>([null])
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }, [])

  const loadProductos = useCallback((targetPage: number, size: number, q = '', currentFiltro: 'todos' | 'bajo' | 'kits' = 'todos') => {
    setLoading(true)
    const conditions: object[] = [{ activo: { eq: true } }]
    if (q.trim()) {
      conditions.push({ or: [
        { nombre: { contains: q } },
        { codigo: { contains: q } },
        { codigoAux: { contains: q } },
        { codigoAux2: { contains: q } },
      ]})
    }
    if (currentFiltro === 'kits') conditions.push({ esKit: { eq: true } })
    const where = conditions.length === 1 ? conditions[0] : { and: conditions }
    gql<{ productos: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: ProductoAPI[] } }>(
      PRODUCTOS_QUERY,
      { first: size, after: cursors.current[targetPage] ?? null, where },
    )
      .then(res => {
        const { totalCount, pageInfo, nodes } = res.productos
        setProductos(nodes.map(backendToProductoSimple))
        setTotalCount(totalCount)
        setHasNextPage(pageInfo.hasNextPage)
        cursors.current[targetPage + 1] = pageInfo.endCursor
        setPage(targetPage)
      })
      .catch(() => notify.error('Error cargando productos'))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      cursors.current = [null]
      loadProductos(0, pageSize, val, filtro)
    }, 350)
  }

  const handleFiltro = (f: typeof filtro) => {
    setFiltro(f)
    cursors.current = [null]
    loadProductos(0, pageSize, search, f)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProductos(0, pageSize) }, [loadProductos])

  const displayed = useMemo(
    () => filtro === 'bajo' ? productos.filter(p => p.stock <= p.stock_minimo) : productos,
    [productos, filtro],
  )

  const handleSuccess = (id: string, nuevoStock: number) => {
    if (nuevoStock >= 0) {
      setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: nuevoStock } : p))
    } else {
      loadProductos(page, pageSize, search, filtro)
    }
  }

  const kpi = useMemo(() => ({
    total: totalCount,
    stockBajo: productos.filter(p => p.stock <= p.stock_minimo).length,
    kits: productos.filter(p => p.es_kit).length,
  }), [productos, totalCount])

  return (
    <MainLayout>
      <div className="bg-[#f1f5f9] min-h-screen">

        {/* ── TopBar ── */}
        <header className="bg-[#f1f5f9] sticky top-0 z-40 flex justify-between items-center w-full h-[62px] px-7 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2 text-sm text-[#9996b0] font-semibold">
            <span>Operaciones</span>
            <span className="text-[10px] opacity-40">/</span>
            <span>Inventario</span>
            <span className="text-[10px] opacity-40">/</span>
            <strong className="text-[#1e1b2e] font-bold">Ajustes</strong>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex bg-white px-3.5 py-1.5 rounded-xl items-center gap-2 border-[1.5px] border-[#e2e8f0]">
              <i className="ti ti-calendar text-[#9996b0] text-[15px]" />
              <span className="text-xs font-semibold text-[#5a5670]">{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-white border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#f1f5f9] transition-colors relative" title="Notificaciones">
                <i className="ti ti-bell text-[18px]" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
              </button>
              <button className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-white border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#f1f5f9] transition-colors" title="Configuración">
                <i className="ti ti-settings text-[18px]" />
              </button>
            </div>
          </div>
        </header>

        <div className="px-7 py-6 max-w-[1400px] mx-auto">

          {/* ── Page Header ── */}
          <div className="flex items-center gap-3.5 mb-6">
            <div
              className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#1d4ed8] rounded-2xl flex items-center justify-center text-white shrink-0"
              style={{ boxShadow: '0 6px 18px rgba(124,58,237,0.28)' }}
            >
              <i className="ti ti-adjustments text-2xl" />
            </div>
            <div>
              <h2 className="font-black text-[34px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Ajustes
              </h2>
              <p className="text-sm text-[#9996b0] font-semibold mt-0.5">
                Corrección manual de stock por conteo físico o mermas
              </p>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 bg-white border-[1.5px] border-[#e2e8f0] rounded-xl p-1 w-fit mb-6">
            {(['ajustes', 'historial'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={clsx(
                  'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                  activeTab === t
                    ? 'bg-[#1d4ed8] text-white shadow-sm'
                    : 'text-[#9996b0] hover:text-[#1e1b2e] hover:bg-[#f1f5f9]'
                )}
              >
                {t === 'ajustes' ? 'Ajustes' : 'Historial'}
              </button>
            ))}
          </div>

          {activeTab === 'historial' && <HistorialTab />}

          {activeTab === 'ajustes' && (
            <>
              {/* ── KPI Cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">

                <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                  <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#3b82f6] opacity-10" />
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#60a5fa] flex items-center justify-center text-white mb-3.5">
                    <i className="ti ti-package text-xl" />
                  </div>
                  <div className="font-black text-[30px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    {kpi.total.toLocaleString('es-BO')}
                  </div>
                  <div className="text-xs font-semibold text-[#9996b0] mt-1">Total productos</div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0284c7] mt-2">
                    <i className="ti ti-circle-check text-[11px]" />
                    en catálogo
                  </div>
                </div>

                <div className={clsx(
                  'rounded-2xl border-[1.5px] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200',
                  kpi.stockBajo > 0 ? 'bg-[#dc2626]/5 border-[#dc2626]/30' : 'bg-white border-[#e2e8f0]'
                )}>
                  <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#dc2626] opacity-10" />
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#dc2626] to-[#ff9090] flex items-center justify-center text-white mb-3.5">
                    <i className="ti ti-alert-triangle text-xl" />
                  </div>
                  <div
                    className={clsx('font-black text-[30px] leading-none', kpi.stockBajo > 0 ? 'text-[#dc2626]' : 'text-[#1e1b2e]')}
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  >
                    {kpi.stockBajo}
                  </div>
                  <div className="text-xs font-semibold text-[#9996b0] mt-1">Stock crítico</div>
                  <div className={clsx(
                    'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-2',
                    kpi.stockBajo > 0 ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#d1fae5] text-[#059669]'
                  )}>
                    <i className={clsx('text-[11px]', kpi.stockBajo > 0 ? 'ti ti-mood-sad' : 'ti ti-mood-smile')} />
                    {kpi.stockBajo > 0 ? 'requiere acción' : 'todo bien'}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                  <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-[#059669] opacity-10" />
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#059669] to-[#4eddc4] flex items-center justify-center text-white mb-3.5">
                    <i className="ti ti-stack text-xl" />
                  </div>
                  <div className="font-black text-[30px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    {kpi.kits.toLocaleString('es-BO')}
                  </div>
                  <div className="text-xs font-semibold text-[#9996b0] mt-1">Kits</div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#059669] mt-2">
                    <i className="ti ti-layers-linked text-[11px]" />
                    productos kit
                  </div>
                </div>

              </div>

              {/* ── Table Container ── */}
              <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] overflow-hidden">

                {/* Toolbar */}
                <div className="px-5 py-[18px] border-b border-[#e2e8f0] flex flex-wrap justify-between items-center gap-4">
                  <h3 className="text-lg font-extrabold text-[#1e1b2e] flex items-center gap-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    Productos
                    <span className="bg-[#dbeafe] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {totalCount}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 w-full sm:w-auto sm:min-w-[250px] focus-within:border-[#1d4ed8] transition-colors">
                      <i className="ti ti-search text-[#9996b0] text-base shrink-0" />
                      <input
                        className="flex-1 py-2 bg-transparent text-sm text-[#1e1b2e] font-semibold placeholder:text-[#9996b0] outline-none border-none"
                        placeholder="Buscar por nombre, código o marca…"
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-1">
                      {(['todos', 'bajo', 'kits'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => handleFiltro(f)}
                          className={clsx('px-3 h-9 rounded-lg text-xs font-semibold border transition-all',
                            filtro === f
                              ? 'bg-[#1d4ed8] text-white border-[#1d4ed8]'
                              : 'bg-white text-[#5a5670] border-[#e2e8f0] hover:bg-[#f1f5f9]'
                          )}
                        >
                          {f === 'todos' ? 'Todos' : f === 'bajo' ? `Bajo mínimo${kpi.stockBajo > 0 ? ` (${kpi.stockBajo})` : ''}` : 'Kits'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {loading ? (
                  <>
                    <div className="hidden md:block"><TableSkeleton /></div>
                    <div className="md:hidden"><MobileSkeletonRows /></div>
                  </>
                ) : displayed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
                    <div className="w-12 h-12 rounded-xl bg-white border-[1.5px] border-[#e2e8f0] flex items-center justify-center mb-4">
                      <i className="ti ti-package text-[#9996b0] text-xl" />
                    </div>
                    <p className="text-sm font-bold text-[#1e1b2e] mb-1">Sin productos</p>
                    <p className="text-xs text-[#9996b0] font-semibold max-w-xs">
                      No hay productos que coincidan con la búsqueda o filtro.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Desktop table ── */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#f1f5f9]">
                          <tr>
                            <th className="px-6 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide">Producto</th>
                            <th className="px-4 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide">Marca</th>
                            <th className="px-4 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide hidden lg:table-cell">Ubicación</th>
                            <th className="px-4 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide text-right">Mín.</th>
                            <th className="px-4 py-3 text-[11px] font-bold text-[#9996b0] uppercase tracking-wide text-right">Stock</th>
                            <th className="w-28 px-4" />
                          </tr>
                        </thead>
                        <tbody>
                          {displayed.map((p) => {
                            const bajo = p.stock <= p.stock_minimo
                            return (
                              <tr
                                key={p.id}
                                className="border-t border-[#e2e8f0] hover:bg-[#faf9ff] transition-colors cursor-pointer"
                                onClick={() => setSeleccionado(p)}
                              >
                                <td className={clsx('px-6 py-3.5', p.es_kit && 'border-l-[3px] border-l-[#1d4ed8]')}>
                                  <div className="flex items-center gap-2.5">
                                    <div className={clsx(
                                      'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                                      p.es_kit
                                        ? 'bg-gradient-to-br from-[#7c3aed] to-[#1d4ed8] text-white'
                                        : 'bg-[#f1f5f9] text-[#9996b0]'
                                    )}>
                                      <i className={clsx('text-[16px]', p.es_kit ? 'ti ti-stack' : 'ti ti-package')} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-mono font-bold text-[#1e1b2e] truncate max-w-[220px] tracking-[0.05em]">{p.codigo_universal}</p>
                                      {(p.codigos_alternativos?.filter(Boolean) ?? []).length > 0 && (
                                        <div className="flex items-center flex-wrap gap-x-1.5 mt-0.5">
                                          {p.codigos_alternativos!.filter(Boolean).map((c, i) => (
                                            <span key={i} className="text-[12px] font-mono text-[#9996b0]">{c}</span>
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
                                        <span className="text-[11px] text-[#9996b0] truncate max-w-[200px]">{p.nombre}</span>
                                        {p.es_kit && (
                                          <span className="text-[9px] bg-[#dbeafe] text-[#1d4ed8] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Kit</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  {p.marca ? (
                                    <div className="inline-flex items-center gap-1.5 bg-[#dbeafe] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8] shrink-0" />
                                      {p.marca}
                                    </div>
                                  ) : (
                                    <span className="text-[12px] text-[#9996b0]">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 hidden lg:table-cell">
                                  <div className="text-[11px] text-[#9996b0] font-medium flex items-center gap-1">
                                    <i className="ti ti-map-pin text-[11px]" />
                                    <span>{[p.almacen, p.estante, p.fila, p.columna].filter(Boolean).join(' / ') || '—'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <span className="text-sm text-[#9996b0] tabular-nums font-semibold">{p.stock_minimo}</span>
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <span className={clsx('font-mono font-black text-[22px] leading-none tabular-nums',
                                    p.stock === 0 ? 'text-[#dc2626]' : bajo ? 'text-[#ea580c]' : 'text-[#1e1b2e]')}>
                                    {p.stock}
                                  </span>
                                  {bajo && (
                                    <p className="text-[10px] text-[#ea580c] font-bold mt-0.5">bajo mínimo</p>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <button
                                    onClick={e => { e.stopPropagation(); setSeleccionado(p) }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#e2e8f0] text-[#5a5670] hover:bg-[#dbeafe] hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-all"
                                  >
                                    Ajustar
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ── Mobile list ── */}
                    <div className="md:hidden">
                      {displayed.map(p => {
                        const bajo = p.stock <= p.stock_minimo
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSeleccionado(p)}
                            className={clsx(
                              'flex items-center gap-3 px-4 py-3 border-b border-[#e2e8f0] last:border-0 active:bg-[#f1f5f9] transition-colors cursor-pointer',
                              p.es_kit && 'border-l-[3px] border-l-[#1d4ed8]',
                            )}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                          >
                            <div className={clsx(
                              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                              p.es_kit
                                ? 'bg-gradient-to-br from-[#7c3aed] to-[#1d4ed8] text-white'
                                : 'bg-[#f1f5f9] text-[#9996b0]'
                            )}>
                              <i className={clsx('text-[18px]', p.es_kit ? 'ti ti-stack' : 'ti ti-package')} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono font-bold text-[13px] text-[#1e1b2e] truncate tracking-[0.05em]">{p.codigo_universal}</p>
                              {(p.codigos_alternativos?.filter(Boolean) ?? []).length > 0 && (
                                <div className="flex gap-1.5 mt-0.5">
                                  {p.codigos_alternativos!.filter(Boolean).map((c, i) => (
                                    <span key={i} className="text-[11px] font-mono text-[#9996b0]">{c}</span>
                                  ))}
                                </div>
                              )}
                              <p className="text-[11px] text-[#9996b0] truncate mt-0.5">
                                {p.nombre}{p.marca ? ` · ${p.marca}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={clsx('font-mono font-black text-[20px] leading-none tabular-nums',
                                p.stock === 0 ? 'text-[#dc2626]' : bajo ? 'text-[#ea580c]' : 'text-[#1e1b2e]')}>
                                {p.stock}
                              </span>
                              {bajo
                                ? <span className="text-[10px] text-[#ea580c] font-bold">bajo mín.</span>
                                : <span className="text-[10px] text-[#9996b0] font-semibold">mín. {p.stock_minimo}</span>
                              }
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); setSeleccionado(p) }}
                              className="ml-1 shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-[#e2e8f0] text-[#5a5670] hover:bg-[#dbeafe] hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-all"
                            >
                              Ajustar
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {!loading && (
                  <div className="px-5 py-3.5 bg-[#f1f5f9] border-t border-[#e2e8f0]">
                    <ServerPagination
                      totalCount={filtro === 'bajo' ? displayed.length : totalCount}
                      page={page}
                      pageSize={pageSize}
                      hasNextPage={filtro === 'bajo' ? false : hasNextPage}
                      loading={loading}
                      onPage={p => { cursors.current = cursors.current.slice(0, p + 1); loadProductos(p, pageSize, search, filtro) }}
                      onPageSize={size => { cursors.current = [null]; setPageSize(size); loadProductos(0, size, search, filtro) }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {seleccionado && (
        <AjusteModal
          producto={seleccionado}
          onClose={() => setSeleccionado(null)}
          onSuccess={handleSuccess}
        />
      )}
    </MainLayout>
  )
}
