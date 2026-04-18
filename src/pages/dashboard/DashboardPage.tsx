import { useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { MOCK_PRODUCTOS } from '@/mock/inventario'
import { MOCK_RESUMEN_VENTAS } from '@/mock/alertas'
import { MOCK_VENTAS_DIARIAS } from '@/mock/reportes'
import { MOCK_IMPORTACIONES } from '@/mock/importaciones'
import { MOCK_ORDENES } from '@/mock/ventas'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const fmtUSD = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const fmtBsShort = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return String(Math.round(n))
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// ─── Interactive Sales Chart ──────────────────────────────────────────────────

function SalesChart({
  data, dates, onHover,
}: { data: number[]; dates: string[]; onHover: (idx: number | null) => void }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const max   = Math.max(...data, 1)
  const min   = Math.min(...data)
  const range = max - min || 1
  const mid   = (max + min) / 2

  const W = 300; const H = 100; const pad = 6

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: pad + (1 - (v - min) / range) * (H - pad * 2),
  }))
  const ptsStr  = pts.map(p => `${p.x},${p.y}`).join(' ')
  const fillPts = `${pad},${H} ${ptsStr} ${W - pad},${H}`

  const handle = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current) return
    const rect = chartRef.current.getBoundingClientRect()
    const idx  = Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - rect.left) / rect.width) * (data.length - 1))))
    setHoverIdx(idx)
    onHover(idx)
  }
  const leave = () => { setHoverIdx(null); onHover(null) }

  const xLabels = dates.filter((_, i) => i % 2 === 0)
  const hp = hoverIdx !== null ? pts[hoverIdx] : null

  return (
    <div className="flex gap-3 mt-4 flex-1 min-h-0">
      {/* Eje Y */}
      <div className="flex flex-col justify-between text-right shrink-0 pb-6" style={{ width: 44 }}>
        <span className="text-[10px] font-semibold tabular-nums text-steel-400">Bs {fmtBsShort(max)}</span>
        <span className="text-[10px] font-semibold tabular-nums text-steel-400">Bs {fmtBsShort(mid)}</span>
        <span className="text-[10px] font-semibold tabular-nums text-steel-400">Bs {fmtBsShort(min)}</span>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div
          ref={chartRef}
          className="relative flex-1 min-h-0 cursor-default"
          onMouseMove={handle}
          onMouseLeave={leave}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-dashed" style={{ borderColor: '#E2E2E2' }} />
            <div className="border-t border-dashed" style={{ borderColor: '#E2E2E2' }} />
            <div className="border-t border-dashed" style={{ borderColor: '#E2E2E2' }} />
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#C8102E" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#C8102E" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={fillPts} fill="url(#brandGrad)" />
            <polyline points={ptsStr} fill="none" stroke="#C8102E" strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round" />

            {/* Hover: thin vertical line + small dot */}
            {hp && (
              <>
                <line x1={hp.x} y1={0} x2={hp.x} y2={H}
                  stroke="#C8102E" strokeWidth="1" opacity="0.2" />
                <circle cx={hp.x} cy={hp.y} r="4" fill="white" stroke="#C8102E" strokeWidth="2" />
              </>
            )}

            {/* Last-point dot always visible when no hover */}
            {!hp && pts.length > 0 && (() => {
              const last = pts[pts.length - 1]!
              return <circle cx={last.x} cy={last.y} r="3.5" fill="white" stroke="#C8102E" strokeWidth="2" />
            })()}
          </svg>
        </div>

        {/* Eje X */}
        <div className="flex justify-between mt-2 shrink-0">
          {xLabels.map((d, i) => (
            <span key={i} className="text-[10px] text-steel-400">{d}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────

function MiniBar({ pct, color = 'bg-brand-500' }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 bg-steel-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-steel-100 ${className}`}>
      {children}
    </div>
  )
}

// ─── Section title con acento ─────────────────────────────────────────────────

function SectionTitle({ children, to }: { children: React.ReactNode; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-brand-600" />
        <h2 className="text-[11px] font-bold text-steel-500 uppercase tracking-widest">{children}</h2>
      </div>
      {to && (
        <Link to={to} className="text-xs text-brand-600 hover:text-brand-700 font-semibold">
          Ver todo →
        </Link>
      )}
    </div>
  )
}

// ─── Badge sólido ─────────────────────────────────────────────────────────────

type BadgeVariant = 'red' | 'amber' | 'green' | 'blue' | 'gray' | 'yellow'

const BADGE_STYLES: Record<BadgeVariant, string> = {
  red:    'bg-brand-600 text-white',
  amber:  'bg-amber-500 text-white',
  green:  'bg-emerald-500 text-white',
  blue:   'bg-steel-700 text-white',
  gray:   'bg-steel-200 text-steel-600',
  yellow: 'bg-accent text-steel-900',
}

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${BADGE_STYLES[variant]}`}>
      {label}
    </span>
  )
}

// ─── Import pipeline ──────────────────────────────────────────────────────────

const STAGES = ['ordenada', 'en_transito', 'en_aduana', 'recibida'] as const
type Stage = typeof STAGES[number]
const STAGE_LABEL: Record<Stage, string> = {
  ordenada: 'Ordenada', en_transito: 'En tránsito', en_aduana: 'En aduana', recibida: 'Recibida',
}

function ImportPipeline({ estado }: { estado: string }) {
  const idx = STAGES.indexOf(estado as Stage)
  return (
    <div className="flex items-center gap-1 mt-2">
      {STAGES.map((s, i) => {
        const done = i < idx; const active = i === idx
        return (
          <div key={s} className="flex items-center">
            <div title={STAGE_LABEL[s]} className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${
              active ? 'bg-brand-600 ring-[3px] ring-brand-100' :
              done   ? 'bg-emerald-500' : 'bg-steel-200'
            }`} />
            {i < STAGES.length - 1 && (
              <div className={`h-px w-6 ${done ? 'bg-emerald-400' : 'bg-steel-200'}`} />
            )}
          </div>
        )
      })}
      <span className="ml-2 text-xs font-medium text-steel-500">
        {STAGE_LABEL[estado as Stage] ?? estado}
      </span>
    </div>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, up }: { label: string; value: string; up: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
      up ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700'
    }`}>
      {up ? '▲' : '▼'} {value} <span className="font-normal opacity-70">{label}</span>
    </span>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const {
    ventasHoy, ventasMes, ventasHoyPrev, ventasMesPrev,
    ordenesActivas, importacionesTransito,
    stockCritico, valorInventario, valorInventarioUSD,
    top5productos, sparkline14d, chartDates,
    sinMovimiento, importacionesActivas,
  } = useMemo(() => {
    const hoy  = MOCK_VENTAS_DIARIAS[MOCK_VENTAS_DIARIAS.length - 1]
    const ayer = MOCK_VENTAS_DIARIAS[MOCK_VENTAS_DIARIAS.length - 2]
    const ventasHoy      = hoy?.total_bs  ?? 0
    const ventasHoyPrev  = ayer?.total_bs ?? 0
    const ventasMes      = MOCK_VENTAS_DIARIAS.reduce((s, d) => s + d.total_bs, 0)
    const ventasMesPrev  = MOCK_VENTAS_DIARIAS.slice(0, 15).reduce((s, d) => s + d.total_bs, 0)

    const last14       = MOCK_VENTAS_DIARIAS.slice(-14)
    const sparkline14d = last14.map(d => d.total_bs)
    const chartDates   = last14.map(d =>
      new Date(d.fecha).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })
    )

    const ordenesActivas = MOCK_ORDENES.filter(
      o => o.estado !== 'pagado' && o.estado !== 'cancelado'
    ).length

    const importacionesTransito = MOCK_IMPORTACIONES.filter(
      i => i.estado === 'en_transito' || i.estado === 'en_aduana'
    ).length
    const importacionesActivas = MOCK_IMPORTACIONES.filter(i => i.estado !== 'recibida')

    const stockCritico       = MOCK_PRODUCTOS.filter(p => p.stock <= p.stock_minimo && p.estado === 'activo')
    const valorInventario    = MOCK_PRODUCTOS.reduce((s, p) => s + p.stock * p.precio_costo, 0)
    const valorInventarioUSD = MOCK_PRODUCTOS.reduce((s, p) => s + p.stock * (p.precio_costo / 6.96), 0)

    const top5productos = [...MOCK_RESUMEN_VENTAS]
      .sort((a, b) => b.unidades_7d - a.unidades_7d)
      .slice(0, 5)
      .map(r => {
        const prod = MOCK_PRODUCTOS.find(p => p.id === r.producto_id)
        return {
          nombre:   prod?.nombre          ?? r.producto_id,
          codigo:   prod?.codigo_universal ?? '',
          unidades: r.unidades_7d,
          ingreso:  r.unidades_7d * (prod?.precio_venta ?? 0),
        }
      })

    const sinMovimiento = MOCK_RESUMEN_VENTAS
      .filter(r => r.unidades_30d === 0)
      .map(r => MOCK_PRODUCTOS.find(p => p.id === r.producto_id))
      .filter(Boolean)

    return {
      ventasHoy, ventasMes, ventasHoyPrev, ventasMesPrev,
      ordenesActivas, importacionesTransito,
      stockCritico, valorInventario, valorInventarioUSD,
      top5productos, sparkline14d, chartDates,
      sinMovimiento, importacionesActivas,
    }
  }, [])

  const deltaDia: { val: string; up: boolean } | null = ventasHoyPrev > 0
    ? { val: `${Math.abs(((ventasHoy - ventasHoyPrev) / ventasHoyPrev) * 100).toFixed(0)}%`, up: ventasHoy >= ventasHoyPrev }
    : null
  const deltaMes: { val: string; up: boolean } | null = ventasMesPrev > 0
    ? { val: `${Math.abs(((ventasMes - ventasMesPrev) / ventasMesPrev) * 100).toFixed(0)}%`, up: ventasMes >= ventasMesPrev }
    : null

  const [chartHover, setChartHover] = useState<number | null>(null)

  const saludo = "Reportes de Acceso Rápido"
  const maxTop = top5productos[0]?.unidades ?? 1

  const estadoBadge: Record<string, { label: string; variant: BadgeVariant }> = {
    pendiente:      { label: 'Pendiente',  variant: 'amber' },
    en_preparacion: { label: 'Preparando', variant: 'blue'  },
    listo:          { label: 'Listo',      variant: 'green' },
    cobrado:        { label: 'Cobrado',    variant: 'gray'  },
    cancelado:      { label: 'Cancelado',  variant: 'red'   },
  }

  const statusBorderColor: Record<string, string> = {
    pendiente:      'border-l-amber-400',
    en_preparacion: 'border-l-steel-500',
    listo:          'border-l-emerald-500',
    cobrado:        'border-l-steel-200',
    cancelado:      'border-l-brand-500',
  }

  return (
    <MainLayout>
      <PageContainer>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="text-3xl font-black text-steel-900 tracking-tight">
              {saludo}
            </h1>
          </div>
          {stockCritico.length > 0 && (
            <Link to="/alertas"
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {stockCritico.length} alertas de stock
            </Link>
          )}
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          {/* Hero — ventas hoy */}
          <Link to="/ventas/caja">
            <div className="relative overflow-hidden rounded-2xl bg-brand-600 p-5 text-white shadow-md hover:shadow-lg hover:bg-brand-700 transition-all h-full">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-brand-500 opacity-40" />
              <div className="absolute -right-2 -bottom-8 h-24 w-24 rounded-full bg-brand-800 opacity-30" />
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
                <p className="text-xs text-white/70 font-semibold mt-0.5">Ventas del día</p>
                <p className="text-[10px] text-white/45 mt-2">Ayer: {fmtBs(ventasHoyPrev)}</p>
              </div>
            </div>
          </Link>

          {/* Ventas mes */}
          <Link to="/reportes/rentabilidad">
            <Card className="p-5 h-full hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                {deltaMes && <StatPill label="vs ant." value={deltaMes.val} up={deltaMes.up} />}
              </div>
              <p className="text-2xl font-black tabular-nums text-steel-900 leading-tight">{fmtBs(ventasMes)}</p>
              <p className="text-xs text-steel-500 font-semibold mt-0.5">Ventas del mes</p>
              <p className="text-[10px] text-steel-400 mt-2">Últimos 30 días</p>
            </Card>
          </Link>

          {/* Órdenes activas */}
          <Link to="/ventas/caja">
            <Card className="p-5 h-full hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-accent-light flex items-center justify-center">
                  <svg className="h-4 w-4 text-steel-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                {ordenesActivas > 0 && <Badge label="Activas" variant="yellow" />}
              </div>
              <p className="text-2xl font-black tabular-nums text-steel-900 leading-tight">{ordenesActivas}</p>
              <p className="text-xs text-steel-500 font-semibold mt-0.5">Órdenes activas</p>
              <p className="text-[10px] text-steel-400 mt-2">{importacionesTransito} importaciones en tránsito</p>
            </Card>
          </Link>

          {/* Stock crítico */}
          <Link to="/alertas">
            <Card className={`p-5 h-full hover:shadow-md transition-shadow ${stockCritico.length > 0 ? 'border-brand-200' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${stockCritico.length > 0 ? 'bg-brand-50' : 'bg-steel-50'}`}>
                  <svg className={`h-4 w-4 ${stockCritico.length > 0 ? 'text-brand-600' : 'text-steel-400'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                {stockCritico.length > 0 && <Badge label="Revisar" variant="red" />}
              </div>
              <p className={`text-2xl font-black tabular-nums leading-tight ${stockCritico.length > 0 ? 'text-brand-600' : 'text-steel-900'}`}>
                {stockCritico.length}
              </p>
              <p className="text-xs text-steel-500 font-semibold mt-0.5">Stock crítico</p>
              <p className="text-[10px] text-steel-400 mt-2">Productos bajo mínimo</p>
            </Card>
          </Link>
        </div>

        {/* ── Gráfico ventas + Top productos ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5" style={{ minHeight: 320 }}>

          <Card className="lg:col-span-2 p-5 flex flex-col">
            <div className="flex items-start justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-steel-800">Ventas — últimos 14 días</h2>
                <div className="flex items-center gap-2 mt-0.5 h-5">
                  {chartHover !== null ? (
                    <>
                      <span className="text-xs text-steel-400">{chartDates[chartHover]}</span>
                      <span className="text-xs font-black text-brand-600 tabular-nums">
                        {fmtBs(sparkline14d[chartHover] ?? 0)}
                      </span>
                    </>
                  ) : (
                    <p className="text-xs text-steel-400">Pasa el cursor para ver cada día</p>
                  )}
                </div>
              </div>
              <Link to="/reportes/rentabilidad"
                className="text-xs text-brand-600 hover:text-brand-700 font-bold shrink-0">
                Ver reporte →
              </Link>
            </div>
            <SalesChart data={sparkline14d} dates={chartDates} onHover={setChartHover} />
          </Card>

          <Card className="p-5 flex flex-col">
            <SectionTitle to="/reportes/rentabilidad">Top productos (7d)</SectionTitle>
            <div className="space-y-4 flex-1">
              {top5productos.map((p, i) => (
                <div key={p.codigo} className="flex items-start gap-3">
                  <span className={`text-sm font-black w-6 shrink-0 mt-0.5 tabular-nums ${i === 0 ? 'text-brand-600' : 'text-steel-200'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-steel-800 leading-tight truncate">{p.nombre}</p>
                    <p className="text-[10px] text-steel-400 mt-0.5 tabular-nums">{p.codigo}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <MiniBar pct={(p.unidades / maxTop) * 100} color={i === 0 ? 'bg-brand-500' : 'bg-steel-200'} />
                      <span className="text-[10px] font-bold text-steel-500 shrink-0 tabular-nums">{p.unidades}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-steel-400 tabular-nums">{fmtBs(p.ingreso)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Stock crítico + Valor inventario ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

          <Card className="lg:col-span-2 p-5">
            <SectionTitle to="/alertas">Stock crítico</SectionTitle>
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
                    <th className="text-center pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Mín.</th>
                    <th className="text-left pb-3 font-bold text-steel-400 uppercase tracking-widest text-[10px]">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockCritico.slice(0, 6).map(p => (
                    <tr key={p.id} className="border-b border-steel-50 hover:bg-[#FAFAF9] transition-colors group">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-steel-800 truncate max-w-[180px] group-hover:text-brand-700 transition-colors">{p.nombre}</p>
                        <p className="text-steel-400 text-[10px] mt-0.5 tabular-nums">{p.codigo_universal}</p>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-base font-black tabular-nums ${p.stock === 0 ? 'text-brand-600' : 'text-amber-600'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="py-3 text-center text-steel-400 font-semibold tabular-nums">{p.stock_minimo}</td>
                      <td className="py-3">
                        <Badge label={p.stock === 0 ? 'Sin stock' : 'Bajo mínimo'} variant={p.stock === 0 ? 'red' : 'amber'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {stockCritico.length > 6 && (
              <Link to="/alertas" className="block mt-3 text-center text-xs text-brand-600 hover:text-brand-700 font-bold">
                +{stockCritico.length - 6} productos más →
              </Link>
            )}
          </Card>

          {/* Valor inventario */}
          <div className="relative overflow-hidden rounded-2xl bg-steel-900 p-6 text-white shadow-md">
            <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-steel-800" />
            <div className="absolute right-2 -bottom-12 h-32 w-32 rounded-full bg-brand-900 opacity-50" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-widest text-steel-500 mb-5">
                Valor inventario
              </p>
              <p className="text-4xl font-black tracking-tight leading-none tabular-nums">{fmtUSD(valorInventarioUSD)}</p>
              <p className="text-sm text-steel-400 mt-1.5 tabular-nums">{fmtBs(valorInventario)}</p>
              <div className="mt-6 pt-5 border-t border-steel-800 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-black tabular-nums">{MOCK_PRODUCTOS.length}</p>
                  <p className="text-[10px] text-steel-500 font-semibold uppercase tracking-wide mt-0.5">Productos</p>
                </div>
                <div>
                  <p className="text-2xl font-black tabular-nums">
                    {MOCK_PRODUCTOS.reduce((s, p) => s + p.stock, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-steel-500 font-semibold uppercase tracking-wide mt-0.5">Unidades</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Importaciones + Pedidos ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

          <Card className="p-5">
            <SectionTitle to="/importaciones">Importaciones activas</SectionTitle>
            {importacionesActivas.length === 0 ? (
              <p className="text-sm text-steel-400 text-center py-10">Sin importaciones en curso</p>
            ) : (
              <div className="space-y-3">
                {importacionesActivas.map(imp => {
                  const costoTotal = imp.fob_total_usd * imp.tipo_cambio + imp.flete_usd * imp.tipo_cambio + imp.aduana_bs + imp.transporte_interno_bs
                  const llegada = imp.fecha_estimada_llegada
                    ? new Date(imp.fecha_estimada_llegada).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })
                    : '—'
                  return (
                    <div key={imp.id} className="rounded-xl border border-steel-100 bg-[#FAFAF9] p-4 hover:border-steel-200 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-steel-800">{imp.numero}</p>
                          <p className="text-xs text-steel-400 mt-0.5">{imp.proveedor} · {imp.origen}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-steel-700 tabular-nums">{fmtUSD(imp.fob_total_usd)}</p>
                          <p className="text-[10px] text-steel-400 mt-0.5">ETA {llegada}</p>
                        </div>
                      </div>
                      <ImportPipeline estado={imp.estado} />
                      <div className="flex gap-4 mt-3 pt-2.5 border-t border-steel-100 text-[10px] text-steel-400 tabular-nums">
                        <span>Flete: {fmtUSD(imp.flete_usd)}</span>
                        <span>Aduana: {fmtBs(imp.aduana_bs)}</span>
                        <span className="font-bold text-steel-600">Total: {fmtBs(costoTotal)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle to="/ventas/caja">Pedidos recientes</SectionTitle>
            <div className="space-y-1">
              {MOCK_ORDENES.map(o => {
                const bs = estadoBadge[o.estado] ?? { label: o.estado, variant: 'gray' as BadgeVariant }
                const borderColor = statusBorderColor[o.estado] ?? 'border-l-steel-100'
                return (
                  <div key={o.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-l-4 hover:bg-[#FAFAF9] transition-colors ${borderColor}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-steel-800">{o.numero}</p>
                        <p className="text-[10px] text-steel-400">{relativeTime(o.creado_en)}</p>
                      </div>
                      <p className="text-[10px] text-steel-400 mt-0.5">{o.cajero_nombre}</p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <p className="text-xs font-black text-steel-800 tabular-nums">{fmtBs(o.total)}</p>
                      <Badge label={bs.label} variant={bs.variant} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* ── Sin movimiento ────────────────────────────────────────────── */}
        {sinMovimiento.length > 0 && (
          <Card className="p-5">
            <SectionTitle to="/reportes/stock-muerto">Sin movimiento — últimos 30 días</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {sinMovimiento.slice(0, 6).map(p => {
                if (!p) return null
                return (
                  <div key={p.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#FAFAF9] border border-steel-100 hover:border-steel-200 hover:bg-steel-50 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-steel-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-steel-700 truncate">{p.nombre}</p>
                      <p className="text-[10px] text-steel-400 mt-0.5 tabular-nums">
                        {p.codigo_universal} · {p.stock} uds · {fmtBs(p.stock * p.precio_costo)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            {sinMovimiento.length > 6 && (
              <div className="mt-3 text-center">
                <Link to="/reportes/stock-muerto" className="text-xs text-brand-600 hover:text-brand-700 font-bold">
                  +{sinMovimiento.length - 6} más →
                </Link>
              </div>
            )}
          </Card>
        )}

      </PageContainer>
    </MainLayout>
  )
}
