import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'

interface NavGroup {
  label: string
  icon: React.ReactNode
  items: { label: string; to: string }[]
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
      { label: 'Productos',  to: '/inventario' },
      { label: 'Préstamos',  to: '/inventario/prestamos' },
    ],
  },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <aside className="flex flex-col w-60 bg-steel-900 text-white h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-steel-700">
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
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {groups.map((group) => {
          const groupActive = group.items.some((i) => pathname === i.to)
          return (
            <div key={group.label}>
              {/* Cabecera del grupo */}
              <div className={clsx(
                'flex items-center gap-2 px-3 py-1 mb-1',
                groupActive ? 'text-white' : 'text-steel-400',
              )}>
                {group.icon}
                <span className="text-xs font-semibold uppercase tracking-wider">{group.label}</span>
              </div>

              {/* Sub-items */}
              <div className="space-y-0.5 pl-2">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
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
          onClick={() => void logout()}
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
