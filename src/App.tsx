import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RoleGuard } from '@/components/layout/RoleGuard'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_HOME } from '@/lib/roles'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { InventarioPage } from '@/pages/inventario/InventarioPage'
import { PrestamosPage } from '@/pages/inventario/PrestamosPage'
import { AjustesPage } from '@/pages/inventario/AjustesPage'
import { ImportacionesPage } from '@/pages/importaciones/ImportacionesPage'
import { ProveedoresPage } from '@/pages/importaciones/proveedores/ProveedoresPage'
import { MarcasPage as MarcasPageImportaciones } from '@/pages/importaciones/marcas/MarcasPage'
import { CajaDiariaPage } from '@/pages/caja/CajaDiariaPage'
import { CajaPage } from '@/pages/ventas/CajaPage'
import { AlmacenPage } from '@/pages/ventas/AlmacenPage'
import { AlertasPage } from '@/pages/alertas/AlertasPage'
import { VentasReportePage } from '@/pages/reportes/VentasReportePage'
import { InventarioReportePage } from '@/pages/reportes/InventarioReportePage'
import { OrdenesReportePage } from '@/pages/reportes/OrdenesReportePage'
import { ConfiguracionPage } from '@/pages/config/ConfiguracionPage'
import { UsuariosPage } from '@/pages/sistema/usuarios/UsuariosPage'
import { MarcasPage } from '@/pages/sistema/marcas/MarcasPage'
import { ClientesPage } from '@/pages/ventas/clientes/ClientesPage'
import { EscaneoPage } from '@/pages/ventas/escaneo/EscaneoPage'
import { FacturaExtractorPage } from '@/pages/importaciones/FacturaExtractorPage'

function RootRedirect() {
  const { user } = useAuth()
  return <Navigate to={ROLE_HOME[user?.rol as keyof typeof ROLE_HOME] ?? '/dashboard'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: 'group flex items-start gap-3 w-full p-4 rounded-xl shadow-lg border',
              title: 'text-sm font-medium',
              description: 'text-xs text-steel-500 mt-0.5',
              error: 'bg-red-50 border-red-200',
              success: 'bg-emerald-50 border-emerald-200',
              warning: 'bg-amber-50 border-amber-200',
              info: 'bg-blue-50 border-blue-200',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>

            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/alertas" element={<AlertasPage />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route path="/reportes" element={<Navigate to="/reportes/ventas" replace />} />
              <Route path="/reportes/ventas" element={<VentasReportePage />} />
              <Route path="/reportes/inventario" element={<InventarioReportePage />} />
              <Route path="/reportes/ordenes" element={<OrdenesReportePage />} />
              <Route path="/inventario" element={<InventarioPage />} />
              <Route path="/inventario/prestamos" element={<PrestamosPage />} />
              <Route path="/importaciones" element={<ImportacionesPage />} />
              <Route path="/importaciones/proveedores" element={<ProveedoresPage />} />
              <Route path="/importaciones/marcas" element={<MarcasPageImportaciones />} />
              <Route path="/importaciones/extractor" element={<FacturaExtractorPage />} />
              <Route path="/configuracion" element={<ConfiguracionPage />} />
              <Route path="/sistema/usuarios" element={<UsuariosPage />} />
              <Route path="/sistema/marcas" element={<MarcasPage />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['admin', 'almacenero']} />}>
              <Route path="/ventas/almacen" element={<AlmacenPage />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['admin', 'almacenero', 'cajero']} />}>
              <Route path="/inventario/ajustes" element={<AjustesPage />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['admin', 'cajero']} />}>
              <Route path="/caja" element={<CajaDiariaPage />} />
              <Route path="/ventas/punto-de-venta" element={<CajaPage />} />
              <Route path="/ventas/clientes" element={<ClientesPage />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['admin', 'cajero', 'operador']} />}>
              <Route path="/ventas/escaneo" element={<EscaneoPage />} />
            </Route>

            <Route path="/" element={<RootRedirect />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
