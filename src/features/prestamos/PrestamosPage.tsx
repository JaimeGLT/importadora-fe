import { useState, useMemo } from 'react';
import { Plus, Search, HandCoins, CheckCircle2, Clock, ChevronDown, ChevronUp, X, Minus } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Modal, EmptyState } from '@/components/ui';
import type { Prestamo } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const fmt = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PrestamosPage() {
  const { prestamos, productos, addPrestamo, updatePrestamo } = useAppStore();
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'pagado' | 'parcial'>('todos');
  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return prestamos.filter((p) => {
      if (filtro !== 'todos' && p.estado !== filtro) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.persona.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q);
      }
      return true;
    });
  }, [prestamos, search, filtro]);

  const stats = {
    activos: prestamos.filter((p) => p.estado === 'activo').length,
    pagados: prestamos.filter((p) => p.estado === 'pagado').length,
    valorActivo: prestamos.filter((p) => p.estado === 'activo').reduce((acc, p) => acc + p.total, 0),
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Préstamos internos</h1>
          <p className="page-subtitle">Control de productos prestados a colaboradores</p>
        </div>
        <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
          <Plus size={15} /> Nuevo préstamo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Activos', value: stats.activos, bg: 'bg-amber-50', text: 'text-amber-700' },
          { label: 'Pagados', value: stats.pagados, bg: 'bg-emerald-50', text: 'text-emerald-700' },
          { label: 'Valor en préstamo', value: fmt(stats.valorActivo), bg: 'bg-blue-50', text: 'text-blue-700' },
        ].map((s) => (
          <div key={s.label} className={clsx('card p-4 border-0', s.bg)}>
            <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
            <p className={clsx('text-2xl font-bold', s.text)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por persona o número..."
              value={search} onChange={(e) => setSearch(e.target.value)} className="field-input pl-9" />
          </div>
          <div className="flex gap-2">
            {(['todos', 'activo', 'parcial', 'pagado'] as const).map((f) => (
              <button key={f} onClick={() => setFiltro(f)}
                className={clsx('btn btn-sm', filtro === f ? 'btn-primary' : 'btn-secondary')}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12">
            <EmptyState icon={<HandCoins size={24} />} title="Sin préstamos" description="No hay préstamos que coincidan." />
          </div>
        ) : filtered.map((p) => {
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  p.estado === 'activo' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}>
                  {p.estado === 'activo' ? <Clock size={18} /> : <CheckCircle2 size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data text-xs font-bold text-blue-600">{p.numero}</span>
                    <span className={p.estado === 'activo' ? 'badge-yellow' : 'badge-green'}>
                      {p.estado === 'activo' ? 'Activo' : 'Devuelto'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{p.persona}</p>
                  <p className="text-xs text-slate-400">{p.relacion} · {p.items.length} producto(s) · {format(new Date(p.created_at), 'dd MMM yyyy', { locale: es })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono-data font-semibold text-slate-800">{fmt(p.total)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.estado === 'activo' && (
                    <button onClick={() => updatePrestamo(p.id, { estado: 'pagado' })}
                      className="btn btn-sm btn-secondary text-emerald-600">
                      <CheckCircle2 size={13} /> Devuelto
                    </button>
                  )}
                  <button onClick={() => setExpanded(isOpen ? null : p.id)} className="btn-icon btn-ghost text-slate-400">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  {p.notas && <p className="text-xs text-slate-500 mb-3 italic">"{p.notas}"</p>}
                  <div className="space-y-2">
                    {p.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">{item.cantidad}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.nombre}</p>
                          <p className="text-[11px] font-mono-data text-slate-400">{item.sku}</p>
                        </div>
                        <span className="font-mono-data text-sm text-slate-600 shrink-0">{fmt(item.cantidad * item.precio_unitario)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <NuevoPrestamoModal productos={productos} onClose={() => setModal(false)}
          onSave={(data) => { addPrestamo(data); setModal(false); }} />
      )}
    </div>
  );
}

type CartItem = { prod: ReturnType<typeof useAppStore.getState>['productos'][0]; cantidad: number };

function NuevoPrestamoModal({ productos, onClose, onSave }: {
  productos: ReturnType<typeof useAppStore.getState>['productos'];
  onClose: () => void;
  onSave: (data: Omit<import('@/types').Prestamo, 'id' | 'numero' | 'created_at' | 'total'>) => void;
}) {
  const [persona, setPersona] = useState('');
  const [relacion, setRelacion] = useState('Colaborador');
  const [notas, setNotas] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const prods = useMemo(() => {
    const q = search.toLowerCase();
    return productos.filter((p) => p.activo && p.stock > 0 && (
      !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    )).slice(0, 10);
  }, [productos, search]);

  function addItem(p: typeof productos[0]) {
    setCart((prev) => {
      const ex = prev.find((i) => i.prod.id === p.id);
      if (ex) return ex.cantidad >= p.stock ? prev : prev.map((i) => i.prod.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { prod: p, cantidad: 1 }];
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!persona.trim() || cart.length === 0) return;
    onSave({
      persona, relacion, notas: notas || undefined,
      items: cart.map((i) => ({
        producto_id: i.prod.id,
        sku: i.prod.sku,
        nombre: i.prod.nombre,
        cantidad: i.cantidad,
        precio_unitario: i.prod.precio_venta,
      })),
      estado: 'activo', pagado: 0,
    });
  }

  const total = cart.reduce((acc, i) => acc + i.prod.precio_venta * i.cantidad, 0);

  return (
    <Modal title="Nuevo préstamo" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="field-label">Persona *</label>
            <input className="field-input" placeholder="Nombre completo" value={persona} onChange={(e) => setPersona(e.target.value)} required /></div>
          <div><label className="field-label">Relación</label>
            <select className="field-select" value={relacion} onChange={(e) => setRelacion(e.target.value)}>
              {['Colaborador', 'Familiar', 'Proveedor', 'Otro'].map((r) => <option key={r}>{r}</option>)}
            </select></div>
        </div>
        <div>
          <label className="field-label">Buscar productos</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="field-input pl-9" placeholder="Nombre o SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {search && (
            <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
              {prods.map((p) => (
                <button key={p.id} type="button" onClick={() => addItem(p)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-left">
                  <span className="font-mono-data text-xs text-slate-400">{p.sku}</span>
                  <span className="text-sm text-slate-700 flex-1 truncate">{p.nombre}</span>
                  <span className="text-xs text-slate-400">{p.stock} en stock</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Productos prestados</p>
            {cart.map((item) => (
              <div key={item.prod.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex-1 text-sm text-slate-800 truncate">{item.prod.nombre}</div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setCart((c) => c.map((i) => i.prod.id === item.prod.id ? { ...i, cantidad: Math.max(1, i.cantidad - 1) } : i))}
                    className="btn-icon btn-ghost w-6 h-6"><Minus size={11} /></button>
                  <span className="font-mono-data text-sm w-6 text-center">{item.cantidad}</span>
                  <button type="button" onClick={() => setCart((c) => c.map((i) => i.prod.id === item.prod.id && i.cantidad < i.prod.stock ? { ...i, cantidad: i.cantidad + 1 } : i))}
                    className="btn-icon btn-ghost w-6 h-6"><Plus size={11} /></button>
                </div>
                <button type="button" onClick={() => setCart((c) => c.filter((i) => i.prod.id !== item.prod.id))} className="text-red-400 hover:text-red-600"><X size={14} /></button>
              </div>
            ))}
            <div className="flex justify-between font-bold text-sm pt-1">
              <span className="text-slate-700">Total estimado</span>
              <span className="font-mono-data text-blue-600">{fmt(total)}</span>
            </div>
          </div>
        )}
        <div><label className="field-label">Notas</label>
          <textarea className="field-textarea" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={!persona.trim() || cart.length === 0} className="btn btn-primary flex-1">Registrar préstamo</button>
        </div>
      </form>
    </Modal>
  );
}
