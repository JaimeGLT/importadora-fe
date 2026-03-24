import { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, CreditCard, Calculator, CheckCircle2, AlertCircle, Lock, RefreshCw, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { Modal, DataTable, EmptyState } from '@/components/ui';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const fmt = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FinanzasPage() {
  const { ordenes, cuentas, cierresCaja, createCierreCaja, updateCuentaPorCobrar, config, applyMassivePriceUpdate } = useAppStore();
  const cuentasPorCobrar = cuentas;
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'resumen' | 'cuentas' | 'cierre' | 'importacion'>('resumen');
  const [priceModal, setPriceModal] = useState(false);
  const [cierreModal, setCierreModal] = useState(false);

  const today = new Date().toDateString();
  const todayOrdenes = ordenes.filter((o) => new Date(o.created_at).toDateString() === today && o.estado !== 'cancelado');

  const ventasPorMetodo = useMemo(() => {
    const acc = { efectivo: 0, qr: 0, transferencia: 0, credito: 0 };
    todayOrdenes.forEach((o) => { acc[o.forma_pago] = (acc[o.forma_pago] ?? 0) + o.total; });
    return acc;
  }, [todayOrdenes]);

  const totalHoy = Object.values(ventasPorMetodo).reduce((a, b) => a + b, 0);

  const semana = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const ds = d.toDateString();
    const ords = ordenes.filter((o) => new Date(o.created_at).toDateString() === ds && o.estado !== 'cancelado');
    return { label: format(d, 'EEE dd', { locale: es }), total: ords.reduce((acc, o) => acc + o.total, 0), count: ords.length };
  }), [ordenes]);

  const cuentasPendientes = cuentasPorCobrar.filter((c) => c.estado !== 'pagada');
  const totalPendiente = cuentasPendientes.reduce((acc, c) => acc + (c.monto - c.pagado), 0);

  const yaHayCierre = cierresCaja.some((c) => new Date(c.created_at).toDateString() === today);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Finanzas</h1>
          <p className="page-subtitle">Resumen financiero, cuentas por cobrar y cierre de caja</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPriceModal(true)} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Actualizar precios
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['resumen', 'Resumen del día'],
          ['cuentas', `Cuentas por cobrar ${cuentasPendientes.length > 0 ? `(${cuentasPendientes.length})` : ''}`],
          ['cierre', 'Cierre de caja'],
          ['importacion', 'Importación'],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={clsx('btn btn-sm', tab === k ? 'btn-primary' : 'btn-secondary')}>{l}</button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: 'Ventas hoy', value: fmt(totalHoy), sub: `${todayOrdenes.length} órdenes`, bg: 'bg-emerald-50', text: 'text-emerald-700' },
              { label: 'Efectivo', value: fmt(ventasPorMetodo.efectivo), sub: 'cobrado hoy', bg: 'bg-blue-50', text: 'text-blue-700' },
              { label: 'Digital (QR + Transfer.)', value: fmt(ventasPorMetodo.qr + ventasPorMetodo.transferencia), sub: 'cobrado hoy', bg: 'bg-purple-50', text: 'text-purple-700' },
              { label: 'Crédito otorgado', value: fmt(ventasPorMetodo.credito), sub: 'pendiente de cobro', bg: 'bg-amber-50', text: 'text-amber-700' },
            ].map((s) => (
              <div key={s.label} className={clsx('card p-4 border-0', s.bg)}>
                <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
                <p className={clsx('text-xl font-bold font-mono-data', s.text)}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Ventas semana */}
          <div className="card p-5">
            <h3 className="card-title mb-4">Ventas — últimos 7 días</h3>
            <div className="space-y-2">
              {semana.map((d) => {
                const max = Math.max(...semana.map((s) => s.total), 1);
                return (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-16 shrink-0">{d.label}</span>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${(d.total / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono-data font-semibold text-slate-700 w-28 text-right">{fmt(d.total)}</span>
                    <span className="text-xs text-slate-400 w-12 text-right">{d.count} órd.</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'cuentas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 border-0 bg-amber-50">
              <p className="text-xs font-medium text-slate-500 mb-1">Total pendiente</p>
              <p className="text-2xl font-bold text-amber-700 font-mono-data">{fmt(totalPendiente)}</p>
            </div>
            <div className="card p-4 border-0 bg-emerald-50">
              <p className="text-xs font-medium text-slate-500 mb-1">Cuentas pagadas</p>
              <p className="text-2xl font-bold text-emerald-700">{cuentasPorCobrar.filter((c) => c.estado === 'pagada').length}</p>
            </div>
          </div>
          <div className="card">
            <DataTable
              columns={[
                { label: 'Orden' }, { label: 'Cliente' },
                { label: 'Monto', align: 'right' }, { label: 'Pagado', align: 'right' },
                { label: 'Pendiente', align: 'right' }, { label: 'Vencimiento' },
                { label: 'Estado' }, { label: '', align: 'right' },
              ]}
              empty={cuentasPorCobrar.length === 0 ? (
                <EmptyState icon={<CreditCard size={24} />} title="Sin cuentas" description="No hay cuentas por cobrar." />
              ) : undefined}
            >
              {cuentasPorCobrar.map((c) => {
                const pendiente = c.monto - c.pagado;
                const vencida = new Date(c.vencimiento) < new Date() && c.estado !== 'pagada';
                return (
                  <tr key={c.id} className="table-tr">
                    <td className="table-td"><span className="font-mono-data text-xs text-blue-600 font-semibold">{c.orden_numero}</span></td>
                    <td className="table-td text-sm text-slate-700">{c.cliente_nombre}</td>
                    <td className="table-td text-right font-mono-data text-sm">{fmt(c.monto)}</td>
                    <td className="table-td text-right font-mono-data text-sm text-emerald-600">{fmt(c.pagado)}</td>
                    <td className="table-td text-right font-mono-data text-sm font-semibold text-amber-600">{fmt(pendiente)}</td>
                    <td className="table-td text-sm">
                      <span className={clsx(vencida ? 'text-red-600' : 'text-slate-500')}>
                        {format(new Date(c.vencimiento), 'dd MMM yyyy', { locale: es })}
                        {vencida && ' ⚠'}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={c.estado === 'pagada' ? 'badge-green' : c.estado === 'vencida' ? 'badge-red' : 'badge-yellow'}>
                        {c.estado === 'pagada' ? 'Pagado' : c.estado === 'vencida' ? 'Vencida' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="table-td text-right">
                      {c.estado !== 'pagada' && (
                        <button onClick={() => updateCuentaPorCobrar(c.id, { pagado: c.monto, estado: 'pagada' })}
                          className="btn btn-sm btn-secondary text-emerald-600 hover:bg-emerald-50">
                          <CheckCircle2 size={13} /> Marcar pagado
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          </div>
        </div>
      )}

      {tab === 'cierre' && (
        <div className="space-y-4">
          {yaHayCierre && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-700">
              <CheckCircle2 size={18} />
              <p className="text-sm font-medium">El cierre de caja de hoy ya fue realizado.</p>
            </div>
          )}
          <div className="card p-5">
            <h3 className="card-title mb-4">Resumen para cierre de hoy</h3>
            <div className="space-y-3">
              {([
                ['Efectivo', ventasPorMetodo.efectivo, 'text-slate-800'],
                ['QR / Código QR', ventasPorMetodo.qr, 'text-slate-800'],
                ['Transferencia bancaria', ventasPorMetodo.transferencia, 'text-slate-800'],
                ['Crédito otorgado', ventasPorMetodo.credito, 'text-amber-600'],
              ] as const).map(([label, value, color]) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className={clsx('font-mono-data font-semibold text-sm', color)}>{fmt(value)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 font-bold">
                <span className="text-slate-800">Total del día</span>
                <span className="font-mono-data text-lg text-blue-600">{fmt(totalHoy)}</span>
              </div>
            </div>
            {!yaHayCierre && (
              <button onClick={() => setCierreModal(true)} className="btn btn-primary w-full mt-4">
                <Lock size={15} /> Realizar cierre de caja
              </button>
            )}
          </div>

          {cierresCaja.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Historial de cierres</h3></div>
              <DataTable columns={[
                { label: 'Fecha' }, { label: 'Órdenes', align: 'center' },
                { label: 'Efectivo', align: 'right' }, { label: 'Digital', align: 'right' },
                { label: 'Total', align: 'right' }, { label: 'Cerrado por' },
              ]}>
                {cierresCaja.map((c) => (
                  <tr key={c.id} className="table-tr">
                    <td className="table-td text-sm">{format(new Date(c.created_at), 'dd MMM yyyy', { locale: es })}</td>
                    <td className="table-td text-center font-mono-data">{c.ordenes_count}</td>
                    <td className="table-td text-right font-mono-data text-sm">{fmt(c.efectivo)}</td>
                    <td className="table-td text-right font-mono-data text-sm">{fmt(c.qr + c.transferencia)}</td>
                    <td className="table-td text-right font-mono-data font-semibold text-blue-600">{fmt(c.total)}</td>
                    <td className="table-td text-sm text-slate-500">{c.cerrado_por}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          )}
        </div>
      )}

      {tab === 'importacion' && (
        <ImportacionTab config={config} />
      )}

      {priceModal && (
        <PrecioModal onClose={() => setPriceModal(false)}
          onSave={(factor) => { applyMassivePriceUpdate(factor, user?.name ?? 'Sistema'); setPriceModal(false); }} />
      )}

      {cierreModal && (
        <Modal title="Confirmar cierre de caja" onClose={() => setCierreModal(false)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">¿Confirmar el cierre de caja del día de hoy?</p>
            <div className="p-3 rounded-lg bg-slate-50 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Total a cerrar</span>
                <span className="font-mono-data font-bold">{fmt(totalHoy)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Órdenes</span>
                <span className="font-mono-data">{todayOrdenes.length}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCierreModal(false)} className="btn btn-secondary flex-1">Cancelar</button>
              <button onClick={() => {
                createCierreCaja({
                  fecha: new Date().toISOString().split('T')[0],
                  efectivo: ventasPorMetodo.efectivo, qr: ventasPorMetodo.qr,
                  transferencia: ventasPorMetodo.transferencia, credito: ventasPorMetodo.credito,
                  total: totalHoy, ordenes_count: todayOrdenes.length,
                  cerrado_por: user?.name ?? 'Sistema',
                });
                setCierreModal(false);
              }} className="btn btn-primary flex-1"><Lock size={14} /> Confirmar cierre</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ImportacionTab({ config }: { config: ReturnType<typeof useAppStore.getState>['config'] }) {
  const [usd, setUsd] = useState(config.tipo_cambio);
  const [flete, setFlete] = useState(500);
  const [seguro, setSeguro] = useState(50);
  const [aranceles, setAranceles] = useState(10);
  const [otros, setOtros] = useState(0);
  const [items, setItems] = useState([
    { descripcion: '', cantidad: 1, costo_usd: 0 },
  ]);

  const subtotalUsd = items.reduce((acc, i) => acc + i.cantidad * i.costo_usd, 0);
  const subtotalPen = subtotalUsd * usd;
  const gastos = flete + seguro + aranceles + otros;
  const totalPen = subtotalPen + gastos;
  const costoPorUnidad = items.reduce((acc, i) => acc + i.cantidad, 0) > 0
    ? totalPen / items.reduce((acc, i) => acc + i.cantidad, 0) : 0;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="card-title mb-4">Calculadora de costos de importación</h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Tipo de cambio (USD)', value: usd, set: setUsd, prefix: 'S/' },
            { label: 'Flete (S/)', value: flete, set: setFlete },
            { label: 'Seguro (S/)', value: seguro, set: setSeguro },
            { label: 'Aranceles (S/)', value: aranceles, set: setAranceles },
          ].map((f) => (
            <div key={f.label}>
              <label className="field-label">{f.label}</label>
              <input type="number" min="0" step="0.01" className="field-input" value={f.value}
                onChange={(e) => f.set(Number(e.target.value))} />
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">Productos importados</p>
            <button onClick={() => setItems((i) => [...i, { descripcion: '', cantidad: 1, costo_usd: 0 }])}
              className="btn btn-sm btn-secondary">+ Agregar fila</button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input className="field-input col-span-6" placeholder="Descripción"
                  value={item.descripcion} onChange={(e) => setItems((ii) => ii.map((x, i) => i === idx ? { ...x, descripcion: e.target.value } : x))} />
                <input type="number" min="1" className="field-input col-span-2" placeholder="Cant."
                  value={item.cantidad} onChange={(e) => setItems((ii) => ii.map((x, i) => i === idx ? { ...x, cantidad: Number(e.target.value) } : x))} />
                <input type="number" min="0" step="0.01" className="field-input col-span-3" placeholder="USD c/u"
                  value={item.costo_usd} onChange={(e) => setItems((ii) => ii.map((x, i) => i === idx ? { ...x, costo_usd: Number(e.target.value) } : x))} />
                <button onClick={() => setItems((ii) => ii.filter((_, i) => i !== idx))}
                  className="btn-icon btn-ghost text-red-400 hover:text-red-600 col-span-1">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-blue-50 border border-blue-100 grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Subtotal USD', value: `$ ${subtotalUsd.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` },
            { label: 'Subtotal PEN', value: `S/ ${subtotalPen.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` },
            { label: 'Gastos de importación', value: `S/ ${gastos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` },
            { label: 'Costo total', value: `S/ ${totalPen.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` },
          ].map((r) => (
            <div key={r.label}>
              <p className="text-xs text-blue-600 font-medium">{r.label}</p>
              <p className="text-lg font-bold text-blue-800 font-mono-data">{r.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrecioModal({ onClose, onSave }: { onClose: () => void; onSave: (factor: number) => void }) {
  const [factor, setFactor] = useState(1.1);
  const pct = ((factor - 1) * 100).toFixed(1);
  return (
    <Modal title="Actualización masiva de precios" onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Aplica un factor de ajuste a todos los precios de venta del inventario.</p>
        <div>
          <label className="field-label">Factor de actualización</label>
          <input type="number" min="0.1" max="10" step="0.01" className="field-input" value={factor}
            onChange={(e) => setFactor(Number(e.target.value))} />
          <p className="text-xs text-slate-500 mt-1">Factor {factor} = {Number(pct) >= 0 ? '+' : ''}{pct}% sobre precios actuales</p>
        </div>
        <div className={clsx('p-3 rounded-lg text-sm', Number(pct) >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')}>
          ⚠ Esta acción actualizará TODOS los precios de venta del inventario.
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button onClick={() => onSave(factor)} className="btn btn-primary flex-1">Aplicar</button>
        </div>
      </div>
    </Modal>
  );
}
