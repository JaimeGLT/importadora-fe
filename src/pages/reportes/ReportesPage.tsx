import { useState, useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useInventarioStore } from '@/stores/inventarioStore'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Badge } from '@/components/ui'
import { MOCK_PRODUCTOS } from '@/mock/inventario'
import { MOCK_IMPORTACIONES } from '@/mock/importaciones'
import { MOCK_RESUMEN_VENTAS } from '@/mock/alertas'
import {
  MOCK_CUENTAS_COBRAR,
  MOCK_PROVEEDORES_CUMPLIMIENTO,
  MOCK_CLIENTES_CAIDA,
  MOCK_ESTACIONALIDAD,
} from '@/mock/reportes'
import type { Producto } from '@/types'
import type { ResumenVentas } from '@/mock/alertas'

// ─── Format helpers ───────────────────────────────────────────────────────────

const fmtBs  = (n: number) => `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtBs2 = (n: number) => `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

// ─── Chart primitives ─────────────────────────────────────────────────────────

function VBars({ data, h = 120, color = 'brand', highlight }: {
  data: { label: string; value: number; sub?: string }[]
  h?: number
  color?: 'brand' | 'green' | 'amber' | 'red' | 'indigo' | 'blue'
  highlight?: number
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const palette: Record<string, string> = {
    brand: 'bg-brand-500', green: 'bg-emerald-500', amber: 'bg-amber-400',
    red: 'bg-red-400', indigo: 'bg-indigo-500', blue: 'bg-blue-500',
  }
  return (
    <div className="flex items-end gap-1.5" style={{ height: h }}>
      {data.map((d, i) => {
        const barH = Math.max(Math.round((d.value / max) * (h - 20)), 2)
        const isHL = highlight === i
        return (
          <div key={`${d.label}-${i}`} className="flex-1 flex flex-col items-center justify-end group relative">
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-steel-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
              {d.label}: {d.value}
            </div>
            <div
              className={clsx('w-full rounded-t-sm transition-all', isHL ? 'bg-brand-600 ring-2 ring-brand-300' : palette[color])}
              style={{ height: barH }}
            />
            <span className={clsx('text-[10px] mt-1 font-medium leading-tight text-center', isHL ? 'text-brand-600' : 'text-steel-400')}>
              {d.sub ?? d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function HBar({ label, value, max, color = 'brand', right, sub }: {
  label: string; value: number; max: number
  color?: 'brand' | 'green' | 'amber' | 'red' | 'indigo'
  right?: string; sub?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const palette: Record<string, string> = {
    brand: 'bg-brand-500', green: 'bg-emerald-500',
    amber: 'bg-amber-400', red: 'bg-red-400', indigo: 'bg-indigo-500',
  }
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 shrink-0 text-right">
        <p className="text-xs font-medium text-steel-800 truncate leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-steel-400">{sub}</p>}
      </div>
      <div className="flex-1 h-7 bg-steel-100 rounded-lg overflow-hidden relative">
        <div
          className={clsx('h-full rounded-lg flex items-center transition-all', palette[color])}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
        <span className="absolute inset-y-0 left-2 flex items-center text-xs font-semibold text-white mix-blend-multiply"
          style={{ opacity: pct > 15 ? 1 : 0 }}>
          {right ?? value}
        </span>
      </div>
      {pct <= 15 && (
        <span className="text-xs font-semibold text-steel-600 shrink-0 w-20 text-left">{right ?? value}</span>
      )}
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, color = 'neutral' }: {
  label: string; value: string; sub?: string
  color?: 'neutral' | 'green' | 'amber' | 'red' | 'brand'
}) {
  const vCls = {
    neutral: 'text-steel-900', green: 'text-emerald-700',
    amber: 'text-amber-700', red: 'text-red-700', brand: 'text-brand-700',
  }[color]
  return (
    <div className="bg-white rounded-xl border border-steel-200 px-5 py-4">
      <p className="text-xs text-steel-400 mb-1">{label}</p>
      <p className={clsx('text-xl font-bold tabular-nums leading-tight', vCls)}>{value}</p>
      {sub && <p className="text-xs text-steel-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ReportShell({ title, kpis, children }: {
  title: string
  kpis: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-steel-900">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{kpis}</div>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function Card({ title, desc, children, fullBleed }: {
  title?: string; desc?: string; children: React.ReactNode; fullBleed?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-steel-200 shadow-sm overflow-hidden">
      {title && (
        <div className="px-5 py-4 border-b border-steel-100">
          <p className="text-sm font-semibold text-steel-900">{title}</p>
          {desc && <p className="text-xs text-steel-400 mt-0.5">{desc}</p>}
        </div>
      )}
      <div className={fullBleed ? '' : 'p-5'}>{children}</div>
    </div>
  )
}

const ESTADO_IMP_COLOR: Record<string, 'yellow' | 'blue' | 'green' | 'red'> = {
  en_transito: 'yellow', en_aduana: 'blue', recibida: 'green', cancelada: 'red',
}
const ESTADO_IMP_LABEL: Record<string, string> = {
  en_transito: 'En tránsito', en_aduana: 'En aduana', recibida: 'Recibida', cancelada: 'Cancelada',
}
const PAIS_FLAG: Record<string, string> = {
  China: '🇨🇳', 'Estados Unidos': '🇺🇸', México: '🇲🇽', Japón: '🇯🇵', Alemania: '🇩🇪', Italia: '🇮🇹', Brasil: '🇧🇷',
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. Rentabilidad por SKU ─────────────────────────────────────────────────

function Rentabilidad({ productos, resumenMap }: { productos: Producto[]; resumenMap: Record<string, ResumenVentas> }) {
  const rows = useMemo(() =>
    productos
      .filter(p => p.estado !== 'descontinuado' && p.precio_costo > 0)
      .map(p => {
        const r = resumenMap[p.id]
        const margen_bs  = p.precio_venta - p.precio_costo
        const margen_pct = (margen_bs / p.precio_costo) * 100
        const uds30      = r?.unidades_30d ?? 0
        const contrib    = margen_bs * uds30
        return { p, margen_bs, margen_pct, uds30, contrib }
      })
      .sort((a, b) => b.contrib - a.contrib),
    [productos, resumenMap],
  )

  const totalContrib   = rows.reduce((s, r) => s + r.contrib, 0)
  const mejorMargen    = Math.max(...rows.map(r => r.margen_pct))
  const bajosMargen    = rows.filter(r => r.margen_pct < 20).length
  const maxContrib     = Math.max(...rows.map(r => r.contrib), 1)

  return (
    <ReportShell
      title="Rentabilidad por referencia"
      kpis={<>
        <Kpi label="Contribución mensual total" value={fmtBs(totalContrib)} sub="Margen bruto real" color="green" />
        <Kpi label="Mejor margen" value={`${mejorMargen.toFixed(1)}%`} sub={rows[0]?.p.nombre.split(' ').slice(0,2).join(' ')} color="brand" />
        <Kpi label="Margen promedio" value={`${(rows.reduce((s,r) => s + r.margen_pct, 0) / Math.max(rows.length,1)).toFixed(1)}%`} />
        <Kpi label="Con margen bajo (<20%)" value={`${bajosMargen} refs`} sub="Revisar precio o costo" color={bajosMargen > 0 ? 'amber' : 'neutral'} />
      </>}
    >
      {/* Gráfica de barras horizontal por contribución */}
      <Card title="Contribución mensual por referencia" desc="Margen Bs × unidades vendidas — qué te deja cada producto en el mes">
        <div className="space-y-3">
          {rows.map(({ p, margen_bs, margen_pct, contrib }) => (
            <HBar
              key={p.id}
              label={p.nombre}
              sub={`${p.codigo_universal} · ${fmtBs2(margen_bs)} margen unit.`}
              value={contrib}
              max={maxContrib}
              color={margen_pct >= 50 ? 'green' : margen_pct >= 30 ? 'brand' : margen_pct >= 20 ? 'amber' : 'red'}
              right={`${fmtBs(contrib)} · ${margen_pct.toFixed(0)}%`}
            />
          ))}
        </div>
      </Card>

      {/* Tabla de margen por unidad */}
      <Card title="Detalle de márgenes" fullBleed>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-100">
                {['Referencia', 'P. Costo', 'P. Venta', 'Margen unit.', 'Margen %', 'Uds/mes', 'Contribución mes'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-steel-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, margen_bs, margen_pct, uds30, contrib }) => (
                <tr key={p.id} className="border-b border-steel-50 hover:bg-steel-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-steel-800 leading-snug">{p.nombre}</p>
                    <p className="text-xs font-mono text-steel-400">{p.codigo_universal}</p>
                  </td>
                  <td className="px-5 py-3 text-xs tabular-nums text-steel-400">{fmtBs2(p.precio_costo)}</td>
                  <td className="px-5 py-3 text-xs tabular-nums text-steel-700">{fmtBs2(p.precio_venta)}</td>
                  <td className="px-5 py-3 text-xs tabular-nums text-emerald-700 font-medium">{fmtBs2(margen_bs)}</td>
                  <td className="px-5 py-3">
                    <span className={clsx('text-sm font-bold tabular-nums',
                      margen_pct >= 50 ? 'text-emerald-600' : margen_pct >= 30 ? 'text-brand-600'
                      : margen_pct >= 20 ? 'text-amber-600' : 'text-red-500')}>
                      {fmtPct(margen_pct)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs tabular-nums text-steel-500">{uds30}</td>
                  <td className="px-5 py-3 text-sm font-bold text-steel-900 tabular-nums">{fmtBs(contrib)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ReportShell>
  )
}

// ─── 2. Costo real de importación (Landed Cost) ───────────────────────────────

function LandedCost() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const importaciones = useMemo(() =>
    [...MOCK_IMPORTACIONES].sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()), [])

  const totalInvertido = importaciones.reduce((s, i) => {
    return s + i.fob_total_usd * i.tipo_cambio + i.flete_usd * i.tipo_cambio + i.aduana_bs + i.transporte_interno_bs
  }, 0)
  const avgTCambio = importaciones.reduce((s, i) => s + i.tipo_cambio, 0) / Math.max(importaciones.length, 1)

  const avgPcts = importaciones.reduce((acc, imp) => {
    const total = imp.fob_total_usd * imp.tipo_cambio + imp.flete_usd * imp.tipo_cambio + imp.aduana_bs + imp.transporte_interno_bs
    acc.fob    += (imp.fob_total_usd * imp.tipo_cambio) / total
    acc.flete  += (imp.flete_usd * imp.tipo_cambio) / total
    acc.aduana += imp.aduana_bs / total
    acc.transp += imp.transporte_interno_bs / total
    return acc
  }, { fob: 0, flete: 0, aduana: 0, transp: 0 })
  const n = importaciones.length
  const pFob    = (avgPcts.fob    / n) * 100
  const pFlete  = (avgPcts.flete  / n) * 100
  const pAduana = (avgPcts.aduana / n) * 100
  const pTransp = (avgPcts.transp / n) * 100

  return (
    <ReportShell
      title="Costo real de importación — Landed Cost"
      kpis={<>
        <Kpi label="Total importado (histórico)" value={fmtBs(totalInvertido)} color="brand" />
        <Kpi label="FOB promedio" value={`${pFob.toFixed(0)}%`} sub="Del costo total" />
        <Kpi label="Logística (flete+aduana)" value={`${(pFlete + pAduana).toFixed(0)}%`} sub="Del costo total" color="amber" />
        <Kpi label="T/C promedio" value={`${avgTCambio.toFixed(2)} Bs/$`} sub="Tipo de cambio usado" />
      </>}
    >
      {/* Composición promedio */}
      <Card title="Composición del costo — promedio de todas las importaciones">
        <div className="mb-4">
          <div className="flex h-10 rounded-xl overflow-hidden gap-0.5">
            {[
              { label: 'FOB',        pct: pFob,    color: 'bg-blue-500'    },
              { label: 'Flete',      pct: pFlete,  color: 'bg-indigo-400'  },
              { label: 'Aduana',     pct: pAduana, color: 'bg-amber-400'   },
              { label: 'Transporte', pct: pTransp, color: 'bg-emerald-400' },
            ].map(s => (
              <div key={s.label} className={clsx('flex items-center justify-center text-white text-xs font-bold', s.color)}
                style={{ width: `${s.pct}%` }}>
                {s.pct > 8 ? `${s.pct.toFixed(0)}%` : ''}
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 flex-wrap">
            {[
              { label: 'FOB (mercancía)',     pct: pFob,    dot: 'bg-blue-500'    },
              { label: 'Flete internacional', pct: pFlete,  dot: 'bg-indigo-400'  },
              { label: 'Aduana / DAI',        pct: pAduana, dot: 'bg-amber-400'   },
              { label: 'Transporte local',    pct: pTransp, dot: 'bg-emerald-400' },
            ].map(s => (
              <span key={s.label} className="flex items-center gap-1.5 text-xs text-steel-600">
                <span className={clsx('h-2.5 w-2.5 rounded-full', s.dot)} />
                {s.label} — {s.pct.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Por importación */}
      <Card title="Desglose por lote importado" desc="Clic para ver ítems y costo unitario real" fullBleed>
        <div className="divide-y divide-steel-100">
          {importaciones.map(imp => {
            const fobBs   = imp.fob_total_usd * imp.tipo_cambio
            const fleteBs = imp.flete_usd * imp.tipo_cambio
            const totalBs = fobBs + fleteBs + imp.aduana_bs + imp.transporte_interno_bs
            const isExp   = expandedId === imp.id

            return (
              <div key={imp.id}>
                <button
                  onClick={() => setExpandedId(isExp ? null : imp.id)}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-steel-50 transition-colors text-left"
                >
                  <svg className={clsx('h-3.5 w-3.5 text-steel-400 shrink-0 transition-transform', isExp && 'rotate-90')}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2 items-center min-w-0">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-sm font-bold text-steel-900">{imp.numero}</p>
                      <p className="text-xs text-steel-400">{imp.proveedor}</p>
                    </div>
                    <div className="hidden sm:block">
                      <div className="flex h-3 rounded overflow-hidden gap-px">
                        {[fobBs, fleteBs, imp.aduana_bs, imp.transporte_interno_bs].map((v, i) => (
                          <div key={i} className={clsx('h-full', ['bg-blue-500','bg-indigo-400','bg-amber-400','bg-emerald-400'][i])}
                            style={{ width: `${(v/totalBs)*100}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="hidden sm:block text-xs text-steel-500">
                      {new Date(imp.fecha_creacion).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </div>
                    <div className="hidden sm:block text-xs text-steel-500">T/C {imp.tipo_cambio}</div>
                    <div className="text-sm font-bold text-steel-900 tabular-nums text-right sm:text-left">{fmtBs(totalBs)}</div>
                  </div>
                  <Badge color={ESTADO_IMP_COLOR[imp.estado]}>{ESTADO_IMP_LABEL[imp.estado]}</Badge>
                </button>

                {isExp && (
                  <div className="px-5 pb-5 bg-steel-50/60">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white rounded-xl border border-steel-200 mb-4">
                      {[
                        { l: 'FOB',             v: fmtBs2(fobBs),   s: `$${imp.fob_total_usd.toLocaleString()} USD`, dot: 'bg-blue-500' },
                        { l: 'Flete',           v: fmtBs2(fleteBs), s: `$${imp.flete_usd} USD`,                      dot: 'bg-indigo-400' },
                        { l: 'Aduana / DAI',    v: fmtBs2(imp.aduana_bs), s: 'Aranceles',                            dot: 'bg-amber-400' },
                        { l: 'Transporte local',v: fmtBs2(imp.transporte_interno_bs), s: 'Entrega almacén',          dot: 'bg-emerald-400' },
                      ].map(c => (
                        <div key={c.l} className="flex items-start gap-2">
                          <span className={clsx('h-2.5 w-2.5 rounded-full mt-0.5 shrink-0', c.dot)} />
                          <div>
                            <p className="text-xs text-steel-400">{c.l}</p>
                            <p className="text-sm font-bold text-steel-900 tabular-nums">{c.v}</p>
                            <p className="text-xs text-steel-400">{c.s}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-steel-200">
                          {['Producto','Cant.','Landed cost unit.','P. Venta','Margen'].map(h => (
                            <th key={h} className="text-left py-1.5 pr-4 font-semibold text-steel-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {imp.items.map(item => {
                          const m = ((item.precio_venta_final - item.costo_unitario_total_bs) / item.costo_unitario_total_bs) * 100
                          return (
                            <tr key={item.id} className="border-b border-steel-100">
                              <td className="py-2 pr-4">
                                <p className="font-medium text-steel-800">{item.nombre}</p>
                                <p className="font-mono text-steel-400">{item.codigo_proveedor}</p>
                              </td>
                              <td className="py-2 pr-4 tabular-nums text-steel-500">{item.cantidad}</td>
                              <td className="py-2 pr-4 tabular-nums font-semibold text-steel-800">{fmtBs2(item.costo_unitario_total_bs)}</td>
                              <td className="py-2 pr-4 tabular-nums font-bold text-steel-900">{fmtBs2(item.precio_venta_final)}</td>
                              <td className={clsx('py-2 font-bold tabular-nums',
                                m >= 50 ? 'text-emerald-600' : m >= 30 ? 'text-brand-600' : 'text-amber-600')}>
                                {fmtPct(m)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </ReportShell>
  )
}

// ─── 3. Rotación de inventario ────────────────────────────────────────────────

function Rotacion({ productos, resumenMap }: { productos: Producto[]; resumenMap: Record<string, ResumenVentas> }) {
  const rows = useMemo(() =>
    productos
      .filter(p => p.estado !== 'descontinuado')
      .map(p => {
        const r = resumenMap[p.id]
        const uds30     = r?.unidades_30d ?? 0
        const vel       = uds30 / 30
        const dias      = vel > 0 ? Math.round(p.stock / vel) : null
        const rot_anual = p.stock > 0 && uds30 > 0 ? (uds30 * 12) / p.stock : 0
        return { p, uds30, dias, rot_anual }
      })
      .sort((a, b) => {
        if (a.dias === null && b.dias === null) return 0
        if (a.dias === null) return 1
        if (b.dias === null) return -1
        return a.dias - b.dias
      }),
    [productos, resumenMap],
  )

  const fastCount  = rows.filter(r => r.dias !== null && r.dias <= 30).length
  const deadCount  = rows.filter(r => r.dias === null || r.dias > 180).length
  const avgDias    = rows.filter(r => r.dias !== null).reduce((s,r) => s + r.dias!, 0) / Math.max(rows.filter(r => r.dias !== null).length, 1)
  const maxDias    = Math.max(...rows.filter(r => r.dias !== null).map(r => r.dias!), 1)

  const tag = (dias: number | null) => {
    if (dias === null)  return { label: 'Sin movimiento', cls: 'bg-red-100 text-red-700',       bar: 'red'   }
    if (dias <= 30)     return { label: 'Rotación alta',  cls: 'bg-emerald-100 text-emerald-700', bar: 'green' }
    if (dias <= 90)     return { label: 'Normal',         cls: 'bg-blue-100 text-blue-700',      bar: 'brand' }
    if (dias <= 180)    return { label: 'Lento',          cls: 'bg-amber-100 text-amber-700',    bar: 'amber' }
    return                    { label: 'Stock muerto',    cls: 'bg-red-100 text-red-700',        bar: 'red'   }
  }

  return (
    <ReportShell
      title="Rotación de inventario"
      kpis={<>
        <Kpi label="Rotación alta (≤30 días)" value={`${fastCount} refs`} color="green" />
        <Kpi label="Días promedio de stock"   value={`${Math.round(avgDias)} días`} />
        <Kpi label="Stock muerto (>180 días)" value={`${deadCount} refs`} color={deadCount > 0 ? 'red' : 'neutral'} />
        <Kpi label="Capital total inventario" value={fmtBs(rows.reduce((s,r) => s + r.p.stock * r.p.precio_costo, 0))} sub="A precio de costo" color="brand" />
      </>}
    >
      {/* Gráfica horizontal de días de stock */}
      <Card title="Días de stock por referencia" desc="Cuántos días dura cada producto al ritmo de ventas actual">
        <div className="space-y-3">
          {rows.filter(r => r.dias !== null).map(({ p, dias, uds30 }) => {
            const t = tag(dias)
            return (
              <HBar
                key={p.id}
                label={p.nombre}
                sub={`${uds30} uds/mes · stock ${p.stock}`}
                value={dias!}
                max={maxDias}
                color={t.bar as 'brand' | 'green' | 'amber' | 'red'}
                right={`${dias} días`}
              />
            )
          })}
          {rows.filter(r => r.dias === null).map(({ p }) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-right">
                <p className="text-xs font-medium text-steel-800 truncate">{p.nombre}</p>
                <p className="text-[10px] text-steel-400">Sin ventas recientes</p>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-7 bg-red-100 rounded-lg border border-red-200 flex items-center px-3">
                  <span className="text-xs font-semibold text-red-600">Sin movimiento — capital inmovilizado</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabla */}
      <Card title="Rotación anual estimada" fullBleed>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-100">
                {['Producto','Stock','Uds/mes','Días de stock','Rotación anual','Valor inmovilizado','Estado'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-steel-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, uds30, dias, rot_anual }) => {
                const t = tag(dias)
                return (
                  <tr key={p.id} className="border-b border-steel-50 hover:bg-steel-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-steel-800">{p.nombre}</p>
                      <p className="text-xs font-mono text-steel-400">{p.codigo_universal}</p>
                    </td>
                    <td className="px-5 py-3 tabular-nums font-semibold text-steel-700">{p.stock}</td>
                    <td className="px-5 py-3 tabular-nums text-steel-500">{uds30}</td>
                    <td className="px-5 py-3 tabular-nums font-bold text-steel-900">{dias != null ? `${dias} días` : '—'}</td>
                    <td className="px-5 py-3 tabular-nums text-steel-600">{rot_anual > 0 ? `${rot_anual.toFixed(1)}×` : '—'}</td>
                    <td className="px-5 py-3 tabular-nums text-steel-700">{fmtBs(p.stock * p.precio_costo)}</td>
                    <td className="px-5 py-3">
                      <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', t.cls)}>{t.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </ReportShell>
  )
}

// ─── 4. Cuentas por cobrar ────────────────────────────────────────────────────

function CuentasCobrar() {
  const sorted   = [...MOCK_CUENTAS_COBRAR].sort((a, b) => b.dias_vencido - a.dias_vencido)
  const total    = sorted.reduce((s, c) => s + c.monto_bs, 0)
  const vencido  = sorted.filter(c => c.dias_vencido > 0).reduce((s, c) => s + c.monto_bs, 0)
  const critico  = sorted.filter(c => c.dias_vencido > 30).reduce((s, c) => s + c.monto_bs, 0)
  const alDia    = total - vencido
  const maxMonto = Math.max(...sorted.map(c => c.monto_bs), 1)

  const aging = [
    { label: 'Al día', value: alDia,    color: 'bg-emerald-500' },
    { label: '1–30d',  value: vencido - critico, color: 'bg-amber-400' },
    { label: '>30d',   value: critico,  color: 'bg-red-500'     },
  ]

  return (
    <ReportShell
      title="Cuentas por cobrar"
      kpis={<>
        <Kpi label="Cartera total"         value={fmtBs(total)}   color="brand" />
        <Kpi label="Al día"                value={fmtBs(alDia)}   color="green" sub={`${((alDia/total)*100).toFixed(0)}% del total`} />
        <Kpi label="Vencido (1–30 días)"   value={fmtBs(vencido - critico)} color="amber" />
        <Kpi label="Crítico (>30 días)"    value={fmtBs(critico)} color="red" />
      </>}
    >
      {/* Aging visual */}
      <Card title="Composición de la cartera por antigüedad">
        <div className="flex h-12 rounded-xl overflow-hidden gap-0.5 mb-3">
          {aging.map(a => (
            <div key={a.label} className={clsx('flex items-center justify-center text-white text-xs font-bold', a.color)}
              style={{ width: `${(a.value / total) * 100}%` }}>
              {(a.value / total) * 100 > 10 ? `${((a.value/total)*100).toFixed(0)}%` : ''}
            </div>
          ))}
        </div>
        <div className="flex gap-5 flex-wrap">
          {aging.map(a => (
            <span key={a.label} className="flex items-center gap-1.5 text-sm">
              <span className={clsx('h-3 w-3 rounded', a.color)} />
              <span className="text-steel-600 font-medium">{a.label}</span>
              <span className="text-steel-900 font-bold tabular-nums">{fmtBs(a.value)}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* Gráfica por cliente */}
      <Card title="Cartera por cliente">
        <div className="space-y-3">
          {sorted.map(c => (
            <HBar
              key={c.id}
              label={c.cliente}
              sub={c.dias_vencido === 0 ? `${c.dias_credito}d crédito · al día` : `Vencido ${c.dias_vencido} días`}
              value={c.monto_bs}
              max={maxMonto}
              color={c.dias_vencido === 0 ? 'green' : c.dias_vencido <= 30 ? 'amber' : 'red'}
              right={fmtBs(c.monto_bs)}
            />
          ))}
        </div>
      </Card>
    </ReportShell>
  )
}

// ─── 5. Pedidos en tránsito ───────────────────────────────────────────────────

function Transito() {
  const todos = useMemo(() =>
    [...MOCK_IMPORTACIONES].sort((a, b) =>
      new Date(a.fecha_estimada_llegada).getTime() - new Date(b.fecha_estimada_llegada).getTime()), [])
  const pendientes = todos.filter(i => i.estado === 'en_transito' || i.estado === 'en_aduana')
  const totalPendiente = pendientes.reduce((s, i) =>
    s + i.fob_total_usd * i.tipo_cambio + i.flete_usd * i.tipo_cambio + i.aduana_bs + i.transporte_interno_bs, 0)

  return (
    <ReportShell
      title="Pedidos en tránsito"
      kpis={<>
        <Kpi label="Importaciones activas" value={`${pendientes.length}`} color="brand" />
        <Kpi label="Valor total en camino" value={fmtBs(totalPendiente)} color="amber" />
        <Kpi label="Próxima llegada" value={pendientes[0]
          ? new Date(pendientes[0].fecha_estimada_llegada).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })
          : '—'} />
        <Kpi label="Total referencias" value={`${pendientes.reduce((s,i) => s + i.items.length, 0)} refs`} />
      </>}
    >
      {pendientes.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <p className="text-3xl mb-3">📦</p>
            <p className="text-sm font-medium text-steel-600">Sin importaciones en tránsito</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pendientes.map(imp => {
            const llegada  = new Date(imp.fecha_estimada_llegada)
            const dias     = Math.ceil((llegada.getTime() - Date.now()) / 86400000)
            const totalBs  = imp.fob_total_usd * imp.tipo_cambio + imp.flete_usd * imp.tipo_cambio + imp.aduana_bs + imp.transporte_interno_bs
            const atrasado = dias < 0
            return (
              <div key={imp.id} className={clsx('bg-white rounded-xl border shadow-sm p-5',
                atrasado ? 'border-red-200 bg-red-50/40' : 'border-steel-200')}>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <p className="text-base font-bold text-steel-900">{imp.numero}</p>
                    <p className="text-sm text-steel-500">{imp.proveedor}</p>
                  </div>
                  <Badge color={ESTADO_IMP_COLOR[imp.estado]}>{ESTADO_IMP_LABEL[imp.estado]}</Badge>
                </div>

                {/* Timeline visual */}
                <div className="mb-4">
                  <div className="flex items-center gap-0">
                    <div className="h-2.5 w-2.5 rounded-full bg-brand-600 shrink-0" />
                    <div className={clsx('flex-1 h-0.5', atrasado ? 'bg-red-400' : 'bg-brand-200')} />
                    <div className={clsx('h-2.5 w-2.5 rounded-full shrink-0', atrasado ? 'bg-red-500' : 'bg-steel-300')} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-steel-400">Creado {new Date(imp.fecha_creacion).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}</span>
                    <span className={clsx('text-[10px] font-semibold', atrasado ? 'text-red-600' : 'text-steel-500')}>
                      {atrasado ? `Atrasado ${Math.abs(dias)}d` : `Llega en ${dias}d · ${llegada.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-1.5 text-xs mb-3">
                  <span className="text-steel-400">Origen</span>
                  <span className="font-medium text-steel-700">{imp.origen}</span>
                  <span className="text-steel-400">Referencias</span>
                  <span className="font-medium text-steel-700">{imp.items.length} items · {imp.items.reduce((s,i) => s + i.cantidad, 0)} uds</span>
                </div>
                <div className="border-t border-steel-100 pt-3 flex items-center justify-between">
                  <span className="text-xs text-steel-400">Total landed cost</span>
                  <span className="text-sm font-bold text-steel-900">{fmtBs(totalBs)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Historial */}
      <Card title="Historial completo" fullBleed>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-100">
                {['Número','Proveedor','Origen','Fecha','Estado','Total'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-steel-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todos.map(imp => {
                const total = imp.fob_total_usd * imp.tipo_cambio + imp.flete_usd * imp.tipo_cambio + imp.aduana_bs + imp.transporte_interno_bs
                return (
                  <tr key={imp.id} className="border-b border-steel-50 hover:bg-steel-50 transition-colors">
                    <td className="px-5 py-3 font-bold text-steel-900">{imp.numero}</td>
                    <td className="px-5 py-3 text-steel-600">{imp.proveedor}</td>
                    <td className="px-5 py-3 text-steel-500">{imp.origen}</td>
                    <td className="px-5 py-3 font-mono text-xs text-steel-400">
                      {new Date(imp.fecha_creacion).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-5 py-3"><Badge color={ESTADO_IMP_COLOR[imp.estado]}>{ESTADO_IMP_LABEL[imp.estado]}</Badge></td>
                    <td className="px-5 py-3 font-bold text-steel-900 tabular-nums">{fmtBs(total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </ReportShell>
  )
}

// ─── 6. Quiebre de stock proyectado ──────────────────────────────────────────

function QuiebreStock({ productos, resumenMap }: { productos: Producto[]; resumenMap: Record<string, ResumenVentas> }) {
  const proyeccion = useMemo(() =>
    productos
      .filter(p => p.estado !== 'descontinuado')
      .flatMap(p => {
        const r     = resumenMap[p.id]
        const uds30 = r?.unidades_30d ?? 0
        if (uds30 === 0) return []
        const dias = Math.round(p.stock / (uds30 / 30))
        if (dias > 90) return []
        return [{ p, dias, uds30, nivel: dias <= 30 ? 'critico' : dias <= 60 ? 'atencion' : 'vigilar' }]
      })
      .sort((a, b) => a.dias - b.dias),
    [productos, resumenMap],
  )

  const criticos  = proyeccion.filter(x => x.nivel === 'critico')
  const atencion  = proyeccion.filter(x => x.nivel === 'atencion')
  const vigilar   = proyeccion.filter(x => x.nivel === 'vigilar')

  return (
    <ReportShell
      title="Quiebre de stock proyectado"
      kpis={<>
        <Kpi label="Críticos (0–30 días)"  value={`${criticos.length} refs`}  color={criticos.length  > 0 ? 'red'    : 'neutral'} />
        <Kpi label="Atención (31–60 días)" value={`${atencion.length} refs`}  color={atencion.length  > 0 ? 'amber'  : 'neutral'} />
        <Kpi label="Vigilar (61–90 días)"  value={`${vigilar.length} refs`}   color={vigilar.length   > 0 ? 'brand'  : 'neutral'} />
        <Kpi label="Total en riesgo"       value={`${proyeccion.length} refs`} sub="Próximos 90 días" />
      </>}
    >
      {[
        { nivel: 'critico', label: '0–30 días — CRÍTICO', items: criticos,
          cardCls: 'border-red-200 bg-red-50', tagCls: 'bg-red-100 text-red-700', barColor: 'red' as const },
        { nivel: 'atencion', label: '31–60 días — Atención', items: atencion,
          cardCls: 'border-amber-200 bg-amber-50/60', tagCls: 'bg-amber-100 text-amber-700', barColor: 'amber' as const },
        { nivel: 'vigilar', label: '61–90 días — Vigilar', items: vigilar,
          cardCls: 'border-steel-200 bg-white', tagCls: 'bg-blue-100 text-blue-700', barColor: 'brand' as const },
      ].map(group => (
        <div key={group.nivel} className={clsx('rounded-xl border p-5', group.cardCls)}>
          <div className="flex items-center gap-2 mb-4">
            <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full', group.tagCls)}>{group.label}</span>
            <span className="text-sm font-semibold text-steel-700">{group.items.length} productos</span>
          </div>
          {group.items.length === 0 ? (
            <p className="text-xs text-steel-400">Sin productos en este rango — bien</p>
          ) : (
            <div className="space-y-2.5">
              {group.items.map(({ p, dias, uds30 }) => (
                <div key={p.id} className="flex items-center gap-3 bg-white/70 rounded-lg px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-steel-800 truncate">{p.nombre}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-steel-200 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full',
                            group.barColor === 'red' ? 'bg-red-400' : group.barColor === 'amber' ? 'bg-amber-400' : 'bg-brand-400')}
                          style={{ width: `${Math.max((dias / 90) * 100, 3)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-steel-900">{dias} días</p>
                    <p className="text-xs text-steel-400">stock {p.stock} · {uds30}/mes</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </ReportShell>
  )
}

// ─── 7. Proveedores: cumplimiento y calidad ───────────────────────────────────

function Proveedores() {
  const sorted = [...MOCK_PROVEEDORES_CUMPLIMIENTO].sort((a, b) =>
    (b.pedidos_a_tiempo / b.pedidos_total) - (a.pedidos_a_tiempo / a.pedidos_total))

  const mejor   = sorted[0]
  const peor    = sorted[sorted.length - 1]
  const avgDef  = sorted.reduce((s, p) => s + p.defectos_pct, 0) / sorted.length

  return (
    <ReportShell
      title="Proveedores — cumplimiento y calidad"
      kpis={<>
        <Kpi label="Mejor cumplimiento" value={mejor ? `${((mejor.pedidos_a_tiempo/mejor.pedidos_total)*100).toFixed(0)}%` : '—'}
          sub={mejor?.nombre.split(' ')[0]} color="green" />
        <Kpi label="Peor cumplimiento"  value={peor  ? `${((peor.pedidos_a_tiempo/peor.pedidos_total)*100).toFixed(0)}%` : '—'}
          sub={peor?.nombre.split(' ')[0]}  color="red" />
        <Kpi label="Defectos promedio"  value={`${avgDef.toFixed(1)}%`} sub="Tasa de defectos" color={avgDef > 1 ? 'amber' : 'neutral'} />
        <Kpi label="Gasto total"        value={fmtBs(sorted.reduce((s,p) => s + p.monto_total_bs, 0))} sub="Todos los proveedores" />
      </>}
    >
      {/* Scorecard visual */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map(p => {
          const pct      = (p.pedidos_a_tiempo / p.pedidos_total) * 100
          const quality  = pct >= 95 ? 'excellent' : pct >= 80 ? 'good' : 'poor'
          const defOk    = p.defectos_pct <= 0.5
          return (
            <div key={p.id} className={clsx('bg-white rounded-xl border shadow-sm p-5',
              quality === 'excellent' ? 'border-emerald-200' : quality === 'good' ? 'border-amber-200' : 'border-red-200')}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-steel-900 leading-snug">{p.nombre}</p>
                  <p className="text-xs text-steel-400">{PAIS_FLAG[p.pais] ?? '🌍'} {p.pais}</p>
                </div>
                <span className={clsx('text-lg font-black tabular-nums',
                  quality === 'excellent' ? 'text-emerald-600' : quality === 'good' ? 'text-amber-600' : 'text-red-600')}>
                  {pct.toFixed(0)}%
                </span>
              </div>

              {/* Cumplimiento bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-steel-400 mb-1">
                  <span>Pedidos a tiempo</span>
                  <span>{p.pedidos_a_tiempo}/{p.pedidos_total}</span>
                </div>
                <div className="h-2 bg-steel-100 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full',
                      quality === 'excellent' ? 'bg-emerald-500' : quality === 'good' ? 'bg-amber-400' : 'bg-red-400')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-steel-50 rounded-lg p-2">
                  <p className="text-steel-400 mb-0.5">Retraso prom.</p>
                  <p className={clsx('font-bold', p.dias_retraso_promedio === 0 ? 'text-emerald-600' : p.dias_retraso_promedio <= 3 ? 'text-amber-600' : 'text-red-600')}>
                    {p.dias_retraso_promedio === 0 ? 'Ninguno' : `${p.dias_retraso_promedio.toFixed(1)} días`}
                  </p>
                </div>
                <div className={clsx('rounded-lg p-2', defOk ? 'bg-steel-50' : 'bg-red-50')}>
                  <p className="text-steel-400 mb-0.5">Defectos</p>
                  <p className={clsx('font-bold', defOk ? 'text-emerald-600' : 'text-red-600')}>
                    {p.defectos_pct.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-steel-100 flex items-center justify-between">
                <span className="text-xs text-steel-400">Gasto total</span>
                <span className="text-xs font-bold text-steel-900">{fmtBs(p.monto_total_bs)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </ReportShell>
  )
}

// ─── 8. Stock muerto ──────────────────────────────────────────────────────────

function StockMuerto({ productos, resumenMap }: { productos: Producto[]; resumenMap: Record<string, ResumenVentas> }) {
  const muerto = useMemo(() =>
    productos
      .filter(p => p.estado !== 'descontinuado' && p.stock > 0)
      .map(p => {
        const r    = resumenMap[p.id]
        const uds  = r?.unidades_30d ?? 0
        const rot  = p.stock > 0 ? uds / p.stock : 0
        return { p, uds, rot, valor: p.stock * p.precio_costo }
      })
      .filter(x => x.rot < 0.1)
      .sort((a, b) => b.valor - a.valor),
    [productos, resumenMap],
  )

  const total  = muerto.reduce((s, x) => s + x.valor, 0)
  const maxVal = Math.max(...muerto.map(x => x.valor), 1)

  return (
    <ReportShell
      title="Antigüedad de inventario — stock muerto"
      kpis={<>
        <Kpi label="Capital inmovilizado"   value={fmtBs(total)}        color="red" />
        <Kpi label="Productos sin rotación" value={`${muerto.length}`}  color={muerto.length > 0 ? 'amber' : 'neutral'} />
        <Kpi label="Mayor lote"             value={muerto[0] ? fmtBs(muerto[0].valor) : '—'} sub={muerto[0]?.p.nombre.split(' ').slice(0,2).join(' ')} />
        <Kpi label="Sin ninguna venta"      value={`${muerto.filter(x => x.uds === 0).length} refs`} color="red" />
      </>}
    >
      <Card title="Capital inmovilizado por referencia" desc="Valor a precio de costo — ordenado por monto en riesgo">
        <div className="space-y-3">
          {muerto.map(({ p, uds, valor }) => (
            <HBar
              key={p.id}
              label={p.nombre}
              sub={uds === 0 ? 'Sin ventas registradas' : `${uds} uds/mes · rot. ${((uds/p.stock)*100).toFixed(0)}%`}
              value={valor}
              max={maxVal}
              color={uds === 0 ? 'red' : 'amber'}
              right={fmtBs(valor)}
            />
          ))}
        </div>
      </Card>
    </ReportShell>
  )
}

// ─── 9. Ventas por vehículo ───────────────────────────────────────────────────

function PorVehiculo({ productos, resumenMap }: { productos: Producto[]; resumenMap: Record<string, ResumenVentas> }) {
  const grupos = useMemo(() => {
    const m: Record<string, { vehiculo: string; uds30: number; ingreso30: number; refs: number; top: string }> = {}
    productos
      .filter(p => p.estado !== 'descontinuado')
      .forEach(p => {
        const r   = resumenMap[p.id]
        const uds = r?.unidades_30d ?? 0
        const key = p.vehiculo || 'Sin especificar'
        if (!m[key]) m[key] = { vehiculo: key, uds30: 0, ingreso30: 0, refs: 0, top: p.nombre }
        m[key].uds30      += uds
        m[key].ingreso30  += uds * p.precio_venta
        m[key].refs       += 1
        if (uds > 0 && m[key].top === p.nombre) m[key].top = p.nombre
      })
    return Object.values(m).sort((a, b) => b.uds30 - a.uds30)
  }, [productos, resumenMap])

  const maxUds     = Math.max(...grupos.map(g => g.uds30), 1)
  const totalUds   = grupos.reduce((s, g) => s + g.uds30, 0)
  const topGrupo   = grupos[0]

  return (
    <ReportShell
      title="Partes más vendidas por marca / modelo"
      kpis={<>
        <Kpi label="Vehículo top"       value={topGrupo?.vehiculo ?? '—'} sub={`${topGrupo?.uds30 ?? 0} uds/mes`} color="brand" />
        <Kpi label="Total unidades/mes" value={`${totalUds}`} />
        <Kpi label="Marcas/modelos"     value={`${grupos.length}`} sub="Compatibilidades distintas" />
        <Kpi label="Ingresos top"       value={fmtBs(topGrupo?.ingreso30 ?? 0)} sub={topGrupo?.vehiculo} color="green" />
      </>}
    >
      {/* Gráfica de barras verticales */}
      <Card title="Unidades vendidas por vehículo (últimos 30 días)">
        <VBars
          data={grupos.map(g => ({ label: g.vehiculo, value: g.uds30, sub: g.vehiculo.split(' ')[0] }))}
          h={160}
          color="brand"
        />
      </Card>

      {/* Lista detallada */}
      <Card title="Detalle por modelo">
        <div className="space-y-4">
          {grupos.map((g, i) => (
            <div key={g.vehiculo} className="flex items-center gap-4">
              <span className="text-xl font-black text-steel-200 w-8 text-right shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <p className="text-sm font-semibold text-steel-800 truncate">{g.vehiculo}</p>
                  <p className="text-sm font-bold text-steel-900 tabular-nums shrink-0">{g.uds30} uds</p>
                </div>
                <div className="h-2 bg-steel-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(g.uds30 / maxUds) * 100}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-xs text-steel-400">
                  <span>{g.refs} referencias</span>
                  <span>{fmtBs(g.ingreso30)} / mes</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ReportShell>
  )
}

// ─── 10. Clientes en fuga ─────────────────────────────────────────────────────

function ClientesFuga() {
  const perdida = MOCK_CLIENTES_CAIDA.reduce((s, c) => s + (c.compras_30d_anterior_bs - c.compras_30d_actual_bs), 0)

  return (
    <ReportShell
      title="Clientes con caída de compras"
      kpis={<>
        <Kpi label="Clientes en fuga"     value={`${MOCK_CLIENTES_CAIDA.length}`} color="red" />
        <Kpi label="Ingresos perdidos/mes" value={fmtBs(perdida)} color="red" sub="vs. mes anterior" />
        <Kpi label="Mayor caída"           value={`-${MOCK_CLIENTES_CAIDA[0].pct_caida.toFixed(0)}%`}
          sub={MOCK_CLIENTES_CAIDA[0].nombre.split(' ').slice(0,2).join(' ')} color="red" />
        <Kpi label="Última compra más lejana" value={new Date(MOCK_CLIENTES_CAIDA[0].ultima_compra)
          .toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })} sub={MOCK_CLIENTES_CAIDA[0].nombre.split(' ')[0]} />
      </>}
    >
      <div className="space-y-4">
        {MOCK_CLIENTES_CAIDA.map(c => {
          const perdidaC = c.compras_30d_anterior_bs - c.compras_30d_actual_bs
          const pct      = (c.compras_30d_actual_bs / c.compras_30d_anterior_bs) * 100
          const severity = c.pct_caida >= 70 ? 'high' : c.pct_caida >= 55 ? 'mid' : 'low'
          return (
            <div key={c.id} className={clsx('bg-white rounded-xl border shadow-sm p-5',
              severity === 'high' ? 'border-red-200' : severity === 'mid' ? 'border-amber-200' : 'border-steel-200')}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={clsx('h-10 w-10 rounded-xl flex items-center justify-center text-base font-black shrink-0',
                    severity === 'high' ? 'bg-red-100 text-red-700' : severity === 'mid' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700')}>
                    {c.nombre.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-steel-900">{c.nombre}</p>
                    <p className="text-xs text-steel-400 capitalize">{c.tipo} · última compra {new Date(c.ultima_compra).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={clsx('text-2xl font-black tabular-nums',
                    severity === 'high' ? 'text-red-600' : severity === 'mid' ? 'text-amber-600' : 'text-yellow-600')}>
                    -{c.pct_caida.toFixed(0)}%
                  </p>
                  <p className="text-xs text-steel-400">Pérdida: {fmtBs(perdidaC)}</p>
                </div>
              </div>

              {/* Comparación visual */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-steel-400 mb-1">
                    <span>Mes anterior</span>
                    <span className="font-medium text-steel-600">{fmtBs(c.compras_30d_anterior_bs)}</span>
                  </div>
                  <div className="h-3 bg-steel-100 rounded-full overflow-hidden">
                    <div className="h-full bg-steel-300 rounded-full w-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-steel-700">Mes actual</span>
                    <span className="font-bold text-steel-900">{fmtBs(c.compras_30d_actual_bs)}</span>
                  </div>
                  <div className="h-3 bg-steel-100 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full',
                        severity === 'high' ? 'bg-red-400' : severity === 'mid' ? 'bg-amber-400' : 'bg-yellow-400')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </ReportShell>
  )
}

// ─── 11. Estacionalidad ───────────────────────────────────────────────────────

function Estacionalidad() {
  const currentMonth = new Date().getMonth()

  return (
    <ReportShell
      title="Estacionalidad por referencia"
      kpis={<>
        <Kpi label="Referencias analizadas" value={`${MOCK_ESTACIONALIDAD.length}`} />
        <Kpi label="Mes actual" value={['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][currentMonth]} color="brand" />
        <Kpi label="Pico general" value="May–Sep" sub="Temporada alta autopartes" color="amber" />
        <Kpi label="Valle general" value="Feb–Mar" sub="Temporada baja" />
      </>}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {MOCK_ESTACIONALIDAD.map(ref => {
          const total   = ref.ventas.reduce((s, v) => s + v.unidades, 0)
          const peak    = ref.ventas.reduce((best, v) => v.unidades > best.unidades ? v : best, ref.ventas[0])
          const valley  = ref.ventas.reduce((worst, v) => v.unidades < worst.unidades ? v : worst, ref.ventas[0])

          return (
            <Card key={ref.codigo}>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-sm font-bold text-steel-800">{ref.nombre}</p>
                <p className="text-xs font-mono text-steel-400">{ref.codigo}</p>
              </div>
              <div className="flex gap-4 text-xs mb-4">
                <span className="text-steel-400">Pico: <strong className="text-emerald-600">{peak.mes} ({peak.unidades} uds)</strong></span>
                <span className="text-steel-400">Valle: <strong className="text-steel-500">{valley.mes} ({valley.unidades} uds)</strong></span>
                <span className="text-steel-400">Año: <strong>{total} uds</strong></span>
              </div>
              <VBars
                data={ref.ventas.map((v) => ({ label: v.mes, value: v.unidades, sub: v.mes }))}
                h={100}
                color="brand"
                highlight={currentMonth}
              />
            </Card>
          )
        })}
      </div>
    </ReportShell>
  )
}

export function ReportesPage() {
  const { report } = useParams<{ report: string }>()
  const { productos: storeProductos, setProductos } = useInventarioStore()

  if (storeProductos.length === 0) setProductos(MOCK_PRODUCTOS, MOCK_PRODUCTOS.length)
  const productos = storeProductos.length > 0 ? storeProductos : MOCK_PRODUCTOS

  const resumenMap = useMemo(() => {
    const m: Record<string, ResumenVentas> = {}
    MOCK_RESUMEN_VENTAS.forEach(r => { m[r.producto_id] = r })
    return m
  }, [])

  const content = (() => {
    switch (report) {
      case 'rentabilidad':   return <Rentabilidad  productos={productos} resumenMap={resumenMap} />
      case 'landed-cost':    return <LandedCost />
      case 'rotacion':       return <Rotacion      productos={productos} resumenMap={resumenMap} />
      case 'cxc':            return <CuentasCobrar />
      case 'transito':       return <Transito />
      case 'quiebre':        return <QuiebreStock  productos={productos} resumenMap={resumenMap} />
      case 'proveedores':    return <Proveedores />
      case 'stock-muerto':   return <StockMuerto   productos={productos} resumenMap={resumenMap} />
      case 'vehiculos':      return <PorVehiculo   productos={productos} resumenMap={resumenMap} />
      case 'clientes-fuga':  return <ClientesFuga />
      case 'estacionalidad': return <Estacionalidad />
      default:               return <Navigate to="/reportes/rentabilidad" replace />
    }
  })()

  return (
    <MainLayout>
      <PageContainer>
        {content}
      </PageContainer>
    </MainLayout>
  )
}
