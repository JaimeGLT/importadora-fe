import type { OrdenVenta } from '@/types'

// placeholder — replace with real GraphQL when backend is ready

export const VENTAS_ORDENES_QUERY = `
  query VentasOrdenes($estado: String, $fecha: String) {
    ordenes(estado: $estado, fecha: $fecha) {
      id
      numero
      cajeroId
      cajeroNombre
      almaceneroId
      almaceneroNombre
      items {
        id
        productoId
        productoCodigo
        productoNombre
        productoUbicacion
        cantidadPedida
        cantidadRecogida
        precioUnitario
        subtotal
        estado
        nota
      }
      total
      estado
      metodoPago
      montoRecibido
      nota
      creadoEn
      actualizadoEn
      aceptadoEn
      listoEn
      pagadoEn
    }
  }
`

export const VENTAS_CREAR_ORDEN_MUTATION = `
  mutation VentasCrearOrden($input: CrearOrdenInput!) {
    crearOrden(input: $input) {
      id
      numero
    }
  }
`

export const VENTAS_ACTUALIZAR_ORDEN_MUTATION = `
  mutation VentasActualizarOrden($id: ID!, $input: ActualizarOrdenInput!) {
    actualizarOrden(id: $id, input: $input) {
      id
      estado
      actualizadoEn
    }
  }
`

// Local mock loader — remove when backend is ready
export async function loadOrdenesLocales(): Promise<OrdenVenta[]> {
  const { MOCK_ORDENES } = await import('@/mock/ventas')
  return MOCK_ORDENES
}
