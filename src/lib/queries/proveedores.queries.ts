import type { Proveedor, Importacion, ItemImportacion } from '@/types'

export function backendToProveedor(b: {
  id: number
  nombre: string
  nota: string
  canImportaciones: number
  total: number
  pais: string
  moneda: string
  terminos: string
  nombre_Contacto: string
  email: string
  telefono: string
  tiempoReposicion: number
  sitioWeb: string
  estado: boolean
}): Proveedor {
  return {
    id: String(b.id),
    nombre: b.nombre,
    pais: b.pais,
    moneda: b.moneda as Proveedor['moneda'],
    terminos_pago: b.terminos as Proveedor['terminos_pago'],
    contacto: b.nombre_Contacto,
    email: b.email,
    telefono: b.telefono,
    sitio_web: b.sitioWeb,
    notas: b.nota,
    tiempo_reposicion_dias: b.tiempoReposicion,
    estado: b.estado ? 'activo' : 'inactivo',
    creado_en: '',
    actualizado_en: '',
  }
}

export function backendToImportacionSimple(b: {
  id: number
  codigo: string
  fecha: string
  cantProductos: number
  total: number
  estado: string
  id_Proveedor: number
  f_Internacional: number
  aduana_Arancel: number
  trasporte_Interno: number
  proveedor: { id: number; nombre: string; pais: string }
  detalles: {
    id: number
    codigo: string
    codigoAux: string
    codigoAux2: string
    nombre: string
    descripcion: string
    marca: string
    unidad_Medida: string
    ubicacion: string
    stock_Actual: number
    stock_Minimo: number
    costo: number
    precio: number
    conversionABs: number
    tipo: string
  }[]
}): Importacion {
  const firstDetalle = b.detalles[0]
  return {
    id: String(b.id),
    numero: b.codigo,
    proveedor: b.proveedor.nombre,
    origen: b.proveedor.pais,
    fecha_creacion: b.fecha,
    fecha_estimada_llegada: b.fecha,
    estado: 'en_transito' as Importacion['estado'],
    fob_total_usd: b.total,
    flete_usd: b.f_Internacional,
    aduana_bs: b.aduana_Arancel,
    transporte_interno_bs: b.trasporte_Interno,
    tipo_cambio: firstDetalle?.conversionABs ?? 6.96,
    items: b.detalles.map((d) => ({
      id: String(d.id),
      codigo_proveedor: d.codigo,
      codigos_adicionales: [d.codigoAux, d.codigoAux2].filter(Boolean),
      nombre: d.nombre,
      descripcion: d.descripcion ?? '',
      marca: d.marca ?? '',
      unidad: (d.unidad_Medida as ItemImportacion['unidad']) ?? 'pieza',
      ubicacion: d.ubicacion ?? 'Almacén Central',
      precio_fob_usd: 0,
      cantidad: d.stock_Actual,
      stock_minimo: d.stock_Minimo,
      costo_unitario_fob_bs: d.costo,
      costo_unitario_adicional_bs: 0,
      costo_unitario_total_bs: d.costo,
      precio_venta_sugerido: d.precio,
      precio_venta_final: d.precio,
      producto_id: undefined,
      es_nuevo: d.tipo === 'Nuevo',
      usar_precio_nuevo: true,
    })),
    creado_en: b.fecha,
    actualizado_en: b.fecha,
  }
}

export const PROVEEDORES_LIST_QUERY = `
  query ProveedoresList {
    proveedor {
      nodes {
        id
        nombre
        nota
        canImportaciones
        total
        pais
        moneda
        terminos
        nombre_Contacto
        email
        telefono
        tiempoReposicion
        sitioWeb
        estado
      }
    }
  }
`

export const PROVEEDOR_IMPORTACIONES_QUERY = `
  query ProveedorImportaciones($id: Int!) {
    importacion(where: { id_Proveedor: { eq: $id } }) {
      nodes {
        id
        codigo
        fecha
        cantProductos
        total
        estado
        id_Proveedor
        f_Internacional
        aduana_Arancel
        trasporte_Interno
        proveedor {
          id
          nombre
          pais
        }
        detalles {
          id
          codigo
          codigoAux
          codigoAux2
          nombre
          descripcion
          marca
          unidad_Medida
          ubicacion
          stock_Actual
          stock_Minimo
          costo
          precio
          conversionABs
          tipo
        }
      }
    }
  }
`

export interface DtoProveedor {
  nombre: string
  pais: string
  moneda: string
  terminos: string
  nombre_Contacto: string
  email: string
  telefono: string
  tiempoReposicion: number
  sitioWeb: string
  estado: boolean
  nota: string
}