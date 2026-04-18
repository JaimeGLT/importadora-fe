import { useState, useEffect, useMemo, useRef, Fragment } from 'react'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { useAuth } from '@/contexts/AuthContext'
import { useVentasStore } from '@/stores/ventasStore'
import { useInventarioStore } from '@/stores/inventarioStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button, Badge, Input } from '@/components/ui'
import type { OrdenVenta, ItemOrden, ConfigVentas } from '@/types'

// ─── ConfigCronometroModal ────────────────────────────────────────────────────

interface ConfigCronometroProps {
  open: boolean
  config: ConfigVentas
  onClose: () => void
  onSave: (minutos: number) => void
}

function ConfigCronometroModal({ open, config, onClose, onSave }: ConfigCronometroProps) {
  const [minutos, setMinutos] = useState(config.tiempo_alerta_minutos)
  useEffect(() => { if (open) setMinutos(config.tiempo_alerta_minutos) }, [open, config])

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <DialogPanel className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-6">
              <DialogTitle className="text-sm font-semibold text-steel-900 mb-1">Configurar cronómetro</DialogTitle>
              <p className="text-xs text-steel-400 mb-4">Minutos antes de mostrar alerta de demora.</p>
              <Input label="Minutos de alerta" type="number" min={1} max={60}
                value={String(minutos)}
                onChange={e => setMinutos(Math.max(1, parseInt(e.target.value) || 1))} />
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
                <Button size="sm" onClick={() => { onSave(minutos); onClose() }}>Guardar</Button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

// ─── DiscrepanciaModal ────────────────────────────────────────────────────────

interface DiscrepanciaModalProps {
  open: boolean
  item: ItemOrden | null
  orden: OrdenVenta | null
  onClose: () => void
  onConfirmarFaltante: () => void
  onProductoEncontrado: () => void
}

function DiscrepanciaModal({ open, item, orden, onClose, onConfirmarFaltante, onProductoEncontrado }: DiscrepanciaModalProps) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <DialogPanel className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <DialogTitle className="text-sm font-semibold text-steel-900">Resolver discrepancia</DialogTitle>
                  <p className="text-xs text-steel-400">{orden?.numero} · {item?.producto_nombre}</p>
                </div>
              </div>

              {item?.nota_faltante && (
                <div className="mb-4 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-700">
                    <span className="font-semibold">Nota del almacenero:</span> {item.nota_faltante}
                  </p>
                </div>
              )}

              <p className="text-sm text-steel-600 mb-5">
                Verifica físicamente el producto <strong>{item?.producto_codigo}</strong> en ubicación <strong>{item?.producto_ubicacion}</strong>.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onProductoEncontrado}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-colors text-left">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-green-800">Producto encontrado</p>
                    <p className="text-xs text-green-600 mt-0.5">Vuelve al estado normal</p>
                  </div>
                </button>
                <button
                  onClick={onConfirmarFaltante}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-red-800">Confirmar faltante</p>
                    <p className="text-xs text-red-600 mt-0.5">Ajusta inventario −{item?.cantidad}</p>
                  </div>
                </button>
              </div>

              <Button variant="secondary" size="sm" className="w-full mt-4" onClick={onClose}>
                Cancelar
              </Button>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

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

// ─── DiscrepanciaInlineForm (almacenero reports) ──────────────────────────────

interface DiscrepanciaFormProps {
  onConfirm: (nota: string) => void
  onCancel: () => void
}

function DiscrepanciaInlineForm({ onConfirm, onCancel }: DiscrepanciaFormProps) {
  const [nota, setNota] = useState('')

  return (
    <div className="mt-2 flex items-center gap-2 pl-8">
      <input
        type="text" value={nota} onChange={e => setNota(e.target.value)}
        placeholder="Motivo de la discrepancia (opcional)"
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') onConfirm(nota); if (e.key === 'Escape') onCancel() }}
        className="flex-1 px-2.5 py-1.5 text-xs border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50"
      />
      <button onClick={() => onConfirm(nota)}
        className="px-2.5 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
        Reportar
      </button>
      <button onClick={onCancel}
        className="px-2 py-1.5 text-xs text-steel-500 hover:text-steel-700 transition-colors">
        Cancelar
      </button>
    </div>
  )
}

// ─── ScanInput ────────────────────────────────────────────────────────────────

interface ScanInputProps {
  items: ItemOrden[]
  onScanned: (itemId: string) => void
}

