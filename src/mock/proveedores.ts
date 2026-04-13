import type { Proveedor, ProductoProveedor, EvaluacionProveedor } from '@/types'

export const MOCK_PROVEEDORES: Proveedor[] = [
  {
    id: 'prov1',
    nombre: 'Auto Parts Global Co.',
    pais: 'China',
    moneda: 'USD',
    terminos_pago: 'T/T 30 días',
    contacto: 'Li Wei',
    email: 'liwei@autopartsglobal.cn',
    telefono: '+86 21 5555 0101',
    sitio_web: 'www.autopartsglobal.cn',
    notas: 'Principal proveedor de filtros y suspensión. Requiere pedido mínimo $3,000.',
    tiempo_reposicion_dias: 45,
    estado: 'activo',
    creado_en: '2023-06-01T00:00:00.000Z',
    actualizado_en: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'prov2',
    nombre: 'Iberparts S.L.',
    pais: 'España',
    moneda: 'EUR',
    terminos_pago: 'NET 30',
    contacto: 'Carlos Martínez',
    email: 'cmartinez@iberparts.es',
    telefono: '+34 91 234 5678',
    sitio_web: 'www.iberparts.es',
    notas: 'Especialistas en frenos y sistemas de escape europeos.',
    tiempo_reposicion_dias: 20,
    estado: 'activo',
    creado_en: '2023-08-15T00:00:00.000Z',
    actualizado_en: '2024-02-20T09:00:00.000Z',
  },
  {
    id: 'prov3',
    nombre: 'SinoAuto Trading Ltd.',
    pais: 'China',
    moneda: 'USD',
    terminos_pago: 'T/T anticipado',
    contacto: 'Zhang Fang',
    email: 'zfang@sinoauto.com',
    telefono: '+86 755 8888 2233',
    notas: 'Aftermarket japonés y coreano. Buen precio, menor tiempo de entrega que prov1.',
    tiempo_reposicion_dias: 38,
    estado: 'activo',
    creado_en: '2023-11-10T00:00:00.000Z',
    actualizado_en: '2024-03-01T14:00:00.000Z',
  },
  {
    id: 'prov4',
    nombre: 'AutoTech USA Inc.',
    pais: 'EE.UU.',
    moneda: 'USD',
    terminos_pago: 'NET 60',
    contacto: 'James Cooper',
    email: 'jcooper@autotechusa.com',
    telefono: '+1 800 555 0199',
    sitio_web: 'www.autotechusa.com',
    notas: 'OEM de marcas americanas. Alto precio pero excelente calidad y documentación.',
    tiempo_reposicion_dias: 15,
    estado: 'activo',
    creado_en: '2024-01-05T00:00:00.000Z',
    actualizado_en: '2024-01-05T00:00:00.000Z',
  },
]

