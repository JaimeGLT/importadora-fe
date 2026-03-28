import { useEffect, useState } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import type { Producto, Prestamo } from '@/types'

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

const hoy = () => new Date().toISOString().slice(0, 10)

export function NuevoPrestamoModal({
  open, onClose, onSave, productos, productoInicial,
}: NuevoPrestamoModalProps) {
  const [form, setForm]     = useState<FormData>({ producto_id: '', cantidad: 1, prestado_a: '', fecha: hoy(), notas: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)

  const producto = productos.find((p) => p.id === form.producto_id) ?? null

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
    if (form.cantidad < 1)              e.cantidad    = 'Mínimo 1'
    if (producto && form.cantidad > producto.stock)
                                        e.cantidad    = `Stock disponible: ${producto.stock}`
    if (!form.prestado_a.trim())        e.prestado_a  = 'Requerido'
    if (!form.fecha)                    e.fecha       = 'Requerido'
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
  const productosConStock = productos.filter((p) => p.stock > 0 || p.id === form.producto_id)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar préstamo"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void handleSave()} loading={saving}>Registrar</Button>
        </>
      }
    >
      <div className="space-y-4">

        {/* Producto */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-steel-700">
            Producto <span className="text-red-500">*</span>
          </label>
          <select
            value={form.producto_id}
            onChange={(e) => { set('producto_id', e.target.value); set('cantidad', 1) }}
            className="h-9 w-full rounded-lg border border-steel-200 bg-white px-3 text-sm text-steel-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Seleccionar producto…</option>
            {productosConStock.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — {p.codigo_universal} (stock: {p.stock})
              </option>
            ))}
          </select>
          {errors.producto_id && <p className="text-xs text-red-500">{errors.producto_id}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Cantidad */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-steel-700">
              Cantidad <span className="text-red-500">*</span>
            </label>
            <input
              type="number" min={1} max={producto?.stock}
              value={form.cantidad}
              onChange={(e) => set('cantidad', Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-steel-200 bg-white px-3 text-sm text-steel-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.cantidad && <p className="text-xs text-red-500">{errors.cantidad}</p>}
          </div>

          {/* Prestado a */}
          <Input
            label="Prestado a"
            value={form.prestado_a}
            onChange={(e) => set('prestado_a', e.target.value)}
            error={errors.prestado_a}
            placeholder="Nombre o empresa"
          />
        </div>

        {/* Fecha */}
        <Input
          label="Fecha"
          type="date"
          value={form.fecha}
          onChange={(e) => set('fecha', e.target.value)}
          error={errors.fecha}
        />

        {/* Notas */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-steel-700">Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => set('notas', e.target.value)}
            placeholder="Observaciones opcionales…"
            rows={2}
            className="w-full rounded-lg border border-steel-200 bg-white px-3 py-2 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Precio total */}
        {producto && (
          <div className="flex items-center justify-between px-4 py-3 bg-steel-50 rounded-lg border border-steel-100">
            <span className="text-sm text-steel-600">
              {form.cantidad} × Bs {producto.precio_venta.toFixed(2)}
            </span>
            <span className="text-base font-bold text-steel-900">
              Bs {precioTotal.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}
