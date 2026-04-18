// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  nombre: string
  email: string
  rol: 'admin' | 'vendedor' | 'almacenero'
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

// ─── Inventario ───────────────────────────────────────────────────────────────

export type CategoriaProducto =
  | 'Motor'
  | 'Transmisión'
  | 'Suspensión'
  | 'Frenos'
  | 'Eléctrico'
  | 'Carrocería'
  | 'Enfriamiento'
  | 'Escape'
  | 'Otro'

export type UnidadProducto = 'pieza' | 'juego' | 'par' | 'kit' | 'litro' | 'metro' | 'otro'

export type EstadoProducto = 'activo' | 'descontinuado' | 'sin_stock'

export interface HistorialPrecio {
  fecha: string          // ISO
  precio_costo: number
  precio_venta: number
  tipo_cambio: number    // tasa Bs/USD al momento del cambio
  nota?: string
}

export interface Producto {
  id: string
  codigo_universal: string        // código principal — búsquedas y código de barras
  codigos_alternativos: string[]  // hasta 2 códigos adicionales (caja / proveedor)
  nombre: string
  descripcion: string
  categoria: CategoriaProducto
  marca: string
  vehiculo: string                // compatibilidad libre: "Toyota Corolla 2018-2023"
  unidad: UnidadProducto
  stock: number
  stock_minimo: number
  precio_costo: number
  precio_venta: number            // en bolivianos (Bs)
  conversionABs?: number
  historial_precios: HistorialPrecio[]
  ubicacion: string               // default "Almacén Central"
  imagen?: string                 // URL de imagen del producto
  estado: EstadoProducto
  proveedor_id: string
  creado_en: string
  actualizado_en: string
}

export type MonedaProveedor = 'USD' | 'EUR' | 'CNY' | 'GBP' | 'JPY' | 'KRW' | 'BRL' | 'ARS' | 'CLP' | 'PEN'

export type TerminosPago =
  | 'T/T anticipado'
  | 'T/T 30 días'
  | 'T/T 60 días'
  | 'L/C a la vista'
  | 'L/C 30 días'
  | 'NET 30'
  | 'NET 60'
  | 'Contra entrega'

export interface Proveedor {
  id: string
  nombre: string
  pais: string
  moneda: MonedaProveedor
  terminos_pago: TerminosPago
  contacto: string
  email: string
  telefono?: string
  sitio_web?: string
  notas?: string
  tiempo_reposicion_dias?: number
  estado: 'activo' | 'inactivo'
  creado_en: string
  actualizado_en: string
}

export interface ProductoProveedor {
  id: string
  proveedor_id: string
  codigo_oem: string
  codigo_aftermarket?: string
  nombre: string
  descripcion?: string
  precio_usd: number
  minimo_pedido: number
  producto_id?: string   // vínculo con inventario
  activo: boolean
}

export interface EvaluacionProveedor {
  id: string
  proveedor_id: string
  importacion_id?: string
  importacion_numero?: string
  fecha: string
  calidad: number        // 1–5
  precio: number         // 1–5
  entrega: number        // 1–5
  comunicacion: number   // 1–5
  notas?: string
}

// ─── Préstamos ────────────────────────────────────────────────────────────────

export interface Prestamo {
  id: string
  producto_id: string
  producto_nombre: string
  producto_codigo: string
  cantidad: number
  prestado_a: string
  precio_unitario: number
  precio_total: number
  fecha: string
  notas: string
  creado_en: string
}

// ─── Importaciones ────────────────────────────────────────────────────────────

export interface OrigenConfig {
  id: string
  nombre: string
  tiempo_estimado_dias: number
}

export type EstadoImportacion = 'en_transito' | 'en_aduana' | 'recibida' | 'cancelada'

export interface ItemImportacion {
  id: string
  codigo_proveedor: string          // Código Universal
  codigos_adicionales: string[]     // [0] = Alt 1, [1] = Alt 2
  nombre: string
  marca?: string
  descripcion?: string
  unidad?: UnidadProducto           // pieza, juego, par…
  ubicacion?: string                // Almacén Central
  precio_fob_usd: number
  cantidad: number                  // stock entrada
  // costo por unidad
  costo_unitario_fob_bs: number
  costo_unitario_adicional_bs: number
  costo_unitario_total_bs: number   // precio costo
  precio_venta_sugerido: number
  precio_venta_final: number        // precio venta
  // vínculo inventario
  producto_id?: string
  es_nuevo: boolean
}

export interface Importacion {
  id: string
  numero: string
  origen: string
  proveedor: string
  fecha_creacion: string
  fecha_estimada_llegada: string
  estado: EstadoImportacion
  fob_total_usd: number
  flete_usd: number
  aduana_bs: number
  transporte_interno_bs: number
  tipo_cambio: number
  items: ItemImportacion[]
  creado_en: string
  actualizado_en: string
}

// ─── Ventas ───────────────────────────────────────────────────────────────────

export type EstadoOrden = 'pendiente' | 'en_preparacion' | 'listo' | 'pagado' | 'cancelado'
export type EstadoItemOrden = 'ok' | 'discrepancia' | 'faltante'
export type MetodoPago = 'efectivo' | 'tarjeta' | 'qr'
export type CanalReserva = 'presencial' | 'whatsapp'
export type EstadoReserva = 'activa' | 'convertida' | 'cancelada'

export interface ItemOrden {
  id: string
  producto_id: string
  producto_codigo: string
  producto_nombre: string
  producto_ubicacion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  estado: EstadoItemOrden
  nota_faltante?: string
}

export interface OrdenVenta {
  id: string
  numero: string
  cajero_id: string
  cajero_nombre: string
  items: ItemOrden[]
  total: number
  estado: EstadoOrden
  metodo_pago?: MetodoPago
  monto_recibido?: number
  nota?: string
  creado_en: string
  actualizado_en: string
  aceptado_en?: string
  listo_en?: string
  pagado_en?: string
}

export interface Reserva {
  id: string
  numero: string
  cajero_id: string
  cajero_nombre: string
  cliente_nombre?: string
  cliente_telefono?: string
  canal: CanalReserva
  items: ItemOrden[]
  total: number
  estado: EstadoReserva
  expira_en: string
  nota?: string
  creado_en: string
  actualizado_en: string
}

export interface ConfigVentas {
  tiempo_alerta_minutos: number
}

export interface Factura {
  id: string
  numero: string
  orden_id: string
  orden_numero: string
  cajero_nombre: string
  items: ItemOrden[]
  total: number
  metodo_pago: MetodoPago
  monto_recibido?: number
  cambio?: number
  emitida_en: string
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface Filters {
  search?: string
  categoria?: CategoriaProducto | ''
  estado?: EstadoProducto | ''
  page?: number
  pageSize?: number
}
