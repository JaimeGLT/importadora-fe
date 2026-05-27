import type { OrdenVenta, ItemOrden, EstadoOrden, EstadoItemOrden } from '@/types'

// ─── Backend API types ────────────────────────────────────────────────────────

export interface OrdenItemProductoAPI {
  id: number
  codigo: string
  nombre: string
  marca: { id: number; nombre: string } | null
  ubicacion: string
  stock_Actual: number
  stock_Minimo: number
  costo: number
  precio: number
  esKit: boolean
  stockReservado: number
}

export interface OrdenItemPiezaAPI {
  id: number
  id_Item: number
  id_Pieza: number
  cantidad: number
  precioUnitario: number
  confirmado: boolean
  listoAlmacenero: boolean
  notaIncompleto: string | null
  pieza?: { nombre: string; codigoUniversal: string } | null
}

export interface OrdenItemAPI {
  id: number
  id_Orden: number
  id_Producto: number
  cantidad: number
  esParcial: boolean
  estado: string
  notaIncompleto: string | null
  precioUnitario: number
  id_Descuento: number | null
  montoDescuento: number
  producto: OrdenItemProductoAPI
  descuento: { id: number; nombre: string; cantDescuento: number; color: string; activo: boolean } | null
  piezas: OrdenItemPiezaAPI[]
}

