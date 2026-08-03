import { useEffect, useMemo, useRef, useState } from 'react'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { ServerPagination } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import {
  PRODUCTOS_REPORTE_KPI_QUERY,
  PRODUCTOS_STOCK_CRITICO_QUERY,
  PRODUCTOS_KITS_QUERY,
  type ProductoReporteKpiAPI,
  type ProductoStockCriticoAPI,
  type ProductoKitAPI,
} from '@/lib/queries/inventario.queries'
import { DASHBOARD_ORDENES_QUERY, backendOrdenToDashboard, type DashboardOrdenAPI, type DashboardOrden } from '@/lib/queries/ventas.queries'
import { TIPO_CAMBIO_QUERY, type TipoCambioAPI } from '@/lib/queries/config.queries'
import {
  ChartContainer,
  DonutChart,
  GaugeChart,
  formatBsShort,
  useChartExport,
} from '@/components/charts'

const STOCK_BAJO_MAX = 12
const STOCK_CRITICO_PAGE_SIZE = 25

const fmtBs  = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtUSD = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-4 rounded-full bg-brand-600" />
      <h2 className="text-[11px] font-bold text-steel-500 uppercase tracking-widest">{children}</h2>
    </div>
  )
}

// ────── Skeleton ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function InventarioReporteSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-3 w-40 rounded bg-steel-100 mb-2" />
        <div className="h-7 w-56 rounded bg-steel-100" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map(i => (
          <Card key={i} className="p-5 h-[100px]">
            <div className="h-3 w-24 rounded bg-steel-100 mb-3" />
            <div className="h-6 w-16 rounded bg-steel-100" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {[0, 1, 2].map(i => (
          <Card key={i} className="p-5 h-[280px]">
            <div className="h-3 w-32 rounded bg-steel-100 mb-5" />
            <div className="h-[190px] rounded-lg bg-steel-50" />
          </Card>
        ))}
      </div>

      <Card className="p-5 mb-5">
        <div className="h-3 w-48 rounded bg-steel-100 mb-5" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 rounded bg-steel-50" />
          ))}
        </div>
      </Card>
    </div>
  )
}

// ────── Fila "stock crítico" (compartida entre kits y productos normales) ──

interface StockCriticoRowData {
  id: string
  codigo: string
  nombre: string
  marca: string
  stock: number
}

