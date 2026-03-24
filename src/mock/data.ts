import type { AppUser, Producto, Orden, Prestamo, Cliente, CuentaPorCobrar, AuditEntry, ConfigSistema } from '@/types';

// ─── Usuarios ────────────────────────────────────────────────────────────────
export const mockUsers: AppUser[] = [
  { id: 'u1', username: 'admin',     password: 'admin123',    name: 'Carlos Mendoza', role: 'administrador', email: 'admin@autopartes.com',    activo: true },
  { id: 'u2', username: 'vendedor1', password: 'vendedor123', name: 'Ana Ríos',       role: 'vendedor',      email: 'ana@autopartes.com',       activo: true },
  { id: 'u3', username: 'almacen1',  password: 'almacen123',  name: 'Pedro Gómez',    role: 'almacenero',    email: 'pedro@autopartes.com',      activo: true },
  { id: 'u4', username: 'reserva1',  password: 'reserva123',  name: 'Lucía Torres',   role: 'reservero',     email: 'lucia@autopartes.com',      activo: true },
  { id: 'u5', username: 'vendedor2', password: 'vendedor123', name: 'Marco Salas',    role: 'vendedor',      email: 'marco@autopartes.com',      activo: false },
];

// ─── Clientes ────────────────────────────────────────────────────────────────
export const mockClientes: Cliente[] = [
  { id: 'c0',  nombre: 'Mostrador',              nit_ci: '',           tipo: 'contado',  limite_credito: 0,    saldo_credito: 0,    activo: true,  created_at: '2026-01-01T00:00:00Z' },
  { id: 'c1',  nombre: 'Taller Los Andes',        nit_ci: '4521360',   telefono: '76543210', tipo: 'credito',  limite_credito: 2000, saldo_credito: 450,  activo: true,  created_at: '2026-01-05T08:00:00Z' },
  { id: 'c2',  nombre: 'Auto Repuestos del Norte',nit_ci: '8830124',   telefono: '72301456', tipo: 'credito',  limite_credito: 5000, saldo_credito: 1200, activo: true,  created_at: '2026-01-10T09:00:00Z' },
  { id: 'c3',  nombre: 'Servifrenos Rápido',      nit_ci: '3310982',   telefono: '68901234', tipo: 'contado',  limite_credito: 0,    saldo_credito: 0,    activo: true,  created_at: '2026-01-15T10:00:00Z' },
  { id: 'c4',  nombre: 'Mecánica Herrera',         nit_ci: '9923481',   telefono: '71234567', tipo: 'credito',  limite_credito: 3000, saldo_credito: 0,    activo: true,  created_at: '2026-01-20T11:00:00Z' },
  { id: 'c5',  nombre: 'Taller San Martín',        nit_ci: '5567123',   telefono: '69012345', tipo: 'contado',  limite_credito: 0,    saldo_credito: 0,    activo: true,  created_at: '2026-02-01T08:00:00Z' },
];

