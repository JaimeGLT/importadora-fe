import { useState } from 'react';
import { Settings, Users, Building2, Tag, Shield, Plus, Edit2, Trash2, Eye, EyeOff, Save } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { Modal, ConfirmDialog, DataTable, EmptyState } from '@/components/ui';
import type { AppUser, UserRole } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const ROLE_LABELS: Record<UserRole, string> = {
  administrador: 'Administrador',
  vendedor: 'Vendedor',
  almacenero: 'Almacenero',
  reservero: 'Reservero',
};

export function ConfiguracionPage() {
  const { auditLog, config, updateConfig } = useAppStore();
  const { users, addUser, updateUser } = useAuthStore();
  const [tab, setTab] = useState<'empresa' | 'usuarios' | 'parametros' | 'auditoria'>('empresa');
  const [userModal, setUserModal] = useState<'nuevo' | 'editar' | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Administración del sistema y parámetros generales</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['empresa', 'Empresa', Building2],
          ['usuarios', 'Usuarios', Users],
          ['parametros', 'Parámetros', Settings],
          ['auditoria', 'Auditoría', Shield],
        ] as const).map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={clsx('btn btn-sm gap-1.5', tab === k ? 'btn-primary' : 'btn-secondary')}>
            <Icon size={14} />{l}
          </button>
        ))}
      </div>

      {tab === 'empresa' && (
        <EmpresaTab config={config} onSave={(c) => updateConfig({ empresa: c })} />
      )}

      {tab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setSelectedUser(null); setUserModal('nuevo'); }} className="btn btn-primary btn-sm">
              <Plus size={15} /> Nuevo usuario
            </button>
          </div>
          <div className="card">
            <DataTable
              columns={[
                { label: 'Usuario' }, { label: 'Nombre' }, { label: 'Rol' },
                { label: 'Email' }, { label: 'Estado' }, { label: '', align: 'right' },
              ]}
              empty={users.length === 0 ? <EmptyState icon={<Users size={24} />} title="Sin usuarios" /> : undefined}
            >
              {users.map((u) => (
                <tr key={u.id} className="table-tr">
                  <td className="table-td font-mono-data text-sm font-semibold text-blue-600">{u.username}</td>
                  <td className="table-td text-sm text-slate-800">{u.name}</td>
                  <td className="table-td"><RoleBadge role={u.role} /></td>
                  <td className="table-td text-sm text-slate-500">{u.email ?? '—'}</td>
                  <td className="table-td">
                    <span className={u.activo ? 'badge-green' : 'badge-red'}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="table-td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setSelectedUser(u); setUserModal('editar'); }}
                        className="btn-icon btn-ghost text-slate-400 hover:text-blue-600" title="Editar">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(u)}
                        className="btn-icon btn-ghost text-slate-400 hover:text-red-600" title="Desactivar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>

          {(userModal === 'nuevo' || userModal === 'editar') && (
            <UsuarioModal
              user={userModal === 'editar' ? selectedUser : null}
              onClose={() => setUserModal(null)}
              onSave={(data) => {
                if (userModal === 'editar' && selectedUser) updateUser(selectedUser.id, data);
                else addUser(data);
                setUserModal(null);
              }}
            />
          )}

          {confirmDelete && (
            <ConfirmDialog
              title="Desactivar usuario"
              message={`¿Desactivar al usuario "${confirmDelete.username}"? No podrá iniciar sesión.`}
              danger
              onConfirm={() => { updateUser(confirmDelete.id, { activo: false }); setConfirmDelete(null); }}
              onCancel={() => setConfirmDelete(null)}
            />
          )}
        </div>
      )}

      {tab === 'parametros' && (
        <ParametrosTab config={config} onSave={(c) => updateConfig(c)} />
      )}

      {tab === 'auditoria' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Log de auditoría</h3>
            <span className="badge-slate">{auditLog.length} registros</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto scrollbar-none">
            {auditLog.length === 0 ? (
              <EmptyState icon={<Shield size={24} />} title="Sin registros" description="No hay acciones registradas aún." />
            ) : [...auditLog].reverse().map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 px-5 py-3 hover:bg-slate-50">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{entry.descripcion}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-semibold text-slate-500">{entry.usuario}</span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="text-[11px] font-mono-data text-slate-400">{entry.accion}</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono-data text-slate-400 shrink-0">
                  {format(new Date(entry.timestamp), 'dd MMM HH:mm', { locale: es })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmpresaTab({ config, onSave }: {
  config: ReturnType<typeof useAppStore.getState>['config'];
  onSave: (empresa: ReturnType<typeof useAppStore.getState>['config']['empresa']) => void;
}) {
  const [form, setForm] = useState({ ...config.empresa });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="card p-6 max-w-xl">
      <h3 className="card-title mb-5">Datos de la empresa</h3>
      <div className="space-y-4">
        <div><label className="field-label">Nombre de la empresa</label>
          <input className="field-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="field-label">NIT / RUC</label>
            <input className="field-input" value={form.nit ?? ''} onChange={(e) => set('nit', e.target.value)} /></div>
          <div><label className="field-label">Teléfono</label>
            <input className="field-input" value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} /></div>
        </div>
        <div><label className="field-label">Dirección</label>
          <input className="field-input" value={form.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} /></div>
        <div><label className="field-label">Email</label>
          <input type="email" className="field-input" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
        <button onClick={() => onSave(form)} className="btn btn-primary">
          <Save size={15} /> Guardar cambios
        </button>
      </div>
    </div>
  );
}

function ParametrosTab({ config, onSave }: {
  config: ReturnType<typeof useAppStore.getState>['config'];
  onSave: (partial: Partial<ReturnType<typeof useAppStore.getState>['config']>) => void;
}) {
  const [tipoCambio, setTipoCambio] = useState(config.tipo_cambio);
  const [margen, setMargen] = useState(config.margen_default);
  const [stockMin, setStockMin] = useState(config.stock_minimo_default);
  const [nuevaCat, setNuevaCat] = useState('');
  const [categorias, setCategorias] = useState([...config.categorias]);

  function addCat() {
    const c = nuevaCat.trim();
    if (c && !categorias.includes(c)) { setCategorias((cs) => [...cs, c]); setNuevaCat(''); }
  }

  function removeCat(c: string) {
    setCategorias((cs) => cs.filter((x) => x !== c));
  }

  function handleSave() {
    onSave({ tipo_cambio: tipoCambio, margen_default: margen, stock_minimo_default: stockMin, categorias });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <div className="card p-5 space-y-4">
        <h3 className="card-title">Parámetros generales</h3>
        <div><label className="field-label">Tipo de cambio USD → PEN</label>
          <input type="number" min="1" step="0.01" className="field-input" value={tipoCambio}
            onChange={(e) => setTipoCambio(Number(e.target.value))} /></div>
        <div><label className="field-label">Margen de ganancia por defecto (%)</label>
          <input type="number" min="0" step="1" className="field-input" value={margen}
            onChange={(e) => setMargen(Number(e.target.value))} /></div>
        <div><label className="field-label">Stock mínimo por defecto</label>
          <input type="number" min="1" className="field-input" value={stockMin}
            onChange={(e) => setStockMin(Number(e.target.value))} /></div>
        <button onClick={handleSave} className="btn btn-primary">
          <Save size={15} /> Guardar parámetros
        </button>
      </div>

      <div className="card p-5">
        <h3 className="card-title mb-4">Categorías de productos</h3>
        <div className="flex gap-2 mb-3">
          <input className="field-input flex-1" placeholder="Nueva categoría..." value={nuevaCat}
            onChange={(e) => setNuevaCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCat())} />
          <button onClick={addCat} className="btn btn-primary btn-sm"><Plus size={14} /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
              <Tag size={11} />
              {c}
              <button onClick={() => removeCat(c)} className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
            </span>
          ))}
        </div>
        <button onClick={handleSave} className="btn btn-secondary mt-4 w-full">
          <Save size={14} /> Guardar categorías
        </button>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, string> = {
    administrador: 'badge-red', vendedor: 'badge-blue', almacenero: 'badge-green', reservero: 'badge-purple',
  };
  return <span className={map[role]}>{ROLE_LABELS[role]}</span>;
}

