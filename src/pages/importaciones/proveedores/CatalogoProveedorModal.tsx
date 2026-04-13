import { useState } from 'react'
import { Modal } from '@/components/ui'
import { useImportacionesStore } from '@/stores/importacionesStore'
import type { Importacion, ItemImportacion, Proveedor } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  proveedor: Proveedor
}

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  en_transito: { label: 'En tránsito', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  en_aduana:   { label: 'En aduana',   bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  recibida:    { label: 'Recibida',    bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  cancelada:   { label: 'Cancelada',   bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function fmtBs(n: number) {
  return `${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Tabla de productos de una importación ────────────────────────────────────

const COLS = [
  { key: 'codigo_proveedor',      label: 'Cód. Universal',  w: 160 },
  { key: 'nombre',                label: 'Nombre',          w: 200 },
  { key: 'cod_alt_1',             label: 'Cód. Alt. 1',     w: 130 },
  { key: 'cod_alt_2',             label: 'Cód. Alt. 2',     w: 130 },
  { key: 'marca',                 label: 'Marca',           w: 110 },
  { key: 'descripcion',           label: 'Descripción',     w: 200 },
  { key: 'unidad',                label: 'Pieza',           w: 80  },
  { key: 'ubicacion',             label: 'Almacén',         w: 130 },
  { key: 'cantidad',              label: 'Stock entrada',   w: 100 },
  { key: 'costo_unitario_total_bs', label: 'Precio costo',  w: 110 },
  { key: 'precio_venta_final',    label: 'Precio venta',    w: 110 },
  { key: 'tipo_cambio',           label: 'T/C',             w: 70  },
]

function ProductosTable({ items, tipoCambio }: { items: ItemImportacion[]; tipoCambio: number }) {
  const totalW = COLS.reduce((s, c) => s + c.w, 0) + 32 // padding

  return (
    <div className="overflow-x-auto rounded-xl border border-steel-200">
      <table style={{ minWidth: totalW, borderCollapse: 'separate', borderSpacing: 0 }} className="w-full text-[12px]">
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            {COLS.map((col, i) => (
              <th
                key={col.key}
                style={{
                  width: col.w,
                  minWidth: col.w,
                  padding: '10px 12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #E8EDF3',
                  borderRight: i < COLS.length - 1 ? '1px solid #F1F5F9' : undefined,
                  whiteSpace: 'nowrap',
                }}
                className="text-[10px] font-semibold uppercase tracking-wider text-steel-500"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, rowIdx) => (
            <tr
              key={item.id}
              style={{ background: rowIdx % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}
              className="hover:bg-blue-50/40 transition-colors"
            >
              {/* Cód. Universal */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }}>
                <span className="font-mono text-[11px] text-steel-700 whitespace-nowrap">{item.codigo_proveedor}</span>
              </td>
              {/* Nombre */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }}>
                <span className="font-medium text-steel-800">{item.nombre}</span>
              </td>
              {/* Cód. Alt. 1 */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }}>
                <span className="font-mono text-[11px] text-steel-500">{item.codigos_adicionales[0] ?? '—'}</span>
              </td>
              {/* Cód. Alt. 2 */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }}>
                <span className="font-mono text-[11px] text-steel-500">{item.codigos_adicionales[1] ?? '—'}</span>
              </td>
              {/* Marca */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }}>
                <span className="text-steel-700">{item.marca ?? '—'}</span>
              </td>
              {/* Descripción */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9', maxWidth: 200 }}>
                <span className="text-steel-500 line-clamp-2">{item.descripcion ?? '—'}</span>
              </td>
              {/* Pieza (unidad) */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }}>
                <span className="capitalize text-steel-600">{item.unidad ?? 'pieza'}</span>
              </td>
              {/* Almacén */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }}>
                <span className="text-steel-600 whitespace-nowrap">{item.ubicacion ?? 'Almacén Central'}</span>
              </td>
              {/* Stock entrada */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9', textAlign: 'right' }}>
                <span className="font-semibold tabular-nums text-steel-800">{item.cantidad}</span>
              </td>
              {/* Precio costo */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9', textAlign: 'right' }}>
                <span className="tabular-nums text-steel-700">Bs {fmtBs(item.costo_unitario_total_bs)}</span>
              </td>
              {/* Precio venta */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9', textAlign: 'right' }}>
                <span className="tabular-nums font-semibold text-steel-800">Bs {fmtBs(item.precio_venta_final)}</span>
              </td>
              {/* Tipo de cambio */}
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', textAlign: 'right' }}>
                <span className="tabular-nums text-steel-500">{tipoCambio.toFixed(2)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Vista detalle de una importación ────────────────────────────────────────

function DetalleImportacion({ imp, onBack }: { imp: Importacion; onBack: () => void }) {
  const estado = ESTADO_CONFIG[imp.estado]

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-steel-400 hover:text-steel-700 hover:bg-steel-100 transition-colors"
          title="Volver al historial"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-steel-800">{imp.numero}</p>
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: estado.bg, color: estado.color, border: `1px solid ${estado.border}` }}
            >
              {estado.label}
            </span>
          </div>
          <p className="text-[11px] text-steel-400 mt-0.5">
            Llegada: {fmtDate(imp.fecha_estimada_llegada)} · {imp.items.length} producto{imp.items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Resumen costos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {[
          { label: 'FOB total',  value: fmtUSD(imp.fob_total_usd) },
          { label: 'Flete',      value: fmtUSD(imp.flete_usd) },
          { label: 'Aduana',     value: `Bs ${fmtBs(imp.aduana_bs)}` },
          { label: 'Transporte', value: `Bs ${fmtBs(imp.transporte_interno_bs)}` },
        ].map((m) => (
          <div key={m.label} className="rounded-lg px-3 py-2.5" style={{ background: '#F8FAFC', border: '1px solid #E8EDF3' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-steel-400 mb-0.5">{m.label}</p>
            <p className="text-[13px] font-semibold text-steel-800">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {imp.items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[13px] text-steel-400">Sin productos registrados en esta importación</p>
        </div>
      ) : (
        <ProductosTable items={imp.items} tipoCambio={imp.tipo_cambio} />
      )}
    </div>
  )
}

// ─── Vista lista de importaciones del proveedor ───────────────────────────────

export function CatalogoProveedorModal({ open, onClose, proveedor }: Props) {
  const { importaciones } = useImportacionesStore()
  const [selected, setSelected] = useState<Importacion | null>(null)

  const imps = importaciones
    .filter((i) => i.proveedor === proveedor.nombre)
    .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))

  const handleClose = () => { setSelected(null); onClose() }

  const title = selected
    ? `${selected.numero} — ${proveedor.nombre}`
    : `Historial de importaciones — ${proveedor.nombre}`

  return (
    <Modal open={open} onClose={handleClose} title={title} size="2xl">
      {selected ? (
        <DetalleImportacion imp={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          {imps.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="h-12 w-12 text-steel-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-[13px] font-medium text-steel-600 mb-1">Sin importaciones registradas</p>
              <p className="text-[12px] text-steel-400">Las importaciones de este proveedor aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-2">
              {imps.map((imp) => {
                const estado = ESTADO_CONFIG[imp.estado]
                return (
                  <button key={imp.id} onClick={() => setSelected(imp)} className="w-full text-left group">
                    <div
                      className="flex items-center gap-4 px-5 py-4 rounded-xl transition-colors group-hover:border-brand-200"
                      style={{ background: '#FFFFFF', border: '1px solid #E8EDF3', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-steel-800 group-hover:text-brand-700 transition-colors">
                          {imp.numero}
                        </p>
                        <p className="text-[11px] text-steel-400 mt-0.5">
                          Llegada: {fmtDate(imp.fecha_estimada_llegada)}
                          {' · '}
                          {imp.items.length} producto{imp.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="hidden sm:block text-right">
                        <p className="text-[13px] font-semibold tabular-nums text-steel-800">{fmtUSD(imp.fob_total_usd)}</p>
                        <p className="text-[10px] text-steel-400">FOB</p>
                      </div>
                      <span
                        className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{ background: estado.bg, color: estado.color, border: `1px solid ${estado.border}` }}
                      >
                        {estado.label}
                      </span>
                      <svg
                        className="h-4 w-4 text-steel-300 group-hover:text-brand-500 transition-colors shrink-0"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
