import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { useAuth } from '@/contexts/AuthContext'
import { useInventarioStore } from '@/stores/inventarioStore'
import { useVentasStore } from '@/stores/ventasStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button, Input, Badge } from '@/components/ui'
import { MOCK_PRODUCTOS } from '@/mock/inventario'
import { MOCK_ORDENES, MOCK_RESERVAS, MOCK_CONFIG_VENTAS } from '@/mock/ventas'
import type { Producto, OrdenVenta, Reserva, MetodoPago, CanalReserva } from '@/types'

// ─── Local types ──────────────────────────────────────────────────────────────

interface CartItem {
  producto: Producto
  cantidad: number
}

interface ReservaForm {
  canal: CanalReserva
  cliente_nombre: string
  cliente_telefono: string
  nota: string
}

const EMPTY_RESERVA: ReservaForm = { canal: 'presencial', cliente_nombre: '', cliente_telefono: '', nota: '' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBs(n: number) {
  return `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

// ─── CobroModal ───────────────────────────────────────────────────────────────

interface CobroModalProps {
  open: boolean
  orden: OrdenVenta | null
  onClose: () => void
  onConfirm: (metodo: MetodoPago, montoRecibido?: number) => void
}

const METODOS_PAGO: { id: MetodoPago; label: string; icon: string }[] = [
  { id: 'efectivo',      label: 'Efectivo',   icon: '💵' },
  { id: 'tarjeta',       label: 'Tarjeta',    icon: '💳' },
  { id: 'transferencia', label: 'Transf.',    icon: '🏦' },
  { id: 'qr',            label: 'QR',         icon: '📱' },
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
        {/* Backdrop */}
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
                  <div className="grid grid-cols-4 gap-2">
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
  onConfirm: (form: ReservaForm) => void
}

function ReservaModal({ open, onClose, itemCount, total, onConfirm }: ReservaModalProps) {
  const [form, setForm]     = useState<ReservaForm>(EMPTY_RESERVA)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!open) return; setForm(EMPTY_RESERVA); setSaving(false) }, [open])

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
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-steel-100">
                <DialogTitle className="text-base font-semibold text-steel-900">Nueva reserva</DialogTitle>
                <button onClick={onClose} className="p-1.5 rounded-lg text-steel-400 hover:text-steel-600 hover:bg-steel-100 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-5 flex-1 space-y-4">
                {/* Summary */}
                <div className="flex items-center justify-between px-4 py-3 bg-brand-50 rounded-xl border border-brand-100">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="text-sm font-medium text-steel-700">{itemCount} producto{itemCount !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-bold text-steel-900">{fmtBs(total)}</span>
                </div>

                {/* Canal */}
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

              {/* Footer */}
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

// ─── SearchPanel ──────────────────────────────────────────────────────────────

interface SearchPanelProps {
  search: string
  setSearch: (v: string) => void
  results: Producto[]
  cart: CartItem[]
  onAdd: (p: Producto) => void
}

function SearchPanel({ search, setSearch, results, cart, onAdd }: SearchPanelProps) {
  const cartMap = useMemo(() => {
    const m: Record<string, number> = {}
    cart.forEach(i => { m[i.producto.id] = i.cantidad })
    return m
  }, [cart])

  return (
    <div className="bg-white rounded-xl border border-steel-200 shadow-sm flex flex-col min-h-[420px]">
      <div className="p-4 border-b border-steel-100">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Código, nombre o marca del producto..."
            autoFocus
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-steel-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-300 hover:text-steel-500 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4">
        {!search.trim() ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="h-14 w-14 rounded-full bg-steel-100 flex items-center justify-center mb-3">
              <svg className="h-7 w-7 text-steel-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-steel-500">Busca un producto</p>
            <p className="text-xs text-steel-300 mt-1">Código, nombre, marca o escanea el código de barras</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <p className="text-sm text-steel-500">Sin resultados para "<strong>{search}</strong>"</p>
            <p className="text-xs text-steel-400 mt-1">Intenta con otro código o nombre</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-steel-400 mb-3">{results.length} resultado{results.length !== 1 ? 's' : ''}</p>
            {results.map(p => {
              const inCart = cartMap[p.id] ?? 0
              const stockOk = p.stock > p.stock_minimo
              return (
                <div key={p.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-steel-100 hover:border-brand-200 hover:bg-brand-50/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-semibold text-brand-600">{p.codigo_universal}</span>
                      <span className="text-xs text-steel-400 truncate">{p.marca}</span>
                    </div>
                    <p className="text-sm font-medium text-steel-900 leading-snug truncate">{p.nombre}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-steel-400">📦 {p.ubicacion}</span>
                      <span className={clsx('text-xs font-medium', stockOk ? 'text-green-600' : 'text-yellow-600')}>
                        {p.stock} en stock
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-steel-900">{fmtBs(p.precio_venta)}</span>
                    {inCart > 0 && (
                      <span className="text-xs text-brand-600 font-medium">En carrito ({inCart})</span>
                    )}
                    <Button size="sm" variant={inCart > 0 ? 'secondary' : 'primary'}
                      onClick={() => onAdd(p)}
                      icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>}>
                      Agregar
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
  setNota: (v: string) => void
  onUpdateQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onReservar: () => void
  onEmitir: () => void
  emitirLoading: boolean
}

function CartPanel({ cart, total, nota, setNota, onUpdateQty, onRemove, onReservar, onEmitir, emitirLoading }: CartPanelProps) {
  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0)

  return (
    <div className="bg-white rounded-xl border border-steel-200 shadow-sm flex flex-col h-full min-h-[420px]">
      <div className="px-4 py-3 border-b border-steel-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-steel-900">Carrito</span>
        {totalItems > 0 && (
          <span className="text-xs text-steel-400">{totalItems} ítem{totalItems !== 1 ? 's' : ''}</span>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
          <div className="h-14 w-14 rounded-full bg-steel-100 flex items-center justify-center mb-3">
            <svg className="h-7 w-7 text-steel-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-steel-500">Carrito vacío</p>
          <p className="text-xs text-steel-300 mt-1">Busca y agrega productos</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.map(item => (
              <div key={item.producto.id} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-steel-900 leading-snug">{item.producto.nombre}</p>
                  <p className="text-xs text-steel-400 font-mono">{item.producto.codigo_universal}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onUpdateQty(item.producto.id, -1)}
                    className="h-6 w-6 rounded border border-steel-200 flex items-center justify-center text-steel-500 hover:bg-steel-50 transition-colors text-sm leading-none">−</button>
                  <span className="w-7 text-center text-sm font-semibold text-steel-900 tabular-nums">{item.cantidad}</span>
                  <button onClick={() => onUpdateQty(item.producto.id, 1)}
                    disabled={item.cantidad >= item.producto.stock}
                    className="h-6 w-6 rounded border border-steel-200 flex items-center justify-center text-steel-500 hover:bg-steel-50 transition-colors text-sm leading-none disabled:opacity-30">+</button>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className="text-sm font-semibold text-steel-900">{fmtBs(item.producto.precio_venta * item.cantidad)}</span>
                  <button onClick={() => onRemove(item.producto.id)}
                    className="text-steel-200 hover:text-red-400 transition-colors" aria-label="Quitar">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-steel-100 space-y-3">
            <input type="text" value={nota} onChange={e => setNota(e.target.value)}
              placeholder="Nota para el almacén (opcional)"
              className="w-full px-3 py-2 text-sm border border-steel-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-steel-700 placeholder:text-steel-300" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-steel-700">Total</span>
              <span className="text-lg font-bold text-steel-900">{fmtBs(total)}</span>
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

// ─── ActiveOrdersSection ──────────────────────────────────────────────────────

interface ActiveOrdersSectionProps {
  ordenes: OrdenVenta[]
  alertMinutes: number
  onCobrar: (orden: OrdenVenta) => void
}

function ActiveOrdersSection({ ordenes, alertMinutes, onCobrar }: ActiveOrdersSectionProps) {
  if (ordenes.length === 0) return null

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-steel-900">Órdenes activas</h3>
        <span className="text-xs bg-steel-100 text-steel-600 px-2 py-0.5 rounded-full font-medium">{ordenes.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {ordenes.map(orden => {
          const hasFaltante = orden.items.some(i => i.estado === 'faltante')
          const isListo = orden.estado === 'listo'
          const isPendiente = orden.estado === 'pendiente'
          const isEnPrep = orden.estado === 'en_preparacion'

          return (
            <div key={orden.id}
              className={clsx('shrink-0 w-56 rounded-xl border p-4 transition-all',
                isListo ? 'bg-green-50 border-green-200 shadow-sm'
                  : hasFaltante ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-white border-steel-200')}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <span className="text-sm font-bold text-steel-900">{orden.numero}</span>
                <OrderTimer creado_en={orden.creado_en} alertMinutes={alertMinutes} isPendiente={isPendiente} />
              </div>

              <div className="mb-3">
                <Badge color={ESTADO_COLOR[orden.estado]}>{ESTADO_LABEL[orden.estado]}</Badge>
                {hasFaltante && <span className="ml-1.5 text-xs text-yellow-600 font-medium">⚠ faltantes</span>}
              </div>

              <p className="text-xs text-steel-400 mb-1">
                {orden.items.length} ítem{orden.items.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm font-bold text-steel-900 mb-3">{fmtBs(orden.total)}</p>

              {isListo && (
                <Button size="sm" className="w-full"
                  icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>}
                  onClick={() => onCobrar(orden)}>
                  Cobrar
                </Button>
              )}

              {isEnPrep && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                  <span className="text-xs text-brand-600">Almacén preparando...</span>
                </div>
              )}

              {isPendiente && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-xs text-steel-400">Esperando almacén...</span>
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

  // Local state
  const [search, setSearch]                 = useState('')
  const [cart, setCart]                     = useState<CartItem[]>([])
  const [nota, setNota]                     = useState('')
  const [activeTab, setActiveTab]           = useState<'buscar' | 'carrito'>('buscar')
  const [reservaModalOpen, setReservaModal] = useState(false)
  const [cobroModalOpen, setCobroModal]     = useState(false)
  const [selectedOrden, setSelectedOrden]   = useState<OrdenVenta | null>(null)
  const [emitirLoading, setEmitirLoading]   = useState(false)

  // Stores
  const { productos, setProductos }                                                 = useInventarioStore()
  const { ordenes, reservas, config, setOrdenes, setReservas, addOrden, updateOrden, addReserva, setConfig } = useVentasStore()

  useEffect(() => {
    if (!isTokenReady) return
    if (productos.length === 0) setProductos(MOCK_PRODUCTOS, MOCK_PRODUCTOS.length)
    if (ordenes.length === 0) setOrdenes(MOCK_ORDENES)
    if (reservas.length === 0) setReservas(MOCK_RESERVAS)
    setConfig(MOCK_CONFIG_VENTAS)
  }, [isTokenReady])   // eslint-disable-line react-hooks/exhaustive-deps

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

  // Active orders (mine or all for admin)
  const activeOrdenes = useMemo(() =>
    ordenes.filter(o =>
      ['pendiente', 'en_preparacion', 'listo'].includes(o.estado) &&
      (user?.rol === 'admin' || o.cajero_id === user?.id)
    ),
    [ordenes, user],
  )

  const activeReservasCount = useMemo(() =>
    reservas.filter(r => r.estado === 'activa' && (user?.rol === 'admin' || r.cajero_id === user?.id)).length,
    [reservas, user],
  )

  const cartTotal     = useMemo(() => cart.reduce((s, i) => s + i.producto.precio_venta * i.cantidad, 0), [cart])
  const cartItemCount = cart.reduce((s, i) => s + i.cantidad, 0)

  // Cart actions
  const addToCart = useCallback((producto: Producto) => {
    setCart(prev => {
      const existing = prev.find(i => i.producto.id === producto.id)
      if (existing) {
        if (existing.cantidad >= producto.stock) { toast.error('Stock máximo alcanzado'); return prev }
        return prev.map(i => i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }, [])

  const updateQty = useCallback((id: string, delta: number) =>
    setCart(prev => prev.map(i => i.producto.id === id ? { ...i, cantidad: i.cantidad + delta } : i).filter(i => i.cantidad > 0)),
    [],
  )

  const removeFromCart = useCallback((id: string) =>
    setCart(prev => prev.filter(i => i.producto.id !== id)), [])

  // Emit order
  const handleEmitirOrden = async () => {
    if (cart.length === 0) return
    setEmitirLoading(true)
    await new Promise(r => setTimeout(r, 400))

    const orden: OrdenVenta = {
      id: crypto.randomUUID(),
      numero: `ORD-${String(ordenes.length + 1).padStart(3, '0')}`,
      cajero_id: user?.id ?? 'anon',
      cajero_nombre: user?.nombre ?? 'Cajero',
      items: cart.map(item => ({
        id: crypto.randomUUID(),
        producto_id: item.producto.id,
        producto_codigo: item.producto.codigo_universal,
        producto_nombre: item.producto.nombre,
        producto_ubicacion: item.producto.ubicacion,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio_venta,
        subtotal: item.producto.precio_venta * item.cantidad,
        estado: 'ok' as const,
      })),
      total: cartTotal,
      estado: 'pendiente',
      nota: nota || undefined,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    }

    addOrden(orden)
    setCart([])
    setNota('')
    setActiveTab('buscar')
    setEmitirLoading(false)
    toast.success(`${orden.numero} enviada al almacén`)
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
      items: cart.map(item => ({
        id: crypto.randomUUID(),
        producto_id: item.producto.id,
        producto_codigo: item.producto.codigo_universal,
        producto_nombre: item.producto.nombre,
        producto_ubicacion: item.producto.ubicacion,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio_venta,
        subtotal: item.producto.precio_venta * item.cantidad,
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
    setCart([])
    setNota('')
    setActiveTab('buscar')
    setReservaModal(false)
    toast.success(`Reserva ${reserva.numero} creada`)
  }

  // Confirm payment
  const handleConfirmarPago = (metodo: MetodoPago, montoRecibido?: number) => {
    if (!selectedOrden) return
    updateOrden(selectedOrden.id, {
      estado: 'pagado',
      metodo_pago: metodo,
      monto_recibido: montoRecibido,
      pagado_en: new Date().toISOString(),
    })
    toast.success(`${selectedOrden.numero} — venta completada`)
    setCobroModal(false)
    setSelectedOrden(null)
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Caja"
          actions={
            <Link to="/ventas/reservas">
              <Button variant="secondary" size="sm"
                icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>}>
                Reservas{activeReservasCount > 0 ? ` (${activeReservasCount})` : ''}
              </Button>
            </Link>
          }
        />

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
            <SearchPanel search={search} setSearch={setSearch} results={searchResults} cart={cart} onAdd={addToCart} />
          </div>
          <div className={clsx('w-full sm:w-72 shrink-0', activeTab === 'buscar' ? 'hidden sm:block' : '')}>
            <CartPanel
              cart={cart} total={cartTotal} nota={nota} setNota={setNota}
              onUpdateQty={updateQty} onRemove={removeFromCart}
              onReservar={() => { if (cart.length === 0) { toast.error('Carrito vacío'); return } setReservaModal(true) }}
              onEmitir={() => void handleEmitirOrden()}
              emitirLoading={emitirLoading}
            />
          </div>
        </div>

        {/* Active orders strip */}
        <ActiveOrdersSection
          ordenes={activeOrdenes}
          alertMinutes={config.tiempo_alerta_minutos}
          onCobrar={orden => { setSelectedOrden(orden); setCobroModal(true) }}
        />
      </PageContainer>

      <ReservaModal
        open={reservaModalOpen}
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
    </MainLayout>
  )
}
