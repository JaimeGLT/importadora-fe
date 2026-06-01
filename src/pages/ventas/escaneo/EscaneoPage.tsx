import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useVentasStore } from '@/stores/ventasStore'
import { useMarcasStore } from '@/stores/marcasStore'
import { MainLayout } from '@/components/layout/MainLayout'
import type { ItemOrden, PiezaOrden, Producto, AgregarItemOrdenResponse, PiezaKit, ProductoBusquedaEscaneo } from '@/types'
import { playConfirmBeep } from '@/lib/sounds'
import { notify } from '@/lib/notify'
import { api } from '@/lib/api'
import { gql } from '@/lib/graphql'
import { PRODUCTOS_QUERY, PRODUCTO_BY_ID_QUERY, backendToProductoSimple, backendToProducto, type ProductoAPI, type ProductoAPISimple } from '@/lib/queries/inventario.queries'
import { MIS_ORDENES_QUERY, backendToOrdenVenta, type OrdenVentaAPI } from '@/lib/queries/ventas.queries'
import { MARCAS_QUERY, backendToMarca } from '@/lib/queries/marcas.queries'
import { fmtCodigo } from '@/lib/formatCodigo'
import { useVentasHub } from '@/hooks/useVentasHub'
import { clsx } from 'clsx'

// ─── LineSelectionModal ───────────────────────────────────────────────────────

