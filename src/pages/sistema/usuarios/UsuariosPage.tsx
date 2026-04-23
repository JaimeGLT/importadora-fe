import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsuariosStore } from '@/stores/usuariosStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui'
import { MOCK_USUARIOS } from '@/mock/usuarios'
import type { Usuario } from '@/types'
import { UsuarioFormModal } from './UsuarioFormModal'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'

export function UsuariosPage() {
  const { isTokenReady } = useAuth()
  const [formOpen, setFormOpen]         = useState(false)
  const [editingUser, setEditingUser]   = useState<Usuario | null>(null)
  const [search, setSearch]             = useState('')
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activo' | 'inactivo'>('todos')

  const { usuarios, setUsuarios, addUsuario, updateUsuario, removeUsuario, toggleActivo } = useUsuariosStore()

  useEffect(() => {
    if (!isTokenReady) return
    setUsuarios(MOCK_USUARIOS)
  }, [isTokenReady, setUsuarios])

  const filtered = useMemo(() => {
    return usuarios.filter((u) => {
      const matchSearch =
        !search ||
        u.nombre.toLowerCase().includes(search.toLowerCase()) ||
        u.apellido.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      const matchActivo =
        filterActivo === 'todos' ||
        (filterActivo === 'activo' ? u.activo : !u.activo)
      return matchSearch && matchActivo
    })
  }, [usuarios, search, filterActivo])

  const stats = useMemo(() => ({
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    inactivos: usuarios.filter(u => !u.activo).length,
  }), [usuarios])

  const handleSave = (data: Omit<Usuario, 'id' | 'creado_en' | 'actualizado_en'>) => {
    const ahora = new Date().toISOString()
    if (editingUser) {
      updateUsuario({ ...editingUser, ...data, actualizado_en: ahora })
      notify.success('Usuario actualizado')
    } else {
      addUsuario({ ...data, id: crypto.randomUUID(), creado_en: ahora, actualizado_en: ahora })
      notify.success('Usuario registrado')
    }
    setFormOpen(false)
    setEditingUser(null)
  }

  const handleDelete = (u: Usuario) => {
    removeUsuario(u.id)
    notify.success('Usuario eliminado')
  }

  const openEdit = (u: Usuario) => { setEditingUser(u); setFormOpen(true) }
  const openNew  = () => { setEditingUser(null); setFormOpen(true) }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Usuarios y roles"
          description="Gestión de usuarios del sistema"
          actions={
            <Button
              onClick={openNew}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              <span className="hidden sm:inline">Nuevo usuario</span>
            </Button>
          }
        />

        <div className="grid grid-cols-3 gap-3 mb-6">
          <MetricCard label="Total usuarios" value={stats.total} bg="#F5F5F5" sublabel="registrados" />
          <MetricCard label="Activos" value={stats.activos} bg="#C9F5E5" valueColor="#0A6645" sublabelColor="#2A8A60" sublabel="pueden iniciar sesión" />
          <MetricCard label="Inactivos" value={stats.inactivos} bg="#FFE5E5" valueColor="#991B1B" sublabelColor="#CC2222" sublabel="sin acceso" />
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
              placeholder="Buscar por nombre, apellido o correo…"
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
          {filtered.length} usuario{filtered.length !== 1 ? 'es' : ''}
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
                style={{ gridTemplateColumns: '1fr 180px 120px 100px 120px', gap: '0 16px' }}
              >
                {['Usuario', 'Correo electrónico', 'Rol', 'Estado', 'Acciones'].map((h) => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">{h}</span>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {filtered.map((u) => (
                  <UsuarioRow
                    key={u.id}
                    usuario={u}
                    onToggle={() => toggleActivo(u.id)}
                    onEdit={() => openEdit(u)}
                    onDelete={() => handleDelete(u)}
                  />
                ))}
              </div>
            </div>

            <div className="lg:hidden flex flex-col gap-2">
              {filtered.map((u) => (
                <UsuarioCard
                  key={u.id}
                  usuario={u}
                  onToggle={() => toggleActivo(u.id)}
                  onEdit={() => openEdit(u)}
                  onDelete={() => handleDelete(u)}
                />
              ))}
            </div>
          </>
        )}
      </PageContainer>

      <UsuarioFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingUser(null) }}
        onSave={handleSave}
        initial={editingUser}
      />
    </MainLayout>
  )
}

