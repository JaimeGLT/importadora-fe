import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button, Input, Modal, ConfirmModal } from '@/components/ui'
import { KitSeleccionModal, type KitSeleccionResult } from '@/components/ui/KitVentaParcialModal'
import { notify } from '@/lib/notify'
import { useVentasStore } from '@/stores/ventasStore'
import { useCajaStore, type Cart, type CartItem } from '@/stores/cajaStore'
import { useSoundAlert } from '@/hooks/useSoundAlert'
import { calcularPrecioConDescuento, calcularPrecioDolarHoy, type DescuentoConfig } from '@/stores/configStore'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { PRODUCTOS_QUERY, PRODUCTO_BY_ID_QUERY, backendToProductoSimple, backendToProducto, type ProductoAPI } from '@/lib/queries/inventario.queries'
import { MIS_ORDENES_QUERY, backendToOrdenVenta, type OrdenVentaAPI } from '@/lib/queries/ventas.queries'
import { CLIENTES_QUERY, backendToCliente, type ClienteAPI } from '@/lib/queries/clientes.queries'
import {
  DESCUENTOS_QUERY, MARGEN_GANANCIA_QUERY, CONFIG_VENTA_QUERY, TIPO_CAMBIO_QUERY,
  backendToDescuento,
  type DescuentoAPI, type MargenGananciaAPI, type ConfigVentaAPI, type TipoCambioAPI,
} from '@/lib/queries/config.queries'
import { useVentasHub } from '@/hooks/useVentasHub'
import { useMarcasStore } from '@/stores/marcasStore'
import { MARCAS_QUERY, backendToMarca } from '@/lib/queries/marcas.queries'
import { fmtCodigo } from '@/lib/formatCodigo'
import type { Producto, OrdenVenta, MetodoPago, Cliente, PagoOrden } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtBsInt = (n: number) =>
  `Bs ${Math.round(n).toLocaleString('es-BO')}`

const fmtTimeSince = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'ahora'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

const ESTADO_ORDEN_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  pendiente_almacenero: { label: 'Pendiente',         cls: 'bg-[#F5E0A8] text-[#7A5200]',     dot: 'bg-[#B47A1F]' },
  en_preparacion:       { label: 'Preparando',        cls: 'bg-[#F4ECDB] text-[#780e18]',     dot: 'bg-[#780e18]' },
  listo_para_escaneo:   { label: 'Escaneando',        cls: 'bg-[#F4ECDB] text-[#780e18]',     dot: 'bg-[#780e18]' },
  con_faltantes:        { label: 'Con faltantes',     cls: 'bg-[#F5E0A8] text-[#7A5200]',     dot: 'bg-[#B47A1F]' },
  esperando_pago:       { label: 'Listo para cobrar', cls: 'bg-[#B8DCCA] text-[#1E5C38]',     dot: 'bg-[#3F7A52]' },
  cancelada:            { label: 'Cancelada',         cls: 'bg-[#F5C9C0] text-[#8A1E12]',     dot: 'bg-[#B23A2A]' },
}

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
          className="h-12 w-12 rounded-full bg-gradient-to-br from-[#780e18] to-[#D4A333] shadow-xl flex items-center justify-center text-white font-black text-lg relative"
          style={{
            boxShadow: '0 0 0 4px rgba(120, 14, 24, 0.3), 0 0 20px rgba(120, 14, 24, 0.5)',
          }}
        >
          <span className="relative z-10">{itemCount}</span>
          <div className="absolute inset-0 rounded-full bg-[#D4A333] animate-ping opacity-30" />
        </div>
        <svg
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#D4A333]"
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
        className="absolute w-3 h-3 rounded-full bg-[#D4A333] opacity-40"
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

// ─── Select Price Modal ─────────────────────────────────────────────────────────

const DESCUENTO_COLORS: Record<string, { bg: string; border: string; accent: string; text: string; badge: string }> = {
  emerald: { bg: 'bg-[#EAF4EE]',     border: 'border-[#D0CBC4]', accent: '#3F7A52', text: 'text-[#1E5C38]', badge: 'bg-[#B8DCCA] text-[#1E5C38]' },
  blue:    { bg: 'bg-[#E8EEF8]',     border: 'border-[#D0CBC4]', accent: '#3055A4', text: 'text-[#1A3875]', badge: 'bg-[#C8D8F8] text-[#1A3875]' },
  amber:   { bg: 'bg-[#F4ECDB]/70',  border: 'border-[#D0CBC4]', accent: '#D4A333', text: 'text-[#7A5200]', badge: 'bg-[#F5E0A8] text-[#7A5200]' },
  purple:  { bg: 'bg-[#EDE8F5]',     border: 'border-[#D0CBC4]', accent: '#6B4DAA', text: 'text-[#3D1D7A]', badge: 'bg-[#D8C8F0] text-[#3D1D7A]' },
  rose:    { bg: 'bg-[#F5C9C0]/30',  border: 'border-[#D0CBC4]', accent: '#B23A2A', text: 'text-[#8A1E12]', badge: 'bg-[#F5C9C0] text-[#8A1E12]' },
  cyan:    { bg: 'bg-[#E0F4F8]',     border: 'border-[#D0CBC4]', accent: '#0E7090', text: 'text-[#0A4D60]', badge: 'bg-[#B0E0F0] text-[#0A4D60]' },
}

