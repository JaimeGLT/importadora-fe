export const AJUSTES_HISTORIAL_QUERY = `
  query AjustesHistorial($first: Int, $after: String, $where: AjusteStockFilterInput, $order: [AjusteStockSortInput!]) {
    ajustesStock(first: $first, after: $after, where: $where, order: $order) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        cantidadAnterior
        cantidadNueva
        motivo
        nota
        fecha
        producto { nombre codigo }
      }
    }
  }
`

export interface AjusteStockAPI {
  id: number
  cantidadAnterior: number
  cantidadNueva: number
  motivo: string
  nota: string
  fecha: string
  producto?: { nombre: string; codigo: string }
}

export interface AjusteStockRow {
  id: number
  productoNombre: string
  productoCodigo: string
  delta: number
  cantidadAnterior: number
  cantidadNueva: number
  motivo: string
  nota: string
  fecha: Date
}

export function backendToAjusteRow(a: AjusteStockAPI): AjusteStockRow {
  return {
    id: a.id,
    productoNombre: a.producto?.nombre ?? '—',
    productoCodigo: a.producto?.codigo ?? '—',
    delta: a.cantidadNueva - a.cantidadAnterior,
    cantidadAnterior: a.cantidadAnterior,
    cantidadNueva: a.cantidadNueva,
    motivo: a.motivo,
    nota: a.nota ?? '',
    fecha: new Date(a.fecha),
  }
}
