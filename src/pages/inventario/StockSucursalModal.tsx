import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { WarmInput } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { listarSucursales, ejecutarTraspaso, ejecutarTraspasoPieza } from '@/lib/sucursales.api'
import { notify } from '@/lib/notify'
import { gql } from '@/lib/graphql'
import { PRODUCTO_BY_ID_QUERY, backendToProducto, type ProductoAPI } from '@/lib/queries/inventario.queries'
import type { Producto, Sucursal } from '@/types'

interface StockSucursalModalProps {
  producto: Producto
  initialOrigenId?: number
  onClose: () => void
  onTraspasoSuccess: (productoId: string, sucursalOrigenId: number, sucursalDestinoId: number, cantidad: number) => void
  /** Se llama tras un traspaso de pieza: el stock del kit por sucursal (derivado de las piezas) cambió y no se puede calcular con un delta simple, así que se manda el producto recargado completo. */
  onProductoActualizado?: (producto: Producto) => void
}

const MOTIVO_TRASPASO_RAPIDO = 'Traspaso rápido'

const selectClass = 'w-full h-11 px-3 rounded-xl border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#D4A333] focus:ring-2 focus:ring-[#D4A333]/20 transition-all disabled:opacity-55 disabled:cursor-not-allowed disabled:bg-[#F0EFEC]'
const labelClass = 'text-[10.5px] uppercase tracking-[0.1em] font-bold text-[#7A7571] leading-none block mb-1.5'

