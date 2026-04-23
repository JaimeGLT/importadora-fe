import React, { useState, useEffect } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import type { Cliente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Cliente, 'id' | 'creado_en' | 'actualizado_en' | 'compras'>) => void
  initial?: Cliente | null
}

type Form = {
  ci: string
  ciComplemento: string
  nit: string
  nombre: string
  apellido: string
  telefono: string
  email: string
  activo: boolean
}

const EMPTY: Form = {
  ci: '',
  ciComplemento: '',
  nit: '',
  nombre: '',
  apellido: '',
  telefono: '',
  email: '',
  activo: true,
}

export function ClienteFormModal({ open, onClose, onSave, initial }: Props) {
  const [form, setForm] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        ci: initial.ci ?? '',
        ciComplemento: initial.ciComplemento ?? '',
        nit: initial.nit ?? '',
        nombre: initial.nombre ?? '',
        apellido: initial.apellido,
        telefono: initial.telefono ?? '',
        email: initial.email ?? '',
        activo: initial.activo,
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, initial])

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const setActivo = (value: boolean) => setForm((f) => ({ ...f, activo: value }))

  const validate = (): boolean => {
    const e: Partial<Record<keyof Form, string>> = {}
    if (!form.apellido.trim()) {
      e.apellido = 'Requerido'
    }
    if (form.ci.trim() && form.ci.trim().length < 5) {
      e.ci = 'CI inválido'
    }
    if (form.ciComplemento.trim() && /[^a-zA-Z0-9]/.test(form.ciComplemento.trim())) {
      e.ciComplemento = 'Solo letras y números'
    }
    if (form.nit.trim() && form.nit.trim().length < 5) {
      e.nit = 'NIT inválido'
    }
    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
      e.email = 'Email inválido'
    }
    if (!form.ci.trim() && !form.nit.trim()) {
      e.ci = 'CI o NIT requerido'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({
      ci: form.ci.trim() || undefined,
      ciComplemento: form.ciComplemento.trim() || undefined,
      nit: form.nit.trim() || undefined,
      nombre: form.nombre.trim() || undefined,
      apellido: form.apellido.trim(),
      telefono: form.telefono.trim() || undefined,
      email: form.email.trim() || undefined,
      activo: form.activo,
    })
  }

  const title = initial ? 'Editar cliente' : 'Nuevo cliente'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-2">Identificación</p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_80px] gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
                Carnet de identidad (CI)
              </label>
              <Input
                value={form.ci}
                onChange={set('ci')}
                placeholder="Ej. 12345678"
                type="text"
                inputMode="numeric"
              />
              {errors.ci && <p className="text-[11px] text-red-500 mt-1">{errors.ci}</p>}
            </div>
            <span className="self-end pb-2 text-steel-400 font-bold">−</span>
            <div>
              <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
                Complemento
              </label>
              <Input
                value={form.ciComplemento}
                onChange={set('ciComplemento')}
                placeholder="Ej. 1A"
                className="sm:w-20"
              />
              {errors.ciComplemento && <p className="text-[11px] text-red-500 mt-1">{errors.ciComplemento}</p>}
            </div>
          </div>
          <p className="text-[10px] text-steel-400 mt-1">El complemento es opcional y resuelve CI duplicados (SEGIP)</p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
            NIT (empresa o negocio)
          </label>
          <Input value={form.nit} onChange={set('nit')} placeholder="Ej. 10234567011" type="text" inputMode="numeric" />
          {errors.nit && <p className="text-[11px] text-red-500 mt-1">{errors.nit}</p>}
          <p className="text-[10px] text-steel-400 mt-1">Si es empresa o tiene NIT registrado, ingréselo aquí</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              Nombre
            </label>
            <Input value={form.nombre} onChange={set('nombre')} placeholder="Ej. Juan" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              Apellido / Razón Social <span className="text-red-500">*</span>
            </label>
            <Input value={form.apellido} onChange={set('apellido')} placeholder="Ej. Pérez García" />
            {errors.apellido && <p className="text-[11px] text-red-500 mt-1">{errors.apellido}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              Teléfono
            </label>
            <Input value={form.telefono} onChange={set('telefono')} placeholder="Ej. 70012345" type="tel" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-steel-500 uppercase tracking-wide mb-1">
              Correo electrónico
            </label>
            <Input value={form.email} onChange={set('email')} placeholder="correo@email.com" type="email" />
            {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-steel-50 border border-steel-200">
          <div>
            <p className="text-sm font-medium text-steel-800">Activo</p>
            <p className="text-xs text-steel-400 mt-0.5">Si está desactivado, el cliente no aparecerá en ventas</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.activo}
            onClick={() => setActivo(!form.activo)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
              form.activo ? 'bg-brand-600' : 'bg-steel-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                form.activo ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </Modal>
  )
}