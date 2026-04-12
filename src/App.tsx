import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { InventarioPage } from '@/pages/inventario/InventarioPage'
import { PrestamosPage } from '@/pages/inventario/PrestamosPage'
import { ImportacionesPage } from '@/pages/importaciones/ImportacionesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/inventario/prestamos" element={<PrestamosPage />} />
            <Route path="/importaciones" element={<ImportacionesPage />} />
            <Route path="/" element={<Navigate to="/inventario" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
