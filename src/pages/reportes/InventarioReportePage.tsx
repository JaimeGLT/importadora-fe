import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { ServerPagination } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import {
  PRODUCTOS_REPORTE_KPI_QUERY,
  PRODUCTOS_STOCK_CRITICO_QUERY,
  PRODUCTOS_KITS_QUERY,
  PRODUCTOS_SIN_MOVIMIENTO_QUERY,
  type ProductoReporteKpiAPI,
  type ProductoStockCriticoAPI,
  type ProductoKitAPI,
  type ProductoSinMovimientoAPI,
} from '@/lib/queries/inventario.queries'
import { TIPO_CAMBIO_QUERY, type TipoCambioAPI } from '@/lib/queries/config.queries'
import {
  ChartContainer,
  DonutChart,
  GaugeChart,
  formatBsShort,
  useChartExport,
} from '@/components/charts'
import { Card, KpiCard, SectionTitle, ReportHeader, ExportButton } from '@/components/reportes/ReportUI'

const STOCK_BAJO_MAX = 12
const STOCK_CRITICO_PAGE_SIZE = 25

const fmtBs  = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtUSD = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

// ────── Skeleton ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function InventarioReporteSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-3 w-40 rounded bg-[#F0EFEC] mb-2" />
        <div className="h-7 w-56 rounded bg-[#F0EFEC]" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map(i => (
          <Card key={i} className="p-5 h-[100px]">
            <div className="h-3 w-24 rounded bg-[#F0EFEC] mb-3" />
            <div className="h-6 w-16 rounded bg-[#F0EFEC]" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {[0, 1, 2].map(i => (
          <Card key={i} className="p-5 h-[280px]">
            <div className="h-3 w-32 rounded bg-[#F0EFEC] mb-5" />
            <div className="h-[190px] rounded-lg bg-[#F5F0EB]" />
          </Card>
        ))}
      </div>

      <Card className="p-5 mb-5">
        <div className="h-3 w-48 rounded bg-[#F0EFEC] mb-5" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 rounded bg-[#F5F0EB]" />
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
        <tr className="bg-[#F5F0EB] border-b border-[#D0CBC4]">
          <th className="px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px] text-left">Producto</th>
          <th className="px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px] text-center">Marca</th>
          <th className="px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px] text-center">Stock</th>
          <th className="px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px] text-center">Estado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(p => (
          <tr key={p.id} className="border-b border-[#E8E5E2] hover:bg-[#FAF5EE] transition-colors group">
            <td className="py-3 pr-4 px-3">
              <p className="font-semibold text-[#2D2B2A] truncate max-w-[220px] group-hover:text-[#780e18] transition-colors">{p.nombre || '—'}</p>
              <p className="text-[10px] text-[#7A7571] mt-0.5 tabular-nums">{p.codigo}</p>
            </td>
            <td className="py-3 pr-4 text-center text-[#4A4744] font-semibold">{p.marca || '—'}</td>
            <td className="py-3 text-center">
              <span className={`text-base font-black tabular-nums ${p.stock === 0 ? 'text-[#8A1E12]' : 'text-[#7A5200]'}`}>
                {p.stock}
              </span>
            </td>
            <td className="py-3 text-center">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                p.stock === 0 ? 'bg-[#F5C9C0] text-[#8A1E12]' : 'bg-[#F5E0A8] text-[#7A5200]'
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
  const location = useLocation()
  const [isLoading,  setIsLoading]  = useState(true)
  const [productos,  setProductos]  = useState<ProductoAgg[]>([])
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

  // ── Tabla "Sin movimiento" (no-kit, 30 días) — paginada server-side ──
  const [sinMovRows,     setSinMovRows]     = useState<ProductoSinMovimientoAPI[]>([])
  const [sinMovTotal,    setSinMovTotal]    = useState(0)
  const [sinMovHasNext,  setSinMovHasNext]  = useState(false)
  const [sinMovPage,     setSinMovPage]     = useState(0)
  const [sinMovPageSize, setSinMovPageSize] = useState(STOCK_CRITICO_PAGE_SIZE)
  const [sinMovLoading,  setSinMovLoading]  = useState(true)
  const sinMovCursors = useRef<(string | null)[]>([null])

  const reportRef = useRef<HTMLDivElement | null>(null)
  const stockCriticoRef = useRef<HTMLDivElement | null>(null)
  const { exportPDF } = useChartExport()

  const scrollToStockCritico = () => {
    stockCriticoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

  const loadSinMovimiento = (targetPage: number, size: number) => {
    setSinMovLoading(true)
    const hace30ISO = new Date(Date.now() - 30 * 86400000).toISOString()
    gql<{
      productosSinMovimiento: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: ProductoSinMovimientoAPI[] }
    }>(
      PRODUCTOS_SIN_MOVIMIENTO_QUERY,
      { first: size, after: sinMovCursors.current[targetPage] ?? null, desde: hace30ISO }
    )
      .then(res => {
        const { totalCount, pageInfo, nodes } = res.productosSinMovimiento
        setSinMovRows(nodes)
        setSinMovTotal(totalCount)
        setSinMovHasNext(pageInfo.hasNextPage)
        sinMovCursors.current[targetPage + 1] = pageInfo.endCursor
        setSinMovPage(targetPage)
      })
      .catch(() => {})
      .finally(() => setSinMovLoading(false))
  }

  const handleSinMovPage = (p: number) => loadSinMovimiento(p, sinMovPageSize)
  const handleSinMovPageSize = (size: number) => {
    sinMovCursors.current = [null]
    setSinMovPageSize(size)
    loadSinMovimiento(0, size)
  }

  useEffect(() => {
    if (!isTokenReady) return
    setIsLoading(true)
    Promise.all([
      gql<{ productos: { nodes: ProductoReporteKpiAPI[] } }>(PRODUCTOS_REPORTE_KPI_QUERY)
        .then(res => setProductos(res.productos.nodes.map(mapAgg))),
      gql<{ tipoCambio: TipoCambioAPI }>(TIPO_CAMBIO_QUERY)
        .then(res => setTipoCambio(res.tipoCambio.precioDolar)),
      gql<{ productos: { nodes: ProductoKitAPI[] } }>(PRODUCTOS_KITS_QUERY, { first: 2000 })
        .then(res => setKits(res.productos.nodes)),
    ])
      .catch(() => {})
      .finally(() => setIsLoading(false))
    loadStockCritico(0, STOCK_CRITICO_PAGE_SIZE)
    loadSinMovimiento(0, STOCK_CRITICO_PAGE_SIZE)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenReady])

  useEffect(() => {
    if (isLoading) return
    const state = location.state as { scrollTo?: string } | null
    if (state?.scrollTo === 'stock-critico') {
      scrollToStockCritico()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

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
    totalUnidades, valorUSD, valorBs,
    donutMarcas, pctStockCritico, pctSinMovimiento,
  } = useMemo(() => {
    const totalUnidades = productos.reduce((s, p) => s + p.stock, 0)
    const valorBs        = productos.reduce((s, p) => s + p.stock * p.precio_costo, 0)
    const valorUSD        = valorBs / tipoCambio

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
      ? (sinMovTotal / productos.length) * 100 : 0

    return {
      totalUnidades, valorUSD, valorBs,
      donutMarcas, pctStockCritico, pctSinMovimiento,
    }
  }, [productos, tipoCambio, stockCriticoTotalCount, sinMovTotal])

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
        <ReportHeader
          title="Inventario"
          description="Estado actual del stock y valor del inventario"
          actions={
            <ExportButton
              onClick={() => exportPDF(reportRef, 'reporte-inventario', `Reporte de Inventario — ${new Date().toLocaleDateString('es-BO')}`)}
            />
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Productos activos" value={String(productos.length)} icon="ti-package" tone="neutral" />
          <KpiCard label="Total unidades"    value={totalUnidades.toLocaleString()} icon="ti-cube" tone="gold" />
          <KpiCard label="Valor inventario"  value={fmtUSD(valorUSD)} sub={fmtBs(valorBs)} icon="ti-currency-dollar" tone="green" />
          <KpiCard
            label="Stock crítico" value={String(stockCriticoTotalCount)} sub={`Stock ≤ ${STOCK_BAJO_MAX} unidades`}
            icon="ti-alert-triangle" tone={stockCriticoTotalCount > 0 ? 'red' : 'neutral'}
            onClick={scrollToStockCritico}
          />
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
                sublabel={`${sinMovTotal} de ${productos.length}`}
                thresholds={{ ok: 25, warn: 50 }}
              />
            </ChartContainer>
          </div>
        </div>

        {/* Stock crítico */}
        <Card className="p-5 mb-5" ref={stockCriticoRef}>
          <SectionTitle>{`Stock crítico — stock ≤ ${STOCK_BAJO_MAX} unidades (${stockCriticoTotalCount})`}</SectionTitle>
          {stockCriticoTotalCount === 0 ? (
            <div className="flex items-center gap-3 py-10 justify-center">
              <div className="h-10 w-10 rounded-full bg-[#B8DCCA] flex items-center justify-center">
                <svg className="h-5 w-5 text-[#1E5C38]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[#7A7571]">Ningún producto con stock ≤ {STOCK_BAJO_MAX}</span>
            </div>
          ) : (
            <>
              {kitsStockCritico.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-[#7A7571] uppercase tracking-widest mb-2">
                    Kits ({kitsStockCritico.length})
                  </p>
                  <StockCriticoTable rows={kitsStockCritico} />
                </div>
              )}

              {(stockCriticoRowsData.length > 0 || stockCriticoLoading) && (
                <div>
                  {kitsStockCritico.length > 0 && (
                    <p className="text-[10px] font-bold text-[#7A7571] uppercase tracking-widest mb-2">Productos</p>
                  )}
                  <StockCriticoTable rows={stockCriticoRowsData} />
                  <div className="mt-4 pt-4 border-t border-[#E8E5E2]">
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
          <SectionTitle>Sin movimiento — últimos 30 días ({sinMovTotal})</SectionTitle>
          {sinMovTotal === 0 && !sinMovLoading ? (
            <p className="text-sm text-[#7A7571] text-center py-10">Todos los productos tuvieron ventas en los últimos 30 días</p>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F5F0EB] border-b border-[#D0CBC4]">
                    <th className="text-left px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px]">Producto</th>
                    <th className="text-left px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px]">Marca</th>
                    <th className="text-center px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px]">Stock</th>
                    <th className="text-right px-3 py-[11px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] text-[10.5px]">Valor parado</th>
                  </tr>
                </thead>
                <tbody>
                  {sinMovRows.map(p => (
                    <tr key={p.id} className="border-b border-[#E8E5E2] hover:bg-[#FAF5EE] transition-colors group">
                      <td className="py-3 pr-4 px-3">
                        <p className="font-semibold text-[#2D2B2A] truncate max-w-[300px] group-hover:text-[#780e18] transition-colors">{p.nombre}</p>
                        <p className="text-[10px] text-[#7A7571] mt-0.5 tabular-nums">{p.codigo}</p>
                      </td>
                      <td className="py-3 pr-4 text-[#4A4744] font-semibold">{p.marca?.nombre || '—'}</td>
                      <td className="py-3 text-center font-bold text-[#2D2B2A] tabular-nums">{p.stock_Actual}</td>
                      <td className="py-3 text-right text-[#4A4744] tabular-nums">{fmtBs(p.stock_Actual * p.costo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-[#E8E5E2]">
                <ServerPagination
                  totalCount={sinMovTotal}
                  page={sinMovPage}
                  pageSize={sinMovPageSize}
                  hasNextPage={sinMovHasNext}
                  loading={sinMovLoading}
                  onPage={handleSinMovPage}
                  onPageSize={handleSinMovPageSize}
                />
              </div>
            </>
          )}
        </Card>
        </div>
      </PageContainer>
    </MainLayout>
  )
}
