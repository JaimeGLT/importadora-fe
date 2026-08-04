import { useEffect, useState } from 'react'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { MI_RESUMEN_COMISION_QUERY, DETALLE_COMISION_QUERY, type ResumenComisionAPI, type ComisionDetalleVentaAPI } from '@/lib/queries/reportes.queries'
import { ComisionVentasDetalle } from './ComisionVentasDetalle'

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function MisComisionesPage() {
  const { isTokenReady, user } = useAuth()

  const today = new Date()
  const hoyISO = toISODate(today)

  const [desde, setDesde] = useState(hoyISO)
  const [hasta, setHasta] = useState(hoyISO)
  const [resumen, setResumen] = useState<ResumenComisionAPI | null>(null)
  const [ventas, setVentas] = useState<ComisionDetalleVentaAPI[]>([])
  const [loading, setLoading] = useState(false)
  const [rangoActivo, setRangoActivo] = useState<'hoy' | 'semana' | 'mes' | null>('hoy')

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
    if (!isTokenReady || !user) return
    setLoading(true)
    const variables = {
      desde: `${desde}T00:00:00-04:00`,
      hasta: `${hasta}T23:59:59-04:00`,
    }
    Promise.all([
      gql<{ miResumenComision: ResumenComisionAPI }>(MI_RESUMEN_COMISION_QUERY, variables),
      gql<{ detalleComisionUsuario: ComisionDetalleVentaAPI[] }>(DETALLE_COMISION_QUERY, { usuarioId: user.id, ...variables }),
    ])
      .then(([resResumen, resDetalle]) => {
        setResumen(resResumen.miResumenComision ?? null)
        setVentas(resDetalle.detalleComisionUsuario ?? [])
      })
      .catch(() => {
        setResumen(null)
        setVentas([])
      })
      .finally(() => setLoading(false))
  }, [isTokenReady, user, desde, hasta])

  return (
    <MainLayout>
      <PageTopBar title="Mis comisiones" />
      <PageContainer>
        <PageHeader
          title="Mis comisiones"
          description="Tus ventas y monto a cobrar según el período seleccionado"
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
              <button type="button" onClick={aplicarHoy} className={claseBoton(rangoActivo === 'hoy')}>
                Hoy
              </button>
              <button type="button" onClick={aplicarEstaSemana} className={claseBoton(rangoActivo === 'semana')}>
                Esta semana
              </button>
              <button type="button" onClick={aplicarEsteMes} className={claseBoton(rangoActivo === 'mes')}>
                Este mes
              </button>
            </div>
          </div>
        </div>

        <ComisionVentasDetalle
          ventas={ventas}
          loading={loading}
          porcentajeComision={resumen?.porcentajeComision ?? 0}
          montoComision={resumen?.montoComision ?? 0}
        />
      </PageContainer>
    </MainLayout>
  )
}