function PrecioCard({
  precio,
  descuento,
  onSelect,
}: {
  precio: number
  descuento?: DescuentoConfig
  onSelect: () => void
}) {
  const c = descuento ? (DESCUENTO_COLORS[descuento.color] ?? DESCUENTO_COLORS.emerald) : null
  const precioFinal = descuento ? calcularPrecioConDescuento(precio, descuento.porcentaje) : precio

  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full flex items-center justify-between px-4 py-3 rounded-xl border border-l-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden group',
        c ? [c.bg, c.border] : 'bg-white border-[#D0CBC4]',
      )}
      style={{ borderLeftColor: c ? c.accent : '#780e18' }}
    >
      <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full opacity-[0.07]"
        style={{ background: c ? c.accent : '#780e18' }} />
      <div className="flex items-center gap-2.5 relative z-10">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${c ? c.accent : '#780e18'}20` }}>
          <i className={clsx('text-[14px]', descuento ? 'ti ti-tag' : 'ti ti-currency-dollar')}
            style={{ color: c ? c.accent : '#780e18' }} />
        </div>
        {descuento ? (
          <div>
            <p className={clsx('text-sm font-bold leading-tight', c!.text)}>{descuento.nombre}</p>
            <span className={clsx('inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5', c!.badge)}>
              -{descuento.porcentaje}% descuento
            </span>
          </div>
        ) : (
          <div>
            <p className="text-sm font-bold text-[#2D2B2A] leading-tight">Precio base</p>
            <p className="text-[10px] text-[#7A7571] font-medium mt-0.5">Sin descuento</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 relative z-10">
        <div className="text-right">
          <p className={clsx('font-mono font-black text-[17px] leading-none', c ? c.text : 'text-[#2D2B2A]')}>
            {fmtBs(precioFinal)}
          </p>
          {descuento && (
            <p className="text-[11px] text-[#7A7571] line-through mt-0.5 font-mono">
              Bs {precio.toFixed(2)}
            </p>
          )}
        </div>
        <i className="ti ti-chevron-right text-[16px] text-[#7A7571] group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  )
}

function SelectPriceModal({
  producto,
  descuentos,
  modoPrecioCajero,
  tipoCambioHoy,
  margenGanancia,
  tipoCambioHabilitado,
  onSelect,
  onAddAnother,
  isEdit,
  onClose,
}: {
  producto: Producto
  descuentos: DescuentoConfig[]
  modoPrecioCajero: string
  tipoCambioHoy: number
  margenGanancia: number
  tipoCambioHabilitado: boolean
  onSelect: (precio: number, descuento_id?: string, descuento_nombre?: string, descuento_porcentaje?: number) => void
  onAddAnother?: (precio: number, descuento_id?: string, descuento_nombre?: string, descuento_porcentaje?: number) => void
  isEdit?: boolean
  onClose: () => void
}) {
  const { marcas } = useMarcasStore()
  const activeDescuentos = descuentos.filter(d => d.activo)

  const precioImportacion = producto.precio_venta
  const precioDolarHoy = producto.conversionABs && producto.conversionABs > 0
    ? calcularPrecioDolarHoy(producto.precio_costo, producto.conversionABs, tipoCambioHoy, margenGanancia)
    : 0

  const usarDolar = modoPrecioCajero === 'PrecioDolarDia' && tipoCambioHabilitado && precioDolarHoy > 0
  const precioADisplay = usarDolar ? precioDolarHoy : precioImportacion

  const allCodes = [producto.codigo_universal, ...producto.codigos_alternativos.filter(Boolean)]
  const stockDisp = Math.max(0, producto.stock - (producto.stock_reservado ?? 0))
  const stockCls = stockDisp === 0 ? 'text-[#B23A2A] bg-[#F5C9C0]' : stockDisp <= producto.stock_minimo ? 'text-[#7A5200] bg-[#F5E0A8]' : 'text-[#1E5C38] bg-[#B8DCCA]'

  const handleSelect = (precio: number, descuento?: DescuentoConfig) => {
    const final = descuento ? calcularPrecioConDescuento(precio, descuento.porcentaje) : precio
    if (isEdit && onAddAnother) {
      onAddAnother(final, descuento?.id, descuento?.nombre, descuento?.porcentaje)
    } else {
      onSelect(final, descuento?.id, descuento?.nombre, descuento?.porcentaje)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(45,43,42,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden border border-[#E8E5E2]">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#E8E5E2] bg-[#F5F0EB]">
          <div className="flex items-start gap-3">
            {producto.imagen ? (
              <img
                src={producto.imagen} alt={producto.nombre}
                className="h-12 w-12 rounded-xl object-cover bg-white border border-[#E8E5E2] shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-white border border-[#E8E5E2] flex items-center justify-center shrink-0">
                <i className="ti ti-photo text-[#7A7571] text-[20px]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1 mb-1">
                {allCodes.slice(0, 3).map((code, i) => (
                  <span key={i} className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-[11px]',
                    i === 0 ? 'bg-[#780e18] text-white' : 'bg-[#2D2B2A] text-[#F7F7F7]'
                  )}>
                    {i === 0 ? fmtCodigo(producto.codigo_universal, producto.marcaId, marcas) : code}
                  </span>
                ))}
              </div>
              <p className="text-[13px] font-medium text-[#4A4744] truncate leading-tight">{producto.nombre}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={clsx('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full', stockCls)}>
                  <span className="w-1 h-1 rounded-full bg-current" />
                  {stockDisp} disponibles
                </span>
                {isEdit && (
                  <span className="text-[10px] font-semibold text-[#7A7571] bg-white px-2 py-0.5 rounded-full border border-[#E8E5E2]">
                    Cambiar precio
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#7A7571] hover:text-[#2D2B2A] transition-colors p-1.5 rounded-lg hover:bg-[#E8E5E2] shrink-0"
            >
              <i className="ti ti-x text-[18px]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-[10px] font-bold text-[#7A7571] uppercase tracking-[0.12em] mb-3">
            {isEdit ? 'Selecciona el nuevo precio' : 'Selecciona el precio'}
          </p>

          <PrecioCard precio={precioADisplay} onSelect={() => handleSelect(precioADisplay)} />

          {activeDescuentos.map(d => (
            <PrecioCard
              key={d.id}
              precio={precioADisplay}
              descuento={d}
              onSelect={() => handleSelect(precioADisplay, d)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full h-10 rounded-xl border border-[#E8E5E2] text-sm font-semibold text-[#4A4744] hover:bg-[#F0EFEC] transition-colors"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── ProductSearch ─────────────────────────────────────────────────────────────

function ProductSearch({ onSelectProducto, cart, onDecrementProducto }: {
  onSelectProducto: (producto: Producto) => void
  cart: Cart
  onDecrementProducto: (productoId: string) => void
}) {
  const { isTokenReady } = useAuth()
  const { marcas } = useMarcasStore()
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim() || !isTokenReady) { setResultados([]); return }
    const q = query.trim()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await gql<{ productos: { nodes: ProductoAPI[] } }>(PRODUCTOS_QUERY, {
          first: 10,
          where: {
            or: [
              { nombre: { contains: q } },
              { codigo: { contains: q } },
              { codigoAux: { contains: q } },
              { codigoAux2: { contains: q } },
            ],
          },
        })
        setResultados((res.productos?.nodes ?? []).map(backendToProductoSimple))
      } catch {
        setResultados([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, isTokenReady])

  const stockDisponible = (p: Producto) => Math.max(0, p.stock - (p.stock_reservado ?? 0))

  const getCartQty = (productoId: string) =>
    cart.items.filter(i => i.producto_id === productoId).reduce((acc, i) => acc + i.cantidad, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 border-b border-[#D0CBC4]">
        <div className="relative">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7571] text-[14px] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por código, nombre o marca..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#FBFBFA] border border-[#D8D4D0] rounded-xl focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 placeholder:text-[#7A7571]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7571] hover:text-[#2D2B2A]">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="divide-y divide-[#E8E5E2] px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-[#F0EFEC]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-[#F0EFEC]" />
                  <div className="h-2 w-40 rounded bg-[#E8E5E2]" />
                </div>
                <div className="h-4 w-20 rounded bg-[#F0EFEC]" />
              </div>
            ))}
          </div>
        ) : query.trim() === '' ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <i className="ti ti-search text-[#E8E5E2] text-[40px] mb-3" />
            <p className="text-sm text-[#7A7571]">Escribe para buscar productos</p>
          </div>
        ) : resultados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-sm text-[#7A7571] font-medium">Sin resultados</p>
            <p className="text-xs text-[#7A7571] mt-1">"{query}"</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E5E2]">
            {resultados.map(p => {
              const disp = stockDisponible(p)
              const stockCls = disp === 0 ? 'text-[#B23A2A]' : disp <= p.stock_minimo ? 'text-[#B47A1F]' : 'text-[#3F7A52]'
              return (
                <div
                  key={p.id}
                  onClick={() => { if (disp > 0 || p.es_kit) onSelectProducto(p) }}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 transition-colors',
                    disp === 0 && !p.es_kit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                    p.es_kit
                      ? 'border-l-[3px] border-l-[#D4A333] hover:bg-[#FAF5EE]'
                      : getCartQty(p.id) > 0
                        ? 'bg-[#F4ECDB]/60 border-l-[3px] border-l-[#D4A333] hover:bg-[#F4ECDB]'
                        : 'hover:bg-[#FAF5EE]'
                  )}
                >
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} className="h-10 w-10 rounded-lg object-cover bg-[#F0EFEC] border border-[#E8E5E2] shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-[#F0EFEC] border border-[#E8E5E2] shrink-0 flex items-center justify-center">
                      <i className="ti ti-photo text-[#7A7571] text-[18px]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-sm font-bold text-[#780e18] bg-[#F4ECDB] px-2 py-0.5 rounded">{fmtCodigo(p.codigo_universal, p.marcaId, marcas)}</span>
                      {p.es_kit && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F4ECDB] text-[#780e18] border border-[#D4A333]/30">
                          <i className="ti ti-stack text-[10px]" />
                          KIT
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#4A4744] truncate">{p.nombre}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[11px] font-semibold ${stockCls}`}>{disp} disponibles</span>
                      {p.almacen && (
                        <span className="text-[11px] text-[#7A7571] flex items-center gap-0.5">
                          <i className="ti ti-map-pin text-[10px]" />
                          {p.almacen} {p.estante} {p.fila} {p.columna}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    {p.es_kit ? (
                      <button
                        onClick={e => { e.stopPropagation(); onSelectProducto(p) }}
                        className="h-7 w-7 rounded-lg flex items-center justify-center bg-[#D4A333] text-[#2D2010] hover:bg-[#B4881C] transition-colors"
                      >
                        <i className="ti ti-plus text-[13px]" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); onDecrementProducto(p.id) }}
                          disabled={getCartQty(p.id) === 0}
                          className="h-7 w-7 rounded-lg flex items-center justify-center bg-[#F0EFEC] text-[#4A4744] hover:bg-[#E8E5E2] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <i className="ti ti-minus text-[13px]" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-[#2D2B2A]">{getCartQty(p.id)}</span>
                        <button
                          onClick={e => { e.stopPropagation(); onSelectProducto(p) }}
                          disabled={disp === 0}
                          className={clsx(
                            'h-7 w-7 rounded-lg flex items-center justify-center transition-colors',
                            disp === 0 ? 'bg-[#F0EFEC] text-[#7A7571] cursor-not-allowed' : 'bg-[#D4A333] text-[#2D2010] hover:bg-[#B4881C]'
                          )}
                        >
                          <i className="ti ti-plus text-[13px]" />
                        </button>
                      </div>
                    )}
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

// ─── Cart Item ────────────────────────────────────────────────────────────────

