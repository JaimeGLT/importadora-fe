export const PROVEEDORES_LIST_QUERY = `
  query ProveedoresList {
    proveedores {
      id
      nombre
      pais
      moneda
      terminos_pago
      contacto
      email
      telefono
      sitio_web
      notas
      tiempo_reposicion_dias
      estado
      creado_en
      actualizado_en
    }
  }
`

export const PROVEEDOR_DETALLE_QUERY = `
  query ProveedorDetalle($id: ID!) {
    proveedor(id: $id) {
      id
      nombre
      productos {
        id
        codigo_oem
        codigo_aftermarket
        nombre
        descripcion
        precio_usd
        minimo_pedido
        producto_id
        activo
      }
      evaluaciones {
        id
        importacion_id
        importacion_numero
        fecha
        calidad
        precio
        entrega
        comunicacion
        notas
      }
    }
  }
`

export const PROVEEDOR_CREATE_MUTATION = `
  mutation ProveedorCreate($input: ProveedorInput!) {
    crearProveedor(input: $input) {
      id
    }
  }
`

export const PROVEEDOR_UPDATE_MUTATION = `
  mutation ProveedorUpdate($id: ID!, $input: ProveedorInput!) {
    actualizarProveedor(id: $id, input: $input) {
      id
    }
  }
`

export const PRODUCTO_PROVEEDOR_CREATE_MUTATION = `
  mutation ProductoProveedorCreate($input: ProductoProveedorInput!) {
    crearProductoProveedor(input: $input) {
      id
    }
  }
`

export const EVALUACION_PROVEEDOR_CREATE_MUTATION = `
  mutation EvaluacionProveedorCreate($input: EvaluacionProveedorInput!) {
    crearEvaluacion(input: $input) {
      id
    }
  }
`
