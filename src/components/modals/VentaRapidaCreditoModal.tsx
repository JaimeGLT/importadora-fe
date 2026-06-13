import { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import { Button, Modal } from '@/components/ui'
import { notify } from '@/lib/notify'
import { useMarcasStore } from '@/stores/marcasStore'
import { fmtCodigo } from '@/lib/formatCodigo'
import type { Cliente } from '@/types'
import type { Cart } from '@/stores/cajaStore'

const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export interface VentaRapidaCreditoItem {
  id_Producto: number
  cantidad: number
  precioUnitario: number
}

export interface VentaRapidaCreditoModalProps {
  open: boolean
  cart: Cart
  clientes: Cliente[]
  onConfirm: (data: { id_Cliente: number; items: VentaRapidaCreditoItem[]; nota: string | null }) => Promise<void> | void
  onClose: () => void
}

/**
 * Venta rápida a crédito: el cajero arma un carrito, esta modal exige
 * seleccionar un cliente, y al confirmar genera un Credito con los
 * items del carrito (sin pasar por almacén). Stock se descuenta de
 * inmediato en el backend.
 */
export function VentaRapidaCreditoModal({
  open,
  cart,
  clientes,
  onConfirm,
  onClose,
}: VentaRapidaCreditoModalProps) {
  const { marcas } = useMarcasStore()
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSelected, setClienteSelected] = useState<Cliente | null>(null)
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [nota, setNota] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const total = useMemo(
    () => cart.items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0),
    [cart.items],
  )

  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim()) return []
    const q = clienteSearch.toLowerCase()
    return clientes
      .filter(
        (c) =>
          c.apellido.toLowerCase().includes(q) ||
          (c.nombre?.toLowerCase().includes(q) ?? false) ||
          (c.telefono?.includes(clienteSearch) ?? false),
      )
      .slice(0, 5)
  }, [clientes, clienteSearch])

  const handleSelectCliente = (c: Cliente) => {
    setClienteSelected(c)
    setClienteSearch('')
    setShowClienteDropdown(false)
  }

  const handleConfirm = async () => {
    if (!clienteSelected) {
      notify.error('Para venta a crédito es obligatorio seleccionar un cliente.')
      return
    }
    if (cart.items.length === 0) {
      notify.error('El carrito está vacío.')
      return
    }

    // Agrupar piezas de kit bajo el kit padre
    const regularItems = cart.items.filter((i) => !i.kit_id)
    const kitGroups = cart.items
      .filter((i) => !!i.kit_id)
      .reduce<Record<string, typeof cart.items>>((acc, i) => {
        if (!acc[i.kit_id!]) acc[i.kit_id!] = []
        acc[i.kit_id!].push(i)
        return acc
      }, {})

    const items: VentaRapidaCreditoItem[] = [
      ...regularItems.map((i) => ({
        id_Producto: Number(i.producto_id),
        cantidad: i.cantidad,
        precioUnitario: i.precio_unitario,
      })),
      ...Object.entries(kitGroups).map(([, pieces]) => ({
        id_Producto: Number(pieces[0].kit_id!),
        cantidad: 1,
        precioUnitario: pieces.reduce((s, p) => s + p.precio_unitario * p.cantidad, 0),
      })),
    ]

    setSubmitting(true)
    try {
      await onConfirm({
        id_Cliente: clienteSelected.id,
        items,
        nota: nota.trim() || null,
      })
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al crear el crédito')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Venta rápida a crédito" size="lg">
      <div className="space-y-4 pt-1">
        {/* Banner */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#F4ECDB] border border-[#D4A333]/30">
          <i className="ti ti-info-circle text-[#7A5200] text-[14px] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[#7A5200] leading-snug">
            Venta rápida: el stock se descuenta de inmediato, no pasa por almacén. El cliente
            queda debiendo <strong>{fmtBs(total)}</strong> hasta que abone.
          </p>
        </div>

        {/* Items del carrito */}
        <div>
          <p className="text-xs font-bold text-[#7A7571] uppercase tracking-widest mb-2">
            Productos ({cart.items.length})
          </p>
          <div className="rounded-xl border border-[#E8E5E2] overflow-hidden divide-y divide-[#E8E5E2] max-h-48 overflow-y-auto">
            {cart.items.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-[#7A7571]">
                El carrito está vacío.
              </div>
            ) : (
              cart.items.map((item, idx) => (
                <div key={`${item.producto_id}-${item.kit_id ?? 'root'}-${idx}`} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-[#780e18] bg-[#F4ECDB] px-1.5 py-0.5 rounded shrink-0">
                      {fmtCodigo(item.producto_codigo, item.marcaId, marcas)}
                    </span>
                    <span className="text-xs text-[#4A4744] truncate">{item.producto_nombre}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-[11px] text-[#7A7571]">×{item.cantidad}</span>
                    <span className="ml-2 text-xs font-semibold text-[#2D2B2A]">
                      {fmtBs(item.precio_unitario * item.cantidad)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between pt-2 px-1">
            <span className="text-xs font-bold text-[#7A7571]">Total</span>
            <span className="text-base font-black text-[#2D2B2A]">{fmtBs(total)}</span>
          </div>
        </div>

        {/* Cliente (obligatorio) */}
        <div>
          <p className="text-xs font-bold text-[#7A7571] uppercase tracking-widest mb-2 flex items-center gap-1">
            Cliente
            <span className="text-[#B23A2A]">*</span>
          </p>
          {clienteSelected ? (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#B8DCCA]/30 border border-[#B8DCCA]">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1E5C38] truncate">
                  {clienteSelected.nombre
                    ? `${clienteSelected.nombre} ${clienteSelected.apellido}`
                    : clienteSelected.apellido}
                </p>
                {clienteSelected.telefono && (
                  <p className="text-xs text-[#3F7A52]">{clienteSelected.telefono}</p>
                )}
              </div>
              <button
                onClick={() => setClienteSelected(null)}
                className="p-1.5 text-[#3F7A52] hover:text-[#1E5C38] hover:bg-[#B8DCCA]/50 rounded-lg transition-colors shrink-0"
              >
                <i className="ti ti-x text-[14px]" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={clienteSearch}
                onChange={(e) => {
                  setClienteSearch(e.target.value)
                  setShowClienteDropdown(true)
                }}
                onFocus={() => setShowClienteDropdown(true)}
                onBlur={() => setTimeout(() => setShowClienteDropdown(false), 150)}
                placeholder="Buscar cliente por nombre o teléfono…"
                className={clsx(
                  'w-full text-xs px-3 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 placeholder:text-[#7A7571]',
                  'border-[#B23A2A]/50 focus:border-[#B23A2A] focus:ring-[#B23A2A]/10',
                )}
              />
              {showClienteDropdown && clienteSearch.trim() && (
                <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-[#E8E5E2] shadow-lg max-h-40 overflow-y-auto">
                  {filteredClientes.length === 0 ? (
                    <div className="px-3 py-2.5 text-xs text-[#7A7571] text-center">Sin resultados</div>
                  ) : (
                    filteredClientes.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCliente(c)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#FAF5EE] transition-colors text-left"
                      >
                        <div className="h-7 w-7 rounded-full bg-[#F4ECDB] flex items-center justify-center text-[10px] font-bold text-[#780e18] shrink-0">
                          {c.nombre ? c.nombre.charAt(0) : c.apellido.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#2D2B2A] truncate">
                            {c.nombre ? `${c.nombre} ${c.apellido}` : c.apellido}
                          </p>
                          {c.telefono && <p className="text-[10px] text-[#7A7571]">{c.telefono}</p>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nota opcional */}
        <div>
          <p className="text-xs font-bold text-[#7A7571] uppercase tracking-widest mb-2">
            Nota (opcional)
          </p>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Motivo, referencia, condiciones de pago…"
            className="w-full text-xs px-3 py-2 bg-white border border-[#E8E5E2] rounded-xl focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10 placeholder:text-[#7A7571] resize-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={submitting || !clienteSelected || cart.items.length === 0}
            loading={submitting}
          >
            <i className="ti ti-hand-coins text-[14px] mr-1" />
            Crear crédito
          </Button>
        </div>
      </div>
    </Modal>
  )
}
