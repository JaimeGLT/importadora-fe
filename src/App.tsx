import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, roleHome } from '@/store/authStore';
import { ProtectedRoute } from '@/router/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoginPage }        from '@/features/auth/LoginPage';
import { DashboardPage }    from '@/features/dashboard/DashboardPage';
import { InventarioPage }   from '@/features/inventario/InventarioPage';
import { VentasPage }       from '@/features/ventas/VentasPage';
import { ClientesPage }     from '@/features/clientes/ClientesPage';
import { LogisticaPage }    from '@/features/logistica/LogisticaPage';
import { FinanzasPage }     from '@/features/finanzas/FinanzasPage';
import { PrestamosPage }    from '@/features/prestamos/PrestamosPage';
import { AlmacenReservaPage } from '@/features/almacen-reserva/AlmacenReservaPage';
import { ConfiguracionPage }  from '@/features/configuracion/ConfiguracionPage';

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome[user.role]} replace />;
}

const ADM = ['administrador'] as const;
const ADM_VEN = ['administrador', 'vendedor'] as const;
const ADM_VEN_ALM = ['administrador', 'vendedor', 'almacenero'] as const;
const ALM = ['almacenero', 'administrador'] as const;
const RES = ['reservero', 'administrador'] as const;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<RootRedirect />} />
          <Route path="dashboard"      element={<ProtectedRoute roles={[...ADM]}><DashboardPage /></ProtectedRoute>} />
          <Route path="inventario"     element={<ProtectedRoute roles={[...ADM_VEN_ALM]}><InventarioPage /></ProtectedRoute>} />
          <Route path="ventas"         element={<ProtectedRoute roles={[...ADM_VEN]}><VentasPage /></ProtectedRoute>} />
          <Route path="clientes"       element={<ProtectedRoute roles={[...ADM_VEN]}><ClientesPage /></ProtectedRoute>} />
          <Route path="logistica"      element={<ProtectedRoute roles={[...ALM]}><LogisticaPage /></ProtectedRoute>} />
          <Route path="finanzas"       element={<ProtectedRoute roles={[...ADM]}><FinanzasPage /></ProtectedRoute>} />
          <Route path="prestamos"      element={<ProtectedRoute roles={[...ADM]}><PrestamosPage /></ProtectedRoute>} />
          <Route path="almacen-reserva"element={<ProtectedRoute roles={[...RES]}><AlmacenReservaPage /></ProtectedRoute>} />
          <Route path="configuracion"  element={<ProtectedRoute roles={[...ADM]}><ConfiguracionPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
