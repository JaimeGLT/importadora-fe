export interface VentaDiaria {
  fecha: string
  ordenes: number
  total_bs: number
}

export interface VentasCajero {
  cajero_id: string
  cajero_nombre: string
  ordenes_30d: number
  total_bs_30d: number
  ordenes_7d: number
  total_bs_7d: number
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

const RAW: [number, number][] = [
  [4, 3800], [3, 2900], [5, 5200], [6, 6100], [7, 7400], [4, 3600], [2, 1900],
  [5, 4900], [6, 5800], [8, 8200], [7, 7600], [9, 9100], [5, 4800], [3, 2600],
  [6, 5500], [7, 6700], [8, 8000], [9, 9500], [11, 11200], [6, 5800], [3, 2700],
  [7, 6900], [8, 7800], [10, 10200], [12, 12800], [14, 14500], [8, 8200], [4, 3900],
  [13, 13800], [15, 16200],
]

export const MOCK_VENTAS_DIARIAS: VentaDiaria[] = RAW.map(([ordenes, total_bs], i) => ({
  fecha: daysAgo(29 - i),
  ordenes,
  total_bs,
}))

export const MOCK_VENTAS_CAJERO: VentasCajero[] = [
  { cajero_id: '2', cajero_nombre: 'María López',    ordenes_30d: 52, total_bs_30d: 48600, ordenes_7d: 15, total_bs_7d: 14800 },
  { cajero_id: '4', cajero_nombre: 'Carlos Mendoza', ordenes_30d: 38, total_bs_30d: 33200, ordenes_7d: 11, total_bs_7d: 10200 },
  { cajero_id: '5', cajero_nombre: 'Ana García',     ordenes_30d: 29, total_bs_30d: 24100, ordenes_7d: 8,  total_bs_7d: 7500  },
]

// ─── Cuentas por cobrar ───────────────────────────────────────────────────────

export interface CuentaPorCobrar {
  id: string
  cliente: string
  tipo: 'taller' | 'distribuidor' | 'empresa'
  monto_bs: number
  dias_credito: number
  dias_vencido: number
  ultima_compra: string
}

export const MOCK_CUENTAS_COBRAR: CuentaPorCobrar[] = [
  { id: 'c1',  cliente: 'Taller Automotriz Ríos',    tipo: 'taller',       monto_bs: 18400,  dias_credito: 30, dias_vencido: 0,  ultima_compra: '2026-04-10' },
  { id: 'c2',  cliente: 'Distribuidora El Motor',    tipo: 'distribuidor', monto_bs: 52000,  dias_credito: 60, dias_vencido: 15, ultima_compra: '2026-03-20' },
  { id: 'c3',  cliente: 'Taller Hermanos Coca',      tipo: 'taller',       monto_bs: 8700,   dias_credito: 30, dias_vencido: 38, ultima_compra: '2026-03-05' },
  { id: 'c4',  cliente: 'AutoRepuestos La Paz SRL',  tipo: 'empresa',      monto_bs: 34200,  dias_credito: 45, dias_vencido: 0,  ultima_compra: '2026-04-14' },
  { id: 'c5',  cliente: 'Taller Técnico Mamani',     tipo: 'taller',       monto_bs: 5800,   dias_credito: 15, dias_vencido: 22, ultima_compra: '2026-03-18' },
  { id: 'c6',  cliente: 'Repuestos Del Norte',       tipo: 'distribuidor', monto_bs: 28900,  dias_credito: 30, dias_vencido: 5,  ultima_compra: '2026-04-05' },
  { id: 'c7',  cliente: 'Taller La Cruz Oruro',      tipo: 'taller',       monto_bs: 11200,  dias_credito: 30, dias_vencido: 0,  ultima_compra: '2026-04-15' },
  { id: 'c8',  cliente: 'Distribuciones Centro SRL', tipo: 'distribuidor', monto_bs: 76500,  dias_credito: 60, dias_vencido: 8,  ultima_compra: '2026-04-01' },
  { id: 'c9',  cliente: 'AutoServicios Cochabamba',  tipo: 'empresa',      monto_bs: 9200,   dias_credito: 15, dias_vencido: 45, ultima_compra: '2026-02-28' },
  { id: 'c10', cliente: 'Mecánica Don Pepe',         tipo: 'taller',       monto_bs: 3600,   dias_credito: 15, dias_vencido: 0,  ultima_compra: '2026-04-16' },
  { id: 'c11', cliente: 'Importadora Boliviana SRL', tipo: 'empresa',      monto_bs: 43800,  dias_credito: 30, dias_vencido: 12, ultima_compra: '2026-04-03' },
  { id: 'c12', cliente: 'Taller Flores & Hijos',     tipo: 'taller',       monto_bs: 7100,   dias_credito: 30, dias_vencido: 62, ultima_compra: '2026-02-10' },
]

// ─── Proveedores cumplimiento ─────────────────────────────────────────────────

export interface ProveedorCumplimiento {
  id: string
  nombre: string
  pais: string
  pedidos_total: number
  pedidos_a_tiempo: number
  dias_retraso_promedio: number
  defectos_pct: number
  monto_total_bs: number
}

export const MOCK_PROVEEDORES_CUMPLIMIENTO: ProveedorCumplimiento[] = [
  { id: 'p1', nombre: 'Brembo S.p.A.',            pais: 'Italia',         pedidos_total: 9,  pedidos_a_tiempo: 9,  dias_retraso_promedio: 0.0, defectos_pct: 0.1, monto_total_bs: 136000 },
  { id: 'p2', nombre: 'BOSCH Supply Chain GmbH',  pais: 'Alemania',       pedidos_total: 12, pedidos_a_tiempo: 11, dias_retraso_promedio: 1.2, defectos_pct: 0.3, monto_total_bs: 182000 },
  { id: 'p3', nombre: 'Febi Bilstein',            pais: 'Alemania',       pedidos_total: 7,  pedidos_a_tiempo: 7,  dias_retraso_promedio: 0.5, defectos_pct: 0.2, monto_total_bs: 98000  },
  { id: 'p4', nombre: 'Gates Corporation',        pais: 'Estados Unidos', pedidos_total: 10, pedidos_a_tiempo: 9,  dias_retraso_promedio: 2.1, defectos_pct: 0.4, monto_total_bs: 145000 },
  { id: 'p5', nombre: 'Monroe Ride Control',      pais: 'Estados Unidos', pedidos_total: 6,  pedidos_a_tiempo: 5,  dias_retraso_promedio: 4.0, defectos_pct: 0.5, monto_total_bs: 112000 },
  { id: 'p6', nombre: 'NGK Spark Plugs Co.',      pais: 'Japón',          pedidos_total: 8,  pedidos_a_tiempo: 7,  dias_retraso_promedio: 3.5, defectos_pct: 0.8, monto_total_bs: 94000  },
  { id: 'p7', nombre: 'GMB Korea',                pais: 'Japón',          pedidos_total: 5,  pedidos_a_tiempo: 4,  dias_retraso_promedio: 5.2, defectos_pct: 1.1, monto_total_bs: 68000  },
  { id: 'p8', nombre: 'Auto Parts Global Co.',    pais: 'China',          pedidos_total: 22, pedidos_a_tiempo: 16, dias_retraso_promedio: 6.8, defectos_pct: 1.7, monto_total_bs: 312000 },
  { id: 'p9', nombre: 'Wanxiang Auto Parts',      pais: 'China',          pedidos_total: 18, pedidos_a_tiempo: 12, dias_retraso_promedio: 8.2, defectos_pct: 2.1, monto_total_bs: 248000 },
]

// ─── Clientes con caída de compras ────────────────────────────────────────────

export interface ClienteCaida {
  id: string
  nombre: string
  tipo: 'taller' | 'distribuidor' | 'empresa'
  compras_30d_anterior_bs: number
  compras_30d_actual_bs: number
  pct_caida: number
  ultima_compra: string
}

export const MOCK_CLIENTES_CAIDA: ClienteCaida[] = [
  { id: 'cc1', nombre: 'Taller San Martín',           tipo: 'taller',       compras_30d_anterior_bs: 12400, compras_30d_actual_bs: 3200,  pct_caida: 74.2, ultima_compra: '2026-03-28' },
  { id: 'cc2', nombre: 'Repuestos Central Ltda.',     tipo: 'empresa',      compras_30d_anterior_bs: 38000, compras_30d_actual_bs: 14500, pct_caida: 61.8, ultima_compra: '2026-04-02' },
  { id: 'cc3', nombre: 'Taller Express Cochabamba',   tipo: 'taller',       compras_30d_anterior_bs: 8700,  compras_30d_actual_bs: 3900,  pct_caida: 55.2, ultima_compra: '2026-04-08' },
  { id: 'cc4', nombre: 'AutoParts Bolivia SRL',       tipo: 'distribuidor', compras_30d_anterior_bs: 62000, compras_30d_actual_bs: 31000, pct_caida: 50.0, ultima_compra: '2026-04-10' },
  { id: 'cc5', nombre: 'Taller Autoeléctrico Pérez',  tipo: 'taller',       compras_30d_anterior_bs: 16800, compras_30d_actual_bs: 9700,  pct_caida: 42.3, ultima_compra: '2026-04-09' },
  { id: 'cc6', nombre: 'Distribuidora Norte Oruro',   tipo: 'distribuidor', compras_30d_anterior_bs: 28500, compras_30d_actual_bs: 15100, pct_caida: 47.0, ultima_compra: '2026-04-07' },
  { id: 'cc7', nombre: 'Mecánica Moderna Santa Cruz', tipo: 'taller',       compras_30d_anterior_bs: 9400,  compras_30d_actual_bs: 5800,  pct_caida: 38.3, ultima_compra: '2026-04-11' },
]

// ─── Estacionalidad ───────────────────────────────────────────────────────────

export const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export interface MesVenta { mes: string; unidades: number }

export interface EstacionalidadRef {
  codigo: string
  nombre: string
  ventas: MesVenta[]
}

export const MOCK_ESTACIONALIDAD: EstacionalidadRef[] = [
  {
    codigo: 'MOT-0011',
    nombre: 'Filtro de aceite Toyota',
    ventas: [28,22,35,30,42,38,36,40,45,32,28,24].map((u, i) => ({ mes: MESES[i], unidades: u })),
  },
  {
    codigo: 'MOT-0099',
    nombre: 'Filtro combustible Kia / Hyundai',
    ventas: [20,18,25,22,32,30,28,34,38,26,20,18].map((u, i) => ({ mes: MESES[i], unidades: u })),
  },
  {
    codigo: 'MOT-0188',
    nombre: 'Bujía platino Denso Universal',
    ventas: [30,26,34,38,44,48,42,40,46,38,32,28].map((u, i) => ({ mes: MESES[i], unidades: u })),
  },
  {
    codigo: 'MOT-0055',
    nombre: 'Bujías NGK Iridium',
    ventas: [32,28,35,38,42,45,40,38,44,36,30,28].map((u, i) => ({ mes: MESES[i], unidades: u })),
  },
  {
    codigo: 'ELE-0044',
    nombre: 'Batería Bosch 60Ah',
    ventas: [8,7,9,12,18,22,24,20,15,10,9,8].map((u, i) => ({ mes: MESES[i], unidades: u })),
  },
  {
    codigo: 'FRE-0022',
    nombre: 'Pastillas de freno Brembo',
    ventas: [18,22,19,16,14,12,11,13,16,20,24,20].map((u, i) => ({ mes: MESES[i], unidades: u })),
  },
  {
    codigo: 'FRE-0111',
    nombre: 'Pastillas traseras Suzuki Swift',
    ventas: [14,16,15,13,11,10,9,11,14,16,18,15].map((u, i) => ({ mes: MESES[i], unidades: u })),
  },
  {
    codigo: 'SUS-0033',
    nombre: 'Amortiguador Monroe Trasero',
    ventas: [5,4,6,7,8,9,8,7,9,7,6,5].map((u, i) => ({ mes: MESES[i], unidades: u })),
  },
  {
    codigo: 'SUS-0144',
    nombre: 'Amortiguador Ford Ranger',
    ventas: [6,5,7,8,10,12,11,9,10,8,6,5].map((u, i) => ({ mes: MESES[i], unidades: u })),
  },
  {
    codigo: 'ENF-0155',
    nombre: 'Termostato Toyota Hilux',
    ventas: [22,20,28,26,34,32,30,36,40,28,22,20].map((u, i) => ({ mes: MESES[i], unidades: u })),
  },
]
