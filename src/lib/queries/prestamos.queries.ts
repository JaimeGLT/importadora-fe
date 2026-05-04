import type { Prestamo, ItemPrestamo } from '@/types'

export interface BackendDetallePrestamo {
  codigo: string
  nombre: string
  cantidad: number
  precio: number
  total: number
  id: number
}

export interface BackendPrestamo {
  id: number
  nombre: string
  fecha: string
  nota: string
  total: number
  estado: 'Activo' | 'Cancelado'
  detalle: BackendDetallePrestamo[]
}

export interface PrestamosResponse {
  prestamos: {
    nodes: BackendPrestamo[]
  }
}

export const PRESTAMOS_QUERY = `
  query PrestamosList {
    prestamos {
      nodes {
        id
        nombre
        fecha
        nota
        total
        estado
        detalle {
          total
          id_Prestamo
          codigo
          nombre
          cantidad
          precio
          id
        }
      }
    }
  }
`

export function backendToPrestamo(p: BackendPrestamo): Prestamo {
  return {
    id: String(p.id),
    prestado_a: p.nombre,
    fecha: p.fecha,
    notas: p.nota,
    estado: p.estado === 'Activo' ? 'activo' : p.estado === 'Cancelado' ? 'cancelado' : 'devuelto',
    items: p.detalle.map((d): ItemPrestamo => ({
      producto_id: '',
      producto_nombre: d.nombre,
      producto_codigo: d.codigo,
      cantidad: d.cantidad,
      precio_unitario: d.precio,
      precio_total: d.total,
    })),
    creado_en: p.fecha,
  }
}
