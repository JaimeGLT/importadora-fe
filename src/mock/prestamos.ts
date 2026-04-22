import type { Prestamo } from '@/types'

export const MOCK_PRESTAMOS: Prestamo[] = [
  {
    id: 'pr1',
    items: [
      {
        producto_id: '5',
        producto_nombre: 'Bujía NGK Iridium',
        producto_codigo: 'MOT-0055',
        cantidad: 4,
        precio_unitario: 65.00,
        precio_total: 260.00,
      },
    ],
    prestado_a: 'Taller Mecánico Rodríguez',
    fecha: '2024-03-20T09:00:00Z',
    notas: 'Para prueba en vehículo de cliente',
    estado: 'activo',
    creado_en: '2024-03-20T09:00:00Z',
  },
  {
    id: 'pr2',
    items: [
      {
        producto_id: '2',
        producto_nombre: 'Pastillas de freno Brembo',
        producto_codigo: 'FRE-0022',
        cantidad: 1,
        precio_unitario: 290.00,
        precio_total: 290.00,
      },
    ],
    prestado_a: 'Carlos Mendoza',
    fecha: '2024-03-15T14:00:00Z',
    notas: '',
    estado: 'activo',
    creado_en: '2024-03-15T14:00:00Z',
  },
]