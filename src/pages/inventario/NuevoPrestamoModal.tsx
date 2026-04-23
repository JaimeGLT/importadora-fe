import { useEffect, useState, useMemo } from 'react'
import Select, { type SingleValue, type GroupBase } from 'react-select'
import { Modal, Button, Input } from '@/components/ui'
import type { Producto, ItemPrestamo } from '@/types'
import { clsx } from 'clsx'

interface NuevoPrestamoModalProps {
  open: boolean
  onClose: () => void
  onSave: (items: ItemPrestamo[], prestado_a: string, fecha: string, notas: string) => void
  productos: Producto[]
}

interface ProductoCantidad {
  producto_id: string
  cantidad: number
}

interface ProductOption {
  value: string
  label: string
  producto: Producto
}

const hoy = () => new Date().toISOString().slice(0, 10)

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
    backgroundColor: state.isSelected ? '#fef2f2' : state.isFocused ? '#f8fafc' : 'white',
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

const ProductOption = ({ innerProps, data }: { innerProps: object; data: ProductOption }) => {
  const p = data.producto
  return (
    <div {...innerProps} className="px-3 py-2 cursor-pointer hover:bg-steel-50">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm bg-brand-600 text-white px-2 py-0.5 rounded">
          {p.codigo_universal}
        </span>
        {p.codigos_alternativos[0] && (
          <span className="font-mono text-[10px] text-steel-500">{p.codigos_alternativos[0]}</span>
        )}
      </div>
      <p className="text-xs text-steel-600 mt-0.5 truncate">{p.nombre}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-steel-400">{p.marca || 'Sin marca'}</span>
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

const SingleValue = ({ data }: { data: ProductOption }) => {
  const p = data.producto
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-sm bg-brand-600 text-white px-2 py-0.5 rounded">
        {p.codigo_universal}
      </span>
      <span className="text-xs text-steel-500 truncate max-w-[200px]">{p.nombre}</span>
    </div>
  )
}

export function NuevoPrestamoModal({ open, onClose, onSave, productos }: NuevoPrestamoModalProps) {
  const [items, setItems] = useState<ProductoCantidad[]>([{ producto_id: '', cantidad: 1 }])
  const [prestado_a, setPrestado_a] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [notas, setNotas] = useState('')
  const [errors, setErrors] = useState<{ prestado_a?: string; fecha?: string }>({})
  const [saving, setSaving] = useState(false)

  const productOptions: ProductOption[] = useMemo(() => {
    return productos
      .filter((p) => p.stock > 0)
      .map((p) => ({
        value: p.id,
        label: p.nombre,
        producto: p,
      }))
  }, [productos])

  useEffect(() => {
    if (!open) {
      setItems([{ producto_id: '', cantidad: 1 }])
      setPrestado_a('')
      setFecha(hoy())
      setNotas('')
      setErrors({})
    }
  }, [open])

  const handleProductChange = (index: number, productoId: string) => {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], producto_id: productoId }
      return updated
    })
  }

  const handleCantidadChange = (index: number, cantidad: number) => {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], cantidad: cantidad < 1 ? 1 : cantidad }
      return updated
    })
  }

  const handleAddRow = () => {
    setItems((prev) => [...prev, { producto_id: '', cantidad: 1 }])
  }

  const handleRemoveRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const validate = () => {
    const e: typeof errors = {}
    const hasEmpty = items.some((item) => !item.producto_id)
    if (hasEmpty) {
      setErrors((prev) => ({ ...prev, producto: 'Completa todos los productos' }))
      return false
    }
    if (items.length === 0) {
      setErrors((prev) => ({ ...prev, producto: 'Agrega al menos un producto' }))
      return false
    }
    if (!prestado_a.trim()) e.prestado_a = 'Requerido'
    if (!fecha) e.fecha = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 300))
    const itemPrestamoList: ItemPrestamo[] = items.map((item) => {
      const p = productos.find((pr) => pr.id === item.producto_id)!
      return {
        producto_id: item.producto_id,
        producto_nombre: p.nombre,
        producto_codigo: p.codigo_universal,
        cantidad: item.cantidad,
        precio_unitario: p.precio_venta,
        precio_total: p.precio_venta * item.cantidad,
      }
    })
    onSave(itemPrestamoList, prestado_a.trim(), new Date(fecha).toISOString(), notas.trim())
    setSaving(false)
  }

  const totalGeneral = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!item.producto_id) return sum
      const p = productos.find((pr) => pr.id === item.producto_id)
      return sum + (p ? p.precio_venta * item.cantidad : 0)
    }, 0)
  }, [items, productos])

  const getProducto = (producto_id: string) => productos.find((p) => p.id === producto_id)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar préstamo"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void handleSave()} loading={saving} disabled={items.length === 0 || items.some((i) => !i.producto_id)}>
            Registrar préstamo
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Prestado a"
            value={prestado_a}
            onChange={(e) => setPrestado_a(e.target.value)}
            error={errors.prestado_a}
            placeholder="Nombre o empresa"
          />
          <Input
            label="Fecha del préstamo"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            error={errors.fecha}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-steel-700">
              Agregar productos
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddRow}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Agregar fila
            </Button>
          </div>

          

          <div className="space-y-2">
            {items.map((item, index) => {
              const p = getProducto(item.producto_id)
              const selectedOption = productOptions.find((o) => o.value === item.producto_id) ?? null

              return (
                <>
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select<ProductOption, false, GroupBase<ProductOption>>
                      options={productOptions}
                      value={selectedOption}
                      onChange={(opt: SingleValue<ProductOption>) => {
                        if (opt) handleProductChange(index, opt.value)
                      }}
                      placeholder="Buscar código o nombre..."
                      noOptionsMessage={() => 'No hay productos con stock'}
                      styles={selectStyles}
                      components={{
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        Option: ProductOption as any,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        SingleValue: SingleValue as any,
                      }}
                      filterOption={(option, inputValue) => {
                        const pr = option.data.producto
                        const q = inputValue.toLowerCase()
                        return (
                          pr.codigo_universal.toLowerCase().includes(q) ||
                          pr.codigos_alternativos[0]?.toLowerCase().includes(q) ||
                          pr.codigos_alternativos[1]?.toLowerCase().includes(q) ||
                          pr.nombre.toLowerCase().includes(q) ||
                          pr.marca?.toLowerCase().includes(q)
                        )
                      }}
                    />
                  </div>
                  <div className="w-20 shrink-0">
                    <label className="block text-[10px] font-semibold text-steel-500 mb-0.5 text-center">Cantidad</label>
                    <Input
                      type="number"
                      min={1}
                      max={p?.stock ?? 999}
                      value={item.cantidad}
                      onChange={(e) => handleCantidadChange(index, Number(e.target.value))}
                      className="h-8 text-center"
                    />
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => handleRemoveRow(index)}
                      disabled={items.length === 1}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        items.length === 1
                          ? 'text-steel-200 cursor-not-allowed'
                          : 'text-steel-400 hover:bg-red-50 hover:text-red-500'
                      )}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                {p && (
                  <p className="text-[10px] text-steel-400 mt-0.5 ml-1">
                    Stock: <span className={clsx(p.stock <= p.stock_minimo ? 'text-amber-600' : 'text-emerald-600', 'font-semibold')}>{p.stock}</span>
                  </p>
                )}
                </>
              )
            })}
          </div>
        </div>

        {items.some((i) => i.producto_id) && (
          <div className="flex items-center justify-end gap-4 pt-3 border-t border-steel-100">
            <span className="text-sm text-steel-500">Total estimado:</span>
            <span className="text-lg font-black text-steel-900">Bs {totalGeneral.toFixed(2)}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-steel-700 mb-1.5">Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones, condiciones del préstamo..."
            rows={2}
            className="w-full rounded-lg border border-steel-200 bg-white px-3 py-2 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

      </div>
    </Modal>
  )
}