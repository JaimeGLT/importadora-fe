import { useState, useEffect } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import type { Cliente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Cliente, 'id'>) => void
  cliente?: Cliente | null
}

interface Errors {
  nombre?: string
  apellido?: string
  telefono?: string
  correoElectronico?: string
}

const TELEFONO_RE = /^[+]?[\d\s().-]{7,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validar(data: { nombre: string; apellido: string; telefono: string; correoElectronico: string }): Errors {
  const errors: Errors = {}
  if (!data.nombre.trim()) errors.nombre = 'El nombre es obligatorio.'
  else if (data.nombre.trim().length < 2) errors.nombre = 'Mínimo 2 caracteres.'

  if (!data.apellido.trim()) errors.apellido = 'El apellido es obligatorio.'
  else if (data.apellido.trim().length < 2) errors.apellido = 'Mínimo 2 caracteres.'

  if (!data.telefono.trim()) errors.telefono = 'El teléfono es obligatorio.'
  else if (!TELEFONO_RE.test(data.telefono.trim())) errors.telefono = 'Teléfono inválido.'

  if (data.correoElectronico.trim() && !EMAIL_RE.test(data.correoElectronico.trim())) {
    errors.correoElectronico = 'Correo inválido.'
  }
  return errors
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <label className="block text-xs font-bold text-[#4A4744] mb-1.5 flex items-center gap-1">
      {label}
      {optional ? (
        <span className="text-[10px] font-normal text-[#7A7571] normal-case tracking-normal">(opcional)</span>
      ) : (
        <span className="text-[#B23A2A]">*</span>
      )}
    </label>
  )
}

export function ClienteFormModal({ open, onClose, onSave, cliente }: Props) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [correoElectronico, setCorreoElectronico] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setNombre(cliente?.nombre ?? '')
    setApellido(cliente?.apellido ?? '')
    setTelefono(cliente?.telefono ?? '')
    setDireccion(cliente?.direccion ?? '')
    setCorreoElectronico(cliente?.correoElectronico ?? '')
    setErrors({})
    setTouched(false)
  }, [open, cliente])

  const runValidation = () => validar({ nombre, apellido, telefono, correoElectronico })

  useEffect(() => {
    if (!touched) return
    setErrors(runValidation())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, apellido, telefono, correoElectronico, touched])

  const handleSave = () => {
    setTouched(true)
    const errs = runValidation()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSave({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
      direccion: direccion.trim() || undefined,
      correoElectronico: correoElectronico.trim() || undefined,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>{cliente ? 'Actualizar' : 'Registrar'}</Button>
        </>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-3 pb-1">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#780e18] to-[#D4A333] flex items-center justify-center shrink-0">
            <i className="ti ti-user-plus text-white text-[18px]" />
          </div>
          <p className="text-xs text-[#7A7571] leading-snug">
            Los campos marcados con <span className="text-[#B23A2A] font-bold">*</span> son obligatorios.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel label="Nombre" />
            <Input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Juan"
              maxLength={100}
              autoFocus
              error={errors.nombre}
            />
          </div>
          <div>
            <FieldLabel label="Apellido" />
            <Input
              value={apellido}
              onChange={e => setApellido(e.target.value)}
              placeholder="Ej. Pérez"
              maxLength={100}
              error={errors.apellido}
            />
          </div>
        </div>

        <div>
          <FieldLabel label="Teléfono" />
          <Input
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            placeholder="Ej. 70012345"
            maxLength={20}
            error={errors.telefono}
          />
        </div>

        <div>
          <FieldLabel label="Dirección" optional />
          <Input
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
            placeholder="Dirección del cliente"
            maxLength={200}
          />
        </div>

        <div>
          <FieldLabel label="Correo electrónico" optional />
          <Input
            type="email"
            value={correoElectronico}
            onChange={e => setCorreoElectronico(e.target.value)}
            placeholder="correo@ejemplo.com"
            maxLength={150}
            error={errors.correoElectronico}
          />
        </div>
      </div>
    </Modal>
  )
}
