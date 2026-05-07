import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useMarcasStore } from '@/stores/marcasStore'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'
import { Button, Input, ConfirmModal } from '@/components/ui'
import type { Marca } from '@/types'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'

export function MarcasPage() {
  const { user } = useAuth()
  const { marcas, addMarca, updateMarca, removeMarca } = useMarcasStore()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Marca | null>(null)
  const [formNombre, setFormNombre] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return marcas
    return marcas.filter((m) =>
      m.nombre.toLowerCase().includes(search.toLowerCase())
    )
  }, [marcas, search])

  const handleOpenNew = () => {
    setEditingMarca(null)
    setFormNombre('')
    setFormOpen(true)
  }

  const handleOpenEdit = (m: Marca) => {
    setEditingMarca(m)
    setFormNombre(m.nombre)
    setFormOpen(true)
  }

  const handleSave = () => {
    const nombre = formNombre.trim()
    if (!nombre) { notify.error('Ingresa un nombre'); return }
    if (marcas.some((m) => m.id !== editingMarca?.id && m.nombre.toLowerCase() === nombre.toLowerCase())) {
      notify.error('Ya existe una marca con ese nombre')
      return
    }
    setSaving(true)
    setTimeout(() => {
      if (editingMarca) {
        updateMarca(editingMarca.id, nombre)
        notify.success('Marca actualizada')
      } else {
        addMarca(nombre)
        notify.success('Marca creada')
      }
      setFormOpen(false)
      setEditingMarca(null)
      setFormNombre('')
      setSaving(false)
    }, 300)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    removeMarca(deleteTarget.id)
    notify.success('Marca eliminada')
    setDeleteTarget(null)
  }

  if (user?.rol !== 'admin') {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-steel-500">No tienes acceso a esta sección</p>
          </div>
        </PageContainer>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Marcas"
          description="Administración de marcas de productos"
          actions={
            <Button
              onClick={handleOpenNew}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Nueva marca
            </Button>
          }
        />

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            }
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-steel-100 overflow-hidden">
          {marcas.length === 0 ? (
            <EmptyState onNew={handleOpenNew} />
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-steel-400">No se encontraron marcas</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-steel-100">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-steel-400 uppercase tracking-widest">Nombre</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-steel-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-50">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-steel-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-steel-800">{m.nombre}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 rounded-lg text-steel-400 hover:text-steel-700 hover:bg-steel-100 transition-colors"
                          title="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="p-1.5 rounded-lg text-steel-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Form Modal */}
        <FormModal
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingMarca(null); setFormNombre('') }}
          nombre={formNombre}
          setNombre={setFormNombre}
          onSave={handleSave}
          saving={saving}
          editing={!!editingMarca}
        />

        {/* Delete Confirm */}
        <ConfirmModal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Eliminar marca"
          message={`¿Eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        />
      </PageContainer>
    </MainLayout>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-12 w-12 rounded-2xl bg-steel-50 border border-steel-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-steel-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-steel-700 mb-1">Sin marcas registradas</h3>
      <p className="text-xs text-steel-400 text-center max-w-xs mb-5">Crea tu primera marca para organizar tus productos</p>
      <Button onClick={onNew} icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
        Nueva marca
      </Button>
    </div>
  )
}

function FormModal({
  open, onClose, nombre, setNombre, onSave, saving, editing,
}: {
  open: boolean
  onClose: () => void
  nombre: string
  setNombre: (v: string) => void
  onSave: () => void
  saving: boolean
  editing: boolean
}) {
  return (
    <div className={clsx(!open && 'hidden', 'fixed inset-0 z-50 flex items-center justify-center p-4')}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
        <h2 className="text-base font-semibold text-steel-900 mb-4">
          {editing ? 'Editar marca' : 'Nueva marca'}
        </h2>
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Bosch, NGK, Continental…"
          onKeyDown={(e) => { if (e.key === 'Enter') onSave() }}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} loading={saving}>{editing ? 'Guardar cambios' : 'Crear marca'}</Button>
        </div>
      </div>
    </div>
  )
}
