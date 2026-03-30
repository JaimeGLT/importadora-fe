import { useState, useRef, useCallback } from 'react'
import type * as XLSXType from 'xlsx'
import { Modal, Button } from '@/components/ui'
import { imprimirLote } from '@/lib/printLabel'
import type { Producto, CategoriaProducto, UnidadProducto } from '@/types'
import { clsx } from 'clsx'

// ─── Tipos internos ───────────────────────────────────────────────────────────

type ImportableKey =
  | 'codigo_universal' | 'codigo_alt1' | 'codigo_alt2'
  | 'nombre' | 'descripcion' | 'categoria' | 'marca' | 'vehiculo' | 'unidad'
  | 'stock' | 'stock_minimo' | 'precio_costo' | 'precio_venta' | 'ubicacion' | 'estado'

interface SystemField {
  key: ImportableKey
  label: string
  required: boolean
  hint?: string
}

interface ColumnMapping {
  columns: string[]
  separator: string
}

type FieldMappings = Partial<Record<ImportableKey, ColumnMapping>>

type Step = 'upload' | 'mapear' | 'preview' | 'etiquetas'

type ProductoImportado = Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>

interface LabelConfig {
  selected: boolean
  copias: number
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SYSTEM_FIELDS: SystemField[] = [
  { key: 'codigo_universal', label: 'Código universal',       required: true,  hint: 'Código principal del producto' },
  { key: 'codigo_alt1',      label: 'Código alternativo 1',   required: false, hint: 'Código secundario (caja / proveedor)' },
  { key: 'codigo_alt2',      label: 'Código alternativo 2',   required: false },
  { key: 'nombre',           label: 'Nombre',                 required: false },
  { key: 'descripcion',      label: 'Descripción',            required: false },
  { key: 'categoria',        label: 'Categoría',              required: false, hint: 'Motor, Frenos, Suspensión…' },
  { key: 'marca',            label: 'Marca',                  required: false },
  { key: 'vehiculo',         label: 'Vehículo / compatibilidad', required: false },
  { key: 'unidad',           label: 'Unidad',                 required: false, hint: 'pieza, juego, par, kit…' },
  { key: 'stock',            label: 'Stock actual',           required: true  },
  { key: 'stock_minimo',     label: 'Stock mínimo',           required: false },
  { key: 'precio_costo',     label: 'Precio costo (Bs)',      required: true  },
  { key: 'precio_venta',     label: 'Precio venta (Bs)',      required: false },
  { key: 'ubicacion',        label: 'Ubicación en almacén',   required: false },
]

const VALID_CATEGORIAS = new Set<string>([
  'Motor','Transmisión','Suspensión','Frenos','Eléctrico','Carrocería','Enfriamiento','Escape','Otro',
])
const VALID_UNIDADES = new Set<string>(['pieza','juego','par','kit','litro','metro','otro'])

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Acepta números JS directos (de XLSX) o strings con cualquier formato de moneda
function parseNumeric(raw: unknown): number {
  if (typeof raw === 'number') return isFinite(raw) ? raw : 0
  if (typeof raw !== 'string' || !raw.trim()) return 0
  // Elimina símbolos de moneda y espacios, manteniendo dígitos, coma y punto
  const cleaned = raw.trim().replace(/[^0-9.,-]/g, '')
  // Si hay coma como separador decimal (ej. "3,74") la convertimos a punto
  const normalized = cleaned.includes(',') && !cleaned.includes('.')
    ? cleaned.replace(',', '.')
    : cleaned.replace(/,/g, '') // coma como separador de miles
  const n = parseFloat(normalized)
  return isFinite(n) ? n : 0
}

function resolveValue(row: Record<string, unknown>, mapping: ColumnMapping): string {
  return mapping.columns
    .map((col) => String(row[col] ?? '').trim())
    .filter(Boolean)
    .join(mapping.separator || ' ')
}

function parseRow(
  row: Record<string, unknown>,
  mappings: FieldMappings,
): Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'> | null {
  const get = (key: ImportableKey) => {
    const m = mappings[key]
    return m ? resolveValue(row, m) : ''
  }

  // Para campos numéricos, leer el valor raw de la primera columna mapeada
  // para preservar el tipo number que entrega XLSX (evita pérdida de precisión)
  const getRaw = (key: ImportableKey): unknown => {
    const m = mappings[key]
    if (!m || m.columns.length === 0) return ''
    return row[m.columns[0]] ?? ''
  }

  const codigo_universal = get('codigo_universal')
  const nombre = get('nombre')
  if (!codigo_universal) return null