export const MOCK_PRODUCTOS_PROVEEDOR: ProductoProveedor[] = [
  // Auto Parts Global Co.
  { id: 'pp1',  proveedor_id: 'prov1', codigo_oem: 'TOYT-16546-21060', codigo_aftermarket: 'AP-FA1060', nombre: 'Filtro de aire Toyota Corolla',       descripcion: 'Compatible 2018–2023',         precio_usd: 4.80,  minimo_pedido: 50,  activo: true },
  { id: 'pp2',  proveedor_id: 'prov1', codigo_oem: 'TOYT-48510-02370', codigo_aftermarket: 'AP-SH2370', nombre: 'Amortiguador delantero Toyota Yaris', descripcion: 'Par, gas, OEM equiv.',         precio_usd: 28.50, minimo_pedido: 10,  activo: true },
  { id: 'pp3',  proveedor_id: 'prov1', codigo_oem: 'HNDA-15400-RTA-003',                               nombre: 'Filtro de aceite Honda Civic',        descripcion: 'Serie RTA, todos motores',    precio_usd: 3.20,  minimo_pedido: 100, activo: true },
  { id: 'pp4',  proveedor_id: 'prov1', codigo_oem: 'NISN-54618-3JA0A', codigo_aftermarket: 'AP-BL3JA', nombre: 'Bieleta delantera Nissan Sentra',     descripcion: 'B17 2013–2019, par',          precio_usd: 9.40,  minimo_pedido: 20,  activo: true },
  { id: 'pp5',  proveedor_id: 'prov1', codigo_oem: 'SUZI-55310-54G00',                               nombre: 'Rotula inferior Suzuki Grand Vitara',  descripcion: 'JB series 2006–2015',         precio_usd: 7.80,  minimo_pedido: 20,  activo: false },

  // Iberparts S.L.
  { id: 'pp6',  proveedor_id: 'prov2', codigo_oem: 'VW-1K0698151G',    codigo_aftermarket: 'IB-BR151G', nombre: 'Pastillas freno delantero VW Golf',  descripcion: 'Golf VI/VII, juego 4 piezas', precio_usd: 22.00, minimo_pedido: 5,   activo: true },
  { id: 'pp7',  proveedor_id: 'prov2', codigo_oem: 'BMW-34116763423',  codigo_aftermarket: 'IB-BR6763', nombre: 'Pastillas freno trasero BMW Serie 3', descripcion: 'E90/E91/E92 2005–2013',       precio_usd: 31.50, minimo_pedido: 5,   activo: true },
  { id: 'pp8',  proveedor_id: 'prov2', codigo_oem: 'AUD-8K0615301',                                  nombre: 'Disco freno delantero Audi A4',       descripcion: 'B8 2008–2016, par',           precio_usd: 48.00, minimo_pedido: 2,   activo: true },
  { id: 'pp9',  proveedor_id: 'prov2', codigo_oem: 'VW-1K0413031BE',                                 nombre: 'Amortiguador delantero VW Passat',    descripcion: 'B6/B7, solo frente',          precio_usd: 55.00, minimo_pedido: 2,   activo: true },

  // SinoAuto Trading Ltd.
  { id: 'pp10', proveedor_id: 'prov3', codigo_oem: 'TOYT-89465-06010', codigo_aftermarket: 'SA-O2T010', nombre: 'Sensor O2 Toyota Camry',             descripcion: 'Upstream, 4-wire',            precio_usd: 11.20, minimo_pedido: 10,  activo: true },
  { id: 'pp11', proveedor_id: 'prov3', codigo_oem: 'HNDA-36531-R40-A01',codigo_aftermarket:'SA-O2H401', nombre: 'Sensor O2 Honda CR-V',               descripcion: 'K24 engine, front',           precio_usd: 12.80, minimo_pedido: 10,  activo: true },
  { id: 'pp12', proveedor_id: 'prov3', codigo_oem: 'KIA-0K9A2-18110',  codigo_aftermarket: 'SA-TK9A2', nombre: 'Termostato Kia Sportage',            descripcion: 'G4GC 2.0, incluye junta',    precio_usd: 8.50,  minimo_pedido: 20,  activo: true },

  // AutoTech USA
  { id: 'pp13', proveedor_id: 'prov4', codigo_oem: 'GM-12621258',                                    nombre: 'Bobina encendido Chevrolet Cruze',    descripcion: '1.4T Ecotec, OEM Delphi',    precio_usd: 42.00, minimo_pedido: 5,   activo: true },
  { id: 'pp14', proveedor_id: 'prov4', codigo_oem: 'FORD-BL3Z-6600-E',                               nombre: 'Bomba aceite Ford Escape 2.0',        descripcion: 'EcoBoost, OEM Ford',          precio_usd: 78.00, minimo_pedido: 2,   activo: true },
]

export const MOCK_EVALUACIONES: EvaluacionProveedor[] = [
  { id: 'ev1', proveedor_id: 'prov1', importacion_id: 'imp1', importacion_numero: 'IMP-2024-001', fecha: '2024-03-05T00:00:00.000Z', calidad: 4, precio: 5, entrega: 3, comunicacion: 4, notas: 'Llegó 3 días tarde pero la mercancía en buen estado.' },
  { id: 'ev2', proveedor_id: 'prov2', importacion_id: 'imp2', importacion_numero: 'IMP-2024-002', fecha: '2024-03-14T00:00:00.000Z', calidad: 5, precio: 3, entrega: 5, comunicacion: 5, notas: 'Excelente calidad y puntualidad. Precio elevado pero justificado.' },
  { id: 'ev3', proveedor_id: 'prov1', fecha: '2023-11-20T00:00:00.000Z', calidad: 5, precio: 5, entrega: 4, comunicacion: 3, notas: 'Comunicación lenta pero productos de primera calidad.' },
]
