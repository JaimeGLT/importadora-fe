import { useEffect, useState } from 'react'
import { DrawerWrapper } from '@/components/ui/DrawerWrapper'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'

interface Usuario {
  id: string
  nombre: string
  apellido: string
  porcentajeComision: number
}

interface ComisionModalProps {
  usuario: Usuario | null
  onClose: () => void
  onSuccess: (porcentaje: number) => void
}

export function ComisionModal({ usuario, onClose, onSuccess }: ComisionModalProps) {
  const [porcentaje, setPorcentaje] = useState('0')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (usuario) setPorcentaje(String(usuario.porcentajeComision))
  }, [usuario])

  const handleSave = async () => {
    if (!usuario) return
    const pct = parseFloat(porcentaje)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      notify.error('Ingresa un porcentaje válido (0-100)')
      return
    }
    setSaving(true)
    try {
      await api.patch(`/Usuario/${usuario.id}/comision`, { porcentaje: pct })
      notify.success('Comisión actualizada', {
        description: `${usuario.nombre} ${usuario.apellido}: ${pct}% de comisión`,
      })
      onSuccess(pct)
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al guardar comisión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DrawerWrapper
      open={!!usuario}
      onClose={onClose}
      subtitle="Comisión por ventas"
      title={usuario ? `${usuario.nombre} ${usuario.apellido}` : ''}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="h-9 px-4 rounded-lg border border-[#E8E5E2] text-sm font-semibold text-[#4A4744] hover:bg-[#F5F0EB] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-[#3F7A52] hover:bg-[#2D5A3D] text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-[12px] text-[#7A7571]">
          Porcentaje del total de ventas que corresponde a este usuario como comisión.
        </p>
        <div>
          <label className="block text-xs font-semibold text-[#4A4744] mb-1.5">Porcentaje de comisión</label>
          <div className="relative">
            <input
              type="number" min="0" max="100" step="0.01"
              value={porcentaje}
              onChange={e => setPorcentaje(e.target.value)}
              className="w-full h-11 pl-3 pr-10 rounded-xl border border-[#E8E5E2] bg-white text-[#2D2B2A] text-sm focus:outline-none focus:border-[#3F7A52] focus:ring-2 focus:ring-[#3F7A52]/10 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7571] text-sm font-semibold">%</span>
          </div>
        </div>
      </div>
    </DrawerWrapper>
  )
}