// ─── Productos ───────────────────────────────────────────────────────────────
export const mockProductos: Producto[] = [
  { id: 'p1',  sku: 'FIL-ACE-001', nombre: 'Filtro de Aceite Toyota',           categoria: 'Filtros',        marca: 'Sakura',       modelos: ['Toyota Corolla 2015', 'Toyota Yaris 2018', 'Toyota Hilux 2020'], precio_costo: 8.5,   precio_venta: 19.9,  stock: 45, stock_minimo: 10, ubicacion: { almacen: 'A', estante: '1', fila: '1' }, activo: true },
  { id: 'p2',  sku: 'FIL-AIR-002', nombre: 'Filtro de Aire Honda',              categoria: 'Filtros',        marca: 'Mann',         modelos: ['Honda Civic 2017', 'Honda CR-V 2019'],                          precio_costo: 12.0,  precio_venta: 26.5,  stock: 3,  stock_minimo: 8,  ubicacion: { almacen: 'A', estante: '1', fila: '2' }, activo: true },
  { id: 'p3',  sku: 'BUJ-NGK-003', nombre: 'Bujías NGK Set x4',                 categoria: 'Ignición',       marca: 'NGK',          modelos: ['Toyota Corolla 2018', 'Honda Civic 2019', 'Hyundai Tucson 2020'], precio_costo: 22.0, precio_venta: 48.0,  stock: 18, stock_minimo: 5,  ubicacion: { almacen: 'A', estante: '2', fila: '1' }, activo: true },
  { id: 'p4',  sku: 'AMO-DEL-004', nombre: 'Amortiguador Delantero KYB Toyota', categoria: 'Suspensión',     marca: 'KYB',          modelos: ['Toyota Corolla 2015', 'Toyota Yaris 2014'],                     precio_costo: 48.0,  precio_venta: 98.0,  stock: 8,  stock_minimo: 4,  ubicacion: { almacen: 'B', estante: '1', fila: '1' }, activo: true },
  { id: 'p5',  sku: 'FRE-DIS-005', nombre: 'Disco de Freno Delantero Toyota',   categoria: 'Frenos',         marca: 'Bosch',        modelos: ['Toyota Corolla 2016', 'Toyota Avensis 2017'],                   precio_costo: 38.0,  precio_venta: 78.0,  stock: 12, stock_minimo: 4,  ubicacion: { almacen: 'B', estante: '2', fila: '1' }, activo: true },
  { id: 'p6',  sku: 'PAD-FRE-006', nombre: 'Pastillas de Freno Brembo Honda',   categoria: 'Frenos',         marca: 'Brembo',       modelos: ['Honda Civic 2018', 'Honda CR-V 2019'],                          precio_costo: 28.0,  precio_venta: 58.0,  stock: 2,  stock_minimo: 6,  ubicacion: { almacen: 'B', estante: '2', fila: '2' }, activo: true },
  { id: 'p7',  sku: 'COR-DIS-007', nombre: 'Correa de Distribución Gates',      categoria: 'Motor',          marca: 'Gates',        modelos: ['Toyota Corolla 1.8 2016', 'Toyota RAV4 2018'],                  precio_costo: 32.0,  precio_venta: 68.0,  stock: 14, stock_minimo: 3,  ubicacion: { almacen: 'A', estante: '3', fila: '1' }, activo: true },
  { id: 'p8',  sku: 'RAD-TOY-008', nombre: 'Radiador Toyota Corolla',            categoria: 'Refrigeración',  marca: 'Koyo',         modelos: ['Toyota Corolla 2008-2014'],                                     precio_costo: 88.0,  precio_venta: 185.0, stock: 5,  stock_minimo: 2,  ubicacion: { almacen: 'C', estante: '1', fila: '1' }, activo: true },
  { id: 'p9',  sku: 'KIT-EMB-009', nombre: 'Kit de Embrague LUK Toyota',        categoria: 'Transmisión',    marca: 'LUK',          modelos: ['Toyota Hilux 2019', 'Toyota Fortuner 2020'],                    precio_costo: 125.0, precio_venta: 260.0, stock: 3,  stock_minimo: 2,  ubicacion: { almacen: 'C', estante: '1', fila: '2' }, activo: true },
  { id: 'p10', sku: 'SEN-OXI-010', nombre: 'Sensor de Oxígeno Denso',            categoria: 'Electrónica',    marca: 'Denso',        modelos: ['Universal'],                                                    precio_costo: 58.0,  precio_venta: 118.0, stock: 7,  stock_minimo: 3,  ubicacion: { almacen: 'A', estante: '4', fila: '1' }, activo: true },
  { id: 'p11', sku: 'ALT-TOY-011', nombre: 'Alternador Valeo Toyota',            categoria: 'Electrónica',    marca: 'Valeo',        modelos: ['Toyota Corolla 2010-2018'],                                     precio_costo: 98.0,  precio_venta: 205.0, stock: 4,  stock_minimo: 2,  ubicacion: { almacen: 'C', estante: '2', fila: '1' }, activo: true },
  { id: 'p12', sku: 'BOM-AGU-012', nombre: 'Bomba de Agua Aisin Honda',          categoria: 'Refrigeración',  marca: 'Aisin',        modelos: ['Honda Civic 2016', 'Honda CR-V 2018'],                          precio_costo: 45.0,  precio_venta: 94.0,  stock: 6,  stock_minimo: 3,  ubicacion: { almacen: 'A', estante: '3', fila: '2' }, activo: true },
  { id: 'p13', sku: 'COR-ACC-013', nombre: 'Correa de Accesorios Gates',         categoria: 'Motor',          marca: 'Gates',        modelos: ['Toyota Corolla 2017', 'Honda Civic 2018', 'Hyundai Elantra 2019'], precio_costo: 24.0, precio_venta: 50.0,  stock: 22, stock_minimo: 5,  ubicacion: { almacen: 'A', estante: '2', fila: '2' }, activo: true },
  { id: 'p14', sku: 'INY-COM-014', nombre: 'Inyector Combustible Denso Toyota',  categoria: 'Combustible',    marca: 'Denso',        modelos: ['Toyota Corolla 1.8 2018', 'Toyota Yaris 1.5 2019'],            precio_costo: 78.0,  precio_venta: 162.0, stock: 1,  stock_minimo: 4,  ubicacion: { almacen: 'C', estante: '3', fila: '1' }, activo: true },
  { id: 'p15', sku: 'TER-MOT-015', nombre: 'Termostato Motor Wahler Honda',      categoria: 'Refrigeración',  marca: 'Wahler',       modelos: ['Honda Civic 2017', 'Honda Accord 2018'],                       precio_costo: 18.0,  precio_venta: 38.0,  stock: 16, stock_minimo: 5,  ubicacion: { almacen: 'A', estante: '1', fila: '3' }, activo: true },
  { id: 'p16', sku: 'CAL-FRE-016', nombre: 'Caliper de Freno TRW Hyundai',       categoria: 'Frenos',         marca: 'TRW',          modelos: ['Hyundai Tucson 2019', 'Hyundai Santa Fe 2020'],                precio_costo: 68.0,  precio_venta: 142.0, stock: 5,  stock_minimo: 2,  ubicacion: { almacen: 'B', estante: '3', fila: '1' }, activo: true },
  { id: 'p17', sku: 'FIL-COM-017', nombre: 'Filtro de Combustible Fram',         categoria: 'Filtros',        marca: 'Fram',         modelos: ['Universal'],                                                    precio_costo: 14.0,  precio_venta: 29.0,  stock: 30, stock_minimo: 10, ubicacion: { almacen: 'A', estante: '1', fila: '4' }, activo: true },
  { id: 'p18', sku: 'JUN-MOT-018', nombre: 'Junta de Culata Victor Reinz Toyota',categoria: 'Motor',          marca: 'Victor Reinz', modelos: ['Toyota Corolla 1.6 2015', 'Toyota Yaris 2016'],               precio_costo: 42.0,  precio_venta: 88.0,  stock: 0,  stock_minimo: 2,  ubicacion: { almacen: 'A', estante: '4', fila: '2' }, activo: true },
  { id: 'p19', sku: 'AMO-POS-019', nombre: 'Amortiguador Posterior Monroe Honda', categoria: 'Suspensión',    marca: 'Monroe',       modelos: ['Honda Civic 2016', 'Honda Accord 2017'],                       precio_costo: 42.0,  precio_venta: 88.0,  stock: 10, stock_minimo: 4,  ubicacion: { almacen: 'B', estante: '1', fila: '2' }, activo: true },
  { id: 'p20', sku: 'ROT-TIR-020', nombre: 'Rótula de Dirección Moog Toyota',    categoria: 'Dirección',      marca: 'Moog',         modelos: ['Toyota Corolla 2017', 'Toyota Camry 2018'],                    precio_costo: 35.0,  precio_venta: 72.0,  stock: 9,  stock_minimo: 3,  ubicacion: { almacen: 'B', estante: '4', fila: '1' }, activo: true },
];

