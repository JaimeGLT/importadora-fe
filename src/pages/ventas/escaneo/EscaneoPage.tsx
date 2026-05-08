import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useVentasStore } from '@/stores/ventasStore'
import { useInventarioStore } from '@/stores/inventarioStore'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Button, Input } from '@/components/ui'
import type { ItemOrden } from '@/types'
import { playConfirmBeep } from '@/lib/sounds'
import { notify } from '@/lib/notify'
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

// ─── KitPrecioModal ───────────────────────────────────────────────────────────

function KitPrecioModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: ItemOrden
  onConfirm: (precio: number) => void
  onCancel: () => void
}) {
  const [precio, setPrecio] = useState('')
  const productos = useInventarioStore(s => s.productos)
  const kitPadre = item.kit_id ? productos.find(p => p.id === item.kit_id) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-xl p-5">
        <h3 className="text-base font-bold text-steel-900 mb-1">Precio del kit</h3>
        <p className="text-xs text-steel-400 mb-4">
          {kitPadre?.nombre ?? 'Kit'} — {item.producto_codigo}
        </p>
        {item.diferencia_kit !== undefined && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-[11px] font-semibold text-amber-700">Diferencia kit: Bs {item.diferencia_kit.toFixed(2)}</p>
          </div>
        )}
        <Input
          label="Precio total del kit (Bs)"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={precio}
          onChange={e => setPrecio(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && precio) onConfirm(parseFloat(precio)) }}
          autoFocus
        />
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button
            className="flex-1"
            onClick={() => onConfirm(parseFloat(precio))}
            disabled={!precio || parseFloat(precio) <= 0}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── EscaneoPage ──────────────────────────────────────────────────────────────

export function EscaneoPage() {
  const { } = useAuth()
  const { ordenes, updateOrden } = useVentasStore()
  const { productos, confirmarSalida } = useInventarioStore()
  const [selectedOrdenId, setSelectedOrdenId] = useState<string | null>(null)
  const [scannedItemIds, setScannedItemIds] = useState<Set<string>>(new Set())
  const [precioLibre, setPrecioLibre] = useState<Record<string, number>>({})
  const [pendingKitItem, setPendingKitItem] = useState<ItemOrden | null>(null)
  const [selectMultipleMatches, setSelectMultipleMatches] = useState<ItemOrden[]>([])
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

  const scannedCount = useMemo(
    () => itemsParaEscanear.filter(i => scannedItemIds.has(i.id)).length,
    [itemsParaEscanear, scannedItemIds]
  )
  const allScanned = itemsParaEscanear.length > 0 && scannedCount === itemsParaEscanear.length

  const handleScan = (code: string) => {
    if (!selectedOrden) return
    const codeLower = code.toLowerCase().trim()
    const matched = itemsParaEscanear.filter(
      (i) =>
        i.producto_codigo.toLowerCase() === codeLower ||
        i.producto_id.toLowerCase() === codeLower,
    )
    if (matched.length === 0) {
      notify.error('Código no encontrado en esta orden')
      return
    }
    if (matched.length > 1) {
      setSelectMultipleMatches(matched)
      return
    }
    const item = matched[0]
    if (scannedItemIds.has(item.id)) {
      notify.warning('Este ítem ya fue escaneado')
      return
    }
    const producto = productos.find((p) => p.id === item.producto_id)
    if (producto?.es_kit) {
      setPendingKitItem(item)
    } else {
      setScannedItemIds(prev => new Set([...prev, item.id]))
      playConfirmBeep()
    }
  }

  const handleSelectMatch = (item: ItemOrden) => {
    setSelectMultipleMatches([])
    if (scannedItemIds.has(item.id)) {
      notify.warning('Este ítem ya fue escaneado')
      return
    }
    const producto = productos.find(p => p.id === item.producto_id)
    if (producto?.es_kit) {
      setPendingKitItem(item)
    } else {
      setScannedItemIds(prev => new Set([...prev, item.id]))
      playConfirmBeep()
    }
  }

  const handleKitPrecioConfirm = (precio: number) => {
    if (!pendingKitItem) return
    const itemId = pendingKitItem.id
    setScannedItemIds(prev => new Set([...prev, itemId]))
    setPrecioLibre(prev => ({ ...prev, [itemId]: precio }))
    setPendingKitItem(null)
  }

  const handleConfirmarVenta = () => {
    if (!selectedOrden) return
    const ordenId = selectedOrden.id
    itemsParaEscanear.forEach((item) => {
      confirmarSalida(item.producto_id, item.cantidad_pedida)
    })
    const itemsFinales = selectedOrden.items.map((i) => {
      if (i.estado === 'faltante') return i
      const precioFinal = i.kit_id ? (precioLibre[i.id] ?? i.precio_unitario) : i.precio_unitario
      return { ...i, precio_escaneo: precioFinal, precio_unitario: precioFinal }
    })
    updateOrden(ordenId, { estado: 'completada', items: itemsFinales })
    notify.success('Venta completada')
    setSelectedOrdenId(null)
    setScannedItemIds(new Set())
    setPrecioLibre({})
  }

  const ordenesDisponibles = ordenes.filter((o) => o.estado === 'listo_para_escaneo')

  const isItemScanned = (item: ItemOrden) =>
    scannedItemIds.has(item.id) || (item.kit_id && precioLibre[item.id] !== undefined)

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
                    setScannedItemIds(new Set())
                    setPrecioLibre({})
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
                      {itemsParaEscanear.length} ítems · {scannedCount}/{itemsParaEscanear.length} escaneados
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {itemsParaEscanear.map((item, idx) => {
                      const scanned = isItemScanned(item)
                      return (
                        <div
                          key={item.id}
                          className={clsx(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                            scanned ? 'bg-emerald-100 text-emerald-700' : 'bg-steel-100 text-steel-400',
                          )}
                        >
                          {scanned ? '✓' : idx + 1}
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
                    const scanned = isItemScanned(item)

                    return (
                      <div
                        key={item.id}
                        className={clsx(
                          'rounded-xl border p-4 transition-all',
                          scanned
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
                            {!isKit && !scanned && (
                              <p className="text-sm font-semibold text-steel-600 mt-1">
                                Bs {(item.precio_unitario * item.cantidad_pedida).toFixed(2)}
                              </p>
                            )}
                            {isKit && !scanned && (
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
                              scanned ? 'bg-emerald-100 text-emerald-700' : 'bg-steel-100 text-steel-500',
                            )}>
                              {scanned ? '✓ Escaneado' : `× ${item.cantidad_pedida}`}
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
                    onClick={handleConfirmarVenta}
                    disabled={!allScanned}
                  >
                    {allScanned ? `Confirmar y completar venta — Bs ${selectedOrden.total.toFixed(2)}` : `Escanea todos los ítems (${scannedCount}/${itemsParaEscanear.length})`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </PageContainer>

      {/* Multi-match selection modal */}
      {selectMultipleMatches.length > 0 && (
        <LineSelectionModal
          matches={selectMultipleMatches}
          onSelect={handleSelectMatch}
          onClose={() => setSelectMultipleMatches([])}
        />
      )}

      {/* Kit precio modal */}
      {pendingKitItem && (
        <KitPrecioModal
          item={pendingKitItem}
          onConfirm={handleKitPrecioConfirm}
          onCancel={() => setPendingKitItem(null)}
        />
      )}
    </MainLayout>
  )
}