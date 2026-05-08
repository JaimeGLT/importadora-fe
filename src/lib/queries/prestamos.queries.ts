// Backend API shapes

export interface ClienteAPI {
  id: number
  nombre: string
  apellido: string
  telefono: string
}

export interface PrestamoDetalleAPI {
  id: number
  id_Prestamo: number
  id_Producto: number
  codigo: string
  nombre: string
  cantidad: number
  precio: number
  total: number
}

export interface PrestamoAPI {
  id: number
  id_Cliente: number
  fecha: string
  nota: string
  total: number
  estado: 'Activo' | 'Devuelto'
  cliente: ClienteAPI
  detalle: PrestamoDetalleAPI[]
}

// Frontend shapes

export interface PrestamoDet {
  id: number
  id_Prestamo: number
  id_Producto: number
  codigo: string
  nombre: string
  cantidad: number
  precio: number
  total: number
}

export interface PrestamoCliente {
  id: number
  nombre: string
  apellido: string
  telefono: string
}

export interface Prestamo {
  id: number
  id_Cliente: number
  clienteNombreCompleto: string
  fecha: string
  nota: string
  total: number
  estado: 'Activo' | 'Devuelto'
  cliente: PrestamoCliente
  detalle: PrestamoDet[]
}

export interface ClienteFE {
  id: number
  nombre: string
  apellido: string
  telefono: string
  nombreCompleto: string
}

export interface PrestamoCreateData {
  id_Cliente: number
  fecha: string
  nota: string
  detalles: { codigo: string; cantidad: number }[]
}

export const PRESTAMOS_QUERY = `
  query Prestamos($first: Int, $after: String) {
    prestamos(first: $first, after: $after) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        id_Cliente
        fecha
        nota
        total
        estado
        cliente {
          id
          nombre
          apellido
          telefono
        }
        detalle {
          id
          id_Prestamo
          id_Producto
          codigo
          nombre
          cantidad
          precio
          total
        }
      }
    }
  }
`

export const CLIENTES_QUERY = `
  query Clientes {
    clientes {
      totalCount
      nodes {
        id
        nombre
        apellido
        telefono
      }
    }
  }
`

export function backendToPrestamo(api: PrestamoAPI): Prestamo {
  const nombre = api.cliente?.nombre ?? ''
  const apellido = api.cliente?.apellido ?? ''
  return {
    id: api.id,
    id_Cliente: api.id_Cliente,
    clienteNombreCompleto: `${nombre} ${apellido}`.trim() || '—',
    fecha: api.fecha,
    nota: api.nota ?? '',
    total: api.total ?? 0,
    estado: api.estado,
    cliente: {
      id: api.cliente?.id ?? 0,
      nombre,
      apellido,
      telefono: api.cliente?.telefono ?? '',
    },
    detalle: (api.detalle ?? []).map((d) => ({
      id: d.id,
      id_Prestamo: d.id_Prestamo,
      id_Producto: d.id_Producto,
      codigo: d.codigo ?? '',
      nombre: d.nombre ?? '',
      cantidad: d.cantidad ?? 0,
      precio: d.precio ?? 0,
      total: d.total ?? 0,
    })),
  }
}

export function backendToCliente(api: ClienteAPI): ClienteFE {
  return {
    id: api.id,
    nombre: api.nombre ?? '',
    apellido: api.apellido ?? '',
    telefono: api.telefono ?? '',
    nombreCompleto: `${api.nombre ?? ''} ${api.apellido ?? ''}`.trim(),
  }
}
