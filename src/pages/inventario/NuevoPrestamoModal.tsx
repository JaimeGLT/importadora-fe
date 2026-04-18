import { useEffect, useState, useMemo } from 'react'
import Select, { type SingleValue, type GroupBase } from 'react-select'
import { Modal, Button, Input } from '@/components/ui'
import type { Producto, Prestamo } from '@/types'
import { clsx } from 'clsx'

interface NuevoPrestamoModalProps {
  open: boolean
  onClose: () => void
  onSave: (prestamo: Omit<Prestamo, 'id' | 'creado_en'>) => void
  productos: Producto[]
  productoInicial?: Producto | null
}

interface FormData {
  producto_id: string
  cantidad: number
  prestado_a: string
  fecha: string
  notas: string
}

interface ProductOption {
  value: string
  label: string
  producto: Producto
}

const hoy = () => new Date().toISOString().slice(0, 10)

// Custom select styles
const selectStyles = {
  control: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: '40px',
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? '#dc2626' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(220, 38, 38, 0.2)' : 'none',
    '&:hover': { borderColor: '#cbd5e1' },
  }),
  option: (base: object, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    padding: '8px 12px',
    backgroundColor: state.isSelected
      ? '#fef2f2'
      : state.isFocused
        ? '#f8fafc'
        : 'white',
    color: '#0f172a',
    '&:active': { backgroundColor: '#fef2f2' },
  }),
  menu: (base: object) => ({
    ...base,
    borderRadius: '0.75rem',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
  }),
  placeholder: (base: object) => ({
    ...base,
    color: '#94a3b8',
  }),
  singleValue: (base: object) => ({
    ...base,
    color: '#0f172a',
    fontWeight: 500,
  }),
  input: (base: object) => ({
    ...base,
    input: { boxShadow: 'none !important' },
  }),
}

