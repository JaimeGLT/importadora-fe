import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { notify } from '@/lib/notify'
import { useVentasStore } from '@/stores/ventasStore'
import { useInventarioStore } from '@/stores/inventarioStore'
import { TicketPreview } from '@/components/ui/TicketPreview'
import { useSoundAlert } from '@/hooks/useSoundAlert'
import { useVentasAlerts } from '@/hooks/useVentasAlerts'
import type { OrdenVenta, EstadoOrden } from '@/types'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { useVentasHub } from '@/hooks/useVentasHub'
import { ORDENES_PENDIENTES_QUERY, MIS_ORDENES_ALMACEN_QUERY, backendToOrdenVenta, type OrdenVentaAPI } from '@/lib/queries/ventas.queries'

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

type TabFiltro = 'todos' | 'pendiente_almacenero' | 'en_preparacion' | 'listo_para_escaneo'

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EstadoOrden, { label: string; bg: string; text: string; dot: string }> = {
  pendiente_almacenero: { label: 'Pendiente',       bg: 'bg-amber-50',   text: 'text-amber-700', dot: 'bg-amber-400' },
  en_preparacion:       { label: 'En preparación',  bg: 'bg-blue-50',    text: 'text-blue-700',  dot: 'bg-blue-400' },
  listo_para_escaneo:   { label: 'Para escanear',   bg: 'bg-indigo-50',  text: 'text-indigo-700', dot: 'bg-indigo-400' },
  completada:           { label: 'Completada',     bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  cancelada:            { label: 'Cancelada',       bg: 'bg-red-50',     text: 'text-red-500',   dot: 'bg-red-400' },
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
  const isLate = mins >= ALERT_MINS && orden.estado === 'pendiente_almacenero'
  const esMia = !!orden.almacenero_id && orden.almacenero_id.toLowerCase() === userId.toLowerCase()
  const tomadaPorOtro = !!orden.almacenero_id && !esMia
  const status = STATUS_CONFIG[orden.estado]

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border shadow-sm p-4 transition-all duration-300',
        isNew && 'ring-2 ring-brand-400 ring-offset-2 animate-pulse-once',
        isLate && orden.estado === 'pendiente_almacenero' ? 'border-red-200' : 'border-steel-100',
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-steel-900">{orden.numero}</span>
          <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold', status.bg, status.text)}>
            <span className={clsx('h-1.5 w-1.5 rounded-full', status.dot, orden.estado === 'pendiente_almacenero' && 'animate-pulse')} />
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

      <div className="flex items-center gap-3 text-xs text-steel-500 mb-1">
        <span className="font-medium text-steel-700">{orden.cajero_nombre}</span>
        <span>·</span>
        <span>{orden.items.length} prod.</span>
        <span>·</span>
        <span className="font-semibold text-steel-700">{fmtBs(orden.total)}</span>
      </div>

      {orden.nota && (
        <p className="mt-1.5 text-xs text-amber-600 italic bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
          📝 {orden.nota}
        </p>
      )}

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

      <div className="mt-3">
        {orden.estado === 'pendiente_almacenero' && (
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
        {orden.estado === 'listo_para_escaneo' && (
          <div className="flex items-center justify-center gap-2 py-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" />
            <p className="text-xs text-indigo-700 font-bold">Lista — esperando escaneo</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── FaltantesModal ─────────────────────────────────────────────────────────

function FaltantesModal({
  orden,
  open,
  onClose,
  onConfirm,
}: {
  orden: OrdenVenta
  open: boolean
  onClose: () => void
  onConfirm: (itemIds: string[]) => void
}) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [confirmando, setConfirmando] = useState(false)

  const handleToggle = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = async () => {
    if (seleccionados.size === 0) {
      notify.warning('Selecciona al menos un producto faltante')
      return
    }
    setConfirmando(true)
    await onConfirm([...seleccionados])
    setConfirmando(false)
    setSeleccionados(new Set())
  }

  const handleClose = () => {
    setSeleccionados(new Set())
    onClose()
  }

  const faltantesCount = orden.items.filter(i => i.estado === 'faltante').length
  const disponiblesCount = orden.items.filter(i => i.estado !== 'faltante').length

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Reportar faltantes — ${orden.numero}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={confirmando}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={confirmando}
            disabled={seleccionados.size === 0}
          >
            Reportar {seleccionados.size > 0 ? `(${seleccionados.size})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-steel-500">
          Marca los productos que no encontraste físicamente. El stock reservado será liberado y el cajero recibirá una notificación sonora.
        </p>

        {disponiblesCount > 0 && (
          <div>
            <p className="text-[10px] font-bold text-steel-400 uppercase tracking-wide mb-2">
              Productos disponibles ({disponiblesCount})
            </p>
            <div className="space-y-1.5">
              {orden.items.filter(i => i.estado !== 'faltante').map(item => (
                <div
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all',
                    seleccionados.has(item.id)
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-steel-100 hover:border-red-100'
                  )}
                >
                  <div className={clsx(
                    'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                    seleccionados.has(item.id)
                      ? 'bg-red-500 border-red-500'
                      : 'border-steel-200'
                  )}>
                    {seleccionados.has(item.id) && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-steel-800 truncate">{item.producto_nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-steel-400 bg-steel-50 px-1.5 py-0.5 rounded">{item.producto_codigo}</span>
                      {item.kit_id && <span className="text-[10px] text-indigo-500 font-medium">parte de kit</span>}
                      {(item.producto_almacen || item.producto_estante) && (
                        <span className="text-[11px] text-steel-400">
                          📦 {item.producto_almacen}{item.producto_estante ? ` / ${item.producto_estante}` : ''}
                          {item.producto_fila ? ` / ${item.producto_fila}` : ''}{item.producto_columna ? ` / ${item.producto_columna}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-steel-600 shrink-0">×{item.cantidad_pedida}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {faltantesCount > 0 && (
          <div>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-2">
              Ya reportados ({faltantesCount})
            </p>
            <div className="space-y-1">
              {orden.items.filter(i => i.estado === 'faltante').map(item => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100 opacity-60">
                  <svg className="h-4 w-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-700 truncate">{item.producto_nombre}</p>
                    <span className="text-[11px] font-mono text-red-400">{item.producto_codigo}</span>
                  </div>
                  <span className="text-xs text-red-400">faltante</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {orden.items.length === 0 && (
          <p className="text-sm text-steel-400 text-center py-4">No hay productos en esta orden</p>
        )}
      </div>
    </Modal>
  )
}

// ─── PickingView (en preparación) ──────────────────────────────────────────

function PickingView({
  orden,
  onMarcarListo,
  onVolver,
  onFaltantes,
}: {
  orden: OrdenVenta
  onMarcarListo: () => void
  onVolver: () => void
  onFaltantes: () => void
}) {
  const productos = useInventarioStore(s => s.productos)

  const getKitNombre = (kitId: string) => {
    const kit = productos.find(p => p.id === kitId)
    return kit?.nombre ?? 'Kit'
  }

  const gruposKit = useMemo(() => {
    const grupos: Record<string, typeof orden.items> = {}
    orden.items.forEach(item => {
      if (item.kit_id) {
        if (!grupos[item.kit_id]) grupos[item.kit_id] = []
        grupos[item.kit_id].push(item)
      }
    })
    return grupos
  }, [orden.items])

  const itemsSinKit = orden.items.filter(i => !i.kit_id)

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
            <p className="text-[11px] text-steel-400">{orden.items.length} producto{orden.items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-3 pt-2">
        <div className="space-y-3 pb-2">
          {/* Items que no son parte de kit */}
          {itemsSinKit.map(item => (
            <div key={item.id} className="rounded-xl border border-steel-100 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-steel-50 border border-steel-100 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-steel-800 leading-tight">{item.producto_nombre}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-steel-400 bg-steel-50 px-1.5 py-0.5 rounded">
                      {item.producto_codigo}
                    </span>
                    {(item.producto_almacen || item.producto_estante || item.producto_fila || item.producto_columna) && (
                      <span className="text-[11px] text-steel-400">
                        📦 {item.producto_almacen}{item.producto_estante ? ` / ${item.producto_estante}` : ''}{item.producto_fila ? ` / ${item.producto_fila}` : ''}{item.producto_columna ? ` / ${item.producto_columna}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-steel-800">×{item.cantidad_pedida}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Grupos de kits */}
          {Object.entries(gruposKit).map(([kitId, partes]) => {
            const kitNombre = getKitNombre(kitId)
            return (
              <div key={kitId} className="rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-indigo-100 border-b border-indigo-200">
                  <p className="text-xs font-bold text-indigo-700">
                    {kitNombre}
                  </p>
                  <p className="text-[10px] text-indigo-500 mt-0.5">Kit — {partes.length} pieza{partes.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="divide-y divide-indigo-100">
                  {partes.map(item => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="h-8 w-8 rounded-lg bg-white border border-indigo-200 flex items-center justify-center shrink-0">
                        <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-steel-700 leading-tight">{item.producto_nombre}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono text-steel-400 bg-steel-50 px-1.5 py-0.5 rounded">
                            {item.producto_codigo}
                          </span>
                          {(item.producto_almacen || item.producto_estante || item.producto_fila || item.producto_columna) && (
                            <span className="text-[11px] text-steel-400">
                              📦 {item.producto_almacen}{item.producto_estante ? ` / ${item.producto_estante}` : ''}{item.producto_fila ? ` / ${item.producto_fila}` : ''}{item.producto_columna ? ` / ${item.producto_columna}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-steel-800">×{item.cantidad_pedida}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-steel-100 bg-white px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-steel-600 font-medium">
            {orden.items.length} producto{orden.items.length !== 1 ? 's' : ''} por recoger
          </span>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onFaltantes}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-amber-600 hover:bg-amber-50 border border-amber-200 transition-all"
          >
            Reportar faltante
          </button>
          <button
            onClick={onMarcarListo}
            className="ml-auto px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 transition-all"
          >
            ✓ Marcar como lista
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function AlmacenPage() {
  const { user, isTokenReady } = useAuth()
  const { ordenes, updateOrden, setOrdenes } = useVentasStore()
  const { playBeep, playAlertSequence } = useSoundAlert()
  useVentasAlerts()

  const [tab, setTab] = useState<TabFiltro>('todos')
  const [pickingOrdenId, setPickingOrdenId] = useState<string | null>(null)
  const [ticketOrden, setTicketOrden] = useState<OrdenVenta | null>(null)
  const [faltantesOrden, setFaltantesOrden] = useState<OrdenVenta | null>(null)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const previousPendientesRef = useRef<Set<string>>(new Set())

  const loadOrdenes = useCallback(async () => {
    try {
      const [dataPendientes, dataMias] = await Promise.all([
        gql<{ ordenesPendientes: { nodes: OrdenVentaAPI[] } }>(ORDENES_PENDIENTES_QUERY),
        gql<{ misOrdenesAlmacen: { nodes: OrdenVentaAPI[] } }>(MIS_ORDENES_ALMACEN_QUERY),
      ])
      const pendientes = (dataPendientes.ordenesPendientes?.nodes ?? []).map(backendToOrdenVenta)
      const mias = (dataMias.misOrdenesAlmacen?.nodes ?? [])
        .map(backendToOrdenVenta)
        .filter(o => o.estado !== 'completada' && o.estado !== 'cancelada')
      const merged = [...mias]
      pendientes.forEach(p => {
        if (!merged.some(m => m.id === p.id)) merged.push(p)
      })
      setOrdenes(merged)
    } catch {
      notify.error('Error cargando órdenes')
    }
  }, [setOrdenes])

  useEffect(() => {
    if (!isTokenReady) return
    loadOrdenes()
    const poll = setInterval(loadOrdenes, 15_000)
    return () => clearInterval(poll)
  }, [isTokenReady, loadOrdenes])

  const { isConnected } = useVentasHub({
    onNuevaOrden: () => loadOrdenes(),
    onOrdenAceptada: () => loadOrdenes(),
    onOrdenLista: () => loadOrdenes(),
    onOrdenCompletada: (p) => {
      updateOrden(String(p.id), { estado: 'completada' })
      if (pickingOrdenId === String(p.id)) setPickingOrdenId(null)
    },
    onOrdenCancelada: (p) => {
      const oid = String(p.id)
      updateOrden(oid, { estado: 'cancelada' })
      if (pickingOrdenId === oid) {
        setPickingOrdenId(null)
        notify.warning('La orden fue cancelada')
      }
    },
  }, isTokenReady, ['Almaceneros'])

  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const pendientes = ordenes.filter(o => o.estado === 'pendiente_almacenero')
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
    () => ordenes.filter(o => o.estado !== 'completada' && o.estado !== 'cancelada'),
    [ordenes]
  )

  const filteredOrdenes = useMemo(() => {
    if (tab === 'todos') return activeOrdenes
    return activeOrdenes.filter(o => o.estado === tab)
  }, [activeOrdenes, tab])

  const counts = useMemo(() => ({
    todos:                 activeOrdenes.length,
    pendiente_almacenero:  activeOrdenes.filter(o => o.estado === 'pendiente_almacenero').length,
    en_preparacion:       activeOrdenes.filter(o => o.estado === 'en_preparacion').length,
    listo_para_escaneo:    activeOrdenes.filter(o => o.estado === 'listo_para_escaneo').length,
  }), [activeOrdenes])

  const handleTomar = async (orden: OrdenVenta) => {
    try {
      if (orden.estado === 'pendiente_almacenero') {
        await api.post(`/OrdenVenta/${orden.id}/Aceptar`, null)
        await loadOrdenes()
        playBeep({ frequency: 1000, duration: 80 })
        notify.success(`Orden ${orden.numero} tomada`)
      }
      setPickingOrdenId(orden.id)
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al tomar orden')
    }
  }

  const handleMarcarListo = async () => {
    if (!pickingOrdenId) return
    const ordenActual = ordenes.find(o => o.id === pickingOrdenId)
    if (!ordenActual) return
    try {
      await api.post(`/OrdenVenta/${pickingOrdenId}/Lista`, null)
      await loadOrdenes()
      playAlertSequence()
      setPickingOrdenId(null)
      setTicketOrden({ ...ordenActual, estado: 'listo_para_escaneo', listo_en: new Date().toISOString() })
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al marcar como lista')
    }
  }

  const handleFaltantesConfirm = async (itemIds: string[]) => {
    if (!faltantesOrden) return
    const nonFaltanteCount = faltantesOrden.items.filter(i => i.estado !== 'faltante').length
    const todosReportados = itemIds.length >= nonFaltanteCount
    try {
      for (const itemId of itemIds) {
        await api.post(`/OrdenVenta/${faltantesOrden.id}/Items/${itemId}/Incompleto`, {})
      }
      if (todosReportados) {
        await api.post(`/OrdenVenta/${faltantesOrden.id}/Lista`, null)
        await loadOrdenes()
        setFaltantesOrden(null)
        setPickingOrdenId(null)
        notify.warning('Todos los productos son faltantes — orden enviada al cajero')
      } else {
        await loadOrdenes()
        setFaltantesOrden(null)
        notify.warning(`${itemIds.length} producto(s) reportado(s) como faltante(s)`)
      }
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al reportar faltantes')
    }
  }

  const handleTicketClose = () => {
    setTicketOrden(null)
  }

  const pickingOrden = pickingOrdenId ? ordenes.find(o => o.id === pickingOrdenId) : null

  const TABS: { key: TabFiltro; label: string }[] = [
    { key: 'todos',                 label: 'Todos' },
    { key: 'pendiente_almacenero',  label: 'Pendiente' },
    { key: 'en_preparacion',        label: 'En preparación' },
    { key: 'listo_para_escaneo',   label: 'Para escanear' },
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
              onFaltantes={() => setFaltantesOrden(pickingOrden)}
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
                  <div className={clsx('h-2 w-2 rounded-full', isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} />
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

      {faltantesOrden && (
        <FaltantesModal
          orden={faltantesOrden}
          open={!!faltantesOrden}
          onClose={() => setFaltantesOrden(null)}
          onConfirm={handleFaltantesConfirm}
        />
      )}

      {ticketOrden && (
        <TicketPreview orden={ticketOrden} open onClose={handleTicketClose} />
      )}
    </MainLayout>
  )
}