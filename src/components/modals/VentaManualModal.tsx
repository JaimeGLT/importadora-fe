import { useCallback, useEffect, useRef, useState } from 'react'
import { DrawerWrapper } from '@/components/ui/DrawerWrapper'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { gql } from '@/lib/graphql'
import { notify } from '@/lib/notify'
import { listarSucursales } from '@/lib/sucursales.api'
import {
  PRODUCTO_BY_ID_QUERY,
  backendToProducto,
  backendToProductoSimple,
  productoToBackend,
  type ProductoAPI,
  type ProductoAPISimple,
  type KitOps,
} from '@/lib/queries/inventario.queries'
import { AjusteModal } from '@/pages/inventario/AjustesPage'
import { StockSucursalModal } from '@/pages/inventario/StockSucursalModal'
import { ProductoModal, type PriceUpdate } from '@/pages/inventario/ProductoModal'
import { subirLoteDiferido } from '@/lib/storage'
import type { ImageUploaderState } from '@/components/ui/ImageUploader'
import type { Producto, Sucursal } from '@/types'

interface Vendedor {
  id: string
  nombre: string
  apellido: string
}

interface LineaVenta {
  key: string
  producto: Producto
  cargando: boolean
  cantidad: number
  precioUnitario: number
  piezaId: number | null
}

interface VentaManualModalProps {
  vendedor: Vendedor | null
  onClose: () => void
  onSuccess: () => void
}

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const hoyISO = () => new Date().toISOString().slice(0, 10)