// ─── Productos de Reserva ─────────────────────────────────────────────────────
export const mockProductosReserva: Producto[] = [
  { id: 'r1', sku: 'RES-FIL-001', nombre: 'Filtro de Aceite Toyota (Reserva)',    categoria: 'Filtros',     marca: 'Sakura',  modelos: ['Toyota Corolla', 'Toyota Hilux'],    precio_costo: 8.5,  precio_venta: 19.9,  stock: 120, stock_minimo: 30, ubicacion: { almacen: 'R1', estante: '1', fila: '1' }, activo: true, es_reserva: true },
  { id: 'r2', sku: 'RES-BUJ-002', nombre: 'Bujías NGK Set x4 (Reserva)',          categoria: 'Ignición',    marca: 'NGK',     modelos: ['Toyota Corolla', 'Honda Civic'],     precio_costo: 22.0, precio_venta: 48.0,  stock: 80,  stock_minimo: 20, ubicacion: { almacen: 'R1', estante: '1', fila: '2' }, activo: true, es_reserva: true },
  { id: 'r3', sku: 'RES-FRE-003', nombre: 'Pastillas de Freno Brembo (Reserva)', categoria: 'Frenos',      marca: 'Brembo',  modelos: ['Honda Civic', 'Toyota Corolla'],     precio_costo: 28.0, precio_venta: 58.0,  stock: 15,  stock_minimo: 10, ubicacion: { almacen: 'R1', estante: '2', fila: '1' }, activo: true, es_reserva: true },
  { id: 'r4', sku: 'RES-AMO-004', nombre: 'Amortiguador KYB (Reserva)',           categoria: 'Suspensión',  marca: 'KYB',     modelos: ['Toyota Corolla', 'Hyundai Tucson'],  precio_costo: 48.0, precio_venta: 98.0,  stock: 24,  stock_minimo: 8,  ubicacion: { almacen: 'R1', estante: '2', fila: '2' }, activo: true, es_reserva: true },
  { id: 'r5', sku: 'RES-COR-005', nombre: 'Correa Distribución Gates (Reserva)',  categoria: 'Motor',       marca: 'Gates',   modelos: ['Toyota Corolla 1.8'],                precio_costo: 32.0, precio_venta: 68.0,  stock: 6,   stock_minimo: 5,  ubicacion: { almacen: 'R1', estante: '3', fila: '1' }, activo: true, es_reserva: true },
  { id: 'r6', sku: 'RES-FIL-006', nombre: 'Filtro de Aire Mann (Reserva)',        categoria: 'Filtros',     marca: 'Mann',    modelos: ['Honda Civic', 'Honda CR-V'],         precio_costo: 12.0, precio_venta: 26.5,  stock: 50,  stock_minimo: 15, ubicacion: { almacen: 'R2', estante: '1', fila: '1' }, activo: true, es_reserva: true },
];

