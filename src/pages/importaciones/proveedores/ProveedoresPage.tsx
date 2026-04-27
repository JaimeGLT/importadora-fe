import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui'
import type { Proveedor, Importacion } from '@/types'
import { ProveedorFormModal } from './ProveedorFormModal'
import { CatalogoProveedorModal } from './CatalogoProveedorModal'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'
import { gql } from '@/lib/graphql'
import { api } from '@/lib/api'
import {
  backendToProveedor,
  backendToImportacionSimple,
  PROVEEDORES_LIST_QUERY,
  PROVEEDOR_IMPORTACIONES_QUERY,
  DtoProveedor,
} from '@/lib/queries/proveedores.queries'

export function ProveedoresPage() {
  const { isTokenReady } = useAuth()

  const [formOpen, setFormOpen] = useState(false)
  const [editingProv, setEditingProv] = useState<Proveedor | null>(null)
  const [historialProv, setHistorialProv] = useState<Proveedor | null>(null)
  const [historialImportaciones, setHistorialImportaciones] = useState<Importacion[]>([])
  const [historialLoading, setHistorialLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<'activo' | 'inactivo' | ''>('')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isTokenReady) return
    loadProveedores()
  }, [isTokenReady])

  const loadProveedores = () => {
    let cancelled = false
    setLoading(true)
    gql<{ proveedor: { nodes: { id: number; nombre: string; nota: string; canImportaciones: number; total: number; pais: string; moneda: string; terminos: string; nombre_Contacto: string; email: string; telefono: string; tiempoReposicion: number; sitioWeb: string; estado: boolean }[] } }>(PROVEEDORES_LIST_QUERY)
      .then((res) => {
        if (cancelled) return
        setProveedores(res.proveedor.nodes.map(backendToProveedor))
      })
      .catch(() => notify.error('Error cargando proveedores'))
      .finally(() => { if (!cancelled) setLoading(false) })
  }

  const loadHistorial = (proveedorId: string) => {
    setHistorialLoading(true)
    gql<{ importacion: { nodes: { id: number; codigo: string; fecha: string; cantProductos: number; total: number; estado: string; id_Proveedor: number; f_Internacional: number; aduana_Arancel: number; trasporte_Interno: number; proveedor: { id: number; nombre: string; pais: string }; detalles: { id: number; codigo: string; codigoAux: string; codigoAux2: string; nombre: string; descripcion: string; marca: string; unidad_Medida: string; ubicacion: string; stock_Actual: number; stock_Minimo: number; costo: number; precio: number; conversionABs: number; tipo: string }[] }[] } }>(
      PROVEEDOR_IMPORTACIONES_QUERY,
      { id: Number(proveedorId) },
    )
      .then((res) => {
        setHistorialImportaciones(res.importacion.nodes.map(backendToImportacionSimple))
      })
      .catch(() => notify.error('Error cargando historial'))
      .finally(() => setHistorialLoading(false))
  }

  const handleSave = async (data: Omit<Proveedor, 'id' | 'creado_en' | 'actualizado_en'>) => {
    if (!validateProveedor(data)) return
    setSaving(true)
    try {
      const body: DtoProveedor = {
        nombre: data.nombre,
        pais: data.pais,
        moneda: data.moneda,
        terminos: data.terminos_pago,
        nombre_Contacto: data.contacto,
        email: data.email,
        telefono: data.telefono ?? '',
        tiempoReposicion: data.tiempo_reposicion_dias ?? 0,
        sitioWeb: data.sitio_web ?? '',
        estado: data.estado === 'activo',
        nota: data.notas ?? '',
      }

      if (editingProv) {
        await api.put(`/Proveedor/${editingProv.id}`, body)
        setProveedores((prev) =>
          prev.map((p) =>
            p.id === editingProv.id
              ? { ...p, ...data, actualizado_en: new Date().toISOString() }
              : p,
          ),
        )
        notify.success('Proveedor actualizado')
      } else {
        const res = await api.post<{ id: number }>('/Proveedor', body)
        const newId = res?.id ?? Date.now().toString()
        const ahora = new Date().toISOString()
        const nuevo: Proveedor = { ...data, id: String(newId), creado_en: ahora, actualizado_en: ahora }
        setProveedores((prev) => [nuevo, ...prev])
        notify.success('Proveedor registrado')
      }
      setFormOpen(false)
      setEditingProv(null)
    } catch {
      notify.error(editingProv ? 'Error actualizando proveedor' : 'Error creando proveedor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (prov: Proveedor) => {
    if (!confirm(`¿Eliminar proveedor "${prov.nombre}"?`)) return
    try {
      await api.delete(`/Proveedor/${prov.id}`)
      setProveedores((prev) => prev.filter((p) => p.id !== prov.id))
      notify.success('Proveedor eliminado')
    } catch {
      notify.error('Error eliminando proveedor')
    }
  }

  const validateProveedor = (data: Omit<Proveedor, 'id' | 'creado_en' | 'actualizado_en'>): boolean => {
    if (!data.nombre.trim()) { notify.error('El nombre es requerido'); return false }
    if (!data.pais.trim())   { notify.error('El país es requerido'); return false }
    if (!data.contacto.trim()) { notify.error('El contacto es requerido'); return false }
    if (!data.email.trim() || !/\S+@\S+\.\S+/.test(data.email)) {
      notify.error('Email inválido')
      return false
    }
    return true
  }

  const filtered = useMemo(() => {
    return proveedores.filter((p) => {
      const matchSearch =
        !search ||
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.pais.toLowerCase().includes(search.toLowerCase()) ||
        p.contacto.toLowerCase().includes(search.toLowerCase())
      const matchEstado = !filterEstado || p.estado === filterEstado
      return matchSearch && matchEstado
    })
  }, [proveedores, search, filterEstado])

  const totalActivos = useMemo(
    () => proveedores.filter((p) => p.estado === 'activo').length,
    [proveedores],
  )

  const openEdit = (p: Proveedor) => { setEditingProv(p); setFormOpen(true) }
  const openNew  = () => { setEditingProv(null); setFormOpen(true) }

  const openHistorial = (p: Proveedor) => {
    setHistorialProv(p)
    loadHistorial(p.id)
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Proveedores"
          description="Registro de proveedores internacionales"
          actions={
            <Button
              onClick={openNew}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              <span className="hidden sm:inline">Nuevo proveedor</span>
            </Button>
          }
        />

        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <MetricCard label="Proveedores activos" value={totalActivos}        bg="#DDE8FF" valueColor="#1A40C4" sublabelColor="#5270C8" sublabel="en operación" />
          <MetricCard label="Total registrados"   value={proveedores.length}  bg="#F5F5F5" sublabel="en sistema" />
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-steel-200 bg-white text-[13px] text-steel-800 placeholder-steel-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              placeholder="Buscar por nombre, país o contacto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {([['', 'Todos'], ['activo', 'Activos'], ['inactivo', 'Inactivos']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterEstado(val)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors',
                  filterEstado === val
                    ? 'bg-steel-800 text-white border-steel-800'
                    : 'bg-white text-steel-600 border-steel-200 hover:border-steel-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <span className="block text-[12px] text-steel-400 mb-3">
          {filtered.length} proveedor{filtered.length !== 1 ? 'es' : ''}
        </span>

        {/* Lista */}
        {!isTokenReady || loading ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState onNew={openNew} />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block">
              <div
                className="grid items-center px-5 pb-2 mb-1"
                style={{ gridTemplateColumns: '1fr 110px 100px 140px 120px 80px', gap: '0 16px' }}
              >
                {['Proveedor', 'País', 'Moneda', 'Términos pago', 'Email / Contacto', ''].map((h) => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">{h}</span>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {filtered.map((p) => (
                  <ProveedorRow
                    key={p.id}
                    prov={p}
                    onEdit={() => openEdit(p)}
                    onDelete={() => handleDelete(p)}
                    onHistorial={() => openHistorial(p)}
                  />
                ))}
              </div>
            </div>

            {/* Mobile / Tablet */}
            <div className="lg:hidden flex flex-col gap-2">
              {filtered.map((p) => (
                <ProveedorCard
                  key={p.id}
                  prov={p}
                  onEdit={() => openEdit(p)}
                  onDelete={() => handleDelete(p)}
                  onHistorial={() => openHistorial(p)}
                />
              ))}
            </div>
          </>
        )}
      </PageContainer>

      <ProveedorFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingProv(null) }}
        onSave={handleSave}
        initial={editingProv}
        saving={saving}
      />

      {historialProv && (
        <CatalogoProveedorModal
          open={!!historialProv}
          onClose={() => setHistorialProv(null)}
          proveedor={historialProv}
          importaciones={historialImportaciones}
          loading={historialLoading}
        />
      )}
    </MainLayout>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface RowProps {
  prov: Proveedor
  onEdit: () => void
  onDelete: () => void
  onHistorial: () => void
}

