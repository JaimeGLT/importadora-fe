import { useEffect, useState } from 'react'
import { Modal, Button, Input, Select } from '@/components/ui'
import type { Producto, Proveedor, CategoriaProducto, UnidadProducto, HistorialPrecio } from '@/types'
import { clsx } from 'clsx'

interface ProductoModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>) => void
  producto: Producto | null
  proveedores: Proveedor[]
  categorias: CategoriaProducto[]
}

type FormData = Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>

const UNIDADES: { value: UnidadProducto; label: string }[] = [
  { value: 'pieza',  label: 'Pieza' },
  { value: 'juego',  label: 'Juego' },
  { value: 'par',    label: 'Par' },
  { value: 'kit',    label: 'Kit' },
  { value: 'litro',  label: 'Litro' },
  { value: 'metro',  label: 'Metro' },
  { value: 'otro',   label: 'Otro' },
]

const EMPTY: FormData = {
  codigo_universal: '',
  codigos_alternativos: ['', ''],
  nombre: '',
  descripcion: '',
  categoria: 'Motor',
  marca: '',
  vehiculo: '',
  unidad: 'pieza',
  stock: 0,
  stock_minimo: 5,
  precio_costo: 0,
  precio_venta: 0,
  historial_precios: [],
  ubicacion: 'Almacén Central',
  estado: 'activo',
  proveedor_id: '',
}

