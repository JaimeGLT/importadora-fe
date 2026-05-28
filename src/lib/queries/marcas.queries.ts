import type { Marca } from '@/types'

export interface DtoMarca {
  nombre: string
}

export const MARCAS_QUERY = `
  query Marcas($where: MarcaFilterInput) {
    marca(order: { nombre: ASC }, where: $where) {
      nodes {
        id
        nombre
        prefijo
      }
    }
  }
`

export function backendToMarca(b: { id: number; nombre: string; prefijo?: string; creado_en?: string }): Marca {
  return {
    id: b.id,
    nombre: b.nombre,
    prefijo: b.prefijo ?? '',
    creado_en: b.creado_en ?? '',
  }
}
