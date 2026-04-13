import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useImportacionesStore } from '@/stores/importacionesStore'
import { useInventarioStore } from '@/stores/inventarioStore'
import { useProveedoresStore } from '@/stores/proveedoresStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui'
import { MOCK_IMPORTACIONES, MOCK_ORIGENES } from '@/mock/importaciones'
import { MOCK_PRODUCTOS } from '@/mock/inventario'
import { MOCK_PROVEEDORES } from '@/mock/proveedores'
import type { Importacion, EstadoImportacion } from '@/types'
import { NuevaImportacionModal } from './NuevaImportacionModal'
import { ConfigOrigenModal } from './ConfigOrigenModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const ESTADO_CONFIG: Record<EstadoImportacion, { label: string; bg: string; color: string; border: string }> = {
  en_transito: { label: 'En tránsito',  bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  en_aduana:   { label: 'En aduana',    bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  recibida:    { label: 'Recibida',     bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  cancelada:   { label: 'Cancelada',    bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function ImportacionesPage() {
  // 1. Auth
  const { isTokenReady, user } = useAuth()

  // 2. Estado local
  const [nuevaOpen, setNuevaOpen]   = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [filterEstado, setFilterEstado] = useState<EstadoImportacion | ''>('')

  // 3. Stores
  const { importaciones, setImportaciones, setOrigenes, addImportacion } =
    useImportacionesStore()
  const { productos, setProductos } = useInventarioStore()
  const { setProveedores } = useProveedoresStore()

  // 4. Fetch con isTokenReady (mock)
  useEffect(() => {
    if (!isTokenReady) return
    setImportaciones(MOCK_IMPORTACIONES)
    setOrigenes(MOCK_ORIGENES)
    setProductos(MOCK_PRODUCTOS, MOCK_PRODUCTOS.length)
    setProveedores(MOCK_PROVEEDORES)
  }, [isTokenReady, setImportaciones, setOrigenes, setProductos, setProveedores])

  // 5. Datos derivados
  const filtered = useMemo(() => {
    return importaciones.filter((i) => !filterEstado || i.estado === filterEstado)
  }, [importaciones, filterEstado])

  const enTransito = useMemo(
    () => importaciones.filter((i) => i.estado === 'en_transito').length,
    [importaciones],
  )
  const valorTotal = useMemo(
    () => importaciones.reduce((s, i) => s + i.fob_total_usd, 0),
    [importaciones],
  )

  // 6. Handlers
  const handleSave = (data: Omit<Importacion, 'id' | 'creado_en' | 'actualizado_en'>) => {
    const ahora = new Date().toISOString()
    const nueva: Importacion = { ...data, id: crypto.randomUUID(), creado_en: ahora, actualizado_en: ahora }
    addImportacion(nueva)

    // Actualizar inventario: nuevos productos se crean, existentes suman stock
    const updatedProductos = [...productos]
    for (const item of nueva.items) {
      if (item.es_nuevo) {
        updatedProductos.push({
          id: crypto.randomUUID(),
          codigo_universal: item.codigo_proveedor,
          codigos_alternativos: item.codigos_adicionales,
          nombre: item.nombre,
          descripcion: item.descripcion ?? '',
          categoria: 'Otro',
          marca: item.marca ?? '',
          vehiculo: '',
          unidad: item.unidad ?? 'pieza',
          stock: item.cantidad,
          stock_minimo: (item as typeof item & { stock_minimo?: number }).stock_minimo ?? 5,
          precio_costo: item.costo_unitario_total_bs,
          precio_venta: item.precio_venta_final,
          historial_precios: [{
            fecha: ahora,
            precio_costo: item.costo_unitario_total_bs,
            precio_venta: item.precio_venta_final,
            tipo_cambio: nueva.tipo_cambio,
          }],
          ubicacion: item.ubicacion ?? 'Almacén Central',
          estado: 'activo',
          proveedor_id: nueva.proveedor,
          creado_en: ahora,
          actualizado_en: ahora,
        })
      } else {
        const idx = updatedProductos.findIndex((p) => p.id === item.producto_id)
        if (idx >= 0) {
          updatedProductos[idx] = {
            ...updatedProductos[idx],
            stock: updatedProductos[idx].stock + item.cantidad,
            precio_costo: item.costo_unitario_total_bs,
            precio_venta: item.precio_venta_final,
            historial_precios: [
              ...updatedProductos[idx].historial_precios,
              {
                fecha: ahora,
                precio_costo: item.costo_unitario_total_bs,
                precio_venta: item.precio_venta_final,
                tipo_cambio: nueva.tipo_cambio,
              },
            ],
            actualizado_en: ahora,
          }
        }
      }
    }
    setProductos(updatedProductos, updatedProductos.length)
    toast.success(`Importación ${nueva.numero} registrada · ${nueva.items.length} productos actualizados`)
  }

  // 7. Render
  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Importaciones"
          actions={
            <>
              {user?.rol === 'admin' && (
                <Button variant="secondary" onClick={() => setConfigOpen(true)} icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }>
                  <span className="hidden sm:inline">Configurar orígenes</span>
                </Button>
              )}
              <Button onClick={() => setNuevaOpen(true)} icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }>
                <span className="hidden sm:inline">Nueva importación</span>
              </Button>
            </>
          }
        />

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <MetricCard label="Total importaciones" value={importaciones.length} sublabel="registradas" bg="#DDE8FF" valueColor="#1A40C4" sublabelColor="#5270C8" />
          <MetricCard label="En tránsito" value={enTransito} sublabel="en camino" warn={enTransito > 0} />
          <MetricCard label="Valor FOB total" value={fmtUSD(valorTotal)} sublabel="acumulado USD" bg="#C9F5E5" valueColor="#0A6645" sublabelColor="#2A8A60" />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(['' , 'en_transito', 'en_aduana', 'recibida', 'cancelada'] as const).map((estado) => {
            const cfg = estado ? ESTADO_CONFIG[estado] : null
            return (
              <button
                key={estado}
                onClick={() => setFilterEstado(estado)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors',
                  filterEstado === estado
                    ? 'bg-steel-800 text-white border-steel-800'
                    : 'bg-white text-steel-600 border-steel-200 hover:border-steel-300',
                )}
              >
                {cfg ? cfg.label : 'Todas'}
              </button>
            )
          })}
          <span className="ml-auto text-[12px] text-steel-400">{filtered.length} importaci{filtered.length === 1 ? 'ón' : 'ones'}</span>
        </div>

        {/* Lista */}
        {!isTokenReady ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState onNew={() => setNuevaOpen(true)} />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <div className="grid items-center px-5 pb-2 mb-1" style={{ gridTemplateColumns: '1fr 160px 130px 110px 120px', gap: '0 16px' }}>
                {['Importación', 'Fecha llegada', 'FOB (USD)', 'Estado', 'Acciones'].map((h) => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">{h}</span>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {filtered.map((imp) => (
                  <ImportacionRow key={imp.id} imp={imp} />
                ))}
              </div>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-2">
              {filtered.map((imp) => (
                <ImportacionCard key={imp.id} imp={imp} />
              ))}
            </div>
          </>
        )}
      </PageContainer>

      <NuevaImportacionModal
        open={nuevaOpen}
        onClose={() => setNuevaOpen(false)}
        onSave={handleSave}
        productos={productos}
        totalImportaciones={importaciones.length}
      />
      <ConfigOrigenModal open={configOpen} onClose={() => setConfigOpen(false)} />
    </MainLayout>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ImportacionRow({ imp }: { imp: Importacion }) {
  const estado = ESTADO_CONFIG[imp.estado]
  const COL = '1fr 160px 130px 110px 120px'
  return (
    <div
      className="grid items-center px-5 py-3 rounded-xl"
      style={{
        gridTemplateColumns: COL,
        gap: '0 16px',
        background: '#FFFFFF',
        border: '1px solid #E8EDF3',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      }}
    >
      {/* Col 1 */}
      <div className="min-w-0">
        <p className="font-semibold text-[13px] text-steel-800">{imp.numero}</p>
        <p className="text-[11px] text-steel-400 mt-0.5 truncate">{imp.proveedor} · {imp.origen}</p>
      </div>
      {/* Col 2 */}
      <div>
        <p className="text-[12px] text-steel-700">{fmtDate(imp.fecha_estimada_llegada)}</p>
        <p className="text-[10px] text-steel-400 mt-0.5">{imp.items.length} productos</p>
      </div>
      {/* Col 3 */}
      <p className="font-semibold text-[13px] tabular-nums text-steel-800">{fmtUSD(imp.fob_total_usd)}</p>
      {/* Col 4 */}
      <span
        className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit"
        style={{ background: estado.bg, color: estado.color, border: `1px solid ${estado.border}` }}
      >
        {estado.label}
      </span>
      {/* Col 5 */}
      <div className="flex justify-end">
        <button
          className="p-2 rounded-lg text-steel-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          title="Ver detalle"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-9-1.5A9 9 0 1121 12 9 9 0 013 12z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function ImportacionCard({ imp }: { imp: Importacion }) {
  const estado = ESTADO_CONFIG[imp.estado]
  return (
    <div className="bg-white rounded-xl px-4 py-3.5" style={{ border: '1px solid #E8EDF3', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[13px] text-steel-800">{imp.numero}</p>
          <p className="text-[11px] text-steel-400 mt-0.5 truncate">{imp.proveedor} · {imp.origen}</p>
        </div>
        <span
          className="shrink-0 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: estado.bg, color: estado.color, border: `1px solid ${estado.border}` }}
        >
          {estado.label}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-2.5 text-[12px]">
        <span className="text-steel-400">Llegada: <span className="text-steel-700">{fmtDate(imp.fecha_estimada_llegada)}</span></span>
        <span className="text-steel-400">FOB: <span className="font-semibold text-steel-800">{fmtUSD(imp.fob_total_usd)}</span></span>
      </div>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="py-20 text-center">
      <svg className="h-12 w-12 text-steel-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <p className="text-[14px] font-medium text-steel-600 mb-1">Sin importaciones</p>
      <p className="text-[12px] text-steel-400 mb-5">Registra tu primera importación para empezar</p>
      <Button size="sm" onClick={onNew}>Nueva importación</Button>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: number | string
  sublabel: string
  warn?: boolean
  bg?: string
  valueColor?: string
  sublabelColor?: string
}

function MetricCard({ label, value, sublabel, warn = false, bg, valueColor, sublabelColor }: MetricCardProps) {
  const isWarn    = warn && Number(value) > 0
  const bgColor   = isWarn ? '#FAEEDA' : (bg ?? '#F5F5F5')
  const numColor  = isWarn ? '#7C4214' : (valueColor ?? '#1A1A1A')
  const subColor  = isWarn ? '#A06030' : (sublabelColor ?? '#8C8C8C')
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: bgColor }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: subColor }}>{label}</p>
      <p className="font-bold leading-none" style={{ fontSize: 28, color: numColor }}>{value}</p>
      <p className="text-[11px] mt-1.5" style={{ color: subColor }}>{sublabel}</p>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-5 py-4 rounded-xl animate-pulse" style={{ background: '#FFFFFF', border: '1px solid #E8EDF3' }}>
          <div className="h-3 w-40 rounded mb-2" style={{ background: '#F1F5F9' }} />
          <div className="h-2.5 w-56 rounded" style={{ background: '#F1F5F9' }} />
        </div>
      ))}
    </div>
  )
}