  const rawCat = get('categoria')
  const categoria = (VALID_CATEGORIAS.has(rawCat) ? rawCat : 'Otro') as CategoriaProducto

  const rawUnidad = get('unidad').toLowerCase()
  const unidad = (VALID_UNIDADES.has(rawUnidad) ? rawUnidad : 'pieza') as UnidadProducto

  const rawEstado = get('estado')
  const estado: Producto['estado'] =
    rawEstado === 'sin_stock' || rawEstado === 'descontinuado' ? rawEstado : 'activo'

  const precio_costo = parseNumeric(getRaw('precio_costo'))
  const precio_venta = parseNumeric(getRaw('precio_venta'))

  return {
    codigo_universal,
    codigos_alternativos: [get('codigo_alt1'), get('codigo_alt2')],
    nombre,
    descripcion:  get('descripcion'),
    categoria,
    marca:        get('marca') || '',
    vehiculo:     get('vehiculo') || '',
    unidad,
    stock:        Math.round(parseNumeric(getRaw('stock'))),
    stock_minimo: Math.round(parseNumeric(getRaw('stock_minimo'))) || 5,
    precio_costo,
    precio_venta,
    historial_precios: precio_costo > 0 || precio_venta > 0
      ? [{ fecha: new Date().toISOString(), precio_costo, precio_venta, tipo_cambio: 6.96, nota: 'Importado desde Excel' }]
      : [],
    ubicacion:    get('ubicacion') || 'Almacén Central',
    estado,
    proveedor_id: '',
  }
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'upload',    label: 'Subir archivo' },
    { id: 'mapear',    label: 'Mapear columnas' },
    { id: 'preview',   label: 'Vista previa' },
    { id: 'etiquetas', label: 'Etiquetas' },
  ]
  const idx = steps.findIndex((s) => s.id === step)

  return (
    <div className="flex items-center gap-0 mb-5">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className="flex items-center gap-1.5">
            <div className={clsx(
              'h-6 w-6 rounded-full text-xs font-semibold flex items-center justify-center shrink-0',
              i < idx   ? 'bg-brand-600 text-white' :
              i === idx ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
                          'bg-steel-200 text-steel-500',
            )}>
              {i < idx ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={clsx(
              'hidden sm:inline text-sm',
              i === idx ? 'font-medium text-steel-900' : 'text-steel-400',
            )}>{s.label}</span>
            {/* Mobile: show label only for active step */}
            {i === idx && (
              <span className="sm:hidden text-sm font-medium text-steel-900">{s.label}</span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div className={clsx('h-px w-4 sm:w-8 mx-1.5 sm:mx-2', i < idx ? 'bg-brand-400' : 'bg-steel-200')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface ImportarExcelModalProps {
  open: boolean
  onClose: () => void
  onImport: (productos: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>[]) => void
}

export function ImportarExcelModal({ open, onClose, onImport }: ImportarExcelModalProps) {
  const [step, setStep]               = useState<Step>('upload')
  const [excelCols, setExcelCols]     = useState<string[]>([])
  const [rawRows, setRawRows]         = useState<Record<string, unknown>[]>([])
  const [fileName, setFileName]       = useState('')
  const [mappings, setMappings]       = useState<FieldMappings>({})
  const [parsed, setParsed]           = useState<(ProductoImportado | null)[]>([])
  const [dragOver, setDragOver]       = useState(false)
  const [importing, setImporting]     = useState(false)
  const [importados, setImportados]   = useState<ProductoImportado[]>([])
  const [labelConfig, setLabelConfig] = useState<Record<string, LabelConfig>>({})
  const [printing, setPrinting]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('upload'); setExcelCols([]); setRawRows([])
    setFileName(''); setMappings({}); setParsed([])
    setImportados([]); setLabelConfig({})
  }

  const handleClose = () => { reset(); onClose() }

  // ── Step 1: leer archivo ────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const XLSX: typeof XLSXType = await import('xlsx')
      const data = e.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      if (rows.length === 0) return
      setRawRows(rows)
      setExcelCols(Object.keys(rows[0]))
      setStep('mapear')
    }
    reader.readAsBinaryString(file)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  // ── Step 2: mapeos ──────────────────────────────────────────────────────────
  const addColumn = (fieldKey: ImportableKey, col: string) => {
    setMappings((prev) => {
      const existing = prev[fieldKey] ?? { columns: [], separator: '-' }
      if (existing.columns.includes(col)) return prev
      return { ...prev, [fieldKey]: { ...existing, columns: [...existing.columns, col] } }
    })
  }

  const removeColumn = (fieldKey: ImportableKey, col: string) => {
    setMappings((prev) => {
      const existing = prev[fieldKey]
      if (!existing) return prev
      const columns = existing.columns.filter((c) => c !== col)
      if (columns.length === 0) { const next = { ...prev }; delete next[fieldKey]; return next }
      return { ...prev, [fieldKey]: { ...existing, columns } }
    })
  }

  const setSeparator = (fieldKey: ImportableKey, sep: string) => {
    setMappings((prev) => {
      const existing = prev[fieldKey]
      if (!existing) return prev
      return { ...prev, [fieldKey]: { ...existing, separator: sep } }
    })
  }

  const handleGoToPreview = () => {
    setParsed(rawRows.map((row) => parseRow(row, mappings)))
    setStep('preview')
  }

  const requiredMapped = SYSTEM_FIELDS
    .filter((f) => f.required)
    .every((f) => (mappings[f.key]?.columns.length ?? 0) > 0)

  // ── Step 3: importar ────────────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true)
    await new Promise((r) => setTimeout(r, 300))
    const valid = parsed.filter((p): p is ProductoImportado => p !== null)
    onImport(valid)
    // Preparar config de etiquetas: todos seleccionados, copias = stock
    const config: Record<string, LabelConfig> = {}
    valid.forEach((p) => {
      config[p.codigo_universal] = { selected: true, copias: Math.max(1, p.stock) }
    })
    setImportados(valid)
    setLabelConfig(config)
    setImporting(false)
    setStep('etiquetas')
  }

  // ── Step 4: imprimir etiquetas ───────────────────────────────────────────────
  const todosSeleccionados = importados.every((p) => labelConfig[p.codigo_universal]?.selected)
  const algunoSeleccionado = importados.some((p) => labelConfig[p.codigo_universal]?.selected)

  const toggleTodos = () => {
    const nuevoEstado = !todosSeleccionados
    setLabelConfig((prev) => {
      const next = { ...prev }
      importados.forEach((p) => { next[p.codigo_universal] = { ...next[p.codigo_universal], selected: nuevoEstado } })
      return next
    })
  }

  const toggleProducto = (codigo: string) => {
    setLabelConfig((prev) => ({
      ...prev,
      [codigo]: { ...prev[codigo], selected: !prev[codigo].selected },
    }))
  }

  const setCopias = (codigo: string, copias: number) => {
    setLabelConfig((prev) => ({
      ...prev,
      [codigo]: { ...prev[codigo], copias: Math.max(1, Math.min(999, copias)) },
    }))
  }

  const handlePrintEtiquetas = async () => {
    setPrinting(true)
    const items = importados
      .filter((p) => labelConfig[p.codigo_universal]?.selected)
      .map((p) => ({
        producto: p,
        copias: labelConfig[p.codigo_universal]?.copias ?? 1,
      }))
    await imprimirLote(items)
    setPrinting(false)
  }

  const totalEtiquetas = importados
    .filter((p) => labelConfig[p.codigo_universal]?.selected)
    .reduce((sum, p) => sum + (labelConfig[p.codigo_universal]?.copias ?? 1), 0)

  const validCount   = parsed.filter(Boolean).length
  const invalidCount = parsed.length - validCount

  // ─── Render ────────────────────────────────────────────────────────────────
  const footer = (
    <>
      {step !== 'upload' && step !== 'etiquetas' && (
        <Button variant="ghost" onClick={() => setStep(step === 'preview' ? 'mapear' : 'upload')} disabled={importing}>
          Atrás
        </Button>
      )}
      {step !== 'etiquetas' && (
        <Button variant="secondary" onClick={handleClose} disabled={importing}>Cancelar</Button>
      )}
      {step === 'mapear' && (
        <Button onClick={handleGoToPreview} disabled={!requiredMapped}>Ver vista previa</Button>
      )}
      {step === 'preview' && (
        <Button onClick={() => void handleImport()} loading={importing} disabled={validCount === 0}>
          Importar {validCount} producto{validCount !== 1 ? 's' : ''}
        </Button>
      )}
      {step === 'etiquetas' && (
        <>
          <Button variant="secondary" onClick={handleClose} className="text-xs sm:text-sm">
            <span className="hidden xs:inline">Omitir e ir al </span>inventario
          </Button>
          <Button
            onClick={() => void handlePrintEtiquetas()}
            loading={printing}
            disabled={!algunoSeleccionado}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            }
          >
            Imprimir {totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? 's' : ''}
          </Button>
        </>
      )}
    </>
  )

  return (
    <Modal open={open} onClose={handleClose} title="Importar productos desde Excel" size="xl" footer={footer}>
      <Stepper step={step} />

      {/* ── STEP 1: UPLOAD ── */}
      {step === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            'flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl p-6 sm:p-12 cursor-pointer transition-colors',
            dragOver ? 'border-brand-400 bg-brand-50' : 'border-steel-200 bg-steel-50 hover:border-brand-300 hover:bg-brand-50/50',
          )}
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
          <input
            ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]) }}
          />
        </div>
      )}

      {/* ── STEP 2: MAPEAR ── */}
      {step === 'mapear' && (
        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
            <p className="text-xs text-steel-500">
              <span className="font-medium text-steel-700">{fileName}</span>
              {' · '}{rawRows.length} filas · {excelCols.length} columnas detectadas
            </p>
            <p className="text-xs text-steel-400">Campos con <span className="text-red-500">*</span> son obligatorios</p>
          </div>

          <div className="flex flex-wrap gap-1.5 p-3 bg-steel-50 rounded-lg mb-4">
            {excelCols.map((col) => (
              <span key={col} className="px-2 py-0.5 bg-white border border-steel-200 rounded text-xs text-steel-600 font-mono">{col}</span>
            ))}
          </div>

          <div className="space-y-2">
            {SYSTEM_FIELDS.map((field) => {
              const mapping = mappings[field.key]
              const availableCols = excelCols.filter((c) => !mapping?.columns.includes(c))

              return (
                <div key={field.key} className={clsx(
                  'grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 sm:gap-3 items-start p-3 rounded-lg border',
                  mapping?.columns.length ? 'border-brand-200 bg-brand-50/40' : 'border-steel-100 bg-white',
                )}>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-steel-800">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </p>
                    {field.hint && <p className="text-xs text-steel-400 mt-0.5">{field.hint}</p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    {(mapping?.columns.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {mapping!.columns.map((col, i) => (
                          <span key={col} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full text-xs font-mono">
                            {i > 0 && <span className="text-brand-400 font-sans font-normal">{mapping!.separator || '–'}</span>}
                            {col}
                            <button onClick={() => removeColumn(field.key, col)} className="ml-0.5 text-brand-400 hover:text-brand-700">×</button>
                          </span>
                        ))}
                        {mapping!.columns.length >= 2 && (
                          <input
                            value={mapping!.separator}
                            onChange={(e) => setSeparator(field.key, e.target.value)}
                            placeholder="sep"
                            className="w-12 h-6 px-1.5 text-xs border border-steel-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-brand-400"
                            title="Separador entre columnas"
                          />
                        )}
                      </div>
                    )}
                    {availableCols.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) addColumn(field.key, e.target.value) }}
                        className="h-7 w-full sm:max-w-xs rounded border border-steel-200 bg-white px-2 text-xs text-steel-600 focus:outline-none focus:ring-1 focus:ring-brand-400"
                      >
                        <option value="">
                          {(mapping?.columns.length ?? 0) > 0 ? '+ Combinar con otra columna…' : 'Seleccionar columna del Excel…'}
                        </option>
                        {availableCols.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── STEP 4: ETIQUETAS ── */}
      {step === 'etiquetas' && (
        <div>
          <div className="mb-3">
            <p className="text-sm text-steel-600">Selecciona los productos y ajusta la cantidad de etiquetas.</p>
            <p className="text-xs text-steel-400 mt-0.5">Las cantidades se pre-llenaron con el stock importado.</p>
          </div>

          {/* Cabecera con "seleccionar todo" */}
          <div className="flex items-center gap-3 px-3 py-2 bg-steel-50 rounded-t-lg border border-b-0 border-steel-200">
            <input
              type="checkbox"
              checked={todosSeleccionados}
              onChange={toggleTodos}
              className="h-4 w-4 rounded border-steel-300 text-brand-600 cursor-pointer shrink-0"
            />
            <span className="text-xs font-medium text-steel-500 flex-1 min-w-0 truncate">
              {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </span>
            <span className="text-xs text-steel-400 shrink-0">Cant.</span>
          </div>

          {/* Lista de productos */}
          <div className="border border-steel-200 rounded-b-lg divide-y divide-steel-100 max-h-72 overflow-y-auto">
            {importados.map((p) => {
              const cfg = labelConfig[p.codigo_universal] ?? { selected: false, copias: 1 }
              return (
                <div
                  key={p.codigo_universal}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 transition-colors',
                    cfg.selected ? 'bg-brand-50/30' : 'bg-white',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={cfg.selected}
                    onChange={() => toggleProducto(p.codigo_universal)}
                    className="h-4 w-4 rounded border-steel-300 text-brand-600 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-steel-900 truncate">{p.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                        {p.codigo_universal}
                      </span>
                      <span className="text-xs text-steel-400">{p.marca}</span>
                      <span className="text-xs text-steel-400">· Stock: {p.stock}</span>
                    </div>
                  </div>

                  {/* Selector de copias */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setCopias(p.codigo_universal, cfg.copias - 1)}
                      disabled={!cfg.selected}
                      className="h-7 w-7 rounded border border-steel-200 flex items-center justify-center text-steel-500 hover:bg-steel-50 disabled:opacity-30 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={cfg.copias}
                      onChange={(e) => setCopias(p.codigo_universal, Number(e.target.value))}
                      disabled={!cfg.selected}
                      className="w-14 h-7 text-center text-sm font-medium border border-steel-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-30 disabled:bg-steel-50"
                    />
                    <button
                      onClick={() => setCopias(p.codigo_universal, cfg.copias + 1)}
                      disabled={!cfg.selected}
                      className="h-7 w-7 rounded border border-steel-200 flex items-center justify-center text-steel-500 hover:bg-steel-50 disabled:opacity-30 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {algunoSeleccionado && (
            <p className="mt-3 text-xs text-steel-400 text-center">
              {importados.filter((p) => labelConfig[p.codigo_universal]?.selected).length} producto{importados.filter((p) => labelConfig[p.codigo_universal]?.selected).length !== 1 ? 's' : ''} seleccionado{importados.filter((p) => labelConfig[p.codigo_universal]?.selected).length !== 1 ? 's' : ''} · {totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? 's' : ''} en total
            </p>
          )}
        </div>
      )}

      {/* ── STEP 3: PREVIEW ── */}
      {step === 'preview' && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-green-800"><strong>{validCount}</strong> válidos</span>
            </div>
            {invalidCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm text-red-700"><strong>{invalidCount}</strong> omitidos (sin código o nombre)</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-steel-200 max-h-80 overflow-y-auto">
            <table className="text-xs" style={{ minWidth: 900 }}>
              <thead className="sticky top-0 bg-steel-50 border-b border-steel-200">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-steel-500 w-6">#</th>
                  <th className="px-3 py-2 text-left font-medium text-steel-500 whitespace-nowrap">Código *</th>
                  <th className="px-3 py-2 text-left font-medium text-steel-500">Nombre</th>
                  <th className="px-3 py-2 text-left font-medium text-steel-500">Marca</th>
                  <th className="px-3 py-2 text-left font-medium text-steel-500">Vehículo</th>
                  <th className="px-3 py-2 text-left font-medium text-steel-500">Categoría</th>
                  <th className="px-3 py-2 text-left font-medium text-steel-500">Unidad</th>
                  <th className="px-3 py-2 text-right font-medium text-steel-500 whitespace-nowrap">Stock *</th>
                  <th className="px-3 py-2 text-right font-medium text-steel-500 whitespace-nowrap">Stk. mín.</th>
                  <th className="px-3 py-2 text-right font-medium text-steel-500 whitespace-nowrap">P. Costo *</th>
                  <th className="px-3 py-2 text-right font-medium text-steel-500 whitespace-nowrap">P. Venta</th>
                  <th className="px-3 py-2 text-left font-medium text-steel-500">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {parsed.map((row, i) =>
                  row === null ? (
                    <tr key={i} className="bg-red-50/50">
                      <td className="px-3 py-2 text-steel-400">{i + 1}</td>
                      <td colSpan={11} className="px-3 py-2 text-red-400 italic">
                        Fila omitida — sin código universal
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className="hover:bg-steel-50">
                      <td className="px-3 py-2 text-steel-400">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-brand-600 whitespace-nowrap">{row.codigo_universal}</td>
                      <td className="px-3 py-2 text-steel-900 max-w-[140px] truncate">{row.nombre || '—'}</td>
                      <td className="px-3 py-2 text-steel-600 whitespace-nowrap">{row.marca || '—'}</td>
                      <td className="px-3 py-2 text-steel-500 max-w-[120px] truncate">{row.vehiculo || '—'}</td>
                      <td className="px-3 py-2 text-steel-600 whitespace-nowrap">{row.categoria}</td>
                      <td className="px-3 py-2 text-steel-600 capitalize">{row.unidad}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-steel-900">{row.stock}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-steel-500">{row.stock_minimo}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-steel-900">
                        {row.precio_costo > 0 ? row.precio_costo.toFixed(2) : <span className="text-red-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-steel-600">
                        {row.precio_venta > 0 ? row.precio_venta.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2 text-steel-500 whitespace-nowrap">{row.ubicacion || '—'}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
