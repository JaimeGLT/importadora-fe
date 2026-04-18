import { useState, useEffect } from 'react'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Modal, Button, Input, ConfirmModal } from '@/components/ui'
import { useConfigStore, type DescuentoConfig, calcularPrecioConDescuento } from '@/stores/configStore'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'

// ─── UI Components ──────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-steel-100 ${className}`}>
      {children}
    </div>
  )
}

const COLOR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
}

const COLOR_OPTIONS = Object.keys(COLOR_STYLES)

// ─── Descuento Card ───────────────────────────────────────────────────────────

function DescuentoCard({
  descuento,
  onEdit,
  onToggle,
  onDelete,
  ejemploPrecio,
}: {
  descuento: DescuentoConfig
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  ejemploPrecio: number
}) {
  const styles = COLOR_STYLES[descuento.color] || COLOR_STYLES.emerald
  const precioEjemplo = calcularPrecioConDescuento(ejemploPrecio, descuento.porcentaje)

  return (
    <div className={clsx(
      'p-4 rounded-xl border-2 transition-all duration-200 flex flex-col',
      descuento.activo ? styles.border : 'border-steel-200 opacity-60',
      styles.bg
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={clsx(
            'w-11 h-11 rounded-xl flex items-center justify-center font-black text-base bg-white shadow-sm',
            styles.text
          )}>
            {descuento.porcentaje}%
          </div>
          <div>
            <h3 className={clsx('font-bold text-base leading-tight', styles.text)}>{descuento.nombre}</h3>
            <span className={clsx(
              'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5',
              descuento.activo ? 'bg-emerald-200/50 text-emerald-700' : 'bg-steel-200 text-steel-500'
            )}>
              {descuento.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 mb-3 -mx-1">
        <button
          onClick={onToggle}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            descuento.activo
              ? 'bg-white/60 text-emerald-700 hover:bg-white'
              : 'bg-white/40 text-steel-600 hover:bg-white/60'
          )}
        >
          {descuento.activo ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Activo
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Inactivo
            </>
          )}
        </button>
        <button
          onClick={onEdit}
          className="p-2 rounded-lg bg-white/40 text-steel-600 hover:bg-white transition-colors"
          title="Editar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg bg-white/40 text-red-500 hover:bg-red-100 transition-colors"
          title="Eliminar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Ejemplo de precio */}
      <div className="bg-white/70 rounded-lg px-3 py-2.5 mt-auto">
        <p className="text-[10px] text-steel-500 uppercase font-medium mb-1">Ejemplo (precio Bs 100)</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-steel-400 line-through">Bs 100.00</span>
          <svg className="w-3 h-3 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className={clsx('text-sm font-bold', styles.text)}>
            Bs {precioEjemplo.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de edición ───────────────────────────────────────────────────────

function DescuentoModal({
  open,
  onClose,
  onSave,
  descuento,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<DescuentoConfig, 'id'>) => void
  descuento: DescuentoConfig | null
}) {
  const [nombre, setNombre] = useState('')
  const [porcentaje, setPorcentaje] = useState('10')
  const [color, setColor] = useState('emerald')
  const [saving, setSaving] = useState(false)

  // Resetear campos cuando se abre el modal
  useEffect(() => {
    if (open) {
      if (descuento) {
        setNombre(descuento.nombre)
        setPorcentaje(String(descuento.porcentaje))
        setColor(descuento.color)
      } else {
        setNombre('')
        setPorcentaje('10')
        setColor('emerald')
      }
    }
  }, [open, descuento])

  const handleSave = async () => {
    if (!nombre.trim()) {
      notify.error('Nombre requerido')
      return
    }
    const pct = parseFloat(porcentaje)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      notify.error('Porcentaje inválido (0-100)')
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 200))
    onSave({ nombre: nombre.trim(), porcentaje: pct, color, activo: true })
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={descuento ? 'Editar descuento' : 'Nuevo descuento'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>
            {descuento ? 'Guardar cambios' : 'Crear descuento'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nombre del descuento"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Familia, Mecánico, Mayorista..."
        />
        <Input
          label="Porcentaje de descuento"
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={porcentaje}
          onChange={(e) => setPorcentaje(e.target.value)}
          hint="De 0 a 100%"
        />
        <div>
          <label className="block text-xs font-semibold text-steel-700 mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => {
              const s = COLOR_STYLES[c]
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx(
                    'w-10 h-10 rounded-lg border-2 transition-all flex items-center justify-center',
                    s.bg, s.border,
                    color === c && 'ring-2 ring-offset-2 ring-steel-400'
                  )}
                >
                  {color === c && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-steel-700 mb-2">Vista previa</label>
          <div className={clsx(
            'p-4 rounded-xl border-2',
            COLOR_STYLES[color]?.bg || 'bg-emerald-50',
            COLOR_STYLES[color]?.border || 'border-emerald-200'
          )}>
            <div className="flex items-center gap-3">
              <div className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg bg-white shadow-sm',
                COLOR_STYLES[color]?.text || 'text-emerald-700'
              )}>
                {porcentaje}%
              </div>
              <div>
                <p className={clsx('font-bold', COLOR_STYLES[color]?.text || 'text-emerald-700')}>
                  {nombre || 'Nombre del descuento'}
                </p>
                <p className="text-xs text-steel-500">Activo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function ConfiguracionPage() {
  const { descuentos, addDescuento, updateDescuento, removeDescuento } = useConfigStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DescuentoConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DescuentoConfig | null>(null)

  const handleNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (d: DescuentoConfig) => {
    setEditing(d)
    setModalOpen(true)
  }

  const handleSave = (data: Omit<DescuentoConfig, 'id'>) => {
    if (editing) {
      updateDescuento(editing.id, data)
      notify.success('Descuento actualizado')
    } else {
      addDescuento({ ...data, id: crypto.randomUUID() })
      notify.success('Descuento creado')
    }
  }

  const handleToggle = (d: DescuentoConfig) => {
    updateDescuento(d.id, { activo: !d.activo })
    notify.success(d.activo ? 'Descuento desactivado' : 'Descuento activado')
  }

  const handleDelete = () => {
    if (!deleteConfirm) return
    removeDescuento(deleteConfirm.id)
    notify.success('Descuento eliminado')
    setDeleteConfirm(null)
  }

  return (
    <MainLayout>
      <PageContainer>
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">
              Sistema
            </p>
            <h1 className="text-3xl font-black text-steel-900 tracking-tight">Configuración</h1>
          </div>
          <Button onClick={handleNew} icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }>
            Nuevo descuento
          </Button>
        </div>

        {/* Descuentos */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-4 rounded-full bg-brand-600" />
            <h2 className="text-[11px] font-bold text-steel-500 uppercase tracking-widest">
              Descuentos especiales
            </h2>
          </div>

          {descuentos.length === 0 ? (
            <div className="text-center py-12 text-steel-400">
              <p className="text-sm">No hay descuentos configurados</p>
              <Button variant="secondary" className="mt-3" onClick={handleNew}>
                Agregar descuento
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {descuentos.map((d) => (
                <DescuentoCard
                  key={d.id}
                  descuento={d}
                  onEdit={() => handleEdit(d)}
                  onToggle={() => handleToggle(d)}
                  onDelete={() => setDeleteConfirm(d)}
                  ejemploPrecio={100}
                />
              ))}
            </div>
          )}
        </Card>
      </PageContainer>

      <DescuentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        descuento={editing}
      />

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar descuento"
        message={`¿Eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  )
}