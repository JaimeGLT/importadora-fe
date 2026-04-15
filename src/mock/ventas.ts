import type { OrdenVenta, Reserva, ConfigVentas } from '@/types'

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString()
const hoursAgo   = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString()
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600 * 1000).toISOString()

export const MOCK_ORDENES: OrdenVenta[] = [
  {
    id: 'ord-1',
    numero: 'ORD-001',
    cajero_id: '2',
    cajero_nombre: 'María López',
    items: [
      {
        id: 'oi-1-1',
        producto_id: '1',
        producto_codigo: 'MOT-0011',
        producto_nombre: 'Filtro de aceite Toyota',
        producto_ubicacion: 'Almacén Central',
        cantidad: 2,
        precio_unitario: 55.00,
        subtotal: 110.00,
        estado: 'ok',
      },
      {
        id: 'oi-1-2',
        producto_id: '2',
        producto_codigo: 'FRE-0022',
        producto_nombre: 'Pastillas de freno Brembo',
        producto_ubicacion: 'Estante B-3',
        cantidad: 1,
        precio_unitario: 285.00,
        subtotal: 285.00,
        estado: 'ok',
      },
    ],
    total: 395.00,
    estado: 'pendiente',
    creado_en: minutesAgo(9),
    actualizado_en: minutesAgo(9),
  },
  {
    id: 'ord-2',
    numero: 'ORD-002',
    cajero_id: '2',
    cajero_nombre: 'María López',
    items: [
      {
        id: 'oi-2-1',
        producto_id: '3',
        producto_codigo: 'SUS-0033',
        producto_nombre: 'Amortiguador Monroe Trasero',
        producto_ubicacion: 'Almacén Central',
        cantidad: 2,
        precio_unitario: 320.00,
        subtotal: 640.00,
        estado: 'ok',
      },
      {
        id: 'oi-2-2',
        producto_id: '4',
        producto_codigo: 'ELE-0044',
        producto_nombre: 'Batería Bosch 60Ah',
        producto_ubicacion: 'Almacén Central',
        cantidad: 1,
        precio_unitario: 780.00,
        subtotal: 780.00,
        estado: 'faltante',
        nota_faltante: 'Stock agotado — última unidad defectuosa',
      },
    ],
    total: 1420.00,
    estado: 'en_preparacion',
    creado_en: minutesAgo(18),
    actualizado_en: minutesAgo(6),
    aceptado_en: minutesAgo(6),
  },
  {
    id: 'ord-3',
    numero: 'ORD-003',
    cajero_id: '2',
    cajero_nombre: 'María López',
    items: [
      {
        id: 'oi-3-1',
        producto_id: '5',
        producto_codigo: 'MOT-0055',
        producto_nombre: 'Bujías NGK (juego ×4)',
        producto_ubicacion: 'Estante A-1',
        cantidad: 1,
        precio_unitario: 120.00,
        subtotal: 120.00,
        estado: 'ok',
      },
    ],
    total: 120.00,
    estado: 'listo',
    creado_en: minutesAgo(25),
    actualizado_en: minutesAgo(4),
    aceptado_en: minutesAgo(20),
    listo_en: minutesAgo(4),
  },
]

export const MOCK_RESERVAS: Reserva[] = [
  {
    id: 'res-1',
    numero: 'RES-001',
    cajero_id: '2',
    cajero_nombre: 'María López',
    cliente_nombre: 'Roberto Gutiérrez',
    cliente_telefono: '+591 72345678',
    canal: 'whatsapp',
    items: [
      {
        id: 'ri-1-1',
        producto_id: '1',
        producto_codigo: 'MOT-0011',
        producto_nombre: 'Filtro de aceite Toyota',
        producto_ubicacion: 'Almacén Central',
        cantidad: 3,
        precio_unitario: 55.00,
        subtotal: 165.00,
        estado: 'ok',
      },
    ],
    total: 165.00,
    estado: 'activa',
    expira_en: hoursFromNow(18),
    nota: 'Cliente confirma que viene mañana en la mañana',
    creado_en: hoursAgo(6),
    actualizado_en: hoursAgo(6),
  },
  {
    id: 'res-2',
    numero: 'RES-002',
    cajero_id: '3',        // almacenero mock
    cajero_nombre: 'Carlos Sánchez',
    cliente_nombre: 'Ana Flores',
    canal: 'presencial',
    items: [
      {
        id: 'ri-2-1',
        producto_id: '2',
        producto_codigo: 'FRE-0022',
        producto_nombre: 'Pastillas de freno Brembo',
        producto_ubicacion: 'Estante B-3',
        cantidad: 2,
        precio_unitario: 285.00,
        subtotal: 570.00,
        estado: 'ok',
      },
    ],
    total: 570.00,
    estado: 'activa',
    expira_en: hoursFromNow(2),
    creado_en: hoursAgo(22),
    actualizado_en: hoursAgo(22),
  },
]

export const MOCK_CONFIG_VENTAS: ConfigVentas = {
  tiempo_alerta_minutos: 10,
}
