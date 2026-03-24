import { useState, useMemo } from 'react';
import { Users, Plus, Search, Edit2, CreditCard, History, ChevronDown, Phone, MapPin, DollarSign } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Modal, EmptyState, DataTable, ConfirmDialog } from '@/components/ui';
import type { Cliente } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const fmt = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ClientesPage() {
  const { clientes, ordenes, addCliente, updateCliente } = useAppStore();
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'contado' | 'credito'>('todos');
  const [modal, setModal] = useState<'nuevo' | 'editar' | 'ficha' | null>(null);
  const [selected, setSelected] = useState<Cliente | null>(null);

  const filtered = useMemo(() => {
    return clientes.filter((c) => {
      if (!c.activo) return false;
      if (filtro !== 'todos' && c.tipo !== filtro) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.nombre.toLowerCase().includes(q) || (c.nit_ci ?? '').toLowerCase().includes(q) || (c.telefono ?? '').includes(q);
      }
      return true;
    });
  }, [clientes, search, filtro]);

  function openFicha(c: Cliente) { setSelected(c); setModal('ficha'); }
  function openEditar(c: Cliente) { setSelected(c); setModal('editar'); }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Gestión de clientes y cuentas de crédito</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('nuevo'); }} className="btn btn-primary btn-sm">
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total clientes', value: clientes.filter((c) => c.activo).length, bg: 'bg-blue-50', text: 'text-blue-700' },
          { label: 'Cuentas crédito', value: clientes.filter((c) => c.activo && c.tipo === 'credito').length, bg: 'bg-purple-50', text: 'text-purple-700' },
          { label: 'Deuda total', value: fmt(clientes.filter((c) => c.activo && c.tipo === 'credito').reduce((acc, c) => acc + c.saldo_credito, 0)), bg: 'bg-amber-50', text: 'text-amber-700' },
        ].map((s) => (
          <div key={s.label} className={clsx('card p-4 border-0', s.bg)}>
            <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
            <p className={clsx('text-2xl font-bold', s.text)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por nombre, NIT/CI o teléfono..."
              value={search} onChange={(e) => setSearch(e.target.value)} className="field-input pl-9" />
          </div>
          <div className="flex gap-2">
            {(['todos', 'contado', 'credito'] as const).map((f) => (
              <button key={f} onClick={() => setFiltro(f)}
                className={clsx('btn btn-sm', filtro === f ? 'btn-primary' : 'btn-secondary')}>
                {f === 'todos' ? 'Todos' : f === 'contado' ? 'Contado' : 'Crédito'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={[
            { label: 'Cliente' }, { label: 'Tipo' }, { label: 'Contacto' },
            { label: 'Límite crédito', align: 'right' }, { label: 'Deuda', align: 'right' },
            { label: '', align: 'right' },
          ]}
          empty={filtered.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title="Sin clientes" description="No hay clientes que coincidan." />
          ) : undefined}
        >
          {filtered.map((c) => {
            const historial = ordenes.filter((o) => o.cliente_id === c.id && o.estado !== 'cancelado');
            const totalCompras = historial.reduce((acc, o) => acc + o.total, 0);
            return (
              <tr key={c.id} className="table-tr">
                <td className="table-td">
                  <p className="font-medium text-slate-800 text-sm">{c.nombre}</p>
                  {c.nit_ci && <p className="text-[11px] font-mono-data text-slate-400">NIT/CI: {c.nit_ci}</p>}
                  <p className="text-[11px] text-slate-400">{historial.length} órdenes · {fmt(totalCompras)}</p>
                </td>
                <td className="table-td">
                  <span className={c.tipo === 'credito' ? 'badge-purple' : 'badge-green'}>
                    {c.tipo === 'credito' ? 'Crédito' : 'Contado'}
                  </span>
                </td>
                <td className="table-td">
                  {c.telefono && <p className="text-sm text-slate-600 flex items-center gap-1"><Phone size={11} className="text-slate-400" />{c.telefono}</p>}
                  {c.direccion && <p className="text-xs text-slate-400 flex items-center gap-1 truncate max-w-[160px]"><MapPin size={10} />{c.direccion}</p>}
                </td>
                <td className="table-td text-right font-mono-data text-sm text-slate-700">
                  {c.tipo === 'credito' ? fmt(c.limite_credito) : '—'}
                </td>
                <td className="table-td text-right">
                  {c.tipo === 'credito' ? (
                    <div>
                      <p className={clsx('font-mono-data text-sm font-semibold', c.saldo_credito > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                        {fmt(c.saldo_credito)}
                      </p>
                      {c.saldo_credito > 0 && (
                        <div className="w-16 h-1 rounded-full bg-slate-100 mt-1 ml-auto overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (c.saldo_credito / c.limite_credito) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="table-td text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openFicha(c)} className="btn-icon btn-ghost text-slate-400 hover:text-blue-600" title="Ver ficha">
                      <History size={15} />
                    </button>
                    <button onClick={() => openEditar(c)} className="btn-icon btn-ghost text-slate-400 hover:text-blue-600" title="Editar">
                      <Edit2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>

      {(modal === 'nuevo' || modal === 'editar') && (
        <ClienteModal cliente={modal === 'editar' ? selected : null} onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal === 'editar' && selected) updateCliente(selected.id, data);
            else addCliente(data);
            setModal(null);
          }} />
      )}

      {modal === 'ficha' && selected && (
        <FichaModal cliente={selected} ordenes={ordenes} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function ClienteModal({ cliente, onClose, onSave }: {
  cliente: Cliente | null;
  onClose: () => void;
  onSave: (data: Omit<Cliente, 'id' | 'created_at'>) => void;
}) {
  const [form, setForm] = useState({
    nombre: cliente?.nombre ?? '',
    nit_ci: cliente?.nit_ci ?? '',
    telefono: cliente?.telefono ?? '',
    direccion: cliente?.direccion ?? '',
    tipo: cliente?.tipo ?? ('contado' as const),
    limite_credito: String(cliente?.limite_credito ?? 0),
    saldo_credito: String(cliente?.saldo_credito ?? 0),
    notas: cliente?.notas ?? '',
    activo: cliente?.activo ?? true,
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      nombre: form.nombre, nit_ci: form.nit_ci || undefined, telefono: form.telefono || undefined,
      direccion: form.direccion || undefined, tipo: form.tipo,
      limite_credito: Number(form.limite_credito), saldo_credito: Number(form.saldo_credito),
      notas: form.notas || undefined, activo: form.activo,
    });
  }

  return (
    <Modal title={cliente ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="field-label">Nombre / Razón social *</label>
          <input className="field-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="field-label">NIT / CI</label>
            <input className="field-input" value={form.nit_ci} onChange={(e) => set('nit_ci', e.target.value)} /></div>
          <div><label className="field-label">Teléfono</label>
            <input className="field-input" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} /></div>
        </div>
        <div><label className="field-label">Dirección</label>
          <input className="field-input" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} /></div>
        <div>
          <label className="field-label">Tipo de cliente</label>
          <div className="grid grid-cols-2 gap-2">
            {([['contado', 'Contado'], ['credito', 'Crédito']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => set('tipo', v)}
                className={clsx('btn btn-sm', form.tipo === v ? 'btn-primary' : 'btn-secondary')}>{l}</button>
            ))}
          </div>
        </div>
        {form.tipo === 'credito' && (
          <div className="grid grid-cols-2 gap-4">
            <div><label className="field-label">Límite de crédito (S/)</label>
              <input type="number" min="0" step="0.01" className="field-input" value={form.limite_credito}
                onChange={(e) => set('limite_credito', e.target.value)} /></div>
            <div><label className="field-label">Deuda actual (S/)</label>
              <input type="number" min="0" step="0.01" className="field-input" value={form.saldo_credito}
                onChange={(e) => set('saldo_credito', e.target.value)} /></div>
          </div>
        )}
        <div><label className="field-label">Notas</label>
          <textarea className="field-textarea" rows={2} value={form.notas} onChange={(e) => set('notas', e.target.value)} /></div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button type="submit" className="btn btn-primary flex-1">{cliente ? 'Guardar cambios' : 'Crear cliente'}</button>
        </div>
      </form>
    </Modal>
  );
}

function FichaModal({ cliente, ordenes, onClose }: {
  cliente: Cliente;
  ordenes: ReturnType<typeof useAppStore.getState>['ordenes'];
  onClose: () => void;
}) {
  const historial = ordenes.filter((o) => o.cliente_id === cliente.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const totalCompras = historial.filter((o) => o.estado !== 'cancelado').reduce((acc, o) => acc + o.total, 0);

  return (
    <Modal title={`Ficha de ${cliente.nombre}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Info */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Tipo', value: cliente.tipo === 'credito' ? 'Crédito' : 'Contado' },
            { label: 'Total compras', value: fmt(totalCompras) },
            { label: 'Órdenes', value: historial.filter((o) => o.estado !== 'cancelado').length },
            ...(cliente.tipo === 'credito' ? [
              { label: 'Límite crédito', value: fmt(cliente.limite_credito) },
              { label: 'Deuda actual', value: fmt(cliente.saldo_credito) },
              { label: 'Disponible', value: fmt(cliente.limite_credito - cliente.saldo_credito) },
            ] : []),
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-slate-50">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="text-sm font-bold text-slate-800 font-mono-data">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Historial */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Historial de órdenes</h4>
          {historial.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin órdenes registradas</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-none">
              {historial.map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <span className="font-mono-data text-xs font-semibold text-blue-600">{o.numero}</span>
                  <span className={clsx('badge', o.estado === 'entregado' ? 'badge-green' : o.estado === 'cancelado' ? 'badge-red' : o.estado === 'pendiente' ? 'badge-yellow' : 'badge-blue')}>
                    {o.estado}
                  </span>
                  <span className="text-xs text-slate-500 flex-1">{o.items.length} producto(s)</span>
                  <span className="font-mono-data text-sm font-semibold text-slate-800">{fmt(o.total)}</span>
                  <span className="text-[11px] text-slate-400">{format(new Date(o.created_at), 'dd MMM yy', { locale: es })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose} className="btn btn-secondary w-full">Cerrar</button>
      </div>
    </Modal>
  );
}
