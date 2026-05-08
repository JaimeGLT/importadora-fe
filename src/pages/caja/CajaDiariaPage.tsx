import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button, Input, Select, Modal, WarmMetric } from '@/components/ui'
import { notify } from '@/lib/notify'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { MI_CAJA_QUERY, backendToCaja, type CajaAPI } from '@/lib/queries/caja.queries'
import { AutopartsWatermark } from '@/pages/inventario/AutopartsWatermark'
import type { Caja, MovimientoCaja, CierreCajaResponse } from '@/types'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IcoCal() {
  return (
    <svg className="w-[15px] h-[15px] text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>
    </svg>
  )
}
function IcoBell() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  )
}
function IcoSettings() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

const CATEGORIA_LABELS: Record<MovimientoCaja['categoria'], string> = {
  Ventas: 'Ventas',
  OtroIngreso: 'Otro ingreso',
  Compra: 'Compra',
  GastoOperativo: 'Gasto operativo',
  OtroEgreso: 'Otro egreso',
  Transferencia: 'Transferencia',
}

const TIPO_PAGO_CONFIG: Record<MovimientoCaja['tipoPago'], { label: string; style: string }> = {
  Efectivo:  { label: 'Efectivo', style: 'bg-steel-100 text-steel-600' },
  QR:        { label: 'QR', style: 'bg-violet-100 text-violet-700' },
  Tarjeta:   { label: 'Tarjeta', style: 'bg-blue-100 text-blue-700' },
}