// ─── Órdenes ─────────────────────────────────────────────────────────────────
export const mockOrdenes: Orden[] = [
  {
    id: 'o1', numero: 'VTA-0001', tipo: 'venta', cliente_id: 'c1', cliente_nombre: 'Taller Los Andes',
    vendedor: 'Ana Ríos', forma_pago: 'efectivo', estado: 'pendiente',
    items: [
      { producto_id: 'p1', sku: 'FIL-ACE-001', nombre: 'Filtro de Aceite Toyota', cantidad: 2, precio_unitario: 19.9, ubicacion: { almacen: 'A', estante: '1', fila: '1' } },
      { producto_id: 'p3', sku: 'BUJ-NGK-003', nombre: 'Bujías NGK Set x4',      cantidad: 1, precio_unitario: 48.0, ubicacion: { almacen: 'A', estante: '2', fila: '1' } },
    ],
    subtotal: 87.8, total: 87.8,
    created_at: new Date(Date.now() - 6 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60000).toISOString(),
  },
  {
    id: 'o2', numero: 'VTA-0002', tipo: 'venta', cliente_id: 'c2', cliente_nombre: 'Auto Repuestos del Norte',
    vendedor: 'Ana Ríos', forma_pago: 'qr', estado: 'en_preparacion',
    items: [
      { producto_id: 'p5', sku: 'FRE-DIS-005', nombre: 'Disco de Freno Delantero', cantidad: 2, precio_unitario: 78.0, ubicacion: { almacen: 'B', estante: '2', fila: '1' } },
      { producto_id: 'p6', sku: 'PAD-FRE-006', nombre: 'Pastillas de Freno Brembo', cantidad: 1, precio_unitario: 58.0, ubicacion: { almacen: 'B', estante: '2', fila: '2' } },
    ],
    subtotal: 214.0, total: 214.0,
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 60000).toISOString(),
    started_at: new Date(Date.now() - 14 * 60000).toISOString(),
  },
  {
    id: 'o3', numero: 'VTA-0003', tipo: 'venta', cliente_id: 'c3', cliente_nombre: 'Servifrenos Rápido',
    vendedor: 'Ana Ríos', forma_pago: 'efectivo', estado: 'entregado',
    items: [
      { producto_id: 'p4', sku: 'AMO-DEL-004', nombre: 'Amortiguador Delantero KYB', cantidad: 2, precio_unitario: 98.0, ubicacion: { almacen: 'B', estante: '1', fila: '1' } },
    ],
    subtotal: 196.0, total: 196.0,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2.5 * 3600000).toISOString(),
    started_at: new Date(Date.now() - 2.8 * 3600000).toISOString(),
    delivered_at: new Date(Date.now() - 2.5 * 3600000).toISOString(),
  },
  {
    id: 'o4', numero: 'VTA-0004', tipo: 'venta', cliente_id: 'c0', cliente_nombre: 'Mostrador',
    vendedor: 'Ana Ríos', forma_pago: 'efectivo', estado: 'entregado',
    items: [
      { producto_id: 'p1',  sku: 'FIL-ACE-001', nombre: 'Filtro de Aceite Toyota',    cantidad: 4, precio_unitario: 19.9, ubicacion: { almacen: 'A', estante: '1', fila: '1' } },
      { producto_id: 'p17', sku: 'FIL-COM-017', nombre: 'Filtro de Combustible Fram', cantidad: 3, precio_unitario: 29.0, ubicacion: { almacen: 'A', estante: '1', fila: '4' } },
    ],
    subtotal: 166.6, total: 166.6,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4.5 * 3600000).toISOString(),
    started_at: new Date(Date.now() - 4.8 * 3600000).toISOString(),
    delivered_at: new Date(Date.now() - 4.5 * 3600000).toISOString(),
  },
  {
    id: 'o5', numero: 'VTA-0005', tipo: 'venta', cliente_id: 'c2', cliente_nombre: 'Auto Repuestos del Norte',
    vendedor: 'Ana Ríos', forma_pago: 'credito', estado: 'pendiente',
    items: [
      { producto_id: 'p7',  sku: 'COR-DIS-007', nombre: 'Correa de Distribución Gates', cantidad: 1, precio_unitario: 68.0, ubicacion: { almacen: 'A', estante: '3', fila: '1' } },
      { producto_id: 'p12', sku: 'BOM-AGU-012', nombre: 'Bomba de Agua Aisin Honda',    cantidad: 1, precio_unitario: 94.0, ubicacion: { almacen: 'A', estante: '3', fila: '2' } },
    ],
    subtotal: 162.0, total: 162.0,
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60000).toISOString(),
  },
];