interface RowProps {
  usuario: Usuario
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  cajero: 'Cajero',
  almacenero: 'Almacenero',
}

function UsuarioRow({ usuario, onToggle, onEdit, onDelete }: RowProps) {
  return (
    <div
      className="grid items-center px-5 py-3.5 rounded-xl"
      style={{
        gridTemplateColumns: '1fr 180px 120px 100px 120px',
        gap: '0 16px',
        background: '#FFFFFF',
        border: '1px solid #E8EDF3',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        opacity: usuario.activo ? 1 : 0.6,
      }}
    >
      <div className="min-w-0 flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ background: '#EFF6FF', color: '#1D4ED8' }}
        >
          {usuario.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[13px] text-steel-800 truncate">
            {usuario.nombre} {usuario.apellido}
          </p>
        </div>
      </div>

      <p className="text-[12px] text-steel-600 truncate">{usuario.email}</p>

      <span
        className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit"
        style={{
          background: usuario.rol === 'admin' ? '#EFF6FF' : '#F5F5F5',
          color: usuario.rol === 'admin' ? '#1D4ED8' : '#1A1A1A',
          border: '1px solid',
          borderColor: usuario.rol === 'admin' ? '#BFDBFE' : '#E8EDF3',
        }}
      >
        {ROL_LABELS[usuario.rol]}
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={clsx(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
            usuario.activo ? 'bg-brand-600' : 'bg-steel-300',
          )}
        >
          <span
            className={clsx(
              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
              usuario.activo ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
        <span className="text-[11px] font-medium" style={{ color: usuario.activo ? '#0A6645' : '#991B1B' }}>
          {usuario.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div className="flex items-center gap-1 justify-end">
        <button
          onClick={onEdit}
          title="Editar usuario"
          className="p-2 rounded-lg text-steel-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          title="Eliminar usuario"
          className="p-2 rounded-lg text-steel-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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

function UsuarioCard({ usuario, onToggle, onEdit, onDelete }: RowProps) {
  return (
    <div
      className="bg-white rounded-xl px-4 py-4"
      style={{ border: '1px solid #E8EDF3', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', opacity: usuario.activo ? 1 : 0.6 }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: '#EFF6FF', color: '#1D4ED8' }}
          >
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[13px] text-steel-800 truncate">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="text-[11px] text-steel-400 truncate">{usuario.email}</p>
          </div>
        </div>
        <span
          className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{
            background: usuario.rol === 'admin' ? '#EFF6FF' : '#F5F5F5',
            color: usuario.rol === 'admin' ? '#1D4ED8' : '#1A1A1A',
            border: '1px solid',
            borderColor: usuario.rol === 'admin' ? '#BFDBFE' : '#E8EDF3',
          }}
        >
          {ROL_LABELS[usuario.rol]}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-steel-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={clsx(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
              usuario.activo ? 'bg-brand-600' : 'bg-steel-300',
            )}
          >
            <span
              className={clsx(
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                usuario.activo ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </button>
          <span className="text-[11px] font-medium" style={{ color: usuario.activo ? '#0A6645' : '#991B1B' }}>
            {usuario.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div className="flex items-center gap-1">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
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
      <p className="text-[14px] font-medium text-steel-600 mb-1">Sin usuarios registrados</p>
      <p className="text-[12px] text-steel-400 mb-5">Agrega el primer usuario del sistema</p>
      <Button size="sm" onClick={onNew}>Nuevo usuario</Button>
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