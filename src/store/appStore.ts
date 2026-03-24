import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Producto, Orden, EstadoOrden, FormaPago, TipoDocumento,
  Prestamo, EstadoPrestamo, ItemPrestamo,
  Cliente, CuentaPorCobrar, EstadoCuenta,
  CierreCaja,
  AuditEntry, AuditAction, ConfigSistema, AppUser,
} from '@/types';
import {
  mockProductos, mockProductosReserva, mockOrdenes, mockPrestamos,
  mockClientes, mockCuentas, mockAudit, defaultConfig,
} from '@/mock/data';

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _oid  = 6;
let _pid  = 4;
let _cid  = 6;
let _ccid = 4;
let _ciid = 0;
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

// ─── State shape ─────────────────────────────────────────────────────────────
interface AppState {
  productos: Producto[];
  ordenes: Orden[];
  prestamos: Prestamo[];
  clientes: Cliente[];
  cuentas: CuentaPorCobrar[];
  cierresCaja: CierreCaja[];
  auditLog: AuditEntry[];
  config: ConfigSistema;

  // ── Inventario ──────────────────────────────────────────────────────────────
  addProducto: (p: Omit<Producto, 'id'>) => void;
  updateProducto: (id: string, p: Partial<Omit<Producto, 'id'>>) => void;
  deleteProducto: (id: string) => void;
  adjustStock: (id: string, delta: number, motivo?: string, usuario?: string) => void;

  // ── Ventas ──────────────────────────────────────────────────────────────────
  createOrden: (data: {
    tipo: TipoDocumento;
    cliente_id: string;
    cliente_nombre: string;
    vendedor: string;
    items: Orden['items'];
    subtotal: number;
    total: number;
    forma_pago: FormaPago;
    estado: EstadoOrden;
  }) => Orden;

  // ── Logística ───────────────────────────────────────────────────────────────
  updateOrden: (id: string, patch: Partial<Omit<Orden, 'id'>>) => void;
  cancelOrden: (id: string) => void;
  reportProblem: (id: string, problema: string) => void;

  // ── Préstamos ───────────────────────────────────────────────────────────────
  addPrestamo: (data: Omit<Prestamo, 'id' | 'numero' | 'created_at' | 'total'>) => void;
  updatePrestamo: (id: string, patch: Partial<Omit<Prestamo, 'id'>>) => void;

  // ── Clientes ────────────────────────────────────────────────────────────────
  addCliente: (c: Omit<Cliente, 'id' | 'created_at'>) => void;
  updateCliente: (id: string, c: Partial<Omit<Cliente, 'id'>>) => void;

  // ── Cuentas por cobrar ──────────────────────────────────────────────────────
  updateCuentaPorCobrar: (id: string, patch: Partial<Omit<CuentaPorCobrar, 'id'>>) => void;

  // ── Cierre de caja ──────────────────────────────────────────────────────────
  createCierreCaja: (data: Omit<CierreCaja, 'id' | 'created_at'>) => void;

  // ── Finanzas ────────────────────────────────────────────────────────────────
  applyMassivePriceUpdate: (factor: number, usuario: string) => void;

  // ── Configuración ───────────────────────────────────────────────────────────
  updateConfig: (c: Partial<ConfigSistema>) => void;

