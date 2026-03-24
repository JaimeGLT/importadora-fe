import { useState, useMemo } from 'react';
import { Warehouse, Search, Plus, Edit2, Trash2, BarChart2, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { Modal, EmptyState, DataTable, LocationTag, StockBadge, ConfirmDialog } from '@/components/ui';
import type { Producto } from '@/types';
import clsx from 'clsx';

export function AlmacenReservaPage() {
  const { productos, addProducto, updateProducto, deleteProducto, adjustStock, config } = useAppStore();
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'nuevo' | 'editar' | 'ajuste' | null>(null);
  const [selected, setSelected] = useState<Producto | null>(null);
  const [confirm, setConfirm] = useState<Producto | null>(null);

  const reservas = useMemo(() => {
    return productos.filter((p) => p.activo && p.es_reserva && (
      !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    ));
  }, [productos, search]);

  const stats = {
    total: productos.filter((p) => p.activo && p.es_reserva).length,
    bajo: productos.filter((p) => p.activo && p.es_reserva && p.stock > 0 && p.stock <= p.stock_minimo).length,
    sinStock: productos.filter((p) => p.activo && p.es_reserva && p.stock === 0).length,
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Almacén de reserva</h1>
          <p className="page-subtitle">Productos especiales y de reserva estratégica</p>
        </div>
        {(user?.role === 'administrador' || user?.role === 'reservero') && (
          <button onClick={() => { setSelected(null); setModal('nuevo'); }} className="btn btn-primary btn-sm">
            <Plus size={15} /> Nuevo producto
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total en reserva', value: stats.total, bg: 'bg-purple-50', text: 'text-purple-700' },
          { label: 'Stock bajo', value: stats.bajo, bg: 'bg-amber-50', text: 'text-amber-700' },
          { label: 'Sin stock', value: stats.sinStock, bg: 'bg-red-50', text: 'text-red-700' },
        ].map((s) => (
          <div key={s.label} className={clsx('card p-4 border-0', s.bg)}>
            <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
            <p className={clsx('text-2xl font-bold', s.text)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre o SKU..."
            value={search} onChange={(e) => setSearch(e.target.value)} className="field-input pl-9" />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={[
            { label: 'Producto' }, { label: 'Categoría' }, { label: 'Ubicación' },
            { label: 'Stock', align: 'center' },
            { label: 'Precio venta', align: 'right' },
            { label: '', align: 'right' },
          ]}
          empty={reservas.length === 0 ? (
            <EmptyState icon={<Warehouse size={24} />} title="Sin productos de reserva"
              description="Agrega productos marcados como reserva para verlos aquí." />
          ) : undefined}
        >
          {reservas.map((p) => (
            <tr key={p.id} className="table-tr">
              <td className="table-td">
                <p className="font-medium text-slate-800 text-sm">{p.nombre}</p>
                <p className="text-[11px] font-mono-data text-slate-400">{p.sku} · {p.marca}</p>
              </td>
              <td className="table-td"><span className="badge-slate">{p.categoria}</span></td>
              <td className="table-td">
                <LocationTag almacen={p.ubicacion.almacen} estante={p.ubicacion.estante} fila={p.ubicacion.fila} />
              </td>
              <td className="table-td text-center"><StockBadge stock={p.stock} min={p.stock_minimo} /></td>
              <td className="table-td text-right font-mono-data font-semibold text-slate-800">
                S/ {p.precio_venta.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </td>
              <td className="table-td text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => { setSelected(p); setModal('ajuste'); }}
                    className="btn-icon btn-ghost text-slate-400 hover:text-blue-600" title="Ajustar stock">
                    <BarChart2 size={15} />
                  </button>
                  <button onClick={() => { setSelected(p); setModal('editar'); }}
                    className="btn-icon btn-ghost text-slate-400 hover:text-blue-600" title="Editar">
                    <Edit2 size={15} />
                  </button>
                  {user?.role === 'administrador' && (
                    <button onClick={() => setConfirm(p)}
                      className="btn-icon btn-ghost text-slate-400 hover:text-red-600" title="Eliminar">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>

      {(modal === 'nuevo' || modal === 'editar') && (
        <ReservaModal
          producto={modal === 'editar' ? selected : null}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal === 'editar' && selected) updateProducto(selected.id, data);
            else addProducto({ ...data, es_reserva: true });
            setModal(null);
          }}
          categorias={config.categorias}
        />
      )}

      {modal === 'ajuste' && selected && (
        <AjusteReservaModal
          producto={selected}
          onClose={() => setModal(null)}
          onSave={(delta, motivo) => {
            adjustStock(selected.id, delta, motivo, user?.name ?? 'Sistema');
            setModal(null);
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog title="Eliminar producto" message={`¿Eliminar "${confirm.nombre}" del almacén de reserva?`}
          danger onConfirm={() => { deleteProducto(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

function ReservaModal({ producto, onClose, onSave, categorias }: {
  producto: Producto | null;
  onClose: () => void;
  onSave: (data: Omit<Producto, 'id'>) => void;
  categorias: string[];
}) {
  const [form, setForm] = useState({
    sku: producto?.sku ?? '', nombre: producto?.nombre ?? '',
    categoria: producto?.categoria ?? (categorias[0] ?? 'Motor'),
    marca: producto?.marca ?? '', modelos: producto?.modelos.join(', ') ?? '',
    precio_costo: String(producto?.precio_costo ?? 0), precio_venta: String(producto?.precio_venta ?? 0),
    stock: String(producto?.stock ?? 0), stock_minimo: String(producto?.stock_minimo ?? 2),
    almacen: producto?.ubicacion.almacen ?? 'R', estante: producto?.ubicacion.estante ?? '1', fila: producto?.ubicacion.fila ?? '1',
    activo: producto?.activo ?? true,
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      sku: form.sku, nombre: form.nombre, categoria: form.categoria, marca: form.marca,
      modelos: form.modelos.split(',').map((s) => s.trim()).filter(Boolean),
      precio_costo: Number(form.precio_costo), precio_venta: Number(form.precio_venta),
      stock: Number(form.stock), stock_minimo: Number(form.stock_minimo),
      ubicacion: { almacen: form.almacen, estante: form.estante, fila: form.fila },
      activo: form.activo, es_reserva: true,
    });
  }

  return (
    <Modal title={producto ? 'Editar producto de reserva' : 'Nuevo producto de reserva'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="field-label">SKU *</label>
            <input className="field-input" value={form.sku} onChange={(e) => set('sku', e.target.value)} required /></div>
          <div><label className="field-label">Marca *</label>
            <input className="field-input" value={form.marca} onChange={(e) => set('marca', e.target.value)} required /></div>
        </div>
        <div><label className="field-label">Nombre *</label>
          <input className="field-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="field-label">Categoría</label>
            <select className="field-select" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
              {categorias.map((c) => <option key={c}>{c}</option>)}
            </select></div>
          <div><label className="field-label">Modelos</label>
            <input className="field-input" placeholder="Toyota Hilux, Ford Ranger..." value={form.modelos} onChange={(e) => set('modelos', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="field-label">Precio costo (S/)</label>
            <input type="number" min="0" step="0.01" className="field-input" value={form.precio_costo} onChange={(e) => set('precio_costo', e.target.value)} /></div>
          <div><label className="field-label">Precio venta (S/)</label>
            <input type="number" min="0" step="0.01" className="field-input" value={form.precio_venta} onChange={(e) => set('precio_venta', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="field-label">Stock actual</label>
            <input type="number" min="0" className="field-input" value={form.stock} onChange={(e) => set('stock', e.target.value)} /></div>
          <div><label className="field-label">Stock mínimo</label>
            <input type="number" min="0" className="field-input" value={form.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} /></div>
        </div>
        <div>
          <label className="field-label">Ubicación (Almacén R)</label>
          <div className="grid grid-cols-3 gap-3">
            {['almacen', 'estante', 'fila'].map((k) => (
              <div key={k}>
                <label className="text-[11px] text-slate-400 mb-1 block capitalize">{k}</label>
                <input className="field-input" value={form[k as keyof typeof form] as string} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button type="submit" className="btn btn-primary flex-1">{producto ? 'Guardar cambios' : 'Crear producto'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AjusteReservaModal({ producto, onClose, onSave }: {
  producto: Producto; onClose: () => void; onSave: (delta: number, motivo: string) => void;
}) {
  const [tipo, setTipo] = useState<'ingreso' | 'egreso' | 'ajuste'>('ingreso');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const delta = tipo === 'ingreso' ? cantidad : tipo === 'egreso' ? -cantidad : cantidad - producto.stock;
  const nuevo = Math.max(0, producto.stock + delta);

  return (
    <Modal title="Ajuste de stock" onClose={onClose} size="sm">
      <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-sm font-semibold text-slate-800">{producto.nombre}</p>
        <p className="text-xs font-mono-data text-slate-400">{producto.sku}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-slate-500">Stock actual:</span>
          <span className="font-mono-data font-bold text-slate-800">{producto.stock}</span>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="field-label">Tipo de ajuste</label>
          <div className="grid grid-cols-3 gap-2">
            {(['ingreso', 'egreso', 'ajuste'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={clsx('btn btn-sm', tipo === t ? 'btn-primary' : 'btn-secondary')}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">{tipo === 'ajuste' ? 'Nuevo stock' : 'Cantidad'}</label>
          <input type="number" min="0" className="field-input" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label">Motivo *</label>
          <input className="field-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
        </div>
        <div className={clsx('p-3 rounded-lg text-sm flex justify-between',
          nuevo < producto.stock ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
          <span>Stock resultante:</span>
          <span className="font-mono-data font-bold text-lg">{nuevo}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button disabled={!motivo.trim()} onClick={() => onSave(delta, motivo)} className="btn btn-primary flex-1">Aplicar</button>
        </div>
      </div>
    </Modal>
  );
}
