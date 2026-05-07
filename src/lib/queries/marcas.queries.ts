import type { Marca } from '@/types'

export interface DtoMarca {
  nombre: string
}

export function backendToMarca(b: { id: number; nombre: string; creado_en: string }): Marca {
  return {
    id: String(b.id),
    nombre: b.nombre,
    creado_en: b.creado_en,
  }
}
