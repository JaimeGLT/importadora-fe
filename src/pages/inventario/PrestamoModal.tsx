import React, { useEffect, useState, useMemo } from 'react'
import Select, { type SingleValue, type GroupBase } from 'react-select'
import { DrawerWrapper, WarmInput, FormSection } from '@/components/ui'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import {
  CLIENTES_QUERY,
  backendToCliente,
  type ClienteAPI,
  type ClienteFE,
  type PrestamoCreateData,
} from '@/lib/queries/prestamos.queries'
import { clsx } from 'clsx'

// ─── Inline types ─────────────────────────────────────────────────────────────

interface ProductoRaw {
  id: number
  codigo: string
  codigoAux: string
  codigoAux2: string
  nombre: string
  calcularStockKit: number | null
  esKit: boolean
  stock_Actual: number
}

interface ProductoOpt {
  value: string
  label: string
  codigo: string
  nombre: string
  stock: number
  codigosAlt: string[]
}

interface ClienteOpt {
  value: number
  label: string
  cliente: ClienteFE
}

type ItemRow = { codigo: string; cantidad: number; key: number }

const PRODUCTOS_MODAL_QUERY = `
  query ProductosModal {
    productos(first: 50) {
      nodes {
        id
        codigo
        codigoAux
        codigoAux2
        nombre
        calcularStockKit
        esKit
        stock_Actual
      }
    }
  }
`

function mapProductoOpt(raw: ProductoRaw): ProductoOpt {
  return {
    value: raw.codigo,
    label: raw.nombre,
    codigo: raw.codigo,
    nombre: raw.nombre,
    stock: raw.esKit ? (raw.calcularStockKit ?? 0) : raw.stock_Actual,
    codigosAlt: [raw.codigoAux, raw.codigoAux2].filter(Boolean),
  }
}

// ─── React Select styles ──────────────────────────────────────────────────────

const warmSelectStyles = {
  control: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '10px',
    borderColor: state.isFocused ? '#C8501F' : '#E8E1D6',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(200,80,31,0.12)' : 'none',
    backgroundColor: state.isFocused ? '#FFFFFF' : '#FAF8F5',
    '&:hover': { borderColor: '#C8501F' },
    fontSize: '13.5px',
    cursor: 'pointer',
    transition: 'border-color 150ms',
  }),
  option: (base: object, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    padding: '0',
    backgroundColor: state.isSelected ? '#F4EFE6' : state.isFocused ? '#FAF8F5' : '#FFFFFF',
    color: '#241E18',
    cursor: 'pointer',
    '&:active': { backgroundColor: '#F4EFE6' },
  }),
  menu: (base: object) => ({
    ...base,
    borderRadius: '12px',
    boxShadow: '0 10px 30px -8px rgba(36,30,24,0.18), 0 0 0 1px rgba(36,30,24,0.06)',
    border: 'none',
    overflow: 'hidden',
    zIndex: 200,
  }),
  menuPortal: (base: object) => ({ ...base, zIndex: 9999 }),
  placeholder: (base: object) => ({
    ...base,
    color: '#A09080',
    fontSize: '13.5px',
  }),
  singleValue: (base: object) => ({
    ...base,
    color: '#241E18',
    fontSize: '13.5px',
    fontWeight: 500,
  }),
  input: (base: object) => ({
    ...base,
    color: '#241E18',
    fontSize: '13.5px',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: { boxShadow: 'none !important' } as any,
  }),
  noOptionsMessage: (base: object) => ({
    ...base,
    color: '#A09080',
    fontSize: '13px',
    padding: '10px 12px',
  }),
}

// ─── Custom option components ─────────────────────────────────────────────────

function ClienteOptionComp({ innerProps, data }: { innerProps: React.HTMLAttributes<HTMLDivElement>; data: ClienteOpt }) {
  return (
    <div {...innerProps} className="px-3 py-2.5 cursor-pointer">
      <p className="text-[13.5px] font-medium text-ink leading-tight">{data.cliente.nombreCompleto}</p>
      {data.cliente.telefono && (
        <p className="text-[11px] text-muted-2 mt-0.5">{data.cliente.telefono}</p>
      )}
    </div>
  )
}

