import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useVentasStore } from '@/stores/ventasStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button, Badge } from '@/components/ui'
import { MOCK_ORDENES, MOCK_CONFIG_VENTAS } from '@/mock/ventas'
import type { OrdenVenta } from '@/types'

// ─── OrderTimer ───────────────────────────────────────────────────────────────

function OrderTimer({ creado_en, alertMinutes, isPendiente }: { creado_en: string; alertMinutes: number; isPendiente: boolean }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(creado_en).getTime()) / 1000),
  )
  useEffect(() => {
    const id = setInterval(() =>
      setElapsed(Math.floor((Date.now() - new Date(creado_en).getTime()) / 1000)), 1000)
    return () => clearInterval(id)
  }, [creado_en])

  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  const isAlert = isPendiente && m >= alertMinutes

  return (
    <span className={clsx('inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums',
      isAlert ? 'text-red-600' : 'text-steel-400')}>
      {isAlert && (
        <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      {m}:{s.toString().padStart(2, '0')}
    </span>
  )
}

// ─── FaltanteInlineForm ───────────────────────────────────────────────────────

interface FaltanteFormProps {
  onConfirm: (nota: string) => void
  onCancel: () => void
}

function FaltanteInlineForm({ onConfirm, onCancel }: FaltanteFormProps) {
  const [nota, setNota] = useState('')

  return (
    <div className="mt-2 flex items-center gap-2 pl-8">
      <input
        type="text"
        value={nota}
        onChange={e => setNota(e.target.value)}
        placeholder="Motivo del faltante (opcional)"
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') onConfirm(nota); if (e.key === 'Escape') onCancel() }}
        className="flex-1 px-2.5 py-1.5 text-xs border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-yellow-50"
      />
      <button onClick={() => onConfirm(nota)}
        className="px-2.5 py-1.5 text-xs font-medium bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
        Confirmar
      </button>
      <button onClick={onCancel}
        className="px-2 py-1.5 text-xs text-steel-500 hover:text-steel-700 transition-colors">
        Cancelar
      </button>
    </div>
  )
}

// ─── OrdenCard ────────────────────────────────────────────────────────────────

interface OrdenCardProps {
  orden: OrdenVenta
  alertMinutes: number
  processingId: string | null
  faltanteEditing: Record<string, boolean>
  onAceptar: (id: string) => void
  onListo: (id: string) => void
  onMarcarFaltante: (ordenId: string, itemId: string, nota: string) => void
  onDesmarcarFaltante: (ordenId: string, itemId: string) => void
  onToggleFaltanteForm: (itemId: string) => void
}

const BORDER_COLOR: Record<OrdenVenta['estado'], string> = {
  pendiente:      'border-l-yellow-400',
  en_preparacion: 'border-l-brand-500',
  listo:          'border-l-green-500',
  pagado:         'border-l-steel-300',
  cancelado:      'border-l-red-400',
}

const ESTADO_LABEL: Record<OrdenVenta['estado'], string> = {
  pendiente:      'Pendiente',
  en_preparacion: 'En preparación',
  listo:          'Listo',
  pagado:         'Pagado',
  cancelado:      'Cancelado',
}

const ESTADO_COLOR: Record<OrdenVenta['estado'], 'gray' | 'yellow' | 'blue' | 'green' | 'red'> = {
  pendiente:      'yellow',
  en_preparacion: 'blue',
  listo:          'green',
  pagado:         'gray',
  cancelado:      'red',
}

function OrdenCard({ orden, alertMinutes, processingId, faltanteEditing, onAceptar, onListo, onMarcarFaltante, onDesmarcarFaltante, onToggleFaltanteForm }: OrdenCardProps) {
  const isProcessing = processingId === orden.id
  const isPendiente  = orden.estado === 'pendiente'
  const isEnPrep     = orden.estado === 'en_preparacion'
  const isListo      = orden.estado === 'listo'
  const hasFaltante  = orden.items.some(i => i.estado === 'faltante')

  return (
    <div className={clsx(
      'bg-white rounded-xl border border-steel-200 shadow-sm border-l-4',
      BORDER_COLOR[orden.estado],
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-steel-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base font-bold text-steel-900">{orden.numero}</span>
          <Badge color={ESTADO_COLOR[orden.estado]}>{ESTADO_LABEL[orden.estado]}</Badge>
          <span className="text-xs text-steel-400 hidden sm:block">Cajero: {orden.cajero_nombre}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <OrderTimer creado_en={orden.creado_en} alertMinutes={alertMinutes} isPendiente={isPendiente} />
          <span className="text-sm font-bold text-steel-900">
            {orden.total.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        <p className="text-xs text-steel-400 sm:hidden">Cajero: {orden.cajero_nombre}</p>

        {orden.items.map(item => {
          const isFaltante = item.estado === 'faltante'
          const editingThis = faltanteEditing[item.id] === true

          return (
            <div key={item.id} className={clsx('rounded-lg p-3 border transition-colors',
              isFaltante ? 'bg-red-50 border-red-100' : 'bg-steel-50 border-steel-100')}>
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className={clsx('mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0',
                  isFaltante ? 'bg-red-100' : 'bg-green-100')}>
                  {isFaltante ? (
                    <svg className="h-3 w-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx('text-sm font-medium', isFaltante ? 'text-steel-500 line-through' : 'text-steel-900')}>
                      {item.producto_nombre}
                    </span>
                    <span className="text-xs font-mono text-steel-400">{item.producto_codigo}</span>
                    <span className="text-xs font-semibold text-steel-700">×{item.cantidad}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-steel-400">📦 {item.producto_ubicacion}</span>
                  </div>
                  {isFaltante && item.nota_faltante && (
                    <p className="text-xs text-red-500 mt-1">{item.nota_faltante}</p>
                  )}
                </div>

                {/* Item actions — only for en_preparacion */}
                {isEnPrep && (
                  <div className="shrink-0">
                    {isFaltante ? (
                      <button
                        onClick={() => onDesmarcarFaltante(orden.id, item.id)}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors">
                        Desmarcar
                      </button>
                    ) : !editingThis ? (
                      <button
                        onClick={() => onToggleFaltanteForm(item.id)}
                        className="text-xs text-steel-400 hover:text-yellow-600 font-medium transition-colors">
                        Marcar faltante
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Inline faltante form */}
              {isEnPrep && editingThis && !isFaltante && (
                <FaltanteInlineForm
                  onConfirm={(nota) => onMarcarFaltante(orden.id, item.id, nota)}
                  onCancel={() => onToggleFaltanteForm(item.id)}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-steel-100 flex items-center justify-between gap-2">
        {/* Left: faltante warning */}
        {isEnPrep && hasFaltante && (
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-yellow-600 font-medium">
              {orden.items.filter(i => i.estado === 'faltante').length} ítem{orden.items.filter(i => i.estado === 'faltante').length !== 1 ? 's' : ''} faltante{orden.items.filter(i => i.estado === 'faltante').length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {isPendiente && (
            <Button size="sm" loading={isProcessing} onClick={() => onAceptar(orden.id)}
              icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>}>
              Iniciar preparación
            </Button>
          )}

          {isEnPrep && !hasFaltante && (
            <Button size="sm" loading={isProcessing} onClick={() => onListo(orden.id)}
              icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>}>
              Orden lista
            </Button>
          )}

          {isEnPrep && hasFaltante && orden.items.some(i => i.estado === 'ok') && (
            <button
              onClick={() => !isProcessing && onListo(orden.id)}
              disabled={isProcessing}
              className={clsx(
                'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border transition-all',
                'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100 active:bg-yellow-200',
                'disabled:opacity-50',
                isProcessing && 'opacity-50 cursor-not-allowed',
              )}>
              {isProcessing ? (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
              ) : (
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              Orden lista (con faltantes)
            </button>
          )}

          {isListo && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-600">Esperando al cajero...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── AlmacenPage ─────────────────────────────────────────────────────────────

type FilterEstado = 'todos' | 'pendiente' | 'en_preparacion' | 'listo'

export function AlmacenPage() {
  const { isTokenReady } = useAuth()

  const [filterEstado, setFilterEstado]   = useState<FilterEstado>('todos')
  const [processingId, setProcessingId]   = useState<string | null>(null)
  const [faltanteEditing, setFaltanteEditing] = useState<Record<string, boolean>>({})

  const { ordenes, config, setOrdenes, updateOrden, setConfig } = useVentasStore()

  useEffect(() => {
    if (!isTokenReady) return
    if (ordenes.length === 0) setOrdenes(MOCK_ORDENES)
    setConfig(MOCK_CONFIG_VENTAS)
  }, [isTokenReady])  // eslint-disable-line react-hooks/exhaustive-deps

  const displayOrdenes = useMemo(() =>
    ordenes.filter(o => {
      if (!['pendiente', 'en_preparacion', 'listo'].includes(o.estado)) return false
      if (filterEstado !== 'todos' && o.estado !== filterEstado) return false
      return true
    }),
    [ordenes, filterEstado],
  )

  const counts = useMemo(() => ({
    pendiente:      ordenes.filter(o => o.estado === 'pendiente').length,
    en_preparacion: ordenes.filter(o => o.estado === 'en_preparacion').length,
    listo:          ordenes.filter(o => o.estado === 'listo').length,
  }), [ordenes])

  const handleAceptar = async (ordenId: string) => {
    setProcessingId(ordenId)
    await new Promise(r => setTimeout(r, 300))
    updateOrden(ordenId, { estado: 'en_preparacion', aceptado_en: new Date().toISOString() })
    setProcessingId(null)
    toast.success('Orden aceptada — en preparación')
  }

  const handleListo = async (ordenId: string) => {
    setProcessingId(ordenId)
    await new Promise(r => setTimeout(r, 300))
    updateOrden(ordenId, { estado: 'listo', listo_en: new Date().toISOString() })
    setProcessingId(null)
    toast.success('Pedido listo — cajero notificado')
  }

  const handleMarcarFaltante = (ordenId: string, itemId: string, nota: string) => {
    const orden = ordenes.find(o => o.id === ordenId)
    if (!orden) return
    updateOrden(ordenId, {
      items: orden.items.map(i =>
        i.id === itemId ? { ...i, estado: 'faltante' as const, nota_faltante: nota || undefined } : i,
      ),
    })
    setFaltanteEditing(prev => { const n = { ...prev }; delete n[itemId]; return n })
    toast('Ítem marcado como faltante', { icon: '⚠️' })
  }

  const handleDesmarcarFaltante = (ordenId: string, itemId: string) => {
    const orden = ordenes.find(o => o.id === ordenId)
    if (!orden) return
    updateOrden(ordenId, {
      items: orden.items.map(i =>
        i.id === itemId ? { ...i, estado: 'ok' as const, nota_faltante: undefined } : i,
      ),
    })
    toast('Ítem desmarcado', { icon: '✓' })
  }

  const toggleFaltanteForm = (itemId: string) =>
    setFaltanteEditing(prev => ({ ...prev, [itemId]: !prev[itemId] }))

  const FILTROS: { key: FilterEstado; label: string; count?: number }[] = [
    { key: 'todos',          label: 'Todos',          count: counts.pendiente + counts.en_preparacion + counts.listo },
    { key: 'pendiente',      label: 'Pendiente',      count: counts.pendiente },
    { key: 'en_preparacion', label: 'En preparación', count: counts.en_preparacion },
    { key: 'listo',          label: 'Listo',          count: counts.listo },
  ]

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader title="Almacén" />

        {/* Filter tabs */}
        <div className="flex gap-1 mb-5 border-b border-steel-200 overflow-x-auto">
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setFilterEstado(f.key)}
              className={clsx('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px',
                filterEstado === f.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-steel-500 hover:text-steel-700')}>
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-semibold',
                  filterEstado === f.key ? 'bg-brand-100 text-brand-700' : 'bg-steel-100 text-steel-500')}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders */}
        {displayOrdenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-steel-100 flex items-center justify-center mb-3">
              <svg className="h-7 w-7 text-steel-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-steel-500">Sin órdenes activas</p>
            <p className="text-xs text-steel-400 mt-1">Las órdenes nuevas aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayOrdenes.map(orden => (
              <OrdenCard
                key={orden.id}
                orden={orden}
                alertMinutes={config.tiempo_alerta_minutos}
                processingId={processingId}
                faltanteEditing={faltanteEditing}
                onAceptar={handleAceptar}
                onListo={handleListo}
                onMarcarFaltante={handleMarcarFaltante}
                onDesmarcarFaltante={handleDesmarcarFaltante}
                onToggleFaltanteForm={toggleFaltanteForm}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </MainLayout>
  )
}
