import type { Producto } from '@/types'

export const PRODUCTOS_QUERY = `
  query Productos($first: Int!, $after: String) {
    productos(first: $first, after: $after) {
      totalCount
      nodes {
        id
        unidad_Medida
        ubicacion
        stock_Actual
        stock_Minimo
        piezas
        costo
        codigo
        nombre
        precio
        codigoAux
        codigoAux2
        marca
        descripcion
        conversionABs
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export const PRODUCTOS_LIST_QUERY = `
  query ProductosList {
    productos {
      totalCount
      nodes {
        id
        unidad_Medida
        ubicacion
        stock_Actual
        stock_Minimo
        piezas
        costo
        codigo
        nombre
        precio
        codigoAux
        codigoAux2
        marca
        descripcion
        historialPrecios {
          id
          id_producto
          fecha
          costo
          precio
          conversionABs
          nota
        }
      }
    }
  }
`

export const PRODUCTO_BY_ID_QUERY = `
  query ProductoById($id: Int!) {
    productos(where: { id: { eq: $id } }) {
      nodes {
        id
        unidad_Medida
        ubicacion
        stock_Actual
        stock_Minimo
        piezas
        costo
        conversionABs
        codigo
        nombre
        precio
        historialPrecios {
          id
          id_producto
          fecha
          costo
          precio
          conversionABs
          nota
        }
        codigoAux
        codigoAux2
        marca
        descripcion
      }
    }
  }
`

interface ProductoAPISimple {
  id: string | number
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
  piezas: number
  costo: number
  precio: number
  conversionABs: number
  historialPrecios: {
    id: number
    id_producto: number
    fecha: string
    costo: number
    precio: number
    conversionABs: number
    nota: string | null
  }[]
}

export interface ProductoAPI extends ProductoAPISimple {
  conversionABs: number
  historialPrecios: HistorialPrecioAPI[]
}

interface HistorialPrecioAPI {
  id: number
  id_producto: number
  fecha: string
  costo: number
  precio: number
  conversionABs: number
  nota: string | null
}

export interface ProductoAPIInput {
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
  piezas: number
  costo: number
  precio: number
  conversionABs: number
}

export function backendToProductoSimple(p: ProductoAPISimple): Producto {
  return {
    id: String(p.id),
    codigo_universal: p.codigo ?? '',
    codigos_alternativos: [p.codigoAux ?? '', p.codigoAux2 ?? ''],
    nombre: p.nombre ?? '',
    descripcion: p.descripcion ?? '',
    categoria: 'Otro',
    marca: p.marca ?? '',
    vehiculo: '',
    unidad: (p.unidad_Medida?.toLowerCase() as Producto['unidad']) ?? 'pieza',
    stock: p.stock_Actual ?? 0,
    stock_minimo: p.stock_Minimo ?? 0,
    piezas: p.piezas ?? 1,
    precio_costo: p.costo ?? 0,
    precio_venta: p.precio ?? 0,
    conversionABs: p.conversionABs ?? 6.96,
    historial_precios: (p.historialPrecios ?? []).map((h) => ({
      fecha: h.fecha,
      precio_costo: h.costo,
      precio_venta: h.precio,
      tipo_cambio: h.conversionABs,
      nota: h.nota ?? undefined,
    })),
    ubicacion: p.ubicacion ?? 'Almacén Central',
    estado: 'activo',
    proveedor_id: '',
    creado_en: '',
    actualizado_en: '',
  }
}

export function backendToProducto(p: ProductoAPI): Producto {
  return {
    id: String(p.id),
    codigo_universal: p.codigo ?? '',
    codigos_alternativos: [p.codigoAux ?? '', p.codigoAux2 ?? ''],
    nombre: p.nombre ?? '',
    descripcion: p.descripcion ?? '',
    categoria: 'Otro',
    marca: p.marca ?? '',
    vehiculo: '',
    unidad: (p.unidad_Medida?.toLowerCase() as Producto['unidad']) ?? 'pieza',
    stock: p.stock_Actual ?? 0,
    stock_minimo: p.stock_Minimo ?? 0,
    piezas: p.piezas ?? 1,
    precio_costo: p.costo ?? 0,
    precio_venta: p.precio ?? 0,
    conversionABs: p.conversionABs ?? 6.96,
    historial_precios: (p.historialPrecios ?? []).map((h) => ({
      fecha: h.fecha,
      precio_costo: h.costo,
      precio_venta: h.precio,
      tipo_cambio: h.conversionABs,
      nota: h.nota ?? undefined,
    })),
    ubicacion: p.ubicacion ?? 'Almacén Central',
    estado: 'activo',
    proveedor_id: '',
    creado_en: '',
    actualizado_en: '',
  }
}

function dec(n: number): number {
  return parseFloat(n.toFixed(2))
}

export function productoToBackend(
  p: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>,
): ProductoAPIInput {
  const costo = dec(p.precio_costo > 0 ? p.precio_costo : 0.01)
  const precio = dec(p.precio_venta > 0 ? p.precio_venta : costo)
  return {
    codigo: p.codigo_universal,
    codigoAux: p.codigos_alternativos[0] ?? '',
    codigoAux2: p.codigos_alternativos[1] ?? '',
    nombre: p.nombre,
    marca: p.marca,
    descripcion: p.descripcion,
    unidad_Medida: p.unidad,
    ubicacion: p.ubicacion,
    stock_Actual: p.stock,
    stock_Minimo: p.stock_minimo,
    piezas: p.piezas ?? 1,
    costo,
    precio,
    conversionABs: dec(p.conversionABs ?? 6.96),
  }
}

export interface ProductoAPIUpdate {
  codigo: string
  nombre: string
  piezas: number
  stock_Actual: number
  stock_Minimo: number
  codigoAux?: string
  codigoAux2?: string
  descripcion?: string
  marca?: string
  ubicacion?: string
  unidad_Medida?: string
}

export function productoToBackendUpdate(
  p: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>,
): ProductoAPIUpdate {
  return {
    codigo: p.codigo_universal,
    nombre: p.nombre,
    piezas: p.piezas ?? 1,
    stock_Actual: p.stock,
    stock_Minimo: p.stock_minimo,
    codigoAux: p.codigos_alternativos[0] ?? '',
    codigoAux2: p.codigos_alternativos[1] ?? '',
    descripcion: p.descripcion,
    marca: p.marca,
    ubicacion: p.ubicacion,
    unidad_Medida: p.unidad,
  }
}

export type ProductoAPIBulkInput = Omit<ProductoAPIInput, 'conversionABs' | 'stock_Actual'> & { cantidad: number; conversionABs: number }

export function productoToBackendBulk(
  p: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>,
): ProductoAPIBulkInput {
  const costo = dec(p.precio_costo > 0 ? p.precio_costo : 0.01)
  const precio = dec(p.precio_venta > 0 ? p.precio_venta : costo)
  return {
    codigo: p.codigo_universal,
    codigoAux: p.codigos_alternativos[0] ?? '',
    codigoAux2: p.codigos_alternativos[1] ?? '',
    nombre: p.nombre,
    marca: p.marca,
    descripcion: p.descripcion,
    unidad_Medida: p.unidad,
    ubicacion: p.ubicacion,
    cantidad: p.stock,
    stock_Minimo: p.stock_minimo,
    piezas: p.piezas ?? 1,
    costo,
    precio,
    conversionABs: dec(p.conversionABs ?? 6.96),
  }
}