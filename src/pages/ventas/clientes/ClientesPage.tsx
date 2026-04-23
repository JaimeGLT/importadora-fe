import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useClientesStore } from '@/stores/clientesStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui'
import { MOCK_CLIENTES } from '@/mock/clientes'
import type { Cliente } from '@/types'
import { ClienteFormModal } from './ClienteFormModal'
import { ClienteHistorialModal } from './ClienteHistorialModal'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'

export function ClientesPage() {
  const { isTokenReady } = useAuth()
  const [formOpen, setFormOpen]         = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [search, setSearch]             = useState('')
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activo' | 'inactivo'>('todos')

  const { clientes, setClientes, addCliente, updateCliente, removeCliente, toggleActivo } = useClientesStore()

  useEffect(() => {
    if (!isTokenReady) return
    setClientes(MOCK_CLIENTES)
  }, [isTokenReady, setClientes])

  const filtered = useMemo(() => {
    return clientes.filter((c) => {
      const q = search.toLowerCase()
      const ciCompleto = c.ci && c.ciComplemento
        ? `${c.ci}-${c.ciComplemento}`
        : c.ci ?? ''
      const matchSearch =
        !search ||
        ciCompleto.toLowerCase().includes(q) ||
        (c.ci?.includes(q) ?? false) ||
        (c.nit?.toLowerCase().includes(q) ?? false) ||
        (c.nombre?.toLowerCase().includes(q) ?? false) ||
        c.apellido.toLowerCase().includes(q) ||
        (c.telefono?.includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
      const matchActivo =
        filterActivo === 'todos' ||
        (filterActivo === 'activo' ? c.activo : !c.activo)
      return matchSearch && matchActivo
    })
  }, [clientes, search, filterActivo])

  const stats = useMemo(() => ({
    total: clientes.length,
    activos: clientes.filter(c => c.activo).length,
    conCompras: clientes.filter(c => c.compras.length > 0).length,
  }), [clientes])

  const handleSave = (data: Omit<Cliente, 'id' | 'creado_en' | 'actualizado_en' | 'compras'>) => {
    const ahora = new Date().toISOString()
    if (editingCliente) {
      updateCliente({ ...editingCliente, ...data, actualizado_en: ahora })
      notify.success('Cliente actualizado')
    } else {
      addCliente({ ...data, id: crypto.randomUUID(), compras: [], creado_en: ahora, actualizado_en: ahora })
      notify.success('Cliente registrado')
    }
    setFormOpen(false)
    setEditingCliente(null)
  }

  const handleDelete = (c: Cliente) => {
    removeCliente(c.id)
    notify.success('Cliente eliminado')
  }

  const openEdit = (c: Cliente) => { setEditingCliente(c); setFormOpen(true) }
  const openNew  = () => { setEditingCliente(null); setFormOpen(true) }
  const openHistorial = (c: Cliente) => { setSelectedCliente(c); setHistorialOpen(true) }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Clientes"
          description="Gestión de clientes del sistema"
          actions={
            <Button
              onClick={openNew}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              <span className="hidden sm:inline">Nuevo cliente</span>
            </Button>
          }
        />

        <div className="grid grid-cols-3 gap-3 mb-6">
          <MetricCard label="Total clientes" value={stats.total} bg="#F5F5F5" sublabel="registrados" />
          <MetricCard label="Activos" value={stats.activos} bg="#C9F5E5" valueColor="#0A6645" sublabelColor="#2A8A60" sublabel="en sistema" />
          <MetricCard label="Con compras" value={stats.conCompras} bg="#EFF6FF" valueColor="#1D4ED8" sublabelColor="#5270C8" sublabel="han comprado" />
        </div>

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
              placeholder="Buscar por nombre, CI, NIT, apellido o teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {([['todos', 'Todos'], ['activo', 'Activos'], ['inactivo', 'Inactivos']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterActivo(val)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors',
                  filterActivo === val
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
          {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
        </span>

        {!isTokenReady ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState onNew={openNew} />
        ) : (
          <>
            <div className="hidden lg:block">
              <div
                className="grid items-center px-5 pb-2 mb-1"
                style={{ gridTemplateColumns: '180px 1fr 110px 110px 100px 120px', gap: '0 16px' }}
              >
                {['Identificación', 'Cliente', 'Teléfono', 'NIT', 'Compras', 'Acciones'].map((h) => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">{h}</span>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {filtered.map((c) => (
                  <ClienteRow
                    key={c.id}
                    cliente={c}
                    onToggle={() => toggleActivo(c.id)}
                    onEdit={() => openEdit(c)}
                    onDelete={() => handleDelete(c)}
                    onHistorial={() => openHistorial(c)}
                  />
                ))}
              </div>
            </div>

            <div className="lg:hidden flex flex-col gap-2">
              {filtered.map((c) => (
                <ClienteCard
                  key={c.id}
                  cliente={c}
                  onToggle={() => toggleActivo(c.id)}
                  onEdit={() => openEdit(c)}
                  onDelete={() => handleDelete(c)}
                  onHistorial={() => openHistorial(c)}
                />
              ))}
            </div>
          </>
        )}
      </PageContainer>

      <ClienteFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingCliente(null) }}
        onSave={handleSave}
        initial={editingCliente}
      />

      <ClienteHistorialModal
        open={historialOpen}
        onClose={() => { setHistorialOpen(false); setSelectedCliente(null) }}
        cliente={selectedCliente}
      />
    </MainLayout>
  )
}

