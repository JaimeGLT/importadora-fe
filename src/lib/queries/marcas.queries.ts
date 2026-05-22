import type { Marca } from '@/types'

export interface DtoMarca {
  nombre: string
}

export const MARCAS_QUERY = `
  query Marcas {
    marca(order: { nombre: ASC }) {
      nodes {
        id
        nombre
      }
    }
  }
`

export function backendToMarca(b: { id: number; nombre: string; creado_en?: string }): Marca {
  return {
    id: b.id,
    nombre: b.nombre,
    creado_en: b.creado_en ?? '',
  }
}
