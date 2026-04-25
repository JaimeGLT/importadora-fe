export interface DtoProductoImportacion {
  codigo: string
  codigoAux: string
  codigoAux2: string
  nombre: string
  marca: string
  descripcion: string
  unidad_Medida: string
  ubicacion: string
  stock_Actual: number
  stock_Minimo: number
  costo: number
  precio: number
}

export interface DtoImportacion {
  id_Proveedor: number
  fecha: string
  conversionABs: number
  costoTotal: number
  f_Internacional: number
  aduana_Arancel: number
  trasporte_Interno: number
  productos: DtoProductoImportacion[]
}

interface BackendDetalle {
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
}

interface BackendProveedor {
  id: number
  nombre: string
  pais: string
  moneda: string
}

interface BackendImportacion {
  id: number
  id_Proveedor: number
  codigo: string
  fecha: string
  cantProductos: number
  total: number
  estado: string
  proveedor: BackendProveedor
  trasporte_Interno: number
  f_Internacional: number
  aduana_Arancel: number
  detalles: BackendDetalle[]
}

import type { Importacion, EstadoImportacion } from '@/types'

export function backendToImportacion(b: BackendImportacion): Importacion {
  const firstDetalle = b.detalles[0]
  return {
    id: String(b.id),
    numero: b.codigo,
    proveedor: b.proveedor.nombre,
    origen: b.proveedor.pais,
    fecha_creacion: b.fecha,
    fecha_estimada_llegada: b.fecha,
    estado: 'en_transito' as EstadoImportacion,
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
      unidad: (d.unidad_Medida as Importacion['items'][0]['unidad']) ?? 'pieza',
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

export const IMPORTACIONES_QUERY = `
  query Importaciones {
    importacion {
      nodes {
        id
        id_Proveedor
        codigo
        fecha
        cantProductos
        total
        estado
        proveedor {
          id
          nombre
          pais
          moneda
        }
        trasporte_Interno
        f_Internacional
        aduana_Arancel
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