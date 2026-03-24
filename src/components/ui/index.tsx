import { X } from 'lucide-react';
import clsx from 'clsx';

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({
  title, children, onClose, size = 'md',
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const maxW = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative w-full bg-white rounded-2xl shadow-card-lg animate-scale-in max-h-[90vh] overflow-y-auto', maxW)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="btn-icon btn-ghost text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon, title, description, action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        {icon}
      </div>
      <p className="text-base font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, icon, color = 'blue',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';
}) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',  value: 'text-blue-700' },
    green:  { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-700' },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600', value: 'text-amber-700' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',    value: 'text-red-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', value: 'text-purple-700' },
    slate:  { bg: 'bg-slate-50',  icon: 'bg-slate-100 text-slate-600', value: 'text-slate-700' },
  };
  const c = colors[color];
  return (
    <div className={clsx('card p-5', c.bg, 'border-0')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="stat-label">{label}</p>
          <p className={clsx('stat-value', c.value)}>{value}</p>
          {sub && <p className="stat-sub">{sub}</p>}
        </div>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', c.icon)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Table wrapper ────────────────────────────────────────────────────────────
export function DataTable({
  columns, children, empty,
}: {
  columns: { label: string; align?: 'left' | 'right' | 'center' }[];
  children: React.ReactNode;
  empty?: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col, i) => (
              <th key={i} className={clsx('table-th', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
      {empty}
    </div>
  );
}

// ─── Location badge ───────────────────────────────────────────────────────────
export function LocationTag({ almacen, estante, fila }: { almacen: string; estante: string; fila: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono-data text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
      {almacen}·E{estante}·F{fila}
    </span>
  );
}

// ─── Stock badge ──────────────────────────────────────────────────────────────
export function StockBadge({ stock, min }: { stock: number; min: number }) {
  if (stock === 0)
    return <span className="badge-red">Sin stock</span>;
  if (stock <= min)
    return <span className="badge-yellow">{stock} (bajo)</span>;
  return <span className="font-mono-data text-sm text-slate-700">{stock}</span>;
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
export function ConfirmDialog({
  title, message, onConfirm, onCancel, danger = false,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <p className="text-sm text-slate-600 mb-5">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn btn-secondary flex-1">Cancelar</button>
        <button
          onClick={onConfirm}
          className={clsx('btn flex-1', danger ? 'btn-danger' : 'btn-primary')}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
}
