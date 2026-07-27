import type { RolUsuario } from '@/types'

export const ROLE_HOME: Record<RolUsuario, string> = {
  superadmin: '/inventario',
  admin:      '/inventario',
  cajero:     '/ventas/punto-de-venta',
  almacenero: '/ventas/almacen',
  operador:   '/ventas/escaneo',
}

// El superadmin puede hacer absolutamente todo lo que un admin puede: cualquier
// ruta o sección con permiso 'admin' también debe abrirse para 'superadmin'.
export function roleSatisfies(userRol: string | undefined | null, allowedRoles: string[]): boolean {
  if (!userRol) return false
  if (allowedRoles.includes(userRol)) return true
  if (userRol === 'superadmin' && allowedRoles.includes('admin')) return true
  return false
}

export function isAdminRole(rol: string | undefined | null): boolean {
  return rol === 'admin' || rol === 'superadmin'
}
