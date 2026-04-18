import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { useAuth } from '@/contexts/AuthContext'
import { useInventarioStore } from '@/stores/inventarioStore'
import { useVentasStore } from '@/stores/ventasStore'
import { useConfigStore, calcularPrecioConDescuento } from '@/stores/configStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button, Input, Badge } from '@/components/ui'
import { MOCK_PRODUCTOS } from '@/mock/inventario'
import { MOCK_CONFIG_VENTAS } from '@/mock/ventas'
import type { Producto, OrdenVenta, Reserva, MetodoPago, CanalReserva, ConfigVentas } from '@/types'
import type { DescuentoConfig } from '@/stores/configStore'

// ─── Local types ──────────────────────────────────────────────────────────────

interface CartItem {
  producto: Producto
  cantidad: number
  precioEspecial?: number
}

interface CartSlot {
  cart: CartItem[]
  nota: string
  pendingOrderNum: string | null
}

interface ReservaForm {
  canal: CanalReserva
  cliente_nombre: string
  cliente_telefono: string
  nota: string
}

const EMPTY_RESERVA: ReservaForm = { canal: 'presencial', cliente_nombre: '', cliente_telefono: '', nota: '' }
const EMPTY_SLOT: CartSlot = { cart: [], nota: '', pendingOrderNum: null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBs(n: number) {
  return `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch { /* browser may block autoplay */ }
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
    <span className={clsx('inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums',
      isAlert ? 'text-red-600' : 'text-steel-400')}>
      {isAlert && (
        <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      {m}:{s.toString().padStart(2, '0')}
    </span>
  )
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<OrdenVenta['estado'], string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
}

const ESTADO_COLOR: Record<OrdenVenta['estado'], 'gray' | 'yellow' | 'blue' | 'green' | 'red'> = {
  pendiente: 'yellow',
  en_preparacion: 'blue',
  listo: 'green',
  pagado: 'gray',
  cancelado: 'red',
}

const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  qr: 'QR',
  tarjeta: 'Tarjeta',
}

// ─── FacturaModal ─────────────────────────────────────────────────────────────

interface FacturaModalProps {
  open: boolean
  orden: OrdenVenta | null
  onClose: () => void
}

function FacturaModal({ open, orden, onClose }: FacturaModalProps) {
  if (!orden) return null

  const itemsOk       = orden.items.filter(i => i.estado === 'ok')
  const itemsFaltante = orden.items.filter(i => i.estado === 'faltante')
  const total         = itemsOk.reduce((s, i) => s + i.subtotal, 0)
  const cambio        = orden.metodo_pago === 'efectivo' && orden.monto_recibido
    ? Math.max(0, orden.monto_recibido - total)
    : 0
  const fecha = new Date(orden.pagado_en ?? orden.actualizado_en).toLocaleString('es-BO')
  const facturaNum = orden.numero.replace('ORD-', 'FAC-')

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=400,height=680')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Comprobante ${facturaNum}</title>
      <style>
        body{font-family:monospace;font-size:12px;width:300px;margin:0 auto;padding:12px}
        h1{font-size:15px;text-align:center;margin:0 0 2px}
        .sub{text-align:center;font-size:11px;color:#666;margin:0 0 8px}
        .divider{border:none;border-top:1px dashed #999;margin:8px 0}
        .row{display:flex;justify-content:space-between;margin:3px 0;font-size:11px}
        .bold{font-weight:bold}
        .total{font-size:13px;font-weight:bold;margin:4px 0}
        .strike{text-decoration:line-through;opacity:.45}
        .center{text-align:center}
        @media print{body{margin:0}}
      </style>
    </head><body>
      <h1>USA AUTOPARTES</h1>
      <p class="sub">Comprobante de Venta</p>
      <hr class="divider">
      <div class="row"><span>Factura N°</span><span class="bold">${facturaNum}</span></div>
      <div class="row"><span>Fecha</span><span>${fecha}</span></div>
      <div class="row"><span>Cajero</span><span>${orden.cajero_nombre}</span></div>
      <hr class="divider">
      ${itemsOk.map(i => `<div class="row"><span>${i.producto_nombre} ×${i.cantidad}</span><span>${fmtBs(i.subtotal)}</span></div>`).join('')}
      ${itemsFaltante.map(i => `<div class="row strike"><span>${i.producto_nombre} ×${i.cantidad}</span><span>${fmtBs(i.subtotal)}</span></div>`).join('')}
      <hr class="divider">
      <div class="row total"><span>TOTAL</span><span>${fmtBs(total)}</span></div>
      <div class="row"><span>Método</span><span>${METODO_LABEL[orden.metodo_pago ?? 'efectivo']}</span></div>
      ${orden.metodo_pago === 'efectivo' && orden.monto_recibido ? `
        <div class="row"><span>Recibido</span><span>${fmtBs(orden.monto_recibido)}</span></div>
        <div class="row bold"><span>Cambio</span><span>${fmtBs(cambio)}</span></div>
      ` : ''}
      <hr class="divider">
      <p class="center" style="font-size:11px;margin-top:6px">¡Gracias por su compra!</p>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 250)
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild as={Fragment}
          enter="ease-out duration-250" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end sm:items-center justify-center">
          <TransitionChild as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95">
            <DialogPanel className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
              {/* Success header */}
              <div className="flex flex-col items-center px-5 pt-6 pb-4 border-b border-steel-100">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <DialogTitle className="text-base font-semibold text-steel-900">Venta completada</DialogTitle>
                <p className="text-xs text-steel-400 mt-0.5">{facturaNum} · {fecha}</p>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-5 flex-1 space-y-4">
                {/* Items */}
                <div className="space-y-1.5">
                  {itemsOk.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-steel-700 truncate">{item.producto_nombre}</span>
                        <span className="text-xs text-steel-400 shrink-0">×{item.cantidad}</span>
                      </div>
                      <span className="text-sm font-semibold text-steel-900 shrink-0 ml-3">{fmtBs(item.subtotal)}</span>
                    </div>
                  ))}
                  {itemsFaltante.map(item => (
                    <div key={item.id} className="flex items-center justify-between opacity-40">
                      <span className="text-sm text-steel-500 line-through truncate">{item.producto_nombre} ×{item.cantidad}</span>
                      <span className="text-sm text-steel-400 line-through shrink-0 ml-3">{fmtBs(item.subtotal)}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between py-3 border-t border-b border-steel-100">
                  <span className="text-sm font-semibold text-steel-600">Total cobrado</span>
                  <span className="text-2xl font-bold text-steel-900">{fmtBs(total)}</span>
                </div>

                {/* Payment info */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-steel-400">Método</span>
                    <span className="text-sm font-semibold text-steel-800">{METODO_LABEL[orden.metodo_pago ?? 'efectivo']}</span>
                  </div>
                  {orden.metodo_pago === 'efectivo' && orden.monto_recibido != null && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-steel-400">Recibido</span>
                        <span className="text-sm text-steel-700">{fmtBs(orden.monto_recibido)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-steel-400">Cambio</span>
                        <span className="text-sm font-semibold text-green-600">{fmtBs(cambio)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-steel-100 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={onClose}>Cerrar</Button>
                <Button className="flex-1" onClick={handlePrint}
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>}>
                  Imprimir
                </Button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

// ─── ConfigModal ──────────────────────────────────────────────────────────────

interface ConfigModalProps {
  open: boolean
  config: ConfigVentas
  onClose: () => void
  onSave: (minutos: number) => void
}

function ConfigModal({ open, config, onClose, onSave }: ConfigModalProps) {
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
              <p className="text-xs text-steel-400 mb-4">Minutos antes de mostrar alerta de demora en órdenes.</p>
              <Input
                label="Minutos de alerta"
                type="number"
                min={1}
                max={60}
                value={String(minutos)}
                onChange={e => setMinutos(Math.max(1, parseInt(e.target.value) || 1))}
              />
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

// ─── CobroModal ───────────────────────────────────────────────────────────────

interface CobroModalProps {
  open: boolean
  orden: OrdenVenta | null
  onClose: () => void
  onConfirm: (metodo: MetodoPago, montoRecibido?: number) => void
}

const METODOS_PAGO: { id: MetodoPago; label: string; icon: string }[] = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'qr',       label: 'QR',       icon: '📱' },
  { id: 'tarjeta',  label: 'Tarjeta',  icon: '💳' },
]

function CobroModal({ open, orden, onClose, onConfirm }: CobroModalProps) {
  const [metodo, setMetodo]         = useState<MetodoPago>('efectivo')
  const [monto, setMonto]           = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { if (!open) return; setMetodo('efectivo'); setMonto(''); setConfirming(false) }, [open])

  if (!orden) return null

  const itemsOk       = orden.items.filter(i => i.estado === 'ok')
  const itemsFaltante = orden.items.filter(i => i.estado === 'faltante')
  const total         = itemsOk.reduce((s, i) => s + i.subtotal, 0)
  const montoNum      = parseFloat(monto) || 0
  const cambio        = metodo === 'efectivo' ? Math.max(0, montoNum - total) : 0

  const handleConfirm = async () => {
    setConfirming(true)
    await new Promise(r => setTimeout(r, 400))
    onConfirm(metodo, metodo === 'efectivo' ? montoNum || undefined : undefined)
    setConfirming(false)
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild as={Fragment}
          enter="ease-out duration-250" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end sm:items-center justify-center">
          <TransitionChild as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95">
            <DialogPanel className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-steel-100">
                <DialogTitle className="text-base font-semibold text-steel-900">
                  Cobrar — <span className="text-brand-600">{orden.numero}</span>
                </DialogTitle>
                <button onClick={onClose} className="p-1.5 rounded-lg text-steel-400 hover:text-steel-600 hover:bg-steel-100 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-5 flex-1 space-y-5">
                {/* Items */}
                <div>
                  <p className="text-xs font-semibold text-steel-400 uppercase tracking-wider mb-2">Productos</p>
                  <div className="space-y-1.5">
                    {itemsOk.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50 border border-green-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="h-3.5 w-3.5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-steel-800 truncate">{item.producto_nombre}</span>
                          <span className="text-xs text-steel-400 shrink-0">×{item.cantidad}</span>
                        </div>
                        <span className="text-sm font-semibold text-steel-900 shrink-0 ml-3">{fmtBs(item.subtotal)}</span>
                      </div>
                    ))}
                    {itemsFaltante.map(item => (
                      <div key={item.id} className="flex items-start justify-between px-3 py-2 rounded-lg bg-red-50 border border-red-100 opacity-70">
                        <div className="flex items-start gap-2 min-w-0">
                          <svg className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-sm text-steel-400 line-through">{item.producto_nombre} ×{item.cantidad}</p>
                            {item.nota_faltante && <p className="text-xs text-red-500 mt-0.5">{item.nota_faltante}</p>}
                          </div>
                        </div>
                        <span className="text-sm text-steel-300 line-through shrink-0 ml-3">{fmtBs(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between py-3 border-t border-b border-steel-100">
                  <span className="text-sm font-semibold text-steel-600">Total a cobrar</span>
                  <span className="text-2xl font-bold text-steel-900">{fmtBs(total)}</span>
                </div>

                {/* Payment method */}
                <div>
                  <p className="text-xs font-semibold text-steel-400 uppercase tracking-wider mb-3">Método de pago</p>
                  <div className="grid grid-cols-3 gap-2">
                    {METODOS_PAGO.map(m => (
                      <button key={m.id} onClick={() => setMetodo(m.id)}
                        className={clsx(
                          'flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all duration-150',
                          metodo === m.id
                            ? 'bg-brand-50 border-brand-400 text-brand-700 shadow-sm shadow-brand-100 scale-[1.03]'
                            : 'border-steel-200 text-steel-500 hover:border-steel-300 hover:bg-steel-50',
                        )}>
                        <span className="text-2xl leading-none">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Efectivo change */}
                {metodo === 'efectivo' && (
                  <div className="space-y-2">
                    <Input label="Monto recibido (Bs)" type="number" min={0} step="0.50"
                      value={monto} onChange={e => setMonto(e.target.value)} />
                    {montoNum > 0 && (
                      <div className={clsx(
                        'flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors',
                        cambio >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200',
                      )}>
                        <span className="text-sm font-medium text-steel-600">Cambio</span>
                        <span className={clsx('text-lg font-bold', cambio >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {fmtBs(cambio)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-steel-100 flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose} disabled={confirming}>Cancelar</Button>
                <Button onClick={() => void handleConfirm()} loading={confirming}
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>}>
                  Confirmar pago
                </Button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

// ─── ReservaModal ─────────────────────────────────────────────────────────────

interface ReservaModalProps {
  open: boolean
  onClose: () => void
  itemCount: number
  total: number
  defaultCanal?: CanalReserva
  onConfirm: (form: ReservaForm) => void
}

function ReservaModal({ open, onClose, itemCount, total, defaultCanal, onConfirm }: ReservaModalProps) {
  const [form, setForm]     = useState<ReservaForm>(EMPTY_RESERVA)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({ ...EMPTY_RESERVA, canal: defaultCanal ?? 'presencial' })
    setSaving(false)
  }, [open, defaultCanal])

  const set = <K extends keyof ReservaForm>(k: K, v: ReservaForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const handleConfirm = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    onConfirm(form)
    setSaving(false)
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild as={Fragment}
          enter="ease-out duration-250" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end sm:items-center justify-center">
          <TransitionChild as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95">
            <DialogPanel className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-steel-100">
                <DialogTitle className="text-base font-semibold text-steel-900">Nueva reserva</DialogTitle>
                <button onClick={onClose} className="p-1.5 rounded-lg text-steel-400 hover:text-steel-600 hover:bg-steel-100 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto p-5 flex-1 space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-brand-50 rounded-xl border border-brand-100">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="text-sm font-medium text-steel-700">{itemCount} producto{itemCount !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-bold text-steel-900">{fmtBs(total)}</span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-steel-400 uppercase tracking-wider mb-2">Canal</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['presencial', 'whatsapp'] as CanalReserva[]).map(c => (
                      <button key={c} onClick={() => set('canal', c)}
                        className={clsx(
                          'flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150',
                          form.canal === c
                            ? 'bg-brand-50 border-brand-400 text-brand-700 shadow-sm scale-[1.02]'
                            : 'border-steel-200 text-steel-500 hover:border-steel-300 hover:bg-steel-50',
                        )}>
                        <span className="text-lg">{c === 'presencial' ? '🏪' : '📱'}</span>
                        {c === 'presencial' ? 'Presencial' : 'WhatsApp'}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="Nombre del cliente" value={form.cliente_nombre}
                  onChange={e => set('cliente_nombre', e.target.value)} placeholder="Opcional" />
                <Input label="Teléfono" value={form.cliente_telefono}
                  onChange={e => set('cliente_telefono', e.target.value)} placeholder="Opcional" />
                <Input label="Nota" value={form.nota}
                  onChange={e => set('nota', e.target.value)} placeholder="Opcional" />

                <div className="flex items-start gap-2 px-3 py-2.5 bg-yellow-50 rounded-lg border border-yellow-200">
                  <svg className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-yellow-700 leading-relaxed">
                    Stock reservado por 24 horas. Se cancela automáticamente si no se convierte.
                  </p>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-steel-100 flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button onClick={() => void handleConfirm()} loading={saving}
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>}>
                  Confirmar reserva
                </Button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

// ─── ProductDetailModal ───────────────────────────────────────────────────────

interface ProductDetailModalProps {
  open: boolean
  producto: Producto | null
  onClose: () => void
  onAdd: (producto: Producto, cantidad: number, precioEspecial?: number) => void
  descuentos: DescuentoConfig[]
}

function ProductDetailModal({ open, producto, onClose, onAdd, descuentos }: ProductDetailModalProps) {
  const [cantidad, setCantidad] = useState(1)
  const [selectedDescuento, setSelectedDescuento] = useState<DescuentoConfig | null>(null)
  const descuentosActivos = descuentos.filter(d => d.activo)

  useEffect(() => {
    if (open) {
      setCantidad(1)
      setSelectedDescuento(null)
    }
  }, [open])

  if (!producto) return null

  const precioFinal = selectedDescuento
    ? calcularPrecioConDescuento(producto.precio_venta, selectedDescuento.porcentaje)
    : producto.precio_venta

  const subtotal = precioFinal * cantidad

  const handleAdd = () => {
    onAdd(producto, cantidad, selectedDescuento ? precioFinal : undefined)
    onClose()
  }

  const COLOR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
    cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4">
          <TransitionChild as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95">
            <DialogPanel className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-5 py-4 border-b border-steel-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold font-mono text-brand-600">{producto.codigo_universal}</span>
                    {producto.marca && (
                      <span className="text-xs font-medium text-steel-400 uppercase">{producto.marca}</span>
                    )}
                  </div>
                  <DialogTitle className="text-base font-semibold text-steel-900">{producto.nombre}</DialogTitle>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-steel-400 hover:text-steel-600 hover:bg-steel-100 transition-colors shrink-0">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-5 flex-1 space-y-4">
                {/* Product image & info */}
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl bg-steel-100 border border-steel-200 shrink-0 overflow-hidden flex items-center justify-center">
                    {producto.imagen ? (
                      <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="h-10 w-10 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    {producto.descripcion && (
                      <p className="text-sm text-steel-600 leading-relaxed">{producto.descripcion}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-steel-500 bg-steel-100 px-2 py-1 rounded-md">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {producto.ubicacion}
                      </span>
                      <span className={clsx(
                        'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md',
                        producto.stock > producto.stock_minimo ? 'text-green-700 bg-green-100' : 'text-amber-700 bg-amber-100'
                      )}>
                        {producto.stock} en stock
                      </span>
                    </div>
                  </div>
                </div>

                {/* Base price */}
                <div>
                  <p className="text-xs font-semibold text-steel-400 uppercase tracking-wider mb-2">Precio</p>
                  <button
                    onClick={() => setSelectedDescuento(null)}
                    className={clsx(
                      'w-full p-3 rounded-xl border-2 text-left transition-all',
                      !selectedDescuento
                        ? 'bg-steel-900 border-steel-900 ring-2 ring-brand-400 ring-offset-1'
                        : 'bg-steel-50 border-steel-200 hover:border-steel-300',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={clsx('text-xs font-semibold', !selectedDescuento ? 'text-white' : 'text-steel-500')}>
                        Precio base
                      </span>
                      <span className={clsx('text-sm font-bold', !selectedDescuento ? 'text-white' : 'text-steel-900')}>
                        {fmtBs(producto.precio_venta)}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Special prices */}
                {descuentosActivos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-steel-400 uppercase tracking-wider mb-2">Precios especiales</p>
                    <div className="grid grid-cols-2 gap-2">
                      {descuentosActivos.map((d) => {
                        const styles = COLOR_STYLES[d.color] || COLOR_STYLES.emerald
                        const precioDesc = calcularPrecioConDescuento(producto.precio_venta, d.porcentaje)
                        const isSelected = selectedDescuento?.id === d.id

                        return (
                          <button
                            key={d.id}
                            onClick={() => setSelectedDescuento(isSelected ? null : d)}
                            className={clsx(
                              'p-3 rounded-xl border-2 text-left transition-all',
                              isSelected ? 'ring-2 ring-brand-400 ring-offset-1' : '',
                              styles.bg, styles.border,
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={clsx('text-xs font-semibold', styles.text)}>{d.nombre}</span>
                              <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/60', styles.text)}>
                                -{d.porcentaje}%
                              </span>
                            </div>
                            <span className={clsx('text-sm font-bold', styles.text)}>{fmtBs(precioDesc)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <p className="text-xs font-semibold text-steel-400 uppercase tracking-wider mb-2">Cantidad</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                      className="h-10 w-10 rounded-xl border border-steel-200 flex items-center justify-center text-steel-600 hover:bg-steel-50 transition-colors"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={producto.stock}
                      value={cantidad}
                      onChange={(e) => setCantidad(Math.min(producto.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 h-10 text-center text-lg font-bold border border-steel-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                    <button
                      onClick={() => setCantidad(Math.min(producto.stock, cantidad + 1))}
                      disabled={cantidad >= producto.stock}
                      className="h-10 w-10 rounded-xl border border-steel-200 flex items-center justify-center text-steel-600 hover:bg-steel-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCantidad(producto.stock)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      Máx.
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-steel-100 bg-steel-50/50">
                {selectedDescuento && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-steel-500">
                      {selectedDescuento.nombre} (-{selectedDescuento.porcentaje}%)
                    </span>
                    <span className="text-sm text-steel-400 line-through">{fmtBs(producto.precio_venta * cantidad)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-steel-600">Subtotal</span>
                  <span className="text-2xl font-bold text-steel-900">{fmtBs(subtotal)}</span>
                </div>
                <Button className="w-full" onClick={handleAdd}
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>}>
                  Agregar al carrito
                </Button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

// ─── SearchPanel ──────────────────────────────────────────────────────────────

interface SearchPanelProps {
  search: string
  setSearch: (v: string) => void
  results: Producto[]
  cart: CartItem[]
  onSelectProduct: (p: Producto) => void
  onQuickAdd: (p: Producto) => void
}

function SearchPanel({ search, setSearch, results, cart, onSelectProduct, onQuickAdd }: SearchPanelProps) {
  const cartMap = useMemo(() => {
    const m: Record<string, number> = {}
    cart.forEach(i => { m[i.producto.id] = i.cantidad })
    return m
  }, [cart])

  return (
    <div className="bg-white rounded-2xl border border-steel-200 shadow-sm flex flex-col h-[500px] overflow-hidden">
      {/* Header con gradiente sutil */}
      <div className="p-4 border-b border-steel-100 bg-gradient-to-b from-steel-50/50 to-white shrink-0">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-steel-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Escanea o escribe el código..."
            autoFocus
            className="w-full pl-11 pr-10 py-3 text-sm border border-steel-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white placeholder:text-steel-400"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-600 transition-colors p-0.5 rounded-md hover:bg-steel-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {!search.trim() ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center mb-4 shadow-sm">
              <svg className="h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-steel-700">Busca un producto</p>
            <p className="text-xs text-steel-400 mt-1.5 max-w-[200px]">Escribe el código, nombre o marca del producto</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="h-14 w-14 rounded-full bg-steel-100 flex items-center justify-center mb-3">
              <svg className="h-7 w-7 text-steel-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-steel-600">Sin resultados</p>
            <p className="text-xs text-steel-400 mt-1">No encontramos "<strong className="text-steel-500">{search}</strong>"</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-steel-500 mb-3 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </p>
            {results.map(p => {
              const inCart = cartMap[p.id] ?? 0
              const stockOk = p.stock > p.stock_minimo
              return (
                <div key={p.id}
                  className="group flex items-start gap-3 p-3 rounded-xl border border-steel-100 hover:border-brand-200 hover:bg-gradient-to-r hover:from-brand-50/30 hover:to-transparent transition-all duration-200 cursor-pointer"
                  onClick={() => onSelectProduct(p)}>
                  {/* Imagen del producto */}
                  <div className="w-16 h-16 rounded-lg bg-steel-100 border border-steel-200 shrink-0 overflow-hidden flex items-center justify-center">
                    {p.imagen ? (
                      <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="h-8 w-8 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  {/* Código destacado - elemento principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-lg font-bold font-mono tracking-tight text-brand-700 group-hover:text-brand-800 transition-colors">
                        {p.codigo_universal}
                      </span>
                      <span className="text-[11px] font-medium text-steel-400 uppercase tracking-wide truncate">
                        {p.marca}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-steel-800 leading-snug line-clamp-1 mb-1.5">
                      {p.nombre}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] text-steel-500 bg-steel-100 px-2 py-0.5 rounded-md">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {p.ubicacion}
                      </span>
                      <span className={clsx(
                        'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md',
                        stockOk ? 'text-green-700 bg-green-100' : 'text-amber-700 bg-amber-100')}>
                        {stockOk ? (
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        {p.stock} en stock
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
                    <span className="text-base font-bold text-steel-900 tabular-nums">{fmtBs(p.precio_venta)}</span>
                    {inCart > 0 && (
                      <span className="text-[11px] font-semibold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                        {inCart} en carrito
                      </span>
                    )}
                    <Button size="sm" variant={inCart > 0 ? 'secondary' : 'primary'}
                      onClick={e => { e.stopPropagation(); onQuickAdd(p) }}
                      className="shadow-sm"
                      icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>}>
                      {inCart > 0 ? 'Agregar más' : 'Agregar'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CartPanel ────────────────────────────────────────────────────────────────

interface CartPanelProps {
  cart: CartItem[]
  total: number
  nota: string
  pendingOrderNum: string | null
  setNota: (v: string) => void
  onUpdateQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onReservar: () => void
  onEmitir: () => void
  emitirLoading: boolean
  onClearPending: () => void
}

function CartPanel({ cart, total, nota, pendingOrderNum, setNota, onUpdateQty, onRemove, onReservar, onEmitir, emitirLoading, onClearPending }: CartPanelProps) {
  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0)

  return (
    <div className="bg-white rounded-2xl border border-steel-200 shadow-sm flex flex-col h-[500px] overflow-hidden">
      <div className="px-4 py-3 border-b border-steel-100 bg-gradient-to-b from-steel-50/50 to-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-semibold text-steel-900">Carrito</span>
        </div>
        {totalItems > 0 && (
          <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{totalItems} ítem{totalItems !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Blocked — waiting for warehouse */}
      {pendingOrderNum ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
          <div className="h-14 w-14 rounded-full border-[3px] border-brand-400 border-t-transparent animate-spin mb-4" />
          <p className="text-base font-bold text-steel-900">{pendingOrderNum}</p>
          <p className="text-sm text-steel-500 mt-1">Esperando almacén...</p>
          <button
            onClick={onClearPending}
            className="mt-5 text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-brand-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva orden
          </button>
        </div>

      ) : cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-steel-100 to-steel-50 flex items-center justify-center mb-4 shadow-sm">
            <svg className="h-8 w-8 text-steel-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-steel-600">Carrito vacío</p>
          <p className="text-xs text-steel-400 mt-1">Busca productos arriba</p>
        </div>

      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.map(item => (
              <div key={item.producto.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-steel-50/50 border border-steel-100/80 hover:border-steel-200 transition-colors">
                {/* Imagen del producto */}
                <div className="w-14 h-14 rounded-lg bg-steel-100 border border-steel-200 shrink-0 overflow-hidden flex items-center justify-center">
                  {item.producto.imagen ? (
                    <img src={item.producto.imagen} alt={item.producto.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="h-6 w-6 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Código destacado */}
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-bold font-mono tracking-tight text-brand-700">
                      {item.producto.codigo_universal}
                    </span>
                    <span className="text-[11px] text-steel-400 line-clamp-1">{item.producto.marca}</span>
                  </div>
                  <p className="text-sm text-steel-700 line-clamp-1 leading-snug">{item.producto.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={clsx('text-xs', item.precioEspecial ? 'text-brand-600 font-semibold' : 'text-steel-400')}>
                      {fmtBs(item.precioEspecial ?? item.producto.precio_venta)} c/u
                    </p>
                    {item.precioEspecial && (
                      <span className="text-[10px] font-medium text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">
                        Precio especial
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-steel-900 tabular-nums">{fmtBs((item.precioEspecial ?? item.producto.precio_venta) * item.cantidad)}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onUpdateQty(item.producto.id, -1)}
                      className="h-7 w-7 rounded-lg border border-steel-200 flex items-center justify-center text-steel-600 hover:bg-steel-100 hover:border-steel-300 transition-colors text-sm font-bold leading-none">−</button>
                    <span className="w-8 text-center text-sm font-bold text-steel-900 tabular-nums">{item.cantidad}</span>
                    <button onClick={() => onUpdateQty(item.producto.id, 1)}
                      disabled={item.cantidad >= item.producto.stock}
                      className="h-7 w-7 rounded-lg border border-steel-200 flex items-center justify-center text-steel-600 hover:bg-steel-100 hover:border-steel-300 transition-colors text-sm font-bold leading-none disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                  </div>
                  <button onClick={() => onRemove(item.producto.id)}
                    className="text-steel-300 hover:text-red-500 transition-colors p-0.5 -mr-1" aria-label="Quitar">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-steel-100 bg-gradient-to-b from-white to-steel-50/30 space-y-3 shrink-0">
            <input type="text" value={nota} onChange={e => setNota(e.target.value)}
              placeholder="Nota para el almacén (opcional)"
              className="w-full px-3 py-2.5 text-sm border border-steel-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-steel-700 placeholder:text-steel-400" />

            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-semibold text-steel-600">Total</span>
              <span className="text-xl font-bold text-steel-900 tabular-nums">{fmtBs(total)}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="md" className="flex-1" onClick={onReservar}
                icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>}>
                Reservar
              </Button>
              <Button size="md" className="flex-[2]" onClick={onEmitir} loading={emitirLoading}
                icon={!emitirLoading ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg> : undefined}>
                Emitir orden
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── ListoBanner ─────────────────────────────────────────────────────────────

interface ListoBannerProps {
  ordenes: OrdenVenta[]
  onCobrar: (orden: OrdenVenta) => void
}

function ListoBanner({ ordenes, onCobrar }: ListoBannerProps) {
  if (ordenes.length === 0) return null

  return (
    <div className="mb-4 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-2 border-green-300 rounded-2xl px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm shrink-0">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-green-800">
              {ordenes.length === 1
                ? `${ordenes[0].numero} listo para cobrar`
                : `${ordenes.length} pedidos listos`}
            </p>
            <p className="text-xs text-green-600">
              {ordenes.length === 1 ? 'Haz clic para cobrar' : 'Selecciona una orden para cobrar'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          {ordenes.slice(0, 3).map(o => (
            <Button key={o.id} size="sm" onClick={() => onCobrar(o)}
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
              icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>}>
              Cobrar {ordenes.length > 1 ? o.numero : 'ahora'}
            </Button>
          ))}
          {ordenes.length > 3 && (
            <span className="text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-lg self-center">
              +{ordenes.length - 3} más
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ActiveOrdersSection ──────────────────────────────────────────────────────

interface ActiveOrdersSectionProps {
  ordenes: OrdenVenta[]
  alertMinutes: number
}

function ActiveOrdersSection({ ordenes, alertMinutes }: ActiveOrdersSectionProps) {
  const nonListo = ordenes.filter(o => o.estado !== 'listo')
  if (nonListo.length === 0) return null

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-5 rounded-md bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-steel-900">Órdenes activas</h3>
        <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{nonListo.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {nonListo.map(orden => {
          const hasFaltante = orden.items.some(i => i.estado === 'faltante')
          const isPendiente = orden.estado === 'pendiente'
          const isEnPrep    = orden.estado === 'en_preparacion'

          return (
            <div key={orden.id}
              className={clsx('shrink-0 w-56 rounded-2xl border-2 p-4 transition-all shadow-sm',
                hasFaltante ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300'
                : isEnPrep ? 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200'
                : 'bg-gradient-to-br from-white to-steel-50/50 border-steel-200')}>
              <div className="flex items-start justify-between mb-2.5 gap-2">
                <span className="text-base font-bold text-steel-900 font-mono tracking-tight">{orden.numero}</span>
                <OrderTimer creado_en={orden.creado_en} alertMinutes={alertMinutes} isPendiente={isPendiente} />
              </div>

              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <Badge color={ESTADO_COLOR[orden.estado]}>{ESTADO_LABEL[orden.estado]}</Badge>
                {hasFaltante && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    faltantes
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-steel-500">
                  {orden.items.length} ítem{orden.items.length !== 1 ? 's' : ''}
                </p>
                <p className="text-base font-bold text-steel-900 tabular-nums">{fmtBs(orden.total)}</p>
              </div>

              {isEnPrep && (
                <div className="flex items-center gap-2 bg-blue-100/50 px-2.5 py-1.5 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-semibold text-blue-700">Almacén preparando</span>
                </div>
              )}

              {isPendiente && (
                <div className="flex items-center gap-2 bg-steel-100 px-2.5 py-1.5 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-medium text-steel-500">Esperando almacén</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── CajaPage ─────────────────────────────────────────────────────────────────

export function CajaPage() {
  const { user, isTokenReady } = useAuth()

  // Multi-slot state (2 concurrent carts)
  const [activeSlot, setActiveSlot]     = useState<0 | 1>(0)
  const [slots, setSlots]               = useState<[CartSlot, CartSlot]>([EMPTY_SLOT, EMPTY_SLOT])

  // UI state
  const [search, setSearch]               = useState('')
  const [activeTab, setActiveTab]         = useState<'buscar' | 'carrito'>('buscar')
  const [reservaModalOpen, setReservaModal]     = useState(false)
  const [reservaDefaultCanal, setReservaCanal]  = useState<'presencial' | 'whatsapp'>('presencial')
  const [cobroModalOpen, setCobroModal]     = useState(false)
  const [selectedOrden, setSelectedOrden]   = useState<OrdenVenta | null>(null)
  const [facturaOrden, setFacturaOrden]     = useState<OrdenVenta | null>(null)
  const [emitirLoading, setEmitirLoading]   = useState(false)
  const [configOpen, setConfigOpen]         = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)

  // Track listo orders for sound notification
  const prevListoIdsRef = useRef<Set<string>>(new Set())

  // Stores
  const { productos, setProductos }                                                 = useInventarioStore()
  const { ordenes, reservas, config, addOrden, updateOrden, addReserva, setConfig } = useVentasStore()
  const { descuentos } = useConfigStore()

  useEffect(() => {
    if (!isTokenReady) return
    if (productos.length === 0) setProductos(MOCK_PRODUCTOS, MOCK_PRODUCTOS.length)
    // No cargar mocks de ordenes/reservas - usar datos persistidos del store
    if (config.tiempo_alerta_minutos === 10) setConfig(MOCK_CONFIG_VENTAS)
  }, [isTokenReady])   // eslint-disable-line react-hooks/exhaustive-deps

  // Active orders (mine or all for admin)
  const activeOrdenes = useMemo(() =>
    ordenes.filter(o =>
      ['pendiente', 'en_preparacion', 'listo'].includes(o.estado) &&
      (user?.rol === 'admin' || o.cajero_id === user?.id)
    ),
    [ordenes, user],
  )

  const listoOrdenes = useMemo(() =>
    activeOrdenes.filter(o => o.estado === 'listo'),
    [activeOrdenes],
  )

  // Sound + clear pending slot when order goes listo
  useEffect(() => {
    const listoIds = new Set(listoOrdenes.map(o => o.id))
    const newListo = listoOrdenes.filter(o => !prevListoIdsRef.current.has(o.id))
    if (newListo.length > 0) playBeep()
    prevListoIdsRef.current = listoIds

    // Clear pending slot when matching order is listo
    setSlots(prev => {
      const next: [CartSlot, CartSlot] = [{ ...prev[0] }, { ...prev[1] }]
      let changed = false
      for (let i = 0; i < 2; i++) {
        const pn = next[i as 0|1].pendingOrderNum
        if (pn && listoOrdenes.some(o => o.numero === pn)) {
          next[i as 0|1] = { ...next[i as 0|1], pendingOrderNum: null }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [listoOrdenes])

  const activeReservasCount = useMemo(() =>
    reservas.filter(r => r.estado === 'activa' && (user?.rol === 'admin' || r.cajero_id === user?.id)).length,
    [reservas, user],
  )

  const currentSlot = slots[activeSlot]
  const cartTotal   = useMemo(() => currentSlot.cart.reduce((s, i) => s + (i.precioEspecial ?? i.producto.precio_venta) * i.cantidad, 0), [currentSlot.cart])
  const cartItemCount = currentSlot.cart.reduce((s, i) => s + i.cantidad, 0)

  // Helpers to update slots
  const updateSlot = useCallback((idx: 0 | 1, update: Partial<CartSlot>) => {
    setSlots(prev => {
      const next: [CartSlot, CartSlot] = [{ ...prev[0] }, { ...prev[1] }]
      next[idx] = { ...next[idx], ...update }
      return next
    })
  }, [])

  // Search
  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return productos
      .filter(p =>
        p.estado !== 'descontinuado' && p.stock > 0 &&
        (p.codigo_universal.toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          p.marca.toLowerCase().includes(q) ||
          p.codigos_alternativos.some(c => c.toLowerCase().includes(q)))
      )
      .slice(0, 8)
  }, [productos, search])

  // Cart actions — operate on active slot
  const addToCart = useCallback((producto: Producto, cantidad: number = 1, precioEspecial?: number) => {
    const slot = slots[activeSlot]
    const existing = slot.cart.find(i => i.producto.id === producto.id)
    if (existing && existing.cantidad + cantidad > producto.stock) {
      notify.error('Stock máximo alcanzado')
      return
    }
    setSlots(prev => {
      const next: [CartSlot, CartSlot] = [{ ...prev[0] }, { ...prev[1] }]
      const s = { ...next[activeSlot] }
      if (existing) {
        s.cart = s.cart.map(i => i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i)
      } else {
        // Store special price if provided (we'll need to extend CartItem)
        s.cart = [...s.cart, { producto, cantidad, precioEspecial }]
      }
      next[activeSlot] = s
      return next
    })
    playBeep()
  }, [slots, activeSlot])

  const updateQty = useCallback((id: string, delta: number) => {
    setSlots(prev => {
      const next: [CartSlot, CartSlot] = [{ ...prev[0] }, { ...prev[1] }]
      next[activeSlot] = {
        ...next[activeSlot],
        cart: next[activeSlot].cart
          .map(i => i.producto.id === id ? { ...i, cantidad: i.cantidad + delta } : i)
          .filter(i => i.cantidad > 0),
      }
      return next
    })
  }, [activeSlot])

  const removeFromCart = useCallback((id: string) => {
    setSlots(prev => {
      const next: [CartSlot, CartSlot] = [{ ...prev[0] }, { ...prev[1] }]
      next[activeSlot] = { ...next[activeSlot], cart: next[activeSlot].cart.filter(i => i.producto.id !== id) }
      return next
    })
  }, [activeSlot])

  const clearPendingOrder = useCallback(() => {
    updateSlot(activeSlot, { pendingOrderNum: null })
  }, [activeSlot, updateSlot])

  // Emit order
  const handleEmitirOrden = async () => {
    if (currentSlot.cart.length === 0) return
    setEmitirLoading(true)
    await new Promise(r => setTimeout(r, 400))

    const orden: OrdenVenta = {
      id: crypto.randomUUID(),
      numero: `ORD-${String(ordenes.length + 1).padStart(3, '0')}`,
      cajero_id: user?.id ?? 'anon',
      cajero_nombre: user?.nombre ?? 'Cajero',
      items: currentSlot.cart.map(item => ({
        id: crypto.randomUUID(),
        producto_id: item.producto.id,
        producto_codigo: item.producto.codigo_universal,
        producto_nombre: item.producto.nombre,
        producto_ubicacion: item.producto.ubicacion,
        cantidad: item.cantidad,
        precio_unitario: item.precioEspecial ?? item.producto.precio_venta,
        subtotal: (item.precioEspecial ?? item.producto.precio_venta) * item.cantidad,
        estado: 'ok' as const,
      })),
      total: cartTotal,
      estado: 'pendiente',
      nota: currentSlot.nota || undefined,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    }

    addOrden(orden)
    updateSlot(activeSlot, { cart: [], nota: '', pendingOrderNum: orden.numero })
    setActiveTab('buscar')
    setEmitirLoading(false)
    notify.success(`${orden.numero} enviada al almacén`)
  }

  // Create reservation
  const handleCrearReserva = (form: ReservaForm) => {
    const reserva: Reserva = {
      id: crypto.randomUUID(),
      numero: `RES-${String(reservas.length + 1).padStart(3, '0')}`,
      cajero_id: user?.id ?? 'anon',
      cajero_nombre: user?.nombre ?? 'Cajero',
      cliente_nombre:   form.cliente_nombre   || undefined,
      cliente_telefono: form.cliente_telefono || undefined,
      canal: form.canal,
      items: currentSlot.cart.map(item => ({
        id: crypto.randomUUID(),
        producto_id: item.producto.id,
        producto_codigo: item.producto.codigo_universal,
        producto_nombre: item.producto.nombre,
        producto_ubicacion: item.producto.ubicacion,
        cantidad: item.cantidad,
        precio_unitario: item.precioEspecial ?? item.producto.precio_venta,
        subtotal: (item.precioEspecial ?? item.producto.precio_venta) * item.cantidad,
        estado: 'ok' as const,
      })),
      total: cartTotal,
      estado: 'activa',
      expira_en: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      nota: form.nota || undefined,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    }

    addReserva(reserva)
    updateSlot(activeSlot, { cart: [], nota: '' })
    setActiveTab('buscar')
    setReservaModal(false)
    notify.success(`Reserva ${reserva.numero} creada`)
  }

  // Open cobro modal
  const handleOpenCobro = (orden: OrdenVenta) => {
    setSelectedOrden(orden)
    setCobroModal(true)
  }

  // Confirm payment → show factura
  const handleConfirmarPago = (metodo: MetodoPago, montoRecibido?: number) => {
    if (!selectedOrden) return
    const pagado_en = new Date().toISOString()
    updateOrden(selectedOrden.id, { estado: 'pagado', metodo_pago: metodo, monto_recibido: montoRecibido, pagado_en })
    notify.success(`${selectedOrden.numero} — venta completada`)
    setCobroModal(false)
    // Show factura with updated data
    setFacturaOrden({ ...selectedOrden, estado: 'pagado', metodo_pago: metodo, monto_recibido: montoRecibido, pagado_en })
    setSelectedOrden(null)
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Caja"
          actions={
            <div className="flex items-center gap-2">
              {user?.rol === 'admin' && (
                <Button variant="secondary" size="sm" onClick={() => setConfigOpen(true)}
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>}>
                  Cronómetro
                </Button>
              )}
              <Button variant="secondary" size="sm"
                onClick={() => {
                  if (currentSlot.cart.length === 0) { notify.error('Carrito vacío'); return }
                  setReservaCanal('whatsapp')
                  setReservaModal(true)
                }}
                icon={<span className="text-base leading-none">📱</span>}>
                WhatsApp
              </Button>
              <Link to="/ventas/reservas">
                <Button variant="secondary" size="sm"
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>}>
                  Reservas{activeReservasCount > 0 ? ` (${activeReservasCount})` : ''}
                </Button>
              </Link>
            </div>
          }
        />

        {/* Listo banner */}
        <ListoBanner ordenes={listoOrdenes} onCobrar={handleOpenCobro} />

        {/* Mobile tabs */}
        <div className="flex sm:hidden border border-steel-200 rounded-lg p-0.5 mb-4 bg-steel-50">
          {(['buscar', 'carrito'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={clsx('flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                activeTab === tab ? 'bg-white text-steel-900 shadow-sm' : 'text-steel-500')}>
              {tab === 'buscar' ? 'Buscar' : (
                <span className="flex items-center justify-center gap-1.5">
                  Carrito
                  {cartItemCount > 0 && (
                    <span className="bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{cartItemCount}</span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Split panel */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
          <div className={clsx('flex-1 min-w-0', activeTab === 'carrito' ? 'hidden sm:block' : '')}>
            <SearchPanel search={search} setSearch={setSearch} results={searchResults} cart={currentSlot.cart} onSelectProduct={setProductoSeleccionado} onQuickAdd={addToCart} />
          </div>

          <div className={clsx('w-full sm:w-72 shrink-0 flex flex-col gap-2', activeTab === 'buscar' ? 'hidden sm:flex' : '')}>
            {/* Slot tabs */}
            <div className="flex bg-white rounded-xl border border-steel-200 p-1 gap-1">
              {([0, 1] as const).map(idx => {
                const s = slots[idx]
                const count = s.cart.reduce((acc, i) => acc + i.cantidad, 0)
                return (
                  <button key={idx} onClick={() => setActiveSlot(idx)}
                    className={clsx(
                      'flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1',
                      activeSlot === idx ? 'bg-brand-600 text-white' : 'text-steel-500 hover:bg-steel-50',
                    )}>
                    Cliente {idx + 1}
                    {s.pendingOrderNum && <span className="opacity-75">⏳</span>}
                    {count > 0 && (
                      <span className={clsx('text-xs px-1.5 rounded-full leading-none py-0.5',
                        activeSlot === idx ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700')}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <CartPanel
              cart={currentSlot.cart}
              total={cartTotal}
              nota={currentSlot.nota}
              pendingOrderNum={currentSlot.pendingOrderNum}
              setNota={nota => updateSlot(activeSlot, { nota })}
              onUpdateQty={updateQty}
              onRemove={removeFromCart}
              onReservar={() => { if (currentSlot.cart.length === 0) { notify.error('Carrito vacío'); return } setReservaCanal('presencial'); setReservaModal(true) }}
              onEmitir={() => void handleEmitirOrden()}
              emitirLoading={emitirLoading}
              onClearPending={clearPendingOrder}
            />
          </div>
        </div>

        {/* Active orders strip (non-listo only) */}
        <ActiveOrdersSection
          ordenes={activeOrdenes}
          alertMinutes={config.tiempo_alerta_minutos}
        />
      </PageContainer>

      <ReservaModal
        open={reservaModalOpen}
        defaultCanal={reservaDefaultCanal}
        onClose={() => setReservaModal(false)}
        itemCount={cartItemCount}
        total={cartTotal}
        onConfirm={handleCrearReserva}
      />

      <CobroModal
        open={cobroModalOpen}
        orden={selectedOrden}
        onClose={() => { setCobroModal(false); setSelectedOrden(null) }}
        onConfirm={handleConfirmarPago}
      />

      <FacturaModal
        open={!!facturaOrden}
        orden={facturaOrden}
        onClose={() => setFacturaOrden(null)}
      />

      <ProductDetailModal
        open={!!productoSeleccionado}
        producto={productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
        onAdd={addToCart}
        descuentos={descuentos}
      />

      <ConfigModal
        open={configOpen}
        config={config}
        onClose={() => setConfigOpen(false)}
        onSave={m => { setConfig({ ...config, tiempo_alerta_minutos: m }); notify.success(`Alerta: ${m} min`) }}
      />
    </MainLayout>
  )
}
