// ─── Auth ────────────────────────────────────────────────────────────────────

export type RolUsuario = 'admin' | 'cajero' | 'almacenero'

export interface Usuario {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: RolUsuario
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface AuthState {
  user: Usuario | null
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
  stock_reservado?: number
  stock_minimo: number
  piezas: number                   // piezas por unidad (default 1)
  precio_costo: number
  precio_venta: number            // en bolivianos (Bs)
  conversionABs?: number
  historial_precios: HistorialPrecio[]
  almacen: string
  estante: string
  fila: string
  columna: string
  imagen?: string                 // URL de imagen del producto
  estado: EstadoProducto
  proveedor_id: string
  es_kit?: boolean
  kit_id?: string | null
  cantidad_por_kit?: number
  piezas_kit?: PiezaKit[]
  creado_en: string
  actualizado_en: string
}

export interface KitRelacion {
  kit_id: string
  producto_id: string
  cantidad: number
}

export interface PiezaKit {
  id: number
  id_producto: number
  codigo_universal: string
  nombre: string
  cantidad_por_kit: number
  stock_actual: number
  stock_reservado: number
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

export type EstadoPrestamo = 'activo' | 'cancelado' | 'devuelto'

export interface ItemPrestamo {
  producto_id: string
  producto_nombre: string
  producto_codigo: string
  cantidad: number
  precio_unitario: number
  precio_total: number
}

export interface Prestamo {
  id: string
  items: ItemPrestamo[]
  prestado_a: string
  fecha: string
  notas: string
  estado: EstadoPrestamo
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
  piezas?: number                  // piezas por unidad (opcional, undefined = no enviar al backend)
  // costo por unidad
  costo_unitario_fob_bs: number
  costo_unitario_adicional_bs: number
  costo_unitario_total_bs: number   // precio costo
  precio_venta_sugerido: number
  precio_venta_final: number        // precio venta
  // vínculo inventario
  producto_id?: string
  es_nuevo: boolean
  usar_precio_nuevo?: boolean
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

// ─── Caja ──────────────────────────────────────────────────────────────────────

export type CategoriaMovimientoCaja =
  | 'Ventas'
  | 'OtroIngreso'
  | 'Compra'
  | 'GastoOperativo'
  | 'OtroEgreso'
  | 'Transferencia'

export interface MovimientoCaja {
  id: number
  id_Caja: number
  tipo: 'Ingreso' | 'Egreso'
  tipoPago: 'Efectivo' | 'QR' | 'Tarjeta'
  categoria: CategoriaMovimientoCaja
  monto: number
  motivo: string
  fecha: string
}

export interface Caja {
  id: number
  usuarioId: string
  montoInicial: number
  fechaInicio: string
  fechaCierre: string | null
  estado: 'Abierta' | 'Cerrada'
  montoContado: number | null
  justificacion: string | null
  movimientos: MovimientoCaja[]
}

export interface CierreCajaResponse {
  estado: string
  fechaInicio: string
  fechaCierre: string
  montoInicial: number
  totalIngresos: number
  ingresoEfectivo: number
  ingresoQR: number
  ingresoTarjeta: number
  totalEgresos: number
  efectivoEsperado: number
  montoContado: number
  justificacion: string | null
}

export interface Caja {
  id: number
  usuarioId: string
  montoInicial: number
  fechaInicio: string
  fechaCierre: string | null
  estado: 'Abierta' | 'Cerrada'
  montoContado: number | null
  justificacion: string | null
  movimientos: MovimientoCaja[]
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export interface Cliente {
  id: number
  nombre?: string
  apellido: string
  telefono?: string
  ci?: string
  ciComplemento?: string
  nit?: string
  email?: string
  activo?: boolean
  compras?: unknown[]
  creado_en?: string
  actualizado_en?: string
}

export interface ClienteAPI {
  id: number
  nombre?: string
  apellido: string
  telefono?: string
  nit?: string
  email?: string
}

// ─── Ventas ───────────────────────────────────────────────────────────────────

export type EstadoOrden =
  | 'pendiente_almacenero'
  | 'en_preparacion'
  | 'listo_para_escaneo'
  | 'completada'
  | 'cancelada'
export type TipoOrden = 'venta' | 'reserva'
export type EstadoItemOrden = 'pendiente' | 'completo' | 'parcial' | 'faltante'
export type MetodoPago = 'efectivo' | 'tarjeta' | 'qr'

export interface PiezaOrden {
  id: number
  id_pieza: number
  nombre: string
  codigo: string
  cantidad: number
}

export interface ItemOrden {
  id: string
  producto_id: string
  producto_codigo: string
  producto_nombre: string
  producto_almacen: string
  producto_estante: string
  producto_fila: string
  producto_columna: string
  cantidad_pedida: number
  cantidad_recogida?: number
  precio_unitario: number
  precio_escaneo?: number
  subtotal: number
  estado: EstadoItemOrden
  nota?: string
  diferencia_kit?: number
  kit_id?: string
  es_parcial?: boolean
  piezas_orden?: PiezaOrden[]
}

export type TipoDocumento = 'nota_venta' | 'factura'

export interface OrdenVenta {
  id: string
  numero: string
  tipo: TipoOrden
  tipoDocumento?: TipoDocumento   // nota_venta o factura
  facturaNro?: string            // número de factura simulada (ej: 001-001-0001234)
  cliente_id?: string
  cliente_nombre?: string
  cliente_tipo_id?: 'ci' | 'nit' | 'sin_nit'  // tipo de identificación para facturación
  cliente_numero_id?: string      // CI con/sin complemento, o NIT, o 99001
  cliente_nit?: string           // NIT específico para la factura (puede diferir del cliente guardado)
  cajero_id: string
  cajero_nombre: string
  almacenero_id?: string
  almacenero_nombre?: string
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
  caduca_en?: string
}

// ─── Marcas ───────────────────────────────────────────────────────────────────

export interface Marca {
  id: string
  nombre: string
  creado_en: string
}

// ─── Config ────────────────────────────────────────────────────────────────────

export interface DescuentoConfig {
  id: string
  nombre: string
  porcentaje: number
  color: string
  activo: boolean
}

export interface MargenGanancia {
  id: number
  valor: number
  fecha: string
}

export interface ConfigVenta {
  id: number
  modoVenta: 'PrecioImportacion' | 'PrecioDolarDia' | 'Ambos'
}

export interface TipoCambio {
  id: number
  precioDolar: number
  fecha: string
}