function StockCriticoTable({ rows }: { rows: StockCriticoRowData[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-steel-100">
          <th className="pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px] text-left">Producto</th>
          <th className="pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px] text-center">Marca</th>
          <th className="pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px] text-center">Stock</th>
          <th className="pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px] text-center">Estado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(p => (
          <tr key={p.id} className="border-b border-steel-50 hover:bg-[#FAFAF9] transition-colors">
            <td className="py-3 pr-4">
              <p className="font-semibold text-steel-800 truncate max-w-[220px]">{p.nombre || '—'}</p>
              <p className="text-[10px] text-steel-400 mt-0.5 tabular-nums">{p.codigo}</p>
            </td>
            <td className="py-3 pr-4 text-center text-steel-500 font-semibold">{p.marca || '—'}</td>
            <td className="py-3 text-center">
              <span className={`text-base font-black tabular-nums ${p.stock === 0 ? 'text-brand-600' : 'text-amber-600'}`}>
                {p.stock}
              </span>
            </td>
            <td className="py-3 text-center">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                p.stock === 0 ? 'bg-brand-600 text-white' : 'bg-amber-500 text-white'
              }`}>
                {p.stock === 0 ? 'Sin stock' : 'Stock bajo'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ────── Página ──────────────────────────────────────────────────────────────

interface ProductoAgg {
  id: string
  codigo: string
  nombre: string
  marca: string
  stock: number
  precio_costo: number
}

function stockDeReporte(p: ProductoReporteKpiAPI): number {
  return p.esKit ? (p.calcularStockKitDisponible ?? p.calcularStockKit ?? 0) : (p.stock_Actual ?? 0)
}

function stockDeKit(p: ProductoKitAPI): number {
  return p.calcularStockKitDisponible ?? p.calcularStockKit ?? 0
}

function mapAgg(p: ProductoReporteKpiAPI): ProductoAgg {
  return {
    id: String(p.id),
    codigo: p.codigo,
    nombre: p.nombre ?? '',
    marca: p.marca?.nombre ?? '',
    stock: stockDeReporte(p),
    precio_costo: p.costo ?? 0,
  }
}

export function InventarioReportePage() {
  const { isTokenReady } = useAuth()
  const [isLoading,  setIsLoading]  = useState(true)
  const [productos,  setProductos]  = useState<ProductoAgg[]>([])
  const [ordenes,    setOrdenes]    = useState<DashboardOrden[]>([])
  const [tipoCambio, setTipoCambio] = useState<number>(6.96)
  const [kits,       setKits]       = useState<ProductoKitAPI[]>([])

  // ── Tabla "Stock crítico" (no-kit) — paginada server-side ──
  const [stockCriticoRows,     setStockCriticoRows]     = useState<ProductoStockCriticoAPI[]>([])
  const [stockCriticoTotal,    setStockCriticoTotal]    = useState(0)
  const [stockCriticoHasNext,  setStockCriticoHasNext]  = useState(false)
  const [stockCriticoPage,     setStockCriticoPage]     = useState(0)
  const [stockCriticoPageSize, setStockCriticoPageSize] = useState(STOCK_CRITICO_PAGE_SIZE)
  const [stockCriticoLoading,  setStockCriticoLoading]  = useState(true)
  const stockCriticoCursors = useRef<(string | null)[]>([null])

  const reportRef = useRef<HTMLDivElement | null>(null)
  const { exportPDF } = useChartExport()

  const loadStockCritico = (targetPage: number, size: number) => {
    setStockCriticoLoading(true)
    gql<{
      productos: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: ProductoStockCriticoAPI[] }
    }>(
      PRODUCTOS_STOCK_CRITICO_QUERY,
      { first: size, after: stockCriticoCursors.current[targetPage] ?? null, maxStock: STOCK_BAJO_MAX }
    )
      .then(res => {
        const { totalCount, pageInfo, nodes } = res.productos
        setStockCriticoRows(nodes)
        setStockCriticoTotal(totalCount)
        setStockCriticoHasNext(pageInfo.hasNextPage)
        stockCriticoCursors.current[targetPage + 1] = pageInfo.endCursor
        setStockCriticoPage(targetPage)
      })
      .catch(() => {})
      .finally(() => setStockCriticoLoading(false))
  }

  const handleStockCriticoPage = (p: number) => loadStockCritico(p, stockCriticoPageSize)
  const handleStockCriticoPageSize = (size: number) => {
    stockCriticoCursors.current = [null]
    setStockCriticoPageSize(size)
    loadStockCritico(0, size)
  }

  useEffect(() => {
    if (!isTokenReady) return
    setIsLoading(true)
    const hace30ISO = new Date(Date.now() - 30 * 86400000).toISOString()
    Promise.all([
      gql<{ productos: { nodes: ProductoReporteKpiAPI[] } }>(PRODUCTOS_REPORTE_KPI_QUERY)
        .then(res => setProductos(res.productos.nodes.map(mapAgg))),
      gql<{ todasOrdenes: { nodes: DashboardOrdenAPI[] } }>(DASHBOARD_ORDENES_QUERY, { desde: hace30ISO, first: 2000 })
        .then(res => setOrdenes(res.todasOrdenes.nodes.map(backendOrdenToDashboard))),
      gql<{ tipoCambio: TipoCambioAPI }>(TIPO_CAMBIO_QUERY)
        .then(res => setTipoCambio(res.tipoCambio.precioDolar)),
      gql<{ productos: { nodes: ProductoKitAPI[] } }>(PRODUCTOS_KITS_QUERY, { first: 2000 })
        .then(res => setKits(res.productos.nodes)),
    ])
      .catch(() => {})
      .finally(() => setIsLoading(false))
    loadStockCritico(0, STOCK_CRITICO_PAGE_SIZE)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenReady])

  const kitsStockCritico = useMemo<StockCriticoRowData[]>(() => (
    kits
      .map(p => ({ id: String(p.id), codigo: p.codigo, nombre: p.nombre ?? '', marca: p.marca?.nombre ?? '', stock: stockDeKit(p) }))
      .filter(p => p.stock <= STOCK_BAJO_MAX)
      .sort((a, b) => a.stock - b.stock)
  ), [kits])

  const stockCriticoRowsData = useMemo<StockCriticoRowData[]>(() => (
    stockCriticoRows.map(p => ({ id: String(p.id), codigo: p.codigo, nombre: p.nombre ?? '', marca: p.marca?.nombre ?? '', stock: p.stock_Actual }))
  ), [stockCriticoRows])

  const stockCriticoTotalCount = stockCriticoTotal + kitsStockCritico.length

  const {
    totalUnidades, valorUSD, valorBs, sinMovimiento,
    donutMarcas, pctStockCritico, pctSinMovimiento,
  } = useMemo(() => {
    const totalUnidades = productos.reduce((s, p) => s + p.stock, 0)
    const valorBs        = productos.reduce((s, p) => s + p.stock * p.precio_costo, 0)
    const valorUSD        = valorBs / tipoCambio

    const hace30 = new Date(Date.now() - 30 * 86400000)
    const vendidos30d = new Set(
      ordenes
        .filter(o => o.estado === 'completada' && o.fechaCompletada && new Date(o.fechaCompletada) >= hace30)
        .flatMap(o => o.items.map(i => i.productoId))
    )
    const sinMovimiento = productos.filter(p => !vendidos30d.has(p.id))

    // Donut: valor del inventario agrupado por marca (Top 6 + "Otras")
    const porMarca = new Map<string, number>()
    for (const p of productos) {
      const key = p.marca || 'Sin marca'
      porMarca.set(key, (porMarca.get(key) ?? 0) + p.stock * p.precio_costo)
    }
    const sortedMarcas = [...porMarca.entries()].sort((a, b) => b[1] - a[1])
    const TOP = 6
    const topMarcas = sortedMarcas.slice(0, TOP)
    const otrasMarcas = sortedMarcas.slice(TOP)
    const sumaOtras = otrasMarcas.reduce((s, [, v]) => s + v, 0)
    const donutMarcas = [
      ...topMarcas.map(([label, value]) => ({ label, value })),
      ...(sumaOtras > 0 ? [{ label: `Otras (${otrasMarcas.length})`, value: sumaOtras }] : []),
    ]

    // Gauges
    const pctStockCritico  = productos.length > 0
      ? (stockCriticoTotalCount / productos.length) * 100 : 0
    const pctSinMovimiento = productos.length > 0
      ? (sinMovimiento.length / productos.length) * 100 : 0

    return {
      totalUnidades, valorUSD, valorBs, sinMovimiento,
      donutMarcas, pctStockCritico, pctSinMovimiento,
    }
  }, [productos, ordenes, tipoCambio, stockCriticoTotalCount])

  if (isLoading) {
    return (
      <MainLayout>
        <PageTopBar section="Reportes" title="Inventario" />
        <PageContainer>
          <InventarioReporteSkeleton />
        </PageContainer>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <PageTopBar section="Reportes" title="Inventario" />
      <PageContainer>
        <div ref={reportRef}>
        <PageHeader
          title="Inventario"
          description="Estado actual del stock y valor del inventario"
          actions={
            <button
              onClick={() => exportPDF(reportRef, 'reporte-inventario', `Reporte de Inventario — ${new Date().toLocaleDateString('es-BO')}`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-steel-200 hover:border-brand-600 hover:text-brand-600 text-steel-600 text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Exportar PDF
            </button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Productos activos" value={String(productos.length)} />
          <KpiCard label="Total unidades"    value={totalUnidades.toLocaleString()} />
          <KpiCard label="Valor inventario"  value={fmtUSD(valorUSD)} sub={fmtBs(valorBs)} />
          <KpiCard label="Stock crítico"     value={String(stockCriticoTotalCount)} sub={`Stock ≤ ${STOCK_BAJO_MAX} unidades`} accent={stockCriticoTotalCount > 0} />
        </div>

        {/* ─── Charts ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <div className="lg:col-span-1">
            <ChartContainer
              title="Valor por marca"
              subtitle="Top 6 marcas + agrupadas"
              minHeight={240}
              enableExport
              exportFilename="inventario-valor-marca"
            >
              <div className="flex flex-col items-center">
                <DonutChart
                  segments={donutMarcas}
                  size={170}
                  thickness={26}
                  formatValue={(v) => `Bs ${formatBsShort(v)}`}
                  centerLabel="Total"
                  centerValue={`Bs ${formatBsShort(valorBs)}`}
                  centerSub={`${productos.length} productos`}
                />
              </div>
            </ChartContainer>
          </div>

          <div className="lg:col-span-1">
            <ChartContainer
              title="Stock crítico"
              subtitle={`Stock ≤ ${STOCK_BAJO_MAX} unidades`}
              minHeight={240}
            >
              <GaugeChart
                value={pctStockCritico}
                label="Stock crítico"
                sublabel={`${stockCriticoTotalCount} de ${productos.length}`}
              />
            </ChartContainer>
          </div>

          <div className="lg:col-span-1">
            <ChartContainer
              title="Sin movimiento"
              subtitle="Sin ventas en 30 días"
              minHeight={240}
            >
              <GaugeChart
                value={pctSinMovimiento}
                label="Sin movimiento"
                sublabel={`${sinMovimiento.length} de ${productos.length}`}
                thresholds={{ ok: 25, warn: 50 }}
              />
            </ChartContainer>
          </div>
        </div>

        {/* Stock crítico */}
        <Card className="p-5 mb-5">
          <SectionTitle>{`Stock crítico — stock ≤ ${STOCK_BAJO_MAX} unidades (${stockCriticoTotalCount})`}</SectionTitle>
          {stockCriticoTotalCount === 0 ? (
            <div className="flex items-center gap-3 py-10 justify-center">
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-steel-400">Ningún producto con stock ≤ {STOCK_BAJO_MAX}</span>
            </div>
          ) : (
            <>
              {kitsStockCritico.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-steel-400 uppercase tracking-widest mb-2">
                    Kits ({kitsStockCritico.length})
                  </p>
                  <StockCriticoTable rows={kitsStockCritico} />
                </div>
              )}

              {(stockCriticoRowsData.length > 0 || stockCriticoLoading) && (
                <div>
                  {kitsStockCritico.length > 0 && (
                    <p className="text-[10px] font-bold text-steel-400 uppercase tracking-widest mb-2">Productos</p>
                  )}
                  <StockCriticoTable rows={stockCriticoRowsData} />
                  <div className="mt-4 pt-4 border-t border-steel-100">
                    <ServerPagination
                      totalCount={stockCriticoTotal}
                      page={stockCriticoPage}
                      pageSize={stockCriticoPageSize}
                      hasNextPage={stockCriticoHasNext}
                      loading={stockCriticoLoading}
                      onPage={handleStockCriticoPage}
                      onPageSize={handleStockCriticoPageSize}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Sin movimiento */}
        <Card className="p-5">
          <SectionTitle>Sin movimiento — últimos 30 días ({sinMovimiento.length})</SectionTitle>
          {sinMovimiento.length === 0 ? (
            <p className="text-sm text-steel-400 text-center py-10">Todos los productos tuvieron ventas en los últimos 30 días</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-steel-100">
                  <th className="text-left pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Producto</th>
                  <th className="text-left pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Marca</th>
                  <th className="text-center pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Stock</th>
                  <th className="text-right pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Valor parado</th>
                </tr>
              </thead>
              <tbody>
                {sinMovimiento.map(p => (
                  <tr key={p.id} className="border-b border-steel-50 hover:bg-[#FAFAF9] transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-steel-800 truncate max-w-[300px]">{p.nombre}</p>
                      <p className="text-[10px] text-steel-400 mt-0.5 tabular-nums">{p.codigo}</p>
                    </td>
                    <td className="py-3 pr-4 text-steel-500 font-semibold">{p.marca || '—'}</td>
                    <td className="py-3 text-center font-bold text-steel-700 tabular-nums">{p.stock}</td>
                    <td className="py-3 text-right text-steel-500 tabular-nums">{fmtBs(p.stock * p.precio_costo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        </div>
      </PageContainer>
    </MainLayout>
  )
}
