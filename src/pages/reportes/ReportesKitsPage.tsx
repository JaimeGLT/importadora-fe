import { useState, useMemo } from 'react'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Button, Input } from '@/components/ui'
import { useVentasStore } from '@/stores/ventasStore'
import { useInventarioStore } from '@/stores/inventarioStore'
import { clsx } from 'clsx'

type Tab = 'producto' | 'vendedor' | 'fecha'

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function ReportesKitsPage() {
  const [tab, setTab] = useState<Tab>('producto')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const ordenes = useVentasStore(s => s.ordenes)
  const productos = useInventarioStore(s => s.productos)

  const kitItems = useMemo(() => {
    return ordenes
      .filter(o => o.estado === 'pagado')
      .flatMap(o =>
        o.items
          .filter(i => i.diferencia_kit !== undefined || i.kit_id)
          .map(i => ({
            ...i,
            orden: o,
            kit_id: i.kit_id,
            diferencia_kit: i.diferencia_kit ?? 0,
          }))
      )
  }, [ordenes])

  const filteredKitItems = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return kitItems
    return kitItems.filter(i => {
      const fecha = new Date(i.orden.creado_en)
      if (fechaDesde && fecha < new Date(fechaDesde)) return false
      if (fechaHasta && fecha > new Date(fechaHasta + 'T23:59:59')) return false
      return true
    })
  }, [kitItems, fechaDesde, fechaHasta])

  const porProducto = useMemo(() => {
    const map = new Map<string, { kit_nombre: string; pieza_nombre: string; pieza_codigo: string; cantidad: number; precio: number; diferencia: number }>()
    filteredKitItems.forEach(i => {
      const kit = productos.find(p => p.id === i.kit_id)
      const key = i.producto_id
      const existing = map.get(key) ?? {
        kit_nombre: kit?.nombre ?? '—',
        pieza_nombre: i.producto_nombre,
        pieza_codigo: i.producto_codigo,
        cantidad: 0,
        precio: 0,
        diferencia: 0,
      }
      map.set(key, {
        ...existing,
        cantidad: existing.cantidad + i.cantidad_pedida,
        precio: existing.precio + (i.precio_unitario * i.cantidad_pedida),
        diferencia: existing.diferencia + i.diferencia_kit,
      })
    })
    return Array.from(map.values())
  }, [filteredKitItems, productos])

  const porVendedor = useMemo(() => {
    const map = new Map<string, { cajero_nombre: string; items: { pieza: string; cantidad: number; precio: number; diferencia: number }[]; totalPrecio: number; totalDiferencia: number }>()
    filteredKitItems.forEach(i => {
      const key = i.orden.cajero_id
      const existing = map.get(key) ?? {
        cajero_nombre: i.orden.cajero_nombre,
        items: [],
        totalPrecio: 0,
        totalDiferencia: 0,
      }
      existing.items.push({
        pieza: i.producto_nombre,
        cantidad: i.cantidad_pedida,
        precio: i.precio_unitario * i.cantidad_pedida,
        diferencia: i.diferencia_kit,
      })
      existing.totalPrecio += i.precio_unitario * i.cantidad_pedida
      existing.totalDiferencia += i.diferencia_kit
      map.set(key, existing)
    })
    return Array.from(map.values())
  }, [filteredKitItems])

  const porFecha = useMemo(() => {
    const map = new Map<string, { fecha: string; cantidad: number; precio: number; diferencia: number }>()
    filteredKitItems.forEach(i => {
      const fecha = formatDate(i.orden.creado_en)
      const existing = map.get(fecha) ?? { fecha, cantidad: 0, precio: 0, diferencia: 0 }
      existing.cantidad += i.cantidad_pedida
      existing.precio += i.precio_unitario * i.cantidad_pedida
      existing.diferencia += i.diferencia_kit
      map.set(fecha, existing)
    })
    return Array.from(map.values()).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  }, [filteredKitItems])

  return (
    <MainLayout>
      <PageContainer>
        <div className="mb-6">
          <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">Reportes</p>
          <h1 className="text-3xl font-black text-steel-900 tracking-tight">Ventas de Kits</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('producto')}
            className={clsx(
              'px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
              tab === 'producto' ? 'bg-brand-600 text-white' : 'bg-steel-100 text-steel-600 hover:bg-steel-200'
            )}
          >
            Por producto
          </button>
          <button
            onClick={() => setTab('vendedor')}
            className={clsx(
              'px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
              tab === 'vendedor' ? 'bg-brand-600 text-white' : 'bg-steel-100 text-steel-600 hover:bg-steel-200'
            )}
          >
            Por vendedor
          </button>
          <button
            onClick={() => setTab('fecha')}
            className={clsx(
              'px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
              tab === 'fecha' ? 'bg-brand-600 text-white' : 'bg-steel-100 text-steel-600 hover:bg-steel-200'
            )}
          >
            Por fecha
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-xs text-steel-500">Desde:</label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-steel-500">Hasta:</label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-40"
            />
          </div>
          {(fechaDesde || fechaHasta) && (
            <Button variant="secondary" size="sm" onClick={() => { setFechaDesde(''); setFechaHasta('') }}>
              Limpiar
            </Button>
          )}
        </div>

        {tab === 'producto' && (
          <div className="bg-white rounded-2xl shadow-sm border border-steel-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-steel-50 border-b border-steel-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-steel-500 uppercase tracking-wider">Kit</th>
                    <th className="px-4 py-3 text-left font-semibold text-steel-500 uppercase tracking-wider">Pieza</th>
                    <th className="px-4 py-3 text-left font-semibold text-steel-500 uppercase tracking-wider">Código</th>
                    <th className="px-4 py-3 text-right font-semibold text-steel-500 uppercase tracking-wider">Cantidad</th>
                    <th className="px-4 py-3 text-right font-semibold text-steel-500 uppercase tracking-wider">Precio Venta</th>
                    <th className="px-4 py-3 text-right font-semibold text-steel-500 uppercase tracking-wider">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-50">
                  {porProducto.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-steel-400">No hay datos</td>
                    </tr>
                  ) : (
                    porProducto.map((row, i) => (
                      <tr key={i} className="hover:bg-steel-50">
                        <td className="px-4 py-3 text-steel-700">{row.kit_nombre}</td>
                        <td className="px-4 py-3 text-steel-800 font-medium">{row.pieza_nombre}</td>
                        <td className="px-4 py-3 text-steel-500 font-mono">{row.pieza_codigo}</td>
                        <td className="px-4 py-3 text-right text-steel-700">{row.cantidad}</td>
                        <td className="px-4 py-3 text-right text-steel-800 font-medium">{fmtBs(row.precio)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{fmtBs(row.diferencia)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'vendedor' && (
          <div className="space-y-4">
            {porVendedor.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-steel-100 p-8 text-center text-steel-400">
                No hay datos
              </div>
            ) : (
              porVendedor.map((vendedor, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-steel-100 overflow-hidden">
                  <div className="px-4 py-3 bg-steel-50 border-b border-steel-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-steel-800">{vendedor.cajero_nombre}</h3>
                    <div className="flex gap-4 text-xs">
                      <span className="text-steel-500">Total: <span className="font-semibold text-steel-700">{fmtBs(vendedor.totalPrecio)}</span></span>
                      <span className="text-emerald-600">Diferencia: <span className="font-semibold">{fmtBs(vendedor.totalDiferencia)}</span></span>
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-steel-50/50 border-b border-steel-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-steel-400 uppercase tracking-wider">Pieza</th>
                        <th className="px-4 py-2 text-right font-semibold text-steel-400 uppercase tracking-wider">Cantidad</th>
                        <th className="px-4 py-2 text-right font-semibold text-steel-400 uppercase tracking-wider">Precio</th>
                        <th className="px-4 py-2 text-right font-semibold text-steel-400 uppercase tracking-wider">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-steel-50">
                      {vendedor.items.map((item, j) => (
                        <tr key={j} className="hover:bg-steel-50">
                          <td className="px-4 py-2 text-steel-700">{item.pieza}</td>
                          <td className="px-4 py-2 text-right text-steel-700">{item.cantidad}</td>
                          <td className="px-4 py-2 text-right text-steel-800 font-medium">{fmtBs(item.precio)}</td>
                          <td className="px-4 py-2 text-right text-emerald-600">{fmtBs(item.diferencia)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'fecha' && (
          <div className="bg-white rounded-2xl shadow-sm border border-steel-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-steel-50 border-b border-steel-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-steel-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-right font-semibold text-steel-500 uppercase tracking-wider">Cantidad Vendida</th>
                    <th className="px-4 py-3 text-right font-semibold text-steel-500 uppercase tracking-wider">Precio Total</th>
                    <th className="px-4 py-3 text-right font-semibold text-steel-500 uppercase tracking-wider">Diferencia Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-50">
                  {porFecha.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-steel-400">No hay datos</td>
                    </tr>
                  ) : (
                    porFecha.map((row, i) => (
                      <tr key={i} className="hover:bg-steel-50">
                        <td className="px-4 py-3 text-steel-700">{row.fecha}</td>
                        <td className="px-4 py-3 text-right text-steel-700">{row.cantidad}</td>
                        <td className="px-4 py-3 text-right text-steel-800 font-medium">{fmtBs(row.precio)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{fmtBs(row.diferencia)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageContainer>
    </MainLayout>
  )
}