function ProveedorRow({ prov, onEdit, onDelete, onHistorial }: RowProps) {
  const COL = '1fr 110px 100px 140px 120px 80px'
  return (
    <div
      className="grid items-center px-5 py-3.5 rounded-xl"
      style={{
        gridTemplateColumns: COL,
        gap: '0 16px',
        background: '#FFFFFF',
        border: '1px solid #E8EDF3',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        opacity: prov.estado === 'inactivo' ? 0.6 : 1,
      }}
    >
      <div className="min-w-0">
        <p className="font-semibold text-[13px] text-steel-800 truncate">{prov.nombre}</p>
        <p className="text-[11px] text-steel-400 mt-0.5 truncate">{prov.email}</p>
      </div>

      <p className="text-[12px] text-steel-700 truncate">{prov.pais}</p>

      <span
        className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit"
        style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
      >
        {prov.moneda}
      </span>

      <p className="text-[11px] text-steel-600 truncate">{prov.terminos_pago}</p>

      <p className="text-[11px] text-steel-500 truncate">{prov.contacto}</p>

      <div className="flex items-center gap-1 justify-end">
        <IconBtn title="Ver historial" onClick={onHistorial}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </IconBtn>
        <IconBtn title="Editar proveedor" onClick={onEdit}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </IconBtn>
        <IconBtn title="Eliminar proveedor" onClick={onDelete}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </IconBtn>
      </div>
    </div>
  )
}

