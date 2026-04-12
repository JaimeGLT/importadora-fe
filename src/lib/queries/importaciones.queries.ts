export const IMPORTACIONES_LIST_QUERY = `
  query ImportacionesList {
    importaciones {
      id
      numero
      origen
      proveedor
      fecha_creacion
      fecha_estimada_llegada
      estado
      fob_total_usd
      flete_usd
      aduana_bs
      transporte_interno_bs
      tipo_cambio
      creado_en
      actualizado_en
    }
  }
`

export const IMPORTACION_DETALLE_QUERY = `
  query ImportacionDetalle($id: ID!) {
    importacion(id: $id) {
      id
      numero
      items {
        id
        codigo_proveedor
        codigos_adicionales
        nombre
        precio_fob_usd
        cantidad
        costo_unitario_fob_bs
        costo_unitario_adicional_bs
        costo_unitario_total_bs
        precio_venta_sugerido
        precio_venta_final
        producto_id
        es_nuevo
      }
    }
  }
`

export const ORIGENES_LIST_QUERY = `
  query OrigenesList {
    origenes {
      id
      nombre
      tiempo_estimado_dias
    }
  }
`