function UsuarioModal({ user, onClose, onSave }: {
  user: AppUser | null;
  onClose: () => void;
  onSave: (data: Omit<AppUser, 'id'>) => void;
}) {
  const [form, setForm] = useState({
    username: user?.username ?? '', name: user?.name ?? '', email: user?.email ?? '',
    password: user?.password ?? '', role: user?.role ?? ('vendedor' as UserRole), activo: user?.activo ?? true,
  });
  const [showPass, setShowPass] = useState(false);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ username: form.username, name: form.name, email: form.email || undefined, password: form.password, role: form.role, activo: form.activo });
  }

  return (
    <Modal title={user ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="field-label">Nombre completo *</label>
          <input className="field-input" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
        <div><label className="field-label">Usuario *</label>
          <input className="field-input" value={form.username} onChange={(e) => set('username', e.target.value)} required /></div>
        <div><label className="field-label">Email</label>
          <input type="email" className="field-input" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
        <div>
          <label className="field-label">Contraseña *</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} className="field-input pr-10" value={form.password}
              onChange={(e) => set('password', e.target.value)} required />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div><label className="field-label">Rol</label>
          <select className="field-select" value={form.role} onChange={(e) => set('role', e.target.value as UserRole)}>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600" />
          <span className="text-sm text-slate-700">Usuario activo</span>
        </label>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button type="submit" className="btn btn-primary flex-1">{user ? 'Guardar' : 'Crear usuario'}</button>
        </div>
      </form>
    </Modal>
  );
}
