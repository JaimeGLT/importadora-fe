import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { backendToProductoSimple } from '@/lib/queries/inventario.queries'
import { backendOrdenToDashboard, type DashboardOrden } from '@/lib/queries/ventas.queries'
import { DASHBOARD_QUERY, type DashboardQueryResult } from '@/lib/queries/dashboard.queries'
import { SalesChart } from '@/components/ui/SalesChart'
import type { Producto } from '@/types'

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const fmtUSD = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// â”€â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SkCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#D0CBC4] shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-3 w-48 rounded bg-[#E8E5E2] mb-2" />
        <div className="h-8 w-72 rounded bg-[#F0EFEC]" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Hero card */}
        <div className="rounded-xl bg-[#780e18]/20 p-5 h-[140px]">
          <div className="flex items-start justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-[#780e18]/20" />
            <div className="h-5 w-20 rounded-full bg-[#780e18]/20" />
          </div>
          <div className="h-7 w-32 rounded bg-[#780e18]/20 mb-2" />
          <div className="h-3 w-24 rounded bg-[#780e18]/10" />
        </div>
        {/* Other 3 cards */}
        {[0, 1, 2].map(i => (
          <SkCard key={i} className="p-5 h-[140px]">
            <div className="flex items-start justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-[#F0EFEC]" />
              <div className="h-5 w-16 rounded-full bg-[#E8E5E2]" />
            </div>
            <div className="h-7 w-28 rounded bg-[#F0EFEC] mb-2" />
            <div className="h-3 w-20 rounded bg-[#E8E5E2]" />
          </SkCard>
        ))}
      </div>

      {/* GrÃ¡fico + Top productos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <SkCard className="lg:col-span-2 p-5">
          <div className="h-4 w-40 rounded bg-[#F0EFEC] mb-4" />
          <div className="h-[220px] rounded-lg bg-[#F5F0EB]" />
        </SkCard>
        <SkCard className="p-5">
          <div className="h-3 w-32 rounded bg-[#E8E5E2] mb-5" />
          <div className="space-y-5">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-4 w-5 rounded bg-[#F0EFEC] shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full rounded bg-[#F0EFEC]" />
                  <div className="h-2 w-20 rounded bg-[#E8E5E2]" />
                  <div className="h-1.5 w-full rounded-full bg-[#E8E5E2]" />
                </div>
              </div>
            ))}
          </div>
        </SkCard>
      </div>

      {/* Stock crÃ­tico + Valor inventario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <SkCard className="lg:col-span-2 p-5">
          <div className="h-3 w-28 rounded bg-[#E8E5E2] mb-5" />
          <div className="space-y-0">
            <div className="h-8 rounded-t-lg bg-[#F5F0EB] mb-0" />
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-[#E8E5E2]">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-36 rounded bg-[#F0EFEC]" />
                  <div className="h-2 w-24 rounded bg-[#E8E5E2]" />
                </div>
                <div className="h-5 w-8 rounded bg-[#F0EFEC]" />
                <div className="h-5 w-8 rounded bg-[#E8E5E2]" />
                <div className="h-5 w-20 rounded-full bg-[#F0EFEC]" />
              </div>
            ))}
          </div>
        </SkCard>
        <div className="rounded-xl bg-[#2D2B2A] p-6 h-[240px]">
          <div className="h-2 w-28 rounded bg-[#4a4744] mb-5" />
          <div className="h-10 w-32 rounded bg-[#4a4744] mb-2" />
          <div className="h-3 w-24 rounded bg-[#4a4744] mb-6" />
          <div className="border-t border-[#4a4744] pt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="h-7 w-12 rounded bg-[#4a4744] mb-1" />
              <div className="h-2 w-16 rounded bg-[#3a3836]" />
            </div>
            <div>
              <div className="h-7 w-16 rounded bg-[#4a4744] mb-1" />
              <div className="h-2 w-16 rounded bg-[#3a3836]" />
            </div>
          </div>
        </div>
      </div>

      {/* Pedidos recientes */}
      <SkCard className="p-5 mb-5">
        <div className="h-3 w-32 rounded bg-[#E8E5E2] mb-5" />
        <div className="space-y-1">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-l-4 border-l-[#D0CBC4]">
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 rounded bg-[#F0EFEC]" />
                <div className="h-2 w-20 rounded bg-[#E8E5E2]" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="h-3 w-20 rounded bg-[#F0EFEC]" />
                <div className="h-5 w-16 rounded-full bg-[#E8E5E2]" />
              </div>
            </div>
          ))}
        </div>
      </SkCard>

      {/* Sin movimiento */}
      <SkCard className="p-5">
        <div className="h-3 w-48 rounded bg-[#E8E5E2] mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F5F0EB] border border-[#D0CBC4]">
              <div className="h-2 w-2 rounded-full bg-[#D0CBC4] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-28 rounded bg-[#E8E5E2]" />
                <div className="h-2 w-36 rounded bg-[#F0EFEC]" />
              </div>
            </div>
          ))}
        </div>
      </SkCard>
    </div>
  )
}

