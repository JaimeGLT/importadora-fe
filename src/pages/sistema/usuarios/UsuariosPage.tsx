import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { notify } from '@/lib/notify'
import { api } from '@/lib/api'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HorarioAPI {
  horaInicio: string // "HH:mm"
  horaFin: string   // "HH:mm"
  activo: boolean
}

interface UsuarioAPI {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  activo: boolean
  bloqueadoHasta: string | null
  horario: HorarioAPI | null
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function IcoUser() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function IcoLock() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
function IcoClock() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
function IcoCalendar() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  )
}
function IcoGlobe() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}
function IcoSearch() {
  return (
    <svg className="h-4 w-4 text-steel-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
    </svg>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROL_LABELS: Record<string, string> = {
  Admin: 'Administrador',
  Cajero: 'Cajero',
  Almacenero: 'Almacenero',
  Operador: 'Operador',
}

function fmtBloqueo(bloqueadoHasta: string | null): string | null {
  if (!bloqueadoHasta) return null
  const d = new Date(bloqueadoHasta)
  if (d.getFullYear() > 9000) return null
  return d.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })
}

function localISOString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── HorarioModal (individual recurrente) ────────────────────────────────────

function HorarioModal({
  usuario,
  onClose,
  onSuccess,
}: {
  usuario: UsuarioAPI
  onClose: () => void
  onSuccess: (u: UsuarioAPI) => void
}) {
  const [horaInicio, setHoraInicio] = useState(usuario.horario?.horaInicio ?? '20:00')
  const [horaFin,    setHoraFin]    = useState(usuario.horario?.horaFin    ?? '08:00')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const cruzaMedianoche = horaInicio > horaFin

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/Usuario/${usuario.id}/horario`, { horaInicio, horaFin })
      notify.success('Horario guardado', {
        description: `${usuario.nombre} bloqueado de ${horaInicio} a ${horaFin}${cruzaMedianoche ? ' (cruza medianoche)' : ''}`,
      })
      onSuccess({ ...usuario, horario: { horaInicio, horaFin, activo: true } })
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al guardar horario')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar el horario recurrente de este usuario?')) return
    setDeleting(true)
    try {
      await api.delete(`/Usuario/${usuario.id}/horario`)
      notify.success('Horario eliminado')
      onSuccess({ ...usuario, horario: null })
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al eliminar horario')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-steel-100">
        <div className="px-6 pt-5 pb-4 border-b border-steel-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
              <IcoClock />
            </div>
            <div>
              <p className="font-semibold text-steel-900 text-sm">Horario de bloqueo recurrente</p>
              <p className="text-[11px] text-steel-400">{usuario.nombre} {usuario.apellido}</p>
            </div>
            <button onClick={onClose} className="ml-auto text-steel-300 hover:text-steel-600 p-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <p className="text-[11px] text-steel-500">
            El usuario quedará bloqueado automáticamente cada día en este rango.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-steel-600 mb-1.5">Desde</label>
              <input
                type="time"
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-steel-600 mb-1.5">Hasta</label>
              <input
                type="time"
                value={horaFin}
                onChange={e => setHoraFin(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                required
              />
            </div>
          </div>

          {cruzaMedianoche && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
              <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p className="text-[11px] text-amber-700">Cruza medianoche: de {horaInicio} a las {horaFin} del día siguiente.</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {usuario.horario && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="h-10 px-3 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? '…' : 'Eliminar'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="flex-1 h-10 rounded-xl border border-steel-200 text-sm font-medium text-steel-600 hover:bg-steel-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── HorarioGlobalModal ───────────────────────────────────────────────────────

function HorarioGlobalModal({
  horarioActual,
  onClose,
  onSuccess,
}: {
  horarioActual: HorarioAPI | null
  onClose: () => void
  onSuccess: (h: HorarioAPI | null) => void
}) {
  const [horaInicio, setHoraInicio] = useState(horarioActual?.horaInicio ?? '20:00')
  const [horaFin,    setHoraFin]    = useState(horarioActual?.horaFin    ?? '08:00')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const cruzaMedianoche = horaInicio > horaFin

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/Usuario/horario-global', { horaInicio, horaFin })
      notify.success('Horario global guardado', {
        description: `Todos los no-admins bloqueados de ${horaInicio} a ${horaFin} cada día`,
      })
      onSuccess({ horaInicio, horaFin, activo: true })
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar el horario de cierre global? Los usuarios bloqueados por este horario serán desbloqueados.')) return
    setDeleting(true)
    try {
      await api.delete('/Usuario/horario-global')
      notify.success('Horario global eliminado')
      onSuccess(null)
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-steel-100">
        <div className="px-6 pt-5 pb-4 border-b border-steel-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center shrink-0">
              <IcoGlobe />
            </div>
            <div>
              <p className="font-semibold text-steel-900 text-sm">Horario de cierre global</p>
              <p className="text-[11px] text-steel-400">Se aplica a todos los usuarios excepto admins</p>
            </div>
            <button onClick={onClose} className="ml-auto text-steel-300 hover:text-steel-600 p-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <p className="text-[11px] text-steel-500">
            Todos los días, los no-admins quedarán bloqueados automáticamente en este rango horario.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-steel-600 mb-1.5">Desde</label>
              <input
                type="time"
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-steel-600 mb-1.5">Hasta</label>
              <input
                type="time"
                value={horaFin}
                onChange={e => setHoraFin(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                required
              />
            </div>
          </div>

          {cruzaMedianoche && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
              <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p className="text-[11px] text-amber-700">Cruza medianoche: de {horaInicio} a las {horaFin} del día siguiente.</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {horarioActual && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="h-10 px-3 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? '…' : 'Eliminar'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="flex-1 h-10 rounded-xl border border-steel-200 text-sm font-medium text-steel-600 hover:bg-steel-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 h-10 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── BloquearHastaModal (individual, fecha de fin) ────────────────────────────

function BloquearHastaModal({
  usuario,
  onClose,
  onSuccess,
}: {
  usuario: UsuarioAPI
  onClose: () => void
  onSuccess: (u: UsuarioAPI) => void
}) {
  const [hasta, setHasta] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 2, 0, 0, 0)
    return localISOString(d)
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hastaDate = new Date(hasta)
    if (hastaDate <= new Date()) {
      notify.error('La fecha debe ser en el futuro')
      return
    }
    setSaving(true)
    try {
      await api.post(`/Usuario/${usuario.id}/bloquear-hasta`, { hasta: hastaDate.toISOString() })
      notify.success(`${usuario.nombre} bloqueado`, {
        description: `Hasta ${hastaDate.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}`,
      })
      onSuccess({ ...usuario, activo: false, bloqueadoHasta: hastaDate.toISOString() })
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al bloquear usuario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-steel-100">
        <div className="px-6 pt-5 pb-4 border-b border-steel-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <IcoCalendar />
            </div>
            <div>
              <p className="font-semibold text-steel-900 text-sm">Bloquear hasta fecha</p>
              <p className="text-[11px] text-steel-400">{usuario.nombre} {usuario.apellido}</p>
            </div>
            <button onClick={onClose} className="ml-auto text-steel-300 hover:text-steel-600 p-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">Bloqueado hasta</label>
            <input
              type="datetime-local"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              min={localISOString(new Date())}
              className="w-full h-11 px-3.5 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
              required
            />
            <p className="text-[11px] text-steel-400 mt-1">
              El usuario no podrá ingresar hasta esa fecha y hora.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 h-10 rounded-xl border border-steel-200 text-sm font-medium text-steel-600 hover:bg-steel-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50">
              {saving ? 'Bloqueando…' : 'Bloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CrearUsuarioModal ────────────────────────────────────────────────────────

const ROLES_DISPONIBLES: { value: string; label: string }[] = [
  { value: 'Admin',       label: 'Administrador' },
  { value: 'Cajero',      label: 'Cajero' },
  { value: 'Almacenero',  label: 'Almacenero' },
  { value: 'Operador',    label: 'Operador' },
]

function CrearUsuarioModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', rol: 'Cajero' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const validate = () => {
    const e: Partial<typeof form> = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.apellido.trim()) e.apellido = 'Requerido'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Correo inválido'
    if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('/Usuario', form)
      notify.success('Usuario creado', { description: `${form.nombre} ${form.apellido} — ${ROL_LABELS[form.rol] ?? form.rol}` })
      onSuccess()
      onClose()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-steel-100">
        <div className="px-6 pt-5 pb-4 border-b border-steel-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <IcoUser />
            </div>
            <div>
              <p className="font-semibold text-steel-900 text-sm">Nuevo usuario</p>
              <p className="text-[11px] text-steel-400">El usuario podrá iniciar sesión de inmediato</p>
            </div>
            <button onClick={onClose} className="ml-auto text-steel-300 hover:text-steel-600 p-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-steel-600 mb-1.5">Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                placeholder="Juan" autoFocus
                className="w-full h-10 px-3.5 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" />
              {errors.nombre && <p className="text-[11px] text-red-500 mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-steel-600 mb-1.5">Apellido *</label>
              <input value={form.apellido} onChange={e => set('apellido', e.target.value)}
                placeholder="Pérez"
                className="w-full h-10 px-3.5 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" />
              {errors.apellido && <p className="text-[11px] text-red-500 mt-1">{errors.apellido}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">Correo electrónico *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="juan@empresa.com"
              className="w-full h-10 px-3.5 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" />
            {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">Contraseña *</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full h-10 px-3.5 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" />
            {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">Rol *</label>
            <div className="flex flex-wrap gap-2">
              {ROLES_DISPONIBLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('rol', r.value)}
                  className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
                    form.rol === r.value
                      ? 'bg-steel-900 text-white border-steel-900'
                      : 'bg-white text-steel-600 border-steel-200 hover:border-steel-400'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 h-10 rounded-xl border border-steel-200 text-sm font-medium text-steel-600 hover:bg-steel-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-xl bg-steel-900 text-white text-sm font-semibold hover:bg-steel-800 active:scale-[0.98] transition-all disabled:opacity-50">
              {saving ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ProgramarBloqueoModal ────────────────────────────────────────────────────

function ProgramarBloqueoModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 2, 0, 0, 0)
    return localISOString(d)
  })
  const [saving, setSaving] = useState(false)

  const desdeDate = desde ? new Date(desde) : null
  const esProgamado = desdeDate !== null && desdeDate > new Date()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hastaDate = new Date(hasta)
    if (hastaDate <= new Date()) {
      notify.error('La hora de fin debe ser en el futuro')
      return
    }
    if (desdeDate && desdeDate >= hastaDate) {
      notify.error('"Desde" debe ser anterior a "Hasta"')
      return
    }
    setSaving(true)
    try {
      await api.post('/Usuario/programar-bloqueo', {
        desde: desdeDate ? desdeDate.toISOString() : undefined,
        hasta: hastaDate.toISOString(),
      })
      if (esProgamado) {
        notify.success('Bloqueo programado', {
          description: `Comenzará ${desdeDate!.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })} hasta ${hastaDate.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}`,
        })
      } else {
        notify.success('Bloqueo aplicado', {
          description: `Usuarios bloqueados hasta ${hastaDate.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}`,
        })
      }
      onSuccess()
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al programar bloqueo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-steel-100">
        <div className="px-6 pt-5 pb-4 border-b border-steel-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <IcoClock />
            </div>
            <div>
              <p className="font-semibold text-steel-900 text-sm">Programar bloqueo global</p>
              <p className="text-[11px] text-steel-400">Afecta a todos los no-admins</p>
            </div>
            <button onClick={onClose} className="ml-auto text-steel-300 hover:text-steel-600 p-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">
              Desde <span className="font-normal text-steel-400">(opcional — vacío = ahora mismo)</span>
            </label>
            <input
              type="datetime-local"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              min={localISOString(new Date())}
              className="w-full h-11 px-3.5 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-steel-600 mb-1.5">Hasta *</label>
            <input
              type="datetime-local"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              min={localISOString(new Date())}
              className="w-full h-11 px-3.5 rounded-xl border border-steel-200 bg-white text-steel-900 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              required
            />
          </div>
          {esProgamado && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
              <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p className="text-[11px] text-blue-700">
                El bloqueo comenzará automáticamente a las {desdeDate!.toLocaleString('es-BO', { timeStyle: 'short' })}.
              </p>
            </div>
          )}
          <p className="text-[11px] text-steel-400">
            Los administradores no serán afectados.
          </p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 h-10 rounded-xl border border-steel-200 text-sm font-medium text-steel-600 hover:bg-steel-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50">
              {saving ? 'Guardando…' : esProgamado ? 'Programar' : 'Aplicar ahora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── HorarioGlobalCard ────────────────────────────────────────────────────────

function HorarioGlobalCard({
  horario,
  onConfigure,
}: {
  horario: HorarioAPI | null
  onConfigure: () => void
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4 rounded-xl mb-3"
      style={{ background: horario ? '#F3F0FF' : '#F8F8F8', border: '1px solid', borderColor: horario ? '#DDD6FE' : '#E8EDF3' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: horario ? '#EDE9FE' : '#EFEFEF', color: horario ? '#7C3AED' : '#9CA3AF' }}
        >
          <IcoGlobe />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-steel-800">Horario de cierre global</p>
          {horario ? (
            <p className="text-[11px] text-violet-700">
              Activo · Todos los días de {horario.horaInicio} a {horario.horaFin}
            </p>
          ) : (
            <p className="text-[11px] text-steel-400">Sin horario configurado</p>
          )}
        </div>
      </div>
      <button
        onClick={onConfigure}
        className="h-8 px-3 rounded-lg text-[12px] font-semibold border transition-colors"
        style={{
          background: horario ? '#EDE9FE' : '#F0F0F0',
          color: horario ? '#7C3AED' : '#6B7280',
          borderColor: horario ? '#DDD6FE' : '#E0E0E0',
        }}
      >
        {horario ? 'Editar' : 'Configurar'}
      </button>
    </div>
  )
}

// ─── UsuariosPage ─────────────────────────────────────────────────────────────

export function UsuariosPage() {
  const { user: me } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioAPI[]>([])
  const [horarioGlobal, setHorarioGlobal] = useState<HorarioAPI | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'inactivo'>('todos')
  const [showProgramar, setShowProgramar] = useState(false)
  const [showCrear, setShowCrear] = useState(false)
  const [showHorarioGlobal, setShowHorarioGlobal] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [desactivandoTodos, setDesactivandoTodos] = useState(false)
  const [horarioUsuario, setHorarioUsuario] = useState<UsuarioAPI | null>(null)
  const [bloquearHastaUsuario, setBloquearHastaUsuario] = useState<UsuarioAPI | null>(null)

  const load = useCallback(async () => {
    try {
      const [data, global] = await Promise.all([
        api.get<UsuarioAPI[]>('/Usuario'),
        api.get<HorarioAPI | null>('/Usuario/horario-global'),
      ])
      setUsuarios(data ?? [])
      setHorarioGlobal(global ?? null)
    } catch {
      notify.error('Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return usuarios.filter(u => {
      if (filtro === 'activo' && !u.activo) return false
      if (filtro === 'inactivo' && u.activo) return false
      if (!q) return true
      return (
        u.nombre.toLowerCase().includes(q) ||
        u.apellido.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
  }, [usuarios, search, filtro])

  const stats = useMemo(() => ({
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    inactivos: usuarios.filter(u => !u.activo).length,
  }), [usuarios])

  const handleToggle = async (u: UsuarioAPI) => {
    if (toggling) return
    setToggling(u.id)
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: !x.activo, bloqueadoHasta: null } : x))
    try {
      await api.patch(`/Usuario/${u.id}/toggle`)
      notify.success(u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`)
    } catch (e) {
      setUsuarios(prev => prev.map(x => x.id === u.id ? u : x))
      notify.error(e instanceof Error ? e.message : 'Error al cambiar estado')
    } finally {
      setToggling(null)
    }
  }

  const handleHorarioSuccess = (updated: UsuarioAPI) => {
    setUsuarios(prev => prev.map(u => u.id === updated.id ? updated : u))
  }

  const handleBloquearHastaSuccess = (updated: UsuarioAPI) => {
    setUsuarios(prev => prev.map(u => u.id === updated.id ? updated : u))
  }

  const handleDesactivarTodos = async () => {
    if (!confirm('¿Desactivar a todos los usuarios (excepto administradores)? Podrás reactivarlos individualmente.')) return
    setDesactivandoTodos(true)
    try {
      await api.post('/Usuario/desactivar-todos')
      notify.success('Todos los no-admins desactivados')
      await load()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setDesactivandoTodos(false)
    }
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Usuarios y roles"
          description="Gestión de acceso al sistema"
          actions={
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={() => setShowCrear(true)}
                className="h-9 px-3.5 rounded-lg text-[13px] font-medium flex items-center gap-2 border border-steel-300 bg-steel-900 text-white hover:bg-steel-800 transition-colors"
              >
                <IcoUser /> Nuevo usuario
              </button>
              <button
                onClick={() => setShowProgramar(true)}
                className="h-9 px-3.5 rounded-lg text-[13px] font-medium flex items-center gap-2 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <IcoClock /> Programar bloqueo
              </button>
              <button
                onClick={handleDesactivarTodos}
                disabled={desactivandoTodos}
                className="h-9 px-3.5 rounded-lg text-[13px] font-medium flex items-center gap-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <IcoLock /> {desactivandoTodos ? 'Desactivando…' : 'Desactivar todos'}
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-3 gap-3 mb-3">
          <MetricCard label="Total" value={stats.total} sublabel="usuarios registrados" />
          <MetricCard label="Activos" value={stats.activos} bg="#C9F5E5" valueColor="#0A6645" sublabelColor="#2A8A60" sublabel="pueden iniciar sesión" />
          <MetricCard label="Inactivos" value={stats.inactivos} bg="#FFE5E5" valueColor="#991B1B" sublabelColor="#CC2222" sublabel="sin acceso" />
        </div>

        <HorarioGlobalCard
          horario={horarioGlobal}
          onConfigure={() => setShowHorarioGlobal(true)}
        />

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <IcoSearch />
            </div>
            <input
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-steel-200 bg-white text-[13px] text-steel-800 placeholder-steel-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              placeholder="Buscar por nombre, apellido o correo…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['todos', 'activo', 'inactivo'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={clsx('px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors capitalize',
                  filtro === f ? 'bg-steel-800 text-white border-steel-800' : 'bg-white text-steel-600 border-steel-200 hover:border-steel-300')}>
                {f === 'todos' ? 'Todos' : f === 'activo' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>
        </div>

        <span className="block text-[12px] text-steel-400 mb-3">
          {filtered.length} usuario{filtered.length !== 1 ? 'es' : ''}
        </span>

        {loading ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block">
              <div className="grid items-center px-5 pb-2 mb-1"
                   style={{ gridTemplateColumns: '1fr 200px 130px 130px 92px', gap: '0 16px' }}>
                {['Usuario', 'Correo', 'Rol', 'Estado', ''].map(h => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">{h}</span>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {filtered.map(u => (
                  <UsuarioRow
                    key={u.id}
                    usuario={u}
                    isSelf={u.email === me?.email}
                    toggling={toggling === u.id}
                    onToggle={() => handleToggle(u)}
                    onHorario={() => setHorarioUsuario(u)}
                    onBloquearHasta={() => setBloquearHastaUsuario(u)}
                  />
                ))}
              </div>
            </div>

            {/* Mobile */}
            <div className="lg:hidden flex flex-col gap-2">
              {filtered.map(u => (
                <UsuarioCard
                  key={u.id}
                  usuario={u}
                  isSelf={u.email === me?.email}
                  toggling={toggling === u.id}
                  onToggle={() => handleToggle(u)}
                  onHorario={() => setHorarioUsuario(u)}
                  onBloquearHasta={() => setBloquearHastaUsuario(u)}
                />
              ))}
            </div>
          </>
        )}
      </PageContainer>

      {showCrear && (
        <CrearUsuarioModal
          onClose={() => setShowCrear(false)}
          onSuccess={load}
        />
      )}

      {showProgramar && (
        <ProgramarBloqueoModal
          onClose={() => setShowProgramar(false)}
          onSuccess={load}
        />
      )}

      {showHorarioGlobal && (
        <HorarioGlobalModal
          horarioActual={horarioGlobal}
          onClose={() => setShowHorarioGlobal(false)}
          onSuccess={setHorarioGlobal}
        />
      )}

      {horarioUsuario && (
        <HorarioModal
          usuario={horarioUsuario}
          onClose={() => setHorarioUsuario(null)}
          onSuccess={handleHorarioSuccess}
        />
      )}

      {bloquearHastaUsuario && (
        <BloquearHastaModal
          usuario={bloquearHastaUsuario}
          onClose={() => setBloquearHastaUsuario(null)}
          onSuccess={handleBloquearHastaSuccess}
        />
      )}
    </MainLayout>
  )
}

