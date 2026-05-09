import { useEffect, useState } from 'react'
import { Button, WarmInput, DrawerWrapper, FormSection } from '@/components/ui'
import type { Producto, HistorialPrecio } from '@/types'
import type { DtoPiezaKit, KitOps, PieceOp } from '@/lib/queries/inventario.queries'
import { KitPartsSection } from './KitPartsSection'
import { useConfigStore, calcularPrecioConDescuento } from '@/stores/configStore'
import { clsx } from 'clsx'

interface ProductoModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>, kitOps: KitOps) => Promise<void>
  producto: Producto | null
  loading?: boolean
  productosExistentes?: Producto[]
}

type FormData = Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>

const EMPTY: FormData = {
  codigo_universal: '',
  codigos_alternativos: ['', ''],
  nombre: '',
  descripcion: '',
  categoria: 'Otro',
  marca: '',
  vehiculo: '',
  unidad: 'pieza',
  stock: 0,
  stock_minimo: 5,
  piezas: 1,
  precio_costo: 0,
  precio_venta: 0,
  conversionABs: 6.96,
  historial_precios: [],
  almacen: 'Almacén Central',
  estante: '',
  fila: '',
  columna: '',
  estado: 'activo',
  proveedor_id: '',
  es_kit: false,
  kit_id: null,
  cantidad_por_kit: 1,
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonField({ labelWidth = 24 }: { labelWidth?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-2.5 rounded bg-cream-2 animate-pulse" style={{ width: `${labelWidth}%` }} />
      <div className="h-[42px] w-full rounded-[10px] bg-cream-2 animate-pulse" />
    </div>
  )
}

// ─── Precios especiales ───────────────────────────────────────────────────────

const COLOR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
}

