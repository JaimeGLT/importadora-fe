import { DonutChart } from './DonutChart'
import { formatBsShort } from './chartUtils'
import type { VentasPorMetodo } from '@/utils/ventasPorMetodo'

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const METODOS: { key: keyof Omit<VentasPorMetodo, 'total'>; label: string; color: string; icon: string }[] = [
  { key: 'efectivo', label: 'Efectivo', color: '#3F7A52', icon: 'ti-cash' },
  { key: 'tarjeta',  label: 'Tarjeta',  color: '#3B82F6', icon: 'ti-credit-card' },
  { key: 'qr',       label: 'QR',       color: '#D4A333', icon: 'ti-qrcode' },
  { key: 'credito',  label: 'Crédito',  color: '#780e18', icon: 'ti-hand-coins' },
]

interface Props {
  data: VentasPorMetodo
  /** Tamaño del donut. Compacto para dashboard, más grande en el reporte. */
  size?: number
  thickness?: number
}

export function PaymentMethodBreakdown({ data, size = 160, thickness = 26 }: Props) {
  const segments = METODOS
    .map(m => ({ label: m.label, value: data[m.key], color: m.color }))
    .filter(s => s.value > 0)

  if (data.total === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-steel-400">Sin ventas registradas en el período</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="shrink-0">
        <DonutChart
          segments={segments}
          size={size}
          thickness={thickness}
          formatValue={v => `Bs ${formatBsShort(v)}`}
          centerLabel="Total"
          centerValue={`Bs ${formatBsShort(data.total)}`}
        />
      </div>
      <div className="flex-1 w-full space-y-2.5">
        {METODOS.map(m => {
          const valor = data[m.key]
          const pct = data.total > 0 ? (valor / data.total) * 100 : 0
          return (
            <div key={m.key} className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${m.color}1A` }}
              >
                <i className={`ti ${m.icon} text-[15px]`} style={{ color: m.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-steel-700">{m.label}</span>
                  <span className="text-xs font-black tabular-nums text-steel-900">{fmtBs(valor)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-steel-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-bold text-steel-400 w-9 text-right shrink-0">
                {pct.toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