// Custom option render
const ProductOption = ({ innerProps, data }: { innerProps: object; data: ProductOption }) => {
  const p = data.producto
  return (
    <div {...innerProps} className="px-3 py-2 cursor-pointer hover:bg-steel-50">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded">
          {p.codigo_universal}
        </span>
        {p.codigos_alternativos[0] && (
          <span className="font-mono text-[10px] text-steel-500">
            {p.codigos_alternativos[0]}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-steel-900 mt-0.5 truncate">{p.nombre}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-steel-500">{p.marca || 'Sin marca'}</span>
        <span className={clsx(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
          p.stock <= p.stock_minimo ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        )}>
          Stock: {p.stock}
        </span>
      </div>
    </div>
  )
}

// Custom single value render
const SingleValue = ({ data }: { data: ProductOption }) => {
  const p = data.producto
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded">
        {p.codigo_universal}
      </span>
      <span className="text-sm font-medium truncate max-w-[200px]">{p.nombre}</span>
    </div>
  )
}

export function NuevoPrestamoModal({
  open, onClose, onSave, productos, productoInicial,
}: NuevoPrestamoModalProps) {
  const [form, setForm]     = useState<FormData>({ producto_id: '', cantidad: 1, prestado_a: '', fecha: hoy(), notas: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)

  const producto = productos.find((p) => p.id === form.producto_id) ?? null

  // Opciones para react-select
  const productOptions: ProductOption[] = useMemo(() => {
    return productos
      .filter((p) => p.stock > 0 || p.id === form.producto_id)
      .map((p) => ({
        value: p.id,
        label: p.nombre,
        producto: p,
      }))
  }, [productos, form.producto_id])

  const selectedOption = productOptions.find((o) => o.value === form.producto_id) ?? null

  useEffect(() => {
    if (!open) return
    setForm({ producto_id: productoInicial?.id ?? '', cantidad: 1, prestado_a: '', fecha: hoy(), notas: '' })
    setErrors({})
  }, [open, productoInicial])

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!form.producto_id)              e.producto_id = 'Selecciona un producto'
    if (form.cantidad < 1)               e.cantidad    = 'Mínimo 1'
    if (producto && form.cantidad > producto.stock)
                                          e.cantidad    = `Stock disponible: ${producto.stock}`
    if (!form.prestado_a.trim())         e.prestado_a  = 'Requerido'
    if (!form.fecha)                     e.fecha       = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate() || !producto) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 300))
    onSave({
      producto_id:      producto.id,
      producto_nombre:  producto.nombre,
      producto_codigo:  producto.codigo_universal,
      cantidad:         form.cantidad,
      prestado_a:       form.prestado_a.trim(),
      precio_unitario:  producto.precio_venta,
      precio_total:     producto.precio_venta * form.cantidad,
      fecha:            new Date(form.fecha).toISOString(),
      notas:            form.notas.trim(),
    })
    setSaving(false)
  }

  const precioTotal = producto ? producto.precio_venta * form.cantidad : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar préstamo"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void handleSave()} loading={saving} disabled={!producto}>
            Registrar préstamo
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* Producto selector */}
        <div>
          <label className="block text-xs font-semibold text-steel-700 mb-1.5">
            Producto <span className="text-red-500">*</span>
          </label>
          <Select<ProductOption, false, GroupBase<ProductOption>>
            options={productOptions}
            value={selectedOption}
            onChange={(opt: SingleValue<ProductOption>) => {
              if (opt) {
                set('producto_id', opt.value)
                set('cantidad', 1)
              }
            }}
            placeholder="Buscar por código o nombre..."
            noOptionsMessage={() => 'No hay productos con stock'}
            styles={selectStyles}
            components={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Option: ProductOption as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              SingleValue: SingleValue as any,
            }}
            filterOption={(option, inputValue) => {
              const p = option.data.producto
              const q = inputValue.toLowerCase()
              return (
                p.codigo_universal.toLowerCase().includes(q) ||
                p.codigos_alternativos[0]?.toLowerCase().includes(q) ||
                p.codigos_alternativos[1]?.toLowerCase().includes(q) ||
                p.nombre.toLowerCase().includes(q) ||
                p.marca?.toLowerCase().includes(q)
              )
            }}
          />
          {errors.producto_id && (
            <p className="mt-1.5 text-xs text-red-500">{errors.producto_id}</p>
          )}
        </div>

        {/* Producto seleccionado preview */}
        {producto && (
          <div className="p-4 rounded-xl bg-steel-50 border border-steel-100">
            <div className="flex items-start gap-3">
              {producto.imagen ? (
                <img
                  src={producto.imagen}
                  alt={producto.nombre}
                  className="w-14 h-14 rounded-lg object-cover border border-steel-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-white border border-steel-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-brand-600 text-white text-[11px] font-mono font-bold">
                    {producto.codigo_universal}
                  </span>
                  {producto.codigos_alternativos[0] && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-steel-800 text-steel-100 text-[11px] font-mono font-bold">
                      {producto.codigos_alternativos[0]}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-steel-900">{producto.nombre}</p>
                <p className="text-xs text-steel-500">{producto.marca || 'Sin marca'} · {producto.ubicacion}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-steel-500 uppercase font-medium">Stock</p>
                <p className={clsx(
                  'text-xl font-black tabular-nums',
                  producto.stock <= producto.stock_minimo ? 'text-amber-600' : 'text-emerald-600'
                )}>
                  {producto.stock}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cantidad y destinatario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Cantidad a prestar"
            type="number"
            min={1}
            max={producto?.stock}
            value={form.cantidad}
            onChange={(e) => set('cantidad', Number(e.target.value))}
            error={errors.cantidad}
            hint={producto ? `Disponible: ${producto.stock}` : undefined}
          />
          <Input
            label="Prestado a"
            value={form.prestado_a}
            onChange={(e) => set('prestado_a', e.target.value)}
            error={errors.prestado_a}
            placeholder="Nombre o empresa"
          />
        </div>

        {/* Fecha y precio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fecha del préstamo"
            type="date"
            value={form.fecha}
            onChange={(e) => set('fecha', e.target.value)}
            error={errors.fecha}
          />
          <div>
            <label className="block text-xs font-semibold text-steel-700 mb-1.5">Valor estimado</label>
            {producto ? (
              <div className="h-9 px-3 flex items-center justify-between bg-white rounded-lg border border-steel-200">
                <span className="text-xs text-steel-500">
                  {form.cantidad} × Bs {producto.precio_venta.toFixed(2)}
                </span>
                <span className="text-sm font-bold text-steel-900">Bs {precioTotal.toFixed(2)}</span>
              </div>
            ) : (
              <div className="h-9 px-3 flex items-center bg-steel-50 rounded-lg border border-steel-200 text-steel-400 text-sm">
                Selecciona un producto
              </div>
            )}
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-semibold text-steel-700 mb-1.5">Notas (opcional)</label>
          <textarea
            value={form.notas}
            onChange={(e) => set('notas', e.target.value)}
            placeholder="Observaciones, condiciones del préstamo..."
            rows={2}
            className="w-full rounded-lg border border-steel-200 bg-white px-3 py-2 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

      </div>
    </Modal>
  )
}