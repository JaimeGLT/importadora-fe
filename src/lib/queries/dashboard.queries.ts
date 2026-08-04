import type { ProductoAPISimple } from './inventario.queries'
import type { DashboardOrdenAPI } from './ventas.queries'
import type { TipoCambioAPI } from './config.queries'
import type { MovimientoCajaAPI } from './caja.queries'
import type { EstadoCredito } from '@/types'

export const DASHBOARD_QUERY = `
  query Dashboard($first: Int, $after: String) {
    productos(first: $first, after: $after) {
      nodes {
        id
        codigo
        codigoAux
        codigoAux2
        nombre
        marcaId
        ubicacion
        stock_Actual
        stockReservado
        stock_Minimo
        calcularStockKit
        esKit
        costo
        precio
        conversionABs
        fechaCreacion
        fechaActualizacion
      }
    }
    todasOrdenes {
      nodes {
        id
        estado
        fecha
        fechaCompletada
        montoDescuento
        cajero { nombre apellido }
        items {
          id_Producto
          cantidad
          precioUnitario
          producto { id codigo nombre }
        }
      }
    }
    tipoCambio {
      id
      precioDolar
      fecha
    }
    todosMovimientos(first: 5000) {
      nodes {
        id
        tipo
        categoria
        tipoPago
        monto
        motivo
        fecha
      }
    }
    creditos(first: 2000) {
      nodes {
        id
        estado
        total
        fechaCreacion
      }
    }
  }
`

export interface DashboardQueryResult {
  productos: { nodes: ProductoAPISimple[] }
  todasOrdenes: { nodes: DashboardOrdenAPI[] }
  tipoCambio: TipoCambioAPI
  todosMovimientos: { nodes: MovimientoCajaAPI[] }
  creditos: { nodes: Array<{ id: number; estado: EstadoCredito; total: number; fechaCreacion: string }> }
}
