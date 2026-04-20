import { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout, PageContainer } from '@/components/layout/MainLayout'
import { Button, Input, Select, Modal } from '@/components/ui'
import { notify } from '@/lib/notify'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AperturaCaja {
  id: string
  fecha: string
  monto_inicial: number
  usuario: string
  creado_en: string
}

type TipoMovimiento = 'ingreso' | 'egreso'
type TipoPago = 'efectivo' | 'qr' | 'tarjeta'
type CategoriaMovimiento = 'venta' | 'compra' | 'gasto' | 'transferencia' | 'otro'

interface MovimientoCaja {
  id: string
  tipo: TipoMovimiento
  categoria: CategoriaMovimiento
  tipo_pago: TipoPago
  monto: number
  motivo: string
  usuario: string
  creado_en: string
}

interface CierreCaja {
  monto_contado: number
  efectivo_esperado: number
  diferencia: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_APERTURA: AperturaCaja = {
  id: '1',
  fecha: new Date().toISOString().slice(0, 10),
  monto_inicial: 500,
  usuario: 'Admin',
  creado_en: new Date().toISOString(),
}

const MOCK_MOVIMIENTOS: MovimientoCaja[] = [
  { id: '1', tipo: 'ingreso', categoria: 'venta', tipo_pago: 'efectivo', monto: 350, motivo: 'Venta #1042 - Filtros aceite', usuario: 'Admin', creado_en: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', tipo: 'ingreso', categoria: 'venta', tipo_pago: 'qr',       monto: 120, motivo: 'Venta #1043 - Pastillas freno', usuario: 'Admin', creado_en: new Date(Date.now() - 2700000).toISOString() },
  { id: '3', tipo: 'egreso',  categoria: 'compra', tipo_pago: 'efectivo', monto: 80, motivo: 'Compra insumos limpieza', usuario: 'Admin', creado_en: new Date(Date.now() - 1800000).toISOString() },
  { id: '4', tipo: 'ingreso', categoria: 'venta', tipo_pago: 'tarjeta',  monto: 210, motivo: 'Venta #1044 - Bujías NGK x4', usuario: 'Admin', creado_en: new Date(Date.now() - 900000).toISOString() },
  { id: '5', tipo: 'egreso',  categoria: 'gasto', tipo_pago: 'efectivo', monto: 45,  motivo: 'Pago servicio mensajería', usuario: 'Admin', creado_en: new Date(Date.now() - 300000).toISOString() },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

const CATEGORIA_LABELS: Record<CategoriaMovimiento, string> = {
  venta: 'Venta', compra: 'Compra', gasto: 'Gasto', transferencia: 'Transferencia', otro: 'Otro',
}

const TIPO_PAGO_CONFIG: Record<TipoPago, { label: string; style: string }> = {
  efectivo:  { label: 'Efectivo',  style: 'bg-steel-100 text-steel-600' },
  qr:        { label: 'QR',        style: 'bg-violet-100 text-violet-700' },
  tarjeta:   { label: 'Tarjeta',   style: 'bg-blue-100 text-blue-700' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-steel-100 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 rounded-full bg-brand-600" />
      <h2 className="text-[11px] font-bold text-steel-500 uppercase tracking-widest">{children}</h2>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, variant = 'light' }: {
  icon: React.ReactNode; label: string; value: string; sub?: string
  variant?: 'light' | 'dark' | 'green' | 'red'
}) {
  if (variant === 'dark') {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-steel-900 p-5 text-white shadow-md">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-steel-800" />
        <div className="absolute right-2 -bottom-8 h-24 w-24 rounded-full bg-brand-900 opacity-40" />
        <div className="relative">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">{icon}</div>
          <p className="text-2xl font-black tabular-nums leading-tight">{value}</p>
          <p className="text-xs text-steel-400 font-semibold mt-0.5">{label}</p>
          {sub && <p className="text-[10px] text-steel-500 mt-2">{sub}</p>}
        </div>
      </div>
    )
  }
  const bg = variant === 'green' ? 'bg-emerald-50' : variant === 'red' ? 'bg-red-50' : 'bg-steel-50'
  const iconColor = variant === 'green' ? 'text-emerald-600' : variant === 'red' ? 'text-red-500' : 'text-steel-500'
  const valueColor = variant === 'green' ? 'text-emerald-700' : variant === 'red' ? 'text-red-600' : 'text-steel-900'
  return (
    <Card className="p-5">
      <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <div className={iconColor}>{icon}</div>
      </div>
      <p className={`text-2xl font-black tabular-nums leading-tight ${valueColor}`}>{value}</p>
      <p className="text-xs text-steel-500 font-semibold mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-steel-400 mt-2">{sub}</p>}
    </Card>
  )
}

function PagoBadge({ tipo_pago }: { tipo_pago: TipoPago }) {
  const cfg = TIPO_PAGO_CONFIG[tipo_pago]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${cfg.style}`}>
      {cfg.label}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: TipoMovimiento }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide',
      tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
    )}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', tipo === 'ingreso' ? 'bg-emerald-500' : 'bg-red-500')} />
      {tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
    </span>
  )
}

// ─── Apertura screen ──────────────────────────────────────────────────────────

function AperturaScreen({ onAbrir }: { onAbrir: (monto: number) => void }) {
  const [monto, setMonto] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseFloat(monto.replace(',', '.'))
    if (isNaN(n) || n < 0) { notify.error('Ingresa un monto válido'); return }
    onAbrir(n)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-steel-900 flex items-center justify-center shadow-md">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-steel-900">Abrir caja</h2>
          <p className="text-sm text-steel-500 mt-1">{fmtDate(new Date().toISOString())}</p>
          <p className="text-xs text-steel-400 mt-2">Registra el efectivo con el que inicias el día</p>
        </div>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-steel-600 mb-1.5">Monto inicial en efectivo (Bs)</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={monto}
                onChange={e => setMonto(e.target.value)} autoFocus />
            </div>
            <Button type="submit" className="w-full">Abrir caja</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

// ─── Movimiento modal ─────────────────────────────────────────────────────────

interface MovimientoModalProps {
  tipo: TipoMovimiento
  onClose: () => void
  onSave: (mov: Omit<MovimientoCaja, 'id' | 'usuario' | 'creado_en'>) => void
}

function MovimientoModal({ tipo, onClose, onSave }: MovimientoModalProps) {
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [categoria, setCategoria] = useState<CategoriaMovimiento>(tipo === 'ingreso' ? 'venta' : 'gasto')
  const [tipoPago, setTipoPago] = useState<TipoPago>('efectivo')

  const categorias =
    tipo === 'ingreso'
      ? [
          { value: 'venta',         label: 'Venta' },
          { value: 'transferencia', label: 'Transferencia' },
          { value: 'otro',          label: 'Otro ingreso' },
        ]
      : [
          { value: 'compra',        label: 'Compra' },
          { value: 'gasto',         label: 'Gasto operativo' },
          { value: 'transferencia', label: 'Transferencia' },
          { value: 'otro',          label: 'Otro egreso' },
        ]

  const tiposPago = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'qr',       label: 'QR' },
    { value: 'tarjeta',  label: 'Tarjeta' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseFloat(monto.replace(',', '.'))
    if (isNaN(n) || n <= 0) { notify.error('Monto inválido'); return }
    if (!motivo.trim()) { notify.error('Ingresa un motivo'); return }
    onSave({ tipo, categoria, tipo_pago: tipoPago, monto: n, motivo: motivo.trim() })
  }

  const isIngreso = tipo === 'ingreso'
  const accentBg   = isIngreso ? 'bg-emerald-600' : 'bg-red-500'
  const accentText = isIngreso ? 'text-emerald-600' : 'text-red-500'
  const accentBanner = isIngreso ? 'bg-emerald-50' : 'bg-red-50'

  return (
    <Modal open onClose={onClose} title={isIngreso ? 'Registrar ingreso' : 'Registrar egreso'}>
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className={`flex items-center gap-3 p-3 rounded-xl ${accentBanner}`}>
          <div className={`h-8 w-8 rounded-lg ${accentBg} flex items-center justify-center shrink-0`}>
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isIngreso
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />}
            </svg>
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${accentText}`}>
              {isIngreso ? 'Entrada de dinero' : 'Salida de dinero'}
            </p>
            <p className="text-[11px] text-steel-500">
              {tipoPago !== 'efectivo' ? 'No afecta el efectivo físico en caja' : 'Afecta el efectivo físico en caja'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">Categoría</label>
            <Select value={categoria} options={categorias}
              onChange={e => setCategoria(e.target.value as CategoriaMovimiento)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">Tipo de pago</label>
            <Select value={tipoPago} options={tiposPago}
              onChange={e => setTipoPago(e.target.value as TipoPago)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-steel-600 mb-1.5">Monto (Bs)</label>
          <Input type="number" min="0.01" step="0.01" placeholder="0.00"
            value={monto} onChange={e => setMonto(e.target.value)} autoFocus />
        </div>

        <div>
          <label className="block text-xs font-semibold text-steel-600 mb-1.5">Motivo</label>
          <Input type="text"
            placeholder={isIngreso ? 'Ej: Venta contado cliente Pérez' : 'Ej: Pago proveedor materiales'}
            value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={120} />
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1">Registrar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Cierre de caja modal ─────────────────────────────────────────────────────

interface CierreCajaModalProps {
  efectivoEsperado: number
  onClose: () => void
  onConfirm: (cierre: CierreCaja) => void
}

function CierreCajaModal({ efectivoEsperado, onClose, onConfirm }: CierreCajaModalProps) {
  const [montoContado, setMontoContado] = useState('')

  const contado = parseFloat(montoContado.replace(',', '.'))
  const contadoValido = !isNaN(contado) && montoContado.trim() !== ''
  const diferencia = contadoValido ? contado - efectivoEsperado : null

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contadoValido) { notify.error('Ingresa el monto contado'); return }
    onConfirm({ monto_contado: contado, efectivo_esperado: efectivoEsperado, diferencia: diferencia! })
  }

  return (
    <Modal open onClose={onClose} title="Cierre de caja">
      <form onSubmit={handleConfirm} className="space-y-5 pt-1">
        {/* Efectivo esperado */}
        <div className="p-4 rounded-xl bg-steel-50 border border-steel-100">
          <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">Efectivo esperado en caja</p>
          <p className="text-2xl font-black tabular-nums text-steel-900">{fmtBs(efectivoEsperado)}</p>
          <p className="text-[11px] text-steel-400 mt-1">Calculado solo con movimientos en efectivo</p>
        </div>

        {/* Monto contado */}
        <div>
          <label className="block text-xs font-semibold text-steel-600 mb-1.5">
            Monto que contaste físicamente (Bs)
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={montoContado}
            onChange={e => setMontoContado(e.target.value)}
            autoFocus
          />
        </div>

        {/* Diferencia — visible solo cuando hay valor ingresado */}
        {contadoValido && diferencia !== null && (
          <div className={clsx(
            'flex items-center justify-between p-4 rounded-xl border',
            diferencia === 0
              ? 'bg-emerald-50 border-emerald-200'
              : diferencia > 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-red-50 border-red-200',
          )}>
            <div>
              <p className={clsx(
                'text-[11px] font-bold uppercase tracking-widest',
                diferencia === 0 ? 'text-emerald-600' : diferencia > 0 ? 'text-blue-600' : 'text-red-600',
              )}>
                {diferencia === 0 ? 'Cuadra exacto' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
              </p>
              <p className="text-xs text-steel-500 mt-0.5">
                {diferencia === 0 ? 'El monto coincide con el sistema' : 'Diferencia respecto al sistema'}
              </p>
            </div>
            <p className={clsx(
              'text-xl font-black tabular-nums',
              diferencia === 0 ? 'text-emerald-700' : diferencia > 0 ? 'text-blue-700' : 'text-red-600',
            )}>
              {diferencia > 0 ? '+' : ''}{fmtBs(diferencia)}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={!contadoValido}>
            Cerrar caja
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CajaDiariaPage() {
  const { user } = useAuth()

  const [apertura, setApertura]     = useState<AperturaCaja | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([])
  const [modalTipo, setModalTipo]   = useState<TipoMovimiento | null>(null)
  const [showCierre, setShowCierre] = useState(false)
  const [cierre, setCierre]         = useState<CierreCaja | null>(null)

  // ── Totales generales
  const totalIngresos = useMemo(
    () => movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0),
    [movimientos],
  )
  const totalEgresos = useMemo(
    () => movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0),
    [movimientos],
  )

  // ── Solo efectivo (para el saldo físico real)
  const ingresosEfectivo = useMemo(
    () => movimientos.filter(m => m.tipo === 'ingreso' && m.tipo_pago === 'efectivo').reduce((s, m) => s + m.monto, 0),
    [movimientos],
  )
  const egresosEfectivo = useMemo(
    () => movimientos.filter(m => m.tipo === 'egreso' && m.tipo_pago === 'efectivo').reduce((s, m) => s + m.monto, 0),
    [movimientos],
  )
  const efectivoEsperado = (apertura?.monto_inicial ?? 0) + ingresosEfectivo - egresosEfectivo

  // ── Por tipo de pago para resumen de ingresos
  const ingresosPorPago = useMemo(() => ({
    efectivo: movimientos.filter(m => m.tipo === 'ingreso' && m.tipo_pago === 'efectivo').reduce((s, m) => s + m.monto, 0),
    qr:       movimientos.filter(m => m.tipo === 'ingreso' && m.tipo_pago === 'qr').reduce((s, m) => s + m.monto, 0),
    tarjeta:  movimientos.filter(m => m.tipo === 'ingreso' && m.tipo_pago === 'tarjeta').reduce((s, m) => s + m.monto, 0),
  }), [movimientos])

  const handleAbrir = (monto: number) => {
    setApertura({
      id: Date.now().toString(),
      fecha: new Date().toISOString().slice(0, 10),
      monto_inicial: monto,
      usuario: user?.nombre ?? 'Usuario',
      creado_en: new Date().toISOString(),
    })
    setMovimientos(MOCK_MOVIMIENTOS)
    notify.success('Caja abierta correctamente')
  }

  const handleGuardarMovimiento = (data: Omit<MovimientoCaja, 'id' | 'usuario' | 'creado_en'>) => {
    setMovimientos(prev => [{
      ...data,
      id: Date.now().toString(),
      usuario: user?.nombre ?? 'Usuario',
      creado_en: new Date().toISOString(),
    }, ...prev])
    notify.success(data.tipo === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado')
    setModalTipo(null)
  }

  const handleConfirmarCierre = (data: CierreCaja) => {
    setCierre(data)
    setShowCierre(false)
    notify.success('Caja cerrada. Resumen guardado.')
  }

  // ── Pantalla: caja cerrada ─────────────────────────────────────────────────
  if (cierre && apertura) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md">
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-steel-900">Caja cerrada</h2>
                <p className="text-sm text-steel-500 mt-0.5 capitalize">{fmtDate(apertura.fecha + 'T12:00:00')}</p>
              </div>

              <Card className="p-5 space-y-3 mb-4">
                <SectionTitle>Resumen del día</SectionTitle>
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-500">Monto inicial</span>
                    <span className="font-semibold text-steel-700">{fmtBs(apertura.monto_inicial)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-500">Total ingresos</span>
                    <span className="font-semibold text-emerald-600">{fmtBs(totalIngresos)}</span>
                  </div>
                  {/* Desglose ingresos por tipo pago */}
                  <div className="pl-3 space-y-1">
                    {ingresosPorPago.efectivo > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-steel-400 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-steel-400" />Efectivo
                        </span>
                        <span className="text-steel-500">{fmtBs(ingresosPorPago.efectivo)}</span>
                      </div>
                    )}
                    {ingresosPorPago.qr > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-steel-400 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />QR
                        </span>
                        <span className="text-steel-500">{fmtBs(ingresosPorPago.qr)}</span>
                      </div>
                    )}
                    {ingresosPorPago.tarjeta > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-steel-400 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />Tarjeta
                        </span>
                        <span className="text-steel-500">{fmtBs(ingresosPorPago.tarjeta)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-500">Total egresos</span>
                    <span className="font-semibold text-red-500">{fmtBs(totalEgresos)}</span>
                  </div>
                  <div className="pt-2 border-t border-steel-100 flex justify-between">
                    <span className="text-sm font-bold text-steel-700">Efectivo esperado</span>
                    <span className="text-sm font-black text-steel-900">{fmtBs(cierre.efectivo_esperado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-steel-700">Monto contado</span>
                    <span className="text-sm font-black text-steel-900">{fmtBs(cierre.monto_contado)}</span>
                  </div>
                </div>
              </Card>

              {/* Diferencia */}
              <div className={clsx(
                'flex items-center justify-between p-4 rounded-xl border mb-5',
                cierre.diferencia === 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : cierre.diferencia > 0
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-red-50 border-red-200',
              )}>
                <div>
                  <p className={clsx('text-xs font-bold uppercase tracking-widest',
                    cierre.diferencia === 0 ? 'text-emerald-600' : cierre.diferencia > 0 ? 'text-blue-600' : 'text-red-600')}>
                    {cierre.diferencia === 0 ? 'Caja cuadrada' : cierre.diferencia > 0 ? 'Sobrante' : 'Faltante'}
                  </p>
                  <p className="text-xs text-steel-500 mt-0.5">Diferencia contado vs. esperado</p>
                </div>
                <p className={clsx('text-xl font-black tabular-nums',
                  cierre.diferencia === 0 ? 'text-emerald-700' : cierre.diferencia > 0 ? 'text-blue-700' : 'text-red-600')}>
                  {cierre.diferencia > 0 ? '+' : ''}{fmtBs(cierre.diferencia)}
                </p>
              </div>

              <Button className="w-full" onClick={() => { setApertura(null); setMovimientos([]); setCierre(null) }}>
                Nueva apertura
              </Button>
            </div>
          </div>
        </PageContainer>
      </MainLayout>
    )
  }

  // ── Pantalla: apertura ─────────────────────────────────────────────────────
  if (!apertura) {
    return (
      <MainLayout>
        <PageContainer>
          <AperturaScreen onAbrir={handleAbrir} />
          <div className="flex justify-center mt-4">
            <button
              onClick={() => { setApertura(MOCK_APERTURA); setMovimientos(MOCK_MOVIMIENTOS) }}
              className="text-xs text-steel-400 hover:text-steel-600 underline"
            >
              Cargar datos de demo
            </button>
          </div>
        </PageContainer>
      </MainLayout>
    )
  }

  // ── Pantalla: caja abierta ─────────────────────────────────────────────────
  return (
    <MainLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-3">
          <div>
            <h1 className="text-xl font-semibold text-steel-900">Caja diaria</h1>
            <p className="text-sm text-steel-500 mt-0.5 capitalize">{fmtDate(apertura.fecha + 'T12:00:00')}</p>
          </div>
          <Button variant="secondary" onClick={() => setShowCierre(true)}>
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cerrar caja
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            variant="dark"
            label="Monto inicial"
            value={fmtBs(apertura.monto_inicial)}
            sub={`Apertura ${fmtTime(apertura.creado_en)}`}
            icon={
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KpiCard
            variant="green"
            label="Total ingresos"
            value={fmtBs(totalIngresos)}
            sub={`${movimientos.filter(m => m.tipo === 'ingreso').length} movimientos`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            }
          />
          <KpiCard
            variant="red"
            label="Total egresos"
            value={fmtBs(totalEgresos)}
            sub={`${movimientos.filter(m => m.tipo === 'egreso').length} movimientos`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            }
          />
          <KpiCard
            variant="light"
            label="Efectivo en caja"
            value={fmtBs(efectivoEsperado)}
            sub="Solo movimientos en efectivo"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        </div>

        {/* Movements */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-steel-100">
            <SectionTitle>Movimientos del día</SectionTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setModalTipo('egreso')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
                Egreso
              </button>
              <button
                onClick={() => setModalTipo('ingreso')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ingreso
              </button>
            </div>
          </div>

          {movimientos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-steel-50 border border-steel-100 flex items-center justify-center mb-3">
                <svg className="h-6 w-6 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-steel-600">Sin movimientos aún</p>
              <p className="text-xs text-steel-400 mt-1">Registra el primer ingreso o egreso del día</p>
            </div>
          ) : (
            <div className="divide-y divide-steel-50">
              {movimientos.map((mov) => (
                <div key={mov.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-steel-50/50 transition-colors">
                  <div className={clsx(
                    'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                    mov.tipo === 'ingreso' ? 'bg-emerald-50' : 'bg-red-50',
                  )}>
                    <svg className={clsx('h-4 w-4', mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-500')}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {mov.tipo === 'ingreso'
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />}
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-steel-800 truncate">{mov.motivo}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <TipoBadge tipo={mov.tipo} />
                      <PagoBadge tipo_pago={mov.tipo_pago} />
                      <span className="text-[11px] text-steel-400">{CATEGORIA_LABELS[mov.categoria]}</span>
                      <span className="text-[11px] text-steel-300">·</span>
                      <span className="text-[11px] text-steel-400">{fmtTime(mov.creado_en)}</span>
                    </div>
                  </div>

                  <p className={clsx(
                    'text-sm font-bold tabular-nums shrink-0',
                    mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-500',
                  )}>
                    {mov.tipo === 'ingreso' ? '+' : '−'}{fmtBs(mov.monto)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {movimientos.length > 0 && (
            <div className="px-5 py-3.5 border-t border-steel-100 bg-steel-50/50 rounded-b-2xl flex items-center justify-between">
              <p className="text-xs text-steel-500">{movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}</p>
              <p className="text-xs font-bold text-steel-700">
                Efectivo: <span className="text-steel-900 font-black">{fmtBs(efectivoEsperado)}</span>
              </p>
            </div>
          )}
        </Card>
      </PageContainer>

      {modalTipo && (
        <MovimientoModal tipo={modalTipo} onClose={() => setModalTipo(null)} onSave={handleGuardarMovimiento} />
      )}

      {showCierre && (
        <CierreCajaModal
          efectivoEsperado={efectivoEsperado}
          onClose={() => setShowCierre(false)}
          onConfirm={handleConfirmarCierre}
        />
      )}
    </MainLayout>
  )
}
