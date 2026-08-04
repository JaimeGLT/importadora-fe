import type { MovimientoCajaAPI } from '@/lib/queries/caja.queries'
import type { Credito } from '@/types'

export interface VentasPorMetodo {
  efectivo: number
  tarjeta: number
  qr: number
  credito: number
  total: number
}

type CreditoResumen = Pick<Credito, 'estado' | 'total' | 'fechaCreacion'>

/**
 * Agrega ventas por método de pago dentro de un rango de fechas (inclusive, 'YYYY-MM-DD').
 * Contado sale de los MovimientoCaja de categoría "Ventas"; crédito se toma del total
 * de los créditos otorgados en el rango (no pasa por caja hasta que se cobra el abono).
 */
export function calcularVentasPorMetodo(
  movimientos: MovimientoCajaAPI[],
  creditos: CreditoResumen[],
  desde: string,
  hasta: string,
): VentasPorMetodo {
  const enRango = (fechaISO: string) => {
    const d = fechaISO.slice(0, 10)
    return d >= desde && d <= hasta
  }

  const ventasContado = movimientos.filter(m =>
    m.tipo === 'Ingreso' && m.categoria === 'Ventas' && enRango(m.fecha)
  )
  const sumaPorTipo = (tipoPago: string) =>
    ventasContado.filter(m => m.tipoPago === tipoPago).reduce((s, m) => s + m.monto, 0)

  const efectivo = sumaPorTipo('Efectivo')
  const tarjeta = sumaPorTipo('Tarjeta')
  const qr = sumaPorTipo('QR')
  const credito = creditos
    .filter(c => c.estado !== 'Cancelado' && enRango(c.fechaCreacion))
    .reduce((s, c) => s + c.total, 0)

  return { efectivo, tarjeta, qr, credito, total: efectivo + tarjeta + qr + credito }
}
