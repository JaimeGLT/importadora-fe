import type { Cliente } from '@/types'

const now = new Date().toISOString()

const makeCompra = (id: string, fecha: string, items: { codigo: string; nombre: string; cantidad: number; precio: number }[], metodoPago: 'efectivo' | 'tarjeta' | 'qr' = 'efectivo') => {
  const total = items.reduce((acc, i) => acc + i.cantidad * i.precio, 0)
  return {
    id,
    orden_id: `ORD-${id}`,
    fecha,
    metodo_pago: metodoPago,
    total,
    tipoDocumento: 'factura' as const,
    facturaNro: `001-001-${String(parseInt(id) * 17).padStart(7, '0')}`,
    cliente_tipo_id: 'ci' as const,
    cliente_numero_id: '12345678',
    cliente_nombre: 'Juan Pérez García',
    items: items.map((item, idx) => ({
      id: `item-${id}-${idx}`,
      producto_id: `prod-${idx}`,
      producto_codigo: item.codigo,
      producto_nombre: item.nombre,
      producto_ubicacion: 'Almacén Central',
      cantidad_pedida: item.cantidad,
      cantidad_recogida: item.cantidad,
      precio_unitario: item.precio,
      subtotal: item.cantidad * item.precio,
      estado: 'completo' as const,
    })),
  }
}

export const MOCK_CLIENTES: Cliente[] = [
  {
    id: '1',
    ci: '12345678',
    ciComplemento: '1A',
    nombre: 'Juan',
    apellido: 'Pérez García',
    telefono: '70012345',
    email: 'juan.perez@email.com',
    activo: true,
    compras: [
      makeCompra('101', '2025-03-10T14:30:00Z', [
        { codigo: 'BRK-001', nombre: 'Pastillas de freno BP-200', cantidad: 2, precio: 180 },
      ], 'efectivo'),
      makeCompra('102', '2025-04-02T09:15:00Z', [
        { codigo: 'BRK-001', nombre: 'Pastillas de freno BP-200', cantidad: 1, precio: 180 },
        { codigo: 'ENG-005', nombre: 'Filtro de aceite FO-500', cantidad: 3, precio: 45 },
      ], 'tarjeta'),
    ],
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: '2',
    ci: '87654321',
    ciComplemento: undefined,
    nombre: 'María',
    apellido: 'López Torres',
    telefono: '70123456',
    email: 'maria.lopez@email.com',
    activo: true,
    compras: [
      makeCompra('201', '2025-03-22T16:00:00Z', [
        { codigo: 'SUS-012', nombre: 'Amortiguador Delantero SH-120', cantidad: 2, precio: 320 },
      ], 'qr'),
    ],
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: '3',
    ci: '11223344',
    ciComplemento: '2B',
    nombre: undefined,
    apellido: 'Rojas Mendez',
    telefono: undefined,
    email: undefined,
    activo: true,
    compras: [],
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: '4',
    ci: '55667788',
    ciComplemento: undefined,
    nombre: 'Ana',
    apellido: 'Castillo Ruiz',
    telefono: '71234567',
    email: 'ana.castillo@email.com',
    activo: false,
    compras: [
      makeCompra('401', '2025-02-15T11:00:00Z', [
        { codigo: 'TRM-003', nombre: 'Correa de distribución CD-300', cantidad: 1, precio: 450 },
      ], 'efectivo'),
    ],
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: '5',
    ci: undefined,
    ciComplemento: undefined,
    nit: '10234567011',
    nombre: 'Auto',
    apellido: 'Taller Los Hermanos EIRL',
    telefono: '75123456',
    email: 'taller@email.com',
    activo: true,
    compras: [],
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: '6',
    ci: undefined,
    ciComplemento: undefined,
    nit: '99001',
    nombre: undefined,
    apellido: 'Sin NIT / Consumidor Final',
    telefono: undefined,
    email: undefined,
    activo: true,
    compras: [],
    creado_en: now,
    actualizado_en: now,
  },
]