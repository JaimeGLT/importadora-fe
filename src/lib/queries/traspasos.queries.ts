export const TRASPASOS_HISTORIAL_QUERY = `
  query TraspasosHistorial($first: Int, $after: String, $where: TraspasoStockFilterInput, $order: [TraspasoStockSortInput!]) {
    traspasosStock(first: $first, after: $after, where: $where, order: $order) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        id_Producto
        piezaKitId
        sucursalOrigenId
        sucursalDestinoId
        cantidad
        cantidadAnteriorOrigen
        cantidadNuevaOrigen
        cantidadAnteriorDestino
        cantidadNuevaDestino
        motivo
        nota
        fecha
        usuarioId
        producto { nombre codigo codigoAux codigoAux2 }
        piezaKit { nombre codigoPieza }
        sucursalOrigen { nombre codigo }
        sucursalDestino { nombre codigo }
        usuario { nombre }
      }
    }
  }
`

export interface TraspasoStockAPI {
  id: number
  id_Producto: number
  piezaKitId?: number | null
  sucursalOrigenId: number
  sucursalDestinoId: number
  cantidad: number
  cantidadAnteriorOrigen: number
  cantidadNuevaOrigen: number
  cantidadAnteriorDestino: number
  cantidadNuevaDestino: number
  motivo: string
  nota?: string | null
  fecha: string
  usuarioId?: string | null
  producto?: { nombre: string; codigo: string; codigoAux?: string; codigoAux2?: string } | null
  piezaKit?: { nombre: string; codigoPieza: string } | null
  sucursalOrigen?: { nombre: string; codigo: string } | null
  sucursalDestino?: { nombre: string; codigo: string } | null
  usuario?: { nombre: string } | null
}

export interface TraspasoStockRow {
  id: number
  productoId: number
  productoNombre: string
  productoCodigos: string[]
  piezaNombre?: string
  piezaCodigo?: string
  sucursalOrigenId: number
  sucursalOrigenNombre: string
  sucursalDestinoId: number
  sucursalDestinoNombre: string
  cantidad: number
  cantidadAnteriorOrigen: number
  cantidadNuevaOrigen: number
  cantidadAnteriorDestino: number
  cantidadNuevaDestino: number
  motivo: string
  nota: string
  fecha: Date
  usuarioNombre: string
}

export function backendToTraspasoRow(t: TraspasoStockAPI): TraspasoStockRow {
  const codigos = [t.producto?.codigo, t.producto?.codigoAux, t.producto?.codigoAux2].filter(Boolean) as string[]
  return {
    id: t.id,
    productoId: t.id_Producto,
    productoNombre: t.producto?.nombre ?? '—',
    productoCodigos: codigos.length > 0 ? codigos : ['—'],
    piezaNombre: t.piezaKit?.nombre,
    piezaCodigo: t.piezaKit?.codigoPieza,
    sucursalOrigenId: t.sucursalOrigenId,
    sucursalOrigenNombre: t.sucursalOrigen?.nombre ?? '—',
    sucursalDestinoId: t.sucursalDestinoId,
    sucursalDestinoNombre: t.sucursalDestino?.nombre ?? '—',
    cantidad: t.cantidad,
    cantidadAnteriorOrigen: t.cantidadAnteriorOrigen,
    cantidadNuevaOrigen: t.cantidadNuevaOrigen,
    cantidadAnteriorDestino: t.cantidadAnteriorDestino,
    cantidadNuevaDestino: t.cantidadNuevaDestino,
    motivo: t.motivo,
    nota: t.nota ?? '',
    fecha: new Date(t.fecha),
    usuarioNombre: t.usuario?.nombre ?? '—',
  }
}
