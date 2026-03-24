import { useState } from 'react';
import { Clock, Play, CheckCircle2, MapPin, Package, Timer, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Modal } from '@/components/ui';
import type { Orden } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

type Tab = 'pendiente' | 'en_preparacion' | 'entregado';

export function LogisticaPage() {
  const { ordenes, productos, updateOrden, reportProblem } = useAppStore();
  const [tab, setTab] = useState<Tab>('pendiente');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [problemaModal, setProblemaModal] = useState<Orden | null>(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'en_preparacion', label: 'En preparación' },
    { key: 'entregado', label: 'Entregados hoy' },
  ];

  const today = new Date().toDateString();
  const filtered = ordenes.filter((o) => {
    if (o.estado === 'cancelado') return false;
    if (tab === 'entregado') return o.estado === 'entregado' && new Date(o.updated_at).toDateString() === today;
    return o.estado === tab;
  }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const counts = {
    pendiente: ordenes.filter((o) => o.estado === 'pendiente').length,
    en_preparacion: ordenes.filter((o) => o.estado === 'en_preparacion').length,
    entregado: ordenes.filter((o) => o.estado === 'entregado' && new Date(o.updated_at).toDateString() === today).length,
  };

  function startPrep(o: Orden) {
    updateOrden(o.id, { estado: 'en_preparacion', started_at: new Date().toISOString() });
  }

  function markDelivered(o: Orden) {
    updateOrden(o.id, { estado: 'entregado', delivered_at: new Date().toISOString() });
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Logística</h1>
          <p className="page-subtitle">Control de despacho y preparación de órdenes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx('btn btn-sm gap-2', tab === t.key ? 'btn-primary' : 'btn-secondary')}>
            {t.label}
            <span className={clsx('text-[11px] px-1.5 py-0.5 rounded-full font-bold',
              tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">
            {tab === 'pendiente' ? 'No hay órdenes pendientes' :
             tab === 'en_preparacion' ? 'No hay órdenes en preparación' : 'No hay entregas hoy'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const isExpanded = expanded === o.id;
            const elapsed = o.started_at
              ? Math.round((Date.now() - new Date(o.started_at).getTime()) / 60000)
              : null;

            return (
              <div key={o.id} className={clsx('card overflow-hidden', o.problema ? 'border border-red-200' : '')}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    o.estado === 'pendiente' ? 'bg-amber-50 text-amber-600' :
                    o.estado === 'en_preparacion' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600')}>
                    {o.estado === 'pendiente' ? <Clock size={18} /> :
                     o.estado === 'en_preparacion' ? <Package size={18} /> : <CheckCircle2 size={18} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono-data text-sm font-bold text-blue-600">{o.numero}</span>
                      {o.problema && <span className="badge-red flex items-center gap-1"><AlertTriangle size={10} /> Problema</span>}
                    </div>
                    <p className="text-sm font-medium text-slate-800">{o.cliente_nombre}</p>
                    <p className="text-xs text-slate-400">
                      {o.items.length} producto(s) · {format(new Date(o.created_at), 'HH:mm', { locale: es })} ·{' '}
                      {formatDistanceToNow(new Date(o.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>

                  {elapsed !== null && o.estado === 'en_preparacion' && (
                    <div className={clsx('flex items-center gap-1.5 text-sm font-mono-data font-bold shrink-0',
                      elapsed > 10 ? 'text-red-500' : 'text-blue-600')}>
                      <Timer size={14} />
                      {elapsed} min
                    </div>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {o.estado === 'pendiente' && (
                      <button onClick={() => startPrep(o)} className="btn btn-sm btn-primary">
                        <Play size={13} /> Iniciar
                      </button>
                    )}
                    {o.estado === 'en_preparacion' && (
                      <>
                        <button onClick={() => setProblemaModal(o)}
                          className="btn btn-sm btn-secondary text-amber-600 border-amber-200 hover:bg-amber-50">
                          <AlertTriangle size={13} /> Problema
                        </button>
                        <button onClick={() => markDelivered(o)}
                          className="btn btn-sm btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                          <CheckCircle2 size={13} /> Entregar
                        </button>
                      </>
                    )}
                    <button onClick={() => setExpanded(isExpanded ? null : o.id)}
                      className="btn-icon btn-ghost text-slate-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded — picking guide */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50">
                    {o.problema && (
                      <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                        <p className="text-xs font-semibold text-red-700 mb-0.5">Problema reportado:</p>
                        <p className="text-sm text-red-600">{o.problema}</p>
                      </div>
                    )}
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Guía de picking</p>
                      <div className="space-y-2">
                        {o.items.map((item, idx) => {
                          // Use ubicacion from the item itself (stored at time of sale)
                          const loc = item.ubicacion;
                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200">
                              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                {item.cantidad}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{item.nombre}</p>
                                <p className="text-[11px] font-mono-data text-slate-400">{item.sku}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <MapPin size={11} className="text-slate-400" />
                                <span className="text-xs font-mono-data text-slate-600">
                                  {loc.almacen}·E{loc.estante}·F{loc.fila}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {problemaModal && (
        <ProblemaModal orden={problemaModal} onClose={() => setProblemaModal(null)}
          onSave={(p) => { reportProblem(problemaModal.id, p); setProblemaModal(null); }} />
      )}
    </div>
  );
}

function ProblemaModal({ orden, onClose, onSave }: {
  orden: Orden; onClose: () => void; onSave: (problema: string) => void;
}) {
  const [texto, setTexto] = useState(orden.problema ?? '');
  return (
    <Modal title="Reportar problema" onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Orden <span className="font-mono-data font-semibold text-blue-600">{orden.numero}</span> · {orden.cliente_nombre}
        </p>
        <div>
          <label className="field-label">Descripción del problema *</label>
          <textarea className="field-textarea" rows={3}
            placeholder="Ej: Producto dañado, falta de stock, dirección incorrecta..."
            value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button disabled={!texto.trim()} onClick={() => onSave(texto)} className="btn btn-danger flex-1">
            <AlertTriangle size={14} /> Reportar
          </button>
        </div>
      </div>
    </Modal>
  );
}
