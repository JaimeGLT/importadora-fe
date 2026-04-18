import { Fragment } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import type { Importacion, EstadoImportacion } from '@/types'
import { clsx } from 'clsx'

const ESTADO_CONFIG: Record<EstadoImportacion, { label: string; bg: string; text: string; border: string }> = {
  en_transito: { label: 'En tránsito',  bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  en_aduana:   { label: 'En aduana',    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  recibida:    { label: 'Recibida',     bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  cancelada:   { label: 'Cancelada',    bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
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

interface Props {
  open: boolean
  onClose: () => void
  importacion: Importacion | null
}

export function ImportacionDetailModal({ open, onClose, importacion }: Props) {
  if (!importacion) return null

  const estado = ESTADO_CONFIG[importacion.estado]
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
                    <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold border', estado.bg, estado.text, estado.border)}>
                      {estado.label}
                    </span>
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
                <table className="w-full">
                  <thead className="sticky top-0 bg-white z-10 border-b border-steel-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400">Producto</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400 w-16">Cant.</th>
                      <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400 w-24">Costo</th>
                      <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400 w-24">Venta</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-steel-400 w-20">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-steel-50">
                    {importacion.items.map((item) => (
                      <tr key={item.id} className="hover:bg-steel-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-brand-600 text-white">
                              {item.codigo_proveedor}
                            </span>
                            {item.codigos_adicionales?.[0] && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-steel-100 text-steel-600">
                                {item.codigos_adicionales[0]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-steel-900">{item.nombre}</p>
                          {item.marca && (
                            <p className="text-xs text-steel-400">{item.marca}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-bold text-steel-900 tabular-nums">{item.cantidad}</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-sm font-medium text-steel-700 tabular-nums">{item.costo_unitario_total_bs.toFixed(2)}</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-sm font-bold text-emerald-600 tabular-nums">{item.precio_venta_final.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
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
              <div className="px-6 py-4 bg-steel-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-6">
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
                </div>
                <div className="text-right">
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