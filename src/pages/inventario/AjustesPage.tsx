import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { WarmMetric } from '@/components/ui'
import { notify } from '@/lib/notify'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { PRODUCTOS_QUERY, PRODUCTO_BY_ID_QUERY, backendToProductoSimple, backendToProducto, type ProductoAPI } from '@/lib/queries/inventario.queries'
import type { Producto, PiezaKit } from '@/types'
import { clsx } from 'clsx'
import { AutopartsWatermark } from './AutopartsWatermark'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IcoSearch() {
  return (
    <svg className="h-4 w-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
    </svg>
  )
}
function IcoBox() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/>
    </svg>
  )
}
function IcoKit() {
  return (
    <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z"/>
    </svg>
  )
}
function IcoAlert() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>
    </svg>
  )
}
function IcoLayers() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/><path d="m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/>
    </svg>
  )
}

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
      <label className="block text-xs font-semibold text-ink mb-1.5">Motivo *</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {MOTIVOS.map(m => (
          <button key={m} type="button" onClick={() => setMotivo(m)}
            className={clsx('px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all',
              motivo === m ? 'bg-ink text-cream border-ink' : 'bg-white text-muted border-hair hover:border-hair-2')}>
            {m}
          </button>
        ))}
      </div>
      {motivo === 'Otro' && (
        <input type="text" value={motivoCustom} onChange={e => setMotivoCustom(e.target.value)}
          maxLength={200} placeholder="Describe el motivo…" required
          className="w-full h-10 px-3.5 rounded-xl border border-hair bg-white text-ink text-sm focus:outline-none focus:border-terra transition-all" />
      )}
    </div>
  )
}

