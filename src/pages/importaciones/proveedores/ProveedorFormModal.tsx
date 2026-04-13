import React, { useState, useEffect } from 'react'
import { Modal, Button, Input, Select } from '@/components/ui'
import type { Proveedor, MonedaProveedor, TerminosPago } from '@/types'

const MONEDAS: MonedaProveedor[] = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'KRW', 'BRL', 'ARS', 'CLP', 'PEN']

const TERMINOS: TerminosPago[] = [
  'T/T anticipado',
  'T/T 30 días',
  'T/T 60 días',
  'L/C a la vista',
  'L/C 30 días',
  'NET 30',
  'NET 60',
  'Contra entrega',
]

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Proveedor, 'id' | 'creado_en' | 'actualizado_en'>) => void
  initial?: Proveedor | null
}

type Form = {
  nombre: string
  pais: string
  moneda: MonedaProveedor
  terminos_pago: TerminosPago
  contacto: string
  email: string
  telefono: string
  sitio_web: string
  notas: string
  tiempo_reposicion_dias: string
  estado: 'activo' | 'inactivo'
}

const EMPTY: Form = {
  nombre: '',
  pais: '',
  moneda: 'USD',
  terminos_pago: 'T/T 30 días',
  contacto: '',
  email: '',
  telefono: '',
  sitio_web: '',
  notas: '',
  tiempo_reposicion_dias: '',
  estado: 'activo',
}

export function ProveedorFormModal({ open, onClose, onSave, initial }: Props) {
  const [form, setForm] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        nombre: initial.nombre,
        pais: initial.pais,
        moneda: initial.moneda,
        terminos_pago: initial.terminos_pago,
        contacto: initial.contacto,
        email: initial.email,
        telefono: initial.telefono ?? '',
        sitio_web: initial.sitio_web ?? '',
        notas: initial.notas ?? '',
        tiempo_reposicion_dias: initial.tiempo_reposicion_dias?.toString() ?? '',
        estado: initial.estado,
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, initial])

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = (): boolean => {
    const e: Partial<Record<keyof Form, string>> = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.pais.trim())   e.pais   = 'Requerido'
    if (!form.contacto.trim()) e.contacto = 'Requerido'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido'
    if (form.tiempo_reposicion_dias && isNaN(Number(form.tiempo_reposicion_dias))) {
      e.tiempo_reposicion_dias = 'Debe ser número'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({
      nombre: form.nombre.trim(),
      pais: form.pais.trim(),
      moneda: form.moneda,
      terminos_pago: form.terminos_pago,
      contacto: form.contacto.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim() || undefined,
      sitio_web: form.sitio_web.trim() || undefined,
      notas: form.notas.trim() || undefined,
      tiempo_reposicion_dias: form.tiempo_reposicion_dias ? Number(form.tiempo_reposicion_dias) : undefined,
      estado: form.estado,
    })
  }

  const title = initial ? 'Editar proveedor' : 'Nuevo proveedor'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Fila 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input value={form.nombre} onChange={set('nombre')} placeholder="Ej. Auto Parts Global Co." />
            {errors.nombre && <p className="text-[11px] text-red-500 mt-1">{errors.nombre}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              País <span className="text-red-500">*</span>
            </label>
            <Input value={form.pais} onChange={set('pais')} placeholder="Ej. China" />
            {errors.pais && <p className="text-[11px] text-red-500 mt-1">{errors.pais}</p>}
          </div>
        </div>

        {/* Fila 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              Moneda <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.moneda}
              onChange={set('moneda')}
              options={MONEDAS.map((m) => ({ value: m, label: m }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              Términos de pago <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.terminos_pago}
              onChange={set('terminos_pago')}
              options={TERMINOS.map((t) => ({ value: t, label: t }))}
            />
          </div>
        </div>

        {/* Fila 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              Contacto <span className="text-red-500">*</span>
            </label>
            <Input value={form.contacto} onChange={set('contacto')} placeholder="Nombre del contacto" />
            {errors.contacto && <p className="text-[11px] text-red-500 mt-1">{errors.contacto}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input value={form.email} onChange={set('email')} placeholder="correo@proveedor.com" type="email" />
            {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
          </div>
        </div>

        {/* Fila 4 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">Teléfono</label>
            <Input value={form.telefono} onChange={set('telefono')} placeholder="+86 21 5555 0101" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              Tiempo reposición (días)
            </label>
            <Input
              value={form.tiempo_reposicion_dias}
              onChange={set('tiempo_reposicion_dias')}
              placeholder="45"
              type="number"
            />
            {errors.tiempo_reposicion_dias && (
              <p className="text-[11px] text-red-500 mt-1">{errors.tiempo_reposicion_dias}</p>
            )}
          </div>
        </div>

        {/* Sitio web + estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">Sitio web</label>
            <Input value={form.sitio_web} onChange={set('sitio_web')} placeholder="www.proveedor.com" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">Estado</label>
            <Select
              value={form.estado}
              onChange={set('estado')}
              options={[
                { value: 'activo',   label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' },
              ]}
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">Notas</label>
          <textarea
            className="w-full rounded-lg border border-steel-200 px-3 py-2 text-[13px] text-steel-800 placeholder-steel-300 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            rows={3}
            placeholder="Condiciones especiales, mínimos de compra, observaciones…"
            value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  )
}
