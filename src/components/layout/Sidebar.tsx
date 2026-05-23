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
    icon: <i className="ti ti-package text-[18px] shrink-0" />,
    items: [
      { label: 'Productos',  to: '/inventario',            roles: ['admin'] },
      { label: 'Ajustes',    to: '/inventario/ajustes',   roles: ['admin', 'almacenero'] },
      { label: 'Préstamos',  to: '/inventario/prestamos', roles: ['admin', 'cajero'] },
    ],
  },
  {
    label: 'Importaciones',
    icon: <i className="ti ti-file-import text-[18px] shrink-0" />,
    items: [
      { label: 'Importaciones', to: '/importaciones',             roles: ['admin'] },
      { label: 'Proveedores',   to: '/importaciones/proveedores', roles: ['admin'] },
      { label: 'Marcas',        to: '/importaciones/marcas',      roles: ['admin'] },
      { label: 'Extractor IA',  to: '/importaciones/extractor',   roles: ['admin'] },
    ],
  },
  {
    label: 'Caja',
    icon: <i className="ti ti-cash-register text-[18px] shrink-0" />,
    roles: ['admin', 'cajero'],
    items: [
      { label: 'Caja diaria', to: '/caja', roles: ['admin', 'cajero'] },
    ],
  },
  {
    label: 'Ventas',
    icon: <i className="ti ti-receipt text-[18px] shrink-0" />,
    items: [
      { label: 'Caja',     to: '/ventas/caja',     roles: ['admin', 'cajero'] },
      { label: 'Almacén',  to: '/ventas/almacen',  roles: ['admin', 'almacenero'] },
      { label: 'Escaneo',  to: '/ventas/escaneo',  roles: ['admin', 'cajero'] },
      { label: 'Clientes', to: '/ventas/clientes', roles: ['admin', 'cajero'] },
    ],
  },
  {
    label: 'Reportes',
    icon: <i className="ti ti-chart-bar text-[18px] shrink-0" />,
    roles: ['admin'],
    items: [
      { label: 'Ganancia por producto',        to: '/reportes/rentabilidad',   roles: ['admin'] },
      { label: 'Costo de importaciones',       to: '/reportes/landed-cost',    roles: ['admin'] },
      { label: 'Velocidad de ventas',          to: '/reportes/rotacion',       roles: ['admin'] },
      { label: 'Clientes que me deben',        to: '/reportes/cxc',            roles: ['admin'] },
      { label: 'Compras en camino',            to: '/reportes/transito',       roles: ['admin'] },
      { label: 'Productos por agotarse',       to: '/reportes/quiebre',        roles: ['admin'] },
      { label: 'Mis proveedores',              to: '/reportes/proveedores',    roles: ['admin'] },
      { label: 'Productos sin movimiento',     to: '/reportes/stock-muerto',   roles: ['admin'] },
      { label: 'Ventas por vehículo',          to: '/reportes/vehiculos',      roles: ['admin'] },
      { label: 'Clientes que compraron menos', to: '/reportes/clientes-fuga',  roles: ['admin'] },
      { label: 'Épocas de mayor venta',        to: '/reportes/estacionalidad', roles: ['admin'] },
      { label: 'Ventas de kits',               to: '/reportes/kits',           roles: ['admin'] },
      { label: 'Alertas de stock',             to: '/alertas',                 roles: ['admin'] },
    ],
  },
  {
    label: 'Sistema',
    icon: <i className="ti ti-settings-2 text-[18px] shrink-0" />,
    roles: ['admin'],
    items: [
      { label: 'Configuración',    to: '/configuracion',    roles: ['admin'] },
      { label: 'Usuarios y roles', to: '/sistema/usuarios', roles: ['admin'] },
    ],
  },
]

