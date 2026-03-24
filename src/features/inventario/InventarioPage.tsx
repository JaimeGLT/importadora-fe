import { useState, useMemo } from 'react';
import { Package, Plus, Search, BarChart2, Upload, ChevronDown, Edit2, Trash2, AlertTriangle, TrendingDown } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { Modal, EmptyState, DataTable, LocationTag, StockBadge, ConfirmDialog } from '@/components/ui';
import type { Producto } from '@/types';
import clsx from 'clsx';

export function InventarioPage() {
  const { productos, addProducto, updateProducto, deleteProducto, adjustStock, config } = useAppStore();
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [filtroStock, setFiltroStock] = useState<'todos' | 'bajo' | 'sinstock'>('todos');
  const [modal, setModal] = useState<'nuevo' | 'editar' | 'ajuste' | 'importar' | null>(null);
  const [selected, setSelected] = useState<Producto | null>(null);
  const [confirm, setConfirm] = useState<Producto | null>(null);

  const categorias = ['Todas', ...config.categorias];

  const filtered = useMemo(() => {
    return productos.filter((p) => {
      if (!p.activo) return false;
      if (categoria !== 'Todas' && p.categoria !== categoria) return false;
      if (filtroStock === 'bajo' && !(p.stock > 0 && p.stock <= p.stock_minimo)) return false;
      if (filtroStock === 'sinstock' && p.stock !== 0) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.marca.toLowerCase().includes(q);
      }
      return true;
    });
  }, [productos, search, categoria, filtroStock]);

  const stats = useMemo(() => ({
    total: productos.filter((p) => p.activo).length,
    bajo: productos.filter((p) => p.activo && p.stock > 0 && p.stock <= p.stock_minimo).length,
    sinStock: productos.filter((p) => p.activo && p.stock === 0).length,
    valorTotal: productos.filter((p) => p.activo).reduce((acc, p) => acc + p.stock * p.precio_costo, 0),
  }), [productos]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">Gestión de productos y control de stock</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal('importar')} className="btn btn-secondary btn-sm">
            <Upload size={15} /> Importar
          </button>
          {(user?.role === 'administrador' || user?.role === 'almacenero') && (
            <button onClick={() => { setSelected(null); setModal('nuevo'); }} className="btn btn-primary btn-sm">
              <Plus size={15} /> Nuevo producto
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Total productos', value: stats.total, bg: 'bg-blue-50', text: 'text-blue-700', sub: 'activos' },
          { label: 'Stock bajo', value: stats.bajo, bg: 'bg-amber-50', text: 'text-amber-700', sub: 'requieren reposición' },
          { label: 'Sin stock', value: stats.sinStock, bg: 'bg-red-50', text: 'text-red-700', sub: 'agotados' },
          { label: 'Valor inventario', value: `S/ ${stats.valorTotal.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`, bg: 'bg-purple-50', text: 'text-purple-700', sub: 'costo total' },
        ].map((s) => (
          <div key={s.label} className={clsx('card p-4 border-0', s.bg)}>
            <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
            <p className={clsx('text-2xl font-bold', s.text)}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por nombre, SKU o marca..."
              value={search} onChange={(e) => setSearch(e.target.value)} className="field-input pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="field-select pr-8 appearance-none">
                {categorias.map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {(['todos', 'bajo', 'sinstock'] as const).map((f) => (
              <button key={f} onClick={() => setFiltroStock(f)}
                className={clsx('btn btn-sm', filtroStock === f ? 'btn-primary' : 'btn-secondary')}>
                {f === 'todos' ? 'Todos' : f === 'bajo'
                  ? <><AlertTriangle size={13} /> Bajo</>
                  : <><TrendingDown size={13} /> Sin stock</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={[
            { label: 'Producto' }, { label: 'Categoría' }, { label: 'Ubicación' },
            { label: 'Stock', align: 'center' },
            { label: 'Precio venta', align: 'right' }, { label: 'Precio costo', align: 'right' },
            { label: '', align: 'right' },
          ]}
          empty={filtered.length === 0 ? (
            <EmptyState icon={<Package size={24} />} title="Sin productos" description="No hay productos que coincidan con los filtros." />
          ) : undefined}
        >
          {filtered.map((p) => (
            <tr key={p.id} className="table-tr">
              <td className="table-td">
                <p className="font-medium text-slate-800 text-sm">{p.nombre}</p>
                <p className="text-[11px] font-mono-data text-slate-400">{p.sku} · {p.marca}</p>
                {p.modelos.length > 0 && (
                  <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{p.modelos.join(', ')}</p>
                )}
              </td>
              <td className="table-td"><span className="badge-slate">{p.categoria}</span></td>
              <td className="table-td">
                <LocationTag almacen={p.ubicacion.almacen} estante={p.ubicacion.estante} fila={p.ubicacion.fila} />
              </td>
              <td className="table-td text-center"><StockBadge stock={p.stock} min={p.stock_minimo} /></td>
              <td className="table-td text-right font-mono-data font-semibold text-slate-800">
                S/ {p.precio_venta.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </td>
              <td className="table-td text-right font-mono-data text-slate-500">
                S/ {p.precio_costo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </td>
              <td className="table-td text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => { setSelected(p); setModal('ajuste'); }}
                    className="btn-icon btn-ghost text-slate-400 hover:text-blue-600" title="Ajustar stock">
                    <BarChart2 size={15} />
                  </button>
                  {(user?.role === 'administrador' || user?.role === 'almacenero') && (
                    <button onClick={() => { setSelected(p); setModal('editar'); }}
                      className="btn-icon btn-ghost text-slate-400 hover:text-blue-600" title="Editar">
                      <Edit2 size={15} />
                    </button>
                  )}
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
        <ProductoModal
          producto={modal === 'editar' ? selected : null}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal === 'editar' && selected) updateProducto(selected.id, data);
            else addProducto(data);
            setModal(null);
          }}
        />
      )}
      {modal === 'ajuste' && selected && (
        <AjusteModal producto={selected} onClose={() => setModal(null)}
          onSave={(delta, motivo) => { adjustStock(selected.id, delta, motivo, user?.name ?? 'Sistema'); setModal(null); }} />
      )}
      {modal === 'importar' && <ImportarModal onClose={() => setModal(null)} />}
      {confirm && (
        <ConfirmDialog title="Eliminar producto" message={`¿Eliminar "${confirm.nombre}"? Esta acción no se puede deshacer.`}
          danger onConfirm={() => { deleteProducto(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

function ProductoModal({ producto, onClose, onSave }: {
  producto: Producto | null;
  onClose: () => void;
  onSave: (data: Omit<Producto, 'id'>) => void;
}) {
  const cfg = useAppStore((s) => s.config);
  const [form, setForm] = useState({
    sku: producto?.sku ?? '',
    nombre: producto?.nombre ?? '',
    categoria: producto?.categoria ?? (cfg.categorias[0] ?? 'Motor'),
    marca: producto?.marca ?? '',
    modelos: producto?.modelos.join(', ') ?? '',
    precio_costo: String(producto?.precio_costo ?? 0),
    precio_venta: String(producto?.precio_venta ?? 0),
    stock: String(producto?.stock ?? 0),
    stock_minimo: String(producto?.stock_minimo ?? cfg.stock_minimo_default),
    almacen: producto?.ubicacion.almacen ?? 'A',
    estante: producto?.ubicacion.estante ?? '1',
    fila: producto?.ubicacion.fila ?? '1',
    activo: producto?.activo ?? true,
    es_reserva: producto?.es_reserva ?? false,
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const margin = Number(form.precio_costo) > 0
    ? (((Number(form.precio_venta) - Number(form.precio_costo)) / Number(form.precio_costo)) * 100).toFixed(1) + '%'
    : '—';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      sku: form.sku, nombre: form.nombre, categoria: form.categoria, marca: form.marca,
      modelos: form.modelos.split(',').map((s) => s.trim()).filter(Boolean),
      precio_costo: Number(form.precio_costo), precio_venta: Number(form.precio_venta),
      stock: Number(form.stock), stock_minimo: Number(form.stock_minimo),
      ubicacion: { almacen: form.almacen, estante: form.estante, fila: form.fila },
      activo: form.activo, es_reserva: form.es_reserva,
    });
  }

  return (
    <Modal title={producto ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="field-label">SKU *</label>
            <input className="field-input" value={form.sku} onChange={(e) => set('sku', e.target.value)} required /></div>
          <div><label className="field-label">Marca *</label>
            <input className="field-input" value={form.marca} onChange={(e) => set('marca', e.target.value)} required /></div>
        </div>
        <div><label className="field-label">Nombre del producto *</label>
          <input className="field-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="field-label">Categoría</label>
            <select className="field-select" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
              {cfg.categorias.map((c) => <option key={c}>{c}</option>)}
            </select></div>
          <div><label className="field-label">Modelos compatibles</label>
            <input className="field-input" placeholder="Toyota Hilux, Ford Ranger..." value={form.modelos} onChange={(e) => set('modelos', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="field-label">Precio costo (S/)</label>
            <input type="number" min="0" step="0.01" className="field-input" value={form.precio_costo} onChange={(e) => set('precio_costo', e.target.value)} /></div>
          <div><label className="field-label">Precio venta (S/)</label>
            <input type="number" min="0" step="0.01" className="field-input" value={form.precio_venta} onChange={(e) => set('precio_venta', e.target.value)} /></div>
          <div><label className="field-label">Margen estimado</label>
            <div className="field-input bg-slate-50 text-slate-600 text-sm">{margin}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="field-label">Stock actual</label>
            <input type="number" min="0" className="field-input" value={form.stock} onChange={(e) => set('stock', e.target.value)} /></div>
          <div><label className="field-label">Stock mínimo</label>
            <input type="number" min="0" className="field-input" value={form.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} /></div>
        </div>
        <div>
          <label className="field-label">Ubicación</label>
          <div className="grid grid-cols-3 gap-3">
            {['almacen', 'estante', 'fila'].map((k) => (
              <div key={k}>
                <label className="text-[11px] text-slate-400 mb-1 block capitalize">{k}</label>
                <input className="field-input" value={form[k as keyof typeof form] as string}
                  onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {['es_reserva', 'activo'].map((k) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form[k as keyof typeof form] as boolean}
                onChange={(e) => set(k, e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
              <span className="text-sm text-slate-700">{k === 'es_reserva' ? 'Producto de reserva' : 'Activo'}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button type="submit" className="btn btn-primary flex-1">{producto ? 'Guardar cambios' : 'Crear producto'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AjusteModal({ producto, onClose, onSave }: {
  producto: Producto;
  onClose: () => void;
  onSave: (delta: number, motivo: string) => void;
}) {
  const [tipo, setTipo] = useState<'ingreso' | 'egreso' | 'ajuste'>('ingreso');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');

  const delta = tipo === 'ingreso' ? cantidad : tipo === 'egreso' ? -cantidad : cantidad - producto.stock;
  const nuevo = Math.max(0, producto.stock + delta);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) return;
    onSave(delta, motivo);
  }

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
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <input type="number" min="0" className="field-input" value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))} required />
        </div>
        <div>
          <label className="field-label">Motivo *</label>
          <input className="field-input" placeholder="Ej: Compra de mercadería, daño, inventario..."
            value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
        </div>
        <div className={clsx('p-3 rounded-lg text-sm flex items-center justify-between',
          nuevo < producto.stock ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
          <span>Stock resultante:</span>
          <span className="font-mono-data font-bold text-lg">{nuevo}</span>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={!motivo.trim()} className="btn btn-primary flex-1">Aplicar ajuste</button>
        </div>
      </form>
    </Modal>
  );
}

function ImportarModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  return (
    <Modal title="Importar productos" onClose={onClose} size="md">
      {step === 'upload' ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Importa productos masivamente desde un archivo Excel o CSV.</p>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
            onClick={() => setStep('preview')}>
            <Upload size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">Arrastra tu archivo aquí</p>
            <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionar · .xlsx, .csv</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-1">Columnas requeridas:</p>
            <p className="text-xs font-mono-data text-blue-600">SKU, Nombre, Categoría, Marca, Precio Costo, Precio Venta, Stock, Stock Mínimo, Almacén, Estante, Fila</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
            <button className="btn btn-ghost flex-1 text-blue-600" onClick={() => {}}>Descargar plantilla</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
            ✓ Archivo cargado · 12 productos detectados · 0 errores
          </div>
          <div className="text-xs text-slate-500 text-center py-8 border border-dashed border-slate-200 rounded-xl">
            Vista previa de datos (demo)
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('upload')} className="btn btn-secondary flex-1">Volver</button>
            <button onClick={onClose} className="btn btn-primary flex-1">Importar productos</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
