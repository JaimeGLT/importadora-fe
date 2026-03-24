// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'administrador' | 'vendedor' | 'almacenero' | 'reservero';

export interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  email?: string;
  activo: boolean;
}

// ─── Clientes ────────────────────────────────────────────────────────────────
export type TipoCliente = 'contado' | 'credito';

export interface Cliente {
  id: string;
  nombre: string;
  nit_ci?: string;
  telefono?: string;
  direccion?: string;
  tipo: TipoCliente;
  limite_credito: number;
  saldo_credito: number;   // acumulado pendiente
  notas?: string;
  activo: boolean;
  created_at: string;
}

// ─── Inventario ──────────────────────────────────────────────────────────────
export interface Ubicacion {
  almacen: string;
  estante: string;
  fila: string;
}

export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  marca: string;
  modelos: string[];          // "Toyota Corolla 2018", "Toyota Yaris 2020", etc.
  precio_costo: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  ubicacion: Ubicacion;
  activo: boolean;
  es_reserva?: boolean;
}

// ─── Órdenes de venta ────────────────────────────────────────────────────────
export type EstadoOrden = 'pendiente' | 'en_preparacion' | 'entregado' | 'cancelado';
export type FormaPago  = 'efectivo' | 'qr' | 'transferencia' | 'credito';
export type TipoDocumento = 'venta' | 'cotizacion';

export interface ItemOrden {
  producto_id: string;
  sku: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  ubicacion: Ubicacion;
}

export interface Orden {
  id: string;
  numero: string;
  tipo: TipoDocumento;
  cliente_id: string;
  cliente_nombre: string;
  vendedor: string;
  items: ItemOrden[];
  subtotal: number;
  total: number;
  forma_pago: FormaPago;
  estado: EstadoOrden;
  problema?: string;         // reporte de bodeguero
  created_at: string;
  updated_at: string;
  started_at?: string;
  delivered_at?: string;
}

// ─── Cotizaciones ────────────────────────────────────────────────────────────
export interface Cotizacion {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nombre: string;
  vendedor: string;
  items: ItemOrden[];
  total: number;
  created_at: string;
  valida_hasta: string;
}

// ─── Préstamos ───────────────────────────────────────────────────────────────
export type EstadoPrestamo = 'activo' | 'parcial' | 'pagado';

export interface ItemPrestamo {
  producto_id: string;
  sku: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface Prestamo {
  id: string;
  numero: string;
  persona: string;
  relacion: string;
  items: ItemPrestamo[];
  total: number;
  pagado: number;
  estado: EstadoPrestamo;
  created_at: string;
  notas?: string;
}

// ─── Cuentas por cobrar ──────────────────────────────────────────────────────
export type EstadoCuenta = 'pendiente' | 'vencida' | 'pagada';

export interface CuentaPorCobrar {
  id: string;
  orden_id: string;
  orden_numero: string;
  cliente_id: string;
  cliente_nombre: string;
  monto: number;
  pagado: number;
  vencimiento: string;
  estado: EstadoCuenta;
  created_at: string;
}

// ─── Cierre de caja ──────────────────────────────────────────────────────────
export interface CierreCaja {
  id: string;
  fecha: string;
  efectivo: number;
  qr: number;
  transferencia: number;
  credito: number;
  total: number;
  ordenes_count: number;
  cerrado_por: string;
  created_at: string;
}

// ─── Auditoría ───────────────────────────────────────────────────────────────
export type AuditAction =
  | 'login' | 'logout'
  | 'stock_ajuste' | 'precio_cambio' | 'producto_creado' | 'producto_eliminado'
  | 'orden_creada' | 'orden_cancelada' | 'prestamo_creado'
  | 'usuario_creado' | 'usuario_editado';

export interface AuditEntry {
  id: string;
  accion: AuditAction;
  descripcion: string;
  usuario: string;
  entidad?: string;
  entidad_id?: string;
  timestamp: string;
}

// ─── Configuración ───────────────────────────────────────────────────────────
export interface ConfigEmpresa {
  nombre: string;
  nit?: string;
  direccion?: string;
  telefono?: string;
  ciudad?: string;
  email?: string;
}

export interface ConfigSistema {
  empresa: ConfigEmpresa;
  tipo_cambio: number;
  margen_default: number;
  categorias: string[];
  stock_minimo_default: number;
}
