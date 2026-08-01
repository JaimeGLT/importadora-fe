import { api } from '@/lib/api'
import type { Sucursal, TraspasoStock } from '@/types'

export function listarSucursales(): Promise<Sucursal[]> {
  return api.get<Sucursal[]>('/Sucursal')
}

export interface DtoTraspasoStock {
  sucursalOrigenId?: number
  sucursalDestinoId: number
  cantidad: number
  motivo: string
  nota?: string
}

export interface TraspasoResultado {
  message: string
  sucursalOrigenId: number
  sucursalDestinoId: number
  cantidad: number
  cantidadNuevaOrigen: number
  cantidadNuevaDestino: number
}

export function ejecutarTraspaso(productoId: number, datos: DtoTraspasoStock): Promise<TraspasoResultado> {
  return api.post<TraspasoResultado>(`/Traspaso/${productoId}`, datos)
}

export function ejecutarTraspasoPieza(piezaKitId: number, datos: DtoTraspasoStock): Promise<TraspasoResultado> {
  return api.post<TraspasoResultado>(`/Traspaso/Pieza/${piezaKitId}`, datos)
}

export type { TraspasoStock }
