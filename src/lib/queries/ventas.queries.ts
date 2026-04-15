const ITEM_ORDEN_FIELDS = `
  id producto_id producto_codigo producto_nombre producto_ubicacion
  cantidad precio_unitario subtotal estado nota_faltante
`

const ORDEN_FIELDS = `
  id numero cajero_id cajero_nombre total estado
  metodo_pago monto_recibido nota
  creado_en actualizado_en aceptado_en listo_en pagado_en
  items { ${ITEM_ORDEN_FIELDS} }
`

export const VENTAS_ORDENES_QUERY = `
  query VentasOrdenes($estado: String, $cajero_id: String) {
    ordenes(estado: $estado, cajero_id: $cajero_id) {
      items { ${ORDEN_FIELDS} }
      total
    }
  }
`

export const VENTAS_CREAR_ORDEN_MUTATION = `
  mutation VentasCrearOrden($input: CrearOrdenInput!) {
    crearOrden(input: $input) { ${ORDEN_FIELDS} }
  }
`

export const VENTAS_ACTUALIZAR_ORDEN_MUTATION = `
  mutation VentasActualizarOrden($id: ID!, $input: ActualizarOrdenInput!) {
    actualizarOrden(id: $id, input: $input) { ${ORDEN_FIELDS} }
  }
`

const RESERVA_FIELDS = `
  id numero cajero_id cajero_nombre
  cliente_nombre cliente_telefono canal
  total estado expira_en nota
  creado_en actualizado_en
  items { ${ITEM_ORDEN_FIELDS} }
`

export const VENTAS_RESERVAS_QUERY = `
  query VentasReservas($cajero_id: String) {
    reservas(cajero_id: $cajero_id) {
      items { ${RESERVA_FIELDS} }
      total
    }
  }
`

export const VENTAS_CREAR_RESERVA_MUTATION = `
  mutation VentasCrearReserva($input: CrearReservaInput!) {
    crearReserva(input: $input) { ${RESERVA_FIELDS} }
  }
`

export const VENTAS_ACTUALIZAR_RESERVA_MUTATION = `
  mutation VentasActualizarReserva($id: ID!, $input: ActualizarReservaInput!) {
    actualizarReserva(id: $id, input: $input) { ${RESERVA_FIELDS} }
  }
`
