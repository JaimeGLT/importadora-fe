import { Fragment } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import type { Importacion } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  importacion: Importacion | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtBs(n: number) {
  return `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function ImportacionDetailModal({ open, onClose, importacion }: Props) {
  if (!importacion) return null

  const costoTotal = importacion.fob_total_usd * importacion.tipo_cambio + importacion.aduana_bs + importacion.transporte_interno_bs

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[#1e1b2e]/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-[#e2e8f0]">

              {/* Header */}
              <div className="px-6 py-5 border-b border-[#e2e8f0] bg-[#f1f5f9] flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#0284c7] flex items-center justify-center text-white shrink-0">
                      <i className="ti ti-package-import text-base" />
                    </div>
                    <DialogTitle className="text-xl font-black text-[#1e1b2e]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                      {importacion.numero}
                    </DialogTitle>
                  </div>
                  <p className="text-sm text-[#9996b0] font-semibold ml-11">{importacion.proveedor} · {importacion.origen}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-[8px] text-[#9996b0] hover:text-[#1e1b2e] hover:bg-[#e2e8f0] transition-colors"
                >
                  <i className="ti ti-x text-xl" />
                </button>
              </div>

              {/* KPIs */}
              <div className="px-6 py-4 border-b border-[#e2e8f0] bg-white">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-[#9996b0] tracking-wider mb-1">Productos</p>
                    <p className="font-black text-[26px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>{importacion.items.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-[#9996b0] tracking-wider mb-1">FOB Total</p>
                    <p className="font-black text-[22px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>{fmtUSD(importacion.fob_total_usd)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-[#9996b0] tracking-wider mb-1">Inversión</p>
                    <p className="font-black text-[22px] text-[#1d4ed8] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>{fmtBs(costoTotal)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-[#9996b0] tracking-wider mb-1">T.C.</p>
                    <p className="font-black text-[22px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>{importacion.tipo_cambio.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-[#9996b0] tracking-wider mb-1">Llegada</p>
                    <p className="text-base font-bold text-[#1e1b2e]">{fmtDate(importacion.fecha_estimada_llegada)}</p>
                  </div>
                </div>
              </div>

              {/* Tabla de productos */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: '240px' }} />
                    <col style={{ width: '60px' }} />
                    <col style={{ width: '60px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '80px' }} />
                  </colgroup>
                  <thead className="sticky top-0 bg-[#f1f5f9] z-10 border-b border-[#e2e8f0]">
                    <tr>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#9996b0]">Producto</th>
                      <th className="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wide text-[#9996b0]">Cant.</th>
                      <th className="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wide text-[#9996b0]">Pzas.</th>
                      <th className="text-right px-2 py-3 text-[11px] font-bold uppercase tracking-wide text-[#9996b0]">Costo Unit.</th>
                      <th className="text-right px-2 py-3 text-[11px] font-bold uppercase tracking-wide text-[#9996b0]">Precio Venta</th>
                      <th className="text-center px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-[#9996b0]">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {importacion.items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#faf9ff] transition-colors">
                        <td className="px-4 py-3 overflow-hidden">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-mono font-bold bg-[#1d4ed8] text-white shrink-0">
                              {item.codigo_proveedor}
                            </span>
                            {item.codigos_adicionales?.[0] && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium bg-[#f1f5f9] text-[#5a5670] border border-[#e2e8f0] shrink-0">
                                {item.codigos_adicionales[0]}
                              </span>
                            )}
                            {item.codigos_adicionales?.[1] && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium bg-[#f1f5f9] text-[#5a5670] border border-[#e2e8f0] shrink-0">
                                {item.codigos_adicionales[1]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-[#1e1b2e] leading-tight truncate">{item.nombre}</p>
                          {item.marca && (
                            <p className="text-[10px] text-[#9996b0] truncate mt-0.5">{item.marca}</p>
                          )}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="font-mono font-bold text-[13px] text-[#1e1b2e] tabular-nums">{item.cantidad}</span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="text-xs text-[#9996b0] tabular-nums">{item.piezas ?? '—'}</span>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <span className="text-[11px] font-medium text-[#9996b0]">Bs</span>
                          <span className="text-sm font-semibold text-[#5a5670] tabular-nums ml-1">{item.costo_unitario_total_bs.toFixed(2)}</span>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <span className="text-[11px] font-medium text-[#9996b0]">Bs</span>
                          <span className="text-sm font-bold text-[#059669] tabular-nums ml-1">{item.precio_venta_final.toFixed(2)}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {item.es_nuevo ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ede9fe] text-[#7c3aed]">
                              Nuevo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#dbeafe] text-[#1d4ed8]">
                              Stock+
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-[#f1f5f9] border-t border-[#e2e8f0] flex items-center justify-between gap-4">
                <div className="flex items-center gap-5 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[#9996b0] tracking-wider">Creada</p>
                    <p className="text-sm font-semibold text-[#1e1b2e] mt-0.5">{fmtDate(importacion.fecha_creacion)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[#9996b0] tracking-wider">Flete</p>
                    <p className="text-sm font-semibold text-[#1e1b2e] mt-0.5">{fmtUSD(importacion.flete_usd)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[#9996b0] tracking-wider">Aduana</p>
                    <p className="text-sm font-semibold text-[#1e1b2e] mt-0.5">{fmtBs(importacion.aduana_bs)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[#9996b0] tracking-wider">Transporte</p>
                    <p className="text-sm font-semibold text-[#1e1b2e] mt-0.5">{fmtBs(importacion.transporte_interno_bs)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase font-bold text-[#9996b0] tracking-wider">Inversión Total</p>
                  <p className="font-black text-[22px] text-[#1d4ed8] leading-none mt-1" style={{ fontFamily: 'Nunito, sans-serif' }}>{fmtBs(costoTotal)}</p>
                </div>
              </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
