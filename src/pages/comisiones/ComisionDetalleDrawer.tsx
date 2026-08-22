import { useEffect, useState } from 'react'
import { DrawerWrapper } from '@/components/ui/DrawerWrapper'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { DETALLE_COMISION_QUERY, type ComisionDetalleVentaAPI } from '@/lib/queries/reportes.queries'
import { ComisionVentasDetalle } from './ComisionVentasDetalle'

interface UsuarioComision {
  id: string
  nombre: string
  apellido: string
  porcentajeComision: number
}

interface ComisionDetalleDrawerProps {
  usuario: UsuarioComision | null
  desde: string
  hasta: string
  onClose: () => void
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function lunesDeEstaSemana(): Date {
  const hoy = new Date()
  const diaSemana = hoy.getDay()
  const offsetLunes = diaSemana === 0 ? 6 : diaSemana - 1
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - offsetLunes)
  return lunes
}

const claseBoton = (activo: boolean) =>
  `h-8 px-2.5 rounded-lg border text-[11px] font-semibold transition-colors ${
    activo
      ? 'bg-[#780e18] border-[#780e18] text-white'
      : 'border-[#E8E5E2] text-[#4A4744] hover:bg-[#F5F0EB] hover:border-[#D0CBC4]'
  }`

export function ComisionDetalleDrawer({ usuario, desde: desdeInicial, hasta: hastaInicial, onClose }: ComisionDetalleDrawerProps) {
  const { isTokenReady } = useAuth()
  const [ventas, setVentas] = useState<ComisionDetalleVentaAPI[]>([])
  const [loading, setLoading] = useState(false)
  const [desde, setDesde] = useState(desdeInicial)
  const [hasta, setHasta] = useState(hastaInicial)
  const [rangoActivo, setRangoActivo] = useState<'hoy' | 'semana' | 'mes' | null>(null)

  // Cada vez que se abre el drawer para un usuario, arranca con el mismo rango
  // que tenía la pantalla de Comisiones al momento de abrirlo.
  useEffect(() => {
    if (!usuario) return
    setDesde(desdeInicial)
    setHasta(hastaInicial)
    setRangoActivo(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  const aplicarHoy = () => {
    const hoyISO = toISODate(new Date())
    setDesde(hoyISO)
    setHasta(hoyISO)
    setRangoActivo('hoy')
  }

  const aplicarEstaSemana = () => {
    setDesde(toISODate(lunesDeEstaSemana()))
    setHasta(toISODate(new Date()))
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

  useEffect(() => {
    if (!usuario || !isTokenReady || !desde || !hasta) return
    let cancelado = false
    setLoading(true)
    gql<{ detalleComisionUsuario: ComisionDetalleVentaAPI[] }>(DETALLE_COMISION_QUERY, {
      usuarioId: usuario.id,
      desde: `${desde}T00:00:00-04:00`,
      hasta: `${hasta}T23:59:59-04:00`,
    })
      .then(res => { if (!cancelado) setVentas(res.detalleComisionUsuario ?? []) })
      .catch(() => { if (!cancelado) setVentas([]) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [usuario, desde, hasta, isTokenReady])

  return (
    <DrawerWrapper
      open={!!usuario}
      onClose={onClose}
      subtitle="Detalle de ventas"
      title={usuario ? `${usuario.nombre} ${usuario.apellido}` : ''}
      footer={
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-lg border border-[#E8E5E2] text-sm font-semibold text-[#4A4744] hover:bg-[#F5F0EB] transition-colors"
        >
          Cerrar
        </button>
      }
    >
      <div className="bg-white rounded-xl border border-[#E8E5E2] p-3 mb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <button type="button" onClick={aplicarHoy} className={claseBoton(rangoActivo === 'hoy')}>Hoy</button>
          <button type="button" onClick={aplicarEstaSemana} className={claseBoton(rangoActivo === 'semana')}>Esta semana</button>
          <button type="button" onClick={aplicarEsteMes} className={claseBoton(rangoActivo === 'mes')}>Este mes</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-[#7A7571] mb-1 uppercase tracking-wide">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={e => cambiarFechaManual('desde', e.target.value)}
              className="h-9 w-full px-2.5 rounded-lg border border-[#E8E5E2] bg-white text-[#2D2B2A] text-xs focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#7A7571] mb-1 uppercase tracking-wide">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={e => cambiarFechaManual('hasta', e.target.value)}
              className="h-9 w-full px-2.5 rounded-lg border border-[#E8E5E2] bg-white text-[#2D2B2A] text-xs focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
            />
          </div>
        </div>
      </div>

      <ComisionVentasDetalle
        ventas={ventas}
        loading={loading}
        porcentajeComision={usuario?.porcentajeComision ?? 0}
      />
    </DrawerWrapper>
  )
}
