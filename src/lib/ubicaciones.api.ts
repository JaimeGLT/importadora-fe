import { api } from '@/lib/api'

const SEP = '||'

export function asignarUbicacionTexto(productoId: number, sucursalId: number, ubicacionTexto: string | null): Promise<void> {
  return api.patch<void>(`/Producto/${productoId}/Sucursal/${sucursalId}/Ubicacion`, { ubicacionTexto })
}

export interface UbicacionPartes {
  estante: string
  fila: string
  columna: string
}

export function parseUbicacionTexto(raw: string | null | undefined): UbicacionPartes {
  if (!raw) return { estante: '', fila: '', columna: '' }
  const partes = raw.split(SEP)
  if (partes.length === 3) return { estante: partes[0] ?? '', fila: partes[1] ?? '', columna: partes[2] ?? '' }
  // Texto legado guardado antes de dividir en 3 campos.
  return { estante: raw, fila: '', columna: '' }
}

export function formatUbicacionTexto({ estante, fila, columna }: UbicacionPartes): string | null {
  const e = estante.trim()
  const f = fila.trim()
  const c = columna.trim()
  if (!e && !f && !c) return null
  return [e, f, c].join(SEP)
}

export function displayUbicacionTexto(raw: string | null | undefined): string {
  const { estante, fila, columna } = parseUbicacionTexto(raw)
  return [
    estante ? `E${estante}` : '',
    fila ? `F${fila}` : '',
    columna ? `C${columna}` : '',
  ].filter(Boolean).join(' ')
}
