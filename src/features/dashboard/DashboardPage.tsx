import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertTriangle, DollarSign, Clock, CheckCircle2, ShoppingCart, Timer } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { StatCard } from '@/components/ui';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const fmt = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function DashboardPage() {
  const ordenes  = useAppStore((s) => s.ordenes);
  const productos = useAppStore((s) => s.productos);

  const today = new Date().toDateString();

  const hoyOrdenes = ordenes.filter((o) => new Date(o.created_at).toDateString() === today && o.estado !== 'cancelado');
  const ventasHoy  = hoyOrdenes.reduce((acc, o) => acc + o.total, 0);
  const pendientes = ordenes.filter((o) => o.estado === 'pendiente').length;
  const stockBajo  = productos.filter((p) => p.activo && p.stock > 0 && p.stock <= p.stock_minimo).length;
  const sinStock   = productos.filter((p) => p.activo && p.stock === 0).length;
  const valorInv   = productos.reduce((acc, p) => acc + p.stock * p.precio_costo, 0);

  // Avg dispatch time (minutos)
  const avgDespacho = useMemo(() => {
    const delivered = ordenes.filter((o) => o.estado === 'entregado' && o.created_at && o.delivered_at);
    if (!delivered.length) return 0;
    const total = delivered.reduce((acc, o) => {
      return acc + (new Date(o.delivered_at!).getTime() - new Date(o.created_at).getTime()) / 60000;
    }, 0);
    return Math.round(total / delivered.length);
  }, [ordenes]);

  // Sales chart
  const chartData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const day  = date.toDateString();
    const dayOrds = ordenes.filter((o) => new Date(o.created_at).toDateString() === day && o.estado !== 'cancelado');
    return {
      fecha:  format(date, 'EEE', { locale: es }),
      ventas: dayOrds.reduce((acc, o) => acc + o.total, 0),
      ordenes: dayOrds.length,
    };
  }), [ordenes]);

  // Top products
  const topProducts = useMemo(() => {
    const counts: Record<string, { nombre: string; qty: number; total: number }> = {};
    ordenes.filter((o) => o.estado !== 'cancelado').forEach((o) =>
      o.items.forEach((item) => {
        if (!counts[item.sku]) counts[item.sku] = { nombre: item.nombre, qty: 0, total: 0 };
        counts[item.sku].qty   += item.cantidad;
        counts[item.sku].total += item.cantidad * item.precio_unitario;
      })
    );
    return Object.entries(counts).map(([sku, v]) => ({ sku, ...v })).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [ordenes]);

  const lowStockItems = productos.filter((p) => p.activo && p.stock <= p.stock_minimo).slice(0, 8);

  return (
    <div className="page-container">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Ventas hoy" value={fmt(ventasHoy)}
          sub={`${hoyOrdenes.length} órdenes`} icon={<DollarSign size={20} />} color="green" />
        <StatCard label="Pendientes" value={pendientes}
          sub="En cola de despacho" icon={<Clock size={20} />} color="amber" />
        <StatCard label="Tiempo prom. despacho" value={avgDespacho ? `${avgDespacho} min` : '—'}
          sub="Creación → entrega" icon={<Timer size={20} />} color={avgDespacho > 10 ? 'red' : 'blue'} />
        <StatCard label="Valor inventario" value={fmt(valorInv)}
          sub={`${stockBajo + sinStock} alertas de stock`} icon={<Package size={20} />} color="purple" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="card-title">Ventas — últimos 7 días</h2>
              <p className="text-xs text-slate-400">Total de ventas confirmadas</p>
            </div>
            <TrendingUp size={18} className="text-blue-500" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="fecha" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v: number) => [fmt(v), 'Ventas']}
              />
              <Area type="monotone" dataKey="ventas" stroke="#2563EB" strokeWidth={2} fill="url(#grad)"
                dot={{ fill: '#2563EB', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title">Más vendidos</h2>
            <ShoppingCart size={16} className="text-slate-400" />
          </div>
          {topProducts.length === 0
            ? <p className="text-sm text-slate-400 text-center py-6">Sin ventas aún</p>
            : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={p.sku} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.nombre}</p>
                      <p className="text-[11px] font-mono-data text-slate-400">{p.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-blue-600">{p.qty} uds</p>
                      <p className="text-[11px] text-slate-400">{fmt(p.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Recent orders */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Órdenes recientes</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {ordenes.slice(0, 6).map((o) => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data text-xs font-semibold text-blue-600">{o.numero}</span>
                    <OrderBadge estado={o.estado} />
                  </div>
                  <p className="text-sm text-slate-700 truncate mt-0.5">{o.cliente_nombre}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-800">{fmt(o.total)}</p>
                  <p className="text-[11px] text-slate-400 font-mono-data">
                    {new Date(o.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock alerts */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Alertas de stock</h2>
            {lowStockItems.length > 0 && (
              <span className="badge-red">{lowStockItems.length} alertas</span>
            )}
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto scrollbar-none">
            {lowStockItems.length === 0
              ? (
                <div className="flex items-center gap-3 px-5 py-8 text-emerald-600">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">Stock en niveles óptimos</span>
                </div>
              ) : lowStockItems.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={clsx(
                    'w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0',
                    p.stock === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                  )}>
                    {p.stock}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.nombre}</p>
                    <p className="text-[11px] font-mono-data text-slate-400">{p.sku} · mín: {p.stock_minimo}</p>
                  </div>
                  <span className={p.stock === 0 ? 'badge-red' : 'badge-yellow'}>
                    {p.stock === 0 ? 'Sin stock' : 'Bajo'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderBadge({ estado }: { estado: string }) {
  const m: Record<string, string> = {
    pendiente:       'badge-yellow',
    en_preparacion:  'badge-blue',
    entregado:       'badge-green',
    cancelado:       'badge-red',
  };
  const l: Record<string, string> = {
    pendiente: 'Pendiente', en_preparacion: 'Preparando', entregado: 'Entregado', cancelado: 'Cancelado',
  };
  return <span className={m[estado] ?? 'badge-slate'}>{l[estado] ?? estado}</span>;
}