function ProveedorCard({ prov, onEdit, onDelete, onHistorial }: RowProps) {
  return (
    <div
      className="bg-white rounded-xl px-4 py-4"
      style={{ border: '1px solid #E8EDF3', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', opacity: prov.estado === 'inactivo' ? 0.6 : 1 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[13px] text-steel-800 truncate">{prov.nombre}</p>
          <p className="text-[11px] text-steel-400 mt-0.5">{prov.pais} · {prov.moneda}</p>
        </div>
        <span
          className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
        >
          {prov.moneda}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[12px]">
        <span className="text-steel-400">Pago: <span className="text-steel-700">{prov.terminos_pago}</span></span>
        <span className="text-steel-400">Contacto: <span className="text-steel-700">{prov.contacto}</span></span>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-steel-100">
        <button
          onClick={onHistorial}
          className="flex items-center gap-1.5 text-[12px] text-brand-600 hover:text-brand-700 font-medium transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Ver historial
        </button>
        <div className="flex-1" />
        <button
          onClick={onEdit}
          className="p-2 rounded-lg text-steel-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          title="Editar"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-steel-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Eliminar"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-lg text-steel-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">{children}</svg>
    </button>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="py-20 text-center">
      <svg className="h-12 w-12 text-steel-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p className="text-[14px] font-medium text-steel-600 mb-1">Sin proveedores registrados</p>
      <p className="text-[12px] text-steel-400 mb-5">Agrega tu primer proveedor internacional</p>
      <Button size="sm" onClick={onNew}>Nuevo proveedor</Button>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: number | string
  sublabel: string
  bg?: string
  valueColor?: string
  sublabelColor?: string
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
        <div key={i} className="px-5 py-4 rounded-xl animate-pulse" style={{ background: '#FFFFFF', border: '1px solid #E8EDF3' }}>
          <div className="h-3 w-48 rounded mb-2" style={{ background: '#F1F5F9' }} />
          <div className="h-2.5 w-32 rounded" style={{ background: '#F1F5F9' }} />
        </div>
      ))}
    </div>
  )
}