export interface OrdenVentaAPI {
  id: number
  id_Cajero: string
  id_Almacenero: string | null
  id_Cliente: number | null
  id_Caja: number
  estado: string
  fecha: string
  fechaCompletada: string | null
  notaCancelacion: string | null
  numero?: string
  cajero: { id: string; nombre: string; apellido: string } | null
  almacenero: { id: string; nombre: string; apellido: string } | null
  cliente: { id: number; nombre: string; apellido: string; telefono: string } | null
  items: OrdenItemAPI[]
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const MIS_ORDENES_QUERY = `
  query MisOrdenes {
    misOrdenes {
      nodes {
        id
        id_Cajero
        id_Almacenero
        id_Cliente
        id_Caja
        estado
        fecha
        fechaCompletada
        notaCancelacion
        cajero {
          id
          nombre
          apellido
        }
        almacenero {
          id
          nombre
          apellido
        }
        cliente {
          id
          nombre
          apellido
          telefono
        }
        items {
          id
          id_Orden
          id_Producto
          cantidad
          esParcial
          estado
          notaIncompleto
          precioUnitario
          id_Descuento
          montoDescuento
          descuento {
            id
            nombre
            cantDescuento
            color
            activo
          }
          producto {
            id
            codigo
            nombre
            marca {
              id
              nombre
            }
            ubicacion
            stock_Actual
            stock_Minimo
            costo
            precio
            esKit
            stockReservado
          }
          esParcial
          piezas {
            id
            id_Item
            id_Pieza
            cantidad
            precioUnitario
            confirmado
            listoAlmacenero
            notaIncompleto
            pieza {
              nombre
              codigoUniversal
            }
          }
        }
      }
    }
  }
`

export const ORDENES_PENDIENTES_QUERY = `
  query OrdenesPendientes {
    ordenesPendientes {
      nodes {
        id
        id_Cajero
        id_Almacenero
        id_Cliente
        id_Caja
        estado
        fecha
        fechaCompletada
        notaCancelacion
        cajero {
          id
          nombre
          apellido
        }
        almacenero {
          id
          nombre
          apellido
        }
        cliente {
          id
          nombre
          apellido
          telefono
        }
        items {
          id
          id_Orden
          id_Producto
          cantidad
          esParcial
          estado
          notaIncompleto
          precioUnitario
          id_Descuento
          montoDescuento
          producto {
            id
            codigo
            nombre
            marca {
              id
              nombre
            }
            ubicacion
            stock_Actual
            stock_Minimo
            precio
            esKit
            stockReservado
          }
          esParcial
          piezas {
            id
            id_Item
            id_Pieza
            cantidad
            precioUnitario
            confirmado
            listoAlmacenero
            notaIncompleto
            pieza {
              nombre
              codigoUniversal
            }
          }
        }
      }
    }
  }
`

export const MIS_ORDENES_ALMACEN_QUERY = `
  query MisOrdenesAlmacen {
    misOrdenesAlmacen {
      nodes {
        id
        id_Cajero
        id_Almacenero
        id_Cliente
        id_Caja
        estado
        fecha
        fechaCompletada
        notaCancelacion
        cajero {
          id
          nombre
          apellido
        }
        almacenero {
          id
          nombre
          apellido
        }
        cliente {
          id
          nombre
          apellido
          telefono
        }
        items {
          id
          id_Orden
          id_Producto
          cantidad
          esParcial
          estado
          notaIncompleto
          precioUnitario
          id_Descuento
          montoDescuento
          producto {
            id
            codigo
            nombre
            marca {
              id
              nombre
            }
            ubicacion
            stock_Actual
            stock_Minimo
            precio
            esKit
            stockReservado
          }
          esParcial
          piezas {
            id
            id_Item
            id_Pieza
            cantidad
            precioUnitario
            confirmado
            listoAlmacenero
            notaIncompleto
            pieza {
              nombre
              codigoUniversal
            }
          }
        }
      }
    }
  }
`

export const TODAS_ORDENES_QUERY = `
  query TodasOrdenes {
    todasOrdenes {
      nodes {
        id
        id_Cajero
        id_Almacenero
        id_Cliente
        id_Caja
        estado
        fecha
        fechaCompletada
        notaCancelacion
        cajero {
          id
          nombre
          apellido
        }
        almacenero {
          id
          nombre
          apellido
        }
        cliente {
          id
          nombre
          apellido
          telefono
        }
        items {
          id
          id_Orden
          id_Producto
          cantidad
          esParcial
          estado
          notaIncompleto
          precioUnitario
          id_Descuento
          montoDescuento
          producto {
            id
            codigo
            nombre
            marca {
              id
              nombre
            }
            ubicacion
            stock_Actual
            precio
            esKit
            stockReservado
          }
          esParcial
          piezas {
            id
            id_Item
            id_Pieza
            cantidad
            precioUnitario
            confirmado
            listoAlmacenero
            notaIncompleto
            pieza {
              nombre
              codigoUniversal
            }
          }
        }
      }
    }
  }
`

// ─── Converters ───────────────────────────────────────────────────────────────

const ESTADO_ORDEN_MAP: Record<string, EstadoOrden> = {
  pendiente:       'pendiente_almacenero',
  aceptada:        'en_preparacion',
  lista:           'listo_para_escaneo',
  confaltantes:    'con_faltantes',
  esperandopago:   'esperando_pago',
  completada:      'completada',
  cancelada:       'cancelada',
}

const ESTADO_ITEM_MAP: Record<string, EstadoItemOrden> = {
  pendiente:         'pendiente',
  confirmado:        'completo',
  completo:          'completo',
  parcial:           'parcial',
  faltante:          'faltante',
  incompleto:        'faltante',
  listoindividual:   'listo_almacenero',
}

function parseUbicacion(ubicacion?: string | null) {
  if (!ubicacion) return { almacen: '', estante: '', fila: '', columna: '' }
  const parts = ubicacion.includes('/') ? ubicacion.split('/') : ubicacion.split('-')
  if (parts.length === 4) return { almacen: parts[0], estante: parts[1], fila: parts[2], columna: parts[3] }
  if (parts.length === 3) return { almacen: '', estante: parts[0], fila: parts[1], columna: parts[2] }
  return { almacen: ubicacion, estante: '', fila: '', columna: '' }
}

function parseCantidadRecogida(nota: string | null | undefined): number | undefined {
  if (!nota) return undefined
  const m = nota.match(/^Encontró (\d+) de \d+/)
  return m ? parseInt(m[1], 10) : undefined
}

function parseNotaUsuario(nota: string | null | undefined): string | undefined {
  if (!nota) return undefined
  if (/^Encontró \d+ de \d+/.test(nota)) {
    const idx = nota.indexOf(' — ')
    return idx !== -1 ? nota.slice(idx + 3) : undefined
  }
  return nota
}

function backendToItemOrden(api: OrdenItemAPI): ItemOrden {
  const loc = parseUbicacion(api.producto?.ubicacion)
  const estado = ESTADO_ITEM_MAP[api.estado?.toLowerCase()] ?? 'pendiente'
  return {
    id: String(api.id),
    producto_id: String(api.id_Producto),
    producto_codigo: api.producto?.codigo ?? '',
    producto_nombre: api.producto?.nombre ?? '',
    producto_almacen: loc.almacen,
    producto_estante: loc.estante,
    producto_fila: loc.fila,
    producto_columna: loc.columna,
    cantidad_pedida: api.cantidad,
    precio_unitario: api.precioUnitario,
    subtotal: api.precioUnitario * api.cantidad,
    estado,
    nota: parseNotaUsuario(api.notaIncompleto),
    cantidad_recogida: parseCantidadRecogida(api.notaIncompleto),
    es_kit: api.producto?.esKit ?? false,
    es_parcial: api.esParcial,
    piezas_orden: api.esParcial && api.piezas?.length
      ? api.piezas.map(p => ({
          id: p.id,
          id_pieza: p.id_Pieza,
          nombre: p.pieza?.nombre ?? `Pieza #${p.id_Pieza}`,
          codigo: p.pieza?.codigoUniversal ?? '',
          cantidad: p.cantidad,
          precio_unitario: p.precioUnitario,
          confirmado: p.confirmado,
          listo_almacenero: p.listoAlmacenero,
          nota_incompleto: p.notaIncompleto,
        }))
      : undefined,
  }
}

export function backendToOrdenVenta(api: OrdenVentaAPI): OrdenVenta {
  const estado = ESTADO_ORDEN_MAP[api.estado?.toLowerCase()] ?? 'pendiente_almacenero'
  const items = (api.items ?? []).map(backendToItemOrden)
  const total = items.reduce((s, i) => {
    if (i.es_parcial && i.piezas_orden?.length)
      return s + i.piezas_orden.filter(p => p.confirmado).reduce((ps, p) => ps + (p.precio_unitario ?? 0) * p.cantidad, 0)
    return s + i.precio_unitario * i.cantidad_pedida
  }, 0)
  const clienteNombre = api.cliente
    ? `${api.cliente.nombre} ${api.cliente.apellido}`.trim()
    : undefined

  const cajeroNombre = api.cajero
    ? `${api.cajero.nombre} ${api.cajero.apellido}`.trim()
    : ''
  const almaceneroNombre = api.almacenero
    ? `${api.almacenero.nombre} ${api.almacenero.apellido}`.trim()
    : undefined

  return {
    id: String(api.id),
    numero: api.numero ?? `#${api.id}`,
    tipo: 'venta',
    cajero_id: String(api.id_Cajero),
    cajero_nombre: cajeroNombre,
    almacenero_id: api.id_Almacenero != null ? String(api.id_Almacenero) : undefined,
    almacenero_nombre: almaceneroNombre,
    cliente_id: api.id_Cliente != null ? String(api.id_Cliente) : undefined,
    cliente_nombre: clienteNombre,
    items,
    total,
    estado,
    nota: api.notaCancelacion ?? undefined,
    creado_en: api.fecha,
    actualizado_en: api.fecha,
  }
}