// â”€â”€â”€ Mini bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MiniBar({ pct, color = 'bg-[#D4A333]' }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 bg-[#E8E5E2] rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

// â”€â”€â”€ Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#D0CBC4] shadow-sm ${className}`}>
      {children}
    </div>
  )
}

// â”€â”€â”€ Section title con acento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionTitle({ children, to }: { children: React.ReactNode; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-[#D4A333]" />
        <h2 className="text-[11px] font-bold text-[#7A7571] uppercase tracking-widest">{children}</h2>
      </div>
      {to && (
        <Link to={to} className="text-xs text-[#780e18] hover:text-[#5a0a12] font-semibold">
          Ver todo â†’
        </Link>
      )}
    </div>
  )
}

// â”€â”€â”€ Badge sÃ³lido â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type BadgeVariant = 'red' | 'amber' | 'green' | 'blue' | 'gray' | 'yellow'

const BADGE_STYLES: Record<BadgeVariant, string> = {
  red:    'bg-[#780e18] text-white',
  amber:  'bg-[#F5E0A8] text-[#7A5200]',
  green:  'bg-[#B8DCCA] text-[#1E5C38]',
  blue:   'bg-[#E8E5E2] text-[#2D2B2A]',
  gray:   'bg-[#F0EFEC] text-[#7A7571]',
  yellow: 'bg-[#F5E0A8] text-[#7A5200]',
}

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${BADGE_STYLES[variant]}`}>
      {label}
    </span>
  )
}

// â”€â”€â”€ Stat pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatPill({ label, value, up }: { label: string; value: string; up: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
      up ? 'bg-[#B8DCCA] text-[#1E5C38]' : 'bg-[#F5C9C0] text-[#8A1E12]'
    }`}>
      {up ? 'â–²' : 'â–¼'} {value} <span className="font-normal opacity-70">{label}</span>
    </span>
  )
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function DashboardPage() {
  const { isTokenReady } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [productos,  setProductos]  = useState<Producto[]>([])
  const [ordenes,    setOrdenes]    = useState<DashboardOrden[]>([])
  const [tipoCambio, setTipoCambio] = useState<number>(6.96)

  useEffect(() => {
    if (!isTokenReady) return
    setIsLoading(true)
    gql<DashboardQueryResult>(DASHBOARD_QUERY, { first: 9999, after: null })
      .then(res => {
        setProductos(res.productos.nodes.map(backendToProductoSimple))
        setOrdenes(res.todasOrdenes.nodes.map(backendOrdenToDashboard))
        setTipoCambio(res.tipoCambio.precioDolar)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [isTokenReady])

  const {
    ventasHoy, ventasMes, ventasHoyPrev, ventasMesPrev,
    ordenesActivas,
    stockCritico, valorInventario, valorInventarioUSD,
    top5productos, sparkline14d, chartDates,
    sinMovimiento,
  } = useMemo(() => {
    const todayDate  = new Date()
    const toDateStr  = (d: Date) => d.toISOString().slice(0, 10)
    const hoy        = toDateStr(todayDate)
    const ayer       = toDateStr(new Date(todayDate.getTime() - 86400000))
    const mesActual  = hoy.slice(0, 7)
    const mesAnterior = toDateStr(new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1)).slice(0, 7)

    const completadas = ordenes.filter(o => o.estado === 'completada' && o.fechaCompletada)

    const ventasHoy      = completadas.filter(o => o.fechaCompletada!.slice(0, 10) === hoy).reduce((s, o) => s + o.total, 0)
    const ventasHoyPrev  = completadas.filter(o => o.fechaCompletada!.slice(0, 10) === ayer).reduce((s, o) => s + o.total, 0)
    const ventasMes      = completadas.filter(o => o.fechaCompletada!.slice(0, 7) === mesActual).reduce((s, o) => s + o.total, 0)
    const ventasMesPrev  = completadas.filter(o => o.fechaCompletada!.slice(0, 7) === mesAnterior).reduce((s, o) => s + o.total, 0)

    const sparkline14d: number[] = []
    const chartDates: string[]   = []
    for (let i = 13; i >= 0; i--) {
      const d   = new Date(todayDate.getTime() - i * 86400000)
      const str = toDateStr(d)
      sparkline14d.push(completadas.filter(o => o.fechaCompletada!.slice(0, 10) === str).reduce((s, o) => s + o.total, 0))
      chartDates.push(d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }))
    }

    const ordenesActivas = ordenes.filter(o => o.estado !== 'completada' && o.estado !== 'cancelada').length

    const stockCritico       = productos.filter(p => p.stock <= p.stock_minimo && p.estado === 'activo')
    const valorInventario    = productos.reduce((s, p) => s + p.stock * p.precio_costo, 0)
    const valorInventarioUSD = productos.reduce((s, p) => s + p.stock * (p.precio_costo / tipoCambio), 0)

    const hace7 = new Date(todayDate.getTime() - 7 * 86400000)
    const ordenesUlt7d = completadas.filter(o => new Date(o.fechaCompletada!) >= hace7)
    // Atribuir el descuento de orden proporcionalmente al subtotal de cada item
    // para que el ingreso por producto refleje el neto que aportó.
    const porProducto = new Map<string, { nombre: string; codigo: string; unidades: number; ingreso: number }>()
    for (const orden of ordenesUlt7d) {
      const subtotalOrden = orden.items.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
      const factor = subtotalOrden > 0 ? 1 - (orden.montoDescuento ?? 0) / subtotalOrden : 1
      for (const item of orden.items) {
        const prev = porProducto.get(item.productoId)
        const ingresoItem = item.precioUnitario * item.cantidad * factor
        if (prev) {
          prev.unidades += item.cantidad
          prev.ingreso  += ingresoItem
        } else {
          porProducto.set(item.productoId, {
            nombre:   item.productoNombre,
            codigo:   item.productoCodigo,
            unidades: item.cantidad,
            ingreso:  ingresoItem,
          })
        }
      }
    }
    const top5productos = [...porProducto.values()]
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 5)

    const hace30 = new Date(todayDate.getTime() - 30 * 86400000)
    const vendidos30d = new Set(
      completadas
        .filter(o => new Date(o.fechaCompletada!) >= hace30)
        .flatMap(o => o.items.map(i => i.productoId))
    )
    const sinMovimiento = productos.filter(p => p.estado === 'activo' && !vendidos30d.has(p.id))

    return {
      ventasHoy, ventasMes, ventasHoyPrev, ventasMesPrev,
      ordenesActivas,
      stockCritico, valorInventario, valorInventarioUSD,
      top5productos, sparkline14d, chartDates,
      sinMovimiento,
    }
  }, [productos, ordenes, tipoCambio])

  const deltaDia: { val: string; up: boolean } | null = ventasHoyPrev > 0
    ? { val: `${Math.abs(((ventasHoy - ventasHoyPrev) / ventasHoyPrev) * 100).toFixed(0)}%`, up: ventasHoy >= ventasHoyPrev }
    : null
  const deltaMes: { val: string; up: boolean } | null = ventasMesPrev > 0
    ? { val: `${Math.abs(((ventasMes - ventasMesPrev) / ventasMesPrev) * 100).toFixed(0)}%`, up: ventasMes >= ventasMesPrev }
    : null

  const [chartHover, setChartHover] = useState<number | null>(null)

  const saludo = "Reportes de Acceso RÃ¡pido"
  const maxTop = top5productos[0]?.unidades ?? 1

  const estadoBadge: Record<string, { label: string; variant: BadgeVariant }> = {
    pendiente_almacenero: { label: 'Pendiente',  variant: 'amber'  },
    en_preparacion:       { label: 'Preparando', variant: 'blue'   },
    listo_para_escaneo:   { label: 'Listo',      variant: 'green'  },
    con_faltantes:        { label: 'Faltantes',  variant: 'red'    },
    esperando_pago:       { label: 'Por cobrar', variant: 'yellow' },
    completada:           { label: 'Completada', variant: 'gray'   },
    cancelada:            { label: 'Cancelado',  variant: 'red'    },
  }

  const statusBorderColor: Record<string, string> = {
    pendiente_almacenero: 'border-l-[#D4A333]',
    en_preparacion:       'border-l-[#7A7571]',
    listo_para_escaneo:   'border-l-[#3F7A52]',
    con_faltantes:        'border-l-[#780e18]',
    esperando_pago:       'border-l-[#D4A333]',
    completada:           'border-l-[#D0CBC4]',
    cancelada:            'border-l-[#780e18]',
  }

  if (isLoading) {
    return (
      <MainLayout>
        <PageTopBar title="Dashboard" section="Principal" />
        <PageContainer>
          <DashboardSkeleton />
        </PageContainer>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <PageTopBar title="Dashboard" section="Principal" />
      <PageContainer>

        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-[#7A7571] uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="text-3xl font-black text-[#2D2B2A] tracking-tight">
              {saludo}
            </h1>
          </div>
          {stockCritico.length > 0 && (
            <Link to="/reportes/inventario"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#780e18] hover:bg-[#5a0a12] text-white text-xs font-bold rounded-xl transition-colors shadow-sm shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {stockCritico.length} alertas de stock
            </Link>
          )}
        </div>

        {/* â”€â”€ KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          {/* Hero â€” ventas hoy */}
          <Link to="/ventas/historial">
            <div className="relative overflow-hidden rounded-xl bg-[#780e18] p-5 text-white shadow-md hover:shadow-lg hover:bg-[#5a0a12] transition-all h-full">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#5a0a12] opacity-40" />
              <div className="absolute -right-2 -bottom-8 h-24 w-24 rounded-full bg-[#4a0810] opacity-30" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {deltaDia && <StatPill label="vs ayer" value={deltaDia.val} up={deltaDia.up} />}
                </div>
                <p className="text-2xl font-black tabular-nums leading-tight">{fmtBs(ventasHoy)}</p>
                <p className="text-xs text-white/70 font-semibold mt-0.5">Ventas del dÃ­a</p>
                <p className="text-[10px] text-white/45 mt-2">Ayer: {fmtBs(ventasHoyPrev)}</p>
              </div>
            </div>
          </Link>

          {/* Ventas mes */}
          <Link to="/ventas/historial">
            <Card className="p-5 h-full hover:-translate-y-0.5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-[#F5E0A8] flex items-center justify-center">
                  <svg className="h-4 w-4 text-[#7A5200]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                {deltaMes && <StatPill label="vs ant." value={deltaMes.val} up={deltaMes.up} />}
              </div>
              <p className="text-2xl font-black tabular-nums text-[#2D2B2A] leading-tight">{fmtBs(ventasMes)}</p>
              <p className="text-xs text-[#7A7571] font-semibold mt-0.5">Ventas del mes</p>
              <p className="text-[10px] text-[#7A7571] mt-2">Ãšltimos 30 dÃ­as</p>
            </Card>
          </Link>

          {/* Ã“rdenes activas */}
          <Link to="/ventas/caja">
            <Card className="p-5 h-full hover:-translate-y-0.5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-[#F5F0EB] flex items-center justify-center">
                  <svg className="h-4 w-4 text-[#780e18]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                {ordenesActivas > 0 && <Badge label="Activas" variant="yellow" />}
              </div>
              <p className="text-2xl font-black tabular-nums text-[#2D2B2A] leading-tight">{ordenesActivas}</p>
              <p className="text-xs text-[#7A7571] font-semibold mt-0.5">Ã“rdenes activas</p>
            </Card>
          </Link>

          {/* Stock crÃ­tico */}
          <Link to="/reportes/inventario">
            <Card className={`p-5 h-full hover:-translate-y-0.5 hover:shadow-md transition-all ${stockCritico.length > 0 ? 'border-[#F5C9C0]' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${stockCritico.length > 0 ? 'bg-[#F5C9C0]' : 'bg-[#F0EFEC]'}`}>
                  <svg className={`h-4 w-4 ${stockCritico.length > 0 ? 'text-[#8A1E12]' : 'text-[#7A7571]'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                {stockCritico.length > 0 && <Badge label="Revisar" variant="red" />}
              </div>
              <p className={`text-2xl font-black tabular-nums leading-tight ${stockCritico.length > 0 ? 'text-[#8A1E12]' : 'text-[#2D2B2A]'}`}>
                {stockCritico.length}
              </p>
              <p className="text-xs text-[#7A7571] font-semibold mt-0.5">Stock crÃ­tico</p>
              <p className="text-[10px] text-[#7A7571] mt-2">Productos bajo mÃ­nimo</p>
            </Card>
          </Link>
        </div>

        {/* â”€â”€ GrÃ¡fico ventas + Top productos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5" style={{ minHeight: 320 }}>

          <Card className="lg:col-span-2 p-5 flex flex-col">
            <div className="flex items-start justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-[#2D2B2A]">Ventas â€” Ãºltimos 14 dÃ­as</h2>
                <div className="flex items-center gap-2 mt-0.5 h-5">
                  {chartHover !== null ? (
                    <>
                      <span className="text-xs text-[#7A7571]">{chartDates[chartHover]}</span>
                      <span className="text-xs font-black text-[#780e18] tabular-nums">
                        {fmtBs(sparkline14d[chartHover] ?? 0)}
                      </span>
                    </>
                  ) : (
                    <p className="text-xs text-[#7A7571]">Pasa el cursor para ver cada dÃ­a</p>
                  )}
                </div>
              </div>
              <Link to="/reportes/ventas"
                className="text-xs text-[#780e18] hover:text-[#5a0a12] font-bold shrink-0">
                Ver reporte â†’
              </Link>
            </div>
            <SalesChart data={sparkline14d} dates={chartDates} onHover={setChartHover} />
          </Card>

          <Card className="p-5 flex flex-col">
            <SectionTitle to="/reportes/ventas">Top productos (7d)</SectionTitle>
            <div className="space-y-4 flex-1">
              {top5productos.map((p, i) => (
                <div key={p.codigo} className="flex items-start gap-3">
                  <span className={`text-sm font-black w-6 shrink-0 mt-0.5 tabular-nums ${i === 0 ? 'text-[#780e18]' : 'text-[#D0CBC4]'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2D2B2A] leading-tight truncate">{p.nombre}</p>
                    <p className="text-[10px] text-[#7A7571] mt-0.5 tabular-nums">{p.codigo}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <MiniBar pct={(p.unidades / maxTop) * 100} color={i === 0 ? 'bg-[#D4A333]' : 'bg-[#E8E5E2]'} />
                      <span className="text-[10px] font-bold text-[#7A7571] shrink-0 tabular-nums">{p.unidades}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-[#7A7571] tabular-nums">{fmtBs(p.ingreso)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* â”€â”€ Stock crÃ­tico + Valor inventario â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

          <Card className="lg:col-span-2 p-5">
            <SectionTitle to="/reportes/inventario">Stock crÃ­tico</SectionTitle>
            {stockCritico.length === 0 ? (
              <div className="flex items-center gap-3 py-10 justify-center">
                <div className="h-10 w-10 rounded-full bg-[#B8DCCA] flex items-center justify-center">
                  <svg className="h-5 w-5 text-[#1E5C38]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[#7A7571]">Todos los productos sobre el mÃ­nimo</span>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F5F0EB] border-b border-[#D0CBC4]">
                    <th className="text-left px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px]">Producto</th>
                    <th className="text-center px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px]">Stock</th>
                    <th className="text-center px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px]">MÃ­n.</th>
                    <th className="text-left px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px]">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockCritico.slice(0, 6).map(p => (
                    <tr key={p.id} className="border-b border-[#E8E5E2] hover:bg-[#FAF5EE] transition-colors group">
                      <td className="py-3 pr-3 px-3">
                        <p className="font-semibold text-[#2D2B2A] truncate max-w-[180px] group-hover:text-[#780e18] transition-colors">{p.nombre}</p>
                        <p className="text-[#7A7571] text-[10px] mt-0.5 tabular-nums">{p.codigo_universal}</p>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-base font-black tabular-nums ${p.stock === 0 ? 'text-[#8A1E12]' : 'text-[#7A5200]'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="py-3 text-center text-[#7A7571] font-semibold tabular-nums">{p.stock_minimo}</td>
                      <td className="py-3">
                        <Badge label={p.stock === 0 ? 'Sin stock' : 'Bajo mÃ­nimo'} variant={p.stock === 0 ? 'red' : 'amber'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {stockCritico.length > 6 && (
              <Link to="/reportes/inventario" className="block mt-3 text-center text-xs text-[#780e18] hover:text-[#5a0a12] font-bold">
                +{stockCritico.length - 6} productos mÃ¡s â†’
              </Link>
            )}
          </Card>

          {/* Valor inventario */}
          <div className="relative overflow-hidden rounded-xl bg-[#2D2B2A] p-6 text-white shadow-md border border-[#4a4744]">
            <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[#4a4744]" />
            <div className="absolute right-2 -bottom-12 h-32 w-32 rounded-full bg-[#780e18] opacity-40" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A7571] mb-5">
                Valor inventario
              </p>
              <p className="text-4xl font-black tracking-tight leading-none tabular-nums">{fmtUSD(valorInventarioUSD)}</p>
              <p className="text-sm text-[#7A7571] mt-1.5 tabular-nums">{fmtBs(valorInventario)}</p>
              <div className="mt-6 pt-5 border-t border-[#4a4744] grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-black tabular-nums">{productos.length}</p>
                  <p className="text-[10px] text-[#7A7571] font-semibold uppercase tracking-wide mt-0.5">Productos</p>
                </div>
                <div>
                  <p className="text-2xl font-black tabular-nums">
                    {productos.reduce((s, p) => s + p.stock, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#7A7571] font-semibold uppercase tracking-wide mt-0.5">Unidades</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* â”€â”€ Pedidos recientes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 gap-5 mb-5">

          <Card className="p-5">
            <SectionTitle to="/ventas/caja">Pedidos recientes</SectionTitle>
            <div className="space-y-1">
              {ordenes.length === 0 ? (
                <p className="text-sm text-[#7A7571] text-center py-10">Sin Ã³rdenes</p>
              ) : (
                [...ordenes].reverse().slice(0, 10).map(o => {
                  const bs = estadoBadge[o.estado] ?? { label: o.estado, variant: 'gray' as BadgeVariant }
                  const borderColor = statusBorderColor[o.estado] ?? 'border-l-[#D0CBC4]'
                  return (
                    <div key={o.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-l-4 hover:bg-[#FAF5EE] transition-colors ${borderColor}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#2D2B2A]">{o.numero}</p>
                          <p className="text-[10px] text-[#7A7571]">{relativeTime(o.fecha)}</p>
                        </div>
                        <p className="text-[10px] text-[#7A7571] mt-0.5">{o.cajeroNombre}</p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                        <p className="text-xs font-black text-[#2D2B2A] tabular-nums">{fmtBs(o.total)}</p>
                        <Badge label={bs.label} variant={bs.variant} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* â”€â”€ Sin movimiento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sinMovimiento.length > 0 && (
          <Card className="p-5">
            <SectionTitle to="/reportes/stock-muerto">Sin movimiento â€” Ãºltimos 30 dÃ­as</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {sinMovimiento.slice(0, 6).map(p => {
                if (!p) return null
                return (
                  <div key={p.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F5F0EB] border border-[#D0CBC4] hover:border-[#780e18] hover:bg-[#FAF5EE] transition-colors">
                    <div className="h-2 w-2 rounded-full bg-[#D4A333] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#2D2B2A] truncate">{p.nombre}</p>
                      <p className="text-[10px] text-[#7A7571] mt-0.5 tabular-nums">
                        {p.codigo_universal} Â· {p.stock} uds Â· {fmtBs(p.stock * p.precio_costo)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            {sinMovimiento.length > 6 && (
              <div className="mt-3 text-center">
                <Link to="/reportes/stock-muerto" className="text-xs text-[#780e18] hover:text-[#5a0a12] font-bold">
                  +{sinMovimiento.length - 6} mÃ¡s â†’
                </Link>
              </div>
            )}
          </Card>
        )}

      </PageContainer>
    </MainLayout>
  )
}
