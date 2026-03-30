import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated, isTokenReady } = useAuth()
  console.log(isAuthenticated)
  console.log(isTokenReady)
  // cambiar cuanto el backen esté listo
  const isTokenReady2 = true;
  const isAuthenticated2 = true;
  if (!isTokenReady2) {
    return (
      <div className="flex h-screen items-center justify-center bg-steel-50">
        <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated2) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
