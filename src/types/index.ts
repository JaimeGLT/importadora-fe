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
  historial_precios: HistorialPrecio[]
  ubicacion: string               // default "Almacén Central"
  estado: EstadoProducto
  proveedor_id: string
  creado_en: string
  actualizado_en: string
}

export interface Proveedor {
  id: string
  nombre: string
  pais: string
  contacto: string
  email: string
  tiempo_reposicion_dias?: number
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