function CartItem({
  item,
  idx,
  disp,
  onQtyChange,
  onRemoveItem,
  onEditPrice,
}: {
  item: CartItem
  idx: number
  disp: number
  onQtyChange: (itemIdx: number, delta: number) => void
  onRemoveItem: (itemIdx: number) => void
  onEditPrice: (producto_id: string) => void
}) {
  const { marcas } = useMarcasStore()
  const [editingQty, setEditingQty] = useState(false)
  const [qtyValue, setQtyValue] = useState(String(item.cantidad))

  return (
    <div className={clsx('px-4 py-3', item.kit_id && 'border-l-[3px] border-l-[#D4A333]')}>
      <div className="flex items-start gap-3">
        {item.producto_imagen ? (
          <img src={item.producto_imagen} alt={item.producto_nombre} className="h-12 w-12 rounded-lg object-cover bg-[#F0EFEC] border border-[#E8E5E2] shrink-0" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-[#F0EFEC] border border-[#E8E5E2] shrink-0 flex items-center justify-center">
            <i className="ti ti-photo text-[#7A7571] text-[18px]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.descuento_nombre ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-bold text-[#780e18] bg-[#F4ECDB] px-2 py-0.5 rounded">{fmtCodigo(item.producto_codigo, item.marcaId, marcas)}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B8DCCA] text-[#1E5C38]">{item.descuento_nombre} -{item.descuento_porcentaje}%</span>
                </div>
              ) : (
                <span className="font-mono text-sm font-bold text-[#780e18] bg-[#F4ECDB] px-2 py-0.5 rounded">{fmtCodigo(item.producto_codigo, item.marcaId, marcas)}</span>
              )}
            </div>
            <button
              onClick={() => onEditPrice(item.producto_id)}
              className="p-1.5 text-[#7A7571] hover:text-[#780e18] hover:bg-[#F4ECDB] rounded-lg transition-colors"
              title="Cambiar precio"
            >
              <i className="ti ti-edit text-[14px]" />
            </button>
          </div>
          <p className="text-xs text-[#7A7571] mt-0.5 truncate">{item.producto_nombre}</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <button onClick={() => onQtyChange(idx, -1)} className="h-7 w-7 rounded-lg border border-[#E8E5E2] text-[#4A4744] hover:bg-[#F0EFEC] flex items-center justify-center text-base font-bold transition-colors">−</button>
              {editingQty ? (
                <input
                  type="number"
                  min={1}
                  max={disp}
                  value={qtyValue}
                  autoFocus
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    if (raw) {
                      const num = parseInt(raw, 10)
                      const clamped = Math.max(1, Math.min(disp, num))
                      setQtyValue(String(clamped))
                    } else {
                      setQtyValue('')
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseInt(qtyValue, 10)
                    const newQty = isNaN(parsed) ? item.cantidad : Math.max(1, Math.min(disp, parsed))
                    setQtyValue(String(newQty))
                    if (newQty !== item.cantidad) {
                      const delta = newQty - item.cantidad
                      onQtyChange(idx, delta)
                    }
                    setEditingQty(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    } else if (e.key === 'Escape') {
                      setQtyValue(String(item.cantidad))
                      setEditingQty(false)
                    }
                  }}
                  className="w-14 h-7 px-2 text-center text-sm font-bold border border-[#780e18] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#780e18]/20"
                />
              ) : (
                <button
                  onClick={() => {
                    setQtyValue(String(item.cantidad))
                    setEditingQty(true)
                  }}
                  className="h-7 w-10 text-center text-sm font-bold text-[#2D2B2A] hover:bg-[#F0EFEC] rounded-lg transition-colors"
                >
                  {item.cantidad}
                </button>
              )}
              <button onClick={() => onQtyChange(idx, +1)} disabled={item.cantidad >= disp} className={clsx('h-7 w-7 rounded-lg border flex items-center justify-center text-base font-bold transition-colors', item.cantidad >= disp ? 'border-[#E8E5E2] text-[#7A7571] cursor-not-allowed' : 'border-[#E8E5E2] text-[#4A4744] hover:bg-[#F0EFEC]')}>+</button>
            </div>
            <span className="text-sm font-bold text-[#2D2B2A]">{fmtBs(item.precio_unitario * item.cantidad)}</span>
          </div>
        </div>
        <button onClick={() => onRemoveItem(idx)} className="text-[#7A7571] hover:text-[#B23A2A] transition-colors shrink-0">
          <i className="ti ti-x text-[16px]" />
        </button>
      </div>
    </div>
  )
}

// ─── CartPanel ────────────────────────────────────────────────────────────────