function SidebarWatermark() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden"
         style={{ opacity: 0.03, mixBlendMode: 'screen' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 248 900" preserveAspectRatio="xMidYMax meet"
           style={{ width: '100%', height: '100%', display: 'block' }}>
        <g fill="#FFFFFF">
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
            <circle cx="50" cy="50" r="20" fill="#0f172a"/>
            <circle cx="50" cy="50" r="6"/>
          </g>
          <g transform="translate(14,320)">
            <circle cx="52" cy="52" r="50"/>
            <circle cx="52" cy="52" r="32" fill="#0f172a"/>
            <circle cx="52" cy="52" r="9"/>
            <circle cx="52" cy="10" r="4" fill="#0f172a"/>
            <circle cx="52" cy="94" r="4" fill="#0f172a"/>
            <circle cx="10" cy="52" r="4" fill="#0f172a"/>
            <circle cx="94" cy="52" r="4" fill="#0f172a"/>
            <circle cx="80" cy="24" r="4" fill="#0f172a"/>
            <circle cx="24" cy="80" r="4" fill="#0f172a"/>
            <circle cx="24" cy="24" r="4" fill="#0f172a"/>
            <circle cx="80" cy="80" r="4" fill="#0f172a"/>
          </g>
          <g transform="translate(172,490) rotate(-20)">
            <path d="M30 2 L56 16 L56 44 L30 58 L4 44 L4 16 Z"/>
            <circle cx="30" cy="30" r="9" fill="#0f172a"/>
          </g>
          <g transform="translate(28,620) rotate(10)">
            <rect x="0" y="0" width="12" height="8"/>
            <path d="M2 8 L10 8 L6 60 Z"/>
          </g>
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
      'bg-[#0f172a]',
      'fixed inset-y-0 left-0 z-50 h-full transition-transform duration-300 ease-in-out',
      'md:sticky md:top-0 md:translate-x-0 md:h-screen md:rounded-r-3xl',
      open ? 'translate-x-0' : '-translate-x-full',
    )}>
      <SidebarWatermark />

      <div className="flex flex-col flex-1 min-h-0 relative z-[1]">

        {/* Brand */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0284c7] to-[#1d4ed8] rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-black text-sm tracking-wide">USA</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-bold text-white leading-tight">USA Autopartes</h1>
              <p className="text-[11px] text-[#64748b]">Operaciones</p>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-[#1e293b] transition-colors"
              aria-label="Cerrar menú"
            >
              <i className="ti ti-x text-[18px]" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-5 overflow-y-auto">

          {/* Principal */}
          <div className="text-[10px] font-bold text-[#334155] px-3 mb-1.5 tracking-[2px] uppercase">
            Principal
          </div>

          <NavLink
            to="/dashboard"
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'px-3 py-2.5 flex items-center gap-2.5 transition-colors text-[14px] font-semibold rounded-xl mb-0.5',
                isActive
                  ? 'bg-[#1e293b] text-white border-l-[3px] border-l-[#3b82f6] pl-[9px]'
                  : 'text-[#64748b] hover:bg-[#1e293b] hover:text-[#e2e8f0]',
              )
            }
          >
            <i className="ti ti-layout-dashboard text-[18px] shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          <div className="text-[10px] font-bold text-[#334155] px-3 mt-5 mb-1.5 tracking-[2px] uppercase">
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
                      'px-3 py-2.5 flex items-center gap-2.5 transition-colors text-[14px] font-semibold rounded-xl mb-0.5',
                      isActive
                        ? 'bg-[#1e293b] text-white border-l-[3px] border-l-[#3b82f6] pl-[9px]'
                        : 'text-[#64748b] hover:bg-[#1e293b] hover:text-[#e2e8f0]',
                    )
                  }
                >
                  {group.icon}
                  <span>{group.label}</span>
                </NavLink>
              )
            }

            return (
              <div key={group.label} className="mb-0.5">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={clsx(
                    'w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors text-[14px] font-semibold text-left rounded-xl',
                    groupActive && !isExpanded
                      ? 'bg-[#1e293b] text-white border-l-[3px] border-l-[#3b82f6] pl-[9px]'
                      : 'text-[#64748b] hover:bg-[#1e293b] hover:text-[#e2e8f0]',
                  )}
                >
                  {group.icon}
                  <span className="flex-1">{group.label}</span>
                  <i className={clsx(
                    'ti ti-chevron-down text-[18px] shrink-0 opacity-50 transition-transform duration-200',
                    isExpanded && 'rotate-180',
                  )} />
                </button>

                <div className={clsx(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
                )}>
                  <div className="ml-10 flex flex-col gap-0.5 mt-1">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        onClick={onClose}
                        className={({ isActive }) =>
                          clsx(
                            'py-1.5 text-[13px] font-medium transition-colors',
                            isActive
                              ? 'text-[#3b82f6] font-bold'
                              : 'text-[#475569] hover:text-[#e2e8f0]',
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          <div className="text-[10px] font-bold text-[#334155] px-3 mt-5 mb-1.5 tracking-[2px] uppercase">
            General
          </div>

          {groups.slice(4).map((group) => {
            const visibleItems = group.items.filter(i => !i.roles || !user || i.roles.includes(user.rol))
            if (visibleItems.length === 0) return null
            const groupActive = visibleItems.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'))
            const isExpanded = expandedGroups.has(group.label)

            return (
              <div key={group.label} className="mb-0.5">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={clsx(
                    'w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors text-[14px] font-semibold text-left rounded-xl',
                    groupActive && !isExpanded
                      ? 'bg-[#1e293b] text-white border-l-[3px] border-l-[#3b82f6] pl-[9px]'
                      : 'text-[#64748b] hover:bg-[#1e293b] hover:text-[#e2e8f0]',
                  )}
                >
                  {group.icon}
                  <span className="flex-1">{group.label}</span>
                  <i className={clsx(
                    'ti ti-chevron-down text-[18px] shrink-0 opacity-50 transition-transform duration-200',
                    isExpanded && 'rotate-180',
                  )} />
                </button>

                <div className={clsx(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
                )}>
                  <div className="ml-10 flex flex-col gap-0.5 mt-1">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        onClick={onClose}
                        className={({ isActive }) =>
                          clsx(
                            'py-1.5 text-[13px] font-medium transition-colors',
                            isActive
                              ? 'text-[#3b82f6] font-bold'
                              : 'text-[#475569] hover:text-[#e2e8f0]',
                          )
                        }
                      >
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
        <div className="p-3 shrink-0">
          <div className="flex items-center gap-2.5 bg-[#1e293b] rounded-2xl px-3 py-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#059669] to-[#0284c7] flex items-center justify-center text-white text-xs font-black shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-bold truncate">{user?.nombre ?? '—'}</p>
              <p className="text-[#475569] text-[11px] capitalize truncate">{user?.rol ?? ''}</p>
            </div>
            <i
              onClick={() => { void logout().then(() => navigate('/login')) }}
              className="ti ti-logout text-[18px] text-[#475569] cursor-pointer hover:text-white transition-colors"
              title="Cerrar sesión"
            />
          </div>
        </div>

      </div>
    </aside>
  )
}
