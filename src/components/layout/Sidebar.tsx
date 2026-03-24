import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, DollarSign,
  HandCoins, Warehouse, Users, Settings, LogOut, ChevronLeft,
  ChevronRight, Cog, AlertTriangle,
} from 'lucide-react';
import { useAuthStore, roleLabels } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import type { UserRole } from '@/types';
import clsx from 'clsx';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: () => number;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const ordenes  = useAppStore((s) => s.ordenes);
  const productos = useAppStore((s) => s.productos);

  const pendingCount  = ordenes.filter((o) => o.estado === 'pendiente').length;
  const lowStockCount = productos.filter((p) => p.activo && p.stock <= p.stock_minimo).length;

  const navItems: NavItem[] = [
    { path: '/dashboard',     label: 'Dashboard',        icon: <LayoutDashboard size={18} />, roles: ['administrador'] },
    { path: '/ventas',        label: 'Ventas',            icon: <ShoppingCart size={18} />,   roles: ['vendedor', 'administrador'] },
    { path: '/clientes',      label: 'Clientes',          icon: <Users size={18} />,           roles: ['vendedor', 'administrador'] },
    { path: '/inventario',    label: 'Inventario',        icon: <Package size={18} />,         roles: ['administrador', 'vendedor', 'almacenero'], badge: () => lowStockCount },
    { path: '/logistica',     label: 'Logística',         icon: <Truck size={18} />,           roles: ['almacenero', 'administrador'],             badge: () => pendingCount },
    { path: '/finanzas',      label: 'Finanzas',          icon: <DollarSign size={18} />,      roles: ['administrador'] },
    { path: '/prestamos',     label: 'Préstamos',         icon: <HandCoins size={18} />,       roles: ['administrador'] },
    { path: '/almacen-reserva', label: 'Almacén Reserva', icon: <Warehouse size={18} />,      roles: ['reservero', 'administrador'] },
    { path: '/configuracion', label: 'Configuración',     icon: <Settings size={18} />,       roles: ['administrador'] },
  ];

  const visible = navItems.filter((item) => user && item.roles.includes(user.role));

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside
      className={clsx(
        'relative flex flex-col h-screen bg-sidebar-bg border-r border-slate-800 transition-all duration-300 shrink-0 select-none z-20',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Brand */}
      <div className={clsx('flex items-center gap-3 px-4 py-5 border-b border-slate-800', collapsed && 'justify-center px-3')}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-lg">
          <Cog size={16} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-none">AutoPartes</p>
            <p className="text-blue-400 text-[10px] font-medium mt-0.5 tracking-wider">PRO SYSTEM</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-none">
        <ul className={clsx('space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
          {visible.map((item) => {
            const badgeCount = item.badge?.();
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg transition-all duration-150 group relative',
                      collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:bg-sidebar-hover hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={clsx('shrink-0 transition-transform duration-150', !isActive && 'group-hover:scale-110')}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                      )}
                      {badgeCount && badgeCount > 0 && (
                        <span className={clsx(
                          'min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1',
                          isActive ? 'bg-white/20 text-white' : 'bg-amber-500 text-white',
                          collapsed && 'absolute -top-1 -right-1 min-w-[16px] h-[16px] text-[9px]'
                        )}>
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>

        {/* Low stock warning */}
        {!collapsed && lowStockCount > 0 && (
          <div className="mx-3 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300 font-medium">
                {lowStockCount} producto{lowStockCount > 1 ? 's' : ''} con stock bajo
              </p>
            </div>
          </div>
        )}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-800 p-3 space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2.5 rounded-lg bg-slate-800/60 mb-2">
            <p className="text-white text-xs font-semibold truncate">{user.name}</p>
            <p className="text-slate-400 text-[10px] mt-0.5">{roleLabels[user.role]}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center gap-3 w-full rounded-lg p-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150',
            collapsed && 'justify-center'
          )}
          title="Cerrar sesión"
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Cerrar sesión</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[68px] w-6 h-6 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all duration-150 z-30"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