function NotaField({ nota, setNota }: { nota: string; setNota: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink mb-1.5">
        Nota <span className="font-normal text-muted">(opcional)</span>
      </label>
      <textarea value={nota} onChange={e => setNota(e.target.value)} maxLength={500} rows={2}
        placeholder="Detalles adicionales…"
        className="w-full px-3.5 py-2.5 rounded-xl border border-hair bg-white text-ink text-sm resize-none focus:outline-none focus:border-terra transition-all" />
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

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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

  // Kit tab computed
  const delta = deltaStr === '' ? NaN : parseInt(deltaStr, 10)
  const deltaValido = !isNaN(delta) && delta !== 0
  const nuevoStock = producto.stock + delta
  const nuevoStockValido = deltaValido && nuevoStock >= 0
  const motivoFinal = motivo === 'Otro' ? motivoCustom.trim() : motivo
  const motivoPiezasFinal = motivoPiezas === 'Otro' ? motivoPiezasCustom.trim() : motivoPiezas

  // Piezas tab computed
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
        delta: delta,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-paper rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-hair">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-hair">
          <div className="flex items-start gap-3">
            <div className={clsx('h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
              producto.es_kit ? 'bg-terra/10 text-terra' : 'bg-cream-2 text-ink-2')}>
              {producto.es_kit ? <IcoKit /> : <IcoBox />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{producto.nombre}</p>
              <p className="text-[11px] text-muted font-mono">{producto.codigo_universal}</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-ink transition-colors p-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Tabs — only for kits */}
          {producto.es_kit && (
            <div className="flex gap-1 mt-4 p-1 bg-cream rounded-xl">
              <button
                onClick={() => setTab('kit')}
                className={clsx('flex-1 h-8 rounded-lg text-[12px] font-semibold transition-all',
                  tab === 'kit' ? 'bg-white text-ink shadow-sm border border-hair' : 'text-muted hover:text-ink')}
              >
                Kit completo
              </button>
              <button
                onClick={() => setTab('piezas')}
                className={clsx('flex-1 h-8 rounded-lg text-[12px] font-semibold transition-all',
                  tab === 'piezas' ? 'bg-white text-ink shadow-sm border border-hair' : 'text-muted hover:text-ink')}
              >
                Por pieza
              </button>
            </div>
          )}
        </div>

        {/* ── Tab: Kit completo ── */}
        {tab === 'kit' && (
          <form onSubmit={handleSubmitKit} className="px-6 py-5 space-y-4">
            {/* Stock preview */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-cream rounded-xl px-4 py-3 text-center border border-hair">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Actual</p>
                <p className="text-[28px] font-serif text-ink leading-none">{producto.stock}</p>
                {producto.es_kit && <p className="text-[10px] text-terra mt-1">kits</p>}
              </div>
              <div className="text-muted">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
              </div>
              <div className={clsx('flex-1 rounded-xl px-4 py-3 text-center border-2 transition-all',
                !deltaValido || !nuevoStockValido ? 'bg-cream border-hair' :
                delta > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Resultado</p>
                <p className={clsx('text-[28px] font-serif leading-none',
                  !deltaValido || !nuevoStockValido ? 'text-muted' :
                  delta > 0 ? 'text-emerald-700' : 'text-red-600')}>
                  {deltaValido && nuevoStockValido ? nuevoStock : '—'}
                </p>
                {deltaValido && nuevoStockValido && (
                  <p className={clsx('text-[11px] font-semibold mt-1', delta > 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {delta > 0 ? `+${delta}` : delta}
                  </p>
                )}
              </div>
            </div>

            {/* Delta input */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Ajuste <span className="font-normal text-muted">(usa − para restar, p.ej. −3 o +5)</span>
              </label>
              <input
                ref={inputRef}
                type="number"
                value={deltaStr}
                onChange={e => setDeltaStr(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-hair bg-white text-ink text-lg text-center font-semibold focus:outline-none focus:border-terra focus:ring-2 focus:ring-terra/10 transition-all"
                placeholder="0"
              />
              {deltaValido && !nuevoStockValido && (
                <p className="text-xs text-red-600 mt-1">El resultado sería negativo — ajuste no permitido.</p>
              )}
            </div>

            <MotivoField motivo={motivo} setMotivo={setMotivo} motivoCustom={motivoCustom} setMotivoCustom={setMotivoCustom} />
            <NotaField nota={nota} setNota={setNota} />

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} disabled={saving}
                className="flex-1 h-10 rounded-xl border border-hair text-sm font-medium text-muted hover:bg-cream transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving || !nuevoStockValido || !motivoFinal}
                className="flex-1 h-10 rounded-xl bg-ink text-cream text-sm font-semibold hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
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
                <div className="h-7 w-7 rounded-full border-2 border-hair border-t-terra animate-spin" />
              </div>
            ) : piezasAjuste.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">Sin piezas registradas</p>
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
                        dValido && resultadoValido ? 'border-terra/30 bg-terra/5' :
                        dValido && !resultadoValido ? 'border-red-200 bg-red-50' :
                        'border-hair bg-cream/50')}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-ink truncate">{pa.pieza.nombre}</p>
                        <p className="text-[10px] text-muted font-mono">{pa.pieza.codigo_universal}</p>
                      </div>
                      <div className="text-right shrink-0 w-12">
                        <p className="text-[10px] text-muted">actual</p>
                        <p className="text-sm font-serif text-ink">{pa.pieza.stock_actual}</p>
                      </div>
                      <div className="shrink-0 w-20">
                        <input
                          type="number"
                          value={pa.deltaStr}
                          onChange={e => setPiezasAjuste(prev => prev.map((x, i) => i === idx ? { ...x, deltaStr: e.target.value } : x))}
                          className="w-full h-8 px-2 rounded-lg border border-hair bg-white text-ink text-sm text-center font-semibold focus:outline-none focus:border-terra transition-all"
                          placeholder="±0"
                        />
                      </div>
                      <div className="shrink-0 w-10 text-right">
                        {dValido && resultadoValido && (
                          <span className={clsx('text-[12px] font-serif font-semibold',
                            d > 0 ? 'text-emerald-600' : 'text-red-500')}>
                            {resultado}
                          </span>
                        )}
                        {dValido && !resultadoValido && (
                          <span className="text-[10px] text-red-500">−</span>
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
                    className="flex-1 h-10 rounded-xl border border-hair text-sm font-medium text-muted hover:bg-cream transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button type="submit"
                    disabled={saving || piezasConCambio.length === 0 || !motivoPiezasFinal}
                    className="flex-1 h-10 rounded-xl bg-ink text-cream text-sm font-semibold hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
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

// ─── AjustesPage ─────────────────────────────────────────────────────────────

export function AjustesPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'bajo' | 'kits'>('todos')
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)

  const loadProductos = useCallback(async () => {
    try {
      const all: ProductoAPI[] = []
      let cursor: string | null = null
      let hasNext = true
      while (hasNext) {
        type PPage = { productos: { nodes: ProductoAPI[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }
        const data: PPage = await gql<PPage>(
          PRODUCTOS_QUERY,
          { first: 50, after: cursor, where: { activo: { eq: true } } },
        )
        const page: PPage['productos'] = data.productos
        all.push(...(page?.nodes ?? []))
        hasNext = page?.pageInfo?.hasNextPage ?? false
        cursor = page?.pageInfo?.endCursor ?? null
      }
      setProductos(all.map(backendToProductoSimple))
    } catch {
      notify.error('Error cargando productos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProductos() }, [loadProductos])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return productos.filter(p => {
      if (filtro === 'bajo' && p.stock > p.stock_minimo) return false
      if (filtro === 'kits' && !p.es_kit) return false
      if (!q) return true
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.codigo_universal.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q)
      )
    })
  }, [productos, search, filtro])

  const handleSuccess = (id: string, nuevoStock: number) => {
    if (nuevoStock >= 0) {
      setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: nuevoStock } : p))
    } else {
      // Per-piece adjustment changed kit stock — reload to get recalculated value
      loadProductos()
    }
  }

  const kpi = useMemo(() => ({
    total: productos.length,
    stockBajo: productos.filter(p => p.stock <= p.stock_minimo).length,
    kits: productos.filter(p => p.es_kit).length,
  }), [productos])

  return (
    <MainLayout>
      <div className="relative px-4 sm:px-8 md:px-14 py-5 md:py-9 pb-10 md:pb-20 min-h-screen"
           style={{ background: 'linear-gradient(180deg, #F4EFE6 0%, #FAF8F5 200px, #FAF8F5 100%)' }}>

        <AutopartsWatermark />

        <div className="relative z-[1]">

          {/* ── Breadcrumb ── */}
          <div className="flex items-center gap-1.5 text-[12.5px] text-muted tracking-[0.02em] mb-9">
            <span>Operaciones</span>
            <span className="opacity-50">/</span>
            <span>Inventario</span>
            <span className="opacity-50">/</span>
            <span className="text-ink">Ajustes</span>
          </div>

          {/* ── Header ── */}
          <div className="mb-7 md:mb-10">
            <h1 className="font-serif text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] m-0 mb-2.5 text-ink">
              Ajustes<em className="italic text-terra">.</em>
            </h1>
            <p className="text-base text-muted max-w-[480px]">
              Corrección manual de stock por conteo físico, mermas o importaciones. Cada ajuste queda registrado con motivo.
            </p>
          </div>

          {/* ── Metrics ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 mb-7 md:mb-11">
            <WarmMetric
              label="Total productos"
              value={kpi.total.toLocaleString('es-BO')}
              icon={<IcoBox />}
              sublabel="en catálogo"
            />
            <WarmMetric
              label="Stock crítico"
              value={kpi.stockBajo}
              icon={<IcoAlert />}
              tone={kpi.stockBajo > 0 ? 'crit' : undefined}
              sublabel="bajo mínimo"
            />
            <WarmMetric
              label="Kits"
              value={kpi.kits}
              icon={<IcoLayers />}
              sublabel="productos kit"
            />
          </div>

          {/* ── Table card ── */}
          <div className="rounded-[18px] border border-hair overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(2px)' }}>

            {/* Toolbar */}
            <div className="flex items-center gap-3.5 px-4 md:px-7 py-4 md:py-[22px] border-b border-hair flex-wrap">
              <div>
                <span className="font-serif text-[28px] leading-[1] tracking-[-0.01em] text-ink">Productos</span>
                <span className="text-base text-muted ml-2.5 font-normal">{filtered.length}</span>
              </div>
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <div className="h-10 flex items-center gap-2.5 px-3.5 border border-hair rounded-[10px] bg-cream min-w-0 sm:min-w-[260px] md:min-w-[300px] transition-colors focus-within:border-terra focus-within:bg-paper">
                  <IcoSearch />
                  <input
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-ink placeholder-muted-2"
                    placeholder="Buscar por nombre, código o marca…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  {(['todos', 'bajo', 'kits'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFiltro(f)}
                      className={clsx('px-3 h-10 rounded-[10px] text-xs font-medium border transition-all',
                        filtro === f ? 'bg-ink text-cream border-ink' : 'bg-cream text-muted border-hair hover:border-hair-2 hover:text-ink')}
                    >
                      {f === 'todos' ? 'Todos' : f === 'bajo' ? `Bajo mínimo${kpi.stockBajo > 0 ? ` (${kpi.stockBajo})` : ''}` : 'Kits'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 rounded-full border-2 border-hair border-t-terra animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-muted"><IcoBox /></div>
                <p className="text-muted text-sm mt-3">Sin productos</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hair" style={{ background: 'rgba(250,248,245,0.7)' }}>
                      <th className="text-left px-7 py-4 text-[11.5px] font-semibold text-muted uppercase tracking-[0.1em]">Producto</th>
                      <th className="text-left px-4 py-4 text-[11.5px] font-semibold text-muted uppercase tracking-[0.1em] hidden md:table-cell">Ubicación</th>
                      <th className="text-right px-4 py-4 text-[11.5px] font-semibold text-muted uppercase tracking-[0.1em]">Mín.</th>
                      <th className="text-right px-4 py-4 text-[11.5px] font-semibold text-muted uppercase tracking-[0.1em]">Stock</th>
                      <th className="w-28 px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hair/50">
                    {filtered.map(p => {
                      const bajo = p.stock <= p.stock_minimo
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-cream/60 transition-colors cursor-pointer group"
                          onClick={() => setSeleccionado(p)}
                        >
                          <td className="px-7 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={clsx('h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                                p.es_kit ? 'bg-terra/10 text-terra' : 'bg-cream-2 text-ink-2')}>
                                {p.es_kit ? <IcoKit /> : <IcoBox />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-ink truncate max-w-[220px]">{p.nombre}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] font-mono text-muted">{p.codigo_universal}</span>
                                  {p.marca && <span className="text-[11px] text-muted">· {p.marca}</span>}
                                  {p.es_kit && <span className="text-[10px] bg-terra/10 text-terra font-semibold px-1.5 py-0.5 rounded-full">Kit</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <p className="text-[12px] text-muted">
                              {[p.almacen, p.estante, p.fila, p.columna].filter(Boolean).join(' / ') || '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-sm text-muted tabular-nums">{p.stock_minimo}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={clsx('font-serif text-[22px] leading-none tabular-nums',
                              p.stock === 0 ? 'text-red-600' :
                              bajo ? 'text-amber-600' : 'text-ink')}>
                              {p.stock}
                            </span>
                            {bajo && (
                              <p className="text-[10px] text-amber-500 font-medium mt-0.5">bajo mínimo</p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={e => { e.stopPropagation(); setSeleccionado(p) }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cream text-muted hover:bg-ink hover:text-cream opacity-0 group-hover:opacity-100 transition-all border border-hair"
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
            )}
          </div>

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
