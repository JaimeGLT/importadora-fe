import { useEffect, useMemo, useState } from 'react'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { PRODUCTOS_QUERY, backendToProductoSimple, type ProductoAPI } from '@/lib/queries/inventario.queries'
import { DASHBOARD_ORDENES_QUERY, backendOrdenToDashboard, type DashboardOrdenAPI, type DashboardOrden } from '@/lib/queries/ventas.queries'
import { TIPO_CAMBIO_QUERY, type TipoCambioAPI } from '@/lib/queries/config.queries'
import type { Producto } from '@/types'

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

export function InventarioReportePage() {
  const { isTokenReady } = useAuth()
  const [productos,  setProductos]  = useState<Producto[]>([])
  const [ordenes,    setOrdenes]    = useState<DashboardOrden[]>([])
  const [tipoCambio, setTipoCambio] = useState<number>(6.96)

  useEffect(() => {
    if (!isTokenReady) return
    gql<{ productos: { nodes: ProductoAPI[] } }>(PRODUCTOS_QUERY, { first: 9999, after: null })
      .then(res => setProductos(res.productos.nodes.map(backendToProductoSimple)))
      .catch(() => {})
    gql<{ todasOrdenes: { nodes: DashboardOrdenAPI[] } }>(DASHBOARD_ORDENES_QUERY)
      .then(res => setOrdenes(res.todasOrdenes.nodes.map(backendOrdenToDashboard)))
      .catch(() => {})
    gql<{ tipoCambio: TipoCambioAPI }>(TIPO_CAMBIO_QUERY)
      .then(res => setTipoCambio(res.tipoCambio.precioDolar))
      .catch(() => {})
  }, [isTokenReady])

  const { productosActivos, totalUnidades, valorUSD, valorBs, stockCritico, sinMovimiento } = useMemo(() => {
    const productosActivos = productos.filter(p => p.estado === 'activo')
    const totalUnidades    = productosActivos.reduce((s, p) => s + p.stock, 0)
    const valorBs          = productosActivos.reduce((s, p) => s + p.stock * p.precio_costo, 0)
    const valorUSD         = valorBs / tipoCambio

    const stockCritico = productosActivos
      .filter(p => p.stock <= p.stock_minimo)
      .sort((a, b) => (a.stock - a.stock_minimo) - (b.stock - b.stock_minimo))

    const hace30 = new Date(Date.now() - 30 * 86400000)
    const vendidos30d = new Set(
      ordenes
        .filter(o => o.estado === 'completada' && o.fechaCompletada && new Date(o.fechaCompletada) >= hace30)
        .flatMap(o => o.items.map(i => i.productoId))
    )
    const sinMovimiento = productosActivos.filter(p => !vendidos30d.has(p.id))

    return { productosActivos, totalUnidades, valorUSD, valorBs, stockCritico, sinMovimiento }
  }, [productos, ordenes, tipoCambio])

  return (
    <MainLayout>
      <PageTopBar section="Reportes" title="Inventario" />
      <PageContainer>
        <PageHeader title="Inventario" description="Estado actual del stock y valor del inventario" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Productos activos" value={String(productosActivos.length)} />
          <KpiCard label="Total unidades"    value={totalUnidades.toLocaleString()} />
          <KpiCard label="Valor inventario"  value={fmtUSD(valorUSD)} sub={fmtBs(valorBs)} />
          <KpiCard label="Stock crítico"     value={String(stockCritico.length)} sub="Bajo el mínimo" accent={stockCritico.length > 0} />
        </div>

        {/* Stock crítico */}
        <Card className="p-5 mb-5">
          <SectionTitle>Stock crítico — productos bajo mínimo</SectionTitle>
          {stockCritico.length === 0 ? (
            <div className="flex items-center gap-3 py-10 justify-center">
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-steel-400">Todos los productos sobre el mínimo</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-steel-100">
                  <th className="text-left pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Producto</th>
                  <th className="text-center pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Stock</th>
                  <th className="text-center pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Mínimo</th>
                  <th className="text-center pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Diferencia</th>
                  <th className="text-left pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Estado</th>
                </tr>
              </thead>
              <tbody>
                {stockCritico.map(p => (
                  <tr key={p.id} className="border-b border-steel-50 hover:bg-[#FAFAF9] transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-steel-800 truncate max-w-[220px]">{p.nombre}</p>
                      <p className="text-[10px] text-steel-400 mt-0.5 tabular-nums">{p.codigo_universal}</p>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`text-base font-black tabular-nums ${p.stock === 0 ? 'text-brand-600' : 'text-amber-600'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3 text-center text-steel-400 font-semibold tabular-nums">{p.stock_minimo}</td>
                    <td className="py-3 text-center">
                      <span className="text-xs font-bold text-brand-600 tabular-nums">{p.stock - p.stock_minimo}</span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.stock === 0 ? 'bg-brand-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {p.stock === 0 ? 'Sin stock' : 'Bajo mínimo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <th className="text-center pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Stock</th>
                  <th className="text-right pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Valor parado</th>
                </tr>
              </thead>
              <tbody>
                {sinMovimiento.map(p => (
                  <tr key={p.id} className="border-b border-steel-50 hover:bg-[#FAFAF9] transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-steel-800 truncate max-w-[300px]">{p.nombre}</p>
                      <p className="text-[10px] text-steel-400 mt-0.5 tabular-nums">{p.codigo_universal}</p>
                    </td>
                    <td className="py-3 text-center font-bold text-steel-700 tabular-nums">{p.stock}</td>
                    <td className="py-3 text-right text-steel-500 tabular-nums">{fmtBs(p.stock * p.precio_costo)}</td>
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