export function ProductoModal({
  open, onClose, onSave, producto, proveedores, categorias,
}: ProductoModalProps) {
  const [form, setForm]       = useState<FormData>(EMPTY)
  const [tipoCambio, setTipoCambio] = useState('6.96')
  const [errors, setErrors]   = useState<Partial<Record<keyof FormData | 'tipo_cambio', string>>>({})
  const [saving, setSaving]   = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)

  useEffect(() => {
    if (!open) return
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
        precio_costo:         producto.precio_costo,
        precio_venta:         producto.precio_venta,
        historial_precios:    producto.historial_precios,
        ubicacion:            producto.ubicacion,
        estado:               producto.estado,
        proveedor_id:         producto.proveedor_id,
      })
    } else {
      setForm({ ...EMPTY, proveedor_id: proveedores[0]?.id ?? '' })
    }
    setErrors({})
    setHistorialOpen(false)
  }, [open, producto, proveedores])

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
    if (!form.codigo_universal.trim()) e.codigo_universal = 'Requerido'
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.marca.trim()) e.marca = 'Requerido'
    if (form.precio_venta <= 0) e.precio_venta = 'Debe ser mayor a 0'
    if (form.precio_costo <= 0) e.precio_costo = 'Debe ser mayor a 0'
    if (!form.proveedor_id) e.proveedor_id = 'Selecciona un proveedor'
    const tc = parseFloat(tipoCambio)
    if (isNaN(tc) || tc <= 0) e.tipo_cambio = 'Tipo de cambio inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Genera entrada en historial si los precios cambiaron
  const buildHistorial = (): HistorialPrecio[] => {
    const tc = parseFloat(tipoCambio) || 6.96
    const prev = producto
    const costoChanged = !prev || prev.precio_costo !== form.precio_costo
    const ventaChanged = !prev || prev.precio_venta !== form.precio_venta
    if (!costoChanged && !ventaChanged) return form.historial_precios
    return [
      ...form.historial_precios,
      {
        fecha: new Date().toISOString(),
        precio_costo: form.precio_costo,
        precio_venta: form.precio_venta,
        tipo_cambio: tc,
      },
    ]
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 300))
    onSave({ ...form, historial_precios: buildHistorial() })
    setSaving(false)
  }

  const margen =
    form.precio_costo > 0 && form.precio_venta > 0
      ? (((form.precio_venta - form.precio_costo) / form.precio_costo) * 100).toFixed(1)
      : null

  const proveedor = proveedores.find((p) => p.id === form.proveedor_id)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={producto ? 'Editar producto' : 'Nuevo producto'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void handleSave()} loading={saving}>
            {producto ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* ── IDENTIFICACIÓN ── */}
        <section>
          <SectionTitle>Identificación</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Código universal"
              value={form.codigo_universal}
              onChange={(e) => set('codigo_universal', e.target.value)}
              error={errors.codigo_universal}
              placeholder="MOT-0011"
              hint="Código principal — usado en búsquedas y código de barras"
            />
            <Input
              label="Nombre del producto"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              error={errors.nombre}
              placeholder="Filtro de aceite Toyota"
            />
          </div>

          {/* Códigos alternativos */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input
              label="Código alternativo 1"
              value={form.codigos_alternativos[0] ?? ''}
              onChange={(e) => setAltCode(0, e.target.value)}
              placeholder="Código en caja o lista del proveedor"
              hint="Opcional — también busca por este código"
            />
            <Input
              label="Código alternativo 2"
              value={form.codigos_alternativos[1] ?? ''}
              onChange={(e) => setAltCode(1, e.target.value)}
              placeholder="Código en caja o lista del proveedor"
              hint="Opcional"
            />
          </div>
        </section>

        {/* ── DESCRIPCIÓN ── */}
        <section>
          <SectionTitle>Descripción</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoría"
              value={form.categoria}
              onChange={(e) => set('categoria', e.target.value as CategoriaProducto)}
              options={categorias.map((c) => ({ value: c, label: c }))}
            />
            <Input
              label="Marca"
              value={form.marca}
              onChange={(e) => set('marca', e.target.value)}
              error={errors.marca}
              placeholder="Bosch / NGK / OEM…"
            />
            <Input
              label="Vehículo / compatibilidad"
              value={form.vehiculo}
              onChange={(e) => set('vehiculo', e.target.value)}
              placeholder="Toyota Corolla 2018-2024 (opcional)"
              className="col-span-2"
            />
            <Input
              label="Descripción"
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Detalle adicional del producto"
              className="col-span-2"
            />
          </div>
        </section>

        {/* ── STOCK Y UNIDAD ── */}
        <section>
          <SectionTitle>Stock y almacén</SectionTitle>
          <div className="grid grid-cols-4 gap-3">
            <Select
              label="Unidad"
              value={form.unidad}
              onChange={(e) => set('unidad', e.target.value as UnidadProducto)}
              options={UNIDADES}
            />
            <Input
              label="Stock actual"
              type="number"
              value={form.stock}
              onChange={(e) => set('stock', Number(e.target.value))}
            />
            <Input
              label="Stock mínimo"
              type="number"
              value={form.stock_minimo}
              onChange={(e) => set('stock_minimo', Number(e.target.value))}
              hint="Alerta de reposición"
            />
            <Input
              label="Ubicación"
              value={form.ubicacion}
              onChange={(e) => set('ubicacion', e.target.value)}
              placeholder="Almacén Central"
            />
          </div>
        </section>

        {/* ── PRECIOS ── */}
        <section>
          <SectionTitle>Precios</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Precio costo (Bs)"
              type="number"
              step="0.01"
              value={form.precio_costo}
              onChange={(e) => set('precio_costo', Number(e.target.value))}
              error={errors.precio_costo}
            />
            <Input
              label="Precio venta (Bs)"
              type="number"
              step="0.01"
              value={form.precio_venta}
              onChange={(e) => set('precio_venta', Number(e.target.value))}
              error={errors.precio_venta}
            />
            <Input
              label="Tipo de cambio (Bs/$)"
              type="number"
              step="0.01"
              value={tipoCambio}
              onChange={(e) => { setTipoCambio(e.target.value); setErrors((er) => ({ ...er, tipo_cambio: undefined })) }}
              error={errors.tipo_cambio}
              hint="Se guarda con el historial de precios"
            />
          </div>

          {margen !== null && (
            <div className="mt-2 flex items-center gap-4 text-xs text-steel-500">
              <span>Margen: <strong className="text-green-600">{margen}%</strong></span>
              <span>Ganancia: <strong className="text-green-600">Bs {(form.precio_venta - form.precio_costo).toFixed(2)}</strong></span>
            </div>
          )}

          {/* Historial de precios */}
          {form.historial_precios.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setHistorialOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                <svg className={clsx('h-3.5 w-3.5 transition-transform', historialOpen && 'rotate-90')}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Ver historial de precios ({form.historial_precios.length} registros)
              </button>

              {historialOpen && (
                <div className="mt-2 rounded-lg border border-steel-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-steel-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-steel-500">Fecha</th>
                        <th className="px-3 py-2 text-right font-medium text-steel-500">Costo (Bs)</th>
                        <th className="px-3 py-2 text-right font-medium text-steel-500">Venta (Bs)</th>
                        <th className="px-3 py-2 text-right font-medium text-steel-500">T.C. Bs/$</th>
                        <th className="px-3 py-2 text-left font-medium text-steel-500">Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-steel-100">
                      {[...form.historial_precios].reverse().map((h, i) => (
                        <tr key={i} className={i === 0 ? 'bg-brand-50/40' : ''}>
                          <td className="px-3 py-2 text-steel-600">
                            {new Date(h.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-3 py-2 text-right text-steel-800">{h.precio_costo.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium text-steel-900">{h.precio_venta.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-steel-500">{h.tipo_cambio.toFixed(2)}</td>
                          <td className="px-3 py-2 text-steel-400">{h.nota ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── ORIGEN Y ESTADO ── */}
        <section>
          <SectionTitle>Origen y estado</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Proveedor / origen"
                value={form.proveedor_id}
                onChange={(e) => set('proveedor_id', e.target.value)}
                error={errors.proveedor_id}
                options={proveedores.map((p) => ({ value: p.id, label: `${p.nombre} (${p.pais})` }))}
                placeholder="Selecciona proveedor"
              />
              {proveedor?.tiempo_reposicion_dias && (
                <p className="mt-1 text-xs text-steel-400">
                  Tiempo estimado de reposición: <strong>{proveedor.tiempo_reposicion_dias} días</strong>
                </p>
              )}
            </div>
            <Select
              label="Estado"
              value={form.estado}
              onChange={(e) => set('estado', e.target.value as Producto['estado'])}
              options={[
                { value: 'activo',        label: 'Activo' },
                { value: 'sin_stock',     label: 'Sin stock' },
                { value: 'descontinuado', label: 'Descontinuado' },
              ]}
            />
          </div>
        </section>

      </div>
    </Modal>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-steel-400 uppercase tracking-wider mb-3">{children}</p>
  )
}