function PreciosEspecialesSection({ precioVenta }: { precioVenta: number }) {
  const { descuentos } = useConfigStore()
  const descuentosActivos = descuentos.filter((d) => d.activo)
  if (descuentosActivos.length === 0 || precioVenta <= 0) return null

  return (
    <section className="rounded-[14px] border border-hair overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-b from-cream-2/90 to-cream/50 border-b border-hair">
        <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[8px] bg-white border border-hair text-ink-2 shadow-sm flex-shrink-0">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-ink-2">Precios especiales</p>
          <p className="text-[11px] text-muted-2 leading-tight">Descuentos automáticos configurados</p>
        </div>
      </div>
      <div className="p-5 bg-white">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {descuentosActivos.map((d) => {
            const styles = COLOR_STYLES[d.color] || COLOR_STYLES.emerald
            const precioFinal = calcularPrecioConDescuento(precioVenta, d.porcentaje)
            return (
              <div key={d.id} className={clsx('px-3 py-2.5 rounded-[10px] border', styles.bg, styles.border)}>
                <p className={clsx('text-[10px] font-semibold uppercase tracking-wide', styles.text)}>{d.nombre}</p>
                <p className="text-[11px] text-muted-2 line-through mt-0.5">Bs {precioVenta.toFixed(2)}</p>
                <p className={clsx('text-sm font-bold', styles.text)}>Bs {precioFinal.toFixed(2)}</p>
                <p className="text-[10px] text-muted-2">-{d.porcentaje}%</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductoModal({
  open, onClose, onSave, producto, loading, productosExistentes = [],
}: ProductoModalProps) {
  const [form, setForm]       = useState<FormData>(EMPTY)
  const [tipoCambio, setTipoCambio] = useState('6.96')
  const [errors, setErrors]   = useState<Partial<Record<keyof FormData | 'tipo_cambio', string>>>({})
  const [saving, setSaving]   = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [actualizarPrecio, setActualizarPrecio] = useState(false)
  const [nuevoCosto, setNuevoCosto] = useState('')
  const [nuevoVenta, setNuevoVenta] = useState('')
  const [nuevoTipoCambio, setNuevoTipoCambio] = useState('')
  const [nuevoNota, setNuevoNota] = useState('')
  // Kit state
  const [kitPieces, setKitPieces] = useState<DtoPiezaKit[]>([])
  const [pieceOps, setPieceOps]   = useState<PieceOp[]>([])
  const [stockManual, setStockManual] = useState('')

  const isLoading = loading && producto !== null

  useEffect(() => {
    if (!open) return
    const tc = producto?.conversionABs ?? 6.96
    if (producto) {
      setForm({
        codigo_universal:     producto.codigo_universal,
        codigos_alternativos: [...producto.codigos_alternativos, '', ''].slice(0, 2),
        nombre:               producto.nombre,
        descripcion:          producto.descripcion,
        categoria:            producto.categoria,
        marca:                producto.marca,
        vehiculo:             producto.vehiculo,
        unidad:               producto.unidad,
        stock:                producto.stock,
        stock_minimo:         producto.stock_minimo,
        piezas:               producto.piezas ?? 1,
        precio_costo:         producto.precio_costo,
        precio_venta:         producto.precio_venta,
        conversionABs:        tc,
        historial_precios:    producto.historial_precios,
        almacen: [producto.almacen, producto.estante, producto.fila, producto.columna].filter(Boolean).join(' / '),
        estante: '',
        fila: '',
        columna: '',
        estado:               producto.estado,
        proveedor_id:         producto.proveedor_id,
        es_kit:               producto.es_kit ?? false,
        kit_id:               producto.kit_id ?? null,
        cantidad_por_kit:     producto.cantidad_por_kit ?? 1,
      })
      setTipoCambio(String(tc))
    } else {
      setForm(EMPTY)
      setTipoCambio('6.96')
    }
    setErrors({})
    setHistorialOpen(false)
    setActualizarPrecio(false)
    setNuevoCosto('')
    setNuevoVenta('')
    setNuevoTipoCambio('')
    setNuevoNota('')
    setKitPieces([])
    setPieceOps([])
    setStockManual('')
  }, [open, producto])

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const setAltCode = (idx: 0 | 1, value: string) => {
    const next = [...form.codigos_alternativos] as [string, string]
    next[idx] = value
    set('codigos_alternativos', next)
  }

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.codigo_universal.trim()) {
      e.codigo_universal = 'El código universal es obligatorio'
    } else if (form.codigo_universal.trim().length < 3) {
      e.codigo_universal = 'El código debe tener al menos 3 caracteres'
    }
    if (!form.nombre.trim()) {
      e.nombre = 'El nombre del producto es obligatorio'
    }
    if (!producto && form.precio_costo <= 0) {
      e.precio_costo = 'El precio costo debe ser mayor a 0'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildHistorial = (): HistorialPrecio[] => {
    const tc = parseFloat(tipoCambio) || 6.96
    if (actualizarPrecio && nuevoCosto && nuevoVenta) {
      const nuevoTc = parseFloat(nuevoTipoCambio) || tc
      return [
        ...form.historial_precios,
        {
          fecha: new Date().toISOString(),
          precio_costo: form.precio_costo,
          precio_venta: form.precio_venta,
          tipo_cambio: nuevoTc,
          nota: nuevoNota || undefined,
        },
      ]
    }
    return form.historial_precios
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const wasKit = producto?.es_kit ?? false
      const isKit  = form.es_kit

      let kitOps: KitOps = { mode: 'none' }
      if (!producto && isKit) {
        kitOps = { mode: 'convertirKit', piezas: kitPieces }
      } else if (producto && !wasKit && isKit) {
        kitOps = { mode: 'convertirKit', piezas: kitPieces }
      } else if (producto && wasKit && !isKit) {
        kitOps = { mode: 'convertirRegular', stockManual: stockManual ? parseInt(stockManual) : null }
      } else if (producto && wasKit && isKit && pieceOps.length > 0) {
        kitOps = { mode: 'managePieces', pieceOps }
      }

      const dataToSave = actualizarPrecio && nuevoCosto && nuevoVenta
        ? {
            ...form,
            precio_costo: parseFloat(nuevoCosto) || form.precio_costo,
            precio_venta: parseFloat(nuevoVenta) || form.precio_venta,
            conversionABs: parseFloat(nuevoTipoCambio) || parseFloat(tipoCambio) || 6.96,
            historial_precios: buildHistorial(),
          }
        : { ...form, historial_precios: buildHistorial() }
      await onSave(dataToSave, kitOps)
    } finally {
      setSaving(false)
    }
  }

  const margen =
    form.precio_costo > 0 && form.precio_venta > 0
      ? (((form.precio_venta - form.precio_costo) / form.precio_costo) * 100).toFixed(1)
      : null

  const ganancia =
    form.precio_venta > 0 && form.precio_costo > 0
      ? (form.precio_venta - form.precio_costo).toFixed(2)
      : null

  return (
    <DrawerWrapper
      open={open}
      onClose={onClose}
      subtitle={producto ? 'Detalle del producto' : 'Nuevo producto'}
      title={producto ? producto.nombre : 'Registrar autoparte'}
      sku={producto?.codigo_universal}
      footer={
        <>
          <Button variant="secondary"
            className="h-[42px] px-5 rounded-[10px] !border-hair !text-ink-2 !bg-white hover:!bg-cream-2 hover:!border-hair-2 !text-[13.5px] !font-medium"
            onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            className="h-[42px] px-5 rounded-[10px] !bg-terra hover:!bg-terra-deep !text-white !text-[13.5px] !font-semibold"
            onClick={() => void handleSave()} loading={saving}>
            {producto ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SkeletonField labelWidth={30} />
            <SkeletonField labelWidth={50} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SkeletonField labelWidth={45} />
            <SkeletonField labelWidth={60} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SkeletonField labelWidth={20} />
            <SkeletonField labelWidth={35} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SkeletonField labelWidth={50} />
            <SkeletonField labelWidth={70} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SkeletonField labelWidth={40} />
            <SkeletonField labelWidth={35} />
            <SkeletonField labelWidth={50} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Identificación */}
          <FormSection icon={<IconBarcode />} title="Identificación" description="Códigos únicos que identifican el producto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <WarmInput
                label="Código universal *"
                value={form.codigo_universal}
                onChange={(e) => set('codigo_universal', e.target.value)}
                error={errors.codigo_universal}
                placeholder="MOT-0011"
                hint="Código principal — usado en búsquedas y etiquetas"
              />
              <WarmInput
                label="Nombre del producto *"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                error={errors.nombre}
                placeholder="Filtro de aceite Toyota"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <WarmInput
                label="Código alternativo 1"
                value={form.codigos_alternativos[0] ?? ''}
                onChange={(e) => setAltCode(0, e.target.value)}
                placeholder="Ej. código del proveedor"
                hint="Opcional — también busca por este código"
              />
              <WarmInput
                label="Código alternativo 2"
                value={form.codigos_alternativos[1] ?? ''}
                onChange={(e) => setAltCode(1, e.target.value)}
                placeholder="Ej. código en caja"
                hint="Opcional"
              />
            </div>
          </FormSection>

          {/* Descripción */}
          <FormSection icon={<IconClipboard />} title="Descripción" description="Marca y detalle del producto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <WarmInput
                label="Marca"
                value={form.marca}
                onChange={(e) => set('marca', e.target.value)}
                error={errors.marca}
                placeholder="Bosch / NGK / OEM…"
              />
              <WarmInput
                label="Descripción adicional"
                value={form.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
                placeholder="Detalle o nota adicional del producto"
              />
            </div>
          </FormSection>

          {/* Stock y almacén */}
          <FormSection icon={<IconBox />} title="Stock y almacén" description="Cantidades, unidad de medida y ubicación física">
            <WarmInput
              label="Ubicación"
              value={form.almacen}
              onChange={(e) => set('almacen', e.target.value)}
              placeholder="Almacén Central"
              hint="Nombre del almacén o ubicación física del producto"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <WarmInput
                label="Stock actual *"
                type="number"
                value={form.stock}
                onChange={(e) => set('stock', Number(e.target.value))}
                readOnly={!!producto}
                hint="Stock editable solo desde el módulo de Ajustes"
              />
              <WarmInput
                label="Stock mínimo"
                type="number"
                value={form.stock_minimo}
                onChange={(e) => set('stock_minimo', Number(e.target.value))}
                hint="Se activa alerta de reposición al llegar a este nivel"
              />
              <WarmInput
                label="Piezas"
                type="number"
                value={form.piezas}
                onChange={(e) => set('piezas', Number(e.target.value))}
                hint="Piezas por unidad (default 1)"
              />
            </div>
          </FormSection>

          {/* Kit */}
          <FormSection
            icon={<IconKit />}
            title="Kit / Conjunto"
            description="Relacionar producto como kit o como parte de un kit"
            extra={producto?.es_kit && producto.stock !== undefined ? (
              <div className="flex items-center gap-1.5 rounded-full bg-navy/10 border border-navy/20 px-2.5 py-1">
                <svg className="h-3 w-3 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="text-[11px] font-bold text-navy tabular-nums">{producto.stock}</span>
                <span className="text-[10px] text-navy/70">kits</span>
              </div>
            ) : undefined}
          >
            <div className="space-y-4">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.es_kit}
                  onChange={(e) => set('es_kit', e.target.checked)}
                  className="h-4 w-4 rounded-[4px] border-hair"
                  style={{ accentColor: '#B22234' }}
                />
                <span className="text-[13px] font-semibold text-ink-2">Este producto es un kit</span>
              </label>

              {/* Kit → Regular: warning + stock manual input */}
              {!form.es_kit && producto?.es_kit && (
                <div className="rounded-[12px] border-2 border-dashed border-amber-300 bg-amber-50/60 overflow-hidden">
                  <div className="px-4 py-3 flex items-start gap-2.5">
                    <svg className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-[12.5px] font-bold text-amber-800">Convertir a producto regular</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">Las piezas del kit y el stock calculado se eliminarán al guardar.</p>
                    </div>
                  </div>
                  <div className="px-4 pb-4 bg-white/60 border-t border-amber-200">
                    <div className="pt-3">
                      <WarmInput
                        label="Stock manual (opcional)"
                        type="number"
                        value={stockManual}
                        onChange={(e) => setStockManual(e.target.value)}
                        placeholder="0"
                        hint="Si no se especifica, el stock queda en 0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Kit parts management */}
              {form.es_kit && (
                <KitPartsSection
                  productoId={producto?.id}
                  wasKit={producto?.es_kit ?? false}
                  piezasFromBackend={producto?.piezas_kit}

                  localPieces={kitPieces}
                  onLocalPiecesChange={setKitPieces}
                  pieceOps={pieceOps}
                  onPieceOpsChange={setPieceOps}
                />
              )}

              {!form.es_kit && !producto?.es_kit && producto?.kit_id && (
                <div className="p-3.5 rounded-[10px] bg-cream-2 border border-hair">
                  <p className="text-[12px] text-muted-2">
                    Parte del kit:{' '}
                    <span className="font-semibold text-ink-2">{getKitNombre(producto.kit_id, productosExistentes)}</span>
                  </p>
                </div>
              )}
            </div>
          </FormSection>

          {/* Precios */}
          <FormSection icon={<IconCurrency />} title="Precios" description="Costos, precio de venta y tipo de cambio">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <WarmInput
                label="Precio costo (Bs) *"
                type="number"
                step="0.01"
                value={form.precio_costo}
                onChange={(e) => set('precio_costo', Number(e.target.value))}
                error={errors.precio_costo}
                readOnly={!!producto}
              />
              <WarmInput
                label="Precio venta (Bs)"
                type="number"
                step="0.01"
                value={form.precio_venta}
                onChange={(e) => set('precio_venta', Number(e.target.value))}
                error={errors.precio_venta}
                readOnly={!!producto}
              />
              <WarmInput
                label="Tipo de cambio (Bs/$)"
                type="number"
                step="0.01"
                value={tipoCambio}
                onChange={(e) => {
                  setTipoCambio(e.target.value)
                  set('conversionABs', parseFloat(e.target.value) || 6.96)
                  setErrors((er) => ({ ...er, tipo_cambio: undefined }))
                }}
                error={errors.tipo_cambio}
                hint="Se guarda en el historial de precios"
                readOnly={!!producto}
              />
            </div>
            {margen !== null && (
              <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 rounded-full bg-[#D1FAE5] border border-[rgba(4,120,87,0.25)] px-3 py-1">
                  <svg className="h-3.5 w-3.5 text-[#047857]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-xs font-semibold text-[#047857]">Margen {margen}%</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-cream-2 border border-hair px-3 py-1">
                  <span className="text-xs text-muted">Ganancia</span>
                  <span className="text-xs font-semibold text-ink-2">Bs {ganancia}</span>
                </div>
              </div>
            )}
          </FormSection>

          {/* Actualizar precios (solo edición) */}
          {producto && (
            <div className="rounded-[14px] border-2 border-dashed border-amber-300 bg-amber-50/50 overflow-hidden">
              <div className="px-5 py-3.5 flex items-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={actualizarPrecio}
                    onChange={(e) => setActualizarPrecio(e.target.checked)}
                    className="h-4 w-4 rounded-[4px] border-amber-400"
                    style={{ accentColor: '#B45309' }}
                  />
                  <span className="text-[12.5px] font-bold text-amber-800">Actualizar precios</span>
                </label>
                <span className="text-[11px] text-amber-600">Los precios actuales pasarán al historial</span>
              </div>
              {actualizarPrecio && (
                <div className="px-5 pb-5 bg-white border-t border-amber-200">
                  <div className="pt-3.5 text-[11px] text-amber-700 bg-amber-100/50 rounded-[10px] px-3.5 py-2.5 mb-3.5">
                    <strong>Precio actual:</strong> Costo Bs {form.precio_costo.toFixed(2)} · Venta Bs {form.precio_venta.toFixed(2)} · T.C. {(parseFloat(tipoCambio) || 6.96).toFixed(2)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <WarmInput
                      label="Nuevo costo (Bs)"
                      type="number"
                      step="0.01"
                      value={nuevoCosto}
                      onChange={(e) => setNuevoCosto(e.target.value)}
                      placeholder={form.precio_costo.toFixed(2)}
                    />
                    <WarmInput
                      label="Nueva venta (Bs)"
                      type="number"
                      step="0.01"
                      value={nuevoVenta}
                      onChange={(e) => setNuevoVenta(e.target.value)}
                      placeholder={form.precio_venta.toFixed(2)}
                    />
                    <WarmInput
                      label="Nuevo T.C. (Bs/$)"
                      type="number"
                      step="0.01"
                      value={nuevoTipoCambio}
                      onChange={(e) => setNuevoTipoCambio(e.target.value)}
                      placeholder={tipoCambio}
                    />
                  </div>
                  <div className="mt-3">
                    <WarmInput
                      label="Nota (opcional)"
                      value={nuevoNota}
                      onChange={(e) => setNuevoNota(e.target.value)}
                      placeholder="Ej. ajuste por inflación, cambio de proveedor..."
                      hint="Descripción del cambio de precio"
                    />
                  </div>
                  {nuevoCosto && nuevoVenta && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-1">
                        <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-xs font-semibold text-amber-700">
                          Se guardará: Costo {nuevoCosto} · Venta {nuevoVenta}{nuevoNota ? ` · Nota: ${nuevoNota}` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <PreciosEspecialesSection precioVenta={form.precio_venta} />

          {/* Historial de precios */}
          {form.historial_precios.length > 0 && (
            <FormSection
              icon={<IconHistory />}
              title="Historial de precios"
              description={`${form.historial_precios.length} registro${form.historial_precios.length !== 1 ? 's' : ''} de cambios`}
              collapsible
              open={historialOpen}
              onToggle={() => setHistorialOpen((v) => !v)}
            >
              <div className="overflow-x-auto -mx-5 -mb-5">
                <table className="w-full text-xs min-w-[400px]">
                  <thead className="border-b border-hair">
                    <tr style={{ background: 'rgba(240,237,232,0.7)' }}>
                      <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold text-muted uppercase tracking-[0.06em]">Fecha</th>
                      <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold text-muted uppercase tracking-[0.06em]">Costo (Bs)</th>
                      <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold text-muted uppercase tracking-[0.06em]">Venta (Bs)</th>
                      <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold text-muted uppercase tracking-[0.06em]">T.C.</th>
                      <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold text-muted uppercase tracking-[0.06em]">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hair/50">
                    {[...form.historial_precios].reverse().map((h, i) => (
                      <tr key={i} style={{ background: i === 0 ? 'rgba(245,220,223,0.2)' : 'white' }}>
                        <td className="px-4 py-2.5 text-ink-2 whitespace-nowrap">
                          {new Date(h.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted tabular-nums">{h.precio_costo.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-ink tabular-nums">{h.precio_venta.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-2 tabular-nums">{h.tipo_cambio.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-muted-2">{h.nota ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FormSection>
          )}
        </div>
      )}
    </DrawerWrapper>
  )
}

function getKitNombre(kitId: string | null | undefined, productos: Producto[]): string {
  if (!kitId) return '—'
  return productos.find((p) => p.id === kitId)?.nombre ?? '—'
}

/* ── Icons ── */
function IconBarcode() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9V5a2 2 0 012-2h2M3 15v4a2 2 0 002 2h2m10-16h2a2 2 0 012 2v4m0 6v4a2 2 0 01-2 2h-2M9 5v14M12 5v14M15 5v14" />
    </svg>
  )
}
function IconClipboard() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}
function IconCurrency() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconHistory() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconKit() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}
