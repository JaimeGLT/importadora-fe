import type { Usuario } from '@/types'

const now = new Date().toISOString()

export const MOCK_USUARIOS: Usuario[] = [
  {
    id: '1',
    nombre: 'Jaime',
    apellido: 'Administrator',
    email: 'jaime@importadora.com',
    rol: 'admin',
    activo: true,
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: '2',
    nombre: 'María',
    apellido: 'Gonzalez',
    email: 'maria@importadora.com',
    rol: 'cajero',
    activo: true,
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: '3',
    nombre: 'Carlos',
    apellido: 'Pérez',
    email: 'carlos@importadora.com',
    rol: 'almacenero',
    activo: true,
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: '4',
    nombre: 'Ana',
    apellido: 'López',
    email: 'ana@importadora.com',
    rol: 'cajero',
    activo: false,
    creado_en: now,
    actualizado_en: now,
  },
]