import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useVentasStore } from '@/stores/ventasStore'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Button, Input } from '@/components/ui'
import type { ItemOrden, PiezaOrden, Producto, AgregarItemOrdenResponse } from '@/types'
import { playConfirmBeep } from '@/lib/sounds'
import { notify } from '@/lib/notify'
import { api } from '@/lib/api'
import { gql } from '@/lib/graphql'
import { PRODUCTOS_QUERY, backendToProductoSimple, type ProductoAPI } from '@/lib/queries/inventario.queries'
import { MIS_ORDENES_QUERY, backendToOrdenVenta, type OrdenVentaAPI } from '@/lib/queries/ventas.queries'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-steel-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-steel-900">Selecciona la línea</h3>
            <p className="text-xs text-steel-400 mt-0.5">{matches.length} líneas con el mismo código</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-steel-400 hover:text-steel-600 hover:bg-steel-100 rounded-lg transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {matches.map((item, idx) => {
            const isKit = !!item.kit_id
            const isParcial = item.diferencia_kit !== undefined

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full text-left p-3 rounded-xl border border-steel-100 hover:border-brand-300 hover:bg-brand-50/50 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-steel-100 flex items-center justify-center text-xs font-bold text-steel-500 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-steel-800 truncate">{item.producto_nombre}</p>
                      {isKit && (
                        <span className={clsx(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
                          isParcial ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                        )}>
                          {isParcial ? 'Parcial' : 'Completo'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-steel-400 mt-0.5">{item.producto_codigo}</p>
                    {isKit && (
                      <div className="mt-1.5 px-2 py-1.5 rounded-lg bg-steel-50 border border-steel-100">
                        <p className="text-[10px] text-steel-400">
                          {isParcial
                            ? `Diferencia kit: Bs ${item.diferencia_kit?.toFixed(2)}`
                            : 'Kit completo'}
                        </p>
                      </div>
                    )}
                    {!isKit && (
                      <p className="text-xs text-steel-500 mt-1">
                        Precio: Bs {item.precio_unitario.toFixed(2)} c/u
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-steel-800">×{item.cantidad_pedida}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <div className="px-4 py-3 border-t border-steel-100 bg-steel-50">
          <p className="text-[11px] text-steel-400 text-center">Toca una línea para seleccionarla y continuar</p>
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
  const [precio, setPrecio] = useState('')
  const isKit = !!item.kit_id
  const isParcial = !!item.es_parcial
  const precioValido = isParcial || !isKit || (parseFloat(precio) > 0)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onCancel()} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-steel-100">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-steel-900">Confirmar despacho</h3>
            {isKit && (
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded',
                isParcial ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
              )}>
                {isParcial ? 'Kit Parcial' : 'Kit'}
              </span>
            )}
          </div>
          <p className="text-xs text-steel-400">{item.producto_codigo}</p>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <p className="text-base font-bold text-steel-900">{item.producto_nombre}</p>
            {ubicacion && (
              <p className="text-xs text-steel-400 mt-0.5">{ubicacion}</p>
            )}
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-steel-50 border border-steel-100">
            <span className="text-xs text-steel-500">Cantidad pedida</span>
            <span className="text-sm font-black text-steel-800">× {item.cantidad_pedida}</span>
          </div>

          {isKit && !isParcial && (
            <Input
              label="Precio total del kit (Bs)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              autoFocus
            />
          )}

          {(!isKit || isParcial) && (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-steel-50 border border-steel-100">
              <span className="text-xs text-steel-500">Precio unitario</span>
              <span className="text-sm font-bold text-steel-800">Bs {item.precio_unitario.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={() => onConfirm(isKit ? parseFloat(precio) : undefined)}
            disabled={loading || !precioValido}
          >
            {loading ? 'Confirmando…' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── ScanNotInOrderModal ──────────────────────────────────────────────────────

function ScanNotInOrderModal({
  code,
  producto,
  onAgregar,
  onDescartar,
  loading,
}: {
  code: string
  producto: Producto | null
  onAgregar: (cantidad: number) => void
  onDescartar: () => void
  loading: boolean
}) {
  const [cantidad, setCantidad] = useState('1')
  const stockDisponible = producto ? producto.stock - (producto.stock_reservado ?? 0) : 0
  const cantidadNum = parseInt(cantidad) || 0
  const puedeAgregar = producto && !producto.es_kit && cantidadNum >= 1 && cantidadNum <= stockDisponible

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDescartar()
      if (e.key === 'Enter' && puedeAgregar && !loading) onAgregar(cantidadNum)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [puedeAgregar, loading, cantidadNum, onAgregar, onDescartar])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onDescartar()} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-steel-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-steel-900">Código no está en esta orden</h3>
              <p className="text-[11px] font-mono text-steel-400">{code}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {!producto ? (
            <div className="px-3 py-2.5 rounded-lg bg-steel-50 border border-steel-100">
              <p className="text-sm text-steel-500">Código no reconocido en el inventario.</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-bold text-steel-900">{producto.nombre}</p>
                <p className="text-xs font-mono text-steel-400 mt-0.5">{producto.codigo_universal}</p>
              </div>

              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-steel-50 border border-steel-100">
                <span className="text-xs text-steel-500">Stock disponible</span>
                <span className={clsx(
                  'text-sm font-bold',
                  stockDisponible > 0 ? 'text-steel-800' : 'text-red-600'
                )}>
                  {stockDisponible} uds.
                </span>
              </div>

              {producto.es_kit && (
                <div className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700">Los kits no pueden agregarse de último momento. Contacte al almacenero.</p>
                </div>
              )}

              {!producto.es_kit && stockDisponible > 0 && (
                <Input
                  label="Cantidad a agregar"
                  type="number"
                  min="1"
                  max={stockDisponible}
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  autoFocus
                />
              )}
            </>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onDescartar} disabled={loading}>
            Descartar
          </Button>
          {producto && !producto.es_kit && stockDisponible > 0 && (
            <Button
              className="flex-1"
              onClick={() => onAgregar(cantidadNum)}
              disabled={loading || !puedeAgregar}
            >
              {loading ? 'Agregando…' : 'Agregar al pedido'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── AgregarProductoModal ─────────────────────────────────────────────────────

function AgregarProductoModal({
  onAgregar,
  onClose,
  loading,
}: {
  onAgregar: (producto: Producto, cantidad: number) => void
  onClose: () => void
  loading: boolean
}) {
  const { isTokenReady } = useAuth()
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [buscando, setBuscando] = useState(false)
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)
  const [cantidad, setCantidad] = useState('1')

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
        setResultados((res.productos?.nodes ?? []).map(backendToProductoSimple).filter(p => !p.es_kit))
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, isTokenReady])

  const cantidadNum = parseInt(cantidad) || 0
  const disp = seleccionado ? Math.max(0, seleccionado.stock - (seleccionado.stock_reservado ?? 0)) : 0
  const puedeAgregar = seleccionado && cantidadNum >= 1 && cantidadNum <= disp

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-steel-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-steel-900">Agregar producto</h3>
            <p className="text-xs text-steel-400 mt-0.5">Busca y selecciona el producto a agregar</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-steel-400 hover:text-steel-600 hover:bg-steel-100 rounded-lg transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!seleccionado ? (
          <>
            <div className="px-4 pt-3 pb-2 border-b border-steel-100 shrink-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar por código o nombre…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-steel-50 border border-steel-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-steel-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {buscando ? (
                <div className="divide-y divide-steel-50 px-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 rounded bg-steel-100" />
                        <div className="h-2 w-40 rounded bg-steel-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : query.trim() === '' ? (
                <div className="flex items-center justify-center h-32 text-sm text-steel-400">Escribe para buscar</div>
              ) : resultados.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-steel-400">Sin resultados</div>
              ) : (
                <div className="divide-y divide-steel-50">
                  {resultados.map(p => {
                    const dispP = Math.max(0, p.stock - (p.stock_reservado ?? 0))
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setSeleccionado(p); setCantidad('1') }}
                        disabled={dispP === 0}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-steel-50 transition-colors text-left disabled:opacity-40"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{p.codigo_universal}</span>
                          </div>
                          <p className="text-sm font-medium text-steel-700 truncate mt-0.5">{p.nombre}</p>
                          <p className={clsx('text-[11px] font-semibold mt-0.5', dispP === 0 ? 'text-red-500' : 'text-emerald-600')}>{dispP} disponibles</p>
                        </div>
                        <svg className="h-4 w-4 text-steel-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-steel-50 border border-steel-100">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs font-black text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{seleccionado.codigo_universal}</span>
                <p className="text-sm font-semibold text-steel-800 mt-1">{seleccionado.nombre}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-0.5">{disp} disponibles</p>
              </div>
              <button onClick={() => setSeleccionado(null)} className="p-1.5 text-steel-400 hover:text-steel-600 hover:bg-steel-100 rounded-lg transition-colors shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Input
              label={`Cantidad (máx. ${disp})`}
              type="number"
              min="1"
              max={disp}
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="px-5 pb-5 pt-3 flex gap-2 border-t border-steel-100 shrink-0">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>Cancelar</Button>
          {seleccionado && (
            <Button className="flex-1" onClick={() => onAgregar(seleccionado, cantidadNum)} disabled={loading || !puedeAgregar}>
              {loading ? 'Agregando…' : 'Agregar al pedido'}
            </Button>
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
  const [notInOrderProducto, setNotInOrderProducto] = useState<Producto | null>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)

  // Buscar producto por código cuando se escanea algo fuera de la orden
  useEffect(() => {
    if (!pendingNotInOrderCode || !isTokenReady) { setNotInOrderProducto(null); return }
    const code = pendingNotInOrderCode
    gql<{ productos: { nodes: ProductoAPI[] } }>(PRODUCTOS_QUERY, {
      first: 1,
      where: {
        or: [
          { codigo: { eq: code } },
          { codigoAux: { eq: code } },
          { codigoAux2: { eq: code } },
        ],
      },
    })
      .then(res => setNotInOrderProducto((res.productos?.nodes ?? []).map(backendToProductoSimple)[0] ?? null))
      .catch(() => setNotInOrderProducto(null))
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
      if (selectedOrdenId === String(p.id)) {
        updateOrden(String(p.id), { estado: 'listo_para_escaneo' })
        notify.success('Almacenero listo', { description: 'Ya puedes continuar escaneando' })
        scanInputRef.current?.focus()
      }
    }, [selectedOrdenId, updateOrden]),
  }, isTokenReady)

  useEffect(() => {
    if (!isTokenReady) return
    setLoadingOrdenes(true)
    gql<{ misOrdenes: { nodes: OrdenVentaAPI[] } }>(MIS_ORDENES_QUERY)
      .then(data => {
        const fetched = (data.misOrdenes?.nodes ?? [])
          .map(backendToOrdenVenta)
          .filter(o => o.estado !== 'completada' && o.estado !== 'cancelada')
        // Merge: update existing orders, add new ones, keep unrelated ones
        const { ordenes: current } = useVentasStore.getState()
        const fetchedMap = new Map(fetched.map(o => [o.id, o]))
        const merged = current.map(o => fetchedMap.get(o.id) ?? o)
        const newOnes = fetched.filter(o => !current.some(c => c.id === o.id))
        setOrdenes([...merged, ...newOnes])
      })
      .catch(() => notify.error('Error al cargar órdenes'))
      .finally(() => setLoadingOrdenes(false))
  }, [isTokenReady, setOrdenes])

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

  const itemsParaEscanear = useMemo(
    () => selectedOrden?.items.filter((i) => i.estado !== 'faltante') ?? [],
    [selectedOrden],
  )

  const itemsEscaneables = useMemo(
    () => itemsParaEscanear.filter(i => i.estado !== 'pendiente'),
    [itemsParaEscanear],
  )

  const isItemConfirmed = (item: ItemOrden) => {
    if (item.es_parcial && item.piezas_orden?.length) {
      return item.piezas_orden.every(p => confirmedPiezaIds.has(p.id) || !!p.confirmado)
    }
    return confirmedItemIds.has(item.id)
  }

  const allConfirmed = itemsEscaneables.length > 0 &&
    itemsEscaneables.every(i => isItemConfirmed(i)) &&
    itemsParaEscanear.every(i => i.estado !== 'pendiente')

  const faltanteItems = useMemo(
    () => selectedOrden?.items.filter(i => i.estado === 'faltante') ?? [],
    [selectedOrden]
  )
  const faltantesCount = faltanteItems.length

  const totalSinFaltantes = useMemo(
    () => itemsParaEscanear.reduce((s, i) => s + i.precio_unitario * i.cantidad_pedida, 0),
    [itemsParaEscanear]
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
    const precio = parseFloat(piezaPrecios[pieza.id] ?? '')
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

  const handleAgregarProducto = async (producto: Producto, cantidad: number) => {
    if (!selectedOrden) return
    setAgregarLoading(true)
    try {
      const res = await api.post<AgregarItemOrdenResponse>(
        `/OrdenVenta/${selectedOrden.id}/AgregarItem`,
        { Id_Producto: parseInt(producto.id), Cantidad: cantidad }
      )
      const newItem: ItemOrden = {
        id: String(res.id),
        producto_id: String(res.id_Producto),
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
      }
      addItemToOrden(selectedOrden.id, newItem)
      setShowAgregarModal(false)
      notify.success(`${newItem.producto_nombre} agregado — almacén notificado`)
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
    if (pendingConfirmItem || pendingNotInOrderCode !== null || selectMultipleMatches.length > 0) return

    const codeLower = code.toLowerCase().trim()
    const matched = itemsEscaneables.filter(
      (i) =>
        i.producto_codigo.toLowerCase() === codeLower ||
        i.producto_id.toLowerCase() === codeLower,
    )

    if (matched.length > 1) {
      setSelectMultipleMatches(matched)
      return
    }

    if (matched.length === 1) {
      const item = matched[0]
      if (confirmedItemIds.has(item.id)) {
        notify.warning('Este ítem ya fue confirmado')
        return
      }
      // Kit no-parcial: auto-confirmar sin modal
      if (item.kit_id && !item.es_parcial) {
        autoConfirmarItem(item)
        return
      }
      setPendingConfirmItem(item)
      return
    }

    // Not found in order
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
      const body = item.kit_id && precio !== undefined ? { precioUnitario: precio } : undefined
      await api.post(`/OrdenVenta/${selectedOrden.id}/Items/${item.id}/Confirmar`, body)
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
    setAgregarLoading(true)
    try {
      const res = await api.post<AgregarItemOrdenResponse>(
        `/OrdenVenta/${selectedOrden.id}/AgregarItem`,
        { Id_Producto: parseInt(notInOrderProducto.id), Cantidad: cantidad }
      )
      const newItem: ItemOrden = {
        id: String(res.id),
        producto_id: String(res.id_Producto),
        producto_codigo: res.producto.codigo,
        producto_nombre: res.producto.nombre,
        producto_almacen: notInOrderProducto.almacen,
        producto_estante: notInOrderProducto.estante,
        producto_fila: notInOrderProducto.fila,
        producto_columna: notInOrderProducto.columna,
        cantidad_pedida: res.cantidad,
        precio_unitario: res.precioUnitario,
        subtotal: res.precioUnitario * res.cantidad,
        estado: 'pendiente',
      }
      addItemToOrden(selectedOrden.id, newItem)
      notify.info(`${newItem.producto_nombre} agregado a la orden`)
      setPendingNotInOrderCode(null)
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
      <PageContainer>
        <div className="mb-6">
          <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">Ventas</p>
          <h1 className="text-3xl font-black text-steel-900 tracking-tight">Punto de escaneo</h1>
        </div>

        <div className="flex gap-6" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Lista de órdenes */}
          <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">
            {loadingOrdenes ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-xl border border-steel-100 bg-white animate-pulse">
                    <div className="h-3 w-16 bg-steel-100 rounded mb-2" />
                    <div className="h-4 w-32 bg-steel-100 rounded mb-2" />
                    <div className="h-3 w-24 bg-steel-100 rounded" />
                  </div>
                ))}
              </div>
            ) : ordenesDisponibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-steel-50 border border-steel-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <p className="text-sm text-steel-500">No hay órdenes para escanear</p>
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
                  }}
                  className={clsx(
                    'w-full text-left p-4 rounded-xl border transition-all',
                    selectedOrdenId === orden.id
                      ? 'border-brand-400 bg-brand-50 shadow-sm'
                      : 'border-steel-200 bg-white hover:border-brand-300 hover:bg-brand-50/30',
                  )}
                >
                  <p className="text-xs font-bold text-steel-400 mb-1">{orden.numero}</p>
                  <p className="text-sm font-semibold text-steel-800">{orden.cliente_nombre ?? 'Sin cliente'}</p>
                  <p className="text-xs text-steel-400 mt-1">
                    {orden.items.filter((i) => i.estado !== 'faltante').length} ítems · Bs {orden.total.toFixed(2)}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Panel de escaneo */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-steel-200 overflow-hidden">
            {!selectedOrden ? (
              <div className="flex flex-col items-center justify-center h-full">
                <svg className="w-16 h-16 text-steel-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p className="text-sm text-steel-400">Selecciona una orden para comenzar a escanear</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-6 py-4 border-b border-steel-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-0.5">Escaneo</p>
                      <h2 className="text-base font-bold text-steel-900">{selectedOrden.numero}</h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      Pendiente escaneo
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-steel-100 text-steel-600 text-xs font-bold">
                      {itemsEscaneables.length} para escanear
                    </span>
                    {faltantesCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full border border-red-300 text-red-600 text-xs font-bold">
                        {faltantesCount} faltante{faltantesCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner con_faltantes */}
                {selectedOrden.estado === 'con_faltantes' && (
                  <div className="mx-6 mt-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-800">Almacenero buscando producto nuevo</p>
                      <p className="text-xs text-amber-600">El escaneo está pausado — espera a que el almacenero lo traiga</p>
                    </div>
                  </div>
                )}

                {/* Input escaneo — pistola o escritura manual */}
                <div className="px-6 py-3 border-b border-steel-100">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-steel-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <input
                      ref={scanInputRef}
                      autoFocus
                      type="text"
                      disabled={selectedOrden.estado === 'con_faltantes'}
                      placeholder={selectedOrden.estado === 'con_faltantes' ? 'Esperando almacenero…' : 'Escanea o escribe un código y presiona Enter…'}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-steel-50 border border-steel-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-400 placeholder:text-steel-400 disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Lista de items */}
                <div className="flex-1 overflow-y-auto">
                  {/* ── ÍTEMS ENCONTRADOS ── */}
                  <div className="px-6 pt-4 pb-2">
                    <p className="text-[10px] font-bold text-steel-400 uppercase tracking-widest mb-3">Ítems encontrados</p>
                    <div className="space-y-2">
                      {itemsParaEscanear.map((item) => {
                        const isKit = !!item.kit_id
                        const isParcialKit = isKit && item.diferencia_kit !== undefined
                        const confirmed = isItemConfirmed(item)
                        const isPendiente = item.estado === 'pendiente'
                        const isLoadingItem = !!itemLoading[item.id]
                        const isConfirmandoEliminar = confirmEliminar === item.id
                        const isFlashing = flashItemId === item.id

                        // Kit parcial — expandido con filas por pieza
                        if (item.es_parcial && item.piezas_orden?.length) {
                          return (
                            <div
                              key={item.id}
                              className={clsx(
                                'rounded-xl border overflow-hidden transition-all duration-300',
                                confirmed ? 'border-emerald-200 bg-emerald-50/50' : 'border-violet-200 bg-violet-50/30',
                              )}
                            >
                              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-violet-100/60 border-b border-violet-200">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-200 text-violet-700 shrink-0">Kit Parcial</span>
                                    <p className="text-sm font-bold text-steel-800">{item.producto_nombre}</p>
                                  </div>
                                  <p className="text-xs text-steel-400 font-mono mt-0.5">{item.producto_codigo}</p>
                                </div>
                                <span className="text-sm font-bold text-steel-700 shrink-0">×{item.cantidad_pedida}</span>
                              </div>
                              <div className="divide-y divide-violet-100">
                                {item.piezas_orden.map((pieza) => {
                                  const piezaConfirmada = confirmedPiezaIds.has(pieza.id) || !!pieza.confirmado
                                  const loadingPieza = !!piezaLoading[pieza.id]
                                  return (
                                    <div key={pieza.id} className="flex items-center gap-3 px-4 py-2.5">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-steel-700">{pieza.nombre}</p>
                                        <p className="text-[10px] font-mono text-steel-400">{pieza.codigo}</p>
                                      </div>
                                      <span className="text-xs text-steel-500 shrink-0">×{pieza.cantidad}</span>
                                      {piezaConfirmada ? (
                                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                                          ✓ Bs {(confirmedPiezaPrices[pieza.id] ?? pieza.precio_unitario ?? 0).toFixed(2)}
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="Bs"
                                            value={piezaPrecios[pieza.id] ?? ''}
                                            onChange={(e) => setPiezaPrecios(prev => ({ ...prev, [pieza.id]: e.target.value }))}
                                            className="w-20 px-2 py-1 text-xs border border-violet-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                                          />
                                          <button
                                            onClick={() => handleConfirmarPieza(item, pieza)}
                                            disabled={loadingPieza}
                                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 transition-colors"
                                          >
                                            {loadingPieza ? '…' : '✓'}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        }

                        // Ítem normal
                        return (
                          <div
                            key={item.id}
                            className={clsx(
                              'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-300',
                              isFlashing ? 'border-emerald-400 bg-emerald-100 scale-[1.01]' :
                              confirmed ? 'border-emerald-200 bg-emerald-50/40' :
                              isPendiente ? 'border-amber-100 bg-amber-50/30' :
                              'border-steel-200 bg-white'
                            )}
                          >
                            {/* Icono */}
                            <div className={clsx(
                              'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                              confirmed ? 'bg-emerald-100' : isPendiente ? 'bg-amber-100' : 'bg-steel-100'
                            )}>
                              {confirmed ? (
                                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              ) : isPendiente ? (
                                <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              ) : (
                                <svg className="h-4 w-4 text-steel-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                              )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono text-steel-400 leading-none">{item.producto_codigo}</p>
                              <p className="text-sm font-semibold text-steel-800 leading-snug truncate">
                                {item.producto_nombre} · ×{item.cantidad_pedida}
                                {isKit && !isPendiente && (
                                  <span className={clsx('ml-1.5 text-[10px] font-bold px-1 py-0.5 rounded align-middle', isParcialKit ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700')}>
                                    {isParcialKit ? 'Parcial' : 'Kit'}
                                  </span>
                                )}
                              </p>
                            </div>
                            {/* Acciones */}
                            {confirmed ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">Confirmado</span>
                            ) : isPendiente ? (
                              isConfirmandoEliminar ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-xs text-red-600 font-semibold">¿Eliminar?</span>
                                  <button onClick={() => handleEliminarItem(item)} disabled={isLoadingItem} className="px-2 py-1 text-[11px] font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors">{isLoadingItem ? '…' : 'Sí'}</button>
                                  <button onClick={() => setConfirmEliminar(null)} className="px-2 py-1 text-[11px] font-bold rounded-lg bg-steel-100 text-steel-600 hover:bg-steel-200 transition-colors">No</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => handleAjustarCantidad(item, -1)} disabled={isLoadingItem || item.cantidad_pedida <= 1} className="w-6 h-6 rounded border border-steel-200 bg-white flex items-center justify-center text-steel-500 hover:bg-steel-50 disabled:opacity-40 transition-colors"><svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg></button>
                                  <span className="w-5 text-center text-xs font-bold text-steel-700">{isLoadingItem ? '…' : item.cantidad_pedida}</span>
                                  <button onClick={() => handleAjustarCantidad(item, +1)} disabled={isLoadingItem} className="w-6 h-6 rounded border border-steel-200 bg-white flex items-center justify-center text-steel-500 hover:bg-steel-50 disabled:opacity-40 transition-colors"><svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
                                  <button onClick={() => setConfirmEliminar(item.id)} disabled={isLoadingItem} className="w-6 h-6 rounded border border-red-200 bg-white flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors ml-0.5"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                  <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold ml-1">⏳ Almacén</span>
                                </div>
                              )
                            ) : (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => setConfirmEliminar(item.id)}
                                  disabled={isLoadingItem}
                                  className="p-1.5 rounded-lg text-steel-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                                {isConfirmandoEliminar ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handleEliminarItem(item)} disabled={isLoadingItem} className="px-2 py-1 text-[11px] font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors">{isLoadingItem ? '…' : 'Sí'}</button>
                                    <button onClick={() => setConfirmEliminar(null)} className="px-2 py-1 text-[11px] font-bold rounded-lg bg-steel-100 text-steel-600 hover:bg-steel-200 transition-colors">No</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setPendingConfirmItem(item)}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
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
                  {faltanteItems.length > 0 && (
                    <div className="px-6 pt-3 pb-4">
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">Faltantes (no se cobran)</p>
                      <div className="space-y-2">
                        {faltanteItems.map(item => (
                          <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-red-100 bg-red-50/30">
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                              <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono text-steel-300 line-through leading-none">{item.producto_codigo}</p>
                              <p className="text-sm text-steel-400 line-through leading-snug truncate">{item.producto_nombre} · ×{item.cantidad_pedida}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-steel-100 text-steel-500 text-xs font-bold shrink-0">No disponible</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-steel-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-steel-400">Total a cobrar (sin faltantes)</p>
                      <p className="text-xl font-black text-steel-900">Bs {totalSinFaltantes.toFixed(2)}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setShowAgregarModal(true)}>
                      + Agregar producto
                    </Button>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleMarcarEsperandoPago}
                    disabled={!allConfirmed || completarLoading || selectedOrden.estado === 'con_faltantes'}
                  >
                    {completarLoading ? 'Enviando…' : selectedOrden.estado === 'con_faltantes' ? 'Esperando almacenero…' : 'Enviar a caja'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </PageContainer>

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
          onAgregar={handleAgregarItem}
          onDescartar={() => {
            setPendingNotInOrderCode(null)
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
    </MainLayout>
  )
}
