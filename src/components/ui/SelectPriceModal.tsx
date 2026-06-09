import { clsx } from 'clsx'
import { useMarcasStore } from '@/stores/marcasStore'
import { fmtCodigo } from '@/lib/formatCodigo'
import { calcularPrecioConDescuento, type DescuentoConfig } from '@/stores/configStore'
import type { Producto } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ─── Colors ───────────────────────────────────────────────────────────────────

const DESCUENTO_COLORS: Record<string, { bg: string; border: string; accent: string; text: string; badge: string }> = {
  emerald: { bg: 'bg-[#EAF4EE]',     border: 'border-[#D0CBC4]', accent: '#3F7A52', text: 'text-[#1E5C38]', badge: 'bg-[#B8DCCA] text-[#1E5C38]' },
  blue:    { bg: 'bg-[#E8EEF8]',     border: 'border-[#D0CBC4]', accent: '#3055A4', text: 'text-[#1A3875]', badge: 'bg-[#C8D8F8] text-[#1A3875]' },
  amber:   { bg: 'bg-[#F4ECDB]/70',  border: 'border-[#D0CBC4]', accent: '#D4A333', text: 'text-[#7A5200]', badge: 'bg-[#F5E0A8] text-[#7A5200]' },
  purple:  { bg: 'bg-[#EDE8F5]',     border: 'border-[#D0CBC4]', accent: '#6B4DAA', text: 'text-[#3D1D7A]', badge: 'bg-[#D8C8F0] text-[#3D1D7A]' },
  rose:    { bg: 'bg-[#F5C9C0]/30',  border: 'border-[#D0CBC4]', accent: '#B23A2A', text: 'text-[#8A1E12]', badge: 'bg-[#F5C9C0] text-[#8A1E12]' },
  cyan:    { bg: 'bg-[#E0F4F8]',     border: 'border-[#D0CBC4]', accent: '#0E7090', text: 'text-[#0A4D60]', badge: 'bg-[#B0E0F0] text-[#0A4D60]' },
}

// ─── PrecioCard ───────────────────────────────────────────────────────────────

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

// ─── SelectPriceModal ────────────────────────────────────────────────────────

export interface SelectPriceModalProps {
  producto: Producto
  precioBase: number
  descuentos: DescuentoConfig[]
  isEdit?: boolean
  onSelect: (precio: number, descuento_id?: string, descuento_nombre?: string, descuento_porcentaje?: number) => void
  onAddAnother?: (precio: number, descuento_id?: string, descuento_nombre?: string, descuento_porcentaje?: number) => void
  onClose: () => void
}

export function SelectPriceModal({
  producto,
  precioBase,
  descuentos,
  isEdit,
  onSelect,
  onAddAnother,
  onClose,
}: SelectPriceModalProps) {
  const { marcas } = useMarcasStore()
  const activeDescuentos = descuentos.filter(d => d.activo)

  const allCodes = [producto.codigo_universal, ...producto.codigos_alternativos.filter(Boolean)]
  const stockDisp = Math.max(0, producto.stock - (producto.stock_reservado ?? 0))
  const stockCls = stockDisp === 0
    ? 'text-[#B23A2A] bg-[#F5C9C0]'
    : stockDisp <= producto.stock_minimo
      ? 'text-[#7A5200] bg-[#F5E0A8]'
      : 'text-[#1E5C38] bg-[#B8DCCA]'

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

          <PrecioCard precio={precioBase} onSelect={() => handleSelect(precioBase)} />

          {activeDescuentos.map(d => (
            <PrecioCard
              key={d.id}
              precio={precioBase}
              descuento={d}
              onSelect={() => handleSelect(precioBase, d)}
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
