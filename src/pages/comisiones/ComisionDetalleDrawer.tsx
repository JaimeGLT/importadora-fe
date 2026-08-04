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
  montoComision: number
}

interface ComisionDetalleDrawerProps {
  usuario: UsuarioComision | null
  desde: string
  hasta: string
  onClose: () => void
}

export function ComisionDetalleDrawer({ usuario, desde, hasta, onClose }: ComisionDetalleDrawerProps) {
  const { isTokenReady } = useAuth()
  const [ventas, setVentas] = useState<ComisionDetalleVentaAPI[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!usuario || !isTokenReady) return
    setLoading(true)
    gql<{ detalleComisionUsuario: ComisionDetalleVentaAPI[] }>(DETALLE_COMISION_QUERY, {
      usuarioId: usuario.id,
      desde: `${desde}T00:00:00-04:00`,
      hasta: `${hasta}T23:59:59-04:00`,
    })
      .then(res => setVentas(res.detalleComisionUsuario ?? []))
      .catch(() => setVentas([]))
      .finally(() => setLoading(false))
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
      <ComisionVentasDetalle
        ventas={ventas}
        loading={loading}
        porcentajeComision={usuario?.porcentajeComision ?? 0}
        montoComision={usuario?.montoComision ?? 0}
      />
    </DrawerWrapper>
  )
}