function ScanInput({ items, onScanned }: ScanInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const code = value.trim()
    if (!code) return
    const item = items.find(i =>
      i.producto_codigo.toLowerCase() === code.toLowerCase()
    )
    if (item) {
      onScanned(item.id)
      notify.success(item.producto_nombre)
    } else {
      notify.error(`Código no reconocido: ${code}`)
    }
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-1 border-b border-steel-100">
      <svg className="h-4 w-4 text-steel-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H2a2 2 0 00-2 2v10a2 2 0 002 2h3m10-14h3a2 2 0 012 2v10a2 2 0 01-2 2h-3M5 8V6a2 2 0 012-2h10a2 2 0 012 2v2M5 8h14" />
      </svg>
      <input
        ref={inputRef}
        type="text" value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        placeholder="Escanear código de barras..."
        className="flex-1 text-xs px-2.5 py-1.5 border border-steel-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-steel-50"
      />
    </div>
  )
}

// ─── OrdenCard ────────────────────────────────────────────────────────────────

interface OrdenCardProps {
  orden: OrdenVenta
  alertMinutes: number
  isAdmin: boolean
  processingId: string | null
  discrepanciaEditing: Record<string, boolean>
  scannedItems: Set<string>
  onAceptar: (id: string) => void
  onListo: (id: string) => void
  onReportarDiscrepancia: (ordenId: string, itemId: string, nota: string) => void
  onResolverDiscrepancia: (item: ItemOrden, orden: OrdenVenta) => void
  onDesmarcarFaltante: (ordenId: string, itemId: string) => void
  onToggleDiscrepanciaForm: (itemId: string) => void
  onItemScanned: (itemId: string) => void
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

function OrdenCard({
  orden, alertMinutes, isAdmin, processingId, discrepanciaEditing, scannedItems,
  onAceptar, onListo, onReportarDiscrepancia, onResolverDiscrepancia,
  onDesmarcarFaltante, onToggleDiscrepanciaForm, onItemScanned,
}: OrdenCardProps) {
  const isProcessing    = processingId === orden.id
  const isPendiente     = orden.estado === 'pendiente'
  const isEnPrep        = orden.estado === 'en_preparacion'
  const isListo         = orden.estado === 'listo'
  const hasFaltante     = orden.items.some(i => i.estado === 'faltante')
  const hasDiscrepancia = orden.items.some(i => i.estado === 'discrepancia')
  const hasOk           = orden.items.some(i => i.estado === 'ok')
  const countDisc       = orden.items.filter(i => i.estado === 'discrepancia').length
  const countFalt       = orden.items.filter(i => i.estado === 'faltante').length

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

      {/* Scan input — only for en_preparacion */}
      {isEnPrep && (
        <ScanInput
          items={orden.items}
          onScanned={onItemScanned}
        />
      )}

      {/* Items */}
      <div className="p-4 space-y-3">
        <p className="text-xs text-steel-400 sm:hidden">Cajero: {orden.cajero_nombre}</p>

        {orden.items.map(item => {
          const isFaltante     = item.estado === 'faltante'
          const isDiscrepancia = item.estado === 'discrepancia'
          const isOk           = item.estado === 'ok'
          const isScanned      = scannedItems.has(item.id)
          const editingThis    = discrepanciaEditing[item.id] === true

          return (
            <div key={item.id} className={clsx('rounded-lg p-3 border transition-colors',
              isFaltante     ? 'bg-red-50 border-red-100'
              : isDiscrepancia ? 'bg-orange-50 border-orange-200'
              : isScanned    ? 'bg-green-50 border-green-200'
              : 'bg-steel-50 border-steel-100')}>
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className={clsx('mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0',
                  isFaltante     ? 'bg-red-100'
                  : isDiscrepancia ? 'bg-orange-100'
                  : isScanned    ? 'bg-green-200'
                  : 'bg-steel-200')}>
                  {isFaltante ? (
                    <svg className="h-3 w-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : isDiscrepancia ? (
                    <svg className="h-3 w-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className={clsx('h-3 w-3', isScanned ? 'text-green-600' : 'text-steel-400')} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx('text-sm font-medium',
                      isFaltante ? 'text-steel-400 line-through'
                      : isDiscrepancia ? 'text-orange-800'
                      : 'text-steel-900')}>
                      {item.producto_nombre}
                    </span>
                    <span className="text-xs font-mono text-steel-400">{item.producto_codigo}</span>
                    <span className="text-xs font-semibold text-steel-700">×{item.cantidad}</span>
                    {isScanned && isOk && (
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                        ✓ Escaneado
                      </span>
                    )}
                    {isDiscrepancia && (
                      <span className="text-xs font-semibold text-orange-600">⚠ Discrepancia</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-steel-400">📦 {item.producto_ubicacion}</span>
                  </div>
                  {item.nota_faltante && (
                    <p className={clsx('text-xs mt-1', isDiscrepancia ? 'text-orange-600' : 'text-red-500')}>
                      {item.nota_faltante}
                    </p>
                  )}
                </div>

                {/* Item actions */}
                {isEnPrep && (
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {isDiscrepancia && isAdmin && (
                      <button
                        onClick={() => onResolverDiscrepancia(item, orden)}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-2 py-1 rounded-lg transition-colors">
                        Resolver
                      </button>
                    )}
                    {isDiscrepancia && !isAdmin && (
                      <span className="text-xs text-orange-500 font-medium">Pendiente admin</span>
                    )}
                    {isFaltante && (
                      <button
                        onClick={() => onDesmarcarFaltante(orden.id, item.id)}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors">
                        Desmarcar
                      </button>
                    )}
                    {isOk && !editingThis && (
                      <button
                        onClick={() => onToggleDiscrepanciaForm(item.id)}
                        className="text-xs text-steel-400 hover:text-orange-600 font-medium transition-colors">
                        Reportar disc.
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Inline discrepancia form */}
              {isEnPrep && editingThis && isOk && (
                <DiscrepanciaInlineForm
                  onConfirm={nota => onReportarDiscrepancia(orden.id, item.id, nota)}
                  onCancel={() => onToggleDiscrepanciaForm(item.id)}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-steel-100 flex items-center justify-between gap-2 flex-wrap">
        {/* Left: warnings */}
        <div className="flex items-center gap-3">
          {isEnPrep && hasDiscrepancia && (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-orange-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-orange-600 font-medium">
                {countDisc} discrepancia{countDisc !== 1 ? 's' : ''} — esperando admin
              </span>
            </div>
          )}
          {isEnPrep && !hasDiscrepancia && hasFaltante && (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-red-500 font-medium">
                {countFalt} faltante{countFalt !== 1 ? 's' : ''} confirmado{countFalt !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {isPendiente && (
            <Button size="sm" loading={isProcessing} onClick={() => onAceptar(orden.id)}
              icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>}>
              Iniciar preparación
            </Button>
          )}

          {/* Blocked by discrepancias */}
          {isEnPrep && hasDiscrepancia && (
            <div className="flex items-center gap-1.5 text-xs text-orange-500 font-medium">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
              Esperando resolución...
            </div>
          )}

          {/* All resolved — no faltantes */}
          {isEnPrep && !hasDiscrepancia && !hasFaltante && (
            <Button size="sm" loading={isProcessing} onClick={() => onListo(orden.id)}
              icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>}>
              Orden lista
            </Button>
          )}

          {/* Has confirmed faltantes but no discrepancias */}
          {isEnPrep && !hasDiscrepancia && hasFaltante && hasOk && (
            <button
              onClick={() => !isProcessing && onListo(orden.id)}
              disabled={isProcessing}
              className={clsx(
                'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border transition-all',
                'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100',
                'disabled:opacity-50',
              )}>
              {isProcessing
                ? <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
                : <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
              }
              Listo c/faltantes
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
  const { user, isTokenReady } = useAuth()
  const isAdmin = user?.rol === 'admin'

  const [filterEstado, setFilterEstado]           = useState<FilterEstado>('todos')
  const [processingId, setProcessingId]           = useState<string | null>(null)
  const [discrepanciaEditing, setDiscEditing]     = useState<Record<string, boolean>>({})
  const [configOpen, setConfigOpen]               = useState(false)
  const [scannedItems, setScannedItems]           = useState<Set<string>>(new Set())
  const [discModal, setDiscModal]                 = useState<{ item: ItemOrden; orden: OrdenVenta } | null>(null)

  const { ordenes, config, updateOrden, setConfig } = useVentasStore()
  const { updateProductoStock }                                  = useInventarioStore()

  useEffect(() => {
    if (!isTokenReady) return
    // No cargar mocks - usar datos persistidos del store
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
    discrepancias:  ordenes.reduce((acc, o) => acc + o.items.filter(i => i.estado === 'discrepancia').length, 0),
  }), [ordenes])

  const handleAceptar = async (ordenId: string) => {
    setProcessingId(ordenId)
    await new Promise(r => setTimeout(r, 300))
    updateOrden(ordenId, { estado: 'en_preparacion', aceptado_en: new Date().toISOString() })
    setProcessingId(null)
    notify.success('Orden aceptada — en preparación')
  }

  const handleListo = async (ordenId: string) => {
    setProcessingId(ordenId)
    await new Promise(r => setTimeout(r, 300))
    updateOrden(ordenId, { estado: 'listo', listo_en: new Date().toISOString() })
    setProcessingId(null)
    notify.success('Pedido listo — cajero notificado')
  }

  const handleReportarDiscrepancia = (ordenId: string, itemId: string, nota: string) => {
    const orden = ordenes.find(o => o.id === ordenId)
    if (!orden) return
    updateOrden(ordenId, {
      items: orden.items.map(i =>
        i.id === itemId ? { ...i, estado: 'discrepancia' as const, nota_faltante: nota || undefined } : i,
      ),
    })
    setDiscEditing(prev => { const n = { ...prev }; delete n[itemId]; return n })
    notify.warning('Discrepancia reportada — admin debe verificar')
  }

  // Admin resolves discrepancia
  const handleConfirmarFaltante = () => {
    if (!discModal) return
    const { item, orden } = discModal
    updateOrden(orden.id, {
      items: orden.items.map(i =>
        i.id === item.id ? { ...i, estado: 'faltante' as const } : i,
      ),
    })
    updateProductoStock(item.producto_id, -item.cantidad)
    setDiscModal(null)
    notify.success(`Faltante confirmado — inventario ajustado`)
  }

  const handleProductoEncontrado = () => {
    if (!discModal) return
    const { item, orden } = discModal
    updateOrden(orden.id, {
      items: orden.items.map(i =>
        i.id === item.id ? { ...i, estado: 'ok' as const, nota_faltante: undefined } : i,
      ),
    })
    setDiscModal(null)
    notify.success('Producto encontrado — ítem marcado OK')
  }

  const handleDesmarcarFaltante = (ordenId: string, itemId: string) => {
    const orden = ordenes.find(o => o.id === ordenId)
    if (!orden) return
    updateOrden(ordenId, {
      items: orden.items.map(i =>
        i.id === itemId ? { ...i, estado: 'ok' as const, nota_faltante: undefined } : i,
      ),
    })
    notify.info('Ítem desmarcado')
  }

  const toggleDiscrepanciaForm = (itemId: string) =>
    setDiscEditing(prev => ({ ...prev, [itemId]: !prev[itemId] }))

  const handleItemScanned = (itemId: string) => {
    setScannedItems(prev => new Set([...prev, itemId]))
  }

  const FILTROS: { key: FilterEstado; label: string; count?: number }[] = [
    { key: 'todos',          label: 'Todos',          count: counts.pendiente + counts.en_preparacion + counts.listo },
    { key: 'pendiente',      label: 'Pendiente',      count: counts.pendiente },
    { key: 'en_preparacion', label: 'En preparación', count: counts.en_preparacion },
    { key: 'listo',          label: 'Listo',          count: counts.listo },
  ]

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Almacén"
          actions={isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => setConfigOpen(true)}
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>}>
              Cronómetro
            </Button>
          )}
        />

        {/* Admin discrepancias alert */}
        {isAdmin && counts.discrepancias > 0 && (
          <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
            <svg className="h-4 w-4 text-orange-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold text-orange-800">
              {counts.discrepancias} discrepancia{counts.discrepancias !== 1 ? 's' : ''} pendiente{counts.discrepancias !== 1 ? 's' : ''} de verificación
            </span>
          </div>
        )}

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
                isAdmin={isAdmin}
                processingId={processingId}
                discrepanciaEditing={discrepanciaEditing}
                scannedItems={scannedItems}
                onAceptar={handleAceptar}
                onListo={handleListo}
                onReportarDiscrepancia={handleReportarDiscrepancia}
                onResolverDiscrepancia={(item, orden) => setDiscModal({ item, orden })}

                onDesmarcarFaltante={handleDesmarcarFaltante}
                onToggleDiscrepanciaForm={toggleDiscrepanciaForm}
                onItemScanned={handleItemScanned}
              />
            ))}
          </div>
        )}
      </PageContainer>

      <ConfigCronometroModal
        open={configOpen}
        config={config}
        onClose={() => setConfigOpen(false)}
        onSave={m => { setConfig({ ...config, tiempo_alerta_minutos: m }); notify.success(`Alerta configurada: ${m} min`) }}
      />

      <DiscrepanciaModal
        open={!!discModal}
        item={discModal?.item ?? null}
        orden={discModal?.orden ?? null}
        onClose={() => setDiscModal(null)}
        onConfirmarFaltante={handleConfirmarFaltante}
        onProductoEncontrado={handleProductoEncontrado}
      />
    </MainLayout>
  )
}
