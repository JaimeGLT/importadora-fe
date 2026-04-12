import { useState, useRef, useCallback } from 'react'
import type * as XLSXType from 'xlsx'
import { Modal, Button, Input, Select, ExcelColumnMapper } from '@/components/ui'
import type { Importacion, ItemImportacion, OrigenConfig, Producto } from '@/types'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

// ─── Tipos internos ───────────────────────────────────────────────────────────

type ImportStep = 'datos' | 'excel' | 'preview' | 'confirmar'

type ImportField = 'codigo_proveedor' | 'codigo_alt1' | 'codigo_alt2' | 'nombre' | 'precio_fob_usd' | 'cantidad'

interface SystemField {
  key: ImportField
  label: string
  required: boolean
  hint?: string
}

type FieldMappings = Partial<Record<ImportField, { columns: string[]; separator: string }>>

interface DraftItem extends Omit<ItemImportacion, 'id'> {
  _index: number
}

interface DatosForm {
  origen: string
  proveedor: string
  fecha_estimada_llegada: string
  tipo_cambio: string
  flete_usd: string
  aduana_bs: string
  transporte_interno_bs: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MARGEN_DEFECTO = 1.30

const SYSTEM_FIELDS: SystemField[] = [
  { key: 'codigo_proveedor', label: 'Código del proveedor', required: true,  hint: 'Código principal de identificación' },
  { key: 'codigo_alt1',      label: 'Código adicional 1',   required: false },
  { key: 'codigo_alt2',      label: 'Código adicional 2',   required: false },
  { key: 'nombre',           label: 'Nombre del producto',  required: false },
  { key: 'precio_fob_usd',   label: 'Precio FOB (USD)',     required: true,  hint: 'Precio unitario en dólares' },
  { key: 'cantidad',         label: 'Cantidad',             required: true  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNumeric(raw: unknown): number {
  if (typeof raw === 'number') return isFinite(raw) ? raw : 0
  if (typeof raw !== 'string' || !raw.trim()) return 0
  const cleaned = raw.trim().replace(/[^0-9.,-]/g, '')
  const normalized = cleaned.includes(',') && !cleaned.includes('.')
    ? cleaned.replace(',', '.')
    : cleaned.replace(/,/g, '')
  const n = parseFloat(normalized)
  return isFinite(n) ? n : 0
}

function resolveValue(row: Record<string, unknown>, mapping: { columns: string[]; separator: string }): string {
  return mapping.columns
    .map((col) => String(row[col] ?? '').trim())
    .filter(Boolean)
    .join(mapping.separator || ' ')
}

function calcItems(
  rawItems: { codigo_proveedor: string; codigos_adicionales: string[]; nombre: string; precio_fob_usd: number; cantidad: number }[],
  datos: { tipo_cambio: number; flete_usd: number; aduana_bs: number; transporte_interno_bs: number },
  productos: Producto[],
): DraftItem[] {
  const fob_lote = rawItems.reduce((s, i) => s + i.precio_fob_usd * i.cantidad, 0)
  const costos_total_bs =
    datos.flete_usd * datos.tipo_cambio + datos.aduana_bs + datos.transporte_interno_bs

  return rawItems.map((raw, idx) => {
    const valor_item = raw.precio_fob_usd * raw.cantidad
    const proporcion = fob_lote > 0 ? valor_item / fob_lote : 0

    const costo_unitario_fob_bs = raw.precio_fob_usd * datos.tipo_cambio
    const costo_unitario_adicional_bs =
      raw.cantidad > 0 ? (proporcion * costos_total_bs) / raw.cantidad : 0
    const costo_unitario_total_bs = costo_unitario_fob_bs + costo_unitario_adicional_bs
    const precio_venta_sugerido = Math.ceil(costo_unitario_total_bs * MARGEN_DEFECTO * 100) / 100

    // Buscar si ya existe en inventario
    const allCodes = [raw.codigo_proveedor, ...raw.codigos_adicionales].map((c) => c.toLowerCase())
    const match = productos.find(
      (p) =>
        allCodes.includes(p.codigo_universal.toLowerCase()) ||
        p.codigos_alternativos.some((c) => allCodes.includes(c.toLowerCase())),
    )

    return {
      _index: idx,
      codigo_proveedor: raw.codigo_proveedor,
      codigos_adicionales: raw.codigos_adicionales,
      nombre: raw.nombre,
      precio_fob_usd: raw.precio_fob_usd,
      cantidad: raw.cantidad,
      costo_unitario_fob_bs,
      costo_unitario_adicional_bs,
      costo_unitario_total_bs,
      precio_venta_sugerido,
      precio_venta_final: precio_venta_sugerido,
      producto_id: match?.id,
      es_nuevo: !match,
    }
  })
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function nextNumero(existingCount: number): string {
  const year = new Date().getFullYear()
  const n = String(existingCount + 1).padStart(3, '0')
  return `IMP-${year}-${n}`
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  onSave: (importacion: Omit<Importacion, 'id' | 'creado_en' | 'actualizado_en'>) => void
  origenes: OrigenConfig[]
  productos: Producto[]
  totalImportaciones: number
}

export function NuevaImportacionModal({
  open, onClose, onSave, origenes, productos, totalImportaciones,
}: Props) {
  // ── Estado ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<ImportStep>('datos')

  const [datos, setDatos] = useState<DatosForm>({
    origen: '',
    proveedor: '',
    fecha_estimada_llegada: '',
    tipo_cambio: '6.96',
    flete_usd: '',
    aduana_bs: '',
    transporte_interno_bs: '',
  })

  // Excel
  const [columns, setColumns]         = useState<string[]>([])
  const [rows, setRows]               = useState<Record<string, unknown>[]>([])
  const [mappings, setMappings]       = useState<FieldMappings>({})
  const [dragging, setDragging]       = useState(false)
  const [fileName, setFileName]       = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>

  // Preview
  const [items, setItems] = useState<DraftItem[]>([])

  // Guardando
  const [saving, setSaving] = useState(false)

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStep('datos')
    setDatos({ origen: '', proveedor: '', fecha_estimada_llegada: '', tipo_cambio: '6.96', flete_usd: '', aduana_bs: '', transporte_interno_bs: '' })
    setColumns([])
    setRows([])
    setMappings({})
    setFileName('')
    setItems([])
    setSaving(false)
  }, [])

  const handleClose = () => { reset(); onClose() }

  // ── Step: datos ──────────────────────────────────────────────────────────
  const handleOrigenChange = (nombre: string) => {
    const cfg = origenes.find((o) => o.nombre === nombre)
    setDatos((d) => ({
      ...d,
      origen: nombre,
      fecha_estimada_llegada: cfg ? addDays(cfg.tiempo_estimado_dias) : d.fecha_estimada_llegada,
    }))
  }

  const validarDatos = (): boolean => {
    if (!datos.origen.trim())                   { toast.error('Selecciona un origen'); return false }
    if (!datos.proveedor.trim())                { toast.error('Ingresa el proveedor'); return false }
    if (!datos.fecha_estimada_llegada)          { toast.error('Ingresa la fecha estimada'); return false }
    if (!parseNumeric(datos.tipo_cambio))       { toast.error('Ingresa el tipo de cambio'); return false }
    return true
  }

  // ── Step: excel ──────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Formato no soportado. Usa .xlsx, .xls o .csv')
      return
    }
    try {
      const XLSX: typeof XLSXType = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      if (!data.length) { toast.error('El archivo está vacío'); return }
      setColumns(Object.keys(data[0]))
      setRows(data)
      setFileName(file.name)
      setMappings({})
    } catch {
      toast.error('Error al leer el archivo')
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }, [handleFile])

