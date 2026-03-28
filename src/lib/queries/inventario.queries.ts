const PRODUCTO_FIELDS = `
  id codigo_universal codigos_alternativos nombre descripcion
  categoria marca vehiculo unidad
  stock stock_minimo precio_costo precio_venta
  historial_precios { fecha precio_costo precio_venta tipo_cambio nota }
  ubicacion estado proveedor_id creado_en actualizado_en
`

export const INVENTARIO_PRODUCTOS_QUERY = `
  query InventarioProductos($page: Int, $pageSize: Int, $search: String, $categoria: String, $estado: String) {
    productos(page: $page, pageSize: $pageSize, search: $search, categoria: $categoria, estado: $estado) {
      items { ${PRODUCTO_FIELDS} }
      total page pageSize
    }
  }
`

export const INVENTARIO_PRODUCTO_QUERY = `
  query InventarioProducto($id: ID!) {
    producto(id: $id) { ${PRODUCTO_FIELDS} }
  }
`

export const INVENTARIO_CREAR_PRODUCTO_MUTATION = `
  mutation InventarioCrearProducto($input: CrearProductoInput!) {
    crearProducto(input: $input) { ${PRODUCTO_FIELDS} }
  }
`

export const INVENTARIO_ACTUALIZAR_PRODUCTO_MUTATION = `
  mutation InventarioActualizarProducto($id: ID!, $input: ActualizarProductoInput!) {
    actualizarProducto(id: $id, input: $input) { ${PRODUCTO_FIELDS} }
  }
`

export const INVENTARIO_ELIMINAR_PRODUCTO_MUTATION = `
  mutation InventarioEliminarProducto($id: ID!) {
    eliminarProducto(id: $id) { id }
  }
`

export const INVENTARIO_PROVEEDORES_QUERY = `
  query InventarioProveedores {
    proveedores {
      id nombre pais contacto email tiempo_reposicion_dias
    }
  }
`
