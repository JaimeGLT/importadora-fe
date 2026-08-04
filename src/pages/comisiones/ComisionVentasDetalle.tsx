import { useState } from 'react'
import type { ComisionDetalleVentaAPI } from '@/lib/queries/reportes.queries'

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

interface ComisionVentasDetalleProps {
  ventas: ComisionDetalleVentaAPI[]
  loading: boolean
  porcentajeComision: number
  montoComision: number
}

export function ComisionVentasDetalle({ ventas, loading, porcentajeComision, montoComision }: ComisionVentasDetalleProps) {
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set())

  const toggle = (ordenId: number) => {
    setExpandidas(prev => {
      const next = new Set(prev)
      if (next.has(ordenId)) next.delete(ordenId)
      else next.add(ordenId)
      return next
    })
  }

  const totalVendido = ventas.reduce((s, v) => s + v.total, 0)
  const totalUnidades = ventas.reduce((s, v) => s + v.items.reduce((si, i) => si + i.cantidad, 0), 0)
  const totalProductos = ventas.reduce((s, v) => s + v.items.length, 0)

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-[#F0EFEC] animate-pulse" />
        ))}
      </div>
    )
  }

  if (ventas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-lg bg-[#F0EFEC] border border-[#E8E5E2] flex items-center justify-center mb-4">
          <i className="ti ti-package text-[#7A7571] text-xl" />
        </div>
        <p className="text-sm font-semibold text-[#2D2B2A] mb-1">Sin ventas</p>
        <p className="text-xs text-[#7A7571] max-w-xs">No hay ventas en el período seleccionado.</p>
      </div>
    )
  }

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2.5 mb-2.5">
        <div className="bg-white rounded-lg border border-[#E8E5E2] p-3">
          <p className="text-[9.5px] font-semibold text-[#7A7571] uppercase tracking-wider mb-1">Ventas</p>
          <p className="text-lg font-black text-[#2D2B2A] tabular-nums">{ventas.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E8E5E2] p-3">
          <p className="text-[9.5px] font-semibold text-[#7A7571] uppercase tracking-wider mb-1">Unidades</p>
          <p className="text-lg font-black text-[#2D2B2A] tabular-nums">{totalUnidades}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E8E5E2] border-l-4 border-l-[#3F7A52] p-3">
          <p className="text-[9.5px] font-semibold text-[#7A7571] uppercase tracking-wider mb-1">Vendido</p>
          <p className="text-lg font-black text-[#3F7A52] tabular-nums">{fmtBs(totalVendido)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="bg-white rounded-lg border border-[#E8E5E2] p-3">
          <p className="text-[9.5px] font-semibold text-[#7A7571] uppercase tracking-wider mb-1">% Comisión</p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0F9F4] text-[#3F7A52] border border-[#C8E6D4]">
            <i className="ti ti-percentage text-[10px]" />
            {porcentajeComision}%
          </span>
        </div>
        <div className="bg-white rounded-lg border border-[#E8E5E2] border-l-4 border-l-[#780e18] p-3">
          <p className="text-[9.5px] font-semibold text-[#7A7571] uppercase tracking-wider mb-1">A pagar</p>
          <p className="text-lg font-black text-[#780e18] tabular-nums">{fmtBs(montoComision)}</p>
        </div>
      </div>

      {/* Ventas (acordeón) */}
      <div className="space-y-2.5">
        {ventas.map(venta => {
          const abierta = expandidas.has(venta.ordenId)
          return (
            <div key={venta.ordenId} className="bg-white rounded-xl border border-[#E8E5E2] overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(venta.ordenId)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#FAF5EE] transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <i
                    className={`ti ti-chevron-right text-[#7A7571] text-[15px] shrink-0 transition-transform ${abierta ? 'rotate-90' : ''}`}
                  />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-[#2D2B2A]">
                      {fmtFecha(venta.fecha)} · {fmtHora(venta.fecha)}
                    </div>
                    <div className="text-[11px] text-[#7A7571]">
                      Orden #{venta.ordenId} · {venta.items.length} producto{venta.items.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <span className="font-bold text-[13.5px] text-[#2D2B2A] tabular-nums whitespace-nowrap shrink-0">
                  {fmtBs(venta.total)}
                </span>
              </button>

              {abierta && (
                <div className="border-t border-[#E8E5E2] divide-y divide-[#F0EFEC] bg-[#FBFAF7]">
                  {venta.items.map((it, i) => (
                    <div key={i} className="px-4 py-2.5 pl-10 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-[#2D2B2A] leading-snug">{it.producto}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="font-mono text-[10px] text-[#7A7571] bg-[#F0EFEC] rounded px-1.5 py-0.5">{it.codigo}</span>
                          {it.marca && (
                            <span className="text-[10px] text-[#780e18] bg-[#F4ECDB] rounded px-1.5 py-0.5 font-semibold">{it.marca}</span>
                          )}
                          <span className="text-[10.5px] text-[#7A7571]">{it.cantidad} × {fmtBs(it.precioUnitario)}</span>
                        </div>
                      </div>
                      <span className="text-[12.5px] font-bold text-[#2D2B2A] tabular-nums whitespace-nowrap shrink-0">
                        {fmtBs(it.precioUnitario * it.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 px-4 py-3 bg-[#F5F0EB] rounded-lg flex items-center justify-between">
        <span className="text-[12px] font-bold text-[#2D2B2A]">Total vendido ({totalProductos} productos)</span>
        <span className="font-bold text-[14px] text-[#3F7A52]">{fmtBs(totalVendido)}</span>
      </div>
    </>
  )
}
