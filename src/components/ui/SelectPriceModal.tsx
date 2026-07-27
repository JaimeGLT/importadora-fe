import { useState } from 'react'
import type { Producto } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ─── SelectPriceModal ────────────────────────────────────────────────────────

/**
 * Modal simplificado: muestra el producto y un único "Precio base".
 * El descuento se elegirá al cobrar (modal de checkout).
 */
export interface SelectPriceModalProps {
  producto: Producto
  precioBase: number
  /** Precio actualmente aplicado al item del carrito (si difiere del precio base). Usado pa prellenar el input. */
  precioActual?: number
  isEdit?: boolean
  onSelect: (precio: number) => void
  onAddAnother?: (precio: number) => void
  onClose: () => void
}

export function SelectPriceModal({
  producto,
  precioBase,
  precioActual,
  isEdit,
  onSelect,
  onAddAnother,
  onClose,
}: SelectPriceModalProps) {

  const allCodes = [producto.codigo_universal, ...producto.codigos_alternativos.filter(Boolean)]
  const stockDisp = Math.max(0, producto.stock - (producto.stock_reservado ?? 0))
  const stockCls = stockDisp === 0
    ? 'text-[#B23A2A] bg-[#F5C9C0]'
    : stockDisp <= producto.stock_minimo
      ? 'text-[#7A5200] bg-[#F5E0A8]'
      : 'text-[#1E5C38] bg-[#B8DCCA]'

  const precioInicial = precioActual ?? precioBase
  const precioModificado = precioActual !== undefined && precioActual !== precioBase

  const [precioValue, setPrecioValue] = useState(precioInicial.toFixed(2))
  const precioNumerico = parseFloat(precioValue)
  const precioValido = !isNaN(precioNumerico) && precioNumerico >= 0

  const handleSelect = () => {
    if (!precioValido) return
    if (isEdit && onAddAnother) {
      onAddAnother(precioNumerico)
    } else {
      onSelect(precioNumerico)
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
                  <span key={i} className={
                    'inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ' +
                    (i === 0 ? 'bg-[#780e18] text-white' : 'bg-[#2D2B2A] text-[#F7F7F7]')
                  }>
                    {i === 0 ? producto.codigo_universal : code}
                  </span>
                ))}
              </div>
              <p className="text-[13px] font-medium text-[#4A4744] truncate leading-tight">{producto.nombre}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ' + stockCls}>
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
            {isEdit ? 'Confirma el nuevo precio' : 'Confirma el precio'}
          </p>

          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-l-4 border-[#D0CBC4] bg-white border-l-[#780e18]">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#780e18]/10 shrink-0">
              <i className="ti ti-currency-dollar text-[14px] text-[#780e18]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#2D2B2A] leading-tight">
                {isEdit ? 'Nuevo precio' : 'Precio de venta'}
              </p>
              <p className="text-[11px] text-[#7A7571] font-medium mt-0.5">
                Precio base: {fmtBs(precioBase)}
              </p>
              {precioModificado && (
                <p className="text-[11px] font-bold text-[#780e18] mt-0.5">
                  Precio actual: {fmtBs(precioActual!)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[13px] font-bold text-[#7A7571]">Bs</span>
              <input
                type="number"
                min={0}
                step="0.01"
                autoFocus
                value={precioValue}
                onChange={(e) => setPrecioValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSelect()
                }}
                className="w-24 h-9 px-2 text-right font-mono font-black text-[17px] border border-[#780e18] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#780e18]/20"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-[#E8E5E2] text-sm font-semibold text-[#4A4744] hover:bg-[#F0EFEC] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSelect}
            disabled={!precioValido}
            className="flex-1 h-10 rounded-xl bg-[#780e18] text-sm font-semibold text-white hover:bg-[#5c0a12] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEdit ? 'Actualizar precio' : 'Confirmar'}
          </button>
        </div>

      </div>
    </div>
  )
}
