import { Fragment, useCallback, useEffect, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import type { Importacion, Marca, Sucursal } from '@/types'
import { gql } from '@/lib/graphql'
import { IMPORTACION_DETAIL_QUERY, type BackendDetalleFull } from '@/lib/queries/importaciones.queries'
import { notify } from '@/lib/notify'
import { editarDetalleImportacion, eliminarDetalleImportacion, cambiarSucursalImportacion } from '@/lib/importaciones.api'
import { listarSucursales } from '@/lib/sucursales.api'
import { api } from '@/lib/api'
import { Modal, ConfirmModal, Input, Button, Select } from '@/components/ui'

interface Props {
  open: boolean
  onClose: () => void
  importacion: Importacion | null
  marcas: Marca[]
  readOnly?: boolean
  onCantidadCambiada?: (cantProductos: number) => void
  onSucursalCambiada?: () => void
}

interface EditForm {
  codigo: string
  nombre: string
  marcaId: number | null
  procedencia: string
  cantidad: number
  costo: number
  precio: number
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtBs(n: number) {
  return `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function displayName(nombre: string, codigo: string) {
  return nombre.trim() || codigo
}

function toEditForm(d: BackendDetalleFull): EditForm {
  const piezas = d.piezas && d.piezas > 0 ? d.piezas : 1
  return {
    codigo: d.codigo,
    nombre: d.nombre,
    marcaId: d.marcaId ?? null,
    procedencia: d.procedencia ?? '',
    cantidad: Math.round(d.stock_Actual / piezas),
    costo: d.costo,
    precio: d.precio,
  }
}

export function ImportacionDetailModal({ open, onClose, importacion, marcas, readOnly, onCantidadCambiada, onSucursalCambiada }: Props) {
  const [items, setItems] = useState<BackendDetalleFull[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [cambiarSucursalOpen, setCambiarSucursalOpen] = useState(false)
  const [nuevaSucursalId, setNuevaSucursalId] = useState<number | null>(null)
  const [cambiandoSucursal, setCambiandoSucursal] = useState(false)

  const [editItem, setEditItem] = useState<BackendDetalleFull | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)

  const [confirmDeleteItem, setConfirmDeleteItem] = useState<BackendDetalleFull | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [productoSinStock, setProductoSinStock] = useState<{ id: number; nombre: string; marca: string } | null>(null)
  const [desactivando, setDesactivando] = useState(false)

  const reloadItems = useCallback(() => {
    if (!importacion) return
    setLoadingItems(true)
    return gql<{ importacion: { nodes: { detalles?: BackendDetalleFull[] }[] } }>(
      IMPORTACION_DETAIL_QUERY,
      { id: Number(importacion.id) },
    )
      .then(res => {
        const node = res.importacion.nodes[0]
        setItems(node?.detalles ?? [])
      })
      .catch(() => notify.error('Error cargando detalle'))
      .finally(() => setLoadingItems(false))
  }, [importacion])

  useEffect(() => {
    if (!open || !importacion) return
    setItems([])
    setEditItem(null)
    setSearchTerm('')
    void reloadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, importacion?.id])

  useEffect(() => {
    if (!open) return
    listarSucursales().then(setSucursales).catch(() => setSucursales([]))
  }, [open])

  if (!importacion) return null

  const sucursalActual = items[0]?.sucursal ?? null
  const sucursalesActivas = sucursales.filter((s) => s.activo).sort((a, b) => a.nombre.localeCompare(b.nombre))

  function openCambiarSucursal() {
    setNuevaSucursalId(sucursalActual?.id ?? null)
    setCambiarSucursalOpen(true)
  }

  async function confirmCambiarSucursal() {
    if (!importacion || !nuevaSucursalId) return
    setCambiandoSucursal(true)
    try {
      const respuesta = await cambiarSucursalImportacion(importacion.id, nuevaSucursalId)
      notify.success(respuesta.message || 'Sucursal actualizada')
      for (const adv of respuesta.advertencias) notify.warning(adv)
      setCambiarSucursalOpen(false)
      await reloadItems()
      onSucursalCambiada?.()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al cambiar la sucursal')
    } finally {
      setCambiandoSucursal(false)
    }
  }

  const getMarcaNombre = (marcaId?: number | null) =>
    marcaId ? (marcas.find(m => m.id === marcaId)?.nombre ?? '') : ''

  const q = searchTerm.trim().toLowerCase()
  const displayItems = q
    ? items.filter(item => {
        const marcaNombre = getMarcaNombre(item.marcaId).toLowerCase()
        return (
          item.codigo.toLowerCase().includes(q) ||
          item.codigoAux.toLowerCase().includes(q) ||
          item.codigoAux2.toLowerCase().includes(q) ||
          item.nombre.toLowerCase().includes(q) ||
          marcaNombre.includes(q)
        )
      })
    : items

  const costoTotal =
    importacion.fob_total_usd * importacion.tipo_cambio +
    importacion.flete_usd * importacion.tipo_cambio +
    importacion.aduana_bs +
    importacion.transporte_interno_bs

  function openEdit(item: BackendDetalleFull) {
    setEditItem(item)
    setEditForm(toEditForm(item))
  }

  function closeEdit() {
    setEditItem(null)
    setEditForm(null)
  }

  async function saveEdit() {
    if (!editItem || !editForm) return

    const codigo = editForm.codigo.trim()
    const nombre = editForm.nombre.trim()
    if (!codigo) return notify.error('El código es obligatorio')
    if (editForm.cantidad < 0) return notify.error('La cantidad no puede ser negativa')
    if (editForm.costo < 0) return notify.error('El costo no puede ser negativo')
    if (editForm.precio < 0) return notify.error('El precio no puede ser negativo')

    setSaving(true)
    try {
      const respuesta = await editarDetalleImportacion(importacion!.id, String(editItem.id), {
        codigo,
        codigoAux: editItem.codigoAux,
        codigoAux2: editItem.codigoAux2,
        nombre,
        marcaId: editForm.marcaId,
        descripcion: editItem.descripcion,
        procedencia: editForm.procedencia,
        unidad_Medida: editItem.unidad_Medida,
        ubicacion: editItem.ubicacion,
        cantidad: editForm.cantidad,
        piezas: editItem.piezas && editItem.piezas > 0 ? editItem.piezas : 1,
        stock_Minimo: editItem.stock_Minimo,
        costo: editForm.costo,
        precio: editForm.precio,
        conversionABs: editItem.conversionABs,
      })

      if (respuesta.fusionado) {
        notify.success('Producto fusionado', {
          description: 'Se combinó con el producto ya existente para ese código y marca.',
        })
      } else {
        notify.success('Ítem actualizado')
      }
      if (respuesta.advertencia) {
        notify.warning(respuesta.advertencia)
      }

      closeEdit()
      await reloadItems()
      if (respuesta.productoSinStockId) {
        setProductoSinStock({
          id: respuesta.productoSinStockId,
          nombre: displayName(nombre, codigo),
          marca: getMarcaNombre(editForm.marcaId),
        })
      }
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al editar el ítem')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!confirmDeleteItem) return
    setDeleting(true)
    try {
      const nombreItem = displayName(confirmDeleteItem.nombre, confirmDeleteItem.codigo)
      const marcaItem = getMarcaNombre(confirmDeleteItem.marcaId)
      const respuesta = await eliminarDetalleImportacion(importacion!.id, String(confirmDeleteItem.id))
      notify.success('Ítem eliminado')
      if (respuesta.advertencia) notify.warning(respuesta.advertencia)
      setConfirmDeleteItem(null)
      await reloadItems()
      const nuevoCant = Math.max(0, (importacion!.cantProductos ?? items.length) - 1)
      onCantidadCambiada?.(nuevoCant)
      if (respuesta.productoSinStockId) {
        setProductoSinStock({ id: respuesta.productoSinStockId, nombre: nombreItem, marca: marcaItem })
      }
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al eliminar el ítem')
    } finally {
      setDeleting(false)
    }
  }

  async function desactivarProductoSinStock() {
    if (!productoSinStock) return
    setDesactivando(true)
    try {
      await api.delete(`/Producto/${productoSinStock.id}`)
      notify.success('Producto desactivado del inventario')
      setProductoSinStock(null)
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Error al desactivar el producto')
    } finally {
      setDesactivando(false)
    }
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[#2D2B2A]/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-5xl max-h-[90vh] bg-white rounded-xl shadow-xl flex flex-col overflow-hidden border border-[#D0CBC4]">

              {/* Header */}
              <div className="px-6 py-5 border-b border-[#D0CBC4] bg-[#F5F0EB] flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#780e18] to-[#D4A333] flex items-center justify-center text-white shrink-0">
                      <i className="ti ti-package-import text-base" />
                    </div>
                    <DialogTitle
                      className="text-xl font-semibold text-[#2D2B2A] tracking-[-0.02em]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {importacion.numero}
                    </DialogTitle>
                  </div>
                  <p className="text-sm text-[#7A7571] ml-11">
                    {importacion.proveedor} · {importacion.origen}
                    {sucursalActual && (
                      <>
                        {' · '}
                        <i className="ti ti-building-warehouse text-[12px]" /> {sucursalActual.nombre}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <button
                      onClick={openCambiarSucursal}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#7A7571] hover:text-[#2D2B2A] hover:bg-[#E8E5E2] transition-colors border border-[#D0CBC4]"
                      title="Cambiar sucursal"
                    >
                      <i className="ti ti-arrows-exchange text-base" />
                      Cambiar sucursal
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-[#7A7571] hover:text-[#2D2B2A] hover:bg-[#E8E5E2] transition-colors"
                  >
                    <i className="ti ti-x text-xl" />
                  </button>
                </div>
              </div>

              {/* KPIs */}
              <div className="px-6 py-4 border-b border-[#D0CBC4] bg-white">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-semibold text-[#7A7571] tracking-[0.1em] mb-1">Productos</p>
                    <p
                      className="font-semibold text-[26px] text-[#2D2B2A] leading-none tracking-[-0.025em]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {loadingItems
                        ? <span className="text-[18px] text-[#7A7571]">…</span>
                        : q ? `${displayItems.length}/${items.length}` : items.length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-semibold text-[#7A7571] tracking-[0.1em] mb-1">FOB Total</p>
                    <p
                      className="font-semibold text-[22px] text-[#2D2B2A] leading-none tracking-[-0.025em]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {fmtUSD(importacion.fob_total_usd)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-semibold text-[#7A7571] tracking-[0.1em] mb-1">Inversión</p>
                    <p
                      className="font-semibold text-[22px] text-[#780e18] leading-none tracking-[-0.025em]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {fmtBs(costoTotal)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-semibold text-[#7A7571] tracking-[0.1em] mb-1">T.C.</p>
                    <p
                      className="font-semibold text-[22px] text-[#2D2B2A] leading-none tracking-[-0.025em]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {importacion.tipo_cambio.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-semibold text-[#7A7571] tracking-[0.1em] mb-1">Llegada</p>
                    <p className="text-base font-semibold text-[#2D2B2A]">{fmtDate(importacion.fecha_estimada_llegada)}</p>
                  </div>
                </div>
              </div>

              {/* Buscador */}
              <div className="px-6 py-3 border-b border-[#D0CBC4] bg-white">
                <div className="flex items-center gap-2 bg-[#FBFBFA] border border-[#D8D4D0] rounded-lg px-3.5 w-full sm:w-80 focus-within:border-[#780e18] transition-colors">
                  <i className="ti ti-search text-[#7A7571] text-[13px] shrink-0" />
                  <input
                    className="flex-1 py-2 bg-transparent text-[13px] text-[#2D2B2A] font-normal placeholder:text-[#7A7571] outline-none border-none"
                    placeholder="Buscar producto, código o marca…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-[#7A7571] hover:text-[#2D2B2A] transition-colors"
                    >
                      <i className="ti ti-x text-[13px]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de productos */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: '220px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '60px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '70px' }} />
                    {!readOnly && <col style={{ width: '80px' }} />}
                  </colgroup>
                  <thead className="sticky top-0 bg-[#F5F0EB] z-10 border-b border-[#D0CBC4]">
                    <tr>
                      <th className="text-left px-4 py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#5C5654]">Producto</th>
                      <th className="text-left px-2 py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#5C5654]">Marca</th>
                      <th className="text-left px-2 py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#5C5654]">Procedencia</th>
                      <th className="text-center px-2 py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#5C5654]">Cant.</th>
                      <th className="text-right px-2 py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#5C5654]">Costo Unit.</th>
                      <th className="text-right px-2 py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#5C5654]">Precio Venta</th>
                      <th className="text-center px-3 py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#5C5654]">Tipo</th>
                      {!readOnly && (
                        <th className="text-center px-2 py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#5C5654]" />
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0CBC4]">
                    {loadingItems
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-4 py-3"><div className="h-3 w-32 rounded bg-[#F0EFEC] mb-1.5" /><div className="h-2.5 w-24 rounded bg-[#E8E5E2]" /></td>
                            <td className="px-2 py-3"><div className="h-5 w-16 rounded-full bg-[#F0EFEC]" /></td>
                            <td className="px-2 py-3"><div className="h-2.5 w-14 rounded bg-[#F0EFEC]" /></td>
                            <td className="px-2 py-3 text-center"><div className="h-2.5 w-6 rounded bg-[#F0EFEC] mx-auto" /></td>
                            <td className="px-2 py-3 text-right"><div className="h-2.5 w-16 rounded bg-[#F0EFEC] ml-auto" /></td>
                            <td className="px-2 py-3 text-right"><div className="h-2.5 w-16 rounded bg-[#F0EFEC] ml-auto" /></td>
                            <td className="px-3 py-3 text-center"><div className="h-5 w-12 rounded-full bg-[#F0EFEC] mx-auto" /></td>
                            {!readOnly && <td className="px-2 py-3" />}
                          </tr>
                        ))
                      : displayItems.length === 0
                      ? (
                          <tr>
                            <td colSpan={readOnly ? 7 : 8} className="px-4 py-10 text-center text-sm text-[#7A7571]">
                              No se encontraron productos para "{searchTerm}"
                            </td>
                          </tr>
                        )
                      : displayItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[#FAF5EE] transition-colors">
                            <td className="px-4 py-3 overflow-hidden">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-mono font-bold bg-[#780e18] text-white shrink-0">
                                  {item.codigo}
                                </span>
                                {item.codigoAux && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium bg-[#F5F0EB] text-[#5C5654] border border-[#D0CBC4] shrink-0">
                                    {item.codigoAux}
                                  </span>
                                )}
                                {item.codigoAux2 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium bg-[#F5F0EB] text-[#5C5654] border border-[#D0CBC4] shrink-0">
                                    {item.codigoAux2}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-[#2D2B2A] leading-tight truncate">{item.nombre}</p>
                            </td>
                            <td className="px-2 py-3">
                              {getMarcaNombre(item.marcaId) ? (
                                <div className="inline-flex items-center gap-1.5 bg-[#E8D4B8] text-[#780e18] text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#780e18] shrink-0" />
                                  {getMarcaNombre(item.marcaId)}
                                </div>
                              ) : (
                                <span className="text-xs text-[#7A7571]">—</span>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              <span className="text-[12px] text-[#5C5654]">{item.procedencia || '—'}</span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="font-mono font-semibold text-[13px] text-[#2D2B2A] tabular-nums">{item.stock_Actual}</span>
                            </td>
                            <td className="px-2 py-3 text-right">
                              <span className="text-[11px] font-medium text-[#7A7571]">Bs</span>
                              <span className="text-sm font-semibold text-[#5C5654] tabular-nums ml-1">{item.costo.toFixed(2)}</span>
                            </td>
                            <td className="px-2 py-3 text-right">
                              <span className="text-[11px] font-medium text-[#7A7571]">Bs</span>
                              <span className="text-sm font-semibold text-[#3F7A52] tabular-nums ml-1">{item.precio.toFixed(2)}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {item.tipo === 'Nuevo' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4ECDB] text-[#780e18]">
                                  Nuevo
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#B8DCCA] text-[#1E5C38]">
                                  Stock+
                                </span>
                              )}
                            </td>
                            {!readOnly && (
                              <td className="px-2 py-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => openEdit(item)}
                                    className="p-1.5 rounded-lg text-[#7A7571] hover:text-[#780e18] hover:bg-[#F4ECDB] transition-colors"
                                    title="Editar"
                                  >
                                    <i className="ti ti-pencil text-base" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteItem(item)}
                                    className="p-1.5 rounded-lg text-[#7A7571] hover:text-[#B3261E] hover:bg-red-50 transition-colors"
                                    title="Eliminar"
                                  >
                                    <i className="ti ti-trash text-base" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-[#F5F0EB] border-t border-[#D0CBC4] flex items-center justify-between gap-4">
                <div className="flex items-center gap-5 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[#7A7571] tracking-[0.1em]">Creada</p>
                    <p className="text-sm font-semibold text-[#2D2B2A] mt-0.5">{fmtDate(importacion.fecha_creacion)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[#7A7571] tracking-[0.1em]">Flete</p>
                    <p className="text-sm font-semibold text-[#2D2B2A] mt-0.5">
                      {fmtUSD(importacion.flete_usd)}
                      <span className="text-[11px] text-[#7A7571] ml-1">({fmtBs(importacion.flete_usd * importacion.tipo_cambio)})</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[#7A7571] tracking-[0.1em]">Aduana</p>
                    <p className="text-sm font-semibold text-[#2D2B2A] mt-0.5">{fmtBs(importacion.aduana_bs)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[#7A7571] tracking-[0.1em]">Transporte</p>
                    <p className="text-sm font-semibold text-[#2D2B2A] mt-0.5">{fmtBs(importacion.transporte_interno_bs)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase font-semibold text-[#7A7571] tracking-[0.1em]">Inversión Total</p>
                  <p
                    className="font-semibold text-[22px] text-[#780e18] leading-none mt-1 tracking-[-0.025em]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {fmtBs(costoTotal)}
                  </p>
                </div>
              </div>

              {/*
                IMPORTANTE: estos dos modales van DENTRO de <DialogPanel>, no
                como hermanos de él ni como hermanos del <Dialog>. Headless UI
                detecta "click afuera" comparando el target contra el contenedor
                de DialogPanel (panelRef) — cualquier click fuera de ese
                contenedor, aunque siga dentro del <Dialog> portado, cuenta como
                "afuera" y dispara onClose. Eso cerraba todo el modal apenas se
                tocaba un campo del formulario de edición. Además, tienen que
                seguir dentro del portal de Headless UI (no como hermanos del
                <Dialog>) para no quedar `inert` y no recibir clicks — ese fue
                el bug original del botón de eliminar.
              */}
              <Modal
                open={!!editItem}
                onClose={closeEdit}
                title="Editar producto de importación"
                size="md"
                footer={
                  <>
                    <Button variant="secondary" onClick={closeEdit} disabled={saving}>Cancelar</Button>
                    <Button variant="primary" onClick={() => void saveEdit()} loading={saving}>Guardar</Button>
                  </>
                }
              >
                {editForm && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Código"
                        value={editForm.codigo}
                        onChange={e => setEditForm(f => f && { ...f, codigo: e.target.value })}
                      />
                      <Input
                        label="Nombre"
                        value={editForm.nombre}
                        onChange={e => setEditForm(f => f && { ...f, nombre: e.target.value })}
                      />
                    </div>
                    <Select
                      label="Marca"
                      value={editForm.marcaId != null ? String(editForm.marcaId) : ''}
                      onChange={e => setEditForm(f => f && { ...f, marcaId: e.target.value ? Number(e.target.value) : null })}
                      options={marcas.map(m => ({ value: String(m.id), label: m.nombre }))}
                      placeholder="Sin marca"
                    />
                    <Input
                      label="Procedencia"
                      value={editForm.procedencia}
                      onChange={e => setEditForm(f => f && { ...f, procedencia: e.target.value })}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        label="Cantidad"
                        type="number"
                        min={0}
                        value={editForm.cantidad}
                        onChange={e => setEditForm(f => f && { ...f, cantidad: Number(e.target.value) })}
                      />
                      <Input
                        label="Costo (Bs)"
                        type="number"
                        min={0}
                        step="0.01"
                        value={editForm.costo}
                        onChange={e => setEditForm(f => f && { ...f, costo: Number(e.target.value) })}
                      />
                      <Input
                        label="Precio (Bs)"
                        type="number"
                        min={0}
                        step="0.01"
                        value={editForm.precio}
                        onChange={e => setEditForm(f => f && { ...f, precio: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
              </Modal>

              <Modal
                open={cambiarSucursalOpen}
                onClose={() => setCambiarSucursalOpen(false)}
                title="Cambiar sucursal de la importación"
                size="md"
                footer={
                  <>
                    <Button variant="secondary" onClick={() => setCambiarSucursalOpen(false)} disabled={cambiandoSucursal}>Cancelar</Button>
                    <Button
                      variant="primary"
                      onClick={() => void confirmCambiarSucursal()}
                      loading={cambiandoSucursal}
                      disabled={!nuevaSucursalId || nuevaSucursalId === sucursalActual?.id}
                    >
                      Mover stock
                    </Button>
                  </>
                }
              >
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-[#5C5654]">
                    Se moverá el stock que esta importación aportó de <strong>{sucursalActual?.nombre ?? 'la sucursal actual'}</strong> a la sucursal que elijas. El resto del stock del producto en cada sucursal no se ve afectado.
                  </p>
                  <label className="block text-[12px] font-medium text-[#2D2B2A] mb-1">
                    Nueva sucursal
                  </label>
                  <select
                    value={nuevaSucursalId ?? ''}
                    onChange={(e) => setNuevaSucursalId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D0CBC4] bg-white text-[13px] text-[#2D2B2A] focus:outline-none focus:ring-2 focus:ring-[#780e18]/30 focus:border-[#780e18] transition-shadow"
                  >
                    <option value="">Selecciona...</option>
                    {sucursalesActivas.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </Modal>

              <ConfirmModal
                open={!!confirmDeleteItem}
                onClose={() => setConfirmDeleteItem(null)}
                onConfirm={() => void confirmDelete()}
                loading={deleting}
                title="Eliminar producto de la importación"
                message={confirmDeleteItem
                  ? `¿Eliminar "${displayName(confirmDeleteItem.nombre, confirmDeleteItem.codigo)}"${getMarcaNombre(confirmDeleteItem.marcaId) ? ` (${getMarcaNombre(confirmDeleteItem.marcaId)})` : ''}? Esto revertirá el stock que esta importación aportó al producto real.`
                  : ''}
              />

              <ConfirmModal
                open={!!productoSinStock}
                onClose={() => setProductoSinStock(null)}
                onConfirm={() => void desactivarProductoSinStock()}
                loading={desactivando}
                title="Producto sin stock"
                message={productoSinStock
                  ? `"${productoSinStock.nombre}"${productoSinStock.marca ? ` (${productoSinStock.marca})` : ''} quedó sin stock. ¿Deseas desactivarlo del inventario?`
                  : ''}
              />

            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