// ─── Cuentas por cobrar ───────────────────────────────────────────────────────
export const mockCuentas: CuentaPorCobrar[] = [
  {
    id: 'cc1', orden_id: 'o5', orden_numero: 'VTA-0005',
    cliente_id: 'c2', cliente_nombre: 'Auto Repuestos del Norte',
    monto: 162.0, pagado: 0,
    vencimiento: new Date(Date.now() + 15 * 24 * 3600000).toISOString(),
    estado: 'pendiente',
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
  },
  {
    id: 'cc2', orden_id: 'prev1', orden_numero: 'VTA-0000',
    cliente_id: 'c1', cliente_nombre: 'Taller Los Andes',
    monto: 450.0, pagado: 0,
    vencimiento: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    estado: 'vencida',
    created_at: new Date(Date.now() - 32 * 24 * 3600000).toISOString(),
  },
  {
    id: 'cc3', orden_id: 'prev2', orden_numero: 'VTA-prev2',
    cliente_id: 'c4', cliente_nombre: 'Mecánica Herrera',
    monto: 320.0, pagado: 320.0,
    vencimiento: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
    estado: 'pagada',
    created_at: new Date(Date.now() - 40 * 24 * 3600000).toISOString(),
  },
];

// ─── Préstamos ────────────────────────────────────────────────────────────────
export const mockPrestamos: Prestamo[] = [
  {
    id: 'pr1', numero: 'PREST-001', persona: 'Roberto Mendoza', relacion: 'Socio',
    items: [
      { producto_id: 'p4', sku: 'AMO-DEL-004', nombre: 'Amortiguador Delantero KYB', cantidad: 2, precio_unitario: 98.0 },
      { producto_id: 'p5', sku: 'FRE-DIS-005', nombre: 'Disco de Freno Delantero',   cantidad: 1, precio_unitario: 78.0 },
    ],
    total: 274.0, pagado: 0, estado: 'activo',
    created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    notas: 'Para vehículo personal. Pendiente de cobro.',
  },
  {
    id: 'pr2', numero: 'PREST-002', persona: 'María González', relacion: 'Familiar',
    items: [
      { producto_id: 'p1',  sku: 'FIL-ACE-001', nombre: 'Filtro de Aceite Toyota', cantidad: 3, precio_unitario: 19.9 },
      { producto_id: 'p13', sku: 'COR-ACC-013', nombre: 'Correa de Accesorios',    cantidad: 1, precio_unitario: 50.0 },
    ],
    total: 109.7, pagado: 60.0, estado: 'parcial',
    created_at: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
    notas: 'Abonó S/60 el 18/03.',
  },
  {
    id: 'pr3', numero: 'PREST-003', persona: 'Juan Carlos Pérez', relacion: 'Empresa aliada',
    items: [
      { producto_id: 'p8', sku: 'RAD-TOY-008', nombre: 'Radiador Toyota Corolla', cantidad: 1, precio_unitario: 185.0 },
    ],
    total: 185.0, pagado: 185.0, estado: 'pagado',
    created_at: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    notas: 'Pagado por transferencia.',
  },
];