type TipoBackend = 'ingreso' | 'egreso'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-7 md:mb-11">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-2xl border border-hair p-4 md:p-7 bg-white/82 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-3 w-24 rounded bg-cream-2" />
            <div className="h-[34px] w-[34px] rounded-[10px] bg-cream-2" />
          </div>
          <div className="h-9 w-32 rounded bg-cream-2" />
          <div className="h-3 w-20 rounded bg-hair mt-2" />
        </div>
      ))}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PagoBadge({ tipo_pago }: { tipo_pago: MovimientoCaja['tipoPago'] }) {
  const cfg = TIPO_PAGO_CONFIG[tipo_pago]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${cfg.style}`}>
      {cfg.label}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: MovimientoCaja['tipo'] }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide',
      tipo === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
    )}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', tipo === 'Ingreso' ? 'bg-emerald-500' : 'bg-red-500')} />
      {tipo === 'Ingreso' ? 'Ingreso' : 'Egreso'}
    </span>
  )
}

// ─── Movimiento modal ─────────────────────────────────────────────────────────

interface MovimientoModalProps {
  tipo: TipoBackend
  onClose: () => void
  onSave: (mov: Omit<MovimientoCaja, 'id' | 'id_Caja' | 'fecha'>) => void
}

function MovimientoModal({ tipo, onClose, onSave }: MovimientoModalProps) {
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [categoria, setCategoria] = useState<MovimientoCaja['categoria']>(
    tipo === 'ingreso' ? 'Ventas' : 'GastoOperativo'
  )
  const [tipoPago, setTipoPago] = useState<MovimientoCaja['tipoPago']>('Efectivo')

  const categorias =
    tipo === 'ingreso'
      ? [
          { value: 'Ventas',         label: 'Ventas' },
          { value: 'Transferencia',  label: 'Transferencia' },
          { value: 'OtroIngreso',    label: 'Otro ingreso' },
        ]
      : [
          { value: 'Compra',          label: 'Compra' },
          { value: 'GastoOperativo', label: 'Gasto operativo' },
          { value: 'Transferencia',  label: 'Transferencia' },
          { value: 'OtroEgreso',     label: 'Otro egreso' },
        ]

  const tiposPago = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'QR',       label: 'QR' },
    { value: 'Tarjeta',  label: 'Tarjeta' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseFloat(monto.replace(',', '.'))
    if (isNaN(n) || n <= 0) { notify.error('Monto inválido'); return }
    if (!motivo.trim()) { notify.error('Ingresa un motivo'); return }
    onSave({ tipo: tipo === 'ingreso' ? 'Ingreso' : 'Egreso', categoria, tipoPago, monto: n, motivo: motivo.trim() })
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
              {tipoPago !== 'Efectivo' ? 'No afecta el efectivo físico en caja' : 'Afecta el efectivo físico en caja'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">Categoría</label>
            <Select value={categoria} options={categorias}
              onChange={e => setCategoria(e.target.value as MovimientoCaja['categoria'])} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">Tipo de pago</label>
            <Select value={tipoPago} options={tiposPago}
              onChange={e => setTipoPago(e.target.value as MovimientoCaja['tipoPago'])} />
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
  onConfirm: (montoContado: number, justificacion: string | null) => void
}

function CierreCajaModal({ efectivoEsperado, onClose, onConfirm }: CierreCajaModalProps) {
  const [montoContado, setMontoContado] = useState('')
  const [justificacion, setJustificacion] = useState('')

  const contado = parseFloat(montoContado.replace(',', '.'))
  const contadoValido = !isNaN(contado) && montoContado.trim() !== ''
  const diferencia: number | null = contadoValido ? contado - efectivoEsperado : null
  const esFaltante = diferencia !== null && diferencia < 0
  const esSobrante = diferencia !== null && diferencia > 0

  const puedeCerrar = () => {
    if (!contadoValido) return false
    if (esFaltante && !justificacion.trim()) return false
    return true
  }

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contadoValido) { notify.error('Ingresa el monto contado'); return }
    if (esFaltante && !justificacion.trim()) { notify.error('El faltante requiere una justificación'); return }
    onConfirm(contado, justificacion.trim() || null)
  }

  return (
    <Modal open onClose={onClose} title="Cierre de caja">
      <form onSubmit={handleConfirm} className="space-y-5 pt-1">
        <div className="p-4 rounded-xl bg-steel-50 border border-steel-100">
          <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">Efectivo esperado en caja</p>
          <p className="text-2xl font-black tabular-nums text-steel-900">{efectivoEsperado.toFixed(2)} Bs.</p>
          <p className="text-[11px] text-steel-400 mt-1">Calculado solo con movimientos en efectivo</p>
        </div>

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

        {contadoValido && diferencia !== null && (
          <div className={clsx(
            'flex items-center justify-between p-4 rounded-xl border',
            diferencia === 0
              ? 'bg-emerald-50 border-emerald-200'
              : esSobrante
                ? 'bg-blue-50 border-blue-200'
                : 'bg-red-50 border-red-200',
          )}>
            <div>
              <p className={clsx(
                'text-[11px] font-bold uppercase tracking-widest',
                diferencia === 0 ? 'text-emerald-600' : esSobrante ? 'text-blue-600' : 'text-red-600',
              )}>
                {diferencia === 0 ? 'Cuadrado' : esSobrante ? 'Sobrante' : 'Faltante'}
              </p>
              <p className="text-xs text-steel-500 mt-0.5">
                {diferencia === 0
                  ? 'El monto coincide con el sistema'
                  : esSobrante
                    ? 'Hay más efectivo del esperado en sistema'
                    : 'Falta efectivo según registros del sistema'}
              </p>
            </div>
            <p className={clsx(
              'text-xl font-black tabular-nums',
              diferencia === 0 ? 'text-emerald-700' : esSobrante ? 'text-blue-700' : 'text-red-600',
            )}>
              {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)} Bs.
            </p>
          </div>
        )}

        {esFaltante && (
          <div>
            <label className="block text-xs font-semibold text-red-600 mb-1.5">
              Justificación del faltante *
            </label>
            <Input
              type="text"
              placeholder="Ej: Billete falso, error de vuelto, robo..."
              value={justificacion}
              onChange={e => setJustificacion(e.target.value)}
              maxLength={200}
            />
            <p className="text-[10px] text-steel-400 mt-1">
              Campo obligatorio cuando hay faltante. Máx. 200 caracteres.
            </p>
          </div>
        )}

        {contadoValido && !esFaltante && (
          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">
              Motivo (opcional)
            </label>
            <Input
              type="text"
              placeholder="Ej: Ajuste por tolerancia, ingreso extra..."
              value={justificacion}
              onChange={e => setJustificacion(e.target.value)}
              maxLength={200}
            />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={!puedeCerrar()}>
            Cerrar caja
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Apertura screen ──────────────────────────────────────────────────────────

function AperturaScreen({ onAbrir }: { onAbrir: (monto: number) => void }) {
  const [monto, setMonto] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseFloat(monto.replace(',', '.'))
    if (isNaN(n) || n < 0) { notify.error('Ingresa un monto válido'); return }
    setLoading(true)
    await onAbrir(n)
    setLoading(false)
  }

  const dateStr = new Date().toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

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
          <p className="text-sm text-steel-500 mt-1">{dateStr}</p>
          <p className="text-xs text-steel-400 mt-2">Registra el efectivo con el que inicias el día</p>
        </div>
        <div className="rounded-[18px] border border-hair bg-white/86 backdrop-blur p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-steel-600 mb-1.5">Monto inicial en efectivo (Bs)</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={monto}
                onChange={e => setMonto(e.target.value)} autoFocus disabled={loading} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Abriendo...' : 'Abrir caja'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CajaDiariaPage() {
  const { isTokenReady } = useAuth()

  const [loading, setLoading] = useState(true)
  const [caja, setCaja] = useState<Caja | null>(null)
  const [resumenCierre, setResumenCierre] = useState<CierreCajaResponse | null>(null)
  const [modalTipo, setModalTipo] = useState<TipoBackend | null>(null)
  const [showCierre, setShowCierre] = useState(false)

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }, [])

  const movimientos = caja?.movimientos ?? []

  const totalIngresos = useMemo(
    () => movimientos.filter(m => m.tipo === 'Ingreso').reduce((s, m) => s + m.monto, 0),
    [movimientos],
  )
  const totalEgresos = useMemo(
    () => movimientos.filter(m => m.tipo === 'Egreso').reduce((s, m) => s + m.monto, 0),
    [movimientos],
  )

  const ingresosEfectivo = useMemo(
    () => movimientos.filter(m => m.tipo === 'Ingreso' && m.tipoPago === 'Efectivo').reduce((s, m) => s + m.monto, 0),
    [movimientos],
  )
  const egresosEfectivo = useMemo(
    () => movimientos.filter(m => m.tipo === 'Egreso' && m.tipoPago === 'Efectivo').reduce((s, m) => s + m.monto, 0),
    [movimientos],
  )
  const efectivoEsperado = (caja?.montoInicial ?? 0) + ingresosEfectivo - egresosEfectivo

  useEffect(() => {
    if (!isTokenReady) return
    cargarCaja()
  }, [isTokenReady])

  const cargarCaja = () => {
    setLoading(true)
    gql<{ misCajas: { nodes: CajaAPI[] } }>(MI_CAJA_QUERY)
      .then(res => {
        const abierta = res.misCajas.nodes[0]
        setCaja(abierta ? backendToCaja(abierta) : null)
      })
      .catch(() => notify.error('Error cargando estado de caja'))
      .finally(() => setLoading(false))
  }

  const handleAbrir = async (montoInicial: number) => {
    try {
      await api.post('/Caja', {
        montoInicial,
        fechaInicio: new Date().toISOString(),
      })
      notify.success('Caja abierta correctamente')
      cargarCaja()
    } catch (err) {
      notify.error((err as Error).message || 'Error al abrir caja')
    }
  }

  const handleGuardarMovimiento = async (data: Omit<MovimientoCaja, 'id' | 'id_Caja' | 'fecha'>) => {
    if (!caja) return
    try {
      await api.post(`/Caja/${caja.id}/Movimiento`, {
        tipo: data.tipo,
        categoria: data.categoria,
        tipoPago: data.tipoPago,
        monto: data.monto,
        motivo: data.motivo,
      })
      notify.success(data.tipo === 'Ingreso' ? 'Ingreso registrado' : 'Egreso registrado')
      setModalTipo(null)
      cargarCaja()
    } catch (err) {
      notify.error((err as Error).message || 'Error al registrar movimiento')
    }
  }

  const handleConfirmarCierre = async (montoContado: number, justificacion: string | null) => {
    if (!caja) return
    try {
      const res = await api.post<CierreCajaResponse>(`/Caja/Cerrar/${caja.id}`, {
        montoContado,
        justificacion: justificacion ?? null,
      })
      notify.success('Caja cerrada. Resumen guardado.')
      setShowCierre(false)
      setCaja(null)
      setResumenCierre(res)
    } catch (err) {
      notify.error((err as Error).message || 'Error al cerrar caja')
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <MainLayout>
        <div className="relative px-4 sm:px-8 md:px-14 py-5 md:py-9 pb-10 md:pb-20 min-h-screen"
             style={{ background: 'linear-gradient(180deg, #F4EFE6 0%, #FAF8F5 200px, #FAF8F5 100%)' }}>
          <div className="relative z-[1]">
            <AutopartsWatermark />
            <div className="flex items-center justify-between mb-9">
              <div className="flex items-center gap-1.5 text-[12.5px] text-muted tracking-[0.02em]">
                <span>Operaciones</span>
                <span className="opacity-50">/</span>
                <span className="text-ink">Caja</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-[38px] px-3.5 border border-hair bg-paper rounded-[10px] items-center gap-2 text-[13px] text-ink-2">
                  <IcoCal /><span>{dateStr}</span>
                </div>
                <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2">
                  <IcoBell />
                </button>
                <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2">
                  <IcoSettings />
                </button>
              </div>
            </div>
            <div className="mb-10">
              <h1 className="font-serif text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] m-0 mb-2.5 text-ink">
                Caja diaria<em className="italic text-terra">.</em>
              </h1>
            </div>
            <MetricsSkeleton />
          </div>
        </div>
      </MainLayout>
    )
  }

  // ── Pantalla: resumen de cierre ─────────────────────────────────────────────
  if (resumenCierre) {
    return (
      <MainLayout>
<div className="relative px-4 sm:px-8 md:px-14 py-5 md:py-9 pb-10 md:pb-20 min-h-screen"
             style={{ background: 'linear-gradient(180deg, #F4EFE6 0%, #FAF8F5 200px, #FAF8F5 100%)' }}>
          <div className="relative z-[1]">
            <AutopartsWatermark />

            {/* ── Topbar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-9">
              <div className="flex items-center gap-1.5 text-[12.5px] text-muted tracking-[0.02em]">
                <span>Operaciones</span>
                <span className="opacity-50">/</span>
                <span className="text-ink">Caja</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-[38px] px-3.5 border border-hair bg-paper rounded-[10px] items-center gap-2 text-[13px] text-ink-2">
                  <IcoCal /><span>{dateStr}</span>
                </div>
                <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors relative"
                        title="Notificaciones">
                  <IcoBell />
                  <span className="absolute top-[9px] right-[10px] w-[7px] h-[7px] rounded-full bg-terra border-2 border-paper" />
                </button>
                <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors"
                        title="Configuración">
                  <IcoSettings />
                </button>
              </div>
            </div>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8 mb-7 md:mb-10">
              <div>
                <h1 className="font-serif text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] m-0 mb-2.5 text-ink">
                  Caja diaria<em className="italic text-terra">.</em>
                </h1>
                <p className="text-base text-muted max-w-[520px]">
                  Reporte completo de la jornada de caja cerrada.
                </p>
              </div>
              <button
                onClick={() => setResumenCierre(null)}
                className="h-[46px] px-[22px] rounded-[12px] text-sm font-semibold flex items-center gap-2 bg-terra text-white hover:bg-terra-deep transition-all hover:-translate-y-px active:translate-y-0"
                style={{ boxShadow: '0 1px 2px rgba(200,80,31,0.3), 0 6px 16px -8px rgba(200,80,31,0.5)' }}
              >
                Nueva caja
              </button>
            </div>

            {/* ── Resumen card ──────────────────────────────────────────────── */}
            <div className="rounded-[18px] border border-hair bg-white/86 backdrop-blur overflow-hidden">
              <div className="px-7 py-6 border-b border-hair">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">Caja cerrada exitosamente</p>
                    <p className="text-xs text-muted">
                      {new Date(resumenCierre.fechaCierre).toLocaleDateString('es-BO', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })} — {new Date(resumenCierre.fechaCierre).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-7 space-y-6">
                {/* Totales generales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-steel-50 border border-steel-100">
                    <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">Monto inicial</p>
                    <p className="text-xl font-black text-ink">{resumenCierre.montoInicial.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total ingresos</p>
                    <p className="text-xl font-black text-emerald-700">{resumenCierre.totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                    <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-1">Total egresos</p>
                    <p className="text-xl font-black text-red-600">{resumenCierre.totalEgresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-steel-50 border border-steel-100">
                    <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-1">Efectivo esperado</p>
                    <p className={clsx('text-xl font-black', resumenCierre.efectivoEsperado >= 0 ? 'text-ink' : 'text-red-600')}>
                      {resumenCierre.efectivoEsperado.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.
                    </p>
                  </div>
                </div>

                {/* Desglose ingresos por tipo de pago */}
                <div>
                  <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-3">Ingresos por tipo de pago</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-steel-50 border border-steel-100">
                      <p className="text-xs text-steel-500 mb-1">Efectivo</p>
                      <p className="text-lg font-black text-steel-800">{resumenCierre.ingresoEfectivo.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
                      <p className="text-xs text-violet-600 mb-1">QR</p>
                      <p className="text-lg font-black text-violet-700">{resumenCierre.ingresoQR.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-xs text-blue-600 mb-1">Tarjeta</p>
                      <p className="text-lg font-black text-blue-700">{resumenCierre.ingresoTarjeta.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.</p>
                    </div>
                  </div>
                </div>

                {/* Diferencia */}
                {(() => {
                  const diferencia = resumenCierre.montoContado - resumenCierre.efectivoEsperado
                  const esFaltante = diferencia < 0
                  const esCuadrado = diferencia === 0
                  return (
                    <div className={clsx(
                      'flex items-center justify-between p-5 rounded-xl border',
                      esCuadrado
                        ? 'bg-emerald-50 border-emerald-200'
                        : esFaltante
                          ? 'bg-red-50 border-red-200'
                          : 'bg-blue-50 border-blue-200',
                    )}>
                      <div>
                        <p className={clsx(
                          'text-xs font-bold uppercase tracking-widest',
                          esCuadrado ? 'text-emerald-600' : esFaltante ? 'text-red-600' : 'text-blue-600',
                        )}>
                          {esCuadrado ? 'Caja cuadrada' : esFaltante ? 'Faltante' : 'Sobrante'}
                        </p>
                        <p className="text-xs text-steel-500 mt-0.5">
                          {esCuadrado
                            ? 'El monto contado coincide con el sistema'
                            : esFaltante
                              ? `Falta efectivo según registros del sistema`
                              : `Excedente de efectivo según registros`}
                        </p>
                        {resumenCierre.justificacion && (
                          <p className="text-[11px] text-steel-400 mt-1 italic">"{resumenCierre.justificacion}"</p>
                        )}
                      </div>
                      <p className={clsx(
                        'text-2xl font-black tabular-nums',
                        esCuadrado ? 'text-emerald-700' : esFaltante ? 'text-red-600' : 'text-blue-700',
                      )}>
                        {diferencia >= 0 ? '+' : ''}{diferencia.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.
                      </p>
                    </div>
                  )
                })()}

                {/* Efectivo contado */}
                <div className="p-5 rounded-xl bg-steel-50 border border-steel-100 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-steel-400 uppercase tracking-widest">Efectivo contado</p>
                    <p className="text-xs text-steel-500 mt-0.5">Lo que contaste físicamente en caja</p>
                  </div>
                  <p className="text-2xl font-black text-steel-900">{resumenCierre.montoContado.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </MainLayout>
    )
  }

  // ── Pantalla: caja cerrada ─────────────────────────────────────────────────
  if (!caja) {
    return (
      <MainLayout>
<div className="relative px-4 sm:px-8 md:px-14 py-5 md:py-9 pb-10 md:pb-20 min-h-screen"
             style={{ background: 'linear-gradient(180deg, #F4EFE6 0%, #FAF8F5 200px, #FAF8F5 100%)' }}>

          <div className="relative z-[1]">
            <AutopartsWatermark />

            {/* ── Topbar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-9">
              <div className="flex items-center gap-1.5 text-[12.5px] text-muted tracking-[0.02em]">
                <span>Operaciones</span>
                <span className="opacity-50">/</span>
                <span className="text-ink">Caja</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-[38px] px-3.5 border border-hair bg-paper rounded-[10px] items-center gap-2 text-[13px] text-ink-2">
                  <IcoCal /><span>{dateStr}</span>
                </div>
                <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors relative"
                        title="Notificaciones">
                  <IcoBell />
                  <span className="absolute top-[9px] right-[10px] w-[7px] h-[7px] rounded-full bg-terra border-2 border-paper" />
                </button>
                <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors"
                        title="Configuración">
                  <IcoSettings />
                </button>
              </div>
            </div>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8 mb-7 md:mb-10">
              <div>
                <h1 className="font-serif text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] m-0 mb-2.5 text-ink">
                  Resumen de cierre<em className="italic text-terra">.</em>
                </h1>
                <p className="text-base text-muted max-w-[520px]">
                  Gestión de efectivo y movimientos de caja — registra ingresos, egresos y cierra tu jornada.
                </p>
              </div>
            </div>

            {/* ── Apertura screen ──────────────────────────────────────────── */}
            <AperturaScreen onAbrir={handleAbrir} />
          </div>
        </div>
      </MainLayout>
    )
  }

  // ── Pantalla: caja abierta ─────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="relative px-4 sm:px-8 md:px-14 py-5 md:py-9 pb-10 md:pb-20 min-h-screen"
           style={{ background: 'linear-gradient(180deg, #F4EFE6 0%, #FAF8F5 200px, #FAF8F5 100%)' }}>

        <div className="relative z-[1]">
          <AutopartsWatermark />

          {/* ── Topbar ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-9">
            <div className="flex items-center gap-1.5 text-[12.5px] text-muted tracking-[0.02em]">
              <span>Operaciones</span>
              <span className="opacity-50">/</span>
              <span className="text-ink">Caja</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-[38px] px-3.5 border border-hair bg-paper rounded-[10px] items-center gap-2 text-[13px] text-ink-2">
                <IcoCal /><span>{dateStr}</span>
              </div>
              <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors relative"
                      title="Notificaciones">
                <IcoBell />
                <span className="absolute top-[9px] right-[10px] w-[7px] h-[7px] rounded-full bg-terra border-2 border-paper" />
              </button>
              <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors"
                      title="Configuración">
                <IcoSettings />
              </button>
            </div>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8 mb-7 md:mb-10">
            <div>
              <h1 className="font-serif text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] m-0 mb-2.5 text-ink">
                Caja diaria<em className="italic text-terra">.</em>
              </h1>
              <p className="text-base text-muted max-w-[520px]">
                Gestión de efectivo y movimientos de caja — registra ingresos, egresos y cierra tu jornada.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={() => setShowCierre(true)}
                className="h-[46px] px-[22px] rounded-[12px] text-sm font-semibold flex items-center gap-2 bg-paper text-ink border border-hair hover:border-hair-2 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cerrar caja
              </button>
            </div>
          </div>

          {/* ── Metrics ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-7 md:mb-11">
            <WarmMetric
              label="Monto inicial"
              value={caja.montoInicial.toLocaleString('es-BO')}
              unit="Bs."
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              sublabel={`Apertura ${fmtTime(caja.fechaInicio)}`}
            />
            <WarmMetric
              label="Total ingresos"
              value={totalIngresos.toLocaleString('es-BO')}
              unit="Bs."
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              }
              sublabel={`${movimientos.filter(m => m.tipo === 'Ingreso').length} movimientos`}
            />
            <WarmMetric
              label="Total egresos"
              value={totalEgresos.toLocaleString('es-BO')}
              unit="Bs."
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              }
              sublabel={`${movimientos.filter(m => m.tipo === 'Egreso').length} movimientos`}
            />
            <WarmMetric
              label="Efectivo en caja"
              value={efectivoEsperado.toLocaleString('es-BO')}
              unit="Bs."
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              sublabel="Solo movimientos en efectivo"
            />
          </div>

          {/* ── Movements card ───────────────────────────────────────────── */}
          <div className="rounded-[18px] border border-hair overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(2px)' }}>

            {/* Toolbar */}
            <div className="flex items-center gap-3.5 px-4 md:px-7 py-4 md:py-[22px] border-b border-hair flex-wrap">
              <div>
                <span className="font-serif text-[28px] leading-[1] tracking-[-0.01em] text-ink">Movimientos</span>
                <span className="text-base text-muted ml-2.5 font-normal">
                  {movimientos.length}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
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

            {/* Table */}
            {movimientos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-muted">
                <div className="h-12 w-12 rounded-2xl bg-cream-2 border border-hair flex items-center justify-center mb-3">
                  <svg className="h-6 w-6 text-muted-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-ink-2 mb-1">Sin movimientos aún</p>
                <p className="text-xs text-muted max-w-xs">
                  Registra el primer ingreso o egreso del día
                </p>
              </div>
            ) : (
              <div className="divide-y divide-steel-50">
                {movimientos.map((mov) => (
                  <div key={mov.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-steel-50/50 transition-colors">
                    <div className={clsx(
                      'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                      mov.tipo === 'Ingreso' ? 'bg-emerald-50' : 'bg-red-50',
                    )}>
                      <svg className={clsx('h-4 w-4', mov.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-500')}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {mov.tipo === 'Ingreso'
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />}
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-steel-800 truncate">{mov.motivo}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <TipoBadge tipo={mov.tipo} />
                        <PagoBadge tipo_pago={mov.tipoPago} />
                        <span className="text-[11px] text-steel-400">{CATEGORIA_LABELS[mov.categoria]}</span>
                        <span className="text-[11px] text-steel-300">·</span>
                        <span className="text-[11px] text-steel-400">{fmtTime(mov.fecha)}</span>
                      </div>
                    </div>

                    <p className={clsx(
                      'text-sm font-bold tabular-nums shrink-0',
                      mov.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-500',
                    )}>
                      {mov.tipo === 'Ingreso' ? '+' : '−'}{mov.monto.toFixed(2)} Bs.
                    </p>
                  </div>
                ))}
              </div>
            )}

            {movimientos.length > 0 && (
              <div className="px-5 py-3.5 border-t border-steel-100 bg-steel-50/50 rounded-b-2xl flex items-center justify-between">
                <p className="text-xs text-steel-500">{movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}</p>
                <p className="text-xs font-bold text-steel-700">
                  Efectivo: <span className="text-steel-900 font-black">{efectivoEsperado.toFixed(2)} Bs.</span>
                </p>
              </div>
            )}
          </div>

        </div>

        {modalTipo && (
          <MovimientoModal
            tipo={modalTipo}
            onClose={() => setModalTipo(null)}
            onSave={handleGuardarMovimiento}
          />
        )}

        {showCierre && (
          <CierreCajaModal
            efectivoEsperado={efectivoEsperado}
            onClose={() => setShowCierre(false)}
            onConfirm={handleConfirmarCierre}
          />
        )}
      </div>
    </MainLayout>
  )
}