export function StockSucursalModal({ producto, initialOrigenId, onClose, onTraspasoSuccess, onProductoActualizado }: StockSucursalModalProps) {
  const { user } = useAuth()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalDestinoId, setSucursalDestinoId] = useState('')
  const [sucursalOrigenId, setSucursalOrigenId] = useState(
    initialOrigenId != null ? String(initialOrigenId) : (user?.sucursalId ? String(user.sucursalId) : ''),
  )
  const [cantidad, setCantidad] = useState('')
  const [loading, setLoading] = useState(false)

  const [tab, setTab] = useState<'kit' | 'piezas'>('kit')
  const [piezas, setPiezas] = useState<Producto['piezas_kit']>(undefined)
  const [loadingPiezas, setLoadingPiezas] = useState(false)
  const [piezaId, setPiezaId] = useState('')

  useEffect(() => {
    listarSucursales().then(setSucursales).catch(() => notify.error('No se pudieron cargar las sucursales.'))
  }, [])

  function cargarPiezas() {
    setLoadingPiezas(true)
    gql<{ productos: { nodes: ProductoAPI[] } }>(PRODUCTO_BY_ID_QUERY, { id: Number(producto.id) })
      .then((data) => {
        const raw = data.productos?.nodes?.[0]
        if (!raw) { setPiezas([]); return }
        const productoActualizado = backendToProducto(raw)
        setPiezas(productoActualizado.piezas_kit)
        setPiezaId((prev) => prev || (productoActualizado.piezas_kit?.[0] ? String(productoActualizado.piezas_kit[0].id) : ''))
        onProductoActualizado?.(productoActualizado)
      })
      .catch(() => notify.error('No se pudieron cargar las piezas del kit.'))
      .finally(() => setLoadingPiezas(false))
  }

  useEffect(() => {
    if (producto.es_kit && piezas === undefined && !loadingPiezas) cargarPiezas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto.es_kit, producto.id])

  const piezaActual = useMemo(
    () => piezas?.find((p) => String(p.id) === piezaId),
    [piezas, piezaId],
  )

  const sucursalesActivas = useMemo(
    () => sucursales.filter((s) => s.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [sucursales],
  )

  const stocksFuente = tab === 'piezas' ? piezaActual?.stocks : producto.stocks

  const desglose = useMemo(
    () => sucursalesActivas.map((s) => {
      const stock = stocksFuente?.find((ps) => ps.sucursalId === s.id)
      const cantidad = stock?.cantidad ?? 0
      const reservado = stock?.reservado ?? 0
      return { sucursal: s, cantidad, reservado, disponible: cantidad - reservado }
    }),
    [sucursalesActivas, stocksFuente],
  )

  const stockOrigen = desglose.find((d) => String(d.sucursal.id) === sucursalOrigenId)
  const disponibleOrigen = stockOrigen?.disponible ?? 0

  const sucursalesDestino = useMemo(
    () => sucursalesActivas.filter((s) => String(s.id) !== sucursalOrigenId),
    [sucursalesActivas, sucursalOrigenId],
  )

  const cantPreview = Number(cantidad)
  const cantPreviewValida = !!cantidad && !isNaN(cantPreview) && cantPreview > 0

  async function handleTraspaso() {
    const cant = Number(cantidad)
    if (tab === 'piezas' && !piezaId) return notify.error('Selecciona la pieza a traspasar.')
    if (!sucursalOrigenId) return notify.error('Selecciona la sucursal origen.')
    if (!sucursalDestinoId) return notify.error('Selecciona la sucursal destino.')
    if (!cant || cant <= 0) return notify.error('Cantidad inválida.')
    if (cant > disponibleOrigen) return notify.error(`Solo hay ${disponibleOrigen} disponibles en esa sucursal.`)

    setLoading(true)
    try {
      if (tab === 'piezas') {
        await ejecutarTraspasoPieza(Number(piezaId), {
          sucursalOrigenId: Number(sucursalOrigenId),
          sucursalDestinoId: Number(sucursalDestinoId),
          cantidad: cant,
          motivo: MOTIVO_TRASPASO_RAPIDO,
        })
        notify.success('Traspaso de pieza ejecutado.')
        setCantidad('')
        cargarPiezas()
      } else {
        await ejecutarTraspaso(Number(producto.id), {
          sucursalOrigenId: Number(sucursalOrigenId),
          sucursalDestinoId: Number(sucursalDestinoId),
          cantidad: cant,
          motivo: MOTIVO_TRASPASO_RAPIDO,
        })
        notify.success('Traspaso ejecutado.')
        onTraspasoSuccess(producto.id, Number(sucursalOrigenId), Number(sucursalDestinoId), cant)
        setCantidad('')
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al ejecutar el traspaso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(45,43,42,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden border border-[#E8E5E2] flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        <div className="h-[3px] bg-gradient-to-r from-[#780e18] to-[#D4A333] shrink-0" />

        <div className="px-6 pt-5 pb-4 border-b border-[#E8E5E2] shrink-0">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white bg-gradient-to-br from-[#780e18] to-[#B4881C]">
              <i className="ti ti-arrows-exchange text-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono font-bold text-[#2D2B2A] truncate tracking-[0.05em]">{producto.codigo_universal}</p>
              <p className="text-[11px] text-[#7A7571] truncate mt-0.5">{producto.nombre}</p>
            </div>
            <button onClick={onClose} className="text-[#7A7571] hover:text-[#2D2B2A] transition-colors p-1 rounded-lg hover:bg-[#F0EFEC]">
              <i className="ti ti-x text-[18px]" />
            </button>
          </div>

          {producto.es_kit && (
            <div className="flex gap-1 mt-4 p-1 bg-[#F5F0EB] rounded-xl border border-[#E8E5E2]">
              <button
                type="button"
                onClick={() => setTab('kit')}
                className={clsx('flex-1 h-8 rounded-lg text-[12px] font-semibold transition-all',
                  tab === 'kit' ? 'bg-white text-[#2D2B2A] shadow-sm border border-[#E8E5E2]' : 'text-[#7A7571] hover:text-[#2D2B2A]')}
              >
                Kit completo
              </button>
              <button
                type="button"
                onClick={() => setTab('piezas')}
                className={clsx('flex-1 h-8 rounded-lg text-[12px] font-semibold transition-all',
                  tab === 'piezas' ? 'bg-white text-[#2D2B2A] shadow-sm border border-[#E8E5E2]' : 'text-[#7A7571] hover:text-[#2D2B2A]')}
              >
                Por pieza
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {tab === 'piezas' && loadingPiezas ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-7 w-7 rounded-full border-2 border-[#E8E5E2] border-t-[#780e18] animate-spin" />
            </div>
          ) : tab === 'piezas' && (!piezas || piezas.length === 0) ? (
            <p className="text-sm text-[#7A7571] text-center py-8 font-semibold">Este kit no tiene piezas configuradas.</p>
          ) : (
            <>
              {tab === 'piezas' && (
                <div>
                  <label className={labelClass}>Pieza</label>
                  <select
                    value={piezaId}
                    onChange={(e) => setPiezaId(e.target.value)}
                    className={selectClass}
                  >
                    {piezas!.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <h3 className="text-[11px] uppercase tracking-wider font-bold text-[#7A7571] mb-2">Stock por sucursal</h3>
                <div className="rounded-xl border border-[#E8E5E2] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F5F0EB] text-[#7A7571] text-[10.5px] uppercase tracking-[0.12em]">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-semibold">Sucursal</th>
                        <th className="text-right px-3 py-2.5 font-semibold">Cantidad</th>
                        <th className="text-right px-3 py-2.5 font-semibold">Reservado</th>
                        <th className="text-right px-3 py-2.5 font-semibold">Disponible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desglose.length === 0 && (
                        <tr><td colSpan={4} className="px-3 py-3 text-center text-[#A09A95] italic">Sin sucursales activas.</td></tr>
                      )}
                      {desglose.map((d) => {
                        const esOrigen = String(d.sucursal.id) === sucursalOrigenId
                        const esDestino = String(d.sucursal.id) === sucursalDestinoId
                        return (
                          <tr
                            key={d.sucursal.id}
                            className={clsx(
                              'border-t border-[#E8E5E2] transition-colors',
                              esOrigen && 'bg-[#F5C9C0]/30',
                              esDestino && 'bg-[#B8DCCA]/30',
                            )}
                          >
                            <td className="px-3 py-2 text-[#2D2B2A]">
                              <div className="flex items-center gap-1.5">
                                <span>{d.sucursal.nombre}</span>
                                {esOrigen && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[#8A1E12] bg-[#F5C9C0] px-1.5 py-0.5 rounded-full shrink-0">
                                    <i className="ti ti-arrow-up-right text-[10px]" /> Origen
                                  </span>
                                )}
                                {esDestino && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[#1E5C38] bg-[#B8DCCA] px-1.5 py-0.5 rounded-full shrink-0">
                                    <i className="ti ti-arrow-down-left text-[10px]" /> Destino
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{d.cantidad}</td>
                            <td className="px-3 py-2 text-right font-mono text-[#7A7571]">{d.reservado}</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold">
                              {d.disponible}
                              {cantPreviewValida && esOrigen && (
                                <span className="ml-1.5 text-[11px] font-semibold text-[#B23A2A]">
                                  → {d.disponible - cantPreview}
                                </span>
                              )}
                              {cantPreviewValida && esDestino && (
                                <span className="ml-1.5 text-[11px] font-semibold text-[#1E5C38]">
                                  → {d.cantidad + cantPreview}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] uppercase tracking-wider font-bold text-[#7A7571] mb-2">Traspaso rápido</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Sucursal origen</label>
                    <select
                      value={sucursalOrigenId}
                      onChange={(e) => setSucursalOrigenId(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Selecciona...</option>
                      {sucursalesActivas.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Sucursal destino</label>
                    <select
                      value={sucursalDestinoId}
                      onChange={(e) => setSucursalDestinoId(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Selecciona...</option>
                      {sucursalesDestino.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <WarmInput
                    label="Cantidad"
                    type="number"
                    min={1}
                    max={disponibleOrigen || undefined}
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    hint={sucursalOrigenId ? `Disponible: ${disponibleOrigen}` : undefined}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E8E5E2] flex justify-end gap-2.5 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-[#E8E5E2] text-sm font-semibold text-[#4A4744] hover:bg-[#F0EFEC] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          {(tab === 'kit' || (piezas && piezas.length > 0)) && (
            <button
              type="button"
              onClick={handleTraspaso}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
            >
              {loading && <i className="ti ti-loader-2 animate-spin text-[14px]" />}
              Ejecutar traspaso
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
