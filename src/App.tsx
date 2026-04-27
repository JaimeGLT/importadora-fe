import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { InventarioPage } from '@/pages/inventario/InventarioPage'
import { PrestamosPage } from '@/pages/inventario/PrestamosPage'
import { ImportacionesPage } from '@/pages/importaciones/ImportacionesPage'
import { ProveedoresPage } from '@/pages/importaciones/proveedores/ProveedoresPage'
import { CajaDiariaPage } from '@/pages/caja/CajaDiariaPage'
import { CajaPage } from '@/pages/ventas/CajaPage'
import { AlmacenPage } from '@/pages/ventas/AlmacenPage'
import { AlertasPage } from '@/pages/alertas/AlertasPage'
import { ReportesPage } from '@/pages/reportes/ReportesPage'
import { ConfiguracionPage } from '@/pages/config/ConfiguracionPage'
import { UsuariosPage } from '@/pages/sistema/usuarios/UsuariosPage'
import { ClientesPage } from '@/pages/ventas/clientes/ClientesPage'

function RootRedirect() {
  return <Navigate to="/dashboard" replace />
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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/alertas" element={<AlertasPage />} />
          <Route path="/reportes" element={<Navigate to="/reportes/rentabilidad" replace />} />
          <Route path="/reportes/:report" element={<ReportesPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/inventario/prestamos" element={<PrestamosPage />} />
          <Route path="/importaciones" element={<ImportacionesPage />} />
          <Route path="/importaciones/proveedores" element={<ProveedoresPage />} />
          <Route path="/caja" element={<CajaDiariaPage />} />
          <Route path="/ventas/caja" element={<CajaPage />} />
          <Route path="/ventas/almacen" element={<AlmacenPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="/sistema/usuarios" element={<UsuariosPage />} />
          <Route path="/ventas/clientes" element={<ClientesPage />} />
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
