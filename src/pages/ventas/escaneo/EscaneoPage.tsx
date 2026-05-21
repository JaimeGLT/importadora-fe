import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useVentasStore } from '@/stores/ventasStore'
import { useInventarioStore } from '@/stores/inventarioStore'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Button, Input } from '@/components/ui'
import type { ItemOrden, Producto, AgregarItemOrdenResponse } from '@/types'
import { playConfirmBeep } from '@/lib/sounds'
import { notify } from '@/lib/notify'
import { api } from '@/lib/api'
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
  const productos = useInventarioStore(s => s.productos)

  const getKitInfo = (kitId: string) => {
    return productos.find(p => p.id === kitId)
  }

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
            const kitPadre = isKit && item.kit_id ? getKitInfo(item.kit_id) : null
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
                    {isKit && kitPadre && (
                      <div className="mt-1.5 px-2 py-1.5 rounded-lg bg-steel-50 border border-steel-100">
                        <p className="text-[10px] font-semibold text-steel-500 mb-1">Kit: {kitPadre.nombre}</p>
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
  const precioValido = !isKit || (parseFloat(precio) > 0)
  const ubicacion = [item.producto_almacen, item.producto_estante, item.producto_fila, item.producto_columna]
    .filter(Boolean).join(' › ')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter' && !loading && precioValido && !isParcial) {
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

          {isParcial && (
            <div className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-700">Ítem parcial — confirma las piezas individualmente desde el sistema.</p>
            </div>
          )}

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

          {!isKit && (
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
            disabled={loading || !precioValido || isParcial}
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

// ─── TipoPagoModal ────────────────────────────────────────────────────────────

function TipoPagoModal({
  total,
  onSeleccionar,
  onCancelar,
  loading,
}: {
  total: number
  onSeleccionar: (tipoPago: string) => void
  onCancelar: () => void
  loading: boolean
}) {
  const opciones = [
    { key: 'Efectivo', label: 'Efectivo', icon: '💵' },
    { key: 'QR', label: 'QR', icon: '📱' },
    { key: 'Tarjeta', label: 'Tarjeta', icon: '💳' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onCancelar()} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-steel-100">
          <h3 className="text-sm font-bold text-steel-900">Método de pago</h3>
          <p className="text-xs text-steel-400 mt-0.5">Total: Bs {total.toFixed(2)}</p>
        </div>
        <div className="p-4 space-y-2">
          {opciones.map(op => (
            <button
              key={op.key}
              onClick={() => onSeleccionar(op.key)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-steel-100 hover:border-brand-300 hover:bg-brand-50/50 transition-all disabled:opacity-50"
            >
              <span className="text-xl">{op.icon}</span>
              <span className="text-sm font-semibold text-steel-800">{op.label}</span>
            </button>
          ))}
        </div>
        <div className="px-4 pb-4">
          <Button variant="secondary" className="w-full" onClick={onCancelar} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── EscaneoPage ──────────────────────────────────────────────────────────────

export function EscaneoPage() {
  const { } = useAuth()
  const { ordenes, updateOrden, addItemToOrden } = useVentasStore()
  const { productos } = useInventarioStore()
  const [selectedOrdenId, setSelectedOrdenId] = useState<string | null>(null)
  const [confirmedItemIds, setConfirmedItemIds] = useState<Set<string>>(new Set())
  const [pendingConfirmItem, setPendingConfirmItem] = useState<ItemOrden | null>(null)
  const [pendingNotInOrderCode, setPendingNotInOrderCode] = useState<string | null>(null)
  const [selectMultipleMatches, setSelectMultipleMatches] = useState<ItemOrden[]>([])
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [agregarLoading, setAgregarLoading] = useState(false)
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [completarLoading, setCompletarLoading] = useState(false)
  const scanInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scanInputRef.current?.focus()
  }, [selectedOrdenId])

  const selectedOrden = useMemo(
    () => ordenes.find((o) => o.id === selectedOrdenId) ?? null,
    [ordenes, selectedOrdenId],
  )

  const itemsParaEscanear = useMemo(
    () => selectedOrden?.items.filter((i) => i.estado !== 'faltante') ?? [],
    [selectedOrden],
  )

  const confirmedCount = useMemo(
    () => itemsParaEscanear.filter(i => confirmedItemIds.has(i.id)).length,
    [itemsParaEscanear, confirmedItemIds]
  )
  const allConfirmed = itemsParaEscanear.length > 0 && confirmedCount === itemsParaEscanear.length

  const notInOrderProducto = useMemo<Producto | null>(() => {
    if (!pendingNotInOrderCode) return null
    const code = pendingNotInOrderCode.toLowerCase()
    return productos.find(p =>
      p.codigo_universal.toLowerCase() === code ||
      p.codigos_alternativos.some(c => c.toLowerCase() === code)
    ) ?? null
  }, [pendingNotInOrderCode, productos])

  const handleScan = (code: string) => {
    if (!selectedOrden) return
    // Guard: ignore scan if any modal is open
    if (pendingConfirmItem || pendingNotInOrderCode !== null || selectMultipleMatches.length > 0) return

    const codeLower = code.toLowerCase().trim()
    const matched = itemsParaEscanear.filter(
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

  const handleCompletarVenta = async (tipoPago: string) => {
    if (!selectedOrden) return
    setCompletarLoading(true)
    try {
      await api.post(`/OrdenVenta/${selectedOrden.id}/Completar`, { TipoPago: tipoPago })
      updateOrden(selectedOrden.id, { estado: 'completada' })
      notify.success('Venta completada')
      setSelectedOrdenId(null)
      setConfirmedItemIds(new Set())
      setShowPagoModal(false)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al completar la venta')
    } finally {
      setCompletarLoading(false)
    }
  }

  const ordenesDisponibles = ordenes.filter((o) => o.estado === 'listo_para_escaneo')

  const isItemConfirmed = (item: ItemOrden) => confirmedItemIds.has(item.id)

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
            {ordenesDisponibles.length === 0 ? (
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
                <div className="px-6 py-4 border-b border-steel-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-steel-900">{selectedOrden.numero}</h2>
                    <p className="text-xs text-steel-400">
                      {itemsParaEscanear.length} ítems · {confirmedCount}/{itemsParaEscanear.length} confirmados
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {itemsParaEscanear.map((item, idx) => {
                      const confirmed = isItemConfirmed(item)
                      return (
                        <div
                          key={item.id}
                          className={clsx(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                            confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-steel-100 text-steel-400',
                          )}
                        >
                          {confirmed ? '✓' : idx + 1}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Input escaneo (captura pistola) */}
                <div className="px-6 py-3 border-b border-steel-100">
                  <input
                    ref={scanInputRef}
                    autoFocus
                    className="opacity-0 absolute"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.currentTarget as HTMLInputElement).value.trim()
                        if (val) handleScan(val)
                        ;(e.currentTarget as HTMLInputElement).value = ''
                      }
                    }}
                  />
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-steel-50 border border-steel-200">
                    <svg className="h-5 w-5 text-steel-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span className="text-sm text-steel-400">Escanea un código de barras…</span>
                  </div>
                </div>

                {/* Lista de items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {itemsParaEscanear.map((item) => {
                    const isKit = !!item.kit_id
                    const isParcialKit = isKit && item.diferencia_kit !== undefined
                    const confirmed = isItemConfirmed(item)

                    return (
                      <div
                        key={item.id}
                        className={clsx(
                          'rounded-xl border p-4 transition-all',
                          confirmed
                            ? 'border-emerald-200 bg-emerald-50/50'
                            : isKit
                            ? 'border-amber-200 bg-amber-50/50'
                            : 'border-steel-200 bg-white',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-steel-800">{item.producto_nombre}</p>
                              {isKit && (
                                <span className={clsx(
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                  isParcialKit ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                                )}>
                                  {isParcialKit ? 'Parcial' : 'Kit'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-steel-400 font-mono mt-0.5">{item.producto_codigo}</p>
                            {!isKit && !confirmed && (
                              <p className="text-sm font-semibold text-steel-600 mt-1">
                                Bs {(item.precio_unitario * item.cantidad_pedida).toFixed(2)}
                              </p>
                            )}
                            {isKit && !confirmed && (
                              <p className="text-xs text-steel-500 mt-1">
                                {isParcialKit
                                  ? `Diferencia: Bs ${item.diferencia_kit?.toFixed(2)}`
                                  : 'Kit completo'}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className={clsx(
                              'inline-block px-2.5 py-1 rounded-lg text-xs font-bold',
                              confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-steel-100 text-steel-500',
                            )}>
                              {confirmed ? '✓ Confirmado' : `× ${item.cantidad_pedida}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-t-steel-100">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setShowPagoModal(true)}
                    disabled={!allConfirmed}
                  >
                    {allConfirmed
                      ? `Completar venta — Bs ${selectedOrden.total.toFixed(2)}`
                      : `Confirma todos los ítems (${confirmedCount}/${itemsParaEscanear.length})`}
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

      {showPagoModal && selectedOrden && (
        <TipoPagoModal
          total={selectedOrden.total}
          onSeleccionar={handleCompletarVenta}
          onCancelar={() => setShowPagoModal(false)}
          loading={completarLoading}
        />
      )}
    </MainLayout>
  )
}
