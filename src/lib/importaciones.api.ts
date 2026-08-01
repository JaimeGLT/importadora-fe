import { api } from '@/lib/api'

export interface DtoImportacionDetalleActualizar {
  codigo: string
  codigoAux: string
  codigoAux2: string
  nombre: string
  marcaId?: number | null
  descripcion: string
  procedencia?: string | null
  unidad_Medida: string
  ubicacion: string
  cantidad: number
  piezas: number
  stock_Minimo: number
  costo: number
  precio: number
  conversionABs: number
  nota?: string
}

export interface DtoImportacionDetalleRespuesta {
  message: string
  fusionado: boolean
  productoDestinoId?: number | null
  /** Producto que quedó sin stock tras la operación — no fue desactivado, hay que preguntarle al usuario. */
  productoSinStockId?: number | null
  advertencia?: string | null
}

export const editarDetalleImportacion = (
  importacionId: string,
  detalleId: string,
  datos: DtoImportacionDetalleActualizar,
) =>
  api.put<DtoImportacionDetalleRespuesta>(
    `/Importacion/${importacionId}/Detalles/${detalleId}`,
    datos,
  )

export const eliminarDetalleImportacion = (importacionId: string, detalleId: string) =>
  api.delete<DtoImportacionDetalleRespuesta>(
    `/Importacion/${importacionId}/Detalles/${detalleId}`,
  )

export interface DtoImportacionCambiarSucursalRespuesta {
  message: string
  advertencias: string[]
}

export const cambiarSucursalImportacion = (
  importacionId: string,
  sucursalId: number,
  nota?: string,
) =>
  api.put<DtoImportacionCambiarSucursalRespuesta>(
    `/Importacion/${importacionId}/Sucursal`,
    { sucursalId, nota },
  )
