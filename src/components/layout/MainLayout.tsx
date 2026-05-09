import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from './Sidebar'
import { gql } from '@/lib/graphql'
import { useConfigStore } from '@/stores/configStore'
import { DESCUENTOS_QUERY, CONFIG_VENTA_QUERY, TIPO_CAMBIO_QUERY, backendToDescuento, type DescuentoAPI, type ConfigVentaAPI, type TipoCambioAPI } from '@/lib/queries/config.queries'
import type { ModoPrecioCajero } from '@/stores/configStore'

let _configLoaded = false

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated, isTokenReady } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { setDescuentos, setModoPrecioCajero, setTipoCambio, setTipoCambioHabilitado } = useConfigStore()

  useEffect(() => {
    if (!isTokenReady || !isAuthenticated || _configLoaded) return
    _configLoaded = true

    gql<{ descuento: { nodes: DescuentoAPI[] } }>(DESCUENTOS_QUERY)
      .then(r => setDescuentos(r.descuento.nodes.map(backendToDescuento)))
      .catch(() => {})

    gql<{ configVenta: ConfigVentaAPI[] }>(CONFIG_VENTA_QUERY)
      .then(r => {
        const cfg = r.configVenta[0]
        if (!cfg) return
        const mapa: Record<string, ModoPrecioCajero> = {
          Ambos: 'ambos',
          PrecioDolarDia: 'solo_dolar_hoy',
          PrecioImportacion: 'solo_importacion',
        }
        setModoPrecioCajero(mapa[cfg.modoVenta] ?? 'solo_importacion')
      })
      .catch(() => {})

    gql<{ tipoCambio: TipoCambioAPI }>(TIPO_CAMBIO_QUERY)
      .then(r => {
        const valor = r.tipoCambio?.precioDolar ?? 0
        if (valor > 0) {
          setTipoCambio(valor)
          setTipoCambioHabilitado(true)
        }
      })
      .catch(() => {})
  }, [isTokenReady, isAuthenticated, setDescuentos, setModoPrecioCajero, setTipoCambio, setTipoCambioHabilitado])

  if (!isTokenReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="h-8 w-8 rounded-full border-2 border-hair border-t-terra animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-cream pt-1">

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/35 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar mobile */}
        <header className="md:hidden sticky top-1 z-30 flex items-center gap-3 px-4 h-14 bg-cream-2 border-b border-hair shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-hair transition-colors"
            aria-label="Abrir menú"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-navy flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-black tracking-wider">USA</span>
            </div>
            <span className="font-serif text-base text-ink">USA <em className="italic text-terra">Autopartes</em></span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

interface PageContainerProps {
  children: ReactNode
}

export function PageContainer({ children }: PageContainerProps) {
  return <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">{children}</div>
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 gap-3">
      <div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">{actions}</div>
      )}
    </div>
  )
}
