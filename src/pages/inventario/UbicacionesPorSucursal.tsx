import { useEffect, useMemo, useState } from 'react'
import { WarmInput } from '@/components/ui'
import { listarSucursales } from '@/lib/sucursales.api'
import { asignarUbicacionTexto, parseUbicacionTexto, formatUbicacionTexto, type UbicacionPartes } from '@/lib/ubicaciones.api'
import { notify } from '@/lib/notify'
import type { ProductoStockSucursal, Sucursal } from '@/types'

interface UbicacionesPorSucursalProps {
  productoId: string
  stocks: ProductoStockSucursal[]
}

export function UbicacionesPorSucursal({ productoId, stocks }: UbicacionesPorSucursalProps) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [valores, setValores] = useState<Record<number, UbicacionPartes>>({})

  const sucursalesActivas = useMemo(
    () => sucursales.filter((s) => s.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [sucursales],
  )

  useEffect(() => {
    listarSucursales()
      .then((lista) => {
        setSucursales(lista)
        setValores(Object.fromEntries(
          lista.filter((s) => s.activo).map((s) => [
            s.id,
            parseUbicacionTexto(stocks.find((st) => st.sucursalId === s.id)?.ubicacionNombre),
          ]),
        ))
      })
      .catch(() => notify.error('No se pudieron cargar las sucursales.'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function actualizarCampo(sucursalId: number, campo: keyof UbicacionPartes, valor: string) {
    setValores((prev) => ({ ...prev, [sucursalId]: { ...prev[sucursalId], [campo]: valor } }))
  }

  async function handleGuardar(sucursalId: number) {
    const partes = valores[sucursalId] ?? { estante: '', fila: '', columna: '' }
    try {
      await asignarUbicacionTexto(Number(productoId), sucursalId, formatUbicacionTexto(partes))
      notify.success('Ubicación actualizada.')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al guardar la ubicación.')
    }
  }

  if (loading) {
    return <p className="text-xs text-[#7A7571] italic">Cargando sucursales…</p>
  }

  if (sucursalesActivas.length === 0) {
    return <p className="text-xs text-[#7A7571] italic">Sin sucursales activas.</p>
  }

  return (
    <div className="space-y-4">
      {sucursalesActivas.map((s) => {
        const partes = valores[s.id] ?? { estante: '', fila: '', columna: '' }
        return (
          <div key={s.id}>
            <label className="text-[10.5px] uppercase tracking-[0.1em] font-bold text-[#7A7571] leading-none block mb-1.5">
              {s.nombre}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <WarmInput
                label="Estante"
                value={partes.estante}
                onChange={(e) => actualizarCampo(s.id, 'estante', e.target.value)}
                onBlur={() => void handleGuardar(s.id)}
              />
              <WarmInput
                label="Fila"
                value={partes.fila}
                onChange={(e) => actualizarCampo(s.id, 'fila', e.target.value)}
                onBlur={() => void handleGuardar(s.id)}
              />
              <WarmInput
                label="Columna"
                value={partes.columna}
                onChange={(e) => actualizarCampo(s.id, 'columna', e.target.value)}
                onBlur={() => void handleGuardar(s.id)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