  const addColumn = (field: string, col: string) => {
    setMappings((prev) => {
      const existing = prev[field as ImportField] ?? { columns: [], separator: '-' }
      if (existing.columns.includes(col)) return prev
      return { ...prev, [field as ImportField]: { ...existing, columns: [...existing.columns, col] } }
    })
  }

  const removeColumn = (field: string, col: string) => {
    setMappings((prev) => {
      const existing = prev[field as ImportField]
      if (!existing) return prev
      const columns = existing.columns.filter((c) => c !== col)
      if (columns.length === 0) {
        const next = { ...prev }
        delete next[field as ImportField]
        return next
      }
      return { ...prev, [field as ImportField]: { ...existing, columns } }
    })
  }

  const setSeparator = (field: string, sep: string) => {
    setMappings((prev) => {
      const existing = prev[field as ImportField]
      if (!existing) return prev
      return { ...prev, [field as ImportField]: { ...existing, separator: sep } }
    })
  }

  const validarMapeo = (): boolean => {
    for (const f of SYSTEM_FIELDS.filter((f) => f.required)) {
      if (!mappings[f.key]?.columns.length) {
        toast.error(`Mapea el campo "${f.label}"`)
        return false
      }
    }
    return true
  }

  const buildItems = () => {
    const raw = rows.map((row) => {
      const get = (key: ImportField) => {
        const m = mappings[key]
        return m ? resolveValue(row, m) : ''
      }
      const getRaw = (key: ImportField): unknown => {
        const m = mappings[key]
        return m?.columns.length ? row[m.columns[0]] ?? '' : ''
      }
      return {
        codigo_proveedor: get('codigo_proveedor'),
        codigos_adicionales: [get('codigo_alt1'), get('codigo_alt2')].filter(Boolean),
        nombre: get('nombre') || get('codigo_proveedor'),
        precio_fob_usd: parseNumeric(getRaw('precio_fob_usd')),
        cantidad: parseNumeric(getRaw('cantidad')),
      }
    }).filter((r) => r.codigo_proveedor && r.precio_fob_usd > 0 && r.cantidad > 0)

    if (!raw.length) { toast.error('No se encontraron filas válidas'); return }

    const d = {
      tipo_cambio: parseNumeric(datos.tipo_cambio),
      flete_usd: parseNumeric(datos.flete_usd),
      aduana_bs: parseNumeric(datos.aduana_bs),
      transporte_interno_bs: parseNumeric(datos.transporte_interno_bs),
    }
    setItems(calcItems(raw, d, productos))
    setStep('preview')
  }