// ─── Auditoría ────────────────────────────────────────────────────────────────
export const mockAudit: AuditEntry[] = [
  { id: 'a1', accion: 'login',           descripcion: 'Inicio de sesión',                                   usuario: 'Carlos Mendoza', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'a2', accion: 'orden_creada',    descripcion: 'Orden VTA-0005 creada por S/ 162.00',                usuario: 'Ana Ríos',       entidad: 'Orden', entidad_id: 'o5', timestamp: new Date(Date.now() - 3 * 60000).toISOString() },
  { id: 'a3', accion: 'precio_cambio',   descripcion: 'Precio actualizado: FIL-ACE-001 → S/ 19.90',        usuario: 'Carlos Mendoza', entidad: 'Producto', entidad_id: 'p1', timestamp: new Date(Date.now() - 1 * 3600000).toISOString() },
  { id: 'a4', accion: 'stock_ajuste',    descripcion: 'Ajuste de stock: BUJ-NGK-003, delta: +10, motivo: Recepción de mercadería', usuario: 'Carlos Mendoza', entidad: 'Producto', entidad_id: 'p3', timestamp: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'a5', accion: 'prestamo_creado', descripcion: 'Préstamo PREST-001 registrado para Roberto Mendoza', usuario: 'Carlos Mendoza', entidad: 'Prestamo', entidad_id: 'pr1', timestamp: new Date(Date.now() - 7 * 24 * 3600000).toISOString() },
];

// ─── Configuración ────────────────────────────────────────────────────────────
export const defaultConfig: ConfigSistema = {
  empresa: {
    nombre: 'AutoPartes Pro S.R.L.',
    nit: '1234567890',
    direccion: 'Av. Comercio 456, Zona Industrial',
    telefono: '(591) 2-290-0000',
    ciudad: 'La Paz, Bolivia',
  },
  tipo_cambio: 6.96,
  margen_default: 40,
  categorias: ['Filtros', 'Ignición', 'Suspensión', 'Frenos', 'Motor', 'Refrigeración', 'Transmisión', 'Electrónica', 'Combustible', 'Dirección', 'Carrocería'],
  stock_minimo_default: 5,
};