function LineSelectionModal({
  matches,
  onSelect,
  onClose,
}: {
  matches: ItemOrden[]
  onSelect: (item: ItemOrden) => void
  onClose: () => void
}) {
  const { marcas } = useMarcasStore()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(45,43,42,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden border border-[#E8E5E2]">
        <div className="px-6 pt-5 pb-4 border-b border-[#E8E5E2] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#2D2B2A]">Selecciona la línea</h3>
            <p className="text-xs text-[#7A7571] mt-0.5">{matches.length} líneas con el mismo código</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#7A7571] hover:text-[#2D2B2A] hover:bg-[#F0EFEC] transition-colors"
          >
            <i className="ti ti-x text-[18px]" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {matches.map((item, idx) => {
            const isKit = !!item.kit_id
            const isParcial = item.diferencia_kit !== undefined

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full text-left p-3 rounded-xl border border-[#E8E5E2] hover:border-[#780e18]/30 hover:bg-[#FAF5EE] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#F0EFEC] border border-[#E8E5E2] flex items-center justify-center text-xs font-bold text-[#7A7571] shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#2D2B2A] truncate">{item.producto_nombre}</p>
                      {item.marca_nombre && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E8D4B8] text-[#780e18] shrink-0">
                          {item.marca_nombre}
                        </span>
                      )}
                      {isKit && (
                        <span className={clsx(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                          isParcial ? 'bg-[#F5E0A8] text-[#7A5200]' : 'bg-[#E8D4B8] text-[#780e18]'
                        )}>
                          {isParcial ? 'Parcial' : 'Completo'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[#7A7571] mt-0.5">{fmtCodigo(item.producto_codigo, item.marcaId, marcas)}</p>
                    {isKit && (
                      <div className="mt-1.5 px-2 py-1.5 rounded-lg bg-[#F5F0EB] border border-[#E8E5E2]">
                        <p className="text-[10px] text-[#7A7571]">
                          {isParcial
                            ? `Diferencia kit: Bs ${item.diferencia_kit?.toFixed(2)}`
                            : 'Kit completo'}
                        </p>
                      </div>
                    )}
                    {!isKit && (
                      <p className="text-xs text-[#4A4744] mt-1">
                        Precio: Bs {item.precio_unitario.toFixed(2)} c/u
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-[#2D2B2A]">×{item.cantidad_pedida}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="px-4 py-3 border-t border-[#E8E5E2] bg-[#F5F0EB]">
          <p className="text-[11px] text-[#7A7571] text-center">Toca una línea para seleccionarla y continuar</p>
        </div>
      </div>
    </div>
  )
}

// ─── ScanConfirmModal ─────────────────────────────────────────────────────────

function ScanConfirmModal({
  item,
  onConfirm,
  onCancel,
  loading,
}: {
  item: ItemOrden
  onConfirm: (precio?: number) => void
  onCancel: () => void
  loading: boolean
}) {
  const { marcas } = useMarcasStore()
  const [precio, setPrecio] = useState('')
  const isKit = !!item.kit_id
  const isParcial = !!item.es_parcial
  const precioValido = isParcial || !isKit || (parseFloat(precio) > 0)
  const esFaltanteParcial = item.estado === 'faltante' && (item.cantidad_recogida ?? 0) > 0
  const cantidadMostrar = esFaltanteParcial ? item.cantidad_recogida! : item.cantidad_pedida
  const labelCantidad = esFaltanteParcial ? 'Cantidad encontrada' : 'Cantidad pedida'
  const ubicacion = [item.producto_almacen, item.producto_estante, item.producto_fila, item.producto_columna]
    .filter(Boolean).join(' › ')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter' && !loading && precioValido) {
        onConfirm(isKit ? parseFloat(precio) : undefined)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loading, precioValido, isParcial, precio, isKit, onConfirm, onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(45,43,42,0.45)' }}
      onClick={() => !loading && onCancel()}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden border border-[#E8E5E2]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-[#E8E5E2]">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-[#2D2B2A]">Confirmar despacho</h3>
            {isKit && (
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                isParcial ? 'bg-[#F5E0A8] text-[#7A5200]' : 'bg-[#E8D4B8] text-[#780e18]'
              )}>
                {isParcial ? 'Kit Parcial' : 'Kit'}
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-[#7A7571]">{fmtCodigo(item.producto_codigo, item.marcaId, marcas)}</p>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div>
            <p className="text-base font-bold text-[#2D2B2A]">{item.producto_nombre}</p>
            {ubicacion && (
              <p className="text-xs text-[#7A7571] mt-0.5 flex items-center gap-1">
                <i className="ti ti-map-pin text-[11px]" />
                {ubicacion}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#F5F0EB] border border-[#E8E5E2]">
            <span className="text-xs text-[#7A7571]">{labelCantidad}</span>
            <span className="text-sm font-black text-[#2D2B2A]">× {cantidadMostrar}</span>
          </div>

          {isKit && !isParcial && (
            <div>
              <label className="block text-xs font-semibold text-[#2D2B2A] mb-1.5">Precio total del kit (Bs)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                autoFocus
                className="w-full h-10 px-3.5 rounded-xl border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
              />
            </div>
          )}

          {(!isKit || isParcial) && (
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#F5F0EB] border border-[#E8E5E2]">
              <span className="text-xs text-[#7A7571]">Precio unitario</span>
              <span className="text-sm font-bold text-[#2D2B2A]">Bs {item.precio_unitario.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-2">
          <button
            className="flex-1 h-10 rounded-xl border border-[#E8E5E2] text-sm font-semibold text-[#4A4744] hover:bg-[#F0EFEC] transition-colors disabled:opacity-50"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="flex-1 h-10 rounded-xl bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            onClick={() => onConfirm(isKit ? parseFloat(precio) : undefined)}
            disabled={loading || !precioValido}
          >
            {loading ? 'Confirmando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ScanNotInOrderModal ──────────────────────────────────────────────────────

function ScanNotInOrderModal({
  code,
  producto,
  fetchLoading,
  onAgregar,
  onDescartar,
  loading,
}: {
  code: string
  producto: ProductoBusquedaEscaneo | null
  fetchLoading: boolean
  onAgregar: (cantidad: number) => void
  onDescartar: () => void
  loading: boolean
}) {
  const [cantidad, setCantidad] = useState('1')
  const cantidadNum = parseInt(cantidad) || 0

  const pieza = producto?.piezaEscaneadaId != null
    ? producto.piezas?.find(p => p.id === producto.piezaEscaneadaId) ?? null
    : null
  const stockDisponible = pieza
    ? pieza.stockActual - pieza.stockReservado
    : producto
      ? producto.stock_Actual - producto.stockReservado
      : 0
  const puedeAgregar = !!producto && cantidadNum >= 1 && cantidadNum <= stockDisponible

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDescartar()
      if (e.key === 'Enter' && puedeAgregar && !loading) onAgregar(cantidadNum)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [puedeAgregar, loading, cantidadNum, onAgregar, onDescartar])

  const tipoLabel = pieza
    ? 'Pieza suelta'
    : producto?.esKit
      ? 'Kit completo'
      : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(45,43,42,0.45)' }}
      onClick={() => !loading && onDescartar()}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden border border-[#E8E5E2]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-[#E8E5E2]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#F5E0A8] flex items-center justify-center shrink-0">
              <i className="ti ti-alert-triangle text-[#B47A1F] text-[18px]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2D2B2A]">Código no está en esta orden</h3>
              <p className="text-[11px] font-mono text-[#7A7571]">{code}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3">
          {fetchLoading ? (
            <div className="flex items-center justify-center h-12 gap-2 text-sm text-[#7A7571]">
              <i className="ti ti-loader-2 animate-spin text-[16px]" />
              Buscando…
            </div>
          ) : !producto ? (
            <div className="px-3 py-2.5 rounded-lg bg-[#F5F0EB] border border-[#E8E5E2]">
              <p className="text-sm text-[#7A7571]">Código no reconocido en el inventario.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-[#2D2B2A]">
                      {pieza ? pieza.nombre : producto.nombre}
                    </p>
                    {tipoLabel && (
                      <span className={clsx(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                        pieza ? 'bg-[#F5E0A8] text-[#7A5200]' : 'bg-[#E8D4B8] text-[#780e18]'
                      )}>
                        {tipoLabel}
                      </span>
                    )}
                  </div>
                  {pieza && (
                    <p className="text-[11px] text-[#7A7571] mt-0.5">Kit: {producto.nombre}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#F5F0EB] border border-[#E8E5E2]">
                <span className="text-xs text-[#7A7571]">Stock disponible</span>
                <span className={clsx('text-sm font-bold', stockDisponible > 0 ? 'text-[#2D2B2A]' : 'text-[#B23A2A]')}>
                  {stockDisponible} uds.
                </span>
              </div>

              {stockDisponible > 0 ? (
                <div>
                  <label className="block text-xs font-semibold text-[#2D2B2A] mb-1.5">Cantidad a agregar</label>
                  <input
                    type="number"
                    min="1"
                    max={stockDisponible}
                    value={cantidad}
                    onChange={e => setCantidad(e.target.value)}
                    autoFocus
                    className="w-full h-10 px-3.5 rounded-xl border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
                  />
                </div>
              ) : (
                <div className="px-3 py-2.5 rounded-lg bg-[#F5E0A8] border border-[#B47A1F]/30">
                  <p className="text-xs font-semibold text-[#7A5200]">Sin stock disponible.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-2">
          <button
            className="flex-1 h-10 rounded-xl border border-[#E8E5E2] text-sm font-semibold text-[#4A4744] hover:bg-[#F0EFEC] transition-colors disabled:opacity-50"
            onClick={onDescartar}
            disabled={loading}
          >
            Descartar
          </button>
          {puedeAgregar && (
            <button
              className="flex-1 h-10 rounded-xl bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              onClick={() => onAgregar(cantidadNum)}
              disabled={loading || !puedeAgregar}
            >
              {loading ? 'Agregando…' : 'Agregar al pedido'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PiezaScanPriceModal ──────────────────────────────────────────────────────

function PiezaScanPriceModal({
  pieza,
  onConfirm,
  onCancel,
  loading,
}: {
  pieza: PiezaOrden
  onConfirm: (precio: number) => void
  onCancel: () => void
  loading: boolean
}) {
  const { marcas } = useMarcasStore()
  const [precio, setPrecio] = useState(pieza.precio_unitario ? pieza.precio_unitario.toFixed(2) : '')
  const precioNum = parseFloat(precio)
  const valido = !isNaN(precioNum) && precioNum > 0

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter' && !loading && valido) onConfirm(precioNum)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loading, valido, precioNum, onConfirm, onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(45,43,42,0.45)' }}
      onClick={() => !loading && onCancel()}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden border border-[#E8E5E2]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-[#E8E5E2]">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-[#2D2B2A]">Confirmar pieza</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F4ECDB] text-[#780e18]">
              Pieza de kit
            </span>
          </div>
          <p className="text-xs font-mono text-[#7A7571]">{fmtCodigo(pieza.codigo, pieza.marcaId, marcas)}</p>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-base font-bold text-[#2D2B2A]">{pieza.nombre}</p>
          <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#F5F0EB] border border-[#E8E5E2]">
            <span className="text-xs text-[#7A7571]">Cantidad</span>
            <span className="text-sm font-black text-[#2D2B2A]">× {pieza.cantidad}</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#2D2B2A] mb-1.5">Precio unitario (Bs)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              autoFocus
              className="w-full h-10 px-3.5 rounded-xl border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-2">
          <button
            className="flex-1 h-10 rounded-xl border border-[#E8E5E2] text-sm font-semibold text-[#4A4744] hover:bg-[#F0EFEC] transition-colors disabled:opacity-50"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="flex-1 h-10 rounded-xl bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            onClick={() => onConfirm(precioNum)}
            disabled={loading || !valido}
          >
            {loading ? 'Confirmando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AgregarProductoModal ─────────────────────────────────────────────────────

type AgregarRequest =
  | { tipo: 'producto'; producto: Producto; cantidad: number }
  | { tipo: 'kit_completo'; producto: Producto; cantidad: number }
  | { tipo: 'piezas_sueltas'; kitProducto: Producto; piezas: { pieza: PiezaKit; cantidad: number }[] }

function AgregarProductoModal({
  onAgregar,
  onClose,
  loading,
}: {
  onAgregar: (req: AgregarRequest) => void
  onClose: () => void
  loading: boolean
}) {
  const { isTokenReady } = useAuth()
  const { marcas } = useMarcasStore()
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [buscando, setBuscando] = useState(false)
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)
  const [cantidad, setCantidad] = useState('1')
  const [kitDetalle, setKitDetalle] = useState<Producto | null>(null)
  const [fetchingKit, setFetchingKit] = useState(false)
  const [vistaKit, setVistaKit] = useState<'opciones' | 'piezas'>('opciones')
  const [piezasConfig, setPiezasConfig] = useState<{ pieza: PiezaKit; cantidad: number }[]>([])

  useEffect(() => {
    if (!query.trim() || !isTokenReady) { setResultados([]); return }
    const q = query.trim()
    const timer = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await gql<{ productos: { nodes: ProductoAPI[] } }>(PRODUCTOS_QUERY, {
          first: 8,
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
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, isTokenReady])

  const handleSelectProducto = async (p: Producto) => {
    setSeleccionado(p)
    setCantidad('1')
    setKitDetalle(null)
    setVistaKit('opciones')
    if (p.es_kit) {
      setFetchingKit(true)
      try {
        const res = await gql<{ productos: { nodes: ProductoAPI[] } }>(
          PRODUCTO_BY_ID_QUERY, { id: parseInt(p.id) }
        )
        const full = backendToProducto(res.productos?.nodes?.[0])
        setKitDetalle(full)
        setPiezasConfig((full.piezas_kit ?? []).map(pz => ({ pieza: pz, cantidad: pz.cantidad_por_kit })))
      } catch {
        notify.error('Error al cargar piezas del kit')
        setSeleccionado(null)
      } finally {
        setFetchingKit(false)
      }
    }
  }

  const cantidadNum = parseInt(cantidad) || 0
  const disp = seleccionado ? Math.max(0, seleccionado.stock - (seleccionado.stock_reservado ?? 0)) : 0

  const puedeAgregar = (() => {
    if (!seleccionado) return false
    if (seleccionado.es_kit) {
      if (fetchingKit || !kitDetalle) return false
      if (vistaKit === 'opciones') return cantidadNum >= 1 && cantidadNum <= disp
      return piezasConfig.some(p => p.cantidad > 0)
    }
    return cantidadNum >= 1 && cantidadNum <= disp
  })()

  const handleConfirmar = () => {
    if (!seleccionado) return
    if (seleccionado.es_kit && kitDetalle) {
      if (vistaKit === 'opciones') {
        onAgregar({ tipo: 'kit_completo', producto: seleccionado, cantidad: cantidadNum })
      } else {
        onAgregar({ tipo: 'piezas_sueltas', kitProducto: seleccionado, piezas: piezasConfig.filter(p => p.cantidad > 0) })
      }
    } else {
      onAgregar({ tipo: 'producto', producto: seleccionado, cantidad: cantidadNum })
    }
  }

  const resetSeleccion = () => {
    setSeleccionado(null)
    setKitDetalle(null)
    setVistaKit('opciones')
    setPiezasConfig([])
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(45,43,42,0.45)' }}
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden border border-[#E8E5E2] flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-[#E8E5E2] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[#2D2B2A]">Agregar producto</h3>
            <p className="text-xs text-[#7A7571] mt-0.5">Busca y selecciona el producto a agregar</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#7A7571] hover:text-[#2D2B2A] hover:bg-[#F0EFEC] transition-colors"
          >
            <i className="ti ti-x text-[18px]" />
          </button>
        </div>

        {!seleccionado ? (
          <>
            <div className="px-4 pt-3 pb-2 border-b border-[#E8E5E2] shrink-0">
              <div className="flex items-center gap-2 bg-[#F7F7F7] border border-[#D8D4D0] rounded-lg px-3.5 focus-within:border-[#780e18] transition-colors">
                <i className="ti ti-search text-[#7A7571] text-[13px] shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar por código o nombre…"
                  className="flex-1 py-2.5 bg-transparent text-[13px] text-[#2D2B2A] placeholder:text-[#7A7571] outline-none border-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {buscando ? (
                <div className="divide-y divide-[#E8E5E2] px-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 rounded bg-[#F0EFEC]" />
                        <div className="h-2.5 w-40 rounded bg-[#F0EFEC]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : query.trim() === '' ? (
                <div className="flex items-center justify-center h-32 text-sm text-[#7A7571]">Escribe para buscar</div>
              ) : resultados.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-[#7A7571]">Sin resultados</div>
              ) : (
                <div className="divide-y divide-[#E8E5E2]">
                  {resultados.map(p => {
                    const dispP = Math.max(0, p.stock - (p.stock_reservado ?? 0))
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProducto(p)}
                        disabled={!p.es_kit && dispP === 0}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAF5EE] transition-colors text-left disabled:opacity-40"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-[#780e18] bg-[#F4ECDB] px-1.5 py-0.5 rounded">
                              {fmtCodigo(p.codigo_universal, p.marcaId, marcas)}
                            </span>
                            {p.es_kit && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E8D4B8] text-[#780e18]">KIT</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-[#4A4744] truncate mt-0.5">{p.nombre}</p>
                          {p.es_kit ? (
                            <p className="text-[11px] font-semibold mt-0.5 text-[#780e18]">Kit de productos</p>
                          ) : (
                            <p className={clsx('text-[11px] font-semibold mt-0.5', dispP === 0 ? 'text-[#B23A2A]' : 'text-[#3F7A52]')}>{dispP} disponibles</p>
                          )}
                        </div>
                        <i className="ti ti-chevron-right text-[#D0CBC4] text-[16px] shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : seleccionado.es_kit ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F4ECDB]/50 border border-[#E8D4B8]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#780e18] bg-[#F4ECDB] px-1.5 py-0.5 rounded">
                    {fmtCodigo(seleccionado.codigo_universal, seleccionado.marcaId, marcas)}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E8D4B8] text-[#780e18]">KIT</span>
                </div>
                <p className="text-sm font-semibold text-[#2D2B2A] mt-1">{seleccionado.nombre}</p>
              </div>
              <button
                onClick={resetSeleccion}
                className="p-1 rounded-lg text-[#7A7571] hover:text-[#2D2B2A] hover:bg-[#F0EFEC] transition-colors shrink-0"
              >
                <i className="ti ti-x text-[16px]" />
              </button>
            </div>

            {fetchingKit ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg bg-[#F0EFEC]" />)}
              </div>
            ) : kitDetalle ? (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVistaKit('opciones')}
                    className={clsx(
                      'flex-1 py-2 rounded-xl text-sm font-semibold border transition-all',
                      vistaKit === 'opciones'
                        ? 'bg-[#780e18] text-white border-[#780e18]'
                        : 'bg-white text-[#4A4744] border-[#E8E5E2] hover:border-[#780e18]/30'
                    )}
                  >
                    Kit completo
                  </button>
                  <button
                    onClick={() => setVistaKit('piezas')}
                    className={clsx(
                      'flex-1 py-2 rounded-xl text-sm font-semibold border transition-all',
                      vistaKit === 'piezas'
                        ? 'bg-[#780e18] text-white border-[#780e18]'
                        : 'bg-white text-[#4A4744] border-[#E8E5E2] hover:border-[#780e18]/30'
                    )}
                  >
                    Piezas sueltas
                  </button>
                </div>

                {vistaKit === 'opciones' ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#2D2B2A] mb-1.5">Cantidad de kits (máx. {disp})</label>
                    <input
                      type="number"
                      min="1"
                      max={disp}
                      value={cantidad}
                      onChange={e => setCantidad(e.target.value)}
                      autoFocus
                      className="w-full h-10 px-3.5 rounded-xl border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10.5px] font-semibold text-[#7A7571] uppercase tracking-[0.12em]">Piezas del kit</p>
                    {piezasConfig.length === 0 ? (
                      <p className="text-sm text-[#7A7571] text-center py-4">Este kit no tiene piezas registradas</p>
                    ) : (
                      piezasConfig.map((pc, idx) => {
                        const dispPieza = Math.max(0, pc.pieza.stock_actual - pc.pieza.stock_reservado)
                        return (
                          <div key={pc.pieza.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F0EB] border border-[#E8E5E2]">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#2D2B2A] truncate">{pc.pieza.nombre}</p>
                              <p className="text-[11px] font-mono text-[#7A7571]">{pc.pieza.codigo_universal}</p>
                              <p className={clsx('text-[11px] font-semibold mt-0.5', dispPieza === 0 ? 'text-[#B23A2A]' : 'text-[#3F7A52]')}>
                                {dispPieza} disp.
                              </p>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max={dispPieza}
                              value={pc.cantidad}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0)
                                setPiezasConfig(prev => prev.map((x, i) => i === idx ? { ...x, cantidad: val } : x))
                              }}
                              className="w-16 h-8 text-center text-sm font-bold border border-[#E8E5E2] rounded-lg focus:outline-none focus:border-[#780e18] transition-all"
                            />
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F5F0EB] border border-[#E8E5E2]">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs font-black text-[#780e18] bg-[#F4ECDB] px-1.5 py-0.5 rounded">
                  {fmtCodigo(seleccionado.codigo_universal, seleccionado.marcaId, marcas)}
                </span>
                <p className="text-sm font-semibold text-[#2D2B2A] mt-1">{seleccionado.nombre}</p>
                <p className="text-xs text-[#3F7A52] font-semibold mt-0.5">{disp} disponibles</p>
              </div>
              <button
                onClick={resetSeleccion}
                className="p-1 rounded-lg text-[#7A7571] hover:text-[#2D2B2A] hover:bg-[#EDE8E3] transition-colors shrink-0"
              >
                <i className="ti ti-x text-[16px]" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2D2B2A] mb-1.5">Cantidad (máx. {disp})</label>
              <input
                type="number"
                min="1"
                max={disp}
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                autoFocus
                className="w-full h-10 px-3.5 rounded-xl border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
              />
            </div>
          </div>
        )}

        <div className="px-6 pb-6 pt-3 flex gap-2 border-t border-[#E8E5E2] shrink-0">
          <button
            className="flex-1 h-10 rounded-xl border border-[#E8E5E2] text-sm font-semibold text-[#4A4744] hover:bg-[#F0EFEC] transition-colors disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          {seleccionado && (
            <button
              className="flex-1 h-10 rounded-xl bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              onClick={handleConfirmar}
              disabled={loading || !puedeAgregar}
            >
              {loading ? 'Agregando…' : 'Agregar al pedido'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── EscaneoPage ──────────────────────────────────────────────────────────────

export function EscaneoPage() {
  const { isTokenReady } = useAuth()
  const { ordenes, setOrdenes, updateOrden, addItemToOrden, removeItemFromOrden, updateItemQtyInOrden, markItemListoEnOrden, updateItemEstadoEnOrden } = useVentasStore()
  const { marcas, setMarcas } = useMarcasStore()
  const [selectedOrdenId, setSelectedOrdenId] = useState<string | null>(null)
  const [loadingOrdenes, setLoadingOrdenes] = useState(false)
  const [confirmedItemIds, setConfirmedItemIds] = useState<Set<string>>(new Set())
  const [pendingConfirmItem, setPendingConfirmItem] = useState<ItemOrden | null>(null)
  const [pendingNotInOrderCode, setPendingNotInOrderCode] = useState<string | null>(null)
  const [selectMultipleMatches, setSelectMultipleMatches] = useState<ItemOrden[]>([])
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [agregarLoading, setAgregarLoading] = useState(false)
  const [completarLoading, setCompletarLoading] = useState(false)
  const [showAgregarModal, setShowAgregarModal] = useState(false)
  const [itemLoading, setItemLoading] = useState<Record<string, boolean>>({})
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)
  const [flashItemId, setFlashItemId] = useState<string | null>(null)
  const [piezaPrecios, setPiezaPrecios] = useState<Record<number, string>>({})
  const [piezaLoading, setPiezaLoading] = useState<Record<number, boolean>>({})
  const [confirmedPiezaPrices, setConfirmedPiezaPrices] = useState<Record<number, number>>({})
  const [confirmedPiezaIds, setConfirmedPiezaIds] = useState<Set<number>>(new Set())
  const [notInOrderProducto, setNotInOrderProducto] = useState<ProductoBusquedaEscaneo | null>(null)
  const [notInOrderLoading, setNotInOrderLoading] = useState(false)
  const [_pendingNotInOrderMarcaId, setPendingNotInOrderMarcaId] = useState<number | null>(null)
  const [pendingPiezaScan, setPendingPiezaScan] = useState<{ item: ItemOrden; pieza: PiezaOrden } | null>(null)
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({})
  const scanInputRef = useRef<HTMLInputElement>(null)

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }, [])

  // Cargar marcas al montar si el store está vacío (necesario para detección de prefijos)
  useEffect(() => {
    if (!isTokenReady || marcas.length > 0) return
    gql<{ marca: { nodes: Array<{ id: number; nombre: string; prefijo: string }> } }>(MARCAS_QUERY)
      .then(res => setMarcas((res.marca?.nodes ?? []).map(backendToMarca)))
      .catch(() => {})
  }, [isTokenReady, marcas.length, setMarcas])

  // Buscar producto por código cuando se escanea algo fuera de la orden
  useEffect(() => {
    if (!pendingNotInOrderCode || !isTokenReady) { setNotInOrderProducto(null); return }
    const code = pendingNotInOrderCode
    setNotInOrderLoading(true)
    api.get<ProductoBusquedaEscaneo>(`/Producto/buscar?codigo=${encodeURIComponent(code)}`)
      .then(res => { setNotInOrderProducto(res); setNotInOrderLoading(false) })
      .catch(() => { setNotInOrderProducto(null); setNotInOrderLoading(false) })
  }, [pendingNotInOrderCode, isTokenReady])

  const { joinGrupo } = useVentasHub({
    onItemListoParaScaneo: useCallback((p: { ordenId: number; itemId: number }) => {
      if (selectedOrdenId === String(p.ordenId)) {
        markItemListoEnOrden(String(p.ordenId), String(p.itemId))
        notify.success('Producto listo para escanear', { description: 'El almacenero ya trajo el producto' })
      }
    }, [selectedOrdenId, markItemListoEnOrden]),
    onOrdenConFaltantes: useCallback((p: { ordenId: number }) => {
      updateOrden(String(p.ordenId), { estado: 'con_faltantes' })
    }, [updateOrden]),
    onOrdenLista: useCallback((p: { id: number }) => {
      updateOrden(String(p.id), { estado: 'listo_para_escaneo' })
      if (selectedOrdenId === String(p.id)) {
        notify.success('Almacenero listo', { description: 'Ya puedes continuar escaneando' })
        scanInputRef.current?.focus()
      }
    }, [selectedOrdenId, updateOrden]),
  }, isTokenReady)

  const joinGrupoRef = useRef<(g: string) => Promise<void>>(() => Promise.resolve())
  joinGrupoRef.current = joinGrupo

  const handleRecargar = useCallback(() => {
    if (!isTokenReady) return
    setLoadingOrdenes(true)
    gql<{ misOrdenes: { nodes: OrdenVentaAPI[] } }>(MIS_ORDENES_QUERY)
      .then(data => {
        const fetched = (data.misOrdenes?.nodes ?? [])
          .map(backendToOrdenVenta)
          .filter(o => o.estado !== 'completada' && o.estado !== 'cancelada')
        const { ordenes: current } = useVentasStore.getState()
        const fetchedMap = new Map(fetched.map(o => [o.id, o]))
        const merged = current.map(o => fetchedMap.get(o.id) ?? o)
        const newOnes = fetched.filter(o => !current.some(c => c.id === o.id))
        const all = [...merged, ...newOnes]
        setOrdenes(all)
        all.forEach(o => joinGrupoRef.current(`orden-${o.id}`))
      })
      .catch(() => notify.error('Error al cargar órdenes'))
      .finally(() => setLoadingOrdenes(false))
  }, [isTokenReady, setOrdenes])

  useEffect(() => {
    handleRecargar()
  }, [handleRecargar])

  useEffect(() => {
    scanInputRef.current?.focus()
  }, [selectedOrdenId])

  useEffect(() => {
    if (selectedOrdenId) {
      joinGrupo(`orden-${selectedOrdenId}`)
    }
  }, [selectedOrdenId, joinGrupo])

  const selectedOrden = useMemo(
    () => ordenes.find((o) => o.id === selectedOrdenId) ?? null,
    [ordenes, selectedOrdenId],
  )

  // Pre-marcar ítems que ya vienen confirmados del backend (recarga de página)
  useEffect(() => {
    if (!selectedOrden) return
    const yaConfirmados = selectedOrden.items
      .filter(i => i.estado === 'completo')
      .map(i => i.id)
    if (yaConfirmados.length > 0) {
      setConfirmedItemIds(prev => new Set([...prev, ...yaConfirmados]))
    }
  }, [selectedOrden?.id])

  // Ítems que el almacenero encontró (total o parcialmente) — van a la sección de escaneo
  const itemsParaEscanear = useMemo(
    () => selectedOrden?.items.filter(i => {
      if (i.estado !== 'faltante') return true
      if (i.es_parcial && i.piezas_orden?.length)
        return i.piezas_orden.some(p =>
          (p.listo_almacenero && !p.nota_incompleto) ||
          (!!p.nota_incompleto && (p.cantidad_recogida ?? 0) > 0)
        )
      return (i.cantidad_recogida ?? 0) > 0
    }) ?? [],
    [selectedOrden],
  )

  const itemsEscaneables = useMemo(
    () => itemsParaEscanear.filter(i => i.estado !== 'pendiente'),
    [itemsParaEscanear],
  )

  const isItemConfirmed = (item: ItemOrden) => {
    if (item.es_parcial && item.piezas_orden?.length) {
      return item.piezas_orden.every(p =>
        confirmedPiezaIds.has(p.id) || !!p.confirmado || !!p.nota_incompleto
      )
    }
    return confirmedItemIds.has(item.id)
  }

  const allConfirmed = itemsEscaneables.length > 0 &&
    itemsEscaneables.every(i => isItemConfirmed(i)) &&
    itemsParaEscanear.every(i => i.estado !== 'pendiente')

  // Solo los faltantes totales (0 encontrados) van tachados abajo
  // Los parciales también aparecen tachados pero solo por la cantidad faltante
  const faltanteItems = useMemo(
    () => selectedOrden?.items.filter(i => i.estado === 'faltante' && !i.es_parcial) ?? [],
    [selectedOrden]
  )

  const faltantePiezas = useMemo(() => {
    const result: Array<{ itemNombre: string; pieza: PiezaOrden }> = []
    for (const item of selectedOrden?.items ?? []) {
      if (!item.es_parcial || !item.piezas_orden?.length) continue
      for (const pieza of item.piezas_orden) {
        if (pieza.nota_incompleto && !(pieza.cantidad_recogida ?? 0)) {
          result.push({ itemNombre: item.producto_nombre, pieza })
        }
      }
    }
    return result
  }, [selectedOrden])

  const faltantesCount = faltanteItems.length + faltantePiezas.length

  const totalSinFaltantes = useMemo(
    () => itemsParaEscanear.reduce((s, i) => {
      if (i.es_parcial && i.piezas_orden?.length) {
        return s + i.piezas_orden.reduce((ps, p) => {
          const precio = confirmedPiezaPrices[p.id] ?? p.precio_unitario ?? 0
          const qty = p.nota_incompleto ? (p.cantidad_recogida ?? 0) : p.cantidad
          return ps + precio * qty
        }, 0)
      }
      const qty = i.estado === 'faltante' ? (i.cantidad_recogida ?? 0) : i.cantidad_pedida
      return s + i.precio_unitario * qty
    }, 0),
    [itemsParaEscanear, confirmedPiezaPrices]
  )

  const setItemLoadingState = (itemId: string, val: boolean) =>
    setItemLoading(prev => ({ ...prev, [itemId]: val }))

  const handleEliminarItem = async (item: ItemOrden) => {
    if (!selectedOrden) return
    setItemLoadingState(item.id, true)
    try {
      await api.delete(`/OrdenVenta/${selectedOrden.id}/Items/${item.id}`)
      removeItemFromOrden(selectedOrden.id, item.id)
      setConfirmedItemIds(prev => { const n = new Set(prev); n.delete(item.id); return n })
      setConfirmEliminar(null)
      notify.success(`${item.producto_nombre} eliminado del pedido`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setItemLoadingState(item.id, false)
    }
  }

  const handleAjustarCantidad = async (item: ItemOrden, delta: number) => {
    if (!selectedOrden) return
    const nuevaCantidad = item.cantidad_pedida + delta
    if (nuevaCantidad < 1) return
    setItemLoadingState(item.id, true)
    try {
      await api.put(`/OrdenVenta/${selectedOrden.id}/Items/${item.id}/Cantidad`, { cantidad: nuevaCantidad })
      updateItemQtyInOrden(selectedOrden.id, item.id, nuevaCantidad)
      if (delta > 0 && item.estado === 'listo_almacenero') {
        updateItemEstadoEnOrden(selectedOrden.id, item.id, 'pendiente')
        updateOrden(selectedOrden.id, { estado: 'con_faltantes' })
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al actualizar cantidad')
    } finally {
      setItemLoadingState(item.id, false)
    }
  }

  const handleConfirmarPieza = async (item: ItemOrden, pieza: PiezaOrden) => {
    if (!selectedOrden) return
    const precio = parseFloat(piezaPrecios[pieza.id] ?? String(pieza.precio_unitario ?? ''))
    if (isNaN(precio) || precio <= 0) { notify.warning('Ingresa un precio válido'); return }
    setPiezaLoading(prev => ({ ...prev, [pieza.id]: true }))
    try {
      await api.post(
        `/OrdenVenta/${selectedOrden.id}/Items/${item.id}/Piezas/${pieza.id}/Confirmar`,
        { PrecioUnitario: precio }
      )
      setConfirmedPiezaIds(prev => new Set([...prev, pieza.id]))
      setConfirmedPiezaPrices(prev => ({ ...prev, [pieza.id]: precio }))
      playConfirmBeep()
      notify.success(`${pieza.nombre} confirmada`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al confirmar pieza')
    } finally {
      setPiezaLoading(prev => ({ ...prev, [pieza.id]: false }))
    }
  }

  const handleAgregarProducto = async (req: AgregarRequest) => {
    if (!selectedOrden) return
    setAgregarLoading(true)
    try {
      if (req.tipo === 'piezas_sueltas') {
        for (const { pieza, cantidad } of req.piezas) {
          const res = await api.post<AgregarItemOrdenResponse>(
            `/OrdenVenta/${selectedOrden.id}/AgregarItem`,
            { Id_Produto: parseInt(req.kitProducto.id), Id_Pieza: pieza.id, Cantidad: cantidad }
          )
          const newItem: ItemOrden = {
            id: String(res.id),
            producto_id: String(res.idProducto ?? res.id_Produto ?? parseInt(req.kitProducto.id)),
            producto_codigo: res.producto.codigo,
            producto_nombre: res.producto.nombre,
            producto_almacen: '',
            producto_estante: '',
            producto_fila: '',
            producto_columna: '',
            cantidad_pedida: res.cantidad,
            precio_unitario: res.precioUnitario,
            subtotal: res.precioUnitario * res.cantidad,
            estado: 'pendiente',
            kit_id: req.kitProducto.id,
            es_parcial: true,
            piezas_orden: res.piezas?.[0] ? [{
              id: res.piezas[0].id,
              id_pieza: res.piezas[0].idPieza,
              nombre: pieza.nombre,
              codigo: pieza.codigo_universal,
              cantidad: res.cantidad,
              precio_unitario: res.precioUnitario,
            }] : undefined,
          }
          addItemToOrden(selectedOrden.id, newItem)
        }
        notify.success(`Piezas de ${req.kitProducto.nombre} agregadas — almacén notificado`)
      } else {
        const { producto, cantidad } = req
        const res = await api.post<AgregarItemOrdenResponse>(
          `/OrdenVenta/${selectedOrden.id}/AgregarItem`,
          { Id_Produto: parseInt(producto.id), Cantidad: cantidad }
        )
        const newItem: ItemOrden = {
          id: String(res.id),
          producto_id: String(res.idProducto ?? res.id_Produto ?? parseInt(producto.id)),
          producto_codigo: res.producto.codigo,
          producto_nombre: res.producto.nombre,
          producto_almacen: producto.almacen,
          producto_estante: producto.estante,
          producto_fila: producto.fila,
          producto_columna: producto.columna,
          cantidad_pedida: res.cantidad,
          precio_unitario: res.precioUnitario,
          subtotal: res.precioUnitario * res.cantidad,
          estado: 'pendiente',
          es_kit: res.producto.esKit,
        }
        addItemToOrden(selectedOrden.id, newItem)
        notify.success(`${newItem.producto_nombre} agregado — almacén notificado`)
      }
      setShowAgregarModal(false)
      scanInputRef.current?.focus()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al agregar')
    } finally {
      setAgregarLoading(false)
    }
  }

  const autoConfirmarItem = useCallback(async (item: ItemOrden) => {
    if (!selectedOrden) return
    setConfirmLoading(true)
    try {
      await api.post(`/OrdenVenta/${selectedOrden.id}/Items/${item.id}/Confirmar`, undefined)
      setConfirmedItemIds(prev => new Set([...prev, item.id]))
      setFlashItemId(item.id)
      setTimeout(() => setFlashItemId(null), 1200)
      playConfirmBeep()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al confirmar')
    } finally {
      setConfirmLoading(false)
      scanInputRef.current?.focus()
    }
  }, [selectedOrden, playConfirmBeep])

  const handleScan = (code: string) => {
    if (!selectedOrden) return
    // Guard: ignore scan if any modal is open
    if (pendingConfirmItem || pendingNotInOrderCode !== null || selectMultipleMatches.length > 0 || pendingPiezaScan) return

    // Detectar formato PREFIJO-CODIGOUNIVERSAL
    const dashIdx = code.indexOf('-')
    let resolvedCode = code
    let resolvedMarcaId: number | null = null
    if (dashIdx > 0) {
      const prefix = code.slice(0, dashIdx).toUpperCase()
      const rawCode = code.slice(dashIdx + 1)
      const marcaByPrefijo = marcas.find(m => m.prefijo.toUpperCase() === prefix)
      if (marcaByPrefijo) {
        resolvedCode = rawCode
        resolvedMarcaId = marcaByPrefijo.id
      }
    }

    const codeLower = resolvedCode.toLowerCase().trim()
    const matched = itemsEscaneables.filter((i) => {
      const codeMatch = i.producto_codigo.toLowerCase() === codeLower || i.producto_id.toLowerCase() === codeLower
      if (!codeMatch) return false
      // Si se detectó prefijo de marca, filtrar también por marcaId
      if (resolvedMarcaId !== null) return i.marcaId === resolvedMarcaId
      return true
    })

    if (matched.length > 1) {
      if (resolvedMarcaId !== null) {
        const firstPending = matched.find(i => !confirmedItemIds.has(i.id) && !i.es_parcial)
        if (firstPending) {
          if (firstPending.kit_id && !firstPending.es_parcial) {
            autoConfirmarItem(firstPending)
          } else {
            const targetQty = firstPending.estado === 'faltante'
              ? (firstPending.cantidad_recogida ?? 0)
              : firstPending.cantidad_pedida
            const current = scanCounts[firstPending.id] ?? 0
            const next = current + 1
            playConfirmBeep()
            setFlashItemId(firstPending.id)
            setTimeout(() => setFlashItemId(null), 600)
            if (next >= targetQty) {
              setScanCounts(prev => { const n = { ...prev }; delete n[firstPending.id]; return n })
              autoConfirmarItem(firstPending)
            } else {
              setScanCounts(prev => ({ ...prev, [firstPending.id]: next }))
            }
          }
          return
        }
        notify.warning('Todos los ítems para este producto ya fueron confirmados')
        return
      }
      setSelectMultipleMatches(matched)
      return
    }

    if (matched.length === 1) {
      const item = matched[0]
      // Ítems parciales: el código del kit padre no es escaneable directamente
      if (item.es_parcial) {
        notify.warning('Escanea el código de cada pieza individualmente')
        return
      }
      if (confirmedItemIds.has(item.id)) {
        notify.warning('Este ítem ya fue confirmado')
        return
      }
      // Kit no-parcial: una pasada confirma todo
      if (item.kit_id && !item.es_parcial) {
        autoConfirmarItem(item)
        return
      }
      // Kit parcial: abrir modal
      if (item.kit_id && item.es_parcial) {
        setPendingConfirmItem(item)
        return
      }
      // Producto regular: contar de a 1
      const targetQty = item.estado === 'faltante'
        ? (item.cantidad_recogida ?? 0)
        : item.cantidad_pedida
      const current = scanCounts[item.id] ?? 0
      const next = current + 1

      playConfirmBeep()
      setFlashItemId(item.id)
      setTimeout(() => setFlashItemId(null), 600)

      if (next >= targetQty) {
        // Última unidad → confirmar en backend y limpiar contador
        setScanCounts(prev => { const n = { ...prev }; delete n[item.id]; return n })
        autoConfirmarItem(item)
      } else {
        setScanCounts(prev => ({ ...prev, [item.id]: next }))
      }
      return
    }

    // Buscar si el código pertenece a una pieza de un kit parcial
    const piezaFound = itemsEscaneables
      .flatMap(i => (i.piezas_orden ?? []).map(p => ({ item: i, pieza: p })))
      .find(({ pieza }) => pieza.codigo.toLowerCase() === codeLower)

    if (piezaFound) {
      const { item, pieza } = piezaFound
      if (confirmedPiezaIds.has(pieza.id) || pieza.confirmado) {
        notify.warning(`${pieza.nombre} ya fue confirmada`)
        return
      }
      if (pieza.nota_incompleto && !(pieza.cantidad_recogida ?? 0)) {
        notify.warning(`${pieza.nombre} está marcada como faltante`)
        return
      }
      if (pieza.precio_unitario && pieza.precio_unitario > 0) {
        // Precio conocido → auto-confirmar
        handleConfirmarPieza(item, pieza)
      } else {
        // Sin precio → pedir precio
        setPendingPiezaScan({ item, pieza })
      }
      return
    }

    // Not found in order — pasar código original con prefijo; backend lo resuelve
    setPendingNotInOrderMarcaId(resolvedMarcaId)
    setPendingNotInOrderCode(code)
  }

  const handleSelectMatch = (item: ItemOrden) => {
    setSelectMultipleMatches([])
    if (confirmedItemIds.has(item.id)) {
      notify.warning('Este ítem ya fue confirmado')
      return
    }
    if (item.kit_id && !item.es_parcial) {
      autoConfirmarItem(item)
      return
    }
    setPendingConfirmItem(item)
  }

  const handleConfirmScan = async (precio?: number) => {
    if (!pendingConfirmItem || !selectedOrden) return
    const item = pendingConfirmItem
    setConfirmLoading(true)
    try {
      if (item.es_parcial && item.piezas_orden?.[0]) {
        const pieza = item.piezas_orden[0]
        await api.post(
          `/OrdenVenta/${selectedOrden.id}/Items/${item.id}/Piezas/${pieza.id}/Confirmar`,
          { precioUnitario: precio ?? item.precio_unitario }
        )
      } else {
        const body = item.kit_id && precio !== undefined ? { precioUnitario: precio } : undefined
        await api.post(`/OrdenVenta/${selectedOrden.id}/Items/${item.id}/Confirmar`, body)
      }
      setConfirmedItemIds(prev => new Set([...prev, item.id]))
      playConfirmBeep()
      notify.success(`${item.producto_nombre} confirmado`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al confirmar')
    } finally {
      setConfirmLoading(false)
      setPendingConfirmItem(null)
      scanInputRef.current?.focus()
    }
  }

  const handleAgregarItem = async (cantidad: number) => {
    if (!pendingNotInOrderCode || !selectedOrden || !notInOrderProducto) return
    const p = notInOrderProducto
    setAgregarLoading(true)
    try {
      const body: { Id_Produto?: number; Id_Pieza?: number; Cantidad: number } = { Cantidad: cantidad }
      if (p.piezaEscaneadaId != null) {
        body.Id_Produto = p.id
        body.Id_Pieza = p.piezaEscaneadaId
      } else {
        body.Id_Produto = p.id
      }
      const res = await api.post<AgregarItemOrdenResponse>(
        `/OrdenVenta/${selectedOrden.id}/AgregarItem`,
        body
      )
      const parts = (res.producto.ubicacion ?? '').split('/')
      const [almacen = '', estante = '', fila = '', columna = ''] =
        parts.length >= 4 ? parts : ['', ...parts]
      let newItem: ItemOrden
      if (res.esParcial && res.piezas?.[0]) {
        const piezaItemId = res.piezas[0].id
        const piezaCatalogo = p.piezas?.find(pz => pz.id === res.piezas![0].idPieza)
        newItem = {
          id: String(res.id),
          producto_id: String(res.idProducto ?? res.id_Produto ?? p.id),
          producto_codigo: res.producto.codigo,
          producto_nombre: res.producto.nombre,
          producto_almacen: almacen,
          producto_estante: estante,
          producto_fila: fila,
          producto_columna: columna,
          cantidad_pedida: res.cantidad,
          precio_unitario: res.precioUnitario,
          subtotal: res.precioUnitario * res.cantidad,
          estado: 'pendiente',
          es_parcial: true,
          piezas_orden: [{
            id: piezaItemId,
            id_pieza: res.piezas[0].idPieza,
            nombre: piezaCatalogo?.nombre ?? '',
            codigo: piezaCatalogo?.codigoUniversal ?? '',
            cantidad: res.cantidad,
            precio_unitario: res.precioUnitario,
          }],
        }
      } else {
        newItem = {
          id: String(res.id),
          producto_id: String(res.idProducto ?? res.id_Produto ?? p.id),
          producto_codigo: res.producto.codigo,
          producto_nombre: res.producto.nombre,
          producto_almacen: almacen,
          producto_estante: estante,
          producto_fila: fila,
          producto_columna: columna,
          cantidad_pedida: res.cantidad,
          precio_unitario: res.precioUnitario,
          subtotal: res.precioUnitario * res.cantidad,
          estado: 'pendiente',
          es_kit: res.producto.esKit,
        }
      }
      addItemToOrden(selectedOrden.id, newItem)
      notify.info(`${newItem.producto_nombre} agregado a la orden`)
      setPendingNotInOrderCode(null)
      setPendingNotInOrderMarcaId(null)
      setNotInOrderProducto(null)
      setPendingConfirmItem(newItem)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al agregar')
    } finally {
      setAgregarLoading(false)
    }
  }

  const handleMarcarEsperandoPago = async () => {
    if (!selectedOrden) return
    setCompletarLoading(true)
    try {
      await api.post(`/OrdenVenta/${selectedOrden.id}/MarcarEsperandoPago`, undefined)
      updateOrden(selectedOrden.id, { estado: 'esperando_pago' })
      notify.success('Orden enviada a caja para cobro')
      setSelectedOrdenId(null)
      setConfirmedItemIds(new Set())
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al enviar a caja')
    } finally {
      setCompletarLoading(false)
    }
  }

  const ordenesDisponibles = ordenes.filter((o) => o.estado === 'listo_para_escaneo' || o.estado === 'con_faltantes')

  return (
    <MainLayout>
      <div className="bg-[#F7F7F7] min-h-screen">

        {/* ── TopBar ── */}
        <header className="bg-[#F7F7F7]/85 backdrop-blur-md sticky top-0 z-40 flex justify-between items-center w-full h-[62px] px-7 border-b border-[#E8E5E2]">
          <div className="flex items-center gap-2 text-sm text-[#7A7571]">
            <span>Ventas</span>
            <span className="text-[10px] opacity-40">/</span>
            <strong className="text-[#2D2B2A] font-semibold">Punto de escaneo</strong>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex bg-white px-3.5 py-1.5 rounded-lg items-center gap-2 border border-[#D8D4D0]">
              <i className="ti ti-calendar text-[#7A7571] text-[15px]" />
              <span className="text-xs text-[#4A4744]">{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-white border border-[#D8D4D0] text-[#4A4744] hover:bg-[#F7F7F7] transition-colors relative"
                title="Notificaciones"
              >
                <i className="ti ti-bell text-[15px]" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#B23A2A]" />
              </button>
              <button
                className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-white border border-[#D8D4D0] text-[#4A4744] hover:bg-[#F7F7F7] transition-colors"
                title="Configuración"
              >
                <i className="ti ti-settings text-[15px]" />
              </button>
            </div>
          </div>
        </header>

        <div className="px-7 pt-4 pb-0 max-w-[1400px] mx-auto">

          {/* ── Page Header ── */}
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-semibold text-[22px] text-[#2D2B2A] leading-none tracking-[-0.022em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Punto de escaneo
            </h2>
            <span className="text-[12px] text-[#7A7571]">Confirma productos y envía órdenes a caja</span>
          </div>

          <div className="flex gap-5" style={{ height: 'calc(100vh - 148px)' }}>

            {/* ── Lista de órdenes ── */}
            <div className="w-72 shrink-0 flex flex-col gap-2.5 overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] font-semibold text-[#7A7571] uppercase tracking-[0.12em]">Órdenes</p>
                <button
                  onClick={handleRecargar}
                  disabled={loadingOrdenes}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#D8D4D0] text-[#4A4744] text-[11px] font-semibold hover:border-[#780e18] hover:text-[#780e18] hover:bg-[#FAF5EE] disabled:opacity-40 transition-all shadow-sm"
                  title="Recargar órdenes"
                >
                  <i className={clsx('ti ti-refresh text-[13px]', loadingOrdenes && 'animate-spin')} />
                  Recargar
                </button>
              </div>
              {loadingOrdenes ? (
                <div className="flex flex-col gap-2.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 rounded-xl border border-[#E8E5E2] bg-white animate-pulse">
                      <div className="h-2.5 w-16 bg-[#F0EFEC] rounded mb-2" />
                      <div className="h-3.5 w-32 bg-[#F0EFEC] rounded mb-2" />
                      <div className="h-2.5 w-24 bg-[#F0EFEC] rounded" />
                    </div>
                  ))}
                </div>
              ) : ordenesDisponibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#E8E5E2] flex items-center justify-center mb-4">
                    <i className="ti ti-clipboard-list text-[#D0CBC4] text-xl" />
                  </div>
                  <p className="text-sm font-semibold text-[#2D2B2A] mb-1">Sin órdenes</p>
                  <p className="text-xs text-[#7A7571] font-medium max-w-xs">No hay órdenes listas para escanear.</p>
                </div>
              ) : (
                ordenesDisponibles.map((orden) => (
                  <button
                    key={orden.id}
                    onClick={() => {
                      setSelectedOrdenId(orden.id)
                      setConfirmedItemIds(new Set())
                      setPendingConfirmItem(null)
                      setPendingNotInOrderCode(null)
                      setPendingNotInOrderMarcaId(null)
                      setScanCounts({})
                    }}
                    className={clsx(
                      'w-full text-left p-4 rounded-xl border transition-all',
                      selectedOrdenId === orden.id
                        ? 'border-[#780e18] bg-[#F4ECDB]/40 shadow-sm'
                        : 'border-[#D0CBC4] bg-white hover:border-[#780e18]/30 hover:bg-[#FAF5EE]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-[10px] font-bold text-[#7A7571] uppercase tracking-wider">{orden.numero}</p>
                      {orden.estado === 'con_faltantes' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F5E0A8] text-[#7A5200] shrink-0">
                          <i className="ti ti-clock text-[9px]" />
                          Almacén
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#2D2B2A]">{orden.cliente_nombre ?? 'Sin cliente'}</p>
                    <p className="text-xs text-[#7A7571] mt-1">
                      {orden.items.filter((i) => i.estado !== 'faltante').length} ítems · Bs {orden.total.toFixed(2)}
                    </p>
                  </button>
                ))
              )}
            </div>

            {/* ── Panel de escaneo ── */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-[#D0CBC4] overflow-hidden">
              {!selectedOrden ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <i className="ti ti-scan text-[60px] text-[#D0CBC4]" />
                  <p className="text-sm text-[#7A7571] font-medium">Selecciona una orden para comenzar a escanear</p>
                </div>
              ) : (
                <>
                  {/* Header del panel */}
                  <div className="px-6 py-4 border-b border-[#E8E5E2]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10.5px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] mb-0.5">Escaneo</p>
                        <h2 className="text-base font-bold text-[#2D2B2A]">{selectedOrden.numero}</h2>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4ECDB] text-[#780e18] text-xs font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#780e18]" />
                        Pendiente escaneo
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F5F0EB] text-[#4A4744]">
                        {itemsEscaneables.length} para escanear
                      </span>
                      {faltantesCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F5C9C0] text-[#8A1E12]">
                          <i className="ti ti-alert-triangle text-[10px]" />
                          {faltantesCount} faltante{faltantesCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Banner con_faltantes */}
                  {selectedOrden.estado === 'con_faltantes' && (
                    <div className="mx-6 mt-3 px-4 py-3 rounded-xl bg-[#F5E0A8] border border-[#B47A1F]/30 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#F5E0A8] border border-[#B47A1F]/30 flex items-center justify-center shrink-0">
                        <i className="ti ti-clock text-[#B47A1F] text-[16px]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#7A5200]">Almacenero buscando producto nuevo</p>
                        <p className="text-xs text-[#7A5200]/80">El escaneo está pausado — espera a que el almacenero lo traiga</p>
                      </div>
                    </div>
                  )}

                  {/* Input escaneo */}
                  <div className="px-6 py-3 border-b border-[#E8E5E2]">
                    <div className="flex items-center gap-2 bg-[#F7F7F7] border border-[#D8D4D0] rounded-lg px-3.5 focus-within:border-[#780e18] transition-colors">
                      <i className="ti ti-barcode text-[#7A7571] text-[16px] shrink-0" />
                      <input
                        ref={scanInputRef}
                        autoFocus
                        type="text"
                        disabled={selectedOrden.estado === 'con_faltantes'}
                        placeholder={selectedOrden.estado === 'con_faltantes' ? 'Esperando almacenero…' : 'Escanea o escribe un código y presiona Enter…'}
                        className="flex-1 py-2.5 bg-transparent text-[13px] text-[#2D2B2A] placeholder:text-[#7A7571] outline-none border-none disabled:opacity-50 disabled:cursor-not-allowed"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.currentTarget as HTMLInputElement).value.trim()
                            if (val) handleScan(val)
                            ;(e.currentTarget as HTMLInputElement).value = ''
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Lista de ítems */}
                  <div className="flex-1 overflow-y-auto">

                    {/* ── ÍTEMS ENCONTRADOS ── */}
                    <div className="px-6 pt-4 pb-2">
                      <p className="text-[10.5px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] mb-3">Ítems encontrados</p>
                      <div className="space-y-2">
                        {itemsParaEscanear.map((item) => {
                          const isKit = !!item.kit_id
                          const isParcialKit = isKit && item.diferencia_kit !== undefined
                          const confirmed = isItemConfirmed(item)
                          const isPendiente = item.estado === 'pendiente'
                          const isLoadingItem = !!itemLoading[item.id]
                          const isConfirmandoEliminar = confirmEliminar === item.id
                          const isFlashing = flashItemId === item.id

                          // Piezas sueltas — cada pieza como fila independiente, sin header del kit padre
                          if (item.es_parcial && item.piezas_orden?.length) {
                            return (
                              <Fragment key={item.id}>
                                {item.piezas_orden.map((pieza) => {
                                  const piezaConfirmada = confirmedPiezaIds.has(pieza.id) || !!pieza.confirmado
                                  const esPiezaFaltante = !!pieza.nota_incompleto && !(pieza.cantidad_recogida ?? 0)
                                  const esPiezaParcial = !!pieza.nota_incompleto && (pieza.cantidad_recogida ?? 0) > 0
                                  const cantidadConfirmar = esPiezaParcial ? pieza.cantidad_recogida! : pieza.cantidad
                                  const cantidadFaltante = esPiezaParcial ? pieza.cantidad - pieza.cantidad_recogida! : 0
                                  const loadingPieza = !!piezaLoading[pieza.id]
                                  if (esPiezaFaltante) return null
                                  return (
                                    <div
                                      key={pieza.id}
                                      className={clsx(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-300',
                                        esPiezaFaltante ? 'border-[#F5C9C0] bg-[#F5C9C0]/20' :
                                        esPiezaParcial ? 'border-[#B47A1F]/30 bg-[#F5E0A8]/20' :
                                        piezaConfirmada ? 'border-[#3F7A52]/30 bg-[#B8DCCA]/20' :
                                        'border-[#D0CBC4] bg-white'
                                      )}
                                    >
                                      <div className={clsx(
                                        'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                                        esPiezaFaltante ? 'bg-[#F5C9C0]' : esPiezaParcial ? 'bg-[#F5E0A8]' : piezaConfirmada ? 'bg-[#B8DCCA]' : 'bg-[#F0EFEC]'
                                      )}>
                                        {esPiezaFaltante ? (
                                          <i className="ti ti-x text-[#B23A2A] text-[14px]" />
                                        ) : esPiezaParcial ? (
                                          <i className="ti ti-alert-triangle text-[#B47A1F] text-[14px]" />
                                        ) : piezaConfirmada ? (
                                          <i className="ti ti-check text-[#3F7A52] text-[14px]" />
                                        ) : (
                                          <i className="ti ti-package text-[#7A7571] text-[14px]" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-mono text-[#7A7571] leading-none">{fmtCodigo(pieza.codigo, pieza.marcaId, marcas)}</p>
                                        <p className="text-sm font-semibold text-[#2D2B2A] leading-snug truncate">
                                          {pieza.nombre} · ×{cantidadConfirmar}
                                        </p>
                                        {esPiezaParcial && (
                                          <p className="text-xs text-[#B47A1F] leading-none mt-0.5">×{cantidadFaltante} faltantes</p>
                                        )}
                                      </div>
                                      {esPiezaFaltante ? (
                                        <span className="px-2.5 py-1 rounded-lg bg-[#F5C9C0] text-[#8A1E12] text-xs font-bold shrink-0">No disponible</span>
                                      ) : piezaConfirmada ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#B8DCCA] text-[#1E5C38] text-xs font-bold shrink-0">
                                          <i className="ti ti-check text-[10px]" />
                                          Bs {((confirmedPiezaPrices[pieza.id] ?? pieza.precio_unitario ?? 0) * cantidadConfirmar).toFixed(2)}
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="Bs"
                                            value={piezaPrecios[pieza.id] ?? (pieza.precio_unitario ? pieza.precio_unitario.toFixed(2) : '')}
                                            onChange={(e) => setPiezaPrecios(prev => ({ ...prev, [pieza.id]: e.target.value }))}
                                            className="w-20 h-8 px-2 rounded-lg border border-[#E8E5E2] bg-white text-[#2D2B2A] text-xs text-center font-bold focus:outline-none focus:border-[#780e18] transition-all"
                                          />
                                          <button
                                            onClick={() => handleConfirmarPieza(item, pieza)}
                                            disabled={loadingPieza}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] font-bold text-sm disabled:opacity-50 transition-colors"
                                          >
                                            {loadingPieza ? <i className="ti ti-loader-2 animate-spin text-[12px]" /> : <i className="ti ti-check text-[12px]" />}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </Fragment>
                            )
                          }

                          // Fallback: es_parcial sin piezas cargadas — no mostrar botón confirmar
                          if (item.es_parcial) return null

                          // Ítem normal
                          const isParcialFaltante = item.estado === 'faltante' && (item.cantidad_recogida ?? 0) > 0
                          const cantidadEscanear = isParcialFaltante ? (item.cantidad_recogida ?? 0) : item.cantidad_pedida

                          return (
                            <div
                              key={item.id}
                              className={clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-300',
                                isFlashing ? 'border-[#3F7A52]/40 bg-[#B8DCCA]/30 scale-[1.01]' :
                                confirmed ? 'border-[#3F7A52]/30 bg-[#B8DCCA]/20' :
                                isPendiente ? 'border-[#B47A1F]/30 bg-[#F5E0A8]/20' :
                                isParcialFaltante ? 'border-[#B23A2A]/20 bg-[#F5C9C0]/20' :
                                'border-[#D0CBC4] bg-white'
                              )}
                            >
                              {/* Icono */}
                              <div className={clsx(
                                'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                                confirmed ? 'bg-[#B8DCCA]' : isPendiente ? 'bg-[#F5E0A8]' : isParcialFaltante ? 'bg-[#F5C9C0]' : 'bg-[#F0EFEC]'
                              )}>
                                {confirmed ? (
                                  <i className="ti ti-check text-[#3F7A52] text-[14px]" />
                                ) : isPendiente ? (
                                  <i className="ti ti-clock text-[#B47A1F] text-[14px]" />
                                ) : isParcialFaltante ? (
                                  <i className="ti ti-alert-triangle text-[#B23A2A] text-[14px]" />
                                ) : (
                                  <i className="ti ti-package text-[#7A7571] text-[14px]" />
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono text-[#7A7571] leading-none">{fmtCodigo(item.producto_codigo, item.marcaId, marcas)}</p>
                                <p className="text-sm font-semibold text-[#2D2B2A] leading-snug truncate">
                                  {item.producto_nombre} · ×{cantidadEscanear}
                                  {isKit && !isPendiente && (
                                    <span className={clsx('ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle', isParcialKit ? 'bg-[#F5E0A8] text-[#7A5200]' : 'bg-[#E8D4B8] text-[#780e18]')}>
                                      {isParcialKit ? 'Parcial' : 'Kit'}
                                    </span>
                                  )}
                                </p>
                                {!confirmed && !isKit && (scanCounts[item.id] ?? 0) > 0 && (
                                  <p className="text-[11px] font-bold text-[#780e18] mt-0.5">
                                    {scanCounts[item.id]}/{cantidadEscanear} escaneados
                                  </p>
                                )}
                              </div>

                              {/* Acciones */}
                              {confirmed ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#B8DCCA] text-[#1E5C38] text-xs font-bold shrink-0">
                                  <i className="ti ti-check text-[10px]" />
                                  Confirmado
                                </span>
                              ) : isPendiente ? (
                                isConfirmandoEliminar ? (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs text-[#B23A2A] font-semibold">¿Eliminar?</span>
                                    <button
                                      onClick={() => handleEliminarItem(item)}
                                      disabled={isLoadingItem}
                                      className="px-2 py-1 text-[11px] font-bold rounded-lg bg-[#B23A2A] text-white hover:bg-[#8A1E12] disabled:opacity-50 transition-colors"
                                    >
                                      {isLoadingItem ? <i className="ti ti-loader-2 animate-spin text-[11px]" /> : 'Sí'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmEliminar(null)}
                                      className="px-2 py-1 text-[11px] font-bold rounded-lg bg-[#F0EFEC] text-[#4A4744] hover:bg-[#E8E5E2] transition-colors"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleAjustarCantidad(item, -1)}
                                      disabled={isLoadingItem || item.cantidad_pedida <= 1}
                                      className="w-6 h-6 rounded border border-[#E8E5E2] bg-white flex items-center justify-center text-[#4A4744] hover:bg-[#F0EFEC] disabled:opacity-40 transition-colors"
                                    >
                                      <i className="ti ti-minus text-[10px]" />
                                    </button>
                                    <span className="w-5 text-center text-xs font-bold text-[#2D2B2A]">{isLoadingItem ? '…' : item.cantidad_pedida}</span>
                                    <button
                                      onClick={() => handleAjustarCantidad(item, +1)}
                                      disabled={isLoadingItem}
                                      className="w-6 h-6 rounded border border-[#E8E5E2] bg-white flex items-center justify-center text-[#4A4744] hover:bg-[#F0EFEC] disabled:opacity-40 transition-colors"
                                    >
                                      <i className="ti ti-plus text-[10px]" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmEliminar(item.id)}
                                      disabled={isLoadingItem}
                                      className="w-6 h-6 rounded border border-[#F5C9C0] bg-white flex items-center justify-center text-[#B23A2A] hover:bg-[#F5C9C0] disabled:opacity-40 transition-colors ml-0.5"
                                    >
                                      <i className="ti ti-trash text-[11px]" />
                                    </button>
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F5E0A8] text-[#7A5200] text-[10px] font-bold ml-1">
                                      <i className="ti ti-clock text-[9px]" />
                                      Almacén
                                    </span>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => setConfirmEliminar(item.id)}
                                    disabled={isLoadingItem}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7A7571] hover:text-[#B23A2A] hover:bg-[#F5C9C0]/40 transition-colors disabled:opacity-40"
                                  >
                                    <i className="ti ti-trash text-[14px]" />
                                  </button>
                                  {isConfirmandoEliminar ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleEliminarItem(item)}
                                        disabled={isLoadingItem}
                                        className="px-2 py-1 text-[11px] font-bold rounded-lg bg-[#B23A2A] text-white hover:bg-[#8A1E12] disabled:opacity-50 transition-colors"
                                      >
                                        {isLoadingItem ? <i className="ti ti-loader-2 animate-spin text-[11px]" /> : 'Sí'}
                                      </button>
                                      <button
                                        onClick={() => setConfirmEliminar(null)}
                                        className="px-2 py-1 text-[11px] font-bold rounded-lg bg-[#F0EFEC] text-[#4A4744] hover:bg-[#E8E5E2] transition-colors"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setPendingConfirmItem(item)}
                                      className="px-3 py-1.5 rounded-lg bg-[#780e18] text-white text-xs font-bold hover:bg-[#B23A2A] transition-colors"
                                    >
                                      Confirmar
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* ── FALTANTES ── */}
                    {(faltanteItems.length > 0 || faltantePiezas.length > 0) && (
                      <div className="px-6 pt-3 pb-4">
                        <p className="text-[10.5px] font-semibold text-[#8A1E12] uppercase tracking-[0.12em] mb-3">Faltantes (no se cobran)</p>
                        <div className="space-y-2">
                          {faltanteItems.map(item => {
                            const recogida = item.cantidad_recogida ?? 0
                            const cantidadFaltante = item.cantidad_pedida - recogida
                            return (
                              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#F5C9C0] bg-[#F5C9C0]/20">
                                <div className="h-8 w-8 rounded-full bg-[#F5C9C0] flex items-center justify-center shrink-0">
                                  <i className="ti ti-x text-[#B23A2A] text-[14px]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-mono text-[#D0CBC4] line-through leading-none">{fmtCodigo(item.producto_codigo, item.marcaId, marcas)}</p>
                                  <p className="text-sm text-[#7A7571] line-through leading-snug truncate">{item.producto_nombre} · ×{cantidadFaltante}</p>
                                </div>
                                <span className="px-2.5 py-1 rounded-lg bg-[#F5C9C0] text-[#8A1E12] text-xs font-bold shrink-0">No disponible</span>
                              </div>
                            )
                          })}
                          {faltantePiezas.map(({ itemNombre, pieza }) => (
                            <div key={`pieza-faltante-${pieza.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#F5C9C0] bg-[#F5C9C0]/20">
                              <div className="h-8 w-8 rounded-full bg-[#F5C9C0] flex items-center justify-center shrink-0">
                                <i className="ti ti-x text-[#B23A2A] text-[14px]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono text-[#D0CBC4] line-through leading-none">{fmtCodigo(pieza.codigo, pieza.marcaId, marcas)}</p>
                                <p className="text-sm text-[#7A7571] line-through leading-snug truncate">{itemNombre} — {pieza.nombre} · ×{pieza.cantidad}</p>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-[#F5C9C0] text-[#8A1E12] text-xs font-bold shrink-0">No disponible</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-[#E8E5E2] bg-[#F5F0EB] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-[#7A7571] font-medium">Total a cobrar (sin faltantes)</p>
                        <p className="text-[22px] font-semibold text-[#2D2B2A] leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Bs {totalSinFaltantes.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAgregarModal(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#D0CBC4] bg-white text-[#4A4744] hover:bg-[#F4ECDB] hover:text-[#780e18] hover:border-[#780e18] transition-all"
                      >
                        <i className="ti ti-plus text-[11px] mr-1" />
                        Agregar producto
                      </button>
                    </div>
                    <button
                      className="w-full py-2.5 bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] rounded-xl text-sm font-bold active:scale-[0.99] transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={handleMarcarEsperandoPago}
                      disabled={!allConfirmed || completarLoading || selectedOrden.estado === 'con_faltantes'}
                    >
                      {completarLoading
                        ? <><i className="ti ti-loader-2 animate-spin text-base mr-1.5" />Enviando…</>
                        : selectedOrden.estado === 'con_faltantes'
                          ? <><i className="ti ti-clock text-base mr-1.5" />Esperando almacenero…</>
                          : <><i className="ti ti-cash-register text-base mr-1.5" />Enviar a caja</>
                      }
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {selectMultipleMatches.length > 0 && (
        <LineSelectionModal
          matches={selectMultipleMatches}
          onSelect={handleSelectMatch}
          onClose={() => {
            setSelectMultipleMatches([])
            scanInputRef.current?.focus()
          }}
        />
      )}

      {pendingConfirmItem && (
        <ScanConfirmModal
          item={pendingConfirmItem}
          onConfirm={handleConfirmScan}
          onCancel={() => {
            setPendingConfirmItem(null)
            scanInputRef.current?.focus()
          }}
          loading={confirmLoading}
        />
      )}

      {pendingNotInOrderCode !== null && (
        <ScanNotInOrderModal
          code={pendingNotInOrderCode}
          producto={notInOrderProducto}
          fetchLoading={notInOrderLoading}
          onAgregar={handleAgregarItem}
          onDescartar={() => {
            setPendingNotInOrderCode(null)
            setPendingNotInOrderMarcaId(null)
            setNotInOrderProducto(null)
            scanInputRef.current?.focus()
          }}
          loading={agregarLoading}
        />
      )}

      {showAgregarModal && (
        <AgregarProductoModal
          onAgregar={handleAgregarProducto}
          onClose={() => setShowAgregarModal(false)}
          loading={agregarLoading}
        />
      )}

      {pendingPiezaScan && (
        <PiezaScanPriceModal
          pieza={pendingPiezaScan.pieza}
          onConfirm={(precio) => {
            setPiezaPrecios(prev => ({ ...prev, [pendingPiezaScan.pieza.id]: String(precio) }))
            handleConfirmarPieza(pendingPiezaScan.item, pendingPiezaScan.pieza)
            setPendingPiezaScan(null)
            scanInputRef.current?.focus()
          }}
          onCancel={() => {
            setPendingPiezaScan(null)
            scanInputRef.current?.focus()
          }}
          loading={!!piezaLoading[pendingPiezaScan.pieza.id]}
        />
      )}
    </MainLayout>
  )
}