  // ── Step: preview ────────────────────────────────────────────────────────
  const updatePrecioFinal = (index: number, val: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it._index === index ? { ...it, precio_venta_final: parseNumeric(val) || it.precio_venta_final } : it,
      ),
    )
  }

  // ── Step: confirmar ──────────────────────────────────────────────────────
  const handleConfirmar = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400))

    const d = {
      tipo_cambio: parseNumeric(datos.tipo_cambio),
      flete_usd: parseNumeric(datos.flete_usd),
      aduana_bs: parseNumeric(datos.aduana_bs),
      transporte_interno_bs: parseNumeric(datos.transporte_interno_bs),
    }
    const fob_total_usd = items.reduce((s, i) => s + i.precio_fob_usd * i.cantidad, 0)

    const importacion: Omit<Importacion, 'id' | 'creado_en' | 'actualizado_en'> = {
      numero: nextNumero(totalImportaciones),
      origen: datos.origen,
      proveedor: datos.proveedor,
      fecha_creacion: new Date().toISOString(),
      fecha_estimada_llegada: new Date(datos.fecha_estimada_llegada).toISOString(),
      estado: 'en_transito',
      fob_total_usd,
      ...d,
      items: items.map((it, i) => ({ ...it, id: `item-${crypto.randomUUID()}-${i}` })),
    }

    onSave(importacion)
    setSaving(false)
    reset()
    onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const nuevos    = items.filter((i) => i.es_nuevo).length
  const existentes = items.filter((i) => !i.es_nuevo).length
  const fobTotal  = items.reduce((s, i) => s + i.precio_fob_usd * i.cantidad, 0)
  const tc        = parseNumeric(datos.tipo_cambio)

  const STEP_LABELS: Record<ImportStep, string> = {
    datos: '1. Datos generales',
    excel: '2. Cargar Excel',
    preview: '3. Revisar precios',
    confirmar: '4. Confirmar',
  }

  const modalTitle = `Nueva Importación — ${STEP_LABELS[step]}`
  const modalSize = step === 'preview' ? '2xl' : 'xl'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={modalTitle}
      size={modalSize}
      footer={
        <ModalFooter
          step={step}
          saving={saving}
          hasRows={rows.length > 0}
          hasItems={items.length > 0}
          onBack={() => {
            if (step === 'excel')    setStep('datos')
            if (step === 'preview') setStep('excel')
            if (step === 'confirmar') setStep('preview')
          }}
          onNext={() => {
            if (step === 'datos') { if (validarDatos()) setStep('excel') }
            if (step === 'excel') { if (validarMapeo()) buildItems() }
            if (step === 'preview') setStep('confirmar')
            if (step === 'confirmar') void handleConfirmar()
          }}
        />
      }
    >
      {step === 'datos' && (
        <StepDatos datos={datos} setDatos={setDatos} origenes={origenes} onOrigenChange={handleOrigenChange} />
      )}
      {step === 'excel' && (
        <StepExcel
          columns={columns}
          rows={rows}
          mappings={mappings}
          dragging={dragging}
          fileName={fileName}
          fileInputRef={fileInputRef}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onFileChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
          onAddColumn={addColumn}
          onRemoveColumn={removeColumn}
          onSetSeparator={setSeparator}
        />
      )}
      {step === 'preview' && (
        <StepPreview items={items} tc={tc} onPrecioChange={updatePrecioFinal} />
      )}
      {step === 'confirmar' && (
        <StepConfirmar
          nuevos={nuevos}
          existentes={existentes}
          fobTotal={fobTotal}
          tc={tc}
          flete={parseNumeric(datos.flete_usd)}
          aduana={parseNumeric(datos.aduana_bs)}
          transporte={parseNumeric(datos.transporte_interno_bs)}
          origen={datos.origen}
          proveedor={datos.proveedor}
          fechaLlegada={datos.fecha_estimada_llegada}
        />
      )}
    </Modal>
  )
}

