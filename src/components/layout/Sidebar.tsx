import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  label: string
  to: string
  roles?: string[]
}

interface NavGroup {
  label: string
  icon: React.ReactNode
  items: NavItem[]
  roles?: string[]
}

const groups: NavGroup[] = [
  {
    label: 'Inventario',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    items: [
      { label: 'Productos', to: '/inventario',           roles: ['admin'] },
      { label: 'Préstamos', to: '/inventario/prestamos', roles: ['admin'] },
    ],
  },
  {
    label: 'Importaciones',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    items: [
      { label: 'Importaciones', to: '/importaciones',             roles: ['admin'] },
      { label: 'Proveedores',   to: '/importaciones/proveedores', roles: ['admin'] },
    ],
  },
  {
    label: 'Caja',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    roles: ['admin', 'cajero'],
    items: [
      { label: 'Caja diaria', to: '/caja', roles: ['admin', 'cajero'] },
    ],
  },
  {
    label: 'Ventas',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    items: [
      { label: 'Caja',    to: '/ventas/caja',    roles: ['admin', 'cajero'] },
      { label: 'Almacén', to: '/ventas/almacen', roles: ['admin', 'almacenero'] },
      { label: 'Clientes', to: '/ventas/clientes', roles: ['admin', 'cajero'] },
    ],
  },
  {
    label: 'Reportes',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    roles: ['admin'],
    items: [
      { label: 'Rentabilidad',        to: '/reportes/rentabilidad',  roles: ['admin'] },
      { label: 'Costo importación',   to: '/reportes/landed-cost',   roles: ['admin'] },
      { label: 'Rotación',            to: '/reportes/rotacion',      roles: ['admin'] },
      { label: 'Cuentas por cobrar',  to: '/reportes/cxc',           roles: ['admin'] },
      { label: 'En tránsito',         to: '/reportes/transito',      roles: ['admin'] },
      { label: 'Quiebre proyectado',  to: '/reportes/quiebre',       roles: ['admin'] },
      { label: 'Proveedores',         to: '/reportes/proveedores',   roles: ['admin'] },
      { label: 'Stock muerto',        to: '/reportes/stock-muerto',  roles: ['admin'] },
      { label: 'Por vehículo',        to: '/reportes/vehiculos',     roles: ['admin'] },
      { label: 'Clientes en fuga',    to: '/reportes/clientes-fuga', roles: ['admin'] },
      { label: 'Estacionalidad',      to: '/reportes/estacionalidad',roles: ['admin'] },
      { label: 'Alertas de stock',    to: '/alertas',                roles: ['admin'] },
    ],
  },
  {
    label: 'Sistema',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    roles: ['admin'],
    items: [
      { label: 'Configuración',  to: '/configuracion',                roles: ['admin'] },
      { label: 'Usuarios y roles', to: '/sistema/usuarios',         roles: ['admin'] },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Inicializar con los grupos que tienen una ruta activa abiertos
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    groups.forEach((g) => {
      if (g.items.some((i) => pathname.startsWith(i.to === '/inventario' ? '/inventario' : i.to))) {
        initial.add(g.label)
      }
    })
    return initial
  })

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  return (
    <aside className={clsx(
      'flex flex-col w-60 bg-steel-900 text-white shrink-0',
      // Mobile: drawer fijo que desliza
      'fixed inset-y-0 left-0 z-50 h-full transition-transform duration-300 ease-in-out',
      // Desktop: posición normal en el flujo
      'md:relative md:translate-x-0 md:h-screen md:sticky md:top-0',
      open ? 'translate-x-0' : '-translate-x-full',
    )}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-steel-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Importadora</p>
            <p className="text-xs text-steel-400 leading-tight">Autopartes</p>
          </div>
        </div>

        {/* Botón cerrar — solo mobile */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-steel-400 hover:text-white hover:bg-steel-800 transition-colors"
          aria-label="Cerrar menú"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Dashboard — acceso directo */}
        <NavLink
          to="/dashboard"
          onClick={onClose}
          className={({ isActive }) =>
            clsx(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
              isActive
                ? 'text-white bg-brand-600'
                : 'text-steel-400 hover:text-white hover:bg-steel-800',
            )
          }
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wider">Dashboard</span>
        </NavLink>

        {groups.map((group) => {
          const visibleItems = group.items.filter(i => !i.roles || !user || i.roles.includes(user.rol))
          if (visibleItems.length === 0) return null
          const groupActive = visibleItems.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'))
          const isExpanded = expandedGroups.has(group.label)

          return (
            <div key={group.label}>
              {/* Header clickeable del grupo */}
              <button
                onClick={() => toggleGroup(group.label)}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left',
                  groupActive
                    ? 'text-white bg-steel-800'
                    : 'text-steel-400 hover:text-white hover:bg-steel-800',
                )}
              >
                {group.icon}
                <span className="text-xs font-semibold uppercase tracking-wider flex-1">{group.label}</span>
                <svg
                  className={clsx('h-3.5 w-3.5 shrink-0 transition-transform duration-200', isExpanded && 'rotate-180')}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Subitems con animación */}
              <div className={clsx(
                'overflow-hidden transition-all duration-200 ease-in-out',
                isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
              )}>
                <div className="space-y-0.5 pl-2 pt-0.5 pb-1">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                          isActive
                            ? 'bg-brand-600 text-white font-medium'
                            : 'text-steel-300 hover:bg-steel-800 hover:text-white',
                        )
                      }
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-60" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-steel-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-brand-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {user?.nombre.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.nombre ?? '—'}</p>
            <p className="text-xs text-steel-400 capitalize">{user?.rol ?? ''}</p>
          </div>
        </div>
        <button
          onClick={() => { void logout().then(() => navigate('/login')) }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-steel-400 hover:text-white hover:bg-steel-800 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
