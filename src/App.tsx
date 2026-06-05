import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RoleGuard } from '@/components/layout/RoleGuard'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_HOME } from '@/lib/roles'
import { lazy, Suspense } from 'react'

const LoginPage              = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage          = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const InventarioPage         = lazy(() => import('@/pages/inventario/InventarioPage').then(m => ({ default: m.InventarioPage })))
const PrestamosPage          = lazy(() => import('@/pages/inventario/PrestamosPage').then(m => ({ default: m.PrestamosPage })))
const AjustesPage            = lazy(() => import('@/pages/inventario/AjustesPage').then(m => ({ default: m.AjustesPage })))
const ImportacionesPage      = lazy(() => import('@/pages/importaciones/ImportacionesPage').then(m => ({ default: m.ImportacionesPage })))
const ProveedoresPage        = lazy(() => import('@/pages/importaciones/proveedores/ProveedoresPage').then(m => ({ default: m.ProveedoresPage })))
const MarcasPageImportaciones = lazy(() => import('@/pages/importaciones/marcas/MarcasPage').then(m => ({ default: m.MarcasPage })))
const CajaDiariaPage         = lazy(() => import('@/pages/caja/CajaDiariaPage').then(m => ({ default: m.CajaDiariaPage })))
const CajaPage               = lazy(() => import('@/pages/ventas/CajaPage').then(m => ({ default: m.CajaPage })))
const AlmacenPage            = lazy(() => import('@/pages/ventas/AlmacenPage').then(m => ({ default: m.AlmacenPage })))
const AlertasPage            = lazy(() => import('@/pages/alertas/AlertasPage').then(m => ({ default: m.AlertasPage })))
const VentasReportePage      = lazy(() => import('@/pages/reportes/VentasReportePage').then(m => ({ default: m.VentasReportePage })))
const InventarioReportePage  = lazy(() => import('@/pages/reportes/InventarioReportePage').then(m => ({ default: m.InventarioReportePage })))
const OrdenesReportePage     = lazy(() => import('@/pages/reportes/OrdenesReportePage').then(m => ({ default: m.OrdenesReportePage })))
const ConfiguracionPage      = lazy(() => import('@/pages/config/ConfiguracionPage').then(m => ({ default: m.ConfiguracionPage })))
const UsuariosPage           = lazy(() => import('@/pages/sistema/usuarios/UsuariosPage').then(m => ({ default: m.UsuariosPage })))
const MarcasPage             = lazy(() => import('@/pages/sistema/marcas/MarcasPage').then(m => ({ default: m.MarcasPage })))
const ClientesPage           = lazy(() => import('@/pages/ventas/clientes/ClientesPage').then(m => ({ default: m.ClientesPage })))
const EscaneoPage            = lazy(() => import('@/pages/ventas/escaneo/EscaneoPage').then(m => ({ default: m.EscaneoPage })))
const VentasHistorialPage    = lazy(() => import('@/pages/ventas/VentasHistorialPage').then(m => ({ default: m.VentasHistorialPage })))
const FacturaExtractorPage   = lazy(() => import('@/pages/importaciones/FacturaExtractorPage').then(m => ({ default: m.FacturaExtractorPage })))

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
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-gray-400">Cargando…</div>}>
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
              <Route path="/ventas/historial" element={<VentasHistorialPage />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['admin', 'cajero', 'operador']} />}>
              <Route path="/ventas/escaneo" element={<EscaneoPage />} />
            </Route>

            <Route path="/" element={<RootRedirect />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
