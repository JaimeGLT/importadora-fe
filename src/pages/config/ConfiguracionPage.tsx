import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button, Input, Modal, ConfirmModal } from '@/components/ui'
import { notify } from '@/lib/notify'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import { AutopartsWatermark } from '@/pages/inventario/AutopartsWatermark'
import type { DescuentoConfig } from '@/types'
import {
  DESCUENTOS_QUERY,
  MARGEN_GANANCIA_QUERY,
  CONFIG_VENTA_QUERY,
  TIPO_CAMBIO_QUERY,
  backendToDescuento,
  COLOR_STYLES,
  COLOR_OPTIONS,
  type DescuentoAPI,
  type MargenGananciaAPI,
  type ConfigVentaAPI,
  type TipoCambioAPI,
  type ModoPrecioCajero,
  MODO_PRECIO_LABELS,
} from '@/lib/queries/config.queries'

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
function IcoPlus() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  )
}

// ─── Descuento Card ────────────────────────────────────────────────────────────

function DescuentoCard({
  descuento,
  onEdit,
  onToggle,
  onDelete,
}: {
  descuento: DescuentoConfig
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const styles = COLOR_STYLES[descuento.color as keyof typeof COLOR_STYLES] || COLOR_STYLES.emerald

  return (
    <div className={clsx(
      'p-4 rounded-xl border-2 transition-all duration-200 flex flex-col',
      descuento.activo ? styles.border : 'border-steel-200 opacity-60',
      styles.bg
    )}>
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

      <div className="bg-white/70 rounded-lg px-3 py-2.5 mt-auto">
        <p className="text-[10px] text-steel-500 uppercase font-medium mb-1">Ejemplo (Bs 100)</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-steel-400 line-through">Bs 100.00</span>
          <svg className="w-3 h-3 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className={clsx('text-sm font-bold', styles.text)}>
            Bs {(100 * (1 - descuento.porcentaje / 100)).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Descuento Modal ─────────────────────────────────────────────────────────

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

  const handleSave = () => {
    if (!nombre.trim()) { notify.error('Nombre requerido'); return }
    const pct = parseFloat(porcentaje)
    if (isNaN(pct) || pct < 0.01 || pct > 100) { notify.error('Porcentaje inválido (0.01-100)'); return }
    onSave({ nombre: nombre.trim(), porcentaje: pct, color, activo: true })
    onClose()
  }

  const currentStyles = COLOR_STYLES[color as keyof typeof COLOR_STYLES] || COLOR_STYLES.emerald

  return (
    <Modal open={open} onClose={onClose} title={descuento ? 'Editar descuento' : 'Nuevo descuento'}>
      <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-semibold text-steel-600 mb-1.5">Nombre del descuento</label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Familia, Mecánico, Mayorista..."
            maxLength={100}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-steel-600 mb-1.5">Porcentaje de descuento</label>
          <Input
            type="number"
            min={0.01}
            max={100}
            step={0.01}
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-steel-600 mb-2">Color</label>
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

        <div className={clsx('p-4 rounded-xl border-2', currentStyles.bg, currentStyles.border)}>
          <div className="flex items-center gap-3">
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg bg-white shadow-sm', currentStyles.text)}>
              {porcentaje}%
            </div>
            <div>
              <p className={clsx('font-bold', currentStyles.text)}>{nombre || 'Nombre del descuento'}</p>
              <p className="text-xs text-steel-500">Activo</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1">{descuento ? 'Actualizar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ConfiguracionPage() {
  const { isTokenReady } = useAuth()

  const [loading, setLoading] = useState(true)
  const [descuentos, setDescuentos] = useState<DescuentoConfig[]>([])
  const [margenValor, setMargenValor] = useState(1.20)
  const [modoVenta, setModoVenta] = useState<ModoPrecioCajero>('PrecioImportacion')
  const [tipoCambioPrecio, setTipoCambioPrecio] = useState(0)
  const [tipoCambioFecha, setTipoCambioFecha] = useState('')
  const [tipoCambioHabilitado, setTipoCambioHabilitado] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingDescuento, setEditingDescuento] = useState<DescuentoConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DescuentoConfig | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [margenInput, setMargenInput] = useState('')
  const [margenEditando, setMargenEditando] = useState(false)
  const [modoEditando, setModoEditando] = useState(false)
  const [dolarBinance, setDolarBinance] = useState<{ compra: number; venta: number; fecha: string } | null>(null)
  const [confirmDolar, setConfirmDolar] = useState<number | null>(null)

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }, [])

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      gql<{ descuento: { nodes: DescuentoAPI[] } }>(DESCUENTOS_QUERY).then(r => r.descuento.nodes),
      gql<{ margenGanancia: MargenGananciaAPI }>(MARGEN_GANANCIA_QUERY).then(r => r.margenGanancia),
      gql<{ configVenta: ConfigVentaAPI[] }>(CONFIG_VENTA_QUERY).then(r => r.configVenta[0]),
      gql<{ tipoCambio: TipoCambioAPI }>(TIPO_CAMBIO_QUERY).then(r => r.tipoCambio),
    ])
      .then(([descuentosData, margenData, configData, tipoCambioData]) => {
        setDescuentos(descuentosData.map(backendToDescuento))
        if (margenData) {
          setMargenValor(margenData.valor)
          setMargenInput(((margenData.valor - 1) * 100).toFixed(0))
        }
        if (configData) {
          setModoVenta(configData.modoVenta as ModoPrecioCajero)
        }
        if (tipoCambioData) {
          setTipoCambioPrecio(tipoCambioData.precioDolar)
          setTipoCambioFecha(tipoCambioData.fecha)
          setTipoCambioHabilitado(tipoCambioData.precioDolar > 0)
        }
      })
      .catch(() => notify.error('Error cargando configuración'))
      .finally(() => setLoading(false))

    fetch('https://bo.dolarapi.com/v1/dolares/binance')
      .then(r => r.json())
      .then(data => {
        setDolarBinance({ compra: data.compra, venta: data.venta, fecha: data.fechaActualizacion })
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!isTokenReady) return
    loadAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenReady])

  const handleMargenGuardar = async () => {
    const parsed = parseFloat(margenInput)
    if (isNaN(parsed) || parsed < 0 || parsed > 500) {
      notify.error('Margen inválido (0-500%)')
      setMargenInput(((margenValor - 1) * 100).toFixed(0))
      return
    }
    const nuevoMargen = 1 + parsed / 100
    try {
      await api.post('/MargenGanancia', { valor: nuevoMargen })
      setMargenValor(nuevoMargen)
      setMargenEditando(false)
      notify.success('Margen actualizado')
    } catch (err) {
      notify.error((err as Error).message || 'Error al guardar margen')
      setMargenInput(((margenValor - 1) * 100).toFixed(0))
    }
  }

  const handleMargenCancelar = () => {
    setMargenInput(((margenValor - 1) * 100).toFixed(0))
    setMargenEditando(false)
  }

  const handleModoCambio = async (modo: ModoPrecioCajero) => {
    try {
      await api.post('/ConfigVenta', { modoVenta: modo })
      setModoVenta(modo)
      notify.success('Modo actualizado')
    } catch (err) {
      notify.error((err as Error).message || 'Error al guardar modo')
    }
  }

  const handleNew = () => { setEditingDescuento(null); setModalOpen(true) }
  const handleEdit = (d: DescuentoConfig) => { setEditingDescuento(d); setModalOpen(true) }

  const handleSaveDescuento = async (data: Omit<DescuentoConfig, 'id'>) => {
    try {
      if (editingDescuento) {
        await api.post(`/Descuento/${editingDescuento.id}`, {
          nombre: data.nombre,
          cantDescuento: data.porcentaje,
          color: data.color,
        })
        notify.success('Descuento actualizado')
      } else {
        await api.post('/Descuento', {
          nombre: data.nombre,
          cantDescuento: data.porcentaje,
          color: data.color,
        })
        notify.success('Descuento creado')
      }
      loadAll()
    } catch (err) {
      notify.error((err as Error).message || 'Error al guardar descuento')
    }
  }

  const handleToggle = async (d: DescuentoConfig) => {
    try {
      await api.put(`/Descuento/Estado/${d.id}`)
      loadAll()
      notify.success(d.activo ? 'Descuento desactivado' : 'Descuento activado')
    } catch (err) {
      notify.error((err as Error).message || 'Error al cambiar estado')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await api.delete(`/Descuento/${deleteConfirm.id}`)
      notify.success('Descuento eliminado')
      setDeleteConfirm(null)
      loadAll()
    } catch (err) {
      notify.error((err as Error).message || 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

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
              <span className="text-ink">Sistema</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-[38px] px-3.5 border border-hair bg-paper rounded-[10px] items-center gap-2 text-[13px] text-ink-2">
                <IcoCal /><span>{dateStr}</span>
              </div>
              <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors relative">
                <IcoBell />
                <span className="absolute top-[9px] right-[10px] w-[7px] h-[7px] rounded-full bg-terra border-2 border-paper" />
              </button>
              <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors">
                <IcoSettings />
              </button>
            </div>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8 mb-7 md:mb-10">
            <div>
              <h1 className="font-serif text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] m-0 mb-2.5 text-ink">
                Configuración<em className="italic text-terra">.</em>
              </h1>
              <p className="text-base text-muted max-w-[520px]">
                Gestión de parámetros del sistema — descuentos, precios y configuración de venta.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={handleNew}
                className="h-[46px] px-[22px] rounded-[12px] text-sm font-semibold flex items-center gap-2 bg-terra text-white hover:bg-terra-deep transition-all hover:-translate-y-px active:translate-y-0"
                style={{ boxShadow: '0 1px 2px rgba(200,80,31,0.3), 0 6px 16px -8px rgba(200,80,31,0.5)' }}>
                <IcoPlus /> <span>Nuevo descuento</span>
              </button>
            </div>
          </div>

          {/* ── Descuentos Card ────────────────────────────────────────────── */}
          <div className="rounded-[18px] border border-hair overflow-hidden mb-5"
               style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(2px)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-hair">
              <div className="w-1 h-4 rounded-full bg-brand-600" />
              <span className="font-serif text-[22px] leading-[1] tracking-[-0.01em] text-ink">Descuentos especiales</span>
            </div>
            {loading ? (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-36 rounded-xl bg-cream animate-pulse" />)}
              </div>
            ) : descuentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted mb-3">No hay descuentos configurados</p>
                <button onClick={handleNew} className="h-[38px] px-4 rounded-[10px] bg-terra text-white text-sm font-semibold flex items-center gap-2 hover:bg-terra-deep">
                  <IcoPlus /> Agregar descuento
                </button>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {descuentos.map(d => (
                  <DescuentoCard
                    key={d.id}
                    descuento={d}
                    onEdit={() => handleEdit(d)}
                    onToggle={() => handleToggle(d)}
                    onDelete={() => setDeleteConfirm(d)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Precios Card ──────────────────────────────────────────────── */}
          <div className="rounded-[18px] border border-hair overflow-hidden mb-5"
               style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(2px)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-hair">
              <div className="w-1 h-4 rounded-full bg-emerald-500" />
              <span className="font-serif text-[22px] leading-[1] tracking-[-0.01em] text-ink">Configuración de precios</span>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Margen de ganancia */}
              <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-700">Margen de ganancia</h3>
                    <span className="text-[10px] text-emerald-600">Usado en cálculo con dólar</span>
                  </div>
                </div>
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                  <div className="w-full lg:flex-1">
                    {margenEditando ? (
                      <Input
                        type="number"
                        min={0}
                        max={500}
                        step={1}
                        value={margenInput}
                        onChange={(e) => setMargenInput(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div className="h-[38px] px-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 flex items-center">
                        <span className="text-lg font-black text-emerald-700">{((margenValor - 1) * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!margenEditando ? (
                      <button
                        onClick={() => setMargenEditando(true)}
                        className="h-[38px] px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shrink-0"
                      >
                        Editar
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleMargenGuardar}
                          className="h-[38px] px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Guardar
                        </button>
                        <button
                          onClick={handleMargenCancelar}
                          className="h-[38px] px-3 rounded-xl bg-steel-200 text-steel-600 text-xs font-bold hover:bg-steel-300 transition-colors flex items-center justify-center shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                  <div className="text-left lg:text-right shrink-0" style={{ minWidth: 80 }}>
                    <p className="text-[10px] text-emerald-600 uppercase tracking-widest">Actual</p>
                    <p className="text-xl font-black text-emerald-700">{((margenValor - 1) * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              {/* Modo precio cajeros */}
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-700">Precio para cajeros</h3>
                    <span className="text-[10px] text-amber-600">Lo que ve el operador</span>
                  </div>
                  {!modoEditando ? (
                    <button
                      onClick={() => setModoEditando(true)}
                      className="h-[32px] px-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-200 transition-colors shrink-0"
                    >
                      Editar
                    </button>
                  ) : (
                    <button
                      onClick={() => setModoEditando(false)}
                      className="h-[32px] px-3 rounded-xl bg-steel-200 text-steel-600 text-xs font-bold hover:bg-steel-300 transition-colors flex items-center justify-center shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {(['PrecioImportacion', 'PrecioDolarDia', 'Ambos'] as ModoPrecioCajero[]).map(modo => (
                    <button
                      key={modo}
                      onClick={() => modoEditando ? handleModoCambio(modo) : undefined}
                      className={clsx(
                        'flex-[1_1_100%] sm:flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all',
                        modoVenta === modo
                          ? 'border-amber-500 bg-amber-100 text-amber-700'
                          : modoEditando
                            ? 'border-amber-200 bg-white text-amber-600 hover:border-amber-300 cursor-pointer'
                            : 'border-amber-200 bg-white/50 text-amber-300 cursor-not-allowed'
                      )}
                      disabled={!modoEditando}
                    >
                      {MODO_PRECIO_LABELS[modo]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Precio dólar Card ──────────────────────────────────────────── */}
          <div className="rounded-[18px] border border-hair overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(2px)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-hair">
              <div className="w-1 h-4 rounded-full bg-blue-500" />
              <span className="font-serif text-[22px] leading-[1] tracking-[-0.01em] text-ink">Precio del dólar</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Dólar hoy */}
                <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-500 flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-700">Dólar hoy</h3>
                      <span className="text-[10px] text-blue-500">Referencia mercado</span>
                    </div>
                  </div>
                  {dolarBinance ? (
                    <div>
                      <p className="text-2xl font-black text-blue-700 mb-1">Bs {dolarBinance.venta.toFixed(2)}</p>
                      <p className="text-[10px] text-blue-500">
                        Compra: Bs {dolarBinance.compra.toFixed(2)} · {new Date(dolarBinance.fecha).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  ) : (
                    <div className="animate-pulse space-y-2">
                      <div className="h-7 w-24 rounded bg-blue-200" />
                      <div className="h-3 w-32 rounded bg-blue-200" />
                    </div>
                  )}
                </div>

                {/* Precio del sistema */}
                <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-emerald-700">Precio del sistema</h3>
                      <span className="text-[10px] text-emerald-500">Usado en ventas</span>
                    </div>
                    <span className={clsx(
                      'text-[10px] font-bold px-2 py-1 rounded-full shrink-0',
                      tipoCambioHabilitado
                        ? 'bg-emerald-200 text-emerald-700'
                        : 'bg-red-200 text-red-700'
                    )}>
                      {tipoCambioHabilitado ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-black text-emerald-700">
                        {tipoCambioPrecio > 0 ? `Bs ${tipoCambioPrecio.toFixed(2)}` : 'No establecido'}
                      </p>
                      {tipoCambioFecha && (
                        <p className="text-[10px] text-emerald-500 mt-0.5">
                          Actualizado: {new Date(tipoCambioFecha).toLocaleDateString('es-BO')}
                        </p>
                      )}
                    </div>
                    {dolarBinance && (
                      <button
                        onClick={() => setConfirmDolar(dolarBinance.venta)}
                        className="h-[36px] px-3 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shrink-0 flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Actualizar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DescuentoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveDescuento}
          descuento={editingDescuento}
        />

        <ConfirmModal
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => void handleDelete()}
          title="Eliminar descuento"
          message={`¿Eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
          loading={deleting}
        />

        <ConfirmModal
          open={confirmDolar !== null}
          onClose={() => setConfirmDolar(null)}
          onConfirm={async () => {
            if (confirmDolar === null) return
            try {
              await api.post('/TipoCambio', { precioDolar: confirmDolar })
              setTipoCambioPrecio(confirmDolar)
              setTipoCambioFecha(new Date().toISOString())
              setTipoCambioHabilitado(true)
              setConfirmDolar(null)
              notify.success('Precio del dólar actualizado')
            } catch (err) {
              notify.error((err as Error).message || 'Error al actualizar dólar')
            }
          }}
          title="Actualizar precio del dólar"
          message={`El dólar hoy está a Bs ${confirmDolar?.toFixed(2)}. ¿Actualizar el precio del sistema de Bs ${tipoCambioPrecio.toFixed(2)} a Bs ${confirmDolar?.toFixed(2)}?`}
        />
      </div>
    </MainLayout>
  )
}