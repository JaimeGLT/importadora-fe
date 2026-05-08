import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

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
  badge?: number
}

const groups: NavGroup[] = [
  {
    label: 'Inventario',
    icon: (
      <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 22V13"/>
      </svg>
    ),
    items: [
      { label: 'Productos',  to: '/inventario',           roles: ['admin'] },
      { label: 'Préstamos',  to: '/inventario/prestamos', roles: ['admin'] },
    ],
  },
  {
    label: 'Importaciones',
    icon: (
      <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3h5v5"/><path d="M21 3 13 11"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>
      </svg>
    ),
    items: [
      { label: 'Importaciones', to: '/importaciones',             roles: ['admin'] },
      { label: 'Proveedores',   to: '/importaciones/proveedores', roles: ['admin'] },
      { label: 'Marcas',        to: '/importaciones/marcas',      roles: ['admin'] },
    ],
  },
  {
    label: 'Caja',
    icon: (
      <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>
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
      <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-6"/>
      </svg>
    ),
    items: [
      { label: 'Caja',     to: '/ventas/caja',    roles: ['admin', 'cajero'] },
      { label: 'Almacén',  to: '/ventas/almacen', roles: ['admin', 'almacenero'] },
      { label: 'Escaneo',  to: '/ventas/escaneo', roles: ['admin', 'cajero'] },
      { label: 'Clientes', to: '/ventas/clientes', roles: ['admin', 'cajero'] },
    ],
  },
  {
    label: 'Reportes',
    icon: (
      <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>
      </svg>
    ),
    roles: ['admin'],
    items: [
      { label: 'Rentabilidad',        to: '/reportes/rentabilidad',   roles: ['admin'] },
      { label: 'Costo importación',   to: '/reportes/landed-cost',    roles: ['admin'] },
      { label: 'Rotación',            to: '/reportes/rotacion',       roles: ['admin'] },
      { label: 'Cuentas por cobrar',  to: '/reportes/cxc',            roles: ['admin'] },
      { label: 'En tránsito',         to: '/reportes/transito',       roles: ['admin'] },
      { label: 'Quiebre proyectado',  to: '/reportes/quiebre',        roles: ['admin'] },
      { label: 'Proveedores',         to: '/reportes/proveedores',    roles: ['admin'] },
      { label: 'Stock muerto',        to: '/reportes/stock-muerto',   roles: ['admin'] },
      { label: 'Por vehículo',        to: '/reportes/vehiculos',      roles: ['admin'] },
      { label: 'Clientes en fuga',    to: '/reportes/clientes-fuga',  roles: ['admin'] },
      { label: 'Estacionalidad',      to: '/reportes/estacionalidad', roles: ['admin'] },
      { label: 'Ventas de kits',      to: '/reportes/kits',           roles: ['admin'] },
      { label: 'Alertas de stock',    to: '/alertas',                 roles: ['admin'] },
    ],
  },
  {
    label: 'Sistema',
    icon: (
      <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    roles: ['admin'],
    items: [
      { label: 'Configuración',    to: '/configuracion',    roles: ['admin'] },
      { label: 'Usuarios y roles', to: '/sistema/usuarios', roles: ['admin'] },
    ],
  },
]

function SidebarWatermark() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-none"
         style={{ opacity: 0.04, mixBlendMode: 'multiply' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 248 900" preserveAspectRatio="xMidYMax meet"
           style={{ width: '100%', height: '100%', display: 'block' }}>
        <g fill="#241E18">
          {/* Gear top-right */}
          <g transform="translate(148,80) rotate(15)">
            <circle cx="50" cy="50" r="38"/>
            <rect x="47" y="0" width="6" height="14"/>
            <rect x="47" y="86" width="6" height="14"/>
            <rect x="0" y="47" width="14" height="6"/>
            <rect x="86" y="47" width="14" height="6"/>
            <rect x="20" y="9" width="6" height="14" transform="rotate(-45 23 16)"/>
            <rect x="74" y="9" width="6" height="14" transform="rotate(45 77 16)"/>
            <rect x="20" y="77" width="6" height="14" transform="rotate(45 23 84)"/>
            <rect x="74" y="77" width="6" height="14" transform="rotate(-45 77 84)"/>
            <circle cx="50" cy="50" r="20" fill="#FAF8F5"/>
            <circle cx="50" cy="50" r="6"/>
          </g>
          {/* Wheel center */}
          <g transform="translate(14,320)">
            <circle cx="52" cy="52" r="50"/>
            <circle cx="52" cy="52" r="32" fill="#FAF8F5"/>
            <circle cx="52" cy="52" r="9"/>
            <circle cx="52" cy="10" r="4" fill="#FAF8F5"/>
            <circle cx="52" cy="94" r="4" fill="#FAF8F5"/>
            <circle cx="10" cy="52" r="4" fill="#FAF8F5"/>
            <circle cx="94" cy="52" r="4" fill="#FAF8F5"/>
            <circle cx="80" cy="24" r="4" fill="#FAF8F5"/>
            <circle cx="24" cy="80" r="4" fill="#FAF8F5"/>
            <circle cx="24" cy="24" r="4" fill="#FAF8F5"/>
            <circle cx="80" cy="80" r="4" fill="#FAF8F5"/>
          </g>
          {/* Hex bolt */}
          <g transform="translate(172,490) rotate(-20)">
            <path d="M30 2 L56 16 L56 44 L30 58 L4 44 L4 16 Z"/>
            <circle cx="30" cy="30" r="9" fill="#FAF8F5"/>
          </g>
          {/* Cone */}
          <g transform="translate(28,620) rotate(10)">
            <rect x="0" y="0" width="12" height="8"/>
            <path d="M2 8 L10 8 L6 60 Z"/>
          </g>
          {/* Small bolt */}
          <g transform="translate(168,710) rotate(40)">
            <rect x="6" y="0" width="9" height="8"/>
            <rect x="1" y="8" width="18" height="6"/>
            <rect x="3" y="14" width="15" height="24"/>
            <path d="M3 38 L18 38 L16 66 L5 66 Z"/>
            <rect x="7" y="66" width="7" height="16"/>
          </g>
        </g>
      </svg>
    </div>
  )
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

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

  const initials = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <aside className={clsx(
      'flex flex-col w-[248px] shrink-0',
      'bg-[#F0EDE8] border-r border-[#E1DBCF]',
      'fixed inset-y-0 left-0 z-50 h-full transition-transform duration-300 ease-in-out',
      'md:sticky md:top-1 md:translate-x-0 md:h-screen',
      open ? 'translate-x-0' : '-translate-x-full',
    )}>
      <SidebarWatermark />

      <div className="relative z-[1] flex flex-col flex-1 min-h-0">

      {/* Brand */}
      <div className="px-[18px] pt-8 pb-5 border-b border-hair">
        <div className="flex items-center gap-3 mb-3">
          {/* Brand mark */}
          <div className="relative w-[46px] h-[46px] rounded-[10px] bg-navy flex flex-col items-center justify-center shrink-0 overflow-hidden"
               style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 1px 2px rgba(0,40,104,0.25)' }}>
            <span className="relative z-10 text-white text-sm font-black tracking-[0.08em] mt-0.5">USA</span>
            <div className="absolute bottom-0 left-0 right-0 h-2"
                 style={{ background: 'repeating-linear-gradient(to bottom, #B22234 0px, #B22234 1.4px, #FFFFFF 1.4px, #FFFFFF 2.8px)', opacity: 0.92 }} />
          </div>
          <div>
            <div className="font-serif text-2xl leading-none tracking-[-0.015em] text-ink">
              USA <em className="italic text-terra not-italic">Autopartes</em>
            </div>
          </div>

          {/* Close button mobile */}
          <button
            onClick={onClose}
            className="md:hidden ml-auto p-1.5 rounded-lg text-muted hover:text-ink hover:bg-hair transition-colors"
            aria-label="Cerrar menú"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="font-serif italic text-[12.5px] text-muted leading-[1.35]">
          Repuestos para vehículos americanos
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase text-muted-2 font-semibold">
          <span className="w-[5px] h-[5px] rounded-full bg-terra"
                style={{ boxShadow: '0 0 0 3px #F5DCDF' }} />
          Cochabamba · Bolivia
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-[18px] py-4 overflow-y-auto space-y-0.5">

        {/* Dashboard */}
        <div className="text-[10.5px] tracking-[0.14em] uppercase text-muted-2 px-3 pt-3.5 pb-2 font-medium">
          Principal
        </div>
        <NavLink
          to="/dashboard"
          onClick={onClose}
          className={({ isActive }) =>
            clsx(
              'w-full flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-sm font-medium transition-colors duration-120',
              isActive
                ? 'bg-ink text-cream'
                : 'text-ink-2 hover:bg-ink/[0.04]',
            )
          }
        >
          <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
            <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
          </svg>
          <span>Dashboard</span>
        </NavLink>

        <div className="text-[10.5px] tracking-[0.14em] uppercase text-muted-2 px-3 pt-3.5 pb-2 font-medium">
          Operaciones
        </div>

        {groups.slice(0, 4).map((group) => {
          const visibleItems = group.items.filter(i => !i.roles || !user || i.roles.includes(user.rol))
          if (visibleItems.length === 0) return null
          const groupActive = visibleItems.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'))
          const isExpanded = expandedGroups.has(group.label)

          if (visibleItems.length === 1) {
            const item = visibleItems[0]
            return (
              <NavLink
                key={group.label}
                to={item.to}
                end={item.to === '/inventario' || item.to === '/caja'}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'w-full flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-sm font-medium transition-colors duration-120',
                    isActive
                      ? 'bg-ink text-cream'
                      : 'text-ink-2 hover:bg-ink/[0.04]',
                  )
                }
              >
                {group.icon}
                <span>{group.label}</span>
              </NavLink>
            )
          }

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-sm font-medium transition-colors duration-120 text-left',
                  groupActive && !isExpanded
                    ? 'bg-ink text-cream'
                    : 'text-ink-2 hover:bg-ink/[0.04]',
                )}
              >
                {group.icon}
                <span className="flex-1">{group.label}</span>
                <svg
                  className={clsx('h-3.5 w-3.5 shrink-0 transition-transform duration-200 opacity-50', isExpanded && 'rotate-180')}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className={clsx(
                'overflow-hidden transition-all duration-200 ease-in-out',
                isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
              )}>
                <div className="pl-[42px] pt-0.5 pb-1 space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13.5px] transition-colors duration-120',
                          isActive
                            ? 'bg-ink text-cream font-medium'
                            : 'text-ink-2 hover:bg-ink/[0.04]',
                        )
                      }
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-40" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        <div className="text-[10.5px] tracking-[0.14em] uppercase text-muted-2 px-3 pt-3.5 pb-2 font-medium">
          General
        </div>

        {groups.slice(4).map((group) => {
          const visibleItems = group.items.filter(i => !i.roles || !user || i.roles.includes(user.rol))
          if (visibleItems.length === 0) return null
          const groupActive = visibleItems.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'))
          const isExpanded = expandedGroups.has(group.label)

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-sm font-medium transition-colors duration-120 text-left',
                  groupActive && !isExpanded
                    ? 'bg-ink text-cream'
                    : 'text-ink-2 hover:bg-ink/[0.04]',
                )}
              >
                {group.icon}
                <span className="flex-1">{group.label}</span>
                <svg
                  className={clsx('h-3.5 w-3.5 shrink-0 transition-transform duration-200 opacity-50', isExpanded && 'rotate-180')}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className={clsx(
                'overflow-hidden transition-all duration-200 ease-in-out',
                isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
              )}>
                <div className="pl-[42px] pt-0.5 pb-1 space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13.5px] transition-colors duration-120',
                          isActive
                            ? 'bg-ink text-cream font-medium'
                            : 'text-ink-2 hover:bg-ink/[0.04]',
                        )
                      }
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-40" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-[18px] py-4 border-t border-hair shrink-0">
        <div className="flex items-center gap-3 px-1.5 py-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0 border-2 border-cream-2"
            style={{
              background: 'linear-gradient(135deg, #B22234 0%, #8C1A28 100%)',
              boxShadow: '0 0 0 1px #E8E1D6',
            }}
          >
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[13.5px] font-semibold text-ink leading-[1.2] truncate">{user?.nombre ?? '—'}</p>
            <p className="text-[11.5px] text-muted capitalize">{user?.rol ?? ''}</p>
          </div>
          <button
            onClick={() => { void logout().then(() => navigate('/login')) }}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-hair transition-colors shrink-0"
            title="Cerrar sesión"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      </div>{/* end z-[1] wrapper */}
    </aside>
  )
}