interface RowProps {
  cliente: Cliente
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onHistorial: () => void
}

function ClienteRow({ cliente, onEdit, onDelete, onHistorial }: RowProps) {
  const ciDisplay = cliente.ci
    ? cliente.ciComplemento
      ? `${cliente.ci}-${cliente.ciComplemento}`
      : cliente.ci
    : null
  return (
    <div
      className="grid items-center px-5 py-3.5 rounded-xl"
      style={{
        gridTemplateColumns: '180px 1fr 110px 110px 100px 120px',
        gap: '0 16px',
        background: '#FFFFFF',
        border: '1px solid #E8EDF3',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        opacity: cliente.activo ? 1 : 0.6,
      }}
    >
      <div className="min-w-0">
        {ciDisplay ? (
          <p className="text-[12px] font-mono text-steel-700 truncate">{ciDisplay}</p>
        ) : null}
        {cliente.nit && (
          <p className="text-[11px] text-brand-600 font-medium truncate">NIT: {cliente.nit}</p>
        )}
        {!ciDisplay && !cliente.nit && (
          <p className="text-[11px] text-steel-400 italic">Sin ID</p>
        )}
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-[13px] text-steel-800 truncate">
          {cliente.nombre ? `${cliente.nombre} ${cliente.apellido}` : cliente.apellido}
        </p>
        {cliente.email && <p className="text-[11px] text-steel-400 truncate">{cliente.email}</p>}
      </div>

      <p className="text-[12px] text-steel-600">{cliente.telefono ?? '—'}</p>

      <p className="text-[12px] text-steel-600">{cliente.nit ?? '—'}</p>

      <button
        onClick={onHistorial}
        className="flex items-center gap-1.5 text-[12px] text-brand-600 hover:text-brand-700 font-medium transition-colors w-fit"
      >
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        {cliente.compras.length}
      </button>

      <div className="flex items-center gap-1 justify-end">
        <button onClick={onEdit} title="Editar" className="p-2 rounded-lg text-steel-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={onDelete} title="Eliminar" className="p-2 rounded-lg text-steel-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function ClienteCard({ cliente, onToggle, onEdit, onDelete, onHistorial }: RowProps) {
  const ciDisplay = cliente.ci
    ? cliente.ciComplemento
      ? `${cliente.ci}-${cliente.ciComplemento}`
      : cliente.ci
    : null
  return (
    <div
      className="bg-white rounded-xl px-4 py-4"
      style={{ border: '1px solid #E8EDF3', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', opacity: cliente.activo ? 1 : 0.6 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-[13px] text-steel-800 truncate">
            {cliente.nombre ? `${cliente.nombre} ${cliente.apellido}` : cliente.apellido}
          </p>
          {ciDisplay && <p className="text-[11px] text-steel-500">CI: {ciDisplay}</p>}
          {cliente.nit && <p className="text-[11px] text-brand-600">NIT: {cliente.nit}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium" style={{ color: cliente.activo ? '#0A6645' : '#991B1B' }}>
            {cliente.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button
            onClick={onToggle}
            className={clsx(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
              cliente.activo ? 'bg-brand-600' : 'bg-steel-300',
            )}
          >
            <span
              className={clsx(
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                cliente.activo ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-steel-500 mb-3">
        {cliente.telefono && <span>Telf: {cliente.telefono}</span>}
        {cliente.email && <span>{cliente.email}</span>}
        <button
          onClick={onHistorial}
          className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
        >
          {cliente.compras.length} compra{cliente.compras.length !== 1 ? 's' : ''}
        </button>
      </div>

      <div className="flex items-center gap-1 pt-3 border-t border-steel-100">
        <button onClick={onHistorial} className="p-2 rounded-lg text-steel-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Historial">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
        <button onClick={onEdit} className="p-2 rounded-lg text-steel-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Editar">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <div className="flex-1" />
        <button onClick={onDelete} className="p-2 rounded-lg text-steel-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="py-20 text-center">
      <svg className="h-12 w-12 text-steel-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p className="text-[14px] font-medium text-steel-600 mb-1">Sin clientes registrados</p>
      <p className="text-[12px] text-steel-400 mb-5">Agrega el primer cliente del sistema</p>
      <Button size="sm" onClick={onNew}>Nuevo cliente</Button>
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