import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { notify } from '@/lib/notify'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { PRODUCTOS_QUERY, PRODUCTO_BY_ID_QUERY, backendToProductoSimple, backendToProducto, type ProductoAPI } from '@/lib/queries/inventario.queries'
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
      <label className="block text-xs font-semibold text-on-surface mb-1.5">Motivo *</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {MOTIVOS.map(m => (
          <button key={m} type="button" onClick={() => setMotivo(m)}
            className={clsx('px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all',
              motivo === m
                ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                : 'bg-white text-on-surface-variant border-outline-variant hover:border-on-surface-variant')}>
            {m}
          </button>
        ))}
      </div>
      {motivo === 'Otro' && (
        <input type="text" value={motivoCustom} onChange={e => setMotivoCustom(e.target.value)}
          maxLength={200} placeholder="Describe el motivo…" required
          className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-white text-on-surface text-sm focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 transition-all" />
      )}
    </div>
  )
}

function NotaField({ nota, setNota }: { nota: string; setNota: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-on-surface mb-1.5">
        Nota <span className="font-normal text-on-surface-variant">(opcional)</span>
      </label>
      <textarea value={nota} onChange={e => setNota(e.target.value)} maxLength={500} rows={2}
        placeholder="Detalles adicionales…"
        className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface text-sm resize-none focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 transition-all" />
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-outline-variant">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-outline-variant">
          <div className="flex items-start gap-3">
            <div className={clsx('h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
              producto.es_kit ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-surface-container-low text-on-surface-variant')}>
              <span className="material-symbols-outlined text-[20px]">
                {producto.es_kit ? 'layers' : 'inventory_2'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate">{producto.nombre}</p>
              <p className="text-[11px] text-on-surface-variant font-mono">{producto.codigo_universal}</p>
            </div>
            <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Tabs — only for kits */}
          {producto.es_kit && (
            <div className="flex gap-1 mt-4 p-1 bg-surface-container-low rounded-xl">
              <button
                onClick={() => setTab('kit')}
                className={clsx('flex-1 h-8 rounded-lg text-[12px] font-semibold transition-all',
                  tab === 'kit' ? 'bg-white text-on-surface shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-on-surface')}
              >
                Kit completo
              </button>
              <button
                onClick={() => setTab('piezas')}
                className={clsx('flex-1 h-8 rounded-lg text-[12px] font-semibold transition-all',
                  tab === 'piezas' ? 'bg-white text-on-surface shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-on-surface')}
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
              <div className="flex-1 bg-surface-container-low rounded-xl px-4 py-3 text-center border border-outline-variant">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Actual</p>
                <p className="text-[28px] font-mono text-on-surface leading-none">{producto.stock}</p>
                {producto.es_kit && <p className="text-[10px] text-[#3B82F6] mt-1">kits</p>}
              </div>
              <div className="text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </div>
              <div className={clsx('flex-1 rounded-xl px-4 py-3 text-center border-2 transition-all',
                !deltaValido || !nuevoStockValido ? 'bg-surface-container-low border-outline-variant' :
                delta > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Resultado</p>
                <p className={clsx('text-[28px] font-mono leading-none',
                  !deltaValido || !nuevoStockValido ? 'text-on-surface-variant' :
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
              <label className="block text-xs font-semibold text-on-surface mb-1.5">
                Ajuste <span className="font-normal text-on-surface-variant">(usa − para restar, p.ej. −3 o +5)</span>
              </label>
              <input
                ref={inputRef}
                type="number"
                value={deltaStr}
                onChange={e => setDeltaStr(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-white text-on-surface text-lg text-center font-semibold focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 transition-all"
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
                className="flex-1 h-10 rounded-xl border border-outline-variant text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving || !nuevoStockValido || !motivoFinal}
                className="flex-1 h-10 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
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
                <div className="h-7 w-7 rounded-full border-2 border-outline-variant border-t-[#3B82F6] animate-spin" />
              </div>
            ) : piezasAjuste.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">Sin piezas registradas</p>
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
                        dValido && resultadoValido ? 'border-[#3B82F6]/30 bg-[#3B82F6]/5' :
                        dValido && !resultadoValido ? 'border-red-200 bg-red-50' :
                        'border-outline-variant bg-surface-container-low/50')}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-on-surface truncate">{pa.pieza.nombre}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono">{pa.pieza.codigo_universal}</p>
                      </div>
                      <div className="text-right shrink-0 w-12">
                        <p className="text-[10px] text-on-surface-variant">actual</p>
                        <p className="text-sm font-mono text-on-surface">{pa.pieza.stock_actual}</p>
                      </div>
                      <div className="shrink-0 w-20">
                        <input
                          type="number"
                          value={pa.deltaStr}
                          onChange={e => setPiezasAjuste(prev => prev.map((x, i) => i === idx ? { ...x, deltaStr: e.target.value } : x))}
                          className="w-full h-8 px-2 rounded-lg border border-outline-variant bg-white text-on-surface text-sm text-center font-semibold focus:outline-none focus:border-[#3B82F6] transition-all"
                          placeholder="±0"
                        />
                      </div>
                      <div className="shrink-0 w-10 text-right">
                        {dValido && resultadoValido && (
                          <span className={clsx('text-[12px] font-mono font-semibold',
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
                    className="flex-1 h-10 rounded-xl border border-outline-variant text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button type="submit"
                    disabled={saving || piezasConCambio.length === 0 || !motivoPiezasFinal}
                    className="flex-1 h-10 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
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
      <div className="bg-[#f9f9ff] min-h-screen font-hanken">

        {/* ── Topbar ── */}
        <header className="bg-[#f9f9ff] sticky top-0 z-40 flex items-center w-full h-16 px-6 border-b border-outline-variant">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>Operaciones</span>
            <span className="text-[10px] opacity-40">/</span>
            <span>Inventario</span>
            <span className="text-[10px] opacity-40">/</span>
            <span className="text-primary font-bold">Ajustes</span>
          </div>
        </header>

        <div className="px-6 py-6 max-w-[1400px] mx-auto">

          {/* ── Page Header ── */}
          <div className="mb-8">
            <h2 className="text-headline-lg text-on-surface mb-1">Ajustes.</h2>
            <p className="text-sm text-on-surface-variant/80">
              Corrección manual de stock por conteo físico, mermas o importaciones. Cada ajuste queda registrado con motivo.
            </p>
          </div>

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">

            {/* Total productos */}
            <div className="bg-white border border-outline-variant border-l-[4px] border-l-[#3B82F6] p-card-padding flex flex-col justify-between h-32 rounded-xl">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-[#3B82F6] uppercase tracking-widest">Total productos</span>
                <div className="p-1.5 bg-[#3B82F6] rounded">
                  <span className="material-symbols-outlined text-[18px] text-white">inventory_2</span>
                </div>
              </div>
              <div>
                <div className="font-mono text-[28px] text-on-surface leading-none mb-1">
                  {kpi.total.toLocaleString('es-BO')}
                </div>
                <div className="text-[11px] text-on-surface-variant/70">en catálogo</div>
              </div>
            </div>

            {/* Stock crítico */}
            <div className={clsx(
              'border border-l-[4px] p-card-padding flex flex-col justify-between h-32 rounded-xl',
              kpi.stockBajo > 0
                ? 'bg-[#EF4444]/5 border-[#EF4444]/30 border-l-[#EF4444]'
                : 'bg-white border-outline-variant border-l-[#3B82F6]'
            )}>
              <div className="flex justify-between items-start">
                <span className={clsx('text-[11px] font-bold uppercase tracking-widest',
                  kpi.stockBajo > 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]')}>
                  Stock crítico
                </span>
                <div className={clsx('p-1.5 rounded', kpi.stockBajo > 0 ? 'bg-[#EF4444]' : 'bg-[#3B82F6]')}>
                  <span className="material-symbols-outlined text-[18px] text-white">warning</span>
                </div>
              </div>
              <div>
                <div className={clsx('font-mono text-[28px] leading-none mb-1',
                  kpi.stockBajo > 0 ? 'text-[#EF4444]' : 'text-on-surface')}>
                  {kpi.stockBajo}
                </div>
                <div className={clsx('text-[11px] font-medium',
                  kpi.stockBajo > 0 ? 'text-[#EF4444]' : 'text-on-surface-variant/70')}>
                  {kpi.stockBajo > 0 ? 'requiere atención' : 'bajo mínimo'}
                </div>
              </div>
            </div>

            {/* Kits */}
            <div className="bg-white border border-outline-variant border-l-[4px] border-l-[#047857] p-card-padding flex flex-col justify-between h-32 rounded-xl">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-[#047857] uppercase tracking-widest">Kits</span>
                <div className="p-1.5 bg-[#047857] rounded">
                  <span className="material-symbols-outlined text-[18px] text-white">layers</span>
                </div>
              </div>
              <div>
                <div className="font-mono text-[28px] text-on-surface leading-none mb-1">
                  {kpi.kits.toLocaleString('es-BO')}
                </div>
                <div className="text-[11px] text-on-surface-variant/70">productos kit</div>
              </div>
            </div>

          </div>

          {/* ── Table Container ── */}
          <div className="bg-white border border-outline-variant overflow-hidden relative rounded-xl">

            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-outline-variant flex flex-wrap justify-between items-center gap-4 bg-white">
              <h3 className="text-headline-sm text-on-surface">
                Productos
                <span className="text-sm font-normal text-on-surface-variant/50 ml-2">
                  {filtered.length} resultados
                </span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[20px]">
                    search
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded bg-surface-container-lowest text-sm focus:ring-0 focus:border-[#3B82F6] outline-none transition-all text-on-surface placeholder:text-on-surface-variant/40"
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
                      className={clsx('px-3 h-9 rounded text-xs font-medium border transition-all',
                        filtro === f
                          ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                          : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container')}
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
                <div className="h-8 w-8 rounded-full border-2 border-outline-variant border-t-[#3B82F6] animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
                <div className="w-12 h-12 rounded bg-surface-container-low border border-outline-variant flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-on-surface-variant/30 text-2xl">inventory_2</span>
                </div>
                <p className="text-sm font-semibold text-on-surface mb-1">Sin productos</p>
                <p className="text-xs text-on-surface-variant/60 max-w-xs">
                  No hay productos que coincidan con la búsqueda o filtro seleccionado.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container-low/50">
                    <tr className="border-b border-outline-variant">
                      <th className="text-left px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Producto</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider hidden md:table-cell">Ubicación</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Mín.</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Stock</th>
                      <th className="w-28 px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filtered.map((p, idx) => {
                      const bajo = p.stock <= p.stock_minimo
                      return (
                        <tr
                          key={p.id}
                          className={clsx(
                            'transition-colors cursor-pointer hover:bg-surface-container-lowest',
                            idx % 2 !== 0 && 'bg-surface-container-low/20',
                          )}
                          onClick={() => setSeleccionado(p)}
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={clsx('h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                                p.es_kit ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-surface-container-low text-on-surface-variant')}>
                                <span className="material-symbols-outlined text-[16px]">
                                  {p.es_kit ? 'layers' : 'inventory_2'}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-on-surface truncate max-w-[220px]">{p.nombre}</p>
                                <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
                                  <span className="text-[11px] font-mono text-on-surface-variant">{p.codigo_universal}</span>
                                  {p.codigos_alternativos?.filter(Boolean).map((c, i) => (
                                    <span key={i} className="text-[11px] font-mono text-on-surface-variant/50">{c}</span>
                                  ))}
                                  {p.marca && <span className="text-[11px] text-on-surface-variant">· {p.marca}</span>}
                                  {p.es_kit && (
                                    <span className="text-[9px] bg-[#3B82F6]/10 text-[#3B82F6] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Kit</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <p className="text-[12px] text-on-surface-variant">
                              {[p.almacen, p.estante, p.fila, p.columna].filter(Boolean).join(' / ') || '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-sm text-on-surface-variant tabular-nums">{p.stock_minimo}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={clsx('font-mono text-[22px] leading-none tabular-nums',
                              p.stock === 0 ? 'text-[#EF4444]' :
                              bajo ? 'text-amber-600' : 'text-on-surface')}>
                              {p.stock}
                            </span>
                            {bajo && (
                              <p className="text-[10px] text-amber-500 font-medium mt-0.5">bajo mínimo</p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={e => { e.stopPropagation(); setSeleccionado(p) }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors"
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
