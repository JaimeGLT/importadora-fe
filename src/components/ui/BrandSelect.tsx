import { useState, useMemo, useEffect } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import { useMarcasStore } from '@/stores/marcasStore'
import { notify } from '@/lib/notify'
import { api } from '@/lib/api'
import { gql } from '@/lib/graphql'
import { MARCAS_QUERY, backendToMarca } from '@/lib/queries/marcas.queries'
import { clsx } from 'clsx'

interface BrandSelectProps {
  value: number | null
  onChange: (id: number | null) => void
  label?: string
  placeholder?: string
}

export function BrandSelect({ value, onChange, label, placeholder = 'Seleccionar marca…' }: BrandSelectProps) {
  const { marcas, setMarcas, addMarca } = useMarcasStore()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    gql<{ marca: { nodes: { id: number; nombre: string }[] } }>(MARCAS_QUERY)
      .then((data) => setMarcas(data.marca.nodes.map(backendToMarca)))
      .catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return marcas
    return marcas.filter((m) =>
      m.nombre.toLowerCase().includes(search.toLowerCase())
    )
  }, [marcas, search])

  const selectedMarca = marcas.find((m) => m.id === value)

  const handleCreate = async () => {
    const nombre = newName.trim()
    if (!nombre) { notify.error('Ingresa un nombre'); return }
    setSaving(true)
    try {
      const res = await api.post<{ id: number; nombre: string }>('/marca', { nombre })
      const nueva = backendToMarca({ id: res.id, nombre: res.nombre })
      addMarca(nueva)
      onChange(nueva.id)
      setNewName('')
      setCreateOpen(false)
      setShowDropdown(false)
      setSearch('')
      notify.success('Marca creada')
    } catch {
      notify.error('Error al crear la marca')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-steel-700">{label}</label>
      )}
      <div className="relative flex gap-1">
        <div className="relative flex-1">
          <input
            type="text"
            value={selectedMarca ? selectedMarca.nombre : search}
            onChange={(e) => {
              setSearch(e.target.value)
              onChange(null)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={placeholder}
            className={clsx(
              'h-9 w-full rounded-lg border border-steel-200 bg-white px-3 text-sm text-steel-900',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            )}
          />
          {showDropdown && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-steel-200 shadow-lg max-h-48 overflow-y-auto">
              {filtered.length === 0 && !search.trim() ? (
                <p className="px-3 py-2 text-xs text-steel-400">Sin marcas — crea una nueva</p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-steel-400">No hay resultados</p>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={() => {
                      onChange(m.id)
                      setSearch('')
                      setShowDropdown(false)
                    }}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors',
                      m.id === value ? 'bg-brand-50 text-brand-700 font-medium' : 'text-steel-700',
                    )}
                  >
                    {m.nombre}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="h-9 px-3 rounded-lg border border-steel-200 bg-white text-steel-500 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300 transition-colors shrink-0"
          title="Crear nueva marca"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setNewName('') }}
        title="Nueva marca"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setNewName('') }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Crear marca
            </Button>
          </>
        }
      >
        <Input
          label="Nombre de la marca"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ej: Bosch, NGK, Continental…"
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          autoFocus
        />
      </Modal>
    </div>
  )
}
