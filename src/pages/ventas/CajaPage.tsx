import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button, Input, Modal } from '@/components/ui'
import { notify } from '@/lib/notify'
import { useInventarioStore } from '@/stores/inventarioStore'
import { useVentasStore } from '@/stores/ventasStore'
import { useSoundAlert } from '@/hooks/useSoundAlert'
import type { Producto, OrdenVenta, ItemOrden, MetodoPago, EstadoOrden } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtTimeSince = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'ahora'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const ESTADO_ORDEN_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  pendiente:      { label: 'Pendiente',     cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  en_preparacion: { label: 'Preparando',    cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  listo:          { label: 'Listo',         cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  pagado:         { label: 'Pagado',        cls: 'bg-steel-100 text-steel-500', dot: 'bg-steel-400' },
  cancelado:      { label: 'Cancelado',     cls: 'bg-red-100 text-red-500', dot: 'bg-red-400' },
}

// ─── Cart types ───────────────────────────────────────────────────────────────

interface CartItem {
  producto_id: string
  producto_codigo: string
  producto_nombre: string
  producto_ubicacion: string
  cantidad: number
  precio_unitario: number
  producto_imagen?: string
}

interface Cart {
  items: CartItem[]
  nota: string
}

const emptyCart = (): Cart => ({ items: [], nota: '' })

// ─── FlyingBall ────────────────────────────────────────────────────────────────

interface FlyingBallProps {
  fromRect: DOMRect | null
  toRect: DOMRect | null
  itemCount: number
  onComplete: () => void
}

function FlyingBall({ fromRect, toRect, itemCount, onComplete }: FlyingBallProps) {
  useEffect(() => {
    if (!fromRect || !toRect) return
    const t = setTimeout(onComplete, 800)
    return () => clearTimeout(t)
  }, [fromRect, toRect, onComplete])

  if (!fromRect || !toRect) return null

  const startX = fromRect.left + fromRect.width / 2
  const startY = fromRect.top + fromRect.height / 2
  const deltaX = toRect.left + toRect.width / 2 - startX
  const deltaY = toRect.top + toRect.height / 2 - startY

  return (
    <div
      className="fixed z-[100] pointer-events-none"
      style={{ left: startX, top: startY }}
    >
      <div
        className="relative"
        style={{
          animation: `flyToOrder 0.8s cubic-bezier(0.2, 0, 0.8, 1) forwards`,
        }}
      >
        <div
          className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 shadow-xl flex items-center justify-center text-white font-black text-lg relative"
          style={{
            boxShadow: '0 0 0 4px rgba(200, 16, 46, 0.3), 0 0 20px rgba(200, 16, 46, 0.5)',
          }}
        >
          <span className="relative z-10">{itemCount}</span>
          <div className="absolute inset-0 rounded-full bg-brand-400 animate-ping opacity-30" />
        </div>
        <svg
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-500"
          style={{ animation: 'dash 0.2s ease-in-out infinite' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
      <div
        className="absolute w-3 h-3 rounded-full bg-brand-400 opacity-40"
        style={{ animation: 'trail 0.3s ease-out infinite alternate' }}
      />
      <style>{`
        @keyframes flyToOrder {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          15% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
          50% { transform: translate(calc(-50% + ${deltaX * 0.5}px), calc(-50% + ${deltaY * 0.5}px)) scale(1.1); }
          80% { transform: translate(calc(-50% + ${deltaX * 0.9}px), calc(-50% + ${deltaY * 0.9}px)) scale(1.05); }
          100% { transform: translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(0); opacity: 0; }
        }
        @keyframes trail {
          0% { transform: translate(-50%, -50%) scale(1); }
          100% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── ProductSearch ─────────────────────────────────────────────────────────────

function ProductSearch({ onAddToCart }: { onAddToCart: (producto: Producto) => void }) {
  const productos = useInventarioStore(s => s.productos)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const resultados = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return productos
      .filter(p =>
        p.estado !== 'descontinuado' &&
        (p.codigo_universal.toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          p.marca.toLowerCase().includes(q) ||
          p.codigos_alternativos.some(c => c.toLowerCase().includes(q)))
      )
      .slice(0, 10)
  }, [query, productos])

  const stockDisponible = (p: Producto) => Math.max(0, p.stock - (p.stock_reservado ?? 0))

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 border-b border-steel-100">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por código, nombre o marca..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-steel-50 border border-steel-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-steel-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {query.trim() === '' ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <svg className="h-10 w-10 text-steel-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm text-steel-400">Escribe para buscar productos</p>
          </div>
        ) : resultados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-sm text-steel-500 font-medium">Sin resultados</p>
            <p className="text-xs text-steel-400 mt-1">"{query}"</p>
          </div>
        ) : (
          <div className="divide-y divide-steel-50">
            {resultados.map(p => {
              const disp = stockDisponible(p)
              const stockCls = disp === 0 ? 'text-red-500' : disp <= p.stock_minimo ? 'text-amber-500' : 'text-emerald-600'
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-steel-50 transition-colors group">
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} className="h-10 w-10 rounded-lg object-cover bg-steel-100 border border-steel-100 shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-steel-100 border border-steel-100 shrink-0 flex items-center justify-center">
                      <svg className="h-5 w-5 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-steel-800 truncate">{p.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-steel-400">{p.codigo_universal}</span>
                      {p.marca && <span className="text-[11px] text-steel-400">· {p.marca}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[11px] font-semibold ${stockCls}`}>{disp} disponibles</span>
                      {p.ubicacion && <span className="text-[11px] text-steel-400">📦 {p.ubicacion}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-steel-900">{fmtBs(p.precio_venta)}</span>
                    <button
                      onClick={() => onAddToCart(p)}
                      disabled={disp === 0}
                      className={clsx('h-7 w-7 rounded-lg flex items-center justify-center transition-all', disp === 0 ? 'bg-steel-100 text-steel-300 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 opacity-0 group-hover:opacity-100')}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
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
  cart: Cart
  onQtyChange: (itemIdx: number, delta: number) => void
  onRemoveItem: (itemIdx: number) => void
  onNotaChange: (nota: string) => void
  onEmitir: () => void
  emitButtonRef?: (el: HTMLButtonElement | null) => void
}

function CartPanel({ cart, onQtyChange, onRemoveItem, onNotaChange, onEmitir, emitButtonRef }: CartPanelProps) {
  const productos = useInventarioStore(s => s.productos)
  const stockDisponible = (id: string) => {
    const p = productos.find(x => x.id === id)
    return p ? Math.max(0, p.stock - (p.stock_reservado ?? 0)) : 0
  }
  const total = cart.items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-steel-100 shrink-0">
        <p className="text-[10px] font-bold text-steel-400 uppercase tracking-widest">Carrito de venta</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <svg className="h-12 w-12 text-steel-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm text-steel-400">Carrito vacío</p>
            <p className="text-xs text-steel-400 mt-1">Agrega productos desde la búsqueda</p>
          </div>
        ) : (
          <div className="divide-y divide-steel-50">
            {cart.items.map((item, idx) => {
              const disp = stockDisponible(item.producto_id)
              return (
                <div key={item.producto_id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {item.producto_imagen ? (
                      <img src={item.producto_imagen} alt={item.producto_nombre} className="h-12 w-12 rounded-lg object-cover bg-steel-100 border shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-steel-100 border shrink-0 flex items-center justify-center">
                        <svg className="h-5 w-5 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-steel-800 leading-tight">{item.producto_nombre}</p>
                      <p className="text-[11px] font-mono text-steel-400 mt-0.5">{item.producto_codigo}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => onQtyChange(idx, -1)} className="h-7 w-7 rounded-lg border border-steel-200 text-steel-600 hover:bg-steel-100 flex items-center justify-center text-base font-bold transition-colors">−</button>
                          <span className="w-10 text-center text-sm font-bold text-steel-800">{item.cantidad}</span>
                          <button onClick={() => onQtyChange(idx, +1)} disabled={item.cantidad >= disp} className={clsx('h-7 w-7 rounded-lg border flex items-center justify-center text-base font-bold transition-colors', item.cantidad >= disp ? 'border-steel-100 text-steel-300 cursor-not-allowed' : 'border-steel-200 text-steel-600 hover:bg-steel-100')}>+</button>
                        </div>
                        <span className="text-sm font-bold text-steel-900">{fmtBs(item.precio_unitario * item.cantidad)}</span>
                      </div>
                    </div>
                    <button onClick={() => onRemoveItem(idx)} className="text-steel-300 hover:text-red-500 transition-colors shrink-0">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {cart.items.length > 0 && (
        <div className="border-t border-steel-100 px-4 py-3 space-y-3 shrink-0">
          <input type="text" value={cart.nota} onChange={e => onNotaChange(e.target.value)} placeholder="Nota para almacén (opcional)" className="w-full text-xs px-3 py-2.5 bg-steel-50 border border-steel-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-steel-400" maxLength={100} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-steel-400 uppercase tracking-widest">Total</p>
              <p className="text-xl font-black text-steel-900 tabular-nums">{fmtBs(total)}</p>
            </div>
            <Button ref={emitButtonRef} onClick={onEmitir} className="px-6">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Emitir orden
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── OrdersModal ───────────────────────────────────────────────────────────────

function OrdersModal({
  ordenes,
  canceladas,
  onCobrar,
  onCancelar,
  open,
  onClose,
}: {
  ordenes: OrdenVenta[]
  canceladas?: OrdenVenta[]
  onCobrar: (o: OrdenVenta) => void
  onCancelar: (o: OrdenVenta) => void
  open: boolean
  onClose: () => void
}) {
  const [showCanceladas, setShowCanceladas] = useState(false)
  const listos = ordenes.filter(o => o.estado === 'listo')
  const otras = ordenes.filter(o => o.estado !== 'listo' && o.estado !== 'pagado' && o.estado !== 'cancelado')

  return (
    <Modal open={open} onClose={onClose} title="Órdenes activas" size="lg">
      <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto">
        {listos.length > 0 && (
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" />
              Listas para cobrar
            </p>
            <div className="space-y-2">
              {listos.map(o => (
                <div key={o.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">{o.numero.replace('ORD-', '')}</div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">{o.numero}</p>
                      <p className="text-xs text-emerald-600">{o.items.length} prod. · {fmtBs(o.total)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { onCobrar(o); onClose() }} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors">Cobrar</button>
                    <button onClick={() => { onCancelar(o); onClose() }} className="p-1.5 text-steel-400 hover:text-red-500">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {otras.length > 0 && (
          <div>
            <p className="text-xs font-bold text-steel-400 uppercase tracking-wide mb-2">En proceso</p>
            <div className="space-y-2">
              {otras.map(o => {
                const cfg = ESTADO_ORDEN_CONFIG[o.estado]
                const tieneFaltantes = o.items.some(i => i.estado === 'faltante')
                return (
                  <div key={o.id} className={clsx('flex items-center justify-between px-4 py-3 rounded-xl border', tieneFaltantes ? 'bg-amber-50 border-amber-200' : 'bg-white border-steel-100')}>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.cls}`}>{cfg.label}</span>
                      <div>
                        <p className="text-sm font-semibold text-steel-700">{o.numero}</p>
                        <p className="text-xs text-steel-400">{o.items.length} prod. · {fmtBs(o.total)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tieneFaltantes && <span className="text-[10px] font-bold text-amber-600">⚠ faltantes</span>}
                      <span className="text-[10px] text-steel-400">{fmtTimeSince(o.creado_en)}</span>
                      <button onClick={() => { onCancelar(o); onClose() }} className="p-1.5 text-steel-400 hover:text-red-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {ordenes.length === 0 && (
          <div className="text-center py-8">
            <svg className="h-12 w-12 text-steel-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-steel-500">No hay órdenes activas</p>
          </div>
        )}

        {canceladas && canceladas.length > 0 && (
          <div className="border-t border-steel-200 pt-4">
            <button
              onClick={() => setShowCanceladas(!showCanceladas)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-steel-50 transition-colors"
            >
              <span className="text-xs font-bold text-steel-400 uppercase tracking-wide flex items-center gap-2">
                <svg className={clsx('h-4 w-4 transition-transform', showCanceladas && 'rotate-90')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Canceladas ({canceladas.length})
              </span>
            </button>
            {showCanceladas && (
              <div className="space-y-2 mt-2">
                {canceladas.map(o => (
                  <div key={o.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red-700">{o.numero}</p>
                        <p className="text-xs text-red-400">{o.items.length} prod. · {fmtBs(o.total)}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-red-400">{fmtTimeSince(o.creado_en)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function PickingParcialModal({ orden, onPartial, onCancelar, onClose }: { orden: OrdenVenta; onPartial: () => void; onCancelar: () => void; onClose: () => void }) {
  const completos = orden.items.filter(i => i.estado === 'completo' || i.estado === 'parcial')
  const faltantes = orden.items.filter(i => i.estado === 'faltante')
  return (
    <Modal open onClose={onClose} title="Orden con faltantes">
      <div className="space-y-4 pt-1">
        <p className="text-sm text-steel-500">Esta orden tiene productos no encontrados. ¿Cómo procedes?</p>
        {completos.length > 0 && (
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">✓ Encontrados ({completos.length})</p>
            <div className="space-y-1">{completos.map(i => (
              <div key={i.id} className="flex justify-between text-sm px-3 py-1.5 bg-emerald-50 rounded-lg">
                <span className="text-steel-700 truncate mr-2">{i.producto_nombre}</span>
                <span className="text-emerald-700 font-semibold">×{i.cantidad_recogida ?? i.cantidad_pedida}</span>
              </div>
            ))}</div>
          </div>
        )}
        {faltantes.length > 0 && (
          <div>
            <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">✕ Faltantes ({faltantes.length})</p>
            <div className="space-y-1">{faltantes.map(i => (
              <div key={i.id} className="flex justify-between text-sm px-3 py-1.5 bg-red-50 rounded-lg">
                <span className="text-steel-700 truncate mr-2">{i.producto_nombre}</span>
                <span className="text-red-500 font-semibold">×{i.cantidad_pedida}</span>
              </div>
            ))}</div>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onCancelar}>Cancelar orden</Button>
          <Button className="flex-1" onClick={onPartial}>Entregar parcial</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Cancelar Orden Modal ───────────────────────────────────────────────────────

function CancelarOrdenModal({
  orden,
  onConfirm,
  onClose,
}: {
  orden: OrdenVenta
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal open onClose={onClose} title={`Cancelar ${orden.numero}`} size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700">¿Cancelar esta orden?</p>
            <p className="text-xs text-red-600 mt-0.5">El stock reservado será liberado. Esta acción no se puede deshacer.</p>
          </div>
        </div>

        <div className="rounded-xl border border-steel-200 overflow-hidden">
          <div className="px-4 py-2 bg-steel-50 border-b border-steel-200 flex items-center justify-between">
            <span className="text-xs font-bold text-steel-500">PRODUCTOS</span>
            <span className="text-xs text-steel-400">{orden.items.length} items · {fmtBs(orden.total)}</span>
          </div>
          <div className="divide-y divide-steel-100 max-h-48 overflow-y-auto">
            {orden.items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-steel-400 bg-steel-50 px-1.5 py-0.5 rounded shrink-0">{item.producto_codigo}</span>
                  <span className="text-xs text-steel-700 truncate">{item.producto_nombre}</span>
                </div>
                <span className="text-xs font-semibold text-steel-600 ml-2 shrink-0">×{item.cantidad_pedida}</span>
              </div>
            ))}
          </div>
        </div>

        {orden.nota && (
          <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-600"><span className="font-semibold">Nota:</span> {orden.nota}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Mantener orden</Button>
        <Button variant="danger" className="flex-1" onClick={onConfirm}>Sí, cancelar</Button>
      </div>
    </Modal>
  )
}

// ─── Cobro Modal ───────────────────────────────────────────────────────────────

function CobroModal({ orden, onConfirm, onClose }: { orden: OrdenVenta; onConfirm: (metodo: MetodoPago, monto: number) => void; onClose: () => void }) {
  const itemsDespachados = orden.items.filter(i => i.estado === 'completo' || i.estado === 'parcial')
  const itemsFaltantes = orden.items.filter(i => i.estado === 'faltante')
  const totalReal = itemsDespachados.reduce((s, i) => s + (i.precio_unitario * (i.cantidad_recogida ?? i.cantidad_pedida)), 0)
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [montoStr, setMontoStr] = useState(totalReal.toFixed(2))
  const monto = parseFloat(montoStr.replace(',', '.'))
  const cambio = metodo === 'efectivo' && !isNaN(monto) ? monto - totalReal : null
  const handleConfirm = () => {
    const m = parseFloat(montoStr.replace(',', '.'))
    if (metodo === 'efectivo' && (isNaN(m) || m < totalReal)) { notify.error('Monto insuficiente'); return }
    onConfirm(metodo, isNaN(m) ? totalReal : m)
  }
  const METODOS: { value: MetodoPago; label: string; icon: React.ReactNode }[] = [
    { value: 'efectivo', label: 'Efectivo', icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.657 0-3-.895-3-2s1.343-2 3-2 3 .895 3 2-1.343 2-3 2m0-1v-1m0 1v1m0 1v1M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
      </svg>
    )},
    { value: 'tarjeta', label: 'Tarjeta', icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )},
    { value: 'qr', label: 'QR', icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    )},
  ]
  return (
    <Modal open onClose={onClose} title={`Cobrar ${orden.numero}`}>
      <div className="space-y-4 pt-1">
        <div className="space-y-1">
          {itemsDespachados.map(i => (
            <div key={i.id} className="flex justify-between text-sm gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-steel-700 truncate">{i.producto_nombre}</p>
                <p className="text-[10px] font-mono text-steel-400">{i.producto_codigo} · ×{i.cantidad_recogida ?? i.cantidad_pedida}</p>
              </div>
              <span className="font-semibold text-steel-800 shrink-0">{fmtBs(i.precio_unitario * (i.cantidad_recogida ?? i.cantidad_pedida))}</span>
            </div>
          ))}
          {itemsFaltantes.map(i => (
            <div key={i.id} className="flex justify-between text-sm gap-2 opacity-50">
              <div className="flex-1 min-w-0">
                <p className="text-steel-400 truncate line-through">{i.producto_nombre}</p>
                <p className="text-[10px] font-mono text-steel-300">{i.producto_codigo} · ×{i.cantidad_pedida}</p>
              </div>
              <span className="text-steel-400 shrink-0">N/A</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-steel-100 mt-2">
            <span className="text-sm font-bold text-steel-700">Total</span>
            <span className="text-lg font-black text-steel-900">{fmtBs(totalReal)}</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-2">Método de pago</p>
          <div className="grid grid-cols-3 gap-2">
            {METODOS.map(m => (
              <button key={m.value} onClick={() => setMetodo(m.value)} className={clsx('py-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-1', metodo === m.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-steel-100 text-steel-500 hover:border-steel-300')}>
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {metodo === 'efectivo' && (
          <div>
            <label className="block text-xs font-bold text-steel-500 uppercase tracking-widest mb-1.5">Monto recibido (Bs)</label>
            <Input type="number" min={totalReal} step="0.50" value={montoStr} onChange={e => setMontoStr(e.target.value)} autoFocus />
            {cambio !== null && cambio >= 0 && <p className="text-sm font-bold text-emerald-600 mt-2">Cambio: {fmtBs(cambio)}</p>}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleConfirm}>Confirmar pago</Button>
        </div>
      </div>
    </Modal>
  )
}

function FacturaModal({ orden, onClose }: { orden: OrdenVenta; onClose: () => void }) {
  const itemsDespachados = orden.items.filter(i => i.estado === 'completo' || i.estado === 'parcial')
  const itemsFaltantes = orden.items.filter(i => i.estado === 'faltante')
  const totalReal = itemsDespachados.reduce((s, i) => s + i.precio_unitario * (i.cantidad_recogida ?? i.cantidad_pedida), 0)
  const cambio = orden.monto_recibido != null ? orden.monto_recibido - totalReal : null
  return (
    <Modal open onClose={onClose} title="Comprobante de venta" size="sm">
      <div className="space-y-3">
        <div className="text-center pb-3 border-b border-steel-100">
          <p className="text-lg font-black text-steel-900">{orden.numero}</p>
          <p className="text-xs text-steel-400 mt-0.5">{new Date(orden.pagado_en ?? orden.actualizado_en).toLocaleString('es-BO')}</p>
          <p className="text-xs text-steel-500 mt-0.5">Cajero: {orden.cajero_nombre}</p>
        </div>
        <div className="space-y-1.5">
          {itemsDespachados.map(i => (
            <div key={i.id} className="flex justify-between text-sm gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-steel-700 truncate">{i.producto_nombre}</p>
                <p className="text-[10px] font-mono text-steel-400">{i.producto_codigo} · ×{i.cantidad_recogida ?? i.cantidad_pedida}</p>
              </div>
              <span className="font-semibold shrink-0">{fmtBs(i.precio_unitario * (i.cantidad_recogida ?? i.cantidad_pedida))}</span>
            </div>
          ))}
          {itemsFaltantes.map(i => (
            <div key={i.id} className="flex justify-between text-sm gap-2 opacity-40">
              <div className="flex-1 min-w-0">
                <p className="text-steel-400 truncate line-through">{i.producto_nombre}</p>
                <p className="text-[10px] font-mono text-steel-300">{i.producto_codigo} · ×{i.cantidad_pedida}</p>
              </div>
              <span className="text-steel-400 shrink-0">N/A</span>
            </div>
          ))}
        </div>
        <div className="border-t border-steel-100 pt-3 space-y-1">
          <div className="flex justify-between text-sm font-bold"><span>Total</span><span>{fmtBs(totalReal)}</span></div>
          {orden.metodo_pago && <div className="flex justify-between text-xs text-steel-500"><span>Método</span><span className="capitalize">{orden.metodo_pago}</span></div>}
          {cambio != null && cambio > 0 && <div className="flex justify-between text-xs text-emerald-600"><span>Cambio</span><span>{fmtBs(cambio)}</span></div>}
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cerrar</Button>
          <Button className="flex-1" onClick={() => window.print()}>
            <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CajaPage() {
  const { user } = useAuth()
  const { reservarStock, liberarReserva, confirmarSalida } = useInventarioStore()
  const { ordenes, addOrden, updateOrden } = useVentasStore()
  const { playAlertSequence, playBeep } = useSoundAlert()

  const [cart, setCart] = useState<Cart>(emptyCart())
  const [ordersModalOpen, setOrdersModalOpen] = useState(false)
  const [flyingBall, setFlyingBall] = useState<{ from: DOMRect | null; items: number } | null>(null)
  const emitButtonRef = useRef<HTMLButtonElement>(null)
  const headerBadgeRef = useRef<HTMLButtonElement | null>(null)

  const [cobroOrden, setCobroOrden] = useState<OrdenVenta | null>(null)
  const [parcialOrden, setParcialOrden] = useState<OrdenVenta | null>(null)
  const [facturaOrden, setFacturaOrden] = useState<OrdenVenta | null>(null)
  const [cancelarOrden, setCancelarOrden] = useState<OrdenVenta | null>(null)

  const misOrdenes = useMemo(() => ordenes.filter(o => o.estado !== 'pagado' && o.estado !== 'cancelado'), [ordenes])
  const canceladas = useMemo(() => ordenes.filter(o => o.estado === 'cancelado'), [ordenes])
  const listosCount = misOrdenes.filter(o => o.estado === 'listo').length
  const alertedFaltantes = useRef<Set<string>>(new Set())
  const alertedListo = useRef<Set<string>>(new Set())

  useEffect(() => {
    const ordenConFaltantes = misOrdenes.find(o => o.items.some(i => i.estado === 'faltante') && !alertedFaltantes.current.has(o.id))
    if (ordenConFaltantes) {
      alertedFaltantes.current.add(ordenConFaltantes.id)
      playAlertSequence()
      notify.warning(`${ordenConFaltantes.numero} — productos faltantes`, { description: 'Habla con almacén para resolver', duration: 8000 })
    }
  }, [misOrdenes, playAlertSequence])

  useEffect(() => {
    const ordenLista = misOrdenes.find(o => o.estado === 'listo' && !alertedListo.current.has(o.id))
    if (ordenLista) {
      alertedListo.current.add(ordenLista.id)
      playAlertSequence()
      notify.success(`${ordenLista.numero} lista para cobrar`, { description: 'Mercadería preparada', duration: 6000 })
    }
  }, [misOrdenes, playAlertSequence])

  const addToCart = useCallback((producto: Producto) => {
    setCart(prev => {
      const existing = prev.items.findIndex(i => i.producto_id === producto.id)
      if (existing >= 0) {
        const disp = Math.max(0, producto.stock - (producto.stock_reservado ?? 0))
        if (prev.items[existing].cantidad >= disp) { notify.error('Stock máximo alcanzado'); return prev }
        return { ...prev, items: prev.items.map((item, idx) => idx === existing ? { ...item, cantidad: item.cantidad + 1 } : item) }
      }
      return { ...prev, items: [...prev.items, { producto_id: producto.id, producto_codigo: producto.codigo_universal, producto_nombre: producto.nombre, producto_ubicacion: producto.ubicacion ?? '', producto_imagen: producto.imagen, cantidad: 1, precio_unitario: producto.precio_venta }] }
    })
  }, [])

  const handleQtyChange = (itemIdx: number, delta: number) => {
    setCart(prev => {
      const newQty = prev.items[itemIdx].cantidad + delta
      if (newQty < 1) return prev
      return { ...prev, items: prev.items.map((item, idx) => idx === itemIdx ? { ...item, cantidad: newQty } : item) }
    })
  }

  const handleRemoveItem = (itemIdx: number) => {
    setCart(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== itemIdx) }))
  }

  const handleNotaChange = (nota: string) => {
    setCart(prev => ({ ...prev, nota }))
  }

  const handleEmitir = () => {
    if (cart.items.length === 0) return
    const fromRect = emitButtonRef.current?.getBoundingClientRect() ?? null
    setFlyingBall({ from: fromRect, items: cart.items.length })
  }

  const handleFlyingComplete = () => {
    if (!flyingBall) return
    const now = new Date().toISOString()
    const id = newId()
    const numero = `ORD-${String(ordenes.length + 1).padStart(3, '0')}`
    const items: ItemOrden[] = cart.items.map(ci => ({
      id: newId(), producto_id: ci.producto_id, producto_codigo: ci.producto_codigo, producto_nombre: ci.producto_nombre,
      producto_ubicacion: ci.producto_ubicacion, cantidad_pedida: ci.cantidad, precio_unitario: ci.precio_unitario,
      subtotal: ci.precio_unitario * ci.cantidad, estado: 'pendiente' as const,
    }))
    const total = items.reduce((s, i) => s + i.subtotal, 0)
    const orden: OrdenVenta = { id, numero, cajero_id: user?.id ?? 'admin', cajero_nombre: user?.nombre ?? 'Admin', items, total, estado: 'pendiente', nota: cart.nota || undefined, creado_en: now, actualizado_en: now }
    items.forEach(i => reservarStock(i.producto_id, i.cantidad_pedida))
    addOrden(orden)
    setCart(emptyCart())
    setFlyingBall(null)
    playBeep({ frequency: 800, duration: 80 })
    notify.success(`${numero} enviada a almacén`)
  }

  const handleOpenCobro = (orden: OrdenVenta) => {
    orden.items.some(i => i.estado === 'faltante') ? setParcialOrden(orden) : setCobroOrden(orden)
  }

  const handleCancelarOrden = (orden: OrdenVenta) => {
    setCancelarOrden(orden)
  }

  const handleConfirmarCancelar = () => {
    if (!cancelarOrden) return
    cancelarOrden.items.forEach(i => liberarReserva(i.producto_id, i.cantidad_pedida))
    updateOrden(cancelarOrden.id, { estado: 'cancelado' as EstadoOrden })
    notify.success(`${cancelarOrden.numero} cancelada`)
    setCancelarOrden(null)
  }

  const handleEntregarParcial = () => {
    if (!parcialOrden) return
    setCobroOrden(parcialOrden)
    setParcialOrden(null)
  }

  const handleConfirmarPago = (metodo: MetodoPago, monto: number) => {
    if (!cobroOrden) return
    const now = new Date().toISOString()
    cobroOrden.items.forEach(i => {
      if (i.estado === 'completo' || i.estado === 'parcial') confirmarSalida(i.producto_id, i.cantidad_recogida ?? i.cantidad_pedida)
      else if (i.estado === 'faltante') liberarReserva(i.producto_id, i.cantidad_pedida)
    })
    updateOrden(cobroOrden.id, { estado: 'pagado', metodo_pago: metodo, monto_recibido: monto, pagado_en: now })
    setCobroOrden(null)
    setFacturaOrden({ ...cobroOrden, estado: 'pagado', metodo_pago: metodo, monto_recibido: monto, pagado_en: now })
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-screen overflow-hidden bg-steel-50">
        <div className="bg-white border-b border-steel-100 px-6 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-steel-900">Caja</h1>
              <p className="text-xs text-steel-400">{new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                ref={headerBadgeRef}
                onClick={() => setOrdersModalOpen(true)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold',
                  listosCount > 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse'
                    : 'bg-steel-50 border-steel-200 text-steel-600 hover:bg-steel-100'
                )}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Órdenes
                {misOrdenes.length > 0 && (
                  <span className={clsx(
                    'inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-black',
                    listosCount > 0 ? 'bg-emerald-500 text-white' : 'bg-steel-300 text-white'
                  )}>
                    {misOrdenes.length}
                  </span>
                )}
                {listosCount > 0 && <span className="text-[10px] font-normal text-emerald-600">({listosCount} listas)</span>}
              </button>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-steel-500">{user?.nombre}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
          <div className="flex-1 grid grid-cols-[1fr_380px] gap-4 overflow-hidden min-h-0">
            <div className="bg-white rounded-2xl border border-steel-100 shadow-sm overflow-hidden flex flex-col">
              <ProductSearch onAddToCart={addToCart} />
            </div>
            <div className="bg-white rounded-2xl border border-steel-100 shadow-sm overflow-hidden flex flex-col">
              <CartPanel
                cart={cart}
                onQtyChange={handleQtyChange}
                onRemoveItem={handleRemoveItem}
                onNotaChange={handleNotaChange}
                onEmitir={handleEmitir}
                emitButtonRef={(el) => { (emitButtonRef as React.MutableRefObject<HTMLButtonElement | null>).current = el }}
              />
            </div>
          </div>
        </div>
      </div>

      {flyingBall && (
        <FlyingBall
          fromRect={flyingBall.from}
          toRect={headerBadgeRef.current?.getBoundingClientRect() ?? null}
          itemCount={flyingBall.items}
          onComplete={handleFlyingComplete}
        />
      )}

      <OrdersModal
        ordenes={misOrdenes}
        canceladas={canceladas}
        onCobrar={handleOpenCobro}
        onCancelar={handleCancelarOrden}
        open={ordersModalOpen}
        onClose={() => setOrdersModalOpen(false)}
      />

      {parcialOrden && (
        <PickingParcialModal orden={parcialOrden} onPartial={handleEntregarParcial} onCancelar={() => { setCancelarOrden(parcialOrden); setParcialOrden(null) }} onClose={() => setParcialOrden(null)} />
      )}
      {cobroOrden && <CobroModal orden={cobroOrden} onConfirm={handleConfirmarPago} onClose={() => setCobroOrden(null)} />}
      {facturaOrden && <FacturaModal orden={facturaOrden} onClose={() => setFacturaOrden(null)} />}
      {cancelarOrden && <CancelarOrdenModal orden={cancelarOrden} onConfirm={handleConfirmarCancelar} onClose={() => setCancelarOrden(null)} />}
    </MainLayout>
  )
}