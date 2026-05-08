import { Modal } from '@/components/ui'
import type { Cliente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  cliente: Cliente | null
}

export function ClienteHistorialModal({ open, onClose, cliente }: Props) {
  if (!cliente) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Historial de ${cliente.nombre} ${cliente.apellido}`}
      size="lg"
    >
      <div className="py-12 text-center">
        <svg className="h-10 w-10 text-steel-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <p className="text-sm text-steel-400">Sin historial de compras</p>
        <p className="text-xs text-steel-400 mt-1">Este cliente aún no tiene compras registradas.</p>
      </div>
    </Modal>
  )
}