// ─── Sub-componentes de pasos ────────────────────────────────────────────────

function StepDatos({
  datos, setDatos, origenes, onOrigenChange,
}: {
  datos: DatosForm
  setDatos: React.Dispatch<React.SetStateAction<DatosForm>>
  origenes: OrigenConfig[]
  onOrigenChange: (nombre: string) => void
}) {
  const set = (k: keyof DatosForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDatos((d) => ({ ...d, [k]: e.target.value }))

  return (
    <div className="space-y-5">
      {/* Origen y proveedor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Origen / País"
          value={datos.origen}
          onChange={(e) => onOrigenChange(e.target.value)}
          options={origenes.map((o) => ({ value: o.nombre, label: `${o.nombre} (${o.tiempo_estimado_dias}d)` }))}
          placeholder="Seleccionar origen…"
        />
        <Input
          label="Proveedor"
          value={datos.proveedor}
          onChange={set('proveedor')}
          placeholder="Nombre del proveedor"
        />
      </div>

      {/* Fecha y tipo de cambio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Fecha estimada de llegada"
          type="date"
          value={datos.fecha_estimada_llegada}
          onChange={set('fecha_estimada_llegada')}
        />
        <Input
          label="Tipo de cambio (Bs/USD)"
          type="number"
          step="0.01"
          min="0"
          value={datos.tipo_cambio}
          onChange={set('tipo_cambio')}
          hint="Fijo para toda esta importación"
        />
      </div>

      {/* Costos adicionales */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-steel-400 mb-3">
          Costos adicionales del lote
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Flete internacional (USD)"
            type="number"
            step="0.01"
            min="0"
            value={datos.flete_usd}
            onChange={set('flete_usd')}
          />
          <Input
            label="Aduana / aranceles (Bs)"
            type="number"
            step="0.01"
            min="0"
            value={datos.aduana_bs}
            onChange={set('aduana_bs')}
          />
          <Input
            label="Transporte interno (Bs)"
            type="number"
            step="0.01"
            min="0"
            value={datos.transporte_interno_bs}
            onChange={set('transporte_interno_bs')}
          />
        </div>
        <p className="text-[11px] text-steel-400 mt-2">
          Estos costos se distribuirán proporcionalmente entre todos los productos según su valor FOB.
        </p>
      </div>
    </div>
  )
}

function StepExcel({
  columns, rows, mappings, dragging, fileName, fileInputRef,
  onDrop, onDragOver, onDragLeave, onFileChange, onAddColumn, onRemoveColumn, onSetSeparator,
}: {
  columns: string[]
  rows: Record<string, unknown>[]
  mappings: FieldMappings
  dragging: boolean
  fileName: string
  fileInputRef: React.RefObject<HTMLInputElement>
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onAddColumn: (field: string, col: string) => void
  onRemoveColumn: (field: string, col: string) => void
  onSetSeparator: (field: string, sep: string) => void
}) {
  if (!columns.length) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl p-6 sm:p-12 cursor-pointer transition-colors',
          dragging ? 'border-brand-400 bg-brand-50' : 'border-steel-200 bg-steel-50 hover:border-brand-300 hover:bg-brand-50/50',
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-steel-800">Arrastra tu archivo aquí o haz clic para seleccionar</p>
          <p className="text-xs text-steel-400 mt-1">Formatos soportados: .xlsx, .xls, .csv</p>
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
      </div>
    )
  }

  return (
    <ExcelColumnMapper
      fields={SYSTEM_FIELDS}
      excelCols={columns}
      mappings={mappings as Record<string, { columns: string[]; separator: string }>}
      fileName={fileName}
      rowCount={rows.length}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
      onSetSeparator={onSetSeparator}
    />
  )
}

