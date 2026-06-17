import { useEffect, useMemo, useState } from 'react'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { DASHBOARD_ORDENES_QUERY, backendOrdenToDashboard, type DashboardOrdenAPI, type DashboardOrden } from '@/lib/queries/ventas.queries'
import { SalesChart } from '@/components/ui/SalesChart'

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-steel-100 ${className}`}>
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-black tabular-nums leading-tight ${accent ? 'text-brand-600' : 'text-steel-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-steel-400 mt-1.5">{sub}</p>}
    </Card>
  )
}

export function VentasReportePage() {
  const { isTokenReady } = useAuth()
  const [ordenes, setOrdenes] = useState<DashboardOrden[]>([])
  const [chartHover, setChartHover] = useState<number | null>(null)

  useEffect(() => {
    if (!isTokenReady) return
    gql<{ todasOrdenes: { nodes: DashboardOrdenAPI[] } }>(DASHBOARD_ORDENES_QUERY)
      .then(res => setOrdenes(res.todasOrdenes.nodes.map(backendOrdenToDashboard)))
      .catch(() => {})
  }, [isTokenReady])

  const { ventasHoy, ventasMes, ventasMesPrev, ordenesCompletadasMes, ticketPromedio, sparkline30d, chartDates30, top10 } = useMemo(() => {
    const today      = new Date()
    const toDateStr  = (d: Date) => d.toISOString().slice(0, 10)
    const hoy        = toDateStr(today)
    const mesActual  = hoy.slice(0, 7)
    const mesAnterior = toDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1)).slice(0, 7)

    const completadas = ordenes.filter(o => o.estado === 'completada' && o.fechaCompletada)

    const ventasHoy = completadas
      .filter(o => o.fechaCompletada!.slice(0, 10) === hoy)
      .reduce((s, o) => s + o.total, 0)

    const completadasMes = completadas.filter(o => o.fechaCompletada!.slice(0, 7) === mesActual)
    const ventasMes      = completadasMes.reduce((s, o) => s + o.total, 0)
    const ventasMesPrev  = completadas
      .filter(o => o.fechaCompletada!.slice(0, 7) === mesAnterior)
      .reduce((s, o) => s + o.total, 0)
    const ordenesCompletadasMes = completadasMes.length
    const ticketPromedio = ordenesCompletadasMes > 0 ? ventasMes / ordenesCompletadasMes : 0

    const sparkline30d: number[] = []
    const chartDates30: string[] = []
    for (let i = 29; i >= 0; i--) {
      const d   = new Date(today.getTime() - i * 86400000)
      const str = toDateStr(d)
      sparkline30d.push(
        completadas.filter(o => o.fechaCompletada!.slice(0, 10) === str).reduce((s, o) => s + o.total, 0)
      )
      chartDates30.push(d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }))
    }

    const hace7  = new Date(today.getTime() - 7 * 86400000)
    const ordenes7d = completadas.filter(o => new Date(o.fechaCompletada!) >= hace7)

    // El descuento es a nivel orden; se distribuye proporcionalmente al subtotal de cada item
    // para que el ingreso por producto refleje el neto que aportó.
    const porProducto = new Map<string, { nombre: string; codigo: string; marcaId: number | null; unidades: number; ingreso: number }>()
    for (const orden of ordenes7d) {
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
            marcaId:  item.productoMarcaId ?? null,
            unidades: item.cantidad,
            ingreso:  ingresoItem,
          })
        }
      }
    }
    const top10 = [...porProducto.values()]
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 10)

    return { ventasHoy, ventasMes, ventasMesPrev, ordenesCompletadasMes, ticketPromedio, sparkline30d, chartDates30, top10 }
  }, [ordenes])

  const deltaPct = ventasMesPrev > 0
    ? `${ventasMes >= ventasMesPrev ? '+' : ''}${(((ventasMes - ventasMesPrev) / ventasMesPrev) * 100).toFixed(0)}% vs mes ant.`
    : undefined

  const maxUnidades = top10[0]?.unidades ?? 1

  return (
    <MainLayout>
      <PageTopBar section="Reportes" title="Ventas" />
      <PageContainer>
        <PageHeader title="Ventas" description="Análisis de ventas del período actual" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Ventas hoy"            value={fmtBs(ventasHoy)} accent />
          <KpiCard label="Ventas del mes"         value={fmtBs(ventasMes)}           sub={deltaPct} />
          <KpiCard label="Órdenes completadas"    value={String(ordenesCompletadasMes)} sub="Este mes" />
          <KpiCard label="Ticket promedio"        value={fmtBs(ticketPromedio)}       sub="Este mes" />
        </div>

        <Card className="p-5 mb-5">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-sm font-bold text-steel-800">Ventas — últimos 30 días</h2>
            {chartHover !== null && (
              <span className="text-xs font-black text-brand-600 tabular-nums">
                {chartDates30[chartHover]} · {fmtBs(sparkline30d[chartHover] ?? 0)}
              </span>
            )}
          </div>
          <div style={{ height: 160 }}>
            <SalesChart data={sparkline30d} dates={chartDates30} onHover={setChartHover} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-brand-600" />
            <h2 className="text-[11px] font-bold text-steel-500 uppercase tracking-widest">Top 10 productos — últimos 7 días</h2>
          </div>

          {top10.length === 0 ? (
            <p className="text-sm text-steel-400 text-center py-10">Sin ventas en los últimos 7 días</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-steel-100">
                  <th className="text-left pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px] w-8">#</th>
                  <th className="text-left pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Producto</th>
                  <th className="text-right pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Unidades</th>
                  <th className="text-right pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((p, i) => (
                  <tr key={p.codigo || i} className="border-b border-steel-50 hover:bg-[#FAFAF9] transition-colors">
                    <td className="py-3 pr-2">
                      <span className={`text-sm font-black tabular-nums ${i === 0 ? 'text-brand-600' : 'text-steel-200'}`}>{i + 1}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-steel-800">{p.nombre || '—'}</p>
                      <p className="text-[10px] text-steel-400 mt-0.5 tabular-nums">{p.codigo}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 bg-steel-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${i === 0 ? 'bg-brand-500' : 'bg-steel-300'}`}
                            style={{ width: `${(p.unidades / maxUnidades) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right font-bold text-steel-800 tabular-nums">{p.unidades}</td>
                    <td className="py-3 text-right text-steel-500 tabular-nums">{fmtBs(p.ingreso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </PageContainer>
    </MainLayout>
  )
}
