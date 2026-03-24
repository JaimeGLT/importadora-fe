import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':      { title: 'Dashboard',          subtitle: 'Resumen ejecutivo del negocio' },
  '/inventario':     { title: 'Inventario',          subtitle: 'Gestión de stock y ubicaciones' },
  '/ventas':         { title: 'Ventas',              subtitle: 'Órdenes, cotizaciones y facturación' },
  '/clientes':       { title: 'Clientes',            subtitle: 'Fichas, historial y créditos' },
  '/logistica':      { title: 'Logística',           subtitle: 'Despacho y control de bodega' },
  '/finanzas':       { title: 'Finanzas',            subtitle: 'Importaciones, precios y caja' },
  '/prestamos':      { title: 'Préstamos Internos',  subtitle: 'Retiros sin pago inmediato' },
  '/almacen-reserva':{ title: 'Almacén de Reserva',  subtitle: 'Stock separado del almacén principal' },
  '/configuracion':  { title: 'Configuración',       subtitle: 'Usuarios, empresa y parámetros del sistema' },
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right hidden md:block">
      <p className="font-mono-data text-sm font-medium text-slate-700 leading-none">
        {time.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="font-mono-data text-[10px] text-slate-400 mt-0.5 capitalize">
        {time.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

export function MainLayout() {
  const location = useLocation();
  const meta = pageMeta[location.pathname] ?? { title: 'AutoPartes Pro', subtitle: '' };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between h-[60px] px-6 bg-white border-b border-slate-200 shadow-sm shrink-0">
          <div>
            <h1 className="text-[17px] font-bold text-slate-900 leading-none">{meta.title}</h1>
            {meta.subtitle && <p className="text-xs text-slate-400 mt-0.5">{meta.subtitle}</p>}
          </div>
          <LiveClock />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