function StepPreview({
  items, tc, onPrecioChange,
}: {
  items: DraftItem[]
  tc: number
  onPrecioChange: (index: number, val: string) => void
}) {
  const fobTotal = items.reduce((s, i) => s + i.precio_fob_usd * i.cantidad, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap text-[12px] text-steel-500">
        <span><strong className="text-steel-700">{items.length}</strong> productos</span>
        <span>·</span>
        <span>FOB total: <strong className="text-steel-700">${fobTotal.toFixed(2)}</strong></span>
        <span>·</span>
        <span>TC: <strong className="text-steel-700">Bs {tc}</strong></span>
        <span className="ml-auto text-[11px] text-steel-400">Edita el precio final antes de confirmar</span>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #E8EDF3' }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E8EDF3' }}>
              <th className="px-3 py-2.5 text-left font-semibold text-steel-400 uppercase tracking-wider text-[10px]">Código</th>
              <th className="px-3 py-2.5 text-left font-semibold text-steel-400 uppercase tracking-wider text-[10px]">Nombre</th>
              <th className="px-3 py-2.5 text-right font-semibold text-steel-400 uppercase tracking-wider text-[10px]">Cant.</th>
              <th className="px-3 py-2.5 text-right font-semibold text-steel-400 uppercase tracking-wider text-[10px]">FOB Unit. $</th>
              <th className="px-3 py-2.5 text-right font-semibold text-steel-400 uppercase tracking-wider text-[10px]">Costo Unit. Bs</th>
              <th className="px-3 py-2.5 text-right font-semibold text-steel-400 uppercase tracking-wider text-[10px]">Precio Venta Bs</th>
              <th className="px-3 py-2.5 text-center font-semibold text-steel-400 uppercase tracking-wider text-[10px]">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, rowIdx) => (
              <tr
                key={item._index}
                style={{ borderBottom: rowIdx < items.length - 1 ? '1px solid #F0F0F5' : undefined }}
              >
                <td className="px-3 py-2">
                  <span className="font-mono text-[11px] font-semibold" style={{ color: '#3730A3' }}>
                    {item.codigo_proveedor}
                  </span>
                  {item.codigos_adicionales.length > 0 && (
                    <p className="text-[10px] text-steel-400">{item.codigos_adicionales.join(' · ')}</p>
                  )}
                </td>
                <td className="px-3 py-2 max-w-[160px]">
                  <p className="truncate text-steel-700">{item.nombre}</p>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-steel-700">{item.cantidad}</td>
                <td className="px-3 py-2 text-right tabular-nums text-steel-700">${item.precio_fob_usd.toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span className="text-steel-700">Bs {item.costo_unitario_total_bs.toFixed(2)}</span>
                  <p className="text-[10px] text-steel-400">FOB: {item.costo_unitario_fob_bs.toFixed(2)} + Ad: {item.costo_unitario_adicional_bs.toFixed(2)}</p>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col items-end gap-0.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={item.precio_venta_final.toFixed(2)}
                      onBlur={(e) => onPrecioChange(item._index, e.target.value)}
                      className="w-24 text-right px-2 py-1 rounded-lg border text-[12px] font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                      style={{ borderColor: '#E8EDF3', color: '#111827' }}
                    />
                    {item.precio_venta_final !== item.precio_venta_sugerido && (
                      <p className="text-[10px] text-steel-400">Sug: {item.precio_venta_sugerido.toFixed(2)}</p>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={
                      item.es_nuevo
                        ? { background: '#EEF2FF', color: '#4F46E5' }
                        : { background: '#F0FDF4', color: '#16A34A' }
                    }
                  >
                    {item.es_nuevo ? 'Nuevo' : 'Existente'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StepConfirmar({
  nuevos, existentes, fobTotal, tc, flete, aduana, transporte, origen, proveedor, fechaLlegada,
}: {
  nuevos: number
  existentes: number
  fobTotal: number
  tc: number
  flete: number
  aduana: number
  transporte: number
  origen: string
  proveedor: string
  fechaLlegada: string
}) {
  const fleteBs = flete * tc
  const costoTotalBs = fobTotal * tc + fleteBs + aduana + transporte

  return (
    <div className="space-y-5">
      {/* Resumen de la importación */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: '#F9FAFB', border: '1px solid #E8EDF3' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-steel-400 mb-3">Resumen</p>
        <Row label="Origen" value={origen} />
        <Row label="Proveedor" value={proveedor} />
        <Row label="Llegada estimada" value={fechaLlegada ? new Date(fechaLlegada).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'} />
        <Row label="Tipo de cambio" value={`Bs ${tc}`} />
      </div>

      {/* Costos */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: '#F9FAFB', border: '1px solid #E8EDF3' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-steel-400 mb-3">Costos del lote</p>
        <Row label="FOB total" value={`$${fobTotal.toFixed(2)}  (Bs ${(fobTotal * tc).toFixed(2)})`} />
        <Row label="Flete internacional" value={`$${flete.toFixed(2)}  (Bs ${fleteBs.toFixed(2)})`} />
        <Row label="Aduana / aranceles" value={`Bs ${aduana.toFixed(2)}`} />
        <Row label="Transporte interno" value={`Bs ${transporte.toFixed(2)}`} />
        <div className="pt-2 mt-2" style={{ borderTop: '1px solid #E8EDF3' }}>
          <Row label="Costo total importación" value={`Bs ${costoTotalBs.toFixed(2)}`} bold />
        </div>
      </div>

      {/* Productos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 text-center" style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
          <p className="text-3xl font-bold" style={{ color: '#4F46E5' }}>{nuevos}</p>
          <p className="text-[12px] font-medium mt-1" style={{ color: '#6366F1' }}>Productos nuevos</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#818CF8' }}>Se crearán en el inventario</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <p className="text-3xl font-bold" style={{ color: '#16A34A' }}>{existentes}</p>
          <p className="text-[12px] font-medium mt-1" style={{ color: '#15803D' }}>Productos existentes</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#22C55E' }}>Stock y precio se actualizarán</p>
        </div>
      </div>

      <p className="text-[12px] text-steel-400 text-center">
        Al confirmar, el inventario se actualizará y podrás imprimir etiquetas del lote.
      </p>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12px] text-steel-500">{label}</span>
      <span className={clsx('text-[12px] tabular-nums', bold ? 'font-bold text-steel-800' : 'text-steel-700')}>
        {value}
      </span>
    </div>
  )
}

function ModalFooter({
  step, saving, hasRows, hasItems, onBack, onNext,
}: {
  step: ImportStep
  saving: boolean
  hasRows: boolean
  hasItems: boolean
  onBack: () => void
  onNext: () => void
}) {
  const isFirst = step === 'datos'
  const isLast  = step === 'confirmar'

  const nextLabel: Record<ImportStep, string> = {
    datos: 'Continuar',
    excel: 'Calcular costos',
    preview: 'Revisar resumen',
    confirmar: 'Confirmar importación',
  }

  const nextDisabled =
    (step === 'excel' && !hasRows) ||
    (step === 'preview' && !hasItems)

  return (
    <>
      {!isFirst && (
        <Button variant="secondary" onClick={onBack} disabled={saving}>
          Atrás
        </Button>
      )}
      <Button
        onClick={onNext}
        loading={saving && isLast}
        disabled={nextDisabled}
        variant={isLast ? 'primary' : 'primary'}
      >
        {nextLabel[step]}
      </Button>
    </>
  )
}