function ProductoOptionComp({ innerProps, data }: { innerProps: React.HTMLAttributes<HTMLDivElement>; data: ProductoOpt }) {
  return (
    <div {...innerProps} className="px-3 py-2.5 cursor-pointer">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-mono font-bold text-[12px] text-ink tracking-[0.05em]">{data.codigo}</span>
        {data.codigosAlt[0] && (
          <span className="font-mono text-[10px] text-muted-2">{data.codigosAlt[0]}</span>
        )}
        <span className={clsx(
          'ml-auto text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
          data.stock <= 0 ? 'bg-red-100 text-red-700' :
          data.stock <= 3 ? 'bg-amber-100 text-amber-700' :
          'bg-emerald-50 text-emerald-700',
        )}>
          Stock: {data.stock}
        </span>
      </div>
      <p className="text-[11.5px] text-muted-2 truncate">{data.nombre}</p>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IcoUser() {
  return (
    <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}
function IcoBox() {
  return (
    <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/>
    </svg>
  )
}
function IcoNote() {
  return (
    <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
    </svg>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PrestamoModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: PrestamoCreateData) => Promise<void>
}

const hoy = () => new Date().toISOString().slice(0, 10)
let keyCounter = 0

// ─── Component ────────────────────────────────────────────────────────────────

export function PrestamoModal({ open, onClose, onSave }: PrestamoModalProps) {
  const [clientes, setClientes]       = useState<ClienteFE[]>([])
  const [productos, setProductos]     = useState<ProductoOpt[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // Form state
  const [id_Cliente, setIdCliente]   = useState<number | null>(null)
  const [fecha, setFecha]             = useState(hoy())
  const [nota, setNota]               = useState('')
  const [itemRows, setItemRows]       = useState<ItemRow[]>([{ codigo: '', cantidad: 1, key: ++keyCounter }])
  const [saving, setSaving]           = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})

  // Inline client creation
  const [crearCliente, setCrearCliente]   = useState(false)
  const [nuevoNombre, setNuevoNombre]     = useState('')
  const [nuevoApellido, setNuevoApellido] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [creandoCliente, setCreandoCliente] = useState(false)

  // Fetch data when modal opens
  useEffect(() => {
    if (!open) return
    setLoadingData(true)
    Promise.all([
      gql<{ clientes: { nodes: ClienteAPI[] } }>(CLIENTES_QUERY),
      gql<{ productos: { nodes: ProductoRaw[] } }>(PRODUCTOS_MODAL_QUERY),
    ])
      .then(([cRes, pRes]) => {
        setClientes((cRes.clientes?.nodes ?? []).map(backendToCliente))
        setProductos((pRes.productos?.nodes ?? []).map(mapProductoOpt))
      })
      .catch(() => notify.error('Error cargando datos'))
      .finally(() => setLoadingData(false))
  }, [open])

  // Reset on close
  useEffect(() => {
    if (open) return
    setIdCliente(null)
    setFecha(hoy())
    setNota('')
    setItemRows([{ codigo: '', cantidad: 1, key: ++keyCounter }])
    setErrors({})
    setCrearCliente(false)
    setNuevoNombre('')
    setNuevoApellido('')
    setNuevoTelefono('')
  }, [open])

  // ── Client options ─────────────────────────────────────────────────────────
  const clienteOptions: ClienteOpt[] = useMemo(
    () => clientes.map((c) => ({ value: c.id, label: c.nombreCompleto, cliente: c })),
    [clientes],
  )

  const selectedCliente = clienteOptions.find((o) => o.value === id_Cliente) ?? null

  // ── Create client inline ───────────────────────────────────────────────────
  const handleCrearCliente = async () => {
    if (!nuevoNombre.trim()) { notify.error('Nombre requerido'); return }
    setCreandoCliente(true)
    try {
      const res = await api.post<{ id: number; nombre: string; apellido: string; telefono: string } | undefined>(
        '/Cliente',
        { nombre: nuevoNombre.trim(), apellido: nuevoApellido.trim(), telefono: nuevoTelefono.trim() },
      )
      const cRes = await gql<{ clientes: { nodes: ClienteAPI[] } }>(CLIENTES_QUERY)
      const newList = (cRes.clientes?.nodes ?? []).map(backendToCliente)
      setClientes(newList)
      const createdId = res?.id ?? newList.find((c) => c.nombre === nuevoNombre.trim() && c.apellido === nuevoApellido.trim())?.id ?? null
      setIdCliente(createdId)
      setCrearCliente(false)
      setNuevoNombre('')
      setNuevoApellido('')
      setNuevoTelefono('')
      notify.success('Cliente creado')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al crear cliente')
    } finally {
      setCreandoCliente(false)
    }
  }

  // ── Item rows ──────────────────────────────────────────────────────────────
  const addRow = () => setItemRows((prev) => [...prev, { codigo: '', cantidad: 1, key: ++keyCounter }])
  const removeRow = (key: number) => setItemRows((prev) => prev.filter((r) => r.key !== key))

  const setRowCodigo = (key: number, codigo: string) =>
    setItemRows((prev) => prev.map((r) => r.key === key ? { ...r, codigo } : r))

  const setRowCantidad = (key: number, cantidad: number) =>
    setItemRows((prev) => prev.map((r) => r.key === key ? { ...r, cantidad: Math.max(1, cantidad) } : r))

  // ── Validate & save ────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {}
    if (!id_Cliente) e.cliente = 'Selecciona un cliente'
    if (!fecha) e.fecha = 'Requerido'
    if (itemRows.length === 0) e.items = 'Agrega al menos un producto'
    if (itemRows.some((r) => !r.codigo)) e.items = 'Completa todos los productos'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({
        id_Cliente: id_Cliente!,
        fecha: new Date(fecha + 'T00:00:00').toISOString(),
        nota: nota.trim(),
        detalles: itemRows.map((r) => ({ codigo: r.codigo, cantidad: r.cantidad })),
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Total estimado ─────────────────────────────────────────────────────────
  const totalEstimado = useMemo(() => {
    return itemRows.reduce((sum, row) => {
      if (!row.codigo) return sum
      return sum
    }, 0)
  }, [itemRows])

  // ── Render ────────────────────────────────────────────────────────────────

  const footer = (
    <>
      <button
        onClick={onClose}
        disabled={saving}
        className="h-[44px] px-5 rounded-[10px] text-[13.5px] font-semibold text-ink-2 border border-hair hover:bg-cream-2 transition-colors disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        onClick={() => void handleSave()}
        disabled={saving || !id_Cliente || itemRows.some((r) => !r.codigo)}
        className="h-[44px] px-6 rounded-[10px] text-[13.5px] font-semibold bg-terra text-white hover:bg-terra-deep transition-colors disabled:opacity-40"
        style={{ boxShadow: '0 1px 2px rgba(200,80,31,0.25)' }}
      >
        {saving ? 'Registrando…' : 'Registrar préstamo'}
      </button>
    </>
  )

  return (
    <DrawerWrapper
      open={open}
      onClose={onClose}
      subtitle="Control de salida"
      title="Nuevo préstamo"
      footer={footer}
    >
      {loadingData ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[80px] rounded-[14px] bg-cream-2 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Cliente ──────────────────────────────────────────────────── */}
          <FormSection
            icon={<IcoUser />}
            title="Cliente"
            description="A quién se le presta el producto"
          >
            <div className="space-y-3">
              <div>
                <label className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-muted leading-none block mb-1.5">
                  Seleccionar cliente
                </label>
                <Select<ClienteOpt, false, GroupBase<ClienteOpt>>
                  options={clienteOptions}
                  value={selectedCliente}
                  onChange={(opt: SingleValue<ClienteOpt>) => {
                    setIdCliente(opt?.value ?? null)
                    setErrors((e) => ({ ...e, cliente: '' }))
                  }}
                  placeholder="Buscar cliente..."
                  noOptionsMessage={() => 'Sin clientes registrados'}
                  styles={warmSelectStyles}
                  menuPortalTarget={document.body}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  components={{ Option: ClienteOptionComp as React.ComponentType<any> }}
                  filterOption={(opt, input) => {
                    const q = input.toLowerCase()
                    const c = opt.data.cliente
                    return (
                      c.nombre.toLowerCase().includes(q) ||
                      c.apellido.toLowerCase().includes(q) ||
                      c.telefono.includes(q)
                    )
                  }}
                />
                {errors.cliente && (
                  <p className="text-[11px] text-terra mt-1">{errors.cliente}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCrearCliente((v) => !v)}
                className="text-[12px] text-terra font-semibold flex items-center gap-1.5 hover:text-terra-deep transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={crearCliente ? 'M19 9l-7 7-7-7' : 'M12 5v14M5 12h14'} />
                </svg>
                {crearCliente ? 'Cancelar nuevo cliente' : 'Crear nuevo cliente'}
              </button>

              {crearCliente && (
                <div className="rounded-[12px] border border-hair bg-cream p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <WarmInput label="Nombre" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre" />
                    <WarmInput label="Apellido" value={nuevoApellido} onChange={(e) => setNuevoApellido(e.target.value)} placeholder="Apellido" />
                  </div>
                  <WarmInput label="Teléfono (opcional)" value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} placeholder="7x-xxx-xxx" type="tel" />
                  <button
                    onClick={() => void handleCrearCliente()}
                    disabled={creandoCliente || !nuevoNombre.trim()}
                    className="h-[38px] px-4 rounded-[10px] text-[13px] font-semibold bg-ink text-cream hover:bg-ink/90 transition-colors disabled:opacity-40 w-full"
                  >
                    {creandoCliente ? 'Creando…' : 'Crear y seleccionar'}
                  </button>
                </div>
              )}
            </div>
          </FormSection>

          {/* ── Datos del préstamo ────────────────────────────────────────── */}
          <FormSection
            icon={<IcoNote />}
            title="Datos del préstamo"
          >
            <div className="space-y-3">
              <WarmInput
                label="Fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                error={errors.fecha}
              />
              <div>
                <label className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-muted leading-none block mb-1.5">
                  Nota (opcional)
                </label>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Observaciones, condición del préstamo..."
                  rows={2}
                  className="w-full rounded-[10px] border border-hair bg-cream px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-muted-2 focus:outline-none focus:border-terra transition-colors resize-none"
                />
              </div>
            </div>
          </FormSection>

          {/* ── Productos ─────────────────────────────────────────────────── */}
          <FormSection
            icon={<IcoBox />}
            title="Productos"
            description="Ítems que se prestan"
            extra={
              <button
                onClick={addRow}
                className="h-7 px-2.5 rounded-[8px] text-[12px] font-semibold text-terra border border-terra/30 bg-terra-soft hover:bg-terra/10 transition-colors flex items-center gap-1"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14"/></svg>
                Agregar
              </button>
            }
          >
            <div className="space-y-2">
              {errors.items && (
                <p className="text-[11px] text-terra">{errors.items}</p>
              )}
              {itemRows.map((row) => {
                const selectedOpt = productos.find((p) => p.value === row.codigo) ?? null
                const stockInfo = selectedOpt
                return (
                  <div key={row.key} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select<ProductoOpt, false, GroupBase<ProductoOpt>>
                          options={productos}
                          value={selectedOpt}
                          onChange={(opt: SingleValue<ProductoOpt>) => setRowCodigo(row.key, opt?.value ?? '')}
                          placeholder="Código o nombre del producto..."
                          noOptionsMessage={() => 'Sin resultados'}
                          styles={warmSelectStyles}
                          menuPortalTarget={document.body}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          components={{ Option: ProductoOptionComp as React.ComponentType<any> }}
                          filterOption={(opt, input) => {
                            const q = input.toLowerCase()
                            const p = opt.data
                            return (
                              p.codigo.toLowerCase().includes(q) ||
                              p.nombre.toLowerCase().includes(q) ||
                              p.codigosAlt.some((c) => c.toLowerCase().includes(q))
                            )
                          }}
                        />
                      </div>
                      <div className="w-[72px] shrink-0">
                        <input
                          type="number"
                          min={1}
                          value={row.cantidad}
                          onChange={(e) => setRowCantidad(row.key, Number(e.target.value))}
                          className="w-full h-[42px] px-3 rounded-[10px] border border-hair bg-cream text-[13.5px] text-ink text-center focus:outline-none focus:border-terra transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => removeRow(row.key)}
                        disabled={itemRows.length === 1}
                        className="p-2 rounded-[8px] text-muted hover:text-terra hover:bg-terra-soft transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                    {stockInfo && (
                      <p className="text-[11px] pl-1 text-muted-2">
                        Stock disponible:{' '}
                        <span className={clsx(
                          'font-semibold',
                          stockInfo.stock <= 0 ? 'text-terra' : stockInfo.stock <= 3 ? 'text-amber-600' : 'text-emerald-600',
                        )}>
                          {stockInfo.stock}
                        </span>
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </FormSection>

          {/* Total hint (no prices known before save) */}
          {itemRows.some((r) => r.codigo) && (
            <div className="flex items-center justify-end gap-2 text-[12.5px] text-muted">
              <span>{itemRows.filter((r) => r.codigo).length} producto{itemRows.filter((r) => r.codigo).length !== 1 ? 's' : ''} seleccionado{itemRows.filter((r) => r.codigo).length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Keep totalEstimado in scope to avoid lint warning */}
          {totalEstimado > 0 && null}

        </div>
      )}
    </DrawerWrapper>
  )
}
