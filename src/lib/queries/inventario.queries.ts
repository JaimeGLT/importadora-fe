import type { Producto } from '@/types'

export const INVENTARIO_PRODUCTOS_QUERY = `
  query InventarioProductos($first: Int!, $after: String) {
    productos(first: $first, after: $after) {
      totalCount
      nodes {
        id
        codigo
        codigoAux
        codigoAux2
        nombre
        marca
        descripcion
        unidad_Medida
        ubicacion
        stock_Actual
        stock_Minimo
        costo
        precio
        conversionABs
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export interface ProductoAPI {
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
  costo: number
  precio: number
  conversionABs: number
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
  costo: number
  precio: number
  conversionABs: number
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
    unidad: 'pieza',
    stock: p.stock_Actual ?? 0,
    stock_minimo: p.stock_Minimo ?? 0,
    precio_costo: p.costo ?? 0,
    precio_venta: p.precio ?? 0,
    conversionABs: p.conversionABs ?? 1,
    historial_precios: [],
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
    costo,
    precio,
    conversionABs: dec(p.conversionABs ?? 1),
  }
}

export type ProductoAPIBulkInput = Omit<ProductoAPIInput, 'conversionABs'>

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
    stock_Actual: p.stock,
    stock_Minimo: p.stock_minimo,
    costo,
    precio,
  }
}
