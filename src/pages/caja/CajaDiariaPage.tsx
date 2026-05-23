import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button, Input, Select, Modal } from '@/components/ui'
import { notify } from '@/lib/notify'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { MI_CAJA_QUERY, backendToCaja, type CajaAPI } from '@/lib/queries/caja.queries'
import type { Caja, MovimientoCaja, CierreCajaResponse } from '@/types'

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
  Efectivo: { label: 'Efectivo', style: 'bg-[#f1f5f9] text-[#5a5670]' },
  QR:       { label: 'QR',       style: 'bg-[#ede9fe] text-[#7c3aed]' },
  Tarjeta:  { label: 'Tarjeta',  style: 'bg-[#dbeafe] text-[#1d4ed8]' },
}

type TipoBackend = 'ingreso' | 'egreso'

// ─── Shared TopBar ────────────────────────────────────────────────────────────

function CajaTopBar({ dateStr }: { dateStr: string }) {
  return (
    <header className="bg-[#f1f5f9] sticky top-0 z-40 flex justify-between items-center w-full h-[62px] px-7 border-b border-[#e2e8f0]">
      <div className="flex items-center gap-2 text-sm text-[#9996b0] font-semibold">
        <span>Operaciones</span>
        <span className="text-[10px] opacity-40">/</span>
        <strong className="text-[#1e1b2e] font-bold">Caja</strong>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex bg-white px-3.5 py-1.5 rounded-xl items-center gap-2 border-[1.5px] border-[#e2e8f0]">
          <i className="ti ti-calendar text-[#9996b0] text-[15px]" />
          <span className="text-xs font-semibold text-[#5a5670]">{dateStr}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-white border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#f1f5f9] transition-colors relative"
            title="Notificaciones"
          >
            <i className="ti ti-bell text-[18px]" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
          </button>
          <button
            className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-white border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#f1f5f9] transition-colors"
            title="Configuración"
          >
            <i className="ti ti-settings text-[18px]" />
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────

interface CajaMetricCardProps {
  label: string
  value: string
  sublabel: string
  iconClass: string
  gradFrom: string
  gradTo: string
  badgeBg: string
  badgeColor: string
  badgeText: string
  badgeIcon: string
  highlight?: boolean
  highlightColor?: string
}

function CajaMetricCard({
  label, value, sublabel, iconClass, gradFrom, gradTo,
  badgeBg, badgeColor, badgeText, badgeIcon, highlight, highlightColor,
}: CajaMetricCardProps) {
  return (
    <div className={clsx(
      'rounded-2xl border-[1.5px] p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200',
      highlight ? 'border-[1.5px]' : 'bg-white border-[#e2e8f0]',
    )}
      style={highlight ? { background: `${gradFrom}08`, borderColor: `${gradFrom}40` } : {}}
    >
      <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-10" style={{ background: gradFrom }} />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3.5"
        style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
      >
        <i className={`${iconClass} text-xl`} />
      </div>
      <div
        className="font-black text-[26px] text-[#1e1b2e] leading-none"
        style={{ fontFamily: 'Nunito, sans-serif', color: highlight ? highlightColor : undefined }}
      >
        {value} <span className="text-sm font-bold text-[#9996b0]">Bs.</span>
      </div>
      <div className="text-xs font-semibold text-[#9996b0] mt-1">{label}</div>
      <div
        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-2"
        style={{ background: badgeBg, color: badgeColor }}
      >
        <i className={`${badgeIcon} text-[11px]`} />
        {badgeText}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] mb-3.5" />
          <div className="h-7 w-28 rounded bg-[#f1f5f9] mb-2" />
          <div className="h-3 w-20 rounded bg-[#e2e8f0] mb-2" />
          <div className="h-5 w-16 rounded-full bg-[#f1f5f9]" />
        </div>
      ))}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PagoBadge({ tipo_pago }: { tipo_pago: MovimientoCaja['tipoPago'] }) {
  const cfg = TIPO_PAGO_CONFIG[tipo_pago]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${cfg.style}`}>
      {cfg.label}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: MovimientoCaja['tipo'] }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide',
      tipo === 'Ingreso' ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#fee2e2] text-[#dc2626]',
    )}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', tipo === 'Ingreso' ? 'bg-[#059669]' : 'bg-[#dc2626]')} />
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
          { value: 'Ventas',        label: 'Ventas' },
          { value: 'Transferencia', label: 'Transferencia' },
          { value: 'OtroIngreso',   label: 'Otro ingreso' },
        ]
      : [
          { value: 'Compra',         label: 'Compra' },
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

  return (
    <Modal open onClose={onClose} title={isIngreso ? 'Registrar ingreso' : 'Registrar egreso'}>
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className={clsx(
          'flex items-center gap-3 p-3 rounded-xl border-[1.5px]',
          isIngreso ? 'bg-[#d1fae5]/30 border-[#6ee7b7]/50' : 'bg-[#fee2e2]/30 border-[#fca5a5]/50',
        )}>
          <div className={clsx(
            'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
            isIngreso ? 'bg-[#059669]' : 'bg-[#dc2626]',
          )}>
            <i className={clsx('text-white text-[17px]', isIngreso ? 'ti ti-plus' : 'ti ti-minus')} />
          </div>
          <div>
            <p className={clsx(
              'text-xs font-bold uppercase tracking-wide',
              isIngreso ? 'text-[#059669]' : 'text-[#dc2626]',
            )}>
              {isIngreso ? 'Entrada de dinero' : 'Salida de dinero'}
            </p>
            <p className="text-[11px] text-[#9996b0] font-semibold">
              {tipoPago !== 'Efectivo' ? 'No afecta el efectivo físico en caja' : 'Afecta el efectivo físico en caja'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#5a5670] uppercase tracking-wide mb-1.5">Categoría</label>
            <Select value={categoria} options={categorias}
              onChange={e => setCategoria(e.target.value as MovimientoCaja['categoria'])} />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#5a5670] uppercase tracking-wide mb-1.5">Tipo de pago</label>
            <Select value={tipoPago} options={tiposPago}
              onChange={e => setTipoPago(e.target.value as MovimientoCaja['tipoPago'])} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#5a5670] uppercase tracking-wide mb-1.5">Monto (Bs)</label>
          <Input type="number" min="0.01" step="0.01" placeholder="0.00"
            value={monto} onChange={e => setMonto(e.target.value)} autoFocus />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#5a5670] uppercase tracking-wide mb-1.5">Motivo</label>
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
        <div className="p-4 rounded-xl bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0]">
          <p className="text-[11px] font-bold text-[#9996b0] uppercase tracking-wide mb-1">Efectivo esperado en caja</p>
          <p className="text-2xl font-black tabular-nums text-[#1e1b2e]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {efectivoEsperado.toFixed(2)} Bs.
          </p>
          <p className="text-[11px] text-[#9996b0] font-semibold mt-1">Calculado solo con movimientos en efectivo</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#5a5670] uppercase tracking-wide mb-1.5">
            Monto que contaste físicamente (Bs)
          </label>
          <Input type="number" min="0" step="0.01" placeholder="0.00"
            value={montoContado} onChange={e => setMontoContado(e.target.value)} autoFocus />
        </div>

        {contadoValido && diferencia !== null && (
          <div className={clsx(
            'flex items-center justify-between p-4 rounded-xl border-[1.5px]',
            diferencia === 0
              ? 'bg-[#d1fae5]/30 border-[#6ee7b7]/50'
              : esSobrante
                ? 'bg-[#dbeafe]/30 border-[#93c5fd]/50'
                : 'bg-[#fee2e2]/30 border-[#fca5a5]/50',
          )}>
            <div>
              <p className={clsx(
                'text-[11px] font-bold uppercase tracking-wide',
                diferencia === 0 ? 'text-[#059669]' : esSobrante ? 'text-[#1d4ed8]' : 'text-[#dc2626]',
              )}>
                {diferencia === 0 ? 'Cuadrado' : esSobrante ? 'Sobrante' : 'Faltante'}
              </p>
              <p className="text-xs text-[#9996b0] font-semibold mt-0.5">
                {diferencia === 0
                  ? 'El monto coincide con el sistema'
                  : esSobrante
                    ? 'Hay más efectivo del esperado en sistema'
                    : 'Falta efectivo según registros del sistema'}
              </p>
            </div>
            <p className={clsx(
              'text-xl font-black tabular-nums',
              diferencia === 0 ? 'text-[#059669]' : esSobrante ? 'text-[#1d4ed8]' : 'text-[#dc2626]',
            )}>
              {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)} Bs.
            </p>
          </div>
        )}

        {esFaltante && (
          <div>
            <label className="block text-xs font-bold text-[#dc2626] uppercase tracking-wide mb-1.5">
              Justificación del faltante *
            </label>
            <Input type="text" placeholder="Ej: Billete falso, error de vuelto, robo..."
              value={justificacion} onChange={e => setJustificacion(e.target.value)} maxLength={200} />
            <p className="text-[10px] text-[#9996b0] font-semibold mt-1">Campo obligatorio cuando hay faltante.</p>
          </div>
        )}

        {contadoValido && !esFaltante && (
          <div>
            <label className="block text-xs font-bold text-[#5a5670] uppercase tracking-wide mb-1.5">
              Motivo (opcional)
            </label>
            <Input type="text" placeholder="Ej: Ajuste por tolerancia, ingreso extra..."
              value={justificacion} onChange={e => setJustificacion(e.target.value)} maxLength={200} />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={!puedeCerrar()}>Cerrar caja</Button>
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
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div
            className="w-16 h-16 bg-gradient-to-br from-[#0284c7] to-[#7c3aed] rounded-2xl flex items-center justify-center text-white"
            style={{ boxShadow: '0 6px 18px rgba(2,132,199,0.30)' }}
          >
            <i className="ti ti-cash-register text-[30px]" />
          </div>
        </div>
        <div className="text-center mb-6">
          <h2 className="font-black text-[28px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Abrir caja
          </h2>
          <p className="text-sm text-[#9996b0] font-semibold mt-2">{dateStr}</p>
          <p className="text-xs text-[#9996b0] mt-1">Registra el efectivo con el que inicias el día</p>
        </div>
        <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#5a5670] uppercase tracking-wide mb-1.5">
                Monto inicial en efectivo (Bs)
              </label>
              <Input type="number" min="0" step="0.01" placeholder="0.00"
                value={monto} onChange={e => setMonto(e.target.value)} autoFocus disabled={loading} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-[18px] py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold active:scale-95 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <i className="ti ti-loader-2 animate-spin text-[17px]" />
                  Abriendo…
                </>
              ) : (
                <>
                  <i className="ti ti-lock-open text-base" />
                  Abrir caja
                </>
              )}
            </button>
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <MainLayout>
        <div className="bg-[#f1f5f9] min-h-screen">
          <CajaTopBar dateStr={dateStr} />
          <div className="px-7 py-6 max-w-[1400px] mx-auto">
            <div className="flex items-center gap-3.5 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#e2e8f0] animate-pulse" />
              <div className="space-y-2">
                <div className="h-8 w-40 rounded-xl bg-[#e2e8f0] animate-pulse" />
                <div className="h-3 w-52 rounded bg-[#f1f5f9] animate-pulse" />
              </div>
            </div>
            <MetricsSkeleton />
            <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] h-64 animate-pulse" />
          </div>
        </div>
      </MainLayout>
    )
  }

  // ── Resumen de cierre ──────────────────────────────────────────────────────
  if (resumenCierre) {
    return (
      <MainLayout>
        <div className="bg-[#f1f5f9] min-h-screen">
          <CajaTopBar dateStr={dateStr} />
          <div className="px-7 py-6 max-w-[1400px] mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div className="flex items-center gap-3.5">
                <div
                  className="w-12 h-12 bg-gradient-to-br from-[#059669] to-[#0284c7] rounded-2xl flex items-center justify-center text-white shrink-0"
                  style={{ boxShadow: '0 6px 18px rgba(5,150,105,0.28)' }}
                >
                  <i className="ti ti-circle-check text-2xl" />
                </div>
                <div>
                  <h2 className="font-black text-[34px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    Resumen de cierre
                  </h2>
                  <p className="text-sm text-[#9996b0] font-semibold mt-0.5">
                    Reporte completo de la jornada
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResumenCierre(null)}
                className="px-[18px] py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold active:scale-95 transition-all shadow-md w-full md:w-auto"
              >
                <i className="ti ti-plus text-base" />
                Nueva caja
              </button>
            </div>

            {/* Resumen container */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] overflow-hidden">

              {/* Success banner */}
              <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center gap-3 bg-[#d1fae5]/30">
                <div className="w-10 h-10 rounded-xl bg-[#d1fae5] border-[1.5px] border-[#6ee7b7] flex items-center justify-center shrink-0">
                  <i className="ti ti-circle-check text-[#059669] text-xl" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1e1b2e]">Caja cerrada exitosamente</p>
                  <p className="text-xs text-[#9996b0] font-semibold">
                    {new Date(resumenCierre.fechaCierre).toLocaleDateString('es-BO', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })} — {new Date(resumenCierre.fechaCierre).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Totales generales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  {[
                    { label: 'Monto inicial', value: resumenCierre.montoInicial, from: '#9996b0', to: '#e2e8f0', textColor: '#1e1b2e' },
                    { label: 'Total ingresos', value: resumenCierre.totalIngresos, from: '#059669', to: '#4eddc4', textColor: '#059669' },
                    { label: 'Total egresos', value: resumenCierre.totalEgresos, from: '#dc2626', to: '#ff9090', textColor: '#dc2626' },
                    { label: 'Efectivo esperado', value: resumenCierre.efectivoEsperado, from: '#0284c7', to: '#60a5fa', textColor: '#1e1b2e' },
                  ].map(({ label, value, from, to, textColor }) => (
                    <div key={label} className="bg-[#f1f5f9] rounded-xl p-4 border-[1.5px] border-[#e2e8f0]">
                      <p className="text-[11px] font-bold text-[#9996b0] uppercase tracking-wide mb-2">{label}</p>
                      <p className="font-black text-xl leading-none" style={{ color: textColor, fontFamily: 'Nunito, sans-serif' }}>
                        {value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        <span className="text-sm font-bold text-[#9996b0] ml-1">Bs.</span>
                      </p>
                    </div>
                  ))}
                </div>

                {/* Ingresos por tipo de pago */}
                <div>
                  <p className="text-[11px] font-bold text-[#9996b0] uppercase tracking-wide mb-3">Ingresos por tipo de pago</p>
                  <div className="grid grid-cols-3 gap-3.5">
                    <div className="bg-[#f1f5f9] rounded-xl p-4 border-[1.5px] border-[#e2e8f0]">
                      <p className="text-xs font-bold text-[#5a5670] mb-1">Efectivo</p>
                      <p className="text-lg font-black text-[#1e1b2e]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                        {resumenCierre.ingresoEfectivo.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.
                      </p>
                    </div>
                    <div className="bg-[#ede9fe]/40 rounded-xl p-4 border-[1.5px] border-[#c4b5fd]/50">
                      <p className="text-xs font-bold text-[#7c3aed] mb-1">QR</p>
                      <p className="text-lg font-black text-[#7c3aed]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                        {resumenCierre.ingresoQR.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.
                      </p>
                    </div>
                    <div className="bg-[#dbeafe]/40 rounded-xl p-4 border-[1.5px] border-[#93c5fd]/50">
                      <p className="text-xs font-bold text-[#1d4ed8] mb-1">Tarjeta</p>
                      <p className="text-lg font-black text-[#1d4ed8]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                        {resumenCierre.ingresoTarjeta.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.
                      </p>
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
                      'flex items-center justify-between p-5 rounded-xl border-[1.5px]',
                      esCuadrado
                        ? 'bg-[#d1fae5]/30 border-[#6ee7b7]/50'
                        : esFaltante
                          ? 'bg-[#fee2e2]/30 border-[#fca5a5]/50'
                          : 'bg-[#dbeafe]/30 border-[#93c5fd]/50',
                    )}>
                      <div>
                        <p className={clsx(
                          'text-xs font-bold uppercase tracking-wide',
                          esCuadrado ? 'text-[#059669]' : esFaltante ? 'text-[#dc2626]' : 'text-[#1d4ed8]',
                        )}>
                          {esCuadrado ? 'Caja cuadrada' : esFaltante ? 'Faltante' : 'Sobrante'}
                        </p>
                        <p className="text-xs text-[#9996b0] font-semibold mt-0.5">
                          {esCuadrado
                            ? 'El monto contado coincide con el sistema'
                            : esFaltante
                              ? 'Falta efectivo según registros del sistema'
                              : 'Excedente de efectivo según registros'}
                        </p>
                        {resumenCierre.justificacion && (
                          <p className="text-[11px] text-[#9996b0] mt-1 italic">"{resumenCierre.justificacion}"</p>
                        )}
                      </div>
                      <p className={clsx(
                        'text-2xl font-black tabular-nums',
                        esCuadrado ? 'text-[#059669]' : esFaltante ? 'text-[#dc2626]' : 'text-[#1d4ed8]',
                      )} style={{ fontFamily: 'Nunito, sans-serif' }}>
                        {diferencia >= 0 ? '+' : ''}{diferencia.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.
                      </p>
                    </div>
                  )
                })()}

                {/* Efectivo contado */}
                <div className="flex items-center justify-between p-5 rounded-xl bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0]">
                  <div>
                    <p className="text-[11px] font-bold text-[#9996b0] uppercase tracking-wide">Efectivo contado</p>
                    <p className="text-xs text-[#9996b0] font-semibold mt-0.5">Lo que contaste físicamente en caja</p>
                  </div>
                  <p className="text-2xl font-black text-[#1e1b2e]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    {resumenCierre.montoContado.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </MainLayout>
    )
  }

  // ── Caja cerrada — pantalla apertura ───────────────────────────────────────
  if (!caja) {
    return (
      <MainLayout>
        <div className="bg-[#f1f5f9] min-h-screen">
          <CajaTopBar dateStr={dateStr} />
          <div className="px-7 py-6 max-w-[1400px] mx-auto">
            <AperturaScreen onAbrir={handleAbrir} />
          </div>
        </div>
      </MainLayout>
    )
  }

  // ── Caja abierta ───────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="bg-[#f1f5f9] min-h-screen">
        <CajaTopBar dateStr={dateStr} />

        <div className="px-7 py-6 max-w-[1400px] mx-auto">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 bg-gradient-to-br from-[#0284c7] to-[#7c3aed] rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ boxShadow: '0 6px 18px rgba(2,132,199,0.28)' }}
              >
                <i className="ti ti-cash-register text-2xl" />
              </div>
              <div>
                <h2 className="font-black text-[34px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Caja diaria
                </h2>
                <p className="text-sm text-[#9996b0] font-semibold mt-0.5">
                  Gestión de efectivo y movimientos — registra ingresos, egresos y cierra tu jornada
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCierre(true)}
              className="px-[18px] py-2.5 bg-white border-[1.5px] border-[#e2e8f0] rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold text-[#5a5670] hover:bg-[#f1f5f9] transition-all w-full md:w-auto"
            >
              <i className="ti ti-lock text-base" />
              Cerrar caja
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
            <CajaMetricCard
              label="Monto inicial"
              value={caja.montoInicial.toLocaleString('es-BO')}
              sublabel={`Apertura ${fmtTime(caja.fechaInicio)}`}
              iconClass="ti ti-cash"
              gradFrom="#0284c7"
              gradTo="#60a5fa"
              badgeBg="#e0f2fe"
              badgeColor="#0284c7"
              badgeText={`apertura ${fmtTime(caja.fechaInicio)}`}
              badgeIcon="ti ti-clock"
            />
            <CajaMetricCard
              label="Total ingresos"
              value={totalIngresos.toLocaleString('es-BO')}
              sublabel={`${movimientos.filter(m => m.tipo === 'Ingreso').length} movimientos`}
              iconClass="ti ti-trending-up"
              gradFrom="#059669"
              gradTo="#4eddc4"
              badgeBg="#d1fae5"
              badgeColor="#059669"
              badgeText={`${movimientos.filter(m => m.tipo === 'Ingreso').length} movimientos`}
              badgeIcon="ti ti-arrow-up"
              highlight
              highlightColor="#059669"
            />
            <CajaMetricCard
              label="Total egresos"
              value={totalEgresos.toLocaleString('es-BO')}
              sublabel={`${movimientos.filter(m => m.tipo === 'Egreso').length} movimientos`}
              iconClass="ti ti-trending-down"
              gradFrom="#dc2626"
              gradTo="#ff9090"
              badgeBg="#fee2e2"
              badgeColor="#dc2626"
              badgeText={`${movimientos.filter(m => m.tipo === 'Egreso').length} movimientos`}
              badgeIcon="ti ti-arrow-down"
              highlight
              highlightColor="#dc2626"
            />
            <CajaMetricCard
              label="Efectivo en caja"
              value={efectivoEsperado.toLocaleString('es-BO')}
              sublabel="Solo movimientos en efectivo"
              iconClass="ti ti-wallet"
              gradFrom="#7c3aed"
              gradTo="#a78bfa"
              badgeBg="#ede9fe"
              badgeColor="#7c3aed"
              badgeText="solo efectivo"
              badgeIcon="ti ti-building-bank"
            />
          </div>

          {/* Movements container */}
          <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] overflow-hidden">

            {/* Toolbar */}
            <div className="px-5 py-[18px] border-b border-[#e2e8f0] flex flex-wrap justify-between items-center gap-3">
              <h3 className="text-lg font-extrabold text-[#1e1b2e] flex items-center gap-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Movimientos
                <span className="bg-[#dbeafe] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {movimientos.length}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalTipo('egreso')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#fee2e2] text-[#dc2626] hover:bg-[#fca5a5]/30 border-[1.5px] border-[#fca5a5]/50 transition-colors"
                >
                  <i className="ti ti-minus text-[13px]" />
                  Egreso
                </button>
                <button
                  onClick={() => setModalTipo('ingreso')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#d1fae5] text-[#059669] hover:bg-[#6ee7b7]/30 border-[1.5px] border-[#6ee7b7]/50 transition-colors"
                >
                  <i className="ti ti-plus text-[13px]" />
                  Ingreso
                </button>
              </div>
            </div>

            {/* Movements list */}
            {movimientos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-white border-[1.5px] border-[#e2e8f0] flex items-center justify-center mb-4">
                  <i className="ti ti-receipt text-[#9996b0] text-xl" />
                </div>
                <p className="text-sm font-bold text-[#1e1b2e] mb-1">Sin movimientos aún</p>
                <p className="text-xs text-[#9996b0] font-semibold max-w-xs">
                  Registra el primer ingreso o egreso del día
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e2e8f0]">
                {movimientos.map((mov) => (
                  <div key={mov.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#faf9ff] transition-colors">
                    <div className={clsx(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                      mov.tipo === 'Ingreso' ? 'bg-[#d1fae5]' : 'bg-[#fee2e2]',
                    )}>
                      <i className={clsx(
                        'text-[17px]',
                        mov.tipo === 'Ingreso' ? 'ti ti-arrow-up text-[#059669]' : 'ti ti-arrow-down text-[#dc2626]',
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1e1b2e] truncate">{mov.motivo}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <TipoBadge tipo={mov.tipo} />
                        <PagoBadge tipo_pago={mov.tipoPago} />
                        <span className="text-[11px] text-[#9996b0] font-semibold">{CATEGORIA_LABELS[mov.categoria]}</span>
                        <span className="text-[11px] text-[#e2e8f0]">·</span>
                        <span className="text-[11px] text-[#9996b0] font-semibold">{fmtTime(mov.fecha)}</span>
                      </div>
                    </div>

                    <p className={clsx(
                      'text-sm font-black tabular-nums shrink-0',
                      mov.tipo === 'Ingreso' ? 'text-[#059669]' : 'text-[#dc2626]',
                    )}>
                      {mov.tipo === 'Ingreso' ? '+' : '−'}{mov.monto.toFixed(2)} Bs.
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            {movimientos.length > 0 && (
              <div className="px-5 py-3.5 bg-[#f1f5f9] border-t border-[#e2e8f0] flex items-center justify-between">
                <p className="text-xs font-semibold text-[#9996b0]">
                  {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs font-bold text-[#5a5670]">
                  Efectivo: <span className="text-[#1e1b2e] font-black">{efectivoEsperado.toFixed(2)} Bs.</span>
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
