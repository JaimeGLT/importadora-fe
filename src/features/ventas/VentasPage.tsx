import { useState, useMemo } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Search, Receipt, User, CreditCard, Banknote, QrCode, FileText, Clock, CheckCircle2, Package, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { Modal, EmptyState, DataTable } from '@/components/ui';
import type { Orden, FormaPago, TipoDocumento, Producto } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const fmt = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type CartItem = { prod: Producto; cantidad: number; precio_unitario: number };

export function VentasPage() {
  const { productos, clientes, ordenes, createOrden } = useAppStore();
  const { user } = useAuthStore();

  const [tab, setTab] = useState<'nueva' | 'historial'>('nueva');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState('c0');
  const [formaPago, setFormaPago] = useState<FormaPago>('efectivo');
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>('venta');
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState<Orden | null>(null);
  const [histSearch, setHistSearch] = useState('');

  const clientesActivos = clientes.filter((c) => c.activo);
  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

  const prodsFiltrados = useMemo(() => {
    const q = search.toLowerCase();
    return productos.filter((p) => p.activo && !p.es_reserva && (
      !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.marca.toLowerCase().includes(q)
    )).slice(0, 20);
  }, [productos, search]);

  const subtotal = cart.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0);
  const total = subtotal;

  const creditoDisponible = clienteSeleccionado?.tipo === 'credito'
    ? clienteSeleccionado.limite_credito - clienteSeleccionado.saldo_credito
    : 0;

  function addToCart(p: Producto) {
    setCart((prev) => {
      const existing = prev.find((i) => i.prod.id === p.id);
      if (existing) {
        if (existing.cantidad >= p.stock) return prev;
        return prev.map((i) => i.prod.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      if (p.stock === 0) return prev;
      return [...prev, { prod: p, cantidad: 1, precio_unitario: p.precio_venta }];
    });
  }

  function updateQty(prodId: string, qty: number) {
    if (qty <= 0) { setCart((c) => c.filter((i) => i.prod.id !== prodId)); return; }
    setCart((c) => c.map((i) => i.prod.id === prodId ? { ...i, cantidad: Math.min(qty, i.prod.stock) } : i));
  }

  function updatePrice(prodId: string, price: number) {
    setCart((c) => c.map((i) => i.prod.id === prodId ? { ...i, precio_unitario: Math.max(0, price) } : i));
  }

  function handleConfirm() {
    if (cart.length === 0) return;
    if (formaPago === 'credito' && clienteSeleccionado?.tipo !== 'credito') return;
    if (formaPago === 'credito' && total > creditoDisponible) return;

    const orden = createOrden({
      tipo: tipoDoc,
      cliente_id: clienteId,
      cliente_nombre: clienteSeleccionado?.nombre ?? 'Mostrador',
      vendedor: user?.name ?? 'Vendedor',
      items: cart.map((i) => ({
        producto_id: i.prod.id,
        sku: i.prod.sku,
        nombre: i.prod.nombre,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        ubicacion: i.prod.ubicacion,
      })),
      subtotal,
      total,
      forma_pago: formaPago,
      estado: 'pendiente',
    });
    setCart([]);
    setConfirmModal(false);
    setSuccessModal(orden);
  }

  const historialFiltrado = useMemo(() => {
    const q = histSearch.toLowerCase();
    return ordenes.filter((o) =>
      !q || o.numero.toLowerCase().includes(q) || o.cliente_nombre.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [ordenes, histSearch]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Crear órdenes de venta y cotizaciones</p>
        </div>
        <div className="flex gap-2">
          {(['nueva', 'historial'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('btn btn-sm', tab === t ? 'btn-primary' : 'btn-secondary')}>
              {t === 'nueva' ? <><Plus size={14} /> Nueva venta</> : <><Receipt size={14} /> Historial</>}
            </button>
          ))}
        </div>
      </div>

      {tab === 'nueva' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Products panel */}
          <div className="xl:col-span-2 space-y-4">
            <div className="card p-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Buscar producto por nombre, SKU o marca..."
                  value={search} onChange={(e) => setSearch(e.target.value)} className="field-input pl-9" />
              </div>
            </div>
            <div className="card">
              {prodsFiltrados.length === 0 ? (
                <EmptyState icon={<Package size={24} />} title="Sin productos" description="No hay resultados para tu búsqueda." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {prodsFiltrados.map((p) => {
                    const inCart = cart.find((i) => i.prod.id === p.id);
                    return (
                      <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{p.nombre}</p>
                          <p className="text-[11px] font-mono-data text-slate-400">{p.sku} · {p.marca}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-800">{fmt(p.precio_venta)}</p>
                          <p className={clsx('text-[11px] font-mono-data',
                            p.stock === 0 ? 'text-red-500' : p.stock <= p.stock_minimo ? 'text-amber-500' : 'text-slate-400')}>
                            {p.stock} en stock
                          </p>
                        </div>
                        <button onClick={() => addToCart(p)} disabled={p.stock === 0 || (inCart?.cantidad ?? 0) >= p.stock}
                          className={clsx('btn btn-sm shrink-0', inCart ? 'btn-primary' : 'btn-secondary')}>
                          {inCart ? <><CheckCircle2 size={13} /> {inCart.cantidad}</> : <><Plus size={13} /> Agregar</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart panel */}
          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <User size={15} className="text-slate-400" /> Cliente
              </h3>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="field-select w-full">
                {clientesActivos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.tipo === 'credito' ? ' [crédito]' : ''}</option>
                ))}
              </select>
              {clienteSeleccionado?.tipo === 'credito' && (
                <div className="mt-2 p-2 rounded-lg bg-blue-50 text-xs text-blue-700 flex justify-between">
                  <span>Crédito disponible:</span>
                  <span className="font-mono-data font-semibold">{fmt(creditoDisponible)}</span>
                </div>
              )}
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <ShoppingCart size={15} className="text-slate-400" /> Carrito
                {cart.length > 0 && <span className="ml-auto badge-blue">{cart.length}</span>}
              </h3>
              {cart.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Agrega productos para comenzar</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.prod.id} className="p-2 rounded-lg border border-slate-100 bg-slate-50">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-slate-800 flex-1 leading-tight">{item.prod.nombre}</p>
                        <button onClick={() => updateQty(item.prod.id, 0)} className="text-slate-300 hover:text-red-500 shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.prod.id, item.cantidad - 1)} className="btn-icon btn-ghost w-6 h-6 text-slate-500">
                            <Minus size={11} />
                          </button>
                          <span className="font-mono-data text-sm w-6 text-center">{item.cantidad}</span>
                          <button onClick={() => updateQty(item.prod.id, item.cantidad + 1)} disabled={item.cantidad >= item.prod.stock}
                            className="btn-icon btn-ghost w-6 h-6 text-slate-500">
                            <Plus size={11} />
                          </button>
                        </div>
                        <span className="text-slate-300 text-xs">×</span>
                        <input type="number" min="0" step="0.01" value={item.precio_unitario}
                          onChange={(e) => updatePrice(item.prod.id, Number(e.target.value))}
                          className="field-input py-1 text-xs w-20 font-mono-data" />
                        <span className="ml-auto text-xs font-bold text-slate-800 font-mono-data shrink-0">
                          {fmt(item.precio_unitario * item.cantidad)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4 space-y-3">
              <div>
                <label className="field-label">Tipo de documento</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['venta', 'Venta'], ['cotizacion', 'Cotización']] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setTipoDoc(v)}
                      className={clsx('btn btn-sm', tipoDoc === v ? 'btn-primary' : 'btn-secondary')}>
                      {v === 'venta' ? <ShoppingCart size={13} /> : <FileText size={13} />} {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label">Forma de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['efectivo', 'Efectivo', Banknote],
                    ['qr', 'QR', QrCode],
                    ['transferencia', 'Transfer.', CreditCard],
                    ['credito', 'Crédito', Clock],
                  ] as const).map(([v, l, Icon]) => (
                    <button key={v} type="button" onClick={() => setFormaPago(v)}
                      disabled={v === 'credito' && clienteSeleccionado?.tipo !== 'credito'}
                      className={clsx('btn btn-sm', formaPago === v ? 'btn-primary' : 'btn-secondary',
                        v === 'credito' && clienteSeleccionado?.tipo !== 'credito' && 'opacity-40 cursor-not-allowed')}>
                      <Icon size={13} /> {l}
                    </button>
                  ))}
                </div>
                {formaPago === 'credito' && total > creditoDisponible && (
                  <p className="text-xs text-red-500 mt-1">Crédito insuficiente (disponible: {fmt(creditoDisponible)})</p>
                )}
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-mono-data">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span className="text-slate-800">Total</span>
                  <span className="font-mono-data text-blue-600">{fmt(total)}</span>
                </div>
              </div>
              <button onClick={() => setConfirmModal(true)}
                disabled={cart.length === 0 || (formaPago === 'credito' && total > creditoDisponible)}
                className="btn btn-primary w-full btn-lg">
                {tipoDoc === 'cotizacion' ? <><FileText size={16} /> Guardar cotización</> : <><ShoppingCart size={16} /> Confirmar venta</>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Historial */
        <div className="space-y-4">
          <div className="card p-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar por número o cliente..."
                value={histSearch} onChange={(e) => setHistSearch(e.target.value)} className="field-input pl-9" />
            </div>
          </div>
          <div className="card">
            <DataTable columns={[
              { label: 'Número' }, { label: 'Cliente' }, { label: 'Vendedor' },
              { label: 'Pago' }, { label: 'Estado' },
              { label: 'Total', align: 'right' }, { label: 'Fecha', align: 'right' },
            ]}
              empty={historialFiltrado.length === 0 ? (
                <EmptyState icon={<Receipt size={24} />} title="Sin órdenes" description="No hay órdenes que coincidan." />
              ) : undefined}
            >
              {historialFiltrado.map((o) => (
                <tr key={o.id} className="table-tr">
                  <td className="table-td"><span className="font-mono-data text-xs font-semibold text-blue-600">{o.numero}</span></td>
                  <td className="table-td text-sm text-slate-700">{o.cliente_nombre}</td>
                  <td className="table-td text-sm text-slate-500">{o.vendedor}</td>
                  <td className="table-td"><PagoBadge fp={o.forma_pago} /></td>
                  <td className="table-td"><EstadoBadge estado={o.estado} /></td>
                  <td className="table-td text-right font-mono-data font-semibold text-slate-800">{fmt(o.total)}</td>
                  <td className="table-td text-right text-xs text-slate-400 font-mono-data">
                    {format(new Date(o.created_at), 'dd MMM HH:mm', { locale: es })}
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        </div>
      )}

      {confirmModal && (
        <Modal title="Confirmar venta" onClose={() => setConfirmModal(false)} size="sm">
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cliente</span>
                <span className="font-medium">{clienteSeleccionado?.nombre}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Productos</span>
                <span className="font-medium">{cart.reduce((acc, i) => acc + i.cantidad, 0)} unidades</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pago</span>
                <span className="font-medium capitalize">{formaPago}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2">
                <span>Total</span>
                <span className="text-blue-600 font-mono-data">{fmt(total)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(false)} className="btn btn-secondary flex-1">Cancelar</button>
              <button onClick={handleConfirm} className="btn btn-primary flex-1">Confirmar</button>
            </div>
          </div>
        </Modal>
      )}

      {successModal && (
        <Modal title="¡Venta registrada!" onClose={() => setSuccessModal(null)} size="sm">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono-data text-blue-600">{successModal.numero}</p>
              <p className="text-sm text-slate-500 mt-1">Orden creada correctamente</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-bold font-mono-data">{fmt(successModal.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pago</span>
                <span className="capitalize">{successModal.forma_pago}</span>
              </div>
            </div>
            <button onClick={() => setSuccessModal(null)} className="btn btn-primary w-full">Aceptar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PagoBadge({ fp }: { fp: FormaPago }) {
  const m: Record<FormaPago, string> = { efectivo: 'badge-green', qr: 'badge-blue', transferencia: 'badge-purple', credito: 'badge-yellow' };
  const l: Record<FormaPago, string> = { efectivo: 'Efectivo', qr: 'QR', transferencia: 'Transferencia', credito: 'Crédito' };
  return <span className={m[fp]}>{l[fp]}</span>;
}

function EstadoBadge({ estado }: { estado: string }) {
  const m: Record<string, string> = { pendiente: 'badge-yellow', en_preparacion: 'badge-blue', entregado: 'badge-green', cancelado: 'badge-red' };
  const l: Record<string, string> = { pendiente: 'Pendiente', en_preparacion: 'Preparando', entregado: 'Entregado', cancelado: 'Cancelado' };
  return <span className={m[estado] ?? 'badge-slate'}>{l[estado] ?? estado}</span>;
}
