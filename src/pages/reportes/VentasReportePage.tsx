import { useEffect, useMemo, useRef, useState } from 'react'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { DASHBOARD_ORDENES_QUERY, backendOrdenToDashboard, type DashboardOrdenAPI, type DashboardOrden } from '@/lib/queries/ventas.queries'
import { TODOS_MOVIMIENTOS_QUERY, type MovimientoCajaAPI } from '@/lib/queries/caja.queries'
import { CREDITOS_QUERY, backendToCredito, type CreditoAPI } from '@/lib/queries/creditos.queries'
import { calcularVentasPorMetodo } from '@/utils/ventasPorMetodo'
import { SalesChart } from '@/components/ui/SalesChart'
import {
  ChartContainer,
  BarChart,
  HorizontalBarChart,
  AreaChart,
  PaymentMethodBreakdown,
  useChartExport,
} from '@/components/charts'
import {
  KpiCard, ReportHeader, ExportButton, DateRangeFilter,
  rangoEsteMes, type RangoFechas,
} from '@/components/reportes/ReportUI'
import type { Credito } from '@/types'

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const toDateStr = (d: Date) => d.toISOString().slice(0, 10)
const parseLocalDate = (s: string) => new Date(`${s}T00:00:00`)
const enRango = (fechaISO: string, desde: string, hasta: string) => {
  const d = fechaISO.slice(0, 10)
  return d >= desde && d <= hasta
}