export function VentaManualModal({ vendedor, onClose, onSuccess }: VentaManualModalProps) {
  const { isTokenReady } = useAuth()
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [buscando, setBuscando] = useState(false)
  const [lineas, setLineas] = useState<LineaVenta[]>([])
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [guardando, setGuardando] = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalResueltaId, setSucursalResueltaId] = useState<number | null>(null)
  const [traspasoLinea, setTraspasoLinea] = useState<LineaVenta | null>(null)
  const [ajusteLinea, setAjusteLinea] = useState<LineaVenta | null>(null)
  const [nuevoProductoOpen, setNuevoProductoOpen] = useState(false)
  const [creandoProducto, setCreandoProducto] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listarSucursales().then(setSucursales).catch(() => {})
  }, [])

  // Sucursal de la que se descontará stock: la fija del vendedor seleccionado,
  // o casa matriz si no tiene una fija (Admin/SuperAdmin) — mismo criterio que
  // usa el backend al registrar la venta manual.
  useEffect(() => {
    if (!vendedor) { setSucursalResueltaId(null); return }
    let cancelado = false
    api.get<{ id: string; sucursalId?: number | null }[]>('/Usuario')
      .then(usuarios => {
        if (cancelado) return
        const u = usuarios.find(x => x.id === vendedor.id)
        if (u?.sucursalId) { setSucursalResueltaId(u.sucursalId); return }
        listarSucursales().then(sucs => {
          if (cancelado) return
          setSucursalResueltaId(sucs.find(s => s.esCasaMatriz)?.id ?? null)
        })
      })
      .catch(() => setSucursalResueltaId(null))
    return () => { cancelado = true }
  }, [vendedor])

  useEffect(() => {
    if (!vendedor) {
      setQuery('')
      setResultados([])
      setLineas([])
      setNota('')
      setFecha(hoyISO())
    }
  }, [vendedor])

  const sucursalResuelta = sucursales.find(s => s.id === sucursalResueltaId)
  // Si ya cargaron las sucursales activas y el id resuelto no matchea ninguna,
  // la sucursal fija de este vendedor fue desactivada/borrada -- distinto de
  // "genuinamente sin stock", así que se avisa aparte en vez de mostrar "0
  // disponibles" (indistinguible del caso real).
  const sucursalInexistente = sucursales.length > 0 && sucursalResueltaId != null && !sucursalResuelta

  const buscarProductos = useCallback(async (q: string) => {
    if (!q.trim() || !isTokenReady) { setResultados([]); return }
    setBuscando(true)
    try {
      const res = await api.get<ProductoAPISimple[]>(`/Producto/buscar-lista?q=${encodeURIComponent(q)}`)
      setResultados((res ?? []).map(backendToProductoSimple))
    } catch {
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }, [isTokenReady])

  useEffect(() => {
    if (!query.trim()) { setResultados([]); return }
    const q = query.trim()
    const timer = setTimeout(() => buscarProductos(q), 300)
    return () => clearTimeout(timer)
  }, [query, buscarProductos])

  // Por línea, número de secuencia de la última carga disparada — si llega una
  // respuesta que ya no es la más reciente para esa línea (ej. reintento tras
  // traspaso/ajuste antes de que la primera respuesta vuelva), se descarta en
  // vez de pisar datos más nuevos.
  const cargaSeqRef = useRef<Record<string, number>>({})

  const cargarProductoCompleto = useCallback(async (key: string, productoId: string) => {
    const miSeq = (cargaSeqRef.current[key] = (cargaSeqRef.current[key] ?? 0) + 1)
    try {
      const res = await gql<{ productos: { nodes: ProductoAPI[] } }>(PRODUCTO_BY_ID_QUERY, { id: Number(productoId) })
      if (cargaSeqRef.current[key] !== miSeq) return
      const detalle = res.productos.nodes[0]
      if (!detalle) { setLineas(prev => prev.map(l => l.key === key ? { ...l, cargando: false } : l)); return }
      const completo = backendToProducto(detalle)
      setLineas(prev => prev.map(l => l.key === key ? { ...l, producto: completo, cargando: false } : l))
    } catch {
      if (cargaSeqRef.current[key] !== miSeq) return
      setLineas(prev => prev.map(l => l.key === key ? { ...l, cargando: false } : l))
    }
  }, [])

  const agregarLinea = (producto: Producto) => {
    const key = `${producto.id}-${Date.now()}`
    setLineas(prev => [...prev, {
      key,
      producto,
      cargando: true,
      cantidad: 1,
      precioUnitario: producto.precio_venta,
      piezaId: null,
    }])
    setQuery('')
    setResultados([])
    inputRef.current?.focus()
    cargarProductoCompleto(key, producto.id)
  }

  const handleCrearProducto = async (
    data: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>,
    kitOps: KitOps,
    _priceUpdate: PriceUpdate | undefined,
    imageOps: ImageUploaderState,
  ) => {
    setCreandoProducto(true)
    try {
      const createPayload = productoToBackend(data)
      const res = await api.post<{ id: number }>('/Producto', createPayload)
      if (kitOps.mode === 'convertirKit' && kitOps.piezas?.length) {
        await api.put(`/Producto/ConvertirKit/${res.id}`, { piezas: kitOps.piezas })
      }
      if (imageOps.pending.length > 0) {
        const { fallidas } = await subirLoteDiferido(res.id, imageOps.pending.map(p => p.file))
        if (fallidas.length > 0) {
          notify.warning(`Producto creado, pero ${fallidas.length} imagen${fallidas.length === 1 ? '' : 'es'} no se pudo subir`)
        }
      }
      setNuevoProductoOpen(false)
      notify.success('Producto creado', { description: `${data.codigo_universal} agregado a la venta` })
      agregarLinea({
        ...data,
        id: String(res.id),
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      })
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al crear producto')
    } finally {
      setCreandoProducto(false)
    }
  }

  const actualizarLinea = (key: string, cambios: Partial<LineaVenta>) => {
    setLineas(prev => prev.map(l => l.key === key ? { ...l, ...cambios } : l))
  }

  const eliminarLinea = (key: string) => {
    setLineas(prev => prev.filter(l => l.key !== key))
  }

  const disponibleDeLinea = (l: LineaVenta): number | null => {
    if (sucursalResueltaId == null || sucursalInexistente) return null
    if (l.piezaId != null) {
      const pieza = l.producto.piezas_kit?.find(pk => pk.id === l.piezaId)
      const stock = pieza?.stocks?.find(s => s.sucursalId === sucursalResueltaId)
      return stock ? stock.cantidad - stock.reservado : 0
    }
    const stock = l.producto.stocks?.find(s => s.sucursalId === sucursalResueltaId)
    return stock ? stock.cantidad - stock.reservado : 0
  }

  const total = lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0)

  const handleGuardar = async () => {
    if (!vendedor) return
    if (lineas.length === 0) {
      notify.error('Agrega al menos un producto')
      return
    }
    if (sucursalInexistente) {
      notify.error('Sucursal inválida', {
        description: 'La sucursal asignada a este usuario ya no existe. Reasignale una sucursal válida antes de registrar la venta.',
      })
      return
    }
    for (const l of lineas) {
      if (l.cantidad <= 0) {
        notify.error(`Cantidad inválida en ${l.producto.nombre}`)
        return
      }
      const disponible = disponibleDeLinea(l)
      if (disponible != null && disponible < l.cantidad) {
        notify.error('Stock insuficiente', {
          description: `${l.producto.nombre}: pediste ${l.cantidad}, hay ${disponible} disponibles${sucursalResuelta ? ` en ${sucursalResuelta.nombre}` : ''}.`,
        })
        return
      }
    }

    setGuardando(true)
    try {
      const items = lineas.map(l => ({
        id_Producto: Number(l.producto.id),
        id_Pieza: l.piezaId,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
      }))
      await api.post('/OrdenVenta/Manual', {
        id_Vendedor: vendedor.id,
        nota: nota || null,
        fecha,
        items,
      })
      notify.success('Venta manual registrada', {
        description: `${vendedor.nombre} ${vendedor.apellido} · ${fmtBs(total)}`,
      })
      onSuccess()
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al registrar la venta')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <DrawerWrapper
      open={!!vendedor}
      onClose={onClose}
      subtitle="Registrar venta manual"
      title={vendedor ? `${vendedor.nombre} ${vendedor.apellido}` : ''}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={guardando}
            className="h-9 px-4 rounded-lg border border-[#E8E5E2] text-sm font-semibold text-[#4A4744] hover:bg-[#F5F0EB] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || lineas.length === 0}
            className="h-9 px-4 rounded-lg bg-[#780e18] hover:bg-[#5c0b12] text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : `Registrar venta (${fmtBs(total)})`}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#FDF3E7] border border-[#E8D4B8]">
          <i className="ti ti-info-circle text-[#B4881C] text-[14px] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#7A5200]">
            Registra una venta ya realizada a nombre de este usuario, descontando stock real de inmediato. No genera cobro ni movimiento de caja: solo cuenta para su comisión.
            {sucursalResuelta && (
              <> Se descuenta de <strong>{sucursalResuelta.nombre}</strong> (sucursal del vendedor).</>
            )}
          </p>
        </div>

        {sucursalInexistente && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#F5C9C0]/30 border border-[#F5C9C0]">
            <i className="ti ti-alert-triangle text-[#B23A2A] text-[14px] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#8A1E12]">
              La sucursal asignada a este usuario ya no existe (fue desactivada). No se puede calcular ni descontar stock correctamente hasta reasignarle una sucursal válida desde Sistema → Usuarios.
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-[#4A4744]">Buscar producto</label>
            <button
              type="button"
              onClick={() => setNuevoProductoOpen(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#780e18] hover:text-[#5c0b12] transition-colors"
            >
              <i className="ti ti-plus text-[12px]" />
              Registrar producto nuevo
            </button>
          </div>
          <div className="relative">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7571] text-[14px]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Código, nombre o marca..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
            />
          </div>
          {query.trim() && (
            <div className="mt-1.5 rounded-xl border border-[#E8E5E2] bg-white max-h-60 overflow-y-auto divide-y divide-[#F0EFEC]">
              {buscando ? (
                <div className="px-3 py-3 text-xs text-[#7A7571]">Buscando…</div>
              ) : resultados.length === 0 ? (
                <div className="px-3 py-4 flex flex-col items-center gap-1.5 text-center">
                  <p className="text-xs text-[#7A7571]">Sin resultados para "{query.trim()}"</p>
                  <button
                    type="button"
                    onClick={() => setNuevoProductoOpen(true)}
                    className="text-[11px] font-semibold text-[#780e18] hover:text-[#5c0b12] transition-colors"
                  >
                    + Registrar "{query.trim()}" como producto nuevo
                  </button>
                </div>
              ) : (
                resultados.map(p => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => agregarLinea(p)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#FAF5EE] transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#780e18] bg-[#F4ECDB] px-1.5 py-0.5 rounded">{p.codigo_universal}</span>
                        {p.es_kit && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F4ECDB] text-[#780e18] border border-[#D4A333]/30">KIT</span>
                        )}
                      </div>
                      <p className="text-xs text-[#4A4744] truncate">{p.nombre}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#2D2B2A] shrink-0">{fmtBs(p.precio_venta)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#4A4744] mb-1.5">Productos vendidos</label>
          {lineas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D0CBC4] px-4 py-6 text-center text-xs text-[#7A7571]">
              Busca y agrega los productos que se vendieron.
            </div>
          ) : (
            <div className="space-y-2.5">
              {lineas.map(l => {
                const disponible = disponibleDeLinea(l)
                const sinStock = disponible != null && disponible < l.cantidad
                return (
                  <div key={l.key} className="rounded-xl border border-[#E8E5E2] p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-[#780e18] bg-[#F4ECDB] px-1.5 py-0.5 rounded mr-1.5">{l.producto.codigo_universal}</span>
                        <span className="text-xs font-semibold text-[#2D2B2A]">{l.producto.nombre}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title="Traspasar stock entre sucursales"
                          onClick={() => setTraspasoLinea(l)}
                          disabled={l.cargando}
                          className="h-6 w-6 rounded-lg flex items-center justify-center text-[#7A7571] hover:text-[#780e18] hover:bg-[#F4ECDB] transition-colors disabled:opacity-40"
                        >
                          <i className="ti ti-arrows-exchange text-[14px]" />
                        </button>
                        <button
                          type="button"
                          title="Ajustar stock (sumar/restar)"
                          onClick={() => setAjusteLinea(l)}
                          disabled={l.cargando}
                          className="h-6 w-6 rounded-lg flex items-center justify-center text-[#7A7571] hover:text-[#780e18] hover:bg-[#F4ECDB] transition-colors disabled:opacity-40"
                        >
                          <i className="ti ti-adjustments text-[14px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarLinea(l.key)}
                          className="h-6 w-6 rounded-lg flex items-center justify-center text-[#B23A2A] hover:bg-[#F5C9C0]/40 transition-colors"
                        >
                          <i className="ti ti-trash text-[14px]" />
                        </button>
                      </div>
                    </div>

                    {l.producto.es_kit && (
                      <div className="mb-2">
                        <label className="block text-[10px] font-semibold text-[#7A7571] mb-1 uppercase tracking-wide">Vender como</label>
                        {l.cargando ? (
                          <p className="text-[11px] text-[#7A7571]">Cargando piezas del kit…</p>
                        ) : (
                          <select
                            value={l.piezaId ?? ''}
                            onChange={e => actualizarLinea(l.key, { piezaId: e.target.value ? Number(e.target.value) : null })}
                            className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5E2] bg-white text-xs text-[#2D2B2A] focus:outline-none focus:border-[#780e18]"
                          >
                            <option value="">Kit completo</option>
                            {(l.producto.piezas_kit ?? []).map(pz => (
                              <option key={pz.id} value={pz.id}>{pz.codigo_pieza} · {pz.nombre}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#7A7571] mb-1 uppercase tracking-wide">Cantidad</label>
                        <input
                          type="number" min="1" step="1"
                          value={l.cantidad}
                          onChange={e => actualizarLinea(l.key, { cantidad: Math.max(1, Number(e.target.value) || 1) })}
                          className={`w-full h-9 px-2.5 rounded-lg border bg-white text-xs text-[#2D2B2A] focus:outline-none focus:border-[#780e18] ${sinStock ? 'border-[#B23A2A]' : 'border-[#E8E5E2]'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#7A7571] mb-1 uppercase tracking-wide">Precio unitario</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={l.precioUnitario}
                          onChange={e => actualizarLinea(l.key, { precioUnitario: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#E8E5E2] bg-white text-xs text-[#2D2B2A] focus:outline-none focus:border-[#780e18]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className={`text-[11px] font-semibold ${l.cargando ? 'text-[#7A7571]' : sinStock ? 'text-[#B23A2A]' : 'text-[#3F7A52]'}`}>
                        {l.cargando ? 'Cargando stock…' : disponible == null ? '—' : `${disponible} disponibles en ${sucursalResuelta?.nombre ?? 'la sucursal'}`}
                      </p>
                      <p className="text-right text-[11px] font-bold text-[#2D2B2A]">Subtotal: {fmtBs(l.precioUnitario * l.cantidad)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#4A4744] mb-1.5">Fecha de la venta</label>
          <input
            type="date"
            value={fecha}
            max={hoyISO()}
            onChange={e => setFecha(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#4A4744] mb-1.5">Nota (opcional)</label>
          <input
            type="text"
            value={nota}
            onChange={e => setNota(e.target.value)}
            maxLength={200}
            placeholder="Ej. venta del sábado en feria..."
            className="w-full h-10 px-3 rounded-xl border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 transition-all"
          />
        </div>
      </div>

      {traspasoLinea && (
        <StockSucursalModal
          producto={traspasoLinea.producto}
          initialOrigenId={sucursalResueltaId ?? undefined}
          onClose={() => setTraspasoLinea(null)}
          onTraspasoSuccess={() => cargarProductoCompleto(traspasoLinea.key, traspasoLinea.producto.id)}
          onProductoActualizado={p => actualizarLinea(traspasoLinea.key, { producto: p })}
        />
      )}

      {ajusteLinea && (
        <AjusteModal
          producto={ajusteLinea.producto}
          sucursales={sucursales}
          defaultSucursalId={sucursalResueltaId}
          onClose={() => setAjusteLinea(null)}
          onSuccess={() => cargarProductoCompleto(ajusteLinea.key, ajusteLinea.producto.id)}
        />
      )}

      <ProductoModal
        open={nuevoProductoOpen}
        onClose={() => setNuevoProductoOpen(false)}
        onSave={handleCrearProducto}
        producto={null}
        loading={creandoProducto}
      />
    </DrawerWrapper>
  )
}
