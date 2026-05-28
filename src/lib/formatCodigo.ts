import type { Marca } from '@/types'

export function fmtCodigo(
  codigo: string,
  marcaId: number | null | undefined,
  marcas: Marca[],
): string {
  if (!marcaId) return codigo
  const marca = marcas.find(m => m.id === marcaId)
  return marca?.prefijo ? `${marca.prefijo}-${codigo}` : codigo
}
