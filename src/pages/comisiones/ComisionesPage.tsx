import { useEffect, useMemo, useState } from 'react'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { COMISIONES_QUERY, type ResumenComisionAPI } from '@/lib/queries/reportes.queries'
import { ComisionDetalleDrawer } from './ComisionDetalleDrawer'

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function ComisionesPage() {
  const { isTokenReady } = useAuth()

  const today = new Date()
  const hoyISO = toISODate(today)

  const [desde, setDesde] = useState(hoyISO)
  const [hasta, setHasta] = useState(hoyISO)
  const [data, setData] = useState<ResumenComisionAPI[]>([])
  const [loading, setLoading] = useState(false)
  const [usuarioDetalle, setUsuarioDetalle] = useState<{ id: string; nombre: string; apellido: string; porcentajeComision: number; montoComision: number } | null>(null)
  const [rangoActivo, setRangoActivo] = useState<'hoy' | 'semana' | 'mes' | null>('hoy')
  const [busqueda, setBusqueda] = useState('')

  function lunesDeEstaSemana(): Date {
    const hoy = new Date()
    const diaSemana = hoy.getDay() // 0=domingo, 1=lunes, ... 6=sábado
    const offsetLunes = diaSemana === 0 ? 6 : diaSemana - 1
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - offsetLunes)
    return lunes
  }

  const aplicarHoy = () => {
    setDesde(hoyISO)
    setHasta(hoyISO)
    setRangoActivo('hoy')
  }

  const aplicarEstaSemana = () => {
    setDesde(toISODate(lunesDeEstaSemana()))
    setHasta(hoyISO)
    setRangoActivo('semana')
  }

  const aplicarEsteMes = () => {
    const fin = new Date()
    const inicio = new Date(fin.getFullYear(), fin.getMonth(), 1)
    setDesde(toISODate(inicio))
    setHasta(toISODate(fin))
    setRangoActivo('mes')
  }

  const cambiarFechaManual = (campo: 'desde' | 'hasta', valor: string) => {
    if (campo === 'desde') setDesde(valor)
    else setHasta(valor)
    setRangoActivo(null)
  }

  const claseBoton = (activo: boolean) =>
    `h-9 px-3 rounded-lg border text-xs font-semibold transition-colors ${
      activo
        ? 'bg-[#780e18] border-[#780e18] text-white'
        : 'border-[#E8E5E2] text-[#4A4744] hover:bg-[#F5F0EB] hover:border-[#D0CBC4]'
    }`

  useEffect(() => {
    if (!isTokenReady) return
    setLoading(true)
    gql<{ resumenComisionesCajeros: ResumenComisionAPI[] }>(COMISIONES_QUERY, {
      desde: `${desde}T00:00:00-04:00`,
      hasta: `${hasta}T23:59:59-04:00`,
    })
      .then(res => setData(res.resumenComisionesCajeros ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [isTokenReady, desde, hasta])

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const filtradas = q
      ? data.filter(r => `${r.nombre} ${r.apellido}`.toLowerCase().includes(q))
      : data
    return [...filtradas].sort((a, b) => b.montoComision - a.montoComision)
  }, [data, busqueda])

  const totales = useMemo(() => ({
    totalVentas: filas.reduce((s, r) => s + r.totalVentas, 0),
    montoComision: filas.reduce((s, r) => s + r.montoComision, 0),
  }), [filas])

  return (
    <MainLayout>
      <PageTopBar title="Comisiones" />
      <PageContainer>
        <PageHeader
          title="Comisiones"
          description="Montos a pagar según ventas del período seleccionado"
        />

        {/* ── Filtro de fechas ── */}
        <div className="bg-white rounded-xl border border-[#E8E5E2] p-4 mb-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-[calc(50%-8px)] sm:w-auto">
              <label className="block text-[11px] font-semibold text-[#4A4744] mb-1.5 uppercase tracking-wide">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={e => cambiarFechaManual('desde', e.target.value)}
                className="h-9 w-full px-3 rounded-lg border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
              />
            </div>
            <div className="w-[calc(50%-8px)] sm:w-auto">
              <label className="block text-[11px] font-semibold text-[#4A4744] mb-1.5 uppercase tracking-wide">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={e => cambiarFechaManual('hasta', e.target.value)}
                className="h-9 w-full px-3 rounded-lg border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto pb-0.5">
              <button
                type="button"
                onClick={aplicarHoy}
                className={claseBoton(rangoActivo === 'hoy')}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={aplicarEstaSemana}
                className={claseBoton(rangoActivo === 'semana')}
              >
                Esta semana
              </button>
              <button
                type="button"
                onClick={aplicarEsteMes}
                className={claseBoton(rangoActivo === 'mes')}
              >
                Este mes
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#F0EFEC]">
            <label className="block text-[11px] font-semibold text-[#4A4744] mb-1.5 uppercase tracking-wide">Buscar por nombre o apellido</label>
            <div className="relative sm:max-w-xs">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7571] text-[14px]" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Ej. Juan Pérez..."
                className="h-9 w-full pl-9 pr-3 rounded-lg border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-[#E8E5E2] p-4">
            <p className="text-[10.5px] font-semibold text-[#7A7571] uppercase tracking-wider mb-1">Total ventas período</p>
            <p className="text-2xl font-black text-[#2D2B2A] tabular-nums">{fmtBs(totales.totalVentas)}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E8E5E2] border-l-4 border-l-[#3F7A52] p-4">
            <p className="text-[10.5px] font-semibold text-[#7A7571] uppercase tracking-wider mb-1">Total a pagar en comisiones</p>
            <p className="text-2xl font-black text-[#3F7A52] tabular-nums">{fmtBs(totales.montoComision)}</p>
          </div>
        </div>

        {/* ── Tabla ── */}
        <div className="bg-white rounded-xl border border-[#E8E5E2] overflow-hidden">
          {loading ? (
            <div className="divide-y divide-[#E8E5E2]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-[#F0EFEC] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-36 rounded bg-[#F0EFEC]" />
                  </div>
                  <div className="h-4 w-20 rounded bg-[#F0EFEC]" />
                  <div className="h-4 w-12 rounded bg-[#F0EFEC]" />
                  <div className="h-4 w-24 rounded bg-[#F0EFEC]" />
                </div>
              ))}
            </div>
          ) : filas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-lg bg-[#F0EFEC] border border-[#E8E5E2] flex items-center justify-center mb-4">
                <i className="ti ti-percentage text-[#7A7571] text-xl" />
              </div>
              <p className="text-sm font-semibold text-[#2D2B2A] mb-1">{busqueda ? 'Sin resultados' : rangoActivo === 'hoy' ? 'Sin ventas hoy' : 'Sin ventas en el período'}</p>
              <p className="text-xs text-[#7A7571] max-w-xs">No hay órdenes completadas en el rango de fechas seleccionado.</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F5F0EB]">
                    <tr>
                      {['Usuario', 'Total ventas', '% Comisión', 'Monto a pagar', ''].map((h, i) => (
                        <th key={i} className="px-5 py-[11px] text-[10.5px] font-semibold text-[#7A7571] uppercase tracking-[0.12em] border-b border-[#D0CBC4] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map(r => (
                      <tr key={r.cajeroId} className="border-t border-[#E8E5E2] hover:bg-[#FAF5EE] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-[#F4ECDB] text-[#780e18]">
                              {r.nombre.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[13px] text-[#2D2B2A]">{r.nombre} {r.apellido}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-[#4A4744] tabular-nums">{fmtBs(r.totalVentas)}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F0F9F4] text-[#3F7A52] border border-[#C8E6D4]">
                            <i className="ti ti-percentage text-[10px]" />
                            {r.porcentajeComision}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-[14px] text-[#3F7A52] tabular-nums">{fmtBs(r.montoComision)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setUsuarioDetalle({ id: r.cajeroId, nombre: r.nombre, apellido: r.apellido, porcentajeComision: r.porcentajeComision, montoComision: r.montoComision })}
                            className="h-8 px-3 rounded-lg border border-[#E8E5E2] text-[11.5px] font-semibold text-[#4A4744] hover:bg-[#F5F0EB] hover:border-[#D0CBC4] transition-colors whitespace-nowrap"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Fila totales */}
                    <tr className="border-t-2 border-[#D0CBC4] bg-[#F5F0EB]">
                      <td className="px-5 py-3 text-[12px] font-bold text-[#2D2B2A]">Total</td>
                      <td className="px-5 py-3 text-[13px] font-bold text-[#2D2B2A] tabular-nums">{fmtBs(totales.totalVentas)}</td>
                      <td className="px-5 py-3" />
                      <td className="px-5 py-3 font-bold text-[14px] text-[#3F7A52] tabular-nums">{fmtBs(totales.montoComision)}</td>
                      <td className="px-5 py-3" />
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-[#E8E5E2]">
                {filas.map(r => (
                  <div key={r.cajeroId} className="px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-[#F4ECDB] text-[#780e18]">
                          {r.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-[13px] text-[#2D2B2A]">{r.nombre} {r.apellido}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0F9F4] text-[#3F7A52] border border-[#C8E6D4]">
                        {r.porcentajeComision}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] mb-2.5">
                      <span className="text-[#7A7571]">Ventas: <span className="text-[#2D2B2A] font-semibold">{fmtBs(r.totalVentas)}</span></span>
                      <span className="font-bold text-[#3F7A52]">{fmtBs(r.montoComision)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUsuarioDetalle({ id: r.cajeroId, nombre: r.nombre, apellido: r.apellido, porcentajeComision: r.porcentajeComision, montoComision: r.montoComision })}
                      className="w-full h-8 rounded-lg border border-[#E8E5E2] text-[11.5px] font-semibold text-[#4A4744] hover:bg-[#F5F0EB] transition-colors"
                    >
                      Ver detalle
                    </button>
                  </div>
                ))}
                <div className="px-4 py-3 bg-[#F5F0EB] flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#2D2B2A]">Total a pagar</span>
                  <span className="font-bold text-[14px] text-[#3F7A52]">{fmtBs(totales.montoComision)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </PageContainer>

      <ComisionDetalleDrawer
        usuario={usuarioDetalle}
        desde={desde}
        hasta={hasta}
        onClose={() => setUsuarioDetalle(null)}
      />
    </MainLayout>
  )
}
