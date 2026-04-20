import { useState, useMemo, useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import { notify } from '@/lib/notify'
import { useVentasStore } from '@/stores/ventasStore'
import { TicketPreview } from '@/components/ui/TicketPreview'
import { useSoundAlert } from '@/hooks/useSoundAlert'
import type { OrdenVenta, EstadoOrden, EstadoItemOrden } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtTimeSince = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'ahora'
  if (mins === 1) return '1 min'
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

const ALERT_MINS = 10

type TabFiltro = 'todos' | 'pendiente' | 'en_preparacion' | 'listo'

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EstadoOrden, { label: string; bg: string; text: string; dot: string }> = {
  pendiente:      { label: 'Disponible',  bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-400' },
  en_preparacion: { label: 'En proceso', bg: 'bg-blue-50',   text: 'text-blue-700', dot: 'bg-blue-400' },
  listo:          { label: 'Para entregar', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  pagado:         { label: 'Cobrado',     bg: 'bg-steel-50',  text: 'text-steel-500', dot: 'bg-steel-400' },
  cancelado:      { label: 'Cancelada',   bg: 'bg-red-50',    text: 'text-red-500',  dot: 'bg-red-400' },
}

// ─── OrderCard (lista) ───────────────────────────────────────────────────────

function OrderCard({
  orden,
  userId,
  onTomar,
  isNew,
}: {
  orden: OrdenVenta
  userId: string
  onTomar: (o: OrdenVenta) => void
  isNew?: boolean
}) {
  const mins = Math.floor((Date.now() - new Date(orden.creado_en).getTime()) / 60_000)
  const isLate = mins >= ALERT_MINS && orden.estado === 'pendiente'
  const esMia = orden.almacenero_id === userId
  const tomadaPorOtro = !!orden.almacenero_id && !esMia
  const status = STATUS_CONFIG[orden.estado]

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border shadow-sm p-4 transition-all duration-300',
        isNew && 'ring-2 ring-brand-400 ring-offset-2 animate-pulse-once',
        isLate && orden.estado === 'pendiente' ? 'border-red-200' : 'border-steel-100',
      )}
    >
      {/* Top row: number + status badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-steel-900">{orden.numero}</span>
          <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold', status.bg, status.text)}>
            <span className={clsx('h-1.5 w-1.5 rounded-full', status.dot, orden.estado === 'pendiente' && 'animate-pulse')} />
            {status.label}
          </span>
          {isLate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Urgente
            </span>
          )}
        </div>
        <span className={clsx('text-xs font-medium tabular-nums', isLate ? 'text-red-500' : 'text-steel-400')}>
          {fmtTimeSince(orden.creado_en)}
        </span>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 text-xs text-steel-500 mb-1">
        <span className="font-medium text-steel-700">{orden.cajero_nombre}</span>
        <span>·</span>
        <span>{orden.items.length} prod.</span>
        <span>·</span>
        <span className="font-semibold text-steel-700">{fmtBs(orden.total)}</span>
      </div>

      {/* Nota */}
      {orden.nota && (
        <p className="mt-1.5 text-xs text-amber-600 italic bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
          📝 {orden.nota}
        </p>
      )}

      {/* Tomada por otro - prominently shown */}
      {tomadaPorOtro && orden.estado === 'en_preparacion' && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-steel-50 border border-steel-100">
          <div className="h-8 w-8 rounded-full bg-steel-200 flex items-center justify-center text-xs font-bold text-steel-600">
            {(orden.almacenero_nombre ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-steel-600">{orden.almacenero_nombre ?? 'Desconocido'}</p>
            <p className="text-[10px] text-steel-400">está preparando esta orden</p>
          </div>
          <svg className="h-4 w-4 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3">
        {orden.estado === 'pendiente' && (
          <button
            onClick={() => onTomar(orden)}
            className="w-full py-2.5 rounded-xl bg-steel-900 text-white text-xs font-bold hover:bg-steel-800 active:bg-steel-950 transition-all flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Tomar orden
          </button>
        )}
        {orden.estado === 'en_preparacion' && esMia && (
          <button
            onClick={() => onTomar(orden)}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:bg-blue-800 transition-all flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Continuar preparación
          </button>
        )}
        {orden.estado === 'listo' && (
          <div className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" />
            <p className="text-xs text-emerald-700 font-bold">Lista — esperando al cajero</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PickingView (en preparación) ──────────────────────────────────────────────

function PickingView({
  orden,
  onMarcarListo,
  onVolver,
}: {
  orden: OrdenVenta
  onMarcarListo: (items: OrdenVenta['items']) => void
  onVolver: () => void
}) {
  const [itemStates, setItemStates] = useState<OrdenVenta['items']>(
    orden.items.map(i => ({ ...i }))
  )
  const [scanInput, setScanInput] = useState('')
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [cantidadInput, setCantidadInput] = useState('')
  const scanRef = useRef<HTMLInputElement>(null)

  const procesadosCount = itemStates.filter(i => i.estado !== 'pendiente').length
  const todosProcesados = procesadosCount === itemStates.length
  const completosCount = itemStates.filter(i => i.estado === 'completo').length
  const faltantesCount = itemStates.filter(i => i.estado === 'faltante').length

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault()
    const codigo = scanInput.trim().toUpperCase()
    if (!codigo) return

    const match = itemStates.find(
      i => i.producto_codigo.toUpperCase() === codigo && i.estado === 'pendiente'
    )

    if (!match) {
      const yaProcessado = itemStates.find(i => i.producto_codigo.toUpperCase() === codigo)
      if (yaProcessado) {
        notify.error(`${codigo} ya fue procesado`)
      } else {
        notify.error('Código no pertenece a esta orden')
      }
      setScanInput('')
      return
    }

    setActiveItemId(match.id)
    setCantidadInput(String(match.cantidad_pedida))
    setScanInput('')
  }

  const handleConfirmarCantidad = (itemId: string) => {
    const item = itemStates.find(i => i.id === itemId)
    if (!item) return

    const qty = parseInt(cantidadInput, 10)
    if (isNaN(qty) || qty < 0) {
      notify.error('Cantidad inválida')
      return
    }

    if (qty > item.cantidad_pedida) {
      notify.error(`Máximo ${item.cantidad_pedida} — no puedes despachar más de lo pedido`)
      return
    }

    let nuevoEstado: EstadoItemOrden
    if (qty === item.cantidad_pedida) nuevoEstado = 'completo'
    else if (qty > 0) nuevoEstado = 'parcial'
    else nuevoEstado = 'faltante'

    setItemStates(prev =>
      prev.map(i => i.id === itemId ? { ...i, cantidad_recogida: qty, estado: nuevoEstado } : i)
    )
    setActiveItemId(null)
    setCantidadInput('')
    scanRef.current?.focus()
  }

  const handleFaltante = (itemId: string) => {
    setItemStates(prev =>
      prev.map(i => i.id === itemId ? { ...i, estado: 'faltante' as EstadoItemOrden, cantidad_recogida: 0 } : i)
    )
    setActiveItemId(null)
    setCantidadInput('')
    notify.warning('Item marcado como faltante')
    scanRef.current?.focus()
  }

  const ITEM_CONFIG: Record<EstadoItemOrden, { icon: string; bg: string; border: string; text: string }> = {
    pendiente: { icon: '◻️', bg: 'bg-white', border: 'border-steel-100', text: 'text-steel-400' },
    completo: { icon: '✓', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    parcial: { icon: '◑', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    faltante: { icon: '✕', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-steel-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onVolver}
            className="p-1.5 rounded-lg text-steel-400 hover:text-steel-600 hover:bg-steel-100 transition-colors shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-steel-900">{orden.numero}</h2>
              <span className="text-xs text-steel-400 shrink-0">Cajero: {orden.cajero_nombre}</span>
            </div>
            <p className="text-[11px] text-steel-400">
              {completosCount} completos · {faltantesCount} faltantes
            </p>
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <form onSubmit={handleScan} className="flex items-center gap-1.5">
              <input
                ref={scanRef}
                type="text"
                value={scanInput}
                onChange={e => setScanInput(e.target.value.toUpperCase())}
                placeholder="Escanear..."
                autoFocus
                className="w-32 px-3 py-2 text-sm bg-steel-50 border border-steel-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-steel-400 font-mono uppercase"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-steel-900 text-white text-xs font-bold hover:bg-steel-800 active:bg-steel-950 transition-all"
              >
                ✓
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-3 pt-2">
        <div className="space-y-1.5 pb-2">
          {itemStates.map(item => {
            const cfg = ITEM_CONFIG[item.estado]
            const isActive = activeItemId === item.id

            return (
              <div
                key={item.id}
                className={clsx(
                  'rounded-xl border-2 p-4 transition-all',
                  cfg.bg,
                  cfg.border,
                  isActive && 'ring-2 ring-brand-500'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={clsx('h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold border', cfg.border, cfg.text)}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-steel-800 leading-tight">{item.producto_nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-steel-400 bg-steel-50 px-1.5 py-0.5 rounded">
                        {item.producto_codigo}
                      </span>
                      {item.producto_ubicacion && (
                        <span className="text-[11px] text-steel-400">📦 {item.producto_ubicacion}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-steel-800">×{item.cantidad_pedida}</p>
                    {item.estado === 'parcial' && item.cantidad_recogida != null && (
                      <p className="text-[11px] text-amber-600 font-semibold">recogido: ×{item.cantidad_recogida}</p>
                    )}
                  </div>
                </div>

                {isActive && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={item.cantidad_pedida}
                      value={cantidadInput}
                      onChange={e => setCantidadInput(e.target.value)}
                      autoFocus
                      className="w-20 px-3 py-2 text-sm text-center border-2 border-brand-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                      onKeyDown={e => { if (e.key === 'Enter') handleConfirmarCantidad(item.id) }}
                    />
                    <span className="text-xs text-steel-400">/ {item.cantidad_pedida}</span>
                    <button
                      onClick={() => handleConfirmarCantidad(item.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:bg-emerald-800 transition-all"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleFaltante(item.id)}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 active:bg-red-200 transition-all border border-red-200"
                    >
                      No encontrado
                    </button>
                    <button
                      onClick={() => { setActiveItemId(null); scanRef.current?.focus() }}
                      className="p-1.5 text-steel-400 hover:text-steel-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {!isActive && item.estado === 'pendiente' && (
                  <button
                    onClick={() => { setActiveItemId(item.id); setCantidadInput(String(item.cantidad_pedida)) }}
                    className="mt-2 text-[11px] text-brand-600 hover:text-brand-800 font-semibold"
                  >
                    + Ingresar manualmente
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-steel-100 bg-white px-4 py-3 shrink-0 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={clsx('h-2 w-2 rounded-full', todosProcesados ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse')} />
          <span className="text-xs text-steel-600 font-medium">
            {procesadosCount}/{itemStates.length} procesados
          </span>
        </div>
        <button
          onClick={() => onMarcarListo(itemStates)}
          disabled={!todosProcesados}
          className={clsx(
            'ml-auto px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
            todosProcesados
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
              : 'bg-steel-100 text-steel-400 cursor-not-allowed'
          )}
        >
          {todosProcesados ? '✓ Marcar como lista' : 'Completa todos los items'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AlmacenPage() {
  const { user } = useAuth()
  const { ordenes, updateOrden } = useVentasStore()
  const { playBeep, playAlertSequence } = useSoundAlert()

  const [tab, setTab] = useState<TabFiltro>('todos')
  const [pickingOrdenId, setPickingOrdenId] = useState<string | null>(null)
  const [ticketOrden, setTicketOrden] = useState<OrdenVenta | null>(null)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const previousPendientesRef = useRef<Set<string>>(new Set())

  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const pendientes = ordenes.filter(o => o.estado === 'pendiente')
    const currentPendientes = new Set(pendientes.map(o => o.id))

    const newOnes = [...currentPendientes].filter(id => !previousPendientesRef.current.has(id))
    if (newOnes.length > 0) {
      playBeep({ frequency: 1200, duration: 100 })
      setTimeout(() => playBeep({ frequency: 1400, duration: 150 }), 120)
      setNewOrderIds(prev => new Set([...prev, ...newOnes]))
      setTimeout(() => {
        setNewOrderIds(prev => {
          const next = new Set(prev)
          newOnes.forEach(id => next.delete(id))
          return next
        })
      }, 3000)
    }

    previousPendientesRef.current = currentPendientes
  }, [ordenes, playBeep])

  const activeOrdenes = useMemo(
    () => ordenes.filter(o => o.estado !== 'pagado' && o.estado !== 'cancelado'),
    [ordenes]
  )

  const filteredOrdenes = useMemo(() => {
    if (tab === 'todos') return activeOrdenes
    return activeOrdenes.filter(o => o.estado === tab)
  }, [activeOrdenes, tab])

  const counts = useMemo(() => ({
    todos:          activeOrdenes.length,
    pendiente:      activeOrdenes.filter(o => o.estado === 'pendiente').length,
    en_preparacion: activeOrdenes.filter(o => o.estado === 'en_preparacion').length,
    listo:          activeOrdenes.filter(o => o.estado === 'listo').length,
  }), [activeOrdenes])

  const handleTomar = (orden: OrdenVenta) => {
    const almaceneroId = user?.id ?? 'demo-almacenero'
    const almaceneroNombre = user?.nombre ?? 'Almacenero'
    const now = new Date().toISOString()
    updateOrden(orden.id, {
      almacenero_id: almaceneroId,
      almacenero_nombre: almaceneroNombre,
      estado: 'en_preparacion' as EstadoOrden,
      aceptado_en: now,
    })
    setPickingOrdenId(orden.id)
    playBeep({ frequency: 1000, duration: 80 })
    notify.success(`Orden ${orden.numero} tomada`)
  }

  const handleMarcarListo = (items: OrdenVenta['items']) => {
    if (!pickingOrdenId) return
    const now = new Date().toISOString()
    const ordenActual = ordenes.find(o => o.id === pickingOrdenId)
    if (!ordenActual) return

    const ordenConItems: OrdenVenta = {
      ...ordenActual,
      items,
      estado: 'listo' as EstadoOrden,
      listo_en: now,
    }

    updateOrden(pickingOrdenId, {
      items,
      estado: 'listo' as EstadoOrden,
      listo_en: now,
    })

    playAlertSequence()
    setPickingOrdenId(null)
    setTicketOrden(ordenConItems)
  }

  const handleTicketClose = () => {
    setTicketOrden(null)
  }

  const pickingOrden = pickingOrdenId ? ordenes.find(o => o.id === pickingOrdenId) : null

  const TABS: { key: TabFiltro; label: string }[] = [
    { key: 'todos',          label: 'Todos' },
    { key: 'pendiente',      label: 'Pendiente' },
    { key: 'en_preparacion', label: 'En preparación' },
    { key: 'listo',          label: 'Listo' },
  ]

  return (
    <MainLayout>
      <div className="flex flex-col h-screen overflow-hidden bg-steel-50">
        {pickingOrden ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <PickingView
              orden={pickingOrden}
              onMarcarListo={handleMarcarListo}
              onVolver={() => setPickingOrdenId(null)}
            />
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-steel-100 px-6 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-base font-bold text-steel-900">Almacén</h1>
                  <p className="text-xs text-steel-400">Órdenes de picking</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-steel-500">{user?.nombre}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border-b border-steel-100 px-4 shrink-0">
              <div className="flex gap-1">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={clsx(
                      'px-3 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-px',
                      tab === t.key
                        ? 'text-brand-600 border-brand-600'
                        : 'text-steel-400 border-transparent hover:text-steel-600',
                    )}
                  >
                    {t.label}
                    {counts[t.key] > 0 && (
                      <span className={clsx(
                        'ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-black',
                        tab === t.key ? 'bg-brand-100 text-brand-700' : 'bg-steel-100 text-steel-500',
                      )}>
                        {counts[t.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredOrdenes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <svg className="h-12 w-12 text-steel-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-sm font-semibold text-steel-500">Sin órdenes</p>
                  <p className="text-xs text-steel-400 mt-1">
                    {tab === 'todos' ? 'No hay órdenes activas' : `No hay órdenes en estado "${tab}"`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl mx-auto">
                  {filteredOrdenes.map(o => (
                    <OrderCard
                      key={o.id}
                      orden={o}
                      userId={user?.id ?? 'demo-almacenero'}
                      onTomar={handleTomar}
                      isNew={newOrderIds.has(o.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {ticketOrden && (
        <TicketPreview orden={ticketOrden} open onClose={handleTicketClose} />
      )}
    </MainLayout>
  )
}