function CartPanel({ cart, productosCache, onQtyChange, onRemoveItem, onNotaChange, onEmitir, onEditPrice, onCancelarOrden, emitButtonRef }: { cart: Cart; productosCache: Record<string, Producto>; onQtyChange: (itemIdx: number, delta: number) => void; onRemoveItem: (itemIdx: number) => void; onNotaChange: (nota: string) => void; onEmitir: () => void; onEditPrice: (producto_id: string) => void; onCancelarOrden: () => void; emitButtonRef?: (el: HTMLButtonElement | null) => void }) {
  const [confirmCancelar, setConfirmCancelar] = useState(false)
  const stockDisponible = (id: string) => {
    const p = productosCache[id]
    return p ? Math.max(0, p.stock - (p.stock_reservado ?? 0)) : Infinity
  }
  const total = cart.items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#D0CBC4] shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-[10px] font-bold text-[#7A7571] uppercase tracking-widest shrink-0">Carrito de venta</p>
        </div>
        {cart.items.length > 0 && (
          <button
            onClick={() => setConfirmCancelar(true)}
            className="shrink-0 text-[11px] font-semibold text-[#B23A2A] hover:text-[#8A1E12] hover:bg-[#F5C9C0]/40 px-2 py-1 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
      <ConfirmModal
        open={confirmCancelar}
        title="Cancelar orden"
        message="Se eliminarán todos los productos del carrito. ¿Continuar?"
        onConfirm={() => { setConfirmCancelar(false); onCancelarOrden() }}
        onClose={() => setConfirmCancelar(false)}
      />
      <div className="flex-1 overflow-y-auto">
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <i className="ti ti-shopping-cart text-[#E8E5E2] text-[48px] mb-3" />
            <p className="text-sm text-[#7A7571]">Carrito vacío</p>
            <p className="text-xs text-[#7A7571] mt-1">Agrega productos desde la búsqueda</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E5E2]">
            {cart.items.map((item, idx) => {
              const disp = stockDisponible(item.producto_id)
              return (
                <CartItem
                  key={item.producto_id}
                  item={item}
                  idx={idx}
                  disp={disp}
                  onQtyChange={onQtyChange}
                  onRemoveItem={onRemoveItem}
                  onEditPrice={onEditPrice}
                />
              )
            })}
          </div>
        )}
      </div>
      {cart.items.length > 0 && (
        <div className="border-t border-[#D0CBC4] px-4 py-3 space-y-3 shrink-0">
          <input type="text" value={cart.nota} onChange={e => onNotaChange(e.target.value)} placeholder="Nota para almacén (opcional)" className="w-full text-xs px-3 py-2.5 bg-[#FBFBFA] border border-[#D8D4D0] rounded-xl focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 placeholder:text-[#7A7571]" maxLength={100} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#7A7571] uppercase tracking-widest">Total</p>
              <p className="text-xl font-black text-[#2D2B2A] tabular-nums">{fmtBs(total)}</p>
            </div>
            <button
              ref={emitButtonRef}
              onClick={onEmitir}
              className="px-6 h-10 bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] text-sm font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <i className="ti ti-arrow-right text-[16px]" />
              Emitir orden
            </button>
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
  const listos = ordenes.filter(o => o.estado === 'esperando_pago')
  const otras = ordenes.filter(o => o.estado !== 'completada' && o.estado !== 'cancelada' && o.estado !== 'esperando_pago')

  return (
    <Modal open={open} onClose={onClose} title="Órdenes activas" size="lg">
      <div className="space-y-4 pt-1">
        <div className="max-h-[60vh] overflow-y-auto space-y-4">
          <>
              {listos.length > 0 ? (
                <div className="space-y-2">
                  {listos.map(o => (
                    <div key={o.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#B8DCCA]/30 border-2 border-[#B8DCCA]">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#3F7A52] flex items-center justify-center text-white font-bold text-sm">{o.numero.replace('ORD-', '')}</div>
                        <div>
                          <p className="text-sm font-bold text-[#1E5C38]">{o.numero}</p>
                          <p className="text-xs text-[#3F7A52]">{o.items.length} prod. · {fmtBs(o.total)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { onCobrar(o); onClose() }} className="px-4 py-1.5 rounded-lg bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] text-xs font-bold transition-colors">Cobrar</button>
                        <button onClick={() => { onCancelar(o); onClose() }} className="p-1.5 text-[#7A7571] hover:text-[#B23A2A]">
                          <i className="ti ti-x text-[15px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <i className="ti ti-clipboard-list text-[#E8E5E2] text-[48px] mx-auto mb-3 block" />
                  <p className="text-sm text-[#7A7571]">No hay órdenes listas</p>
                </div>
              )}
              {otras.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#7A7571] uppercase tracking-wide mb-2">En proceso</p>
                  <div className="space-y-2">
                    {otras.map(o => {
                      const cfg = ESTADO_ORDEN_CONFIG[o.estado] ?? { label: o.estado, cls: 'bg-[#F0EFEC] text-[#7A7571]', dot: 'bg-[#7A7571]' }
                      const tieneFaltantes = o.items.some(i => i.estado === 'faltante')
                      return (
                        <div key={o.id} className={clsx('flex items-center justify-between px-4 py-3 rounded-xl border', tieneFaltantes ? 'bg-[#F5E0A8]/40 border-[#F5E0A8]' : 'bg-white border-[#E8E5E2]')}>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.cls}`}>{cfg.label}</span>
                            <div>
                              <p className="text-sm font-semibold text-[#4A4744]">{o.numero}</p>
                              <p className="text-xs text-[#7A7571]">{o.items.length} prod. · {fmtBs(o.total)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {tieneFaltantes && <span className="text-[10px] font-bold text-[#B47A1F]">⚠ faltantes</span>}
                            <span className="text-[10px] text-[#7A7571]">{fmtTimeSince(o.creado_en)}</span>
                            <button onClick={() => { onCancelar(o); onClose() }} className="p-1.5 text-[#7A7571] hover:text-[#B23A2A]">
                              <i className="ti ti-x text-[15px]" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {canceladas && canceladas.length > 0 && (
                <div className="border-t border-[#E8E5E2] pt-3">
                  <button
                    onClick={() => setShowCanceladas(!showCanceladas)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-[#F0EFEC] transition-colors"
                  >
                    <span className="text-xs font-bold text-[#7A7571] uppercase tracking-wide flex items-center gap-2">
                      <i className={clsx('ti ti-chevron-right text-[14px] transition-transform', showCanceladas && 'rotate-90')} />
                      Canceladas ({canceladas.length})
                    </span>
                  </button>
                  {showCanceladas && (
                    <div className="space-y-2 mt-2">
                      {canceladas.map(o => (
                        <div key={o.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#F5C9C0]/40 border border-[#F5C9C0] opacity-70">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-[#F5C9C0] flex items-center justify-center">
                              <i className="ti ti-x text-[#B23A2A] text-[14px]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#8A1E12]">{o.numero}</p>
                              <p className="text-xs text-[#B23A2A]">{o.items.length} prod. · {fmtBs(o.total)}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#B23A2A]">{fmtTimeSince(o.creado_en)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
        </div>
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
        <p className="text-sm text-[#7A7571]">Esta orden tiene productos no encontrados. ¿Cómo procedes?</p>
        {completos.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[#3F7A52] uppercase tracking-wide mb-2">✓ Encontrados ({completos.length})</p>
            <div className="space-y-1">{completos.map(i => (
              <div key={i.id} className="flex justify-between text-sm px-3 py-1.5 bg-[#B8DCCA]/30 rounded-lg">
                <span className="text-[#4A4744] truncate mr-2">{i.producto_nombre}</span>
                <span className="text-[#1E5C38] font-semibold">×{i.cantidad_recogida ?? i.cantidad_pedida}</span>
              </div>
            ))}</div>
          </div>
        )}
        {faltantes.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[#B23A2A] uppercase tracking-wide mb-2">✕ Faltantes ({faltantes.length})</p>
            <div className="space-y-1">{faltantes.map(i => (
              <div key={i.id} className="flex justify-between text-sm px-3 py-1.5 bg-[#F5C9C0]/40 rounded-lg">
                <span className="text-[#4A4744] truncate mr-2">{i.producto_nombre}</span>
                <span className="text-[#B23A2A] font-semibold">×{i.cantidad_pedida}</span>
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
  const { marcas } = useMarcasStore()
  return (
    <Modal open onClose={onClose} title={`Cancelar ${orden.numero}`} size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F5C9C0]/40 border border-[#F5C9C0]">
          <div className="h-10 w-10 rounded-full bg-[#F5C9C0] flex items-center justify-center shrink-0">
            <i className="ti ti-alert-triangle text-[#B23A2A] text-[18px]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#8A1E12]">¿Cancelar esta orden?</p>
            <p className="text-xs text-[#B23A2A] mt-0.5">El stock reservado será liberado. Esta acción no se puede deshacer.</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#E8E5E2] overflow-hidden">
          <div className="px-4 py-2 bg-[#F5F0EB] border-b border-[#E8E5E2] flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7571]">PRODUCTOS</span>
            <span className="text-xs text-[#7A7571]">{orden.items.length} items · {fmtBs(orden.total)}</span>
          </div>
          <div className="divide-y divide-[#E8E5E2] max-h-48 overflow-y-auto">
            {orden.items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-[#780e18] bg-[#F4ECDB] px-1.5 py-0.5 rounded shrink-0">{fmtCodigo(item.producto_codigo, item.marcaId, marcas)}</span>
                  <span className="text-xs text-[#4A4744] truncate">{item.producto_nombre}</span>
                </div>
                <span className="text-xs font-semibold text-[#4A4744] ml-2 shrink-0">×{item.cantidad_pedida}</span>
              </div>
            ))}
          </div>
        </div>

        {orden.nota && (
          <div className="px-3 py-2 rounded-lg bg-[#F5E0A8]/40 border border-[#F5E0A8]">
            <p className="text-xs text-[#7A5200]"><span className="font-semibold">Nota:</span> {orden.nota}</p>
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

function CobroModal({ orden, clientes, onConfirm, onClose }: {
  orden: OrdenVenta
  clientes: Cliente[]
  onConfirm: (pagos: PagoOrden[], monto_recibido: number, billing: { cliente_id?: number }) => void
  onClose: () => void
}) {
  const { marcas } = useMarcasStore()
  const itemsDespachados = orden.items.filter(i => i.estado === 'completo' || i.estado === 'parcial')
  const itemsFaltantes = orden.items.filter(i => i.estado === 'faltante')
  const totalReal = Math.round(itemsDespachados.reduce((s, i) => {
    if (i.es_parcial && i.piezas_orden?.length)
      return s + i.piezas_orden.filter(p => p.confirmado).reduce((ps, p) => ps + (p.precio_unitario ?? 0) * p.cantidad, 0)
    return s + i.precio_unitario * (i.cantidad_recogida ?? i.cantidad_pedida)
  }, 0))

  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [montoStr, setMontoStr] = useState(String(totalReal))
  const [pagoMixto, setPagoMixto] = useState(false)
  const [metodo2, setMetodo2] = useState<MetodoPago>('tarjeta')
  const [monto2Str, setMonto2Str] = useState('')
  const monto2 = parseFloat(monto2Str.replace(',', '.')) || 0
  const monto1Mixto = totalReal - monto2

  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSelected, setClienteSelected] = useState<Cliente | null>(
    orden.cliente_id ? clientes.find(c => c.id === Number(orden.cliente_id)) ?? null : null
  )
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)

  const monto = parseFloat(montoStr.replace(',', '.'))
  const cambio = metodo === 'efectivo' && !isNaN(monto) ? monto - totalReal : null

  const handleSelectCliente = (c: Cliente) => {
    setClienteSelected(c)
    setClienteSearch('')
    setShowClienteDropdown(false)
  }

  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim()) return []
    const q = clienteSearch.toLowerCase()
    return clientes.filter(c =>
      c.apellido.toLowerCase().includes(q) ||
      (c.nombre?.toLowerCase().includes(q) ?? false) ||
      (c.telefono?.includes(clienteSearch) ?? false)
    ).slice(0, 5)
  }, [clientes, clienteSearch])

  const handleConfirm = () => {
    const m = parseFloat(montoStr.replace(',', '.'))
    if (pagoMixto) {
      if (monto2 <= 0 || monto2 >= totalReal) { notify.error('Monto del segundo método inválido'); return }
      if (metodo === metodo2) { notify.error('Los dos métodos deben ser distintos'); return }
    }
    const pagos: PagoOrden[] = pagoMixto
      ? [{ tipoPago: metodo, monto: monto1Mixto }, { tipoPago: metodo2, monto: monto2 }]
      : [{ tipoPago: metodo, monto: totalReal }]
    onConfirm(pagos, isNaN(m) ? totalReal : m, { cliente_id: clienteSelected?.id })
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
    <Modal open onClose={onClose} title={`Cobrar ${orden.numero}`} size="md">
      <div className="space-y-4 pt-1">
        <div className="space-y-1">
          {itemsDespachados.map(i => {
            if (i.es_parcial && i.piezas_orden?.length) {
              return i.piezas_orden.filter(p => p.confirmado).map(p => (
                <div key={`${i.id}-${p.id}`} className="flex justify-between text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#4A4744] truncate">{p.nombre}</p>
                    <p className="text-[10px] font-mono text-[#7A7571]">{fmtCodigo(p.codigo, p.marcaId, marcas)} · ×{p.cantidad}</p>
                  </div>
                  <span className="font-semibold text-[#2D2B2A] shrink-0">{fmtBsInt((p.precio_unitario ?? 0) * p.cantidad)}</span>
                </div>
              ))
            }
            return (
              <div key={i.id} className="flex justify-between text-sm gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[#4A4744] truncate">{i.producto_nombre}</p>
                  <p className="text-[10px] font-mono text-[#7A7571]">{fmtCodigo(i.producto_codigo, i.marcaId, marcas)} · ×{i.cantidad_recogida ?? i.cantidad_pedida}</p>
                </div>
                <span className="font-semibold text-[#2D2B2A] shrink-0">{fmtBsInt(i.precio_unitario * (i.cantidad_recogida ?? i.cantidad_pedida))}</span>
              </div>
            )
          })}
          {itemsFaltantes.map(i => (
            <div key={i.id} className="flex justify-between text-sm gap-2 opacity-50">
              <div className="flex-1 min-w-0">
                <p className="text-[#7A7571] truncate line-through">{i.producto_nombre}</p>
                <p className="text-[10px] font-mono text-[#7A7571]">{fmtCodigo(i.producto_codigo, i.marcaId, marcas)} · ×{i.cantidad_pedida}</p>
              </div>
              <span className="text-[#7A7571] shrink-0">N/A</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-[#E8E5E2] mt-2">
            <span className="text-sm font-bold text-[#4A4744]">Total</span>
            <span className="text-lg font-black text-[#2D2B2A]">{fmtBsInt(totalReal)}</span>
          </div>
        </div>

        {/* Cliente (opcional) */}
        <div>
          <p className="text-xs font-bold text-[#7A7571] uppercase tracking-widest mb-2">Cliente (opcional)</p>
          {clienteSelected ? (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#B8DCCA]/30 border border-[#B8DCCA]">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1E5C38] truncate">
                  {clienteSelected.nombre ? `${clienteSelected.nombre} ${clienteSelected.apellido}` : clienteSelected.apellido}
                </p>
                {clienteSelected.telefono && (
                  <p className="text-xs text-[#3F7A52]">{clienteSelected.telefono}</p>
                )}
              </div>
              <button onClick={() => setClienteSelected(null)} className="p-1.5 text-[#3F7A52] hover:text-[#1E5C38] hover:bg-[#B8DCCA]/50 rounded-lg transition-colors shrink-0">
                <i className="ti ti-x text-[14px]" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={clienteSearch}
                onChange={e => { setClienteSearch(e.target.value); setShowClienteDropdown(true) }}
                onFocus={() => setShowClienteDropdown(true)}
                onBlur={() => setTimeout(() => setShowClienteDropdown(false), 150)}
                placeholder="Buscar cliente por nombre o teléfono…"
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#E8E5E2] rounded-xl focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 placeholder:text-[#7A7571]"
              />
              {showClienteDropdown && clienteSearch.trim() && (
                <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-[#E8E5E2] shadow-lg max-h-40 overflow-y-auto">
                  {filteredClientes.length === 0 ? (
                    <div className="px-3 py-2.5 text-xs text-[#7A7571] text-center">Sin resultados</div>
                  ) : filteredClientes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCliente(c)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#FAF5EE] transition-colors text-left"
                    >
                      <div className="h-7 w-7 rounded-full bg-[#F4ECDB] flex items-center justify-center text-[10px] font-bold text-[#780e18] shrink-0">
                        {c.nombre ? c.nombre.charAt(0) : c.apellido.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#2D2B2A] truncate">
                          {c.nombre ? `${c.nombre} ${c.apellido}` : c.apellido}
                        </p>
                        {c.telefono && <p className="text-[10px] text-[#7A7571]">{c.telefono}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-[#7A7571] uppercase tracking-widest">Método de pago</p>
            <button
              onClick={() => setPagoMixto(v => !v)}
              className={clsx('text-[11px] font-bold px-2 py-1 rounded-lg border transition-all', pagoMixto ? 'bg-[#F4ECDB] border-[#D4A333]/50 text-[#780e18]' : 'bg-[#F7F7F7] border-[#E8E5E2] text-[#7A7571] hover:border-[#D0CBC4]')}
            >
              {pagoMixto ? 'Pago mixto ✓' : 'Pago mixto'}
            </button>
          </div>
          {!pagoMixto ? (
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map(m => (
                <button key={m.value} onClick={() => setMetodo(m.value)} className={clsx('py-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-1', metodo === m.value ? 'border-[#780e18] bg-[#F4ECDB] text-[#780e18]' : 'border-[#E8E5E2] text-[#7A7571] hover:border-[#D0CBC4]')}>
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-3 gap-1">
                  {METODOS.map(m => (
                    <button key={m.value} onClick={() => setMetodo(m.value)} className={clsx('py-2 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-0.5', metodo === m.value ? 'border-[#780e18] bg-[#F4ECDB] text-[#780e18]' : 'border-[#E8E5E2] text-[#7A7571] hover:border-[#D0CBC4]')}>
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="w-28 shrink-0">
                  <p className="text-xs text-[#7A7571] mb-1">Bs {monto1Mixto > 0 ? monto1Mixto.toFixed(2) : '—'}</p>
                  <p className="text-[10px] text-[#7A7571]">Resto automático</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-3 gap-1">
                  {METODOS.map(m => (
                    <button key={m.value} onClick={() => setMetodo2(m.value)} className={clsx('py-2 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-0.5', metodo2 === m.value ? 'border-[#780e18] bg-[#F4ECDB] text-[#780e18]' : 'border-[#E8E5E2] text-[#7A7571] hover:border-[#D0CBC4]')}>
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="w-28 shrink-0">
                  <Input type="number" step="0.50" min="0.01" max={totalReal - 0.01} value={monto2Str} onChange={e => setMonto2Str(e.target.value)} placeholder="0.00" />
                </div>
              </div>
            </div>
          )}
        </div>
        {!pagoMixto && metodo === 'efectivo' && (
          <div>
            <label className="block text-xs font-bold text-[#7A7571] uppercase tracking-widest mb-1.5">Monto recibido (Bs)</label>
            <Input type="number" min={totalReal} step="0.50" value={montoStr} onChange={e => setMontoStr(e.target.value)} autoFocus />
            {cambio !== null && cambio >= 0 && <p className="text-sm font-bold text-[#3F7A52] mt-2">Cambio: {fmtBsInt(cambio)}</p>}
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
  const { marcas } = useMarcasStore()
  const isFactura = orden.tipoDocumento === 'factura'
  const itemsDespachados = orden.items.filter(i => i.estado === 'completo' || i.estado === 'parcial')
  const itemsFaltantes = orden.items.filter(i => i.estado === 'faltante')
  const totalReal = itemsDespachados.reduce((s, i) => {
    if (i.es_parcial && i.piezas_orden?.length)
      return s + i.piezas_orden.filter(p => p.confirmado).reduce((ps, p) => ps + (p.precio_unitario ?? 0) * p.cantidad, 0)
    return s + i.precio_unitario * (i.cantidad_recogida ?? i.cantidad_pedida)
  }, 0)
  const cambio = orden.monto_recibido != null ? orden.monto_recibido - totalReal : null

  const docLabel = isFactura ? 'FACTURA' : 'NOTA DE VENTA'
  const docColorCls = isFactura ? 'bg-[#B8DCCA] text-[#1E5C38]' : 'bg-[#F0EFEC] text-[#4A4744]'

  return (
    <Modal open onClose={onClose} title="Comprobante de venta" size="md">
      <div className="space-y-4">
        <div className="text-center pb-3 border-b border-[#E8E5E2]">
          <span className={clsx('inline-block text-[10px] font-black px-2 py-1 rounded mb-2 tracking-widest', docColorCls)}>{docLabel}</span>
          {isFactura && orden.facturaNro && (
            <p className="text-xs font-mono font-bold text-[#4A4744] mt-1">N° {orden.facturaNro}</p>
          )}
          <p className="text-lg font-black text-[#2D2B2A]">{orden.numero}</p>
          <p className="text-xs text-[#7A7571] mt-0.5">{new Date(orden.pagado_en ?? orden.actualizado_en).toLocaleString('es-BO')}</p>
          <p className="text-xs text-[#7A7571] mt-0.5">Cajero: {orden.cajero_nombre}</p>
        </div>

        {isFactura && orden.cliente_nombre && (
          <div className="rounded-xl bg-[#F7F7F7] border border-[#E8E5E2] p-3 space-y-1">
            <p className="text-[10px] font-bold text-[#7A7571] uppercase tracking-widest">Datos del cliente</p>
            <p className="text-sm font-semibold text-[#2D2B2A]">{orden.cliente_nombre}</p>
            {orden.cliente_tipo_id && orden.cliente_numero_id && (
              <p className="text-xs text-[#9996b0]">
                {orden.cliente_tipo_id === 'nit' ? `NIT: ${orden.cliente_numero_id}` :
                 orden.cliente_tipo_id === 'ci' ? `CI: ${orden.cliente_numero_id}` :
                 'Sin NIT (99001)'}
              </p>
            )}
            {orden.cliente_nit && orden.cliente_tipo_id !== 'nit' && (
              <p className="text-xs text-[#9996b0]">NIT: {orden.cliente_nit}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          {itemsDespachados.map(i => {
            if (i.es_parcial && i.piezas_orden?.length) {
              return i.piezas_orden.filter(p => p.confirmado).map(p => (
                <div key={`${i.id}-${p.id}`} className="flex justify-between text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#4A4744] truncate">{p.nombre}</p>
                    <p className="text-[10px] font-mono text-[#7A7571]">{fmtCodigo(p.codigo, p.marcaId, marcas)} · ×{p.cantidad}</p>
                  </div>
                  <span className="font-semibold shrink-0">{fmtBs((p.precio_unitario ?? 0) * p.cantidad)}</span>
                </div>
              ))
            }
            return (
              <div key={i.id} className="flex justify-between text-sm gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[#4A4744] truncate">{i.producto_nombre}</p>
                  <p className="text-[10px] font-mono text-[#7A7571]">{fmtCodigo(i.producto_codigo, i.marcaId, marcas)} · ×{i.cantidad_recogida ?? i.cantidad_pedida}</p>
                </div>
                <span className="font-semibold shrink-0">{fmtBs(i.precio_unitario * (i.cantidad_recogida ?? i.cantidad_pedida))}</span>
              </div>
            )
          })}
          {itemsFaltantes.map(i => (
            <div key={i.id} className="flex justify-between text-sm gap-2 opacity-40">
              <div className="flex-1 min-w-0">
                <p className="text-[#7A7571] truncate line-through">{i.producto_nombre}</p>
                <p className="text-[10px] font-mono text-[#7A7571]">{fmtCodigo(i.producto_codigo, i.marcaId, marcas)} · ×{i.cantidad_pedida}</p>
              </div>
              <span className="text-[#7A7571] shrink-0">N/A</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#E8E5E2] pt-3 space-y-1">
          <div className="flex justify-between text-sm font-bold text-[#2D2B2A]"><span>Total</span><span>{fmtBs(totalReal)}</span></div>
          {orden.metodo_pago && <div className="flex justify-between text-xs text-[#7A7571]"><span>Método</span><span className="capitalize">{orden.metodo_pago}</span></div>}
          {cambio != null && cambio > 0 && <div className="flex justify-between text-xs text-[#3F7A52]"><span>Cambio</span><span>{fmtBs(cambio)}</span></div>}
        </div>

        {isFactura && (
          <div className="rounded-xl bg-white border border-[#E8E5E2] p-4 flex items-center gap-4">
            <div className="h-20 w-20 rounded-lg bg-[#F0EFEC] border-2 border-dashed border-[#D0CBC4] flex items-center justify-center shrink-0">
              <span className="text-[10px] text-[#7A7571] font-bold text-center leading-tight">QR{'\n'}SIAT</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#7A7571] uppercase tracking-widest mb-1">Código QR</p>
              <p className="text-xs text-[#7A7571]">Verifique su factura en el portal del SIN</p>
              {orden.facturaNro && <p className="text-[10px] font-mono text-[#7A7571] mt-1">{orden.facturaNro}</p>}
            </div>
          </div>
        )}

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
  const { user, isTokenReady } = useAuth()
  const { ordenes, setOrdenes, updateOrden } = useVentasStore()
  const { marcas, setMarcas } = useMarcasStore()
  const { playAlertSequence, playBeep } = useSoundAlert()

  const { cart, setCart, clearCart } = useCajaStore()
  const [ordersModalOpen, setOrdersModalOpen] = useState(false)
  const [flyingBall, setFlyingBall] = useState<{ from: DOMRect | null; items: number } | null>(null)
  const emitButtonRef = useRef<HTMLButtonElement>(null)
  const headerBadgeRef = useRef<HTMLButtonElement | null>(null)
  const [productosCache, setProductosCache] = useState<Record<string, Producto>>({})
  const [clientes, setClientes] = useState<Cliente[]>([])

  const [cobroOrden, setCobroOrden] = useState<OrdenVenta | null>(null)
  const [parcialOrden, setParcialOrden] = useState<OrdenVenta | null>(null)
  const [facturaOrden, setFacturaOrden] = useState<OrdenVenta | null>(null)
  const [cancelarOrden, setCancelarOrden] = useState<OrdenVenta | null>(null)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [kitSeleccionado, setKitSeleccionado] = useState<Producto | null>(null)
  const [kitCompletoQty, setKitCompletoQty] = useState(1)

  const [descuentos, setDescuentos] = useState<DescuentoConfig[]>([])
  const [modoPrecioCajero, setModoPrecioCajero] = useState('PrecioImportacion')
  const [tipoCambioHoy, setTipoCambioHoy] = useState(0)
  const [margenGanancia, setMargenGanancia] = useState(1.20)
  const [tipoCambioHabilitado, setTipoCambioHabilitado] = useState(false)

  const misOrdenes = useMemo(() => ordenes.filter(o => o.estado !== 'completada' && o.estado !== 'cancelada'), [ordenes])
  const canceladas = useMemo(() => ordenes.filter(o => o.estado === 'cancelada'), [ordenes])
  const listosCount = misOrdenes.filter(o => o.estado === 'esperando_pago').length
  const alertedFaltantes = useRef<Set<string>>(new Set())
  const alertedListo = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isTokenReady || marcas.length > 0) return
    gql<{ marca: { nodes: Array<{ id: number; nombre: string; prefijo: string }> } }>(MARCAS_QUERY)
      .then(res => setMarcas((res.marca?.nodes ?? []).map(backendToMarca)))
      .catch(() => {})
  }, [isTokenReady, marcas.length, setMarcas])

  useEffect(() => {
    if (!isTokenReady) return
    Promise.all([
      gql<{ descuento: { nodes: DescuentoAPI[] } }>(DESCUENTOS_QUERY).then(r => r.descuento.nodes),
      gql<{ margenGanancia: MargenGananciaAPI }>(MARGEN_GANANCIA_QUERY).then(r => r.margenGanancia),
      gql<{ configVenta: ConfigVentaAPI | null }>(CONFIG_VENTA_QUERY).then(r => r.configVenta),
      gql<{ tipoCambio: TipoCambioAPI }>(TIPO_CAMBIO_QUERY).then(r => r.tipoCambio),
      gql<{ clientes: { nodes: ClienteAPI[] } }>(CLIENTES_QUERY, { first: 200 }).then(r => r.clientes?.nodes ?? []),
    ]).then(([desc, margen, config, tipoCambio, clientesNodes]) => {
      setDescuentos(desc.map(backendToDescuento))
      if (margen) setMargenGanancia(margen.valor)
      if (config) setModoPrecioCajero(config.modoVenta)
      if (tipoCambio) {
        setTipoCambioHoy(tipoCambio.precioDolar)
        setTipoCambioHabilitado(tipoCambio.precioDolar > 0)
      }
      setClientes(clientesNodes.map(backendToCliente))
    }).catch(() => {})
  }, [isTokenReady])

  const joinGrupoRef = useRef<(g: string) => Promise<void>>(() => Promise.resolve())

  const loadOrdenes = useCallback(async () => {
    if (!isTokenReady) return
    try {
      const data = await gql<{ misOrdenes: { nodes: OrdenVentaAPI[] } }>(MIS_ORDENES_QUERY)
      const converted = data.misOrdenes.nodes.map(backendToOrdenVenta)
      setOrdenes(converted)
      converted
        .filter(o => o.estado !== 'completada' && o.estado !== 'cancelada')
        .forEach(o => joinGrupoRef.current(`orden-${o.id}`))
    } catch {
      notify.error('Error cargando órdenes')
    }
  }, [isTokenReady, setOrdenes])

  useEffect(() => { loadOrdenes() }, [loadOrdenes])

  const { isConnected, joinGrupo } = useVentasHub({
    onOrdenAceptada: ({ id }) => {
      updateOrden(String(id), { estado: 'en_preparacion' })
      playAlertSequence()
      notify.info('Almacenero tomó la orden')
    },
    onOrdenLista: ({ id }) => {
      updateOrden(String(id), { estado: 'listo_para_escaneo' })
      playAlertSequence()
      notify.success('¡Orden lista!', { description: 'Mercadería preparada', duration: 8000 })
    },
    onOrdenCompletada: ({ id }) => {
      updateOrden(String(id), { estado: 'completada' })
    },
    onOrdenCancelada: ({ id }) => {
      updateOrden(String(id), { estado: 'cancelada' })
    },
    onOrdenEsperandoPago: ({ id }) => {
      updateOrden(String(id), { estado: 'esperando_pago' })
      playAlertSequence()
      notify.success('Orden lista para cobrar', { description: `Orden #${id} — escaneo completado`, duration: 8000 })
    },
  }, isTokenReady)
  joinGrupoRef.current = joinGrupo

  useEffect(() => {
    const ordenConFaltantes = misOrdenes.find(o => o.items.some(i => i.estado === 'faltante') && !alertedFaltantes.current.has(o.id))
    if (ordenConFaltantes) {
      alertedFaltantes.current.add(ordenConFaltantes.id)
      playAlertSequence()
      notify.warning(`${ordenConFaltantes.numero} — productos faltantes`, { description: 'Habla con almacén para resolver', duration: 8000 })
    }
  }, [misOrdenes, playAlertSequence])

  useEffect(() => {
    const ordenLista = misOrdenes.find(o => o.estado === 'esperando_pago' && !alertedListo.current.has(o.id))
    if (ordenLista) {
      alertedListo.current.add(ordenLista.id)
      playAlertSequence()
      notify.success(`${ordenLista.numero} lista para cobrar`, { description: 'Escaneo completado', duration: 6000 })
    }
  }, [misOrdenes, playAlertSequence])

  const addKitSeleccion = useCallback(async (producto: Producto) => {
    try {
      const data = await gql<{ productos: { nodes: ProductoAPI[] } }>(
        PRODUCTO_BY_ID_QUERY,
        { id: Number(producto.id) },
      )
      const node = data.productos?.nodes?.[0]
      setKitSeleccionado(node ? backendToProducto(node) : producto)
    } catch {
      setKitSeleccionado(producto)
    }
  }, [])

  const addToCart = useCallback((producto: Producto) => {
    setProductosCache(prev => ({ ...prev, [producto.id]: producto }))
    if (producto.es_kit) {
      addKitSeleccion(producto)
      return
    }
    setCart(prev => {
      const existingIdx = prev.items.findIndex(i => i.producto_id === producto.id)
      if (existingIdx >= 0) {
        const disp = Math.max(0, producto.stock - (producto.stock_reservado ?? 0))
        if (prev.items[existingIdx].cantidad >= disp) {
          notify.error('Stock máximo alcanzado')
          return prev
        }
        notify.success('+1 al carrito')
        return { ...prev, items: prev.items.map((item, idx) => idx === existingIdx ? { ...item, cantidad: item.cantidad + 1 } : item) }
      }
      setProductoSeleccionado(producto)
      return prev
    })
  }, [addKitSeleccion])

  const handleDecrementProducto = useCallback((productoId: string) => {
    setCart(prev => {
      const items = [...prev.items]
      const lastIdx = items.map(i => i.producto_id).lastIndexOf(productoId)
      if (lastIdx === -1) return prev
      if (items[lastIdx].cantidad > 1) {
        items[lastIdx] = { ...items[lastIdx], cantidad: items[lastIdx].cantidad - 1 }
      } else {
        items.splice(lastIdx, 1)
      }
      return { ...prev, items }
    })
  }, [])

  const handleSelectPrice = useCallback((precio: number, descuento_id?: string, descuento_nombre?: string, descuento_porcentaje?: number) => {
    if (!productoSeleccionado) return
    const qty = productoSeleccionado.es_kit ? kitCompletoQty : 1
    setCart(prev => {
      const existing = prev.items.findIndex(i => i.producto_id === productoSeleccionado.id)
      if (existing >= 0) {
        const disp = Math.max(0, productoSeleccionado.stock - (productoSeleccionado.stock_reservado ?? 0))
        if (prev.items[existing].cantidad >= disp) { notify.error('Stock máximo alcanzado'); return prev }
        return { ...prev, items: prev.items.map((item, idx) => idx === existing ? { ...item, cantidad: item.cantidad + 1 } : item) }
      }
      return { ...prev, items: [...prev.items, {
        producto_id: productoSeleccionado.id,
        producto_codigo: productoSeleccionado.codigo_universal,
        marcaId: productoSeleccionado.marcaId ?? null,
        producto_nombre: productoSeleccionado.nombre,
        producto_almacen: productoSeleccionado.almacen,
        producto_estante: productoSeleccionado.estante,
        producto_fila: productoSeleccionado.fila,
        producto_columna: productoSeleccionado.columna,
        producto_imagen: productoSeleccionado.imagen,
        cantidad: qty,
        precio_unitario: precio,
        precio_base: productoSeleccionado.precio_venta,
        descuento_id,
        descuento_nombre,
        descuento_porcentaje,
      }] }
    })
    setProductoSeleccionado(null)
    setKitCompletoQty(1)
    playBeep({ frequency: 600, duration: 60 })
    notify.success('Producto agregado')
  }, [productoSeleccionado, kitCompletoQty, playBeep])

  const agregarPiezasAlCarrito = useCallback((
    piezas: { producto_id: string; nombre: string; codigo: string; cantidad: number; precio: number }[],
    kitId: string,
  ) => {
    setCart(prev => {
      const newItems: CartItem[] = piezas.map(p => ({
        producto_id: p.producto_id,
        producto_codigo: p.codigo,
        producto_nombre: p.nombre,
        producto_almacen: '',
        producto_estante: '',
        producto_fila: '',
        producto_columna: '',
        cantidad: p.cantidad,
        precio_unitario: p.precio,
        precio_base: p.precio,
        kit_id: kitId,
      }))
      return { ...prev, items: [...prev.items, ...newItems] }
    })
  }, [])

  const handleKitSeleccion = useCallback((result: KitSeleccionResult) => {
    if (!kitSeleccionado) return

    if (result.tipo === 'kit_completo') {
      setKitCompletoQty(result.cantidad)
      setProductoSeleccionado(kitSeleccionado)
      setKitSeleccionado(null)
      return
    }

    if (result.tipo === 'piezas_sueltas') {
      agregarPiezasAlCarrito(result.piezas, kitSeleccionado.id)
      setKitSeleccionado(null)
      playBeep({ frequency: 600, duration: 60 })
      notify.success(`${result.piezas.length} pieza(s) agregada(s)`)
      return
    }

    // tipo === 'ambos': agregar piezas al carrito Y abrir selección de precio para el kit
    agregarPiezasAlCarrito(result.piezas, kitSeleccionado.id)
    setKitCompletoQty(result.cantidad_kit)
    setProductoSeleccionado(kitSeleccionado)
    setKitSeleccionado(null)
    notify.success(`${result.piezas.length} pieza(s) agregada(s) · seleccioná precio del kit`)
  }, [kitSeleccionado, playBeep, agregarPiezasAlCarrito])

  const handleEditPrice = useCallback((producto_id: string) => {
    const producto = productosCache[producto_id]
    if (producto) setProductoSeleccionado(producto)
  }, [productosCache])

  const handleAddWithPrice = useCallback((precio: number, descuento_id?: string, descuento_nombre?: string, descuento_porcentaje?: number) => {
    if (!productoSeleccionado) return
    setCart(prev => {
      const existingIdx = prev.items.findIndex(i => i.producto_id === productoSeleccionado.id)
      if (existingIdx >= 0) {
        const disp = Math.max(0, productoSeleccionado.stock - (productoSeleccionado.stock_reservado ?? 0))
        if (prev.items[existingIdx].cantidad >= disp) { notify.error('Stock máximo alcanzado'); return prev }
        const updatedItems = prev.items.map((item, idx) => {
          if (idx === existingIdx) {
            return {
              ...item,
              precio_unitario: precio,
              precio_base: productoSeleccionado.precio_venta,
              cantidad: item.cantidad + 1,
              descuento_id,
              descuento_nombre,
              descuento_porcentaje,
            }
          }
          return item
        })
        return { ...prev, items: updatedItems }
      }
      return { ...prev, items: [...prev.items, {
        producto_id: productoSeleccionado.id,
        producto_codigo: productoSeleccionado.codigo_universal,
        marcaId: productoSeleccionado.marcaId ?? null,
        producto_nombre: productoSeleccionado.nombre,
        producto_almacen: productoSeleccionado.almacen,
        producto_estante: productoSeleccionado.estante,
        producto_fila: productoSeleccionado.fila,
        producto_columna: productoSeleccionado.columna,
        producto_imagen: productoSeleccionado.imagen,
        cantidad: 1,
        precio_unitario: precio,
        precio_base: productoSeleccionado.precio_venta,
        descuento_id,
        descuento_nombre,
        descuento_porcentaje,
      }] }
    })
    setProductoSeleccionado(null)
    playBeep({ frequency: 600, duration: 60 })
    notify.success('Precio actualizado')
  }, [productoSeleccionado, playBeep])

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

  const handleFlyingComplete = async () => {
    if (!flyingBall) return
    setFlyingBall(null)

    // Agrupar piezas de kit por kit_id
    const regularItems = cart.items.filter(i => !i.kit_id)
    const kitGroups = cart.items
      .filter(i => !!i.kit_id)
      .reduce<Record<string, CartItem[]>>((acc, i) => {
        if (!acc[i.kit_id!]) acc[i.kit_id!] = []
        acc[i.kit_id!].push(i)
        return acc
      }, {})

    const apiItems = [
      ...regularItems.map(i => ({
        id_Producto: Number(i.producto_id),
        cantidad: i.cantidad,
        esParcial: false,
        precioUnitario: i.precio_unitario,
        id_Descuento: i.descuento_id ? Number(i.descuento_id) : null,
        montoDescuento: i.descuento_porcentaje
          ? i.precio_base * (i.descuento_porcentaje / 100) * i.cantidad
          : 0,
        piezas: [],
      })),
      ...Object.entries(kitGroups).map(([kitId, pieces]) => ({
        id_Producto: Number(kitId),
        cantidad: 1,
        esParcial: true,
        precioUnitario: pieces.reduce((s, p) => s + p.precio_unitario * p.cantidad, 0),
        id_Descuento: null,
        montoDescuento: 0,
        piezas: pieces.map(p => ({ id_Pieza: Number(p.producto_id), cantidad: p.cantidad, PrecioUnitario: p.precio_unitario })),
      })),
    ]

    try {
      const result = await api.post<{ ordenId: number; message: string }>('/OrdenVenta', {
        id_Cliente: null,
        items: apiItems,
      })
      await joinGrupo(`orden-${result.ordenId}`)
      clearCart()
      playBeep({ frequency: 800, duration: 80 })
      notify.success(`#${result.ordenId} enviada a almacén`)
      await loadOrdenes()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al crear la orden')
    }
  }

  const handleOpenCobro = (orden: OrdenVenta) => {
    orden.items.some(i => i.estado === 'faltante') ? setParcialOrden(orden) : setCobroOrden(orden)
  }

  const handleCancelarOrden = (orden: OrdenVenta) => {
    setCancelarOrden(orden)
  }

  const handleConfirmarCancelar = async () => {
    if (!cancelarOrden) return
    try {
      await api.post(`/OrdenVenta/${cancelarOrden.id}/Cancelar`, null)
      updateOrden(cancelarOrden.id, { estado: 'cancelada' })
      notify.success(`${cancelarOrden.numero} cancelada`)
      setCancelarOrden(null)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al cancelar')
    }
  }

  const handleEntregarParcial = () => {
    if (!parcialOrden) return
    setCobroOrden(parcialOrden)
    setParcialOrden(null)
  }

  const handleConfirmarPago = async (pagos: PagoOrden[], monto_recibido: number, billing: { cliente_id?: number }) => {
    if (!cobroOrden) return
    const PAGO_MAP: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', qr: 'QR' }
    const capitalizePago = (m: string) => PAGO_MAP[m] ?? m
    try {
      await api.post(`/OrdenVenta/${cobroOrden.id}/Completar`, {
        Pagos: pagos.map(p => ({ TipoPago: capitalizePago(p.tipoPago), Monto: p.monto })),
      })
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al registrar el pago')
      return
    }
    const now = new Date().toISOString()
    const metodoPrimario = pagos[0].tipoPago
    const ordenCompletada = { ...cobroOrden, estado: 'completada' as const, metodo_pago: metodoPrimario, monto_recibido, pagado_en: now }
    updateOrden(cobroOrden.id, {
      estado: 'completada',
      metodo_pago: metodoPrimario,
      monto_recibido,
      pagado_en: now,
      cliente_id: billing.cliente_id != null ? String(billing.cliente_id) : undefined,
    })
    setCobroOrden(null)
    setFacturaOrden(ordenCompletada)
    notify.success('Venta cobrada', { description: `${cobroOrden.numero} — ${pagos.length > 1 ? 'pago mixto' : metodoPrimario}` })
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-screen overflow-hidden bg-[#F7F7F7]">
        <header className="bg-[#F7F7F7]/85 backdrop-blur-md sticky top-0 z-40 border-b border-[#E8E5E2] px-7 py-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-semibold text-[24px] text-[#2D2B2A] leading-none tracking-[-0.022em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Caja</h1>
              <p className="text-xs text-[#7A7571] font-medium mt-0.5">{new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={clsx('h-2 w-2 rounded-full', isConnected ? 'bg-[#3F7A52] animate-pulse' : 'bg-[#B47A1F]')} title={isConnected ? 'Conectado' : 'Reconectando...'} />
              <span className="text-xs text-[#7A7571]">{user?.nombre}</span>
            </div>
          </div>
          <button
            ref={headerBadgeRef}
            onClick={() => setOrdersModalOpen(true)}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold',
              listosCount > 0
                ? 'bg-[#B8DCCA] border-[#3F7A52]/30 text-[#1E5C38]'
                : 'bg-white border-[#D8D4D0] text-[#4A4744] hover:bg-[#F7F7F7]'
            )}
          >
            <i className="ti ti-clipboard-list text-[15px]" />
            Órdenes
            {misOrdenes.length > 0 && (
              <span className={clsx(
                'inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-black',
                listosCount > 0 ? 'bg-[#3F7A52] text-white' : 'bg-[#7A7571] text-white'
              )}>
                {misOrdenes.length}
              </span>
            )}
            {listosCount > 0 && <span className="text-[10px] font-normal text-[#3F7A52]">({listosCount} listas)</span>}
          </button>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
          <div className="flex-1 grid grid-cols-[1fr_380px] gap-4 overflow-hidden min-h-0">
            <div className="bg-white rounded-2xl border border-[#D0CBC4] overflow-hidden flex flex-col">
              <ProductSearch onSelectProducto={addToCart} cart={cart} onDecrementProducto={handleDecrementProducto} />
            </div>
            <div className="bg-white rounded-2xl border border-[#D0CBC4] overflow-hidden flex flex-col">
              <CartPanel
                cart={cart}
                productosCache={productosCache}
                onQtyChange={handleQtyChange}
                onRemoveItem={handleRemoveItem}
                onNotaChange={handleNotaChange}
                onEmitir={handleEmitir}
                onEditPrice={handleEditPrice}
                onCancelarOrden={clearCart}
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
      {cobroOrden && <CobroModal orden={cobroOrden} clientes={clientes} onConfirm={handleConfirmarPago} onClose={() => setCobroOrden(null)} />}
      {facturaOrden && <FacturaModal orden={facturaOrden} onClose={() => setFacturaOrden(null)} />}
      {cancelarOrden && <CancelarOrdenModal orden={cancelarOrden} onConfirm={handleConfirmarCancelar} onClose={() => setCancelarOrden(null)} />}
      {productoSeleccionado && (
        <SelectPriceModal
          producto={productoSeleccionado}
          descuentos={descuentos}
          modoPrecioCajero={modoPrecioCajero}
          tipoCambioHoy={tipoCambioHoy}
          margenGanancia={margenGanancia}
          tipoCambioHabilitado={tipoCambioHabilitado}
          onSelect={handleSelectPrice}
          onAddAnother={handleAddWithPrice}
          isEdit={cart.items.some(i => i.producto_id === productoSeleccionado.id)}
          onClose={() => setProductoSeleccionado(null)}
        />
      )}
      {kitSeleccionado && (
        <KitSeleccionModal
          open={!!kitSeleccionado}
          onClose={() => setKitSeleccionado(null)}
          kit={kitSeleccionado}
          onConfirm={handleKitSeleccion}
        />
      )}
    </MainLayout>
  )
}