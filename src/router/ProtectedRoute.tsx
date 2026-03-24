import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, roleHome } from '@/store/authStore';
import type { UserRole } from '@/types';

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome[user.role]} replace />;
  }
  return <>{children}</>;
}
