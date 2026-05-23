import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useMarcasStore } from '@/stores/marcasStore'
import { MainLayout } from '@/components/layout/MainLayout'
import { Input, ConfirmModal } from '@/components/ui'
import type { Marca } from '@/types'
import { notify } from '@/lib/notify'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { gql } from '@/lib/graphql'
import { MARCAS_QUERY, backendToMarca } from '@/lib/queries/marcas.queries'

export function MarcasPage() {
  const { user } = useAuth()
  const { isTokenReady } = useAuth()
  const { marcas, setMarcas, addMarca, updateMarca, removeMarca } = useMarcasStore()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Marca | null>(null)
  const [formNombre, setFormNombre] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isTokenReady) return
    gql<{ marca: { nodes: { id: number; nombre: string }[] } }>(MARCAS_QUERY)
      .then((data) => setMarcas(data.marca.nodes.map(backendToMarca)))
      .catch(() => notify.error('Error al cargar marcas'))
  }, [isTokenReady])

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

  const handleSave = async () => {
    const nombre = formNombre.trim()
    if (!nombre) { notify.error('Ingresa un nombre'); return }
    setSaving(true)
    try {
      if (editingMarca) {
        await api.put(`/marca/${editingMarca.id}`, { nombre })
        updateMarca(editingMarca.id, nombre)
        notify.success('Marca actualizada')
      } else {
        const res = await api.post<{ id: number; nombre: string }>('/marca', { nombre })
        addMarca(backendToMarca({ id: res.id, nombre: res.nombre }))
        notify.success('Marca creada')
      }
      setFormOpen(false)
      setEditingMarca(null)
      setFormNombre('')
    } catch {
      notify.error('Error al guardar la marca')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/marca/${deleteTarget.id}`)
      removeMarca(deleteTarget.id)
      notify.success('Marca eliminada')
    } catch {
      notify.error('Error al eliminar la marca')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (user?.rol !== 'admin') {
    return (
      <MainLayout>
        <div className="bg-[#f1f5f9] min-h-screen flex items-center justify-center">
          <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#fee2e2] border-[1.5px] border-[#fca5a5] flex items-center justify-center">
              <i className="ti ti-lock text-[#dc2626] text-xl" />
            </div>
            <p className="text-sm font-bold text-[#1e1b2e]">Acceso restringido</p>
            <p className="text-xs text-[#9996b0] font-semibold">No tienes permisos para esta sección</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="bg-[#f1f5f9] min-h-screen">

        {/* TopBar */}
        <header className="bg-[#f1f5f9] sticky top-0 z-40 flex justify-between items-center w-full h-[62px] px-7 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2 text-sm text-[#9996b0] font-semibold">
            <span>Sistema</span>
            <span className="text-[10px] opacity-40">/</span>
            <strong className="text-[#1e1b2e] font-bold">Marcas</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-white border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#f1f5f9] transition-colors">
              <i className="ti ti-bell text-[18px]" />
            </button>
            <button className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-white border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#f1f5f9] transition-colors">
              <i className="ti ti-settings text-[18px]" />
            </button>
          </div>
        </header>

        <div className="px-7 py-6 max-w-[1400px] mx-auto">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 bg-gradient-to-br from-[#059669] to-[#0284c7] rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ boxShadow: '0 6px 18px rgba(5,150,105,0.28)' }}
              >
                <i className="ti ti-tag text-2xl" />
              </div>
              <div>
                <h2 className="font-black text-[34px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Marcas
                </h2>
                <p className="text-sm text-[#9996b0] font-semibold mt-0.5">
                  Administración de marcas de productos
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenNew}
              className="px-[18px] py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold active:scale-95 transition-all shadow-md w-full md:w-auto"
            >
              <i className="ti ti-plus text-base" />
              Nueva marca
            </button>
          </div>

          {/* Table container */}
          <div className="bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] overflow-hidden">

            {/* Toolbar */}
            <div className="px-5 py-[18px] border-b border-[#e2e8f0] flex flex-wrap justify-between items-center gap-3">
              <h3 className="text-lg font-extrabold text-[#1e1b2e] flex items-center gap-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Lista
                <span className="bg-[#dbeafe] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {filtered.length}
                </span>
              </h3>
              <div className="flex items-center gap-2 bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] rounded-xl px-3.5 w-full sm:w-auto sm:min-w-[250px] focus-within:border-[#1d4ed8] transition-colors">
                <i className="ti ti-search text-[#9996b0] text-base shrink-0" />
                <input
                  className="flex-1 py-2 bg-transparent text-sm text-[#1e1b2e] font-semibold placeholder:text-[#9996b0] outline-none border-none"
                  placeholder="Buscar por nombre…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table content */}
            {marcas.length === 0 ? (
              <EmptyState onNew={handleOpenNew} />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-5">
                <i className="ti ti-search-off text-[#9996b0] text-3xl mb-3" />
                <p className="text-sm font-bold text-[#1e1b2e] mb-1">Sin resultados</p>
                <p className="text-xs text-[#9996b0] font-semibold">No hay marcas que coincidan con "{search}"</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-[#f1f5f9]">
                  <tr className="border-b border-[#e2e8f0]">
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-[#9996b0] uppercase tracking-wide">Nombre</th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold text-[#9996b0] uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-[#faf9ff] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#dbeafe] flex items-center justify-center shrink-0">
                            <i className="ti ti-tag text-[#1d4ed8] text-[13px]" />
                          </div>
                          <span className="font-bold text-[13px] text-[#1e1b2e]">{m.nombre}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(m)}
                            title="Editar"
                            className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#dbeafe] hover:text-[#1d4ed8] hover:border-[#1d4ed8] transition-all"
                          >
                            <i className="ti ti-edit text-[15px]" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(m)}
                            title="Eliminar"
                            className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#dc2626] transition-all"
                          >
                            <i className="ti ti-trash text-[15px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
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
    </MainLayout>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
      <div className="w-12 h-12 rounded-xl bg-white border-[1.5px] border-[#e2e8f0] flex items-center justify-center mb-4">
        <i className="ti ti-tag text-[#9996b0] text-xl" />
      </div>
      <p className="text-sm font-bold text-[#1e1b2e] mb-1">Sin marcas registradas</p>
      <p className="text-xs text-[#9996b0] font-semibold max-w-xs mb-5">
        Crea tu primera marca para organizar tus productos
      </p>
      <button
        onClick={onNew}
        className="px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-md"
      >
        <i className="ti ti-plus text-base" />
        Nueva marca
      </button>
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#059669] to-[#0284c7] flex items-center justify-center text-white shrink-0">
            <i className="ti ti-tag text-[17px]" />
          </div>
          <h2 className="text-base font-black text-[#1e1b2e]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {editing ? 'Editar marca' : 'Nueva marca'}
          </h2>
        </div>
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Bosch, NGK, Continental…"
          onKeyDown={(e) => { if (e.key === 'Enter') onSave() }}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-[#5a5670] bg-white border-[1.5px] border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {saving && <i className="ti ti-loader-2 animate-spin text-[15px]" />}
            {editing ? 'Guardar cambios' : 'Crear marca'}
          </button>
        </div>
      </div>
    </div>
  )
}
