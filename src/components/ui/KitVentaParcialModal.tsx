import { useState, useMemo } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import type { Producto } from '@/types'

interface PiezaSeleccionada {
  producto_id: string
  nombre: string
  codigo: string
  stock: number
  cantidad: number
  cantidad_por_kit: number
}

interface KitVentaParcialModalProps {
  open: boolean
  onClose: () => void
  kit: Producto
  onConfirm: (piezas: PiezaSeleccionada[], precioTotal: number, diferencia: number) => void
}

export function KitVentaParcialModal({ open, onClose, kit, onConfirm }: KitVentaParcialModalProps) {
  const [seleccionadas, setSeleccionadas] = useState<PiezaSeleccionada[]>([])
  const [precioTotal, setPrecioTotal] = useState('')

  const piezasKit = useMemo(() =>
    (kit.piezas_kit ?? []).map(p => ({
      producto_id: String(p.id_producto),
      nombre: p.nombre,
      codigo: p.codigo_universal,
      stock: Math.max(0, p.stock_actual - p.stock_reservado),
      cantidad_por_kit: p.cantidad_por_kit,
    })),
    [kit.piezas_kit],
  )

  const precioKit = kit.precio_venta
  const precioIngresado = parseFloat(precioTotal) || 0
  const diferencia = precioKit - precioIngresado

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

  const updateCantidad = (productoId: string, cantidad: number) => {
    setSeleccionadas(prev =>
      prev.map(s =>
        s.producto_id === productoId
          ? { ...s, cantidad: Math.max(1, Math.min(cantidad, s.stock)) }
          : s,
      ),
    )
  }

  const handleConfirm = () => {
    if (seleccionadas.length === 0 || precioIngresado <= 0) return
    onConfirm(seleccionadas, precioIngresado, diferencia)
    setSeleccionadas([])
    setPrecioTotal('')
  }

  const handleClose = () => {
    setSeleccionadas([])
    setPrecioTotal('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Venta parcial: ${kit.nombre}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={seleccionadas.length === 0 || precioIngresado <= 0}
          >
            Confirmar venta parcial
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-brand-50 border-2 border-brand-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-brand-700">Precio del kit completo</span>
            <span className="text-xl font-black text-brand-800">Bs {precioKit.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-600">Precio total de las piezas:</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={precioTotal}
              onChange={(e) => setPrecioTotal(e.target.value)}
              className="flex-1"
              placeholder="0.00"
            />
            <span className="text-xs text-brand-600">Bs</span>
          </div>
          {precioIngresado > 0 && (
            <div className="mt-2 pt-2 border-t border-brand-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-brand-600">Diferencia</span>
                <span className={`text-sm font-bold ${diferencia < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  Bs {Math.abs(diferencia).toFixed(2)} {diferencia < 0 ? '(sobre precio)' : diferencia > 0 ? '(por cobrar)' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-steel-500 uppercase tracking-wider mb-2">
            Seleccionar piezas ({seleccionadas.length})
          </p>
          {piezasKit.length === 0 ? (
            <p className="text-sm text-steel-400 text-center py-6">Este kit no tiene piezas registradas</p>
          ) : (
            <div className="rounded-xl border border-steel-200 divide-y divide-steel-100 max-h-64 overflow-y-auto">
              {piezasKit.map(pieza => {
                const sel = seleccionadas.find(s => s.producto_id === pieza.producto_id)
                const checked = !!sel

                return (
                  <div
                    key={pieza.producto_id}
                    className={`flex items-center gap-3 p-3 transition-colors ${checked ? 'bg-blue-50' : 'hover:bg-steel-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
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
                          onClick={() => updateCantidad(pieza.producto_id, (sel?.cantidad ?? 1) - 1)}
                          className="h-7 w-7 rounded border border-steel-200 flex items-center justify-center text-steel-500 hover:bg-steel-100"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{sel?.cantidad ?? 1}</span>
                        <button
                          onClick={() => updateCantidad(pieza.producto_id, (sel?.cantidad ?? 1) + 1)}
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

        {seleccionadas.length > 0 && (
          <div className="p-3 rounded-lg bg-steel-50 border border-steel-100">
            <p className="text-xs text-steel-500">
              <span className="font-semibold">{seleccionadas.reduce((sum, s) => sum + s.cantidad, 0)}</span> piezas seleccionadas de{' '}
              <span className="font-semibold">{piezasKit.length}</span>
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