// ─── Row / Card ───────────────────────────────────────────────────────────────

interface RowProps {
  usuario: UsuarioAPI
  isSelf: boolean
  toggling: boolean
  onToggle: () => void
  onHorario: () => void
  onBloquearHasta: () => void
}

function Toggle({ activo, toggling, onToggle, disabled }: { activo: boolean; toggling: boolean; onToggle: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled || toggling}
      title={disabled ? 'No puedes desactivarte a ti mismo' : undefined}
      className={clsx(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none',
        activo ? 'bg-brand-600' : 'bg-steel-300',
        (disabled || toggling) && 'opacity-50 cursor-not-allowed',
        !disabled && !toggling && 'cursor-pointer',
      )}
    >
      <span className={clsx(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200',
        activo ? 'translate-x-4' : 'translate-x-0',
        toggling && 'animate-pulse',
      )} />
    </button>
  )
}

function UsuarioRow({ usuario: u, isSelf, toggling, onToggle, onHorario, onBloquearHasta }: RowProps) {
  const hasta = fmtBloqueo(u.bloqueadoHasta)
  return (
    <div
      className="grid items-center px-5 py-3.5 rounded-xl transition-opacity"
      style={{
        gridTemplateColumns: '1fr 200px 130px 130px 92px',
        gap: '0 16px',
        background: '#FFFFFF',
        border: '1px solid #E8EDF3',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        opacity: u.activo ? 1 : 0.65,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-blue-50 text-blue-700">
          {u.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[13px] text-steel-800 truncate">{u.nombre} {u.apellido}</p>
          {isSelf && <span className="text-[10px] text-brand-500 font-medium">Tú</span>}
        </div>
      </div>
      <p className="text-[12px] text-steel-500 truncate">{u.email}</p>
      <RolBadge rol={u.rol} />
      <div className="flex items-center gap-2">
        <Toggle activo={u.activo} toggling={toggling} onToggle={onToggle} disabled={isSelf} />
        <div>
          <span className="text-[11px] font-medium" style={{ color: u.activo ? '#0A6645' : '#991B1B' }}>
            {u.activo ? 'Activo' : 'Inactivo'}
          </span>
          {!u.activo && hasta && (
            <p className="text-[10px] text-amber-600">hasta {hasta}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onBloquearHasta}
          disabled={isSelf}
          title={isSelf ? undefined : u.activo ? 'Bloquear hasta fecha' : 'Cambiar fecha de bloqueo'}
          className={clsx(
            'h-8 w-[42px] rounded-lg flex items-center justify-center transition-colors',
            isSelf ? 'opacity-30 cursor-not-allowed bg-steel-100 text-steel-400'
              : 'bg-orange-50 text-orange-500 hover:bg-orange-100'
          )}
        >
          <IcoCalendar />
        </button>
        <button
          onClick={onHorario}
          title={u.horario ? `Horario recurrente: ${u.horario.horaInicio}–${u.horario.horaFin}` : 'Sin horario recurrente'}
          className={clsx(
            'h-8 w-[42px] rounded-lg flex items-center justify-center transition-colors',
            u.horario ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200' : 'bg-steel-100 text-steel-400 hover:bg-steel-200'
          )}
        >
          <IcoClock />
        </button>
      </div>
    </div>
  )
}

function UsuarioCard({ usuario: u, isSelf, toggling, onToggle, onHorario, onBloquearHasta }: RowProps) {
  const hasta = fmtBloqueo(u.bloqueadoHasta)
  return (
    <div
      className="bg-white rounded-xl px-4 py-4 transition-opacity"
      style={{ border: '1px solid #E8EDF3', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', opacity: u.activo ? 1 : 0.65 }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-blue-50 text-blue-700">
            {u.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[13px] text-steel-800 truncate">{u.nombre} {u.apellido}</p>
            <p className="text-[11px] text-steel-400 truncate">{u.email}</p>
            {isSelf && <span className="text-[10px] text-brand-500 font-medium">Tú</span>}
          </div>
        </div>
        <RolBadge rol={u.rol} />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-steel-100">
        <div className="flex items-center gap-2">
          <Toggle activo={u.activo} toggling={toggling} onToggle={onToggle} disabled={isSelf} />
          <div>
            <span className="text-[11px] font-medium" style={{ color: u.activo ? '#0A6645' : '#991B1B' }}>
              {u.activo ? 'Activo' : 'Inactivo'}
            </span>
            {!u.activo && hasta && (
              <p className="text-[10px] text-amber-600">hasta {hasta}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onBloquearHasta}
            disabled={isSelf}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
              isSelf ? 'opacity-30 cursor-not-allowed bg-steel-100 text-steel-400'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
            )}
          >
            <IcoCalendar />
            Bloquear
          </button>
          <button
            onClick={onHorario}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
              u.horario
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-steel-100 text-steel-500 hover:bg-steel-200'
            )}
          >
            <IcoClock />
            {u.horario ? `${u.horario.horaInicio}–${u.horario.horaFin}` : 'Horario'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RolBadge({ rol }: { rol: string }) {
  const isAdmin = rol.toLowerCase() === 'admin'
  return (
    <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit"
      style={{
        background: isAdmin ? '#EFF6FF' : '#F5F5F5',
        color: isAdmin ? '#1D4ED8' : '#374151',
        border: '1px solid',
        borderColor: isAdmin ? '#BFDBFE' : '#E8EDF3',
      }}>
      {ROL_LABELS[rol] ?? rol}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="py-20 text-center">
      <div className="text-steel-200 mx-auto mb-4 flex justify-center"><IcoUser /></div>
      <p className="text-[14px] font-medium text-steel-600">Sin usuarios registrados</p>
    </div>
  )
}

interface MetricCardProps {
  label: string; value: number; sublabel: string
  bg?: string; valueColor?: string; sublabelColor?: string
}
function MetricCard({ label, value, sublabel, bg = '#F5F5F5', valueColor = '#1A1A1A', sublabelColor = '#8C8C8C' }: MetricCardProps) {
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: bg }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: sublabelColor }}>{label}</p>
      <p className="font-bold leading-none" style={{ fontSize: 28, color: valueColor }}>{value}</p>
      <p className="text-[11px] mt-1.5" style={{ color: sublabelColor }}>{sublabel}</p>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-5 py-4 rounded-xl animate-pulse" style={{ background: '#FFF', border: '1px solid #E8EDF3' }}>
          <div className="h-3 w-48 rounded mb-2 bg-steel-100" />
          <div className="h-2.5 w-32 rounded bg-steel-100" />
        </div>
      ))}
    </div>
  )
}
