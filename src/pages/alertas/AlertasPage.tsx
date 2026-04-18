import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useInventarioStore } from '@/stores/inventarioStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { MOCK_PRODUCTOS, MOCK_PROVEEDORES } from '@/mock/inventario'
import { MOCK_RESUMEN_VENTAS } from '@/mock/alertas'
import type { Producto, Proveedor } from '@/types'
import type { ResumenVentas } from '@/mock/alertas'

// ─── Types ────────────────────────────────────────────────────────────────────

type Urgencia = 'critico' | 'urgente' | 'advertencia'

interface AlertaStock {
  producto: Producto
  proveedor: Proveedor | undefined
  velocidad_diaria: number
  dias_restantes: number
  urgencia: Urgencia
}

interface AlertaDemanda {
  producto: Producto
  unidades_7d: number
  unidades_prev7d: number
  pct_aumento: number
  velocidad_reciente: number
  velocidad_anterior: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDias(n: number): string {
  if (!isFinite(n)) return '—'
  if (n < 1) return 'Hoy'
  return `${Math.round(n)} día${Math.round(n) !== 1 ? 's' : ''}`
}

function fmtVelocidad(v: number): string {
  if (v === 0) return 'Sin ventas recientes'
  if (v < 1) return `${(v * 7).toFixed(1)} uds/semana`
  return `${v.toFixed(1)} uds/día`
}

const URGENCIA_CONFIG: Record<Urgencia, {
  label: string
  bg: string
  border: string
  badge: string
  badgeText: string
  dot: string
}> = {
  critico: {
    label: 'Crítico',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    badgeText: 'CRÍTICO',
    dot: 'bg-red-500',
  },
  urgente: {
    label: 'Urgente',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    badgeText: 'URGENTE',
    dot: 'bg-amber-500',
  },
  advertencia: {
    label: 'Advertencia',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    badgeText: 'ADVERTENCIA',
    dot: 'bg-yellow-400',
  },
}

const PAIS_FLAG: Record<string, string> = {
  China: '🇨🇳',
  'Estados Unidos': '🇺🇸',
  México: '🇲🇽',
  Japón: '🇯🇵',
  Alemania: '🇩🇪',
  Brasil: '🇧🇷',
}

// ─── AlertaStockCard ──────────────────────────────────────────────────────────

function AlertaStockCard({ alerta }: { alerta: AlertaStock }) {
  const { producto, proveedor, velocidad_diaria, dias_restantes, urgencia } = alerta
  const cfg = URGENCIA_CONFIG[urgencia]
  const leadTime = proveedor?.tiempo_reposicion_dias ?? 0
  const pais = proveedor?.pais ?? ''
  const flag = PAIS_FLAG[pais] ?? '🌍'

  // Stock gauge: percentage toward minimum (inverted — near 0 = bad)
  const stockPct = Math.min(100, producto.stock_minimo > 0
    ? Math.round((producto.stock / producto.stock_minimo) * 100)
    : 100)

  // Days remaining bar: how far from lead time (capped at 2×)
  const daysPct = leadTime > 0 && isFinite(dias_restantes)
    ? Math.min(100, Math.round((dias_restantes / leadTime) * 100))
    : (isFinite(dias_restantes) ? 100 : 0)

  const mensaje = (() => {
    if (producto.stock === 0)
      return `Sin stock. Tu proveedor de ${pais} tarda ${leadTime} días. Pedido urgente.`
    if (!isFinite(dias_restantes))
      return `Stock bajo el mínimo y sin ventas recientes. Verifica si hay demanda pendiente.`
    const diasStr = Math.round(dias_restantes)
    if (proveedor && isFinite(dias_restantes))
      return `Tienes ${producto.stock} ${producto.unidad}${producto.stock !== 1 ? 's' : ''}. Con tu ritmo de ventas te ${diasStr === 1 ? 'dura' : 'duran'} ${diasStr} día${diasStr !== 1 ? 's' : ''}. Tu proveedor de ${pais} tarda ${leadTime} días. ${dias_restantes < leadTime ? 'Se recomienda hacer el pedido ahora.' : 'Considera reponer pronto.'}`
    return `Stock por debajo del mínimo configurado (${producto.stock_minimo} ${producto.unidad}s).`
  })()

  return (
    <div className={clsx('rounded-xl border p-5 transition-all', cfg.bg, cfg.border)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full', cfg.badge)}>
            <span className={clsx('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.badgeText}
          </span>
          {proveedor && (
            <span className="text-xs text-steel-500 font-medium">
              {flag} {proveedor.nombre} · {leadTime} días
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-steel-400 shrink-0">{producto.codigo_universal}</span>
      </div>

      {/* Product info */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-steel-900 leading-snug">{producto.nombre}</p>
        <p className="text-xs text-steel-400 mt-0.5">📦 {producto.ubicacion} · {producto.marca}</p>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Stock */}
        <div>
          <p className="text-xs text-steel-400 mb-1">Stock actual / mínimo</p>
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className={clsx('text-2xl font-bold tabular-nums',
              producto.stock === 0 ? 'text-red-600' : urgencia === 'urgente' ? 'text-amber-600' : 'text-yellow-600')}>
              {producto.stock}
            </span>
            <span className="text-xs text-steel-400">/ mín. {producto.stock_minimo} {producto.unidad}s</span>
          </div>
          <div className="h-1.5 bg-steel-200 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all',
                stockPct <= 0 ? 'w-0' : stockPct < 50 ? 'bg-red-500' : 'bg-amber-400')}
              style={{ width: `${Math.max(stockPct, stockPct > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>

        {/* Days remaining */}
        <div>
          <p className="text-xs text-steel-400 mb-1">Días de stock restantes</p>
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className={clsx('text-2xl font-bold tabular-nums',
              !isFinite(dias_restantes) ? 'text-steel-400'
              : dias_restantes < leadTime / 2 ? 'text-red-600'
              : dias_restantes < leadTime ? 'text-amber-600'
              : 'text-yellow-600')}>
              {isFinite(dias_restantes) ? Math.round(dias_restantes) : '∞'}
            </span>
            <span className="text-xs text-steel-400">días</span>
          </div>
          {isFinite(dias_restantes) && leadTime > 0 && (
            <div className="h-1.5 bg-steel-200 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full',
                  daysPct < 50 ? 'bg-red-500' : 'bg-amber-400')}
                style={{ width: `${Math.max(daysPct, daysPct > 0 ? 3 : 0)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Velocity */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-white/60 rounded-lg">
        <svg className="h-3.5 w-3.5 text-steel-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-xs text-steel-600">
          Velocidad: <strong>{fmtVelocidad(velocidad_diaria)}</strong>
          {isFinite(dias_restantes) && velocidad_diaria > 0 && (
            <span className="text-steel-400"> · Stock estimado hasta: <strong>{fmtDias(dias_restantes)}</strong></span>
          )}
        </span>
      </div>

      {/* Message */}
      <p className="text-xs text-steel-600 leading-relaxed mb-4 border-l-2 border-current pl-3 opacity-80">
        {mensaje}
      </p>

      {/* Footer */}
      <Link to="/inventario"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-steel-500 hover:text-steel-800 transition-colors">
        Ver en inventario
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}

// ─── AlertaDemandaCard ────────────────────────────────────────────────────────

function AlertaDemandaCard({ alerta }: { alerta: AlertaDemanda }) {
  const { producto, unidades_7d, unidades_prev7d, pct_aumento, velocidad_reciente, velocidad_anterior } = alerta

  const maxUnits = Math.max(unidades_7d, unidades_prev7d, 1)
  const prevPct  = Math.round((unidades_prev7d / maxUnits) * 100)
  const recPct   = Math.round((unidades_7d / maxUnits) * 100)

  const intensity = pct_aumento >= 200 ? 'high' : pct_aumento >= 100 ? 'mid' : 'low'

  return (
    <div className="bg-white rounded-xl border border-steel-200 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full',
            intensity === 'high' ? 'bg-purple-100 text-purple-700'
            : intensity === 'mid'  ? 'bg-indigo-100 text-indigo-700'
            : 'bg-blue-100 text-blue-700')}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            +{Math.round(pct_aumento)}% demanda
          </span>
        </div>
        <span className="text-xs font-mono text-steel-400 shrink-0">{producto.codigo_universal}</span>
      </div>

      {/* Product */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-steel-900">{producto.nombre}</p>
        <p className="text-xs text-steel-400 mt-0.5">{producto.marca} · {producto.vehiculo}</p>
      </div>

      {/* Comparison bars */}
      <div className="space-y-2.5 mb-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-steel-400">Período anterior (7 días)</span>
            <span className="text-xs font-semibold text-steel-600 tabular-nums">{unidades_prev7d} uds</span>
          </div>
          <div className="h-2 bg-steel-100 rounded-full overflow-hidden">
            <div className="h-full bg-steel-300 rounded-full" style={{ width: `${prevPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-steel-700">Últimos 7 días</span>
            <span className={clsx('text-xs font-bold tabular-nums',
              intensity === 'high' ? 'text-purple-700' : intensity === 'mid' ? 'text-indigo-700' : 'text-blue-700')}>
              {unidades_7d} uds
            </span>
          </div>
          <div className="h-2 bg-steel-100 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full',
                intensity === 'high' ? 'bg-purple-500' : intensity === 'mid' ? 'bg-indigo-500' : 'bg-blue-500')}
              style={{ width: `${recPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-xs text-steel-500">
        <span>{velocidad_anterior.toFixed(1)} uds/día antes</span>
        <svg className="h-3 w-3 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-semibold text-steel-700">{velocidad_reciente.toFixed(1)} uds/día ahora</span>
      </div>

      {/* Message */}
      <p className="text-xs text-steel-500 leading-relaxed mb-4">
        Las ventas aumentaron <strong className="text-steel-700">{Math.round(pct_aumento)}%</strong> en los últimos 7 días respecto al período anterior. Considera anticipar la importación antes de quedarte sin stock.
      </p>

      <Link to="/inventario"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-steel-500 hover:text-steel-800 transition-colors">
        Ver en inventario
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}

// ─── EmptySection ─────────────────────────────────────────────────────────────

function EmptySection({ icon, mensaje }: { icon: string; mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center bg-white rounded-xl border border-steel-200">
      <span className="text-3xl mb-2">{icon}</span>
      <p className="text-sm text-steel-500">{mensaje}</p>
    </div>
  )
}

// ─── AlertasPage ──────────────────────────────────────────────────────────────

export function AlertasPage() {
  const { isTokenReady } = useAuth()
  const { productos: storeProductos, proveedores: storeProveedores, setProductos, setProveedores } = useInventarioStore()

  // Seed store with mock data if empty (same pattern as other pages)
  if (isTokenReady && storeProductos.length === 0) {
    setProductos(MOCK_PRODUCTOS, MOCK_PRODUCTOS.length)
  }
  if (isTokenReady && storeProveedores.length === 0) {
    setProveedores(MOCK_PROVEEDORES)
  }

  const productos  = storeProductos.length > 0 ? storeProductos  : MOCK_PRODUCTOS
  const proveedores = storeProveedores.length > 0 ? storeProveedores : MOCK_PROVEEDORES

  const resumenMap = useMemo(() => {
    const m: Record<string, ResumenVentas> = {}
    MOCK_RESUMEN_VENTAS.forEach(r => { m[r.producto_id] = r })
    return m
  }, [])

  const proveedorMap = useMemo(() => {
    const m: Record<string, Proveedor> = {}
    proveedores.forEach(p => { m[p.id] = p })
    return m
  }, [proveedores])

  // ── 4.1 Stock bajo ─────────────────────────────────────────────────────────
  const alertasStock = useMemo<AlertaStock[]>(() => {
    return productos
      .filter(p => p.estado !== 'descontinuado' && p.stock < p.stock_minimo)
      .map(p => {
        const resumen = resumenMap[p.id]
        const velocidad_diaria = resumen ? resumen.unidades_30d / 30 : 0
        const dias_restantes   = velocidad_diaria > 0 ? p.stock / velocidad_diaria : Infinity
        const proveedor        = proveedorMap[p.proveedor_id]
        const leadTime         = proveedor?.tiempo_reposicion_dias ?? 0

        const urgencia: Urgencia =
          p.stock === 0                               ? 'critico'
          : isFinite(dias_restantes) && dias_restantes < leadTime ? 'urgente'
          : 'advertencia'

        return { producto: p, proveedor, velocidad_diaria, dias_restantes, urgencia }
      })
      .sort((a, b) => {
        const order: Record<Urgencia, number> = { critico: 0, urgente: 1, advertencia: 2 }
        if (order[a.urgencia] !== order[b.urgencia]) return order[a.urgencia] - order[b.urgencia]
        const da = isFinite(a.dias_restantes) ? a.dias_restantes : 9999
        const db = isFinite(b.dias_restantes) ? b.dias_restantes : 9999
        return da - db
      })
  }, [productos, resumenMap, proveedorMap])

  // ── 4.2 Demanda inusual ────────────────────────────────────────────────────
  const alertasDemanda = useMemo<AlertaDemanda[]>(() => {
    return productos
      .filter(p => p.estado !== 'descontinuado')
      .flatMap(p => {
        const resumen = resumenMap[p.id]
        if (!resumen || resumen.unidades_prev7d < 1) return []
        const pct_aumento = ((resumen.unidades_7d - resumen.unidades_prev7d) / resumen.unidades_prev7d) * 100
        if (pct_aumento < 50) return []
        return [{
          producto: p,
          unidades_7d: resumen.unidades_7d,
          unidades_prev7d: resumen.unidades_prev7d,
          pct_aumento,
          velocidad_reciente: resumen.unidades_7d / 7,
          velocidad_anterior: resumen.unidades_prev7d / 7,
        }]
      })
      .sort((a, b) => b.pct_aumento - a.pct_aumento)
  }, [productos, resumenMap])

  const totalAlertas = alertasStock.length + alertasDemanda.length

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Alertas inteligentes"
          description="Reposición proactiva basada en ritmo de ventas y tiempos de proveedor"
          actions={
            totalAlertas > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-red-100 text-red-700 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''} activa{totalAlertas !== 1 ? 's' : ''}
              </span>
            ) : undefined
          }
        />

        {/* ── 4.1 Stock bajo ─────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-steel-900">Stock bajo con tiempo de reposición</h2>
              <p className="text-xs text-steel-400">Productos por debajo del mínimo cruzados con tiempos de proveedor</p>
            </div>
            {alertasStock.length > 0 && (
              <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                {alertasStock.length}
              </span>
            )}
          </div>

          {alertasStock.length === 0 ? (
            <EmptySection icon="✅" mensaje="No hay productos con stock bajo. Todo en orden." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {alertasStock.map(a => (
                <AlertaStockCard key={a.producto.id} alerta={a} />
              ))}
            </div>
          )}
        </section>

        {/* ── 4.2 Demanda inusual ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-steel-900">Demanda inusual</h2>
              <p className="text-xs text-steel-400">Productos con ventas significativamente más altas que el período anterior</p>
            </div>
            {alertasDemanda.length > 0 && (
              <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                {alertasDemanda.length}
              </span>
            )}
          </div>

          {alertasDemanda.length === 0 ? (
            <EmptySection icon="📊" mensaje="Sin variaciones inusuales de demanda en los últimos 7 días." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {alertasDemanda.map(a => (
                <AlertaDemandaCard key={a.producto.id} alerta={a} />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </MainLayout>
  )
}