  // ── Auditoría ───────────────────────────────────────────────────────────────
  logAudit: (accion: AuditAction, descripcion: string, usuario: string, entidad?: string, entidad_id?: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      productos: [...mockProductos, ...mockProductosReserva],
      ordenes: mockOrdenes,
      prestamos: mockPrestamos,
      clientes: mockClientes,
      cuentas: mockCuentas,
      cierresCaja: [],
      auditLog: mockAudit,
      config: defaultConfig,

      // ── Inventario ────────────────────────────────────────────────────
      addProducto: (p) => {
        const nuevo = { ...p, id: uid() };
        set((s) => ({ productos: [...s.productos, nuevo] }));
        get().logAudit('producto_creado', `Producto creado: ${p.sku} — ${p.nombre}`, 'Sistema', 'Producto', nuevo.id);
      },

      updateProducto: (id, patch) =>
        set((s) => ({ productos: s.productos.map((p) => p.id === id ? { ...p, ...patch } : p) })),

      deleteProducto: (id) => {
        const p = get().productos.find((x) => x.id === id);
        set((s) => ({ productos: s.productos.filter((p) => p.id !== id) }));
        if (p) get().logAudit('producto_eliminado', `Producto eliminado: ${p.sku}`, 'Sistema', 'Producto', id);
      },

      adjustStock: (id, delta, motivo = 'Ajuste manual', usuario = 'Sistema') => {
        const p = get().productos.find((x) => x.id === id);
        set((s) => ({
          productos: s.productos.map((x) =>
            x.id === id ? { ...x, stock: Math.max(0, x.stock + delta) } : x
          ),
        }));
        if (p) get().logAudit('stock_ajuste', `Stock ${p.sku}: ${delta > 0 ? '+' : ''}${delta} — ${motivo}`, usuario, 'Producto', id);
      },

      // ── Ventas ────────────────────────────────────────────────────────
      createOrden: (data) => {
        _oid++;
        const prefix = data.tipo === 'cotizacion' ? 'COT' : 'VTA';
        const num = `${prefix}-${String(_oid).padStart(4, '0')}`;
        const newOrder: Orden = {
          id: uid(), numero: num,
          ...data,
          created_at: now(), updated_at: now(),
        };
        // Descuenta stock para ventas (no cotizaciones)
        if (data.tipo === 'venta') {
          data.items.forEach((item) => {
            const prod = get().productos.find((p) => p.sku === item.sku);
            if (prod) get().adjustStock(prod.id, -item.cantidad, 'Venta', data.vendedor);
          });
          // Crea cuenta por cobrar si es crédito
          if (data.forma_pago === 'credito') {
            _ccid++;
            const cuenta: CuentaPorCobrar = {
              id: uid(), orden_id: newOrder.id, orden_numero: newOrder.numero,
              cliente_id: data.cliente_id, cliente_nombre: data.cliente_nombre,
              monto: data.total, pagado: 0,
              vencimiento: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
              estado: 'pendiente', created_at: now(),
            };
            set((s) => ({ cuentas: [cuenta, ...s.cuentas] }));
            set((s) => ({
              clientes: s.clientes.map((c) =>
                c.id === data.cliente_id ? { ...c, saldo_credito: c.saldo_credito + data.total } : c
              ),
            }));
          }
        }
        set((s) => ({ ordenes: [newOrder, ...s.ordenes] }));
        get().logAudit('orden_creada', `Orden ${newOrder.numero} por S/ ${data.total.toFixed(2)}`, data.vendedor, 'Orden', newOrder.id);
        return newOrder;
      },

      // ── Logística ─────────────────────────────────────────────────────
      updateOrden: (id, patch) => {
        set((s) => ({
          ordenes: s.ordenes.map((o) =>
            o.id === id ? { ...o, ...patch, updated_at: now() } : o
          ),
        }));
      },

      cancelOrden: (id) => {
        const order = get().ordenes.find((o) => o.id === id);
        if (order && ['pendiente', 'en_preparacion'].includes(order.estado)) {
          order.items.forEach((item) => {
            const prod = get().productos.find((p) => p.sku === item.sku);
            if (prod) get().adjustStock(prod.id, item.cantidad, 'Cancelación de orden', 'Sistema');
          });
        }
        get().updateOrden(id, { estado: 'cancelado' });
        if (order) get().logAudit('orden_cancelada', `Orden ${order.numero} cancelada`, 'Sistema', 'Orden', id);
      },

      reportProblem: (id, problema) =>
        set((s) => ({
          ordenes: s.ordenes.map((o) => o.id === id ? { ...o, problema } : o),
        })),

      // ── Préstamos ─────────────────────────────────────────────────────
      addPrestamo: (data) => {
        const total = data.items.reduce((a, i) => a + i.cantidad * i.precio_unitario, 0);
        data.items.forEach((item) => {
          const prod = get().productos.find((p) => p.sku === item.sku);
          if (prod) get().adjustStock(prod.id, -item.cantidad, 'Préstamo interno', 'Sistema');
        });
        _pid++;
        const nuevo: Prestamo = {
          id: uid(), numero: `PREST-${String(_pid).padStart(3, '0')}`,
          ...data, total, created_at: now(),
        };
        set((s) => ({ prestamos: [nuevo, ...s.prestamos] }));
        get().logAudit('prestamo_creado', `Préstamo ${nuevo.numero} para ${data.persona}`, 'Sistema', 'Prestamo', nuevo.id);
      },

      updatePrestamo: (id, patch) =>
        set((s) => ({
          prestamos: s.prestamos.map((p) => p.id === id ? { ...p, ...patch } : p),
        })),

      // ── Clientes ──────────────────────────────────────────────────────
      addCliente: (c) => {
        _cid++;
        const nuevo: Cliente = { ...c, id: uid(), saldo_credito: c.saldo_credito ?? 0, created_at: now() };
        set((s) => ({ clientes: [...s.clientes, nuevo] }));
      },

      updateCliente: (id, c) =>
        set((s) => ({ clientes: s.clientes.map((x) => x.id === id ? { ...x, ...c } : x) })),

      // ── Cuentas por cobrar ─────────────────────────────────────────────
      updateCuentaPorCobrar: (id, patch) =>
        set((s) => ({
          cuentas: s.cuentas.map((c) => c.id === id ? { ...c, ...patch } : c),
        })),

      // ── Cierre de caja ─────────────────────────────────────────────────
      createCierreCaja: (data) => {
        _ciid++;
        const nuevo: CierreCaja = { id: uid(), ...data, created_at: now() };
        set((s) => ({ cierresCaja: [nuevo, ...s.cierresCaja] }));
      },

      // ── Finanzas ──────────────────────────────────────────────────────
      applyMassivePriceUpdate: (factor, usuario) => {
        set((s) => ({
          productos: s.productos.map((p) => ({
            ...p, precio_venta: Math.round(p.precio_venta * factor * 100) / 100,
          })),
        }));
        get().logAudit('precio_cambio', `Actualización masiva ×${factor.toFixed(4)}`, usuario);
      },

      // ── Configuración ─────────────────────────────────────────────────
      updateConfig: (c) =>
        set((s) => ({ config: { ...s.config, ...c } })),

      // ── Auditoría ─────────────────────────────────────────────────────
      logAudit: (accion, descripcion, usuario, entidad?, entidad_id?) => {
        const entry: AuditEntry = { id: uid(), accion, descripcion, usuario, entidad, entidad_id, timestamp: now() };
        set((s) => ({ auditLog: [entry, ...s.auditLog].slice(0, 500) }));
      },
    }),
    { name: 'ap-data' }
  )
);