export function VentasReportePage() {
  const { isTokenReady } = useAuth()
  const [ordenes, setOrdenes] = useState<DashboardOrden[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoCajaAPI[]>([])
  const [creditos, setCreditos] = useState<Credito[]>([])
  const [, setChartHover] = useState<number | null>(null)
  const [rango, setRango] = useState<RangoFechas>(rangoEsteMes())

  const reportRef = useRef<HTMLDivElement | null>(null)
  const { exportPDF } = useChartExport()

  useEffect(() => {
    if (!isTokenReady) return
    gql<{ todasOrdenes: { nodes: DashboardOrdenAPI[] } }>(DASHBOARD_ORDENES_QUERY)
      .then(res => setOrdenes(res.todasOrdenes.nodes.map(backendOrdenToDashboard)))
      .catch(() => {})
    gql<{ todosMovimientos: { nodes: MovimientoCajaAPI[] } }>(TODOS_MOVIMIENTOS_QUERY)
      .then(res => setMovimientos(res.todosMovimientos.nodes))
      .catch(() => {})
    gql<{ creditos: { nodes: CreditoAPI[] } }>(CREDITOS_QUERY, { first: 2000 })
      .then(res => setCreditos(res.creditos.nodes.map(backendToCredito)))
      .catch(() => {})
  }, [isTokenReady])

  const {
    ventasPeriodo, ventasPeriodoPrev, ordenesCompletadasPeriodo, ticketPromedio,
    sparklinePeriodo, chartDatesPeriodo, top10,
    ventasPorDiaSemana,
    acumuladoActual, acumuladoAnterior, labelsAcumulado,
    ventasPorMetodoPeriodo,
  } = useMemo(() => {
    const { desde, hasta } = rango
    const dIni = parseLocalDate(desde)
    const dFin = parseLocalDate(hasta)
    const numDias = Math.max(1, Math.round((dFin.getTime() - dIni.getTime()) / 86400000) + 1)

    const dPrevFin = new Date(dIni.getTime() - 86400000)
    const dPrevIni = new Date(dPrevFin.getTime() - (numDias - 1) * 86400000)
    const prevDesde = toDateStr(dPrevIni)
    const prevHasta = toDateStr(dPrevFin)

    const ventasPorMetodoPeriodo = calcularVentasPorMetodo(movimientos, creditos, desde, hasta)

    const completadas = ordenes.filter(o => o.estado === 'completada' && o.fechaCompletada)
    const completadasPeriodo = completadas.filter(o => enRango(o.fechaCompletada!, desde, hasta))
    const completadasPeriodoPrev = completadas.filter(o => enRango(o.fechaCompletada!, prevDesde, prevHasta))

    const ventasPeriodo = completadasPeriodo.reduce((s, o) => s + o.total, 0)
    const ventasPeriodoPrev = completadasPeriodoPrev.reduce((s, o) => s + o.total, 0)
    const ordenesCompletadasPeriodo = completadasPeriodo.length
    const ticketPromedio = ordenesCompletadasPeriodo > 0 ? ventasPeriodo / ordenesCompletadasPeriodo : 0

    // ─── Sparkline: ventas por día dentro del rango seleccionado ───
    const sparklinePeriodo: number[] = []
    const chartDatesPeriodo: string[] = []
    for (let i = 0; i < numDias; i++) {
      const d = new Date(dIni.getTime() + i * 86400000)
      const str = toDateStr(d)
      sparklinePeriodo.push(
        completadasPeriodo.filter(o => o.fechaCompletada!.slice(0, 10) === str).reduce((s, o) => s + o.total, 0)
      )
      chartDatesPeriodo.push(d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }))
    }

    // El descuento es a nivel orden; se distribuye proporcionalmente al subtotal de cada item
    // para que el ingreso por producto refleje el neto que aportó.
    const porProducto = new Map<string, { nombre: string; codigo: string; marcaId: number | null; unidades: number; ingreso: number }>()
    for (const orden of completadasPeriodo) {
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

    // ─── Ventas por día de la semana (dentro del rango) — grouped por estado ───
    const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const ordenesEnRango = ordenes.filter(o => enRango(o.fecha, desde, hasta))
    const completadaPorDia = new Array(7).fill(0)
    const canceladaPorDia  = new Array(7).fill(0)
    for (const o of ordenesEnRango) {
      const d = new Date(o.fecha).getDay()
      if (o.estado === 'completada') completadaPorDia[d] = (completadaPorDia[d] ?? 0) + o.total
      else if (o.estado === 'cancelada') canceladaPorDia[d] = (canceladaPorDia[d] ?? 0) + o.total
    }
    const ventasPorDiaSemana = {
      labels: DIAS,
      completada: completadaPorDia,
      cancelada: canceladaPorDia,
    }

    // ─── Acumulado: período actual vs período anterior de igual longitud, día a día ───
    const labelsAcumulado: string[] = []
    const acumActual: number[] = []
    const acumAnterior: number[] = []
    let sActual = 0, sAnterior = 0
    for (let i = 0; i < numDias; i++) {
      const dCur = new Date(dIni.getTime() + i * 86400000)
      const dPrev = new Date(dPrevIni.getTime() + i * 86400000)
      const strCur = toDateStr(dCur)
      const strPrev = toDateStr(dPrev)
      sActual  += completadas.filter(o => o.fechaCompletada?.slice(0, 10) === strCur).reduce((s, o) => s + o.total, 0)
      sAnterior += completadas.filter(o => o.fechaCompletada?.slice(0, 10) === strPrev).reduce((s, o) => s + o.total, 0)
      labelsAcumulado.push(dCur.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }))
      acumActual.push(sActual)
      acumAnterior.push(sAnterior)
    }

    return {
      ventasPeriodo, ventasPeriodoPrev, ordenesCompletadasPeriodo, ticketPromedio,
      sparklinePeriodo, chartDatesPeriodo, top10,
      ventasPorDiaSemana,
      acumuladoActual: acumActual, acumuladoAnterior: acumAnterior, labelsAcumulado,
      ventasPorMetodoPeriodo,
    }
  }, [ordenes, movimientos, creditos, rango])

  const deltaPct = ventasPeriodoPrev > 0
    ? Math.round(((ventasPeriodo - ventasPeriodoPrev) / ventasPeriodoPrev) * 100)
    : null

  return (
    <MainLayout>
      <PageTopBar section="Reportes" title="Ventas" />
      <PageContainer>
        <div ref={reportRef}>
        <ReportHeader
          title="Ventas"
          description="Análisis de ventas del período seleccionado"
          actions={
            <ExportButton
              onClick={() => exportPDF(reportRef, 'reporte-ventas', `Reporte de Ventas — ${new Date().toLocaleDateString('es-BO')}`)}
            />
          }
        />

        <DateRangeFilter value={rango} onChange={setRango} />

        <ChartContainer
          title="Ventas por método de pago"
          subtitle="Contado por caja, crédito por fecha de otorgamiento — período seleccionado"
          minHeight={200}
          enableExport
          exportFilename="ventas-metodo-pago"
          className="mb-6"
        >
          <PaymentMethodBreakdown data={ventasPorMetodoPeriodo} size={170} thickness={28} />
        </ChartContainer>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Ventas del período" value={fmtBs(ventasPeriodo)} icon="ti-report-money" tone="brand"
            sub={deltaPct !== null ? `${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs período anterior` : undefined}
          />
          <KpiCard
            label="Período anterior" value={fmtBs(ventasPeriodoPrev)} icon="ti-history" tone="neutral"
            sub="Misma duración, previo al rango"
          />
          <KpiCard
            label="Órdenes completadas" value={String(ordenesCompletadasPeriodo)} icon="ti-shopping-cart" tone="gold"
            sub="En el período"
          />
          <KpiCard
            label="Ticket promedio" value={fmtBs(ticketPromedio)} icon="ti-receipt-2" tone="green"
            sub="En el período"
          />
        </div>

        <ChartContainer
          title="Ventas por día"
          subtitle="Tendencia diaria — período seleccionado"
          minHeight={220}
          enableExport
          exportFilename="ventas-periodo"
        >
          <div style={{ height: 200 }}>
            <SalesChart data={sparklinePeriodo} dates={chartDatesPeriodo} onHover={setChartHover} />
          </div>
        </ChartContainer>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-5">
          <ChartContainer
            title="Ventas por día de semana"
            subtitle="Período seleccionado — separadas por estado"
            minHeight={260}
            enableExport
            exportFilename="ventas-dia-semana"
          >
            <div style={{ height: 240 }}>
              <BarChart
                labels={ventasPorDiaSemana.labels}
                series={[
                  { name: 'Completada', color: '#3F7A52', data: ventasPorDiaSemana.completada },
                  { name: 'Cancelada',  color: '#C8102E', data: ventasPorDiaSemana.cancelada  },
                ]}
                mode="grouped"
                formatValue={fmtBs}
                showLegend
              />
            </div>
          </ChartContainer>

          <ChartContainer
            title="Comparación con período anterior"
            subtitle="Acumulado día a día"
            minHeight={260}
            enableExport
            exportFilename="ventas-acumulado"
          >
            <div style={{ height: 240 }}>
              <AreaChart
                labels={labelsAcumulado}
                series={[
                  { name: 'Período actual',    color: '#C8102E', data: acumuladoActual    },
                  { name: 'Período anterior',  color: '#3B82F6', data: acumuladoAnterior  },
                ]}
                height={240}
                formatValue={fmtBs}
              />
            </div>
          </ChartContainer>
        </div>

        <ChartContainer
          title="Top 10 productos"
          subtitle="Período seleccionado — ordenados por unidades"
          minHeight={380}
          enableExport
          exportFilename="top-10-productos"
        >
          {top10.length === 0 ? (
            <p className="text-sm text-steel-400 text-center py-10">Sin ventas en el período seleccionado</p>
          ) : (
            <HorizontalBarChart
              items={top10.map((p, i) => ({
                id: p.codigo || `top-${i}`,
                label: p.nombre || '—',
                sublabel: `${p.codigo} · ${fmtBs(p.ingreso)}`,
                value: p.unidades,
                displayValue: `${p.unidades} uds`,
              }))}
            />
          )}
        </ChartContainer>
        </div>
      </PageContainer>
    </MainLayout>
  )
}
