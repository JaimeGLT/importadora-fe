import { Modal } from '@/components/ui'
import type { Cliente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  cliente: Cliente | null
}

const METODO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta:  'Tarjeta',
  qr:       'QR',
}

const METODO_COLORS: Record<string, string> = {
  efectivo: '#0A6645',
  tarjeta:  '#1D4ED8',
  qr:       '#7C3AED',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
    hour:  '2-digit',
    minute: '2-digit',
  })
}

function fmtBs(amount: number) {
  return `Bs ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ClienteHistorialModal({ open, onClose, cliente }: Props) {
  if (!cliente) return null

  const totalComprado = cliente.compras.reduce((acc, c) => acc + c.total, 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Historial de ${cliente.nombre ? `${cliente.nombre} ${cliente.apellido}` : cliente.apellido}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 pb-3 border-b border-steel-100">
          <InfoPill label="CI" value={cliente.carnet ?? ''} />
          {cliente.telefono && <InfoPill label="Teléfono" value={cliente.telefono} />}
          <InfoPill label="Total compras" value={String(cliente.compras.length)} />
          <InfoPill label="Total gastado" value={fmtBs(totalComprado)} valueColor="#0A6645" />
        </div>

        {cliente.compras.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="h-10 w-10 text-steel-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-sm text-steel-400">Sin compras registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cliente.compras.map((compra) => (
              <div
                key={compra.id}
                className="rounded-xl border border-steel-200 overflow-hidden"
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ background: '#F8FAFC', borderBottom: '1px solid #E8EDF3' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-steel-500">{compra.orden_id}</span>
                    <span className="text-xs text-steel-400">{fmtDate(compra.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ background: METODO_COLORS[compra.metodo_pago] }}
                    >
                      {METODO_LABELS[compra.metodo_pago]}
                    </span>
                    <span className="text-sm font-semibold text-steel-800">{fmtBs(compra.total)}</span>
                  </div>
                </div>

                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: '#FAFAFA' }}>
                      <th className="text-left px-4 py-2 font-medium text-steel-400 w-20">Código</th>
                      <th className="text-left px-4 py-2 font-medium text-steel-400">Producto</th>
                      <th className="text-center px-4 py-2 font-medium text-steel-400 w-16">Cant.</th>
                      <th className="text-right px-4 py-2 font-medium text-steel-400 w-24">P. Unit.</th>
                      <th className="text-right px-4 py-2 font-medium text-steel-400 w-24">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compra.items.map((item) => (
                      <tr key={item.id} className="border-t border-steel-100">
                        <td className="px-4 py-2 text-steel-500 font-mono">{item.producto_codigo}</td>
                        <td className="px-4 py-2 text-steel-800">{item.producto_nombre}</td>
                        <td className="px-4 py-2 text-center text-steel-600">{item.cantidad_pedida}</td>
                        <td className="px-4 py-2 text-right text-steel-600">{fmtBs(item.precio_unitario)}</td>
                        <td className="px-4 py-2 text-right font-medium text-steel-800">{fmtBs(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function InfoPill({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-steel-50 border border-steel-200">
      <span className="text-[11px] text-steel-400">{label}:</span>
      <span className="text-[12px] font-semibold" style={{ color: valueColor ?? '#1A1A1A' }}>{value}</span>
    </div>
  )
}