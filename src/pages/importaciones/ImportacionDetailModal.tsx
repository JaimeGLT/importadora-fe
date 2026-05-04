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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
            <DialogPanel className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-steel-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <DialogTitle className="text-xl font-bold text-steel-900">
                      {importacion.numero}
                    </DialogTitle>
                  </div>
                  <p className="text-sm text-steel-500">{importacion.proveedor} · {importacion.origen}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-steel-400 hover:text-steel-600 hover:bg-steel-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* KPIs principales */}
              <div className="px-6 py-4 border-b border-steel-100 bg-steel-50/50">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-semibold text-steel-400 tracking-wider mb-1">Productos</p>
                    <p className="text-2xl font-black text-steel-900">{importacion.items.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-semibold text-steel-400 tracking-wider mb-1">FOB Total</p>
                    <p className="text-2xl font-black text-steel-900">{fmtUSD(importacion.fob_total_usd)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-semibold text-steel-400 tracking-wider mb-1">Inversión</p>
                    <p className="text-2xl font-black text-brand-600">{fmtBs(costoTotal)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-semibold text-steel-400 tracking-wider mb-1">T.C.</p>
                    <p className="text-2xl font-black text-steel-900">{importacion.tipo_cambio.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-semibold text-steel-400 tracking-wider mb-1">Llegada</p>
                    <p className="text-base font-bold text-steel-700">{fmtDate(importacion.fecha_estimada_llegada)}</p>
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
                  <thead className="sticky top-0 bg-white z-10 border-b border-steel-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400">Producto</th>
                      <th className="text-center px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400">Cant.</th>
                      <th className="text-center px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400">Pzas.</th>
                      <th className="text-right px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400">Costo Unit.</th>
                      <th className="text-right px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400">Precio Venta</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-steel-50">
                    {importacion.items.map((item) => (
                      <tr key={item.id} className="hover:bg-steel-50/50 transition-colors">
                        <td className="px-4 py-3 overflow-hidden">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-brand-600 text-white shrink-0">
                              {item.codigo_proveedor}
                            </span>
                            {item.codigos_adicionales?.[0] && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-steel-100 text-steel-600 shrink-0">
                                {item.codigos_adicionales[0]}
                              </span>
                            )}
                            {item.codigos_adicionales?.[1] && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-steel-100 text-steel-600 shrink-0">
                                {item.codigos_adicionales[1]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-steel-900 leading-tight truncate">{item.nombre}</p>
                          {item.marca && (
                            <p className="text-[10px] text-steel-400 truncate">{item.marca}</p>
                          )}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="text-sm font-bold text-steel-900 tabular-nums">{item.cantidad}</span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="text-xs text-steel-400 tabular-nums">{item.piezas ?? '—'}</span>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <span className="text-xs font-medium text-steel-500">Bs</span>
                          <span className="text-sm font-semibold text-steel-700 tabular-nums ml-1">{item.costo_unitario_total_bs.toFixed(2)}</span>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <span className="text-xs font-medium text-steel-500">Bs</span>
                          <span className="text-sm font-bold text-emerald-600 tabular-nums ml-1">{item.precio_venta_final.toFixed(2)}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {item.es_nuevo ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              Nuevo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-steel-50 text-steel-600 border border-steel-200">
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
              <div className="px-6 py-4 bg-steel-900 text-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-5 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-steel-400">Creada</p>
                    <p className="text-sm font-medium">{fmtDate(importacion.fecha_creacion)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-steel-400">Flete</p>
                    <p className="text-sm font-medium">{fmtUSD(importacion.flete_usd)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-steel-400">Aduana</p>
                    <p className="text-sm font-medium">{fmtBs(importacion.aduana_bs)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-steel-400">Transporte</p>
                    <p className="text-sm font-medium">{fmtBs(importacion.transporte_interno_bs)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase font-semibold text-steel-400">Inversión Total</p>
                  <p className="text-xl font-black text-brand-400">{fmtBs(costoTotal)}</p>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}