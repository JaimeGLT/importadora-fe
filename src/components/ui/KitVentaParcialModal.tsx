import { useState, useMemo } from 'react'
import { Modal, Button } from '@/components/ui'
import type { Producto } from '@/types'

interface PiezaSeleccionada {
  producto_id: string
  nombre: string
  codigo: string
  stock: number
  cantidad: number
  cantidad_por_kit: number
}

export type KitSeleccionResult =
  | { tipo: 'kit_completo'; cantidad: number }
  | { tipo: 'piezas_sueltas'; piezas: PiezaSeleccionada[] }
  | { tipo: 'ambos'; cantidad_kit: number; piezas: PiezaSeleccionada[] }

interface KitSeleccionModalProps {
  open: boolean
  onClose: () => void
  kit: Producto
  onConfirm: (result: KitSeleccionResult) => void
}

export function KitSeleccionModal({ open, onClose, kit, onConfirm }: KitSeleccionModalProps) {
  const [cantidadKit, setCantidadKit] = useState(1)
  const [seleccionadas, setSeleccionadas] = useState<PiezaSeleccionada[]>([])

  const stockDisponible = Math.max(0, kit.stock - (kit.stock_reservado ?? 0))

  const piezasKit = useMemo(() =>
    (kit.piezas_kit ?? []).map(p => ({
      producto_id: String(p.id),  // PiezaKit.id = id_Pieza que espera el backend
      nombre: p.nombre,
      codigo: p.codigo_universal,
      stock: Math.max(0, p.stock_actual - p.stock_reservado),
      cantidad_por_kit: p.cantidad_por_kit,
    })),
    [kit.piezas_kit],
  )

  const togglePieza = (productoId: string) => {
    const existe = seleccionadas.find(s => s.producto_id === productoId)
    if (existe) {
      setSeleccionadas(prev => prev.filter(s => s.producto_id !== productoId))
    } else {
      const info = piezasKit.find(p => p.producto_id === productoId)
      if (!info) return
      setSeleccionadas(prev => [...prev, { ...info, cantidad: info.cantidad_por_kit }])
    }
  }

  const updateCantidadPieza = (productoId: string, cantidad: number) => {
    setSeleccionadas(prev =>
      prev.map(s =>
        s.producto_id === productoId
          ? { ...s, cantidad: Math.max(1, Math.min(cantidad, s.stock)) }
          : s,
      ),
    )
  }

  const tieneKit = cantidadKit > 0 && stockDisponible > 0
  const tienePiezas = seleccionadas.length > 0
  const confirmDisabled = !tieneKit && !tienePiezas

  const handleConfirm = () => {
    if (tieneKit && tienePiezas) {
      onConfirm({ tipo: 'ambos', cantidad_kit: cantidadKit, piezas: seleccionadas })
    } else if (tieneKit) {
      onConfirm({ tipo: 'kit_completo', cantidad: cantidadKit })
    } else {
      onConfirm({ tipo: 'piezas_sueltas', piezas: seleccionadas })
    }
    handleClose()
  }

  const handleClose = () => {
    setCantidadKit(1)
    setSeleccionadas([])
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Kit: ${kit.nombre}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={confirmDisabled}>
            Agregar al carrito
          </Button>
        </>
      }
    >
      <div className="space-y-3">

        {/* Sección: Kit completo */}
        <div className={`rounded-xl border-2 p-4 transition-colors ${
          tieneKit ? 'border-brand-300 bg-brand-50' : 'border-steel-200 bg-white'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`text-sm font-semibold ${tieneKit ? 'text-brand-700' : 'text-steel-500'}`}>
                Kit completo
              </p>
              <p className="text-xs text-steel-400">{kit.codigo_universal} · Stock: {stockDisponible} uds.</p>
            </div>
            {stockDisponible === 0 && (
              <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-lg">Sin stock</span>
            )}
          </div>
          {stockDisponible > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-steel-600">Cantidad</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCantidadKit(q => Math.max(0, q - 1))}
                  className="h-8 w-8 rounded-lg border border-steel-200 flex items-center justify-center text-steel-500 hover:bg-steel-100 font-bold"
                >
                  −
                </button>
                <span className={`w-8 text-center text-base font-bold ${tieneKit ? 'text-brand-800' : 'text-steel-300'}`}>
                  {cantidadKit}
                </span>
                <button
                  onClick={() => setCantidadKit(q => Math.min(stockDisponible, q + 1))}
                  disabled={cantidadKit >= stockDisponible}
                  className="h-8 w-8 rounded-lg border border-steel-200 flex items-center justify-center text-steel-500 hover:bg-steel-100 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
          )}
          {!tieneKit && stockDisponible > 0 && (
            <p className="text-xs text-steel-400 text-center mt-1">Cantidad en 0 — no se agregará kit</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-steel-100" />
          <span className="text-xs font-semibold text-steel-400 uppercase tracking-wider">y / o</span>
          <div className="flex-1 h-px bg-steel-100" />
        </div>

        {/* Sección: Piezas sueltas */}
        <div className={`rounded-xl border-2 transition-colors ${
          tienePiezas ? 'border-blue-300 bg-blue-50' : 'border-steel-200 bg-white'
        }`}>
          <div className="px-4 pt-4 pb-2">
            <p className={`text-sm font-semibold ${tienePiezas ? 'text-blue-700' : 'text-steel-500'}`}>
              Piezas sueltas
              {tienePiezas && (
                <span className="ml-2 text-xs font-normal text-blue-500">
                  {seleccionadas.reduce((s, p) => s + p.cantidad, 0)} piezas · {seleccionadas.length} productos
                </span>
              )}
            </p>
          </div>
          {piezasKit.length === 0 ? (
            <p className="text-sm text-steel-400 text-center py-6 px-4">Este kit no tiene piezas registradas</p>
          ) : (
            <div className="divide-y divide-steel-100 max-h-64 overflow-y-auto">
              {piezasKit.map(pieza => {
                const sel = seleccionadas.find(s => s.producto_id === pieza.producto_id)
                const checked = !!sel
                const sinStock = pieza.stock === 0

                return (
                  <div
                    key={pieza.producto_id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      checked ? 'bg-blue-50' : sinStock ? 'opacity-50' : 'hover:bg-steel-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={sinStock && !checked}
                      onChange={() => togglePieza(pieza.producto_id)}
                      className="h-4 w-4 rounded border-steel-300 text-brand-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-steel-800 truncate">{pieza.nombre}</p>
                      <p className="text-[10px] text-steel-400">
                        {pieza.codigo} · Stock: {pieza.stock} · {pieza.cantidad_por_kit}× por kit
                      </p>
                    </div>
                    {checked && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => updateCantidadPieza(pieza.producto_id, (sel?.cantidad ?? 1) - 1)}
                          className="h-7 w-7 rounded border border-steel-200 flex items-center justify-center text-steel-500 hover:bg-steel-100"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{sel?.cantidad ?? 1}</span>
                        <button
                          onClick={() => updateCantidadPieza(pieza.producto_id, (sel?.cantidad ?? 1) + 1)}
                          className="h-7 w-7 rounded border border-steel-200 flex items-center justify-center text-steel-500 hover:bg-steel-100"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </Modal>
  )
}
