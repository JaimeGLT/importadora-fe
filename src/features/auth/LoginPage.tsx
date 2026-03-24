import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cog, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore, roleHome } from '@/store/authStore';

const demos = [
  { role: 'Administrador', user: 'admin',     pass: 'admin123',    color: 'bg-blue-600' },
  { role: 'Vendedor',      user: 'vendedor1', pass: 'vendedor123', color: 'bg-emerald-600' },
  { role: 'Almacenero',    user: 'almacen1',  pass: 'almacen123',  color: 'bg-amber-600' },
  { role: 'Reservero',     user: 'reserva1',  pass: 'reserva123',  color: 'bg-purple-600' },
];

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);

  const { login, loginError, clearError, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) navigate(roleHome[user.role], { replace: true });
  }, [isAuthenticated, user, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    login(username.trim(), password);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left — Brand panel */}
      <div className="hidden lg:flex flex-col w-[460px] shrink-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 relative overflow-hidden">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Cog size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">AutoPartes Pro</p>
            <p className="text-blue-400 text-xs mt-0.5 tracking-wider">SISTEMA DE GESTIÓN</p>
          </div>
        </div>

        <div className="relative flex-1 flex flex-col justify-center">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Gestión integral<br />
            <span className="text-blue-400">para tu importadora</span>
          </h2>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed max-w-xs">
            9 módulos integrados para cubrir el ciclo completo de operaciones, desde la recepción de mercadería hasta la entrega al cliente.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Despacho en menos de 10 minutos',
              'Control de stock en tiempo real',
              'Guía de picking con ubicación exacta',
              'Calculadora de costos de importación',
              'Gestión de clientes y créditos',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span className="text-sm text-slate-300">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">v1.0 · AutoPartes Pro © {new Date().getFullYear()}</p>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[380px] animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Cog size={18} className="text-white" />
            </div>
            <p className="text-slate-900 font-bold text-lg">AutoPartes Pro</p>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Bienvenido de nuevo</h1>
            <p className="text-sm text-slate-500 mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Usuario</label>
              <input
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario" className="field-input" autoComplete="username"
                required disabled={loading}
              />
            </div>

            <div>
              <label className="field-label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña" className="field-input pr-10"
                  autoComplete="current-password" required disabled={loading}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm animate-scale-in">
                <AlertCircle size={15} className="shrink-0" />
                {loginError}
              </div>
            )}

            <button type="submit" disabled={loading || !username || !password}
              className="btn btn-primary btn-lg w-full mt-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verificando...</>
                : <><LogIn size={16} />Ingresar al sistema</>}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8 p-4 rounded-xl bg-white border border-slate-200 shadow-card">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Cuentas de demostración
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demos.map(({ role, user: u, pass, color }) => (
                <button key={role} onClick={() => { setUsername(u); setPassword(pass); clearError(); }}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-150 group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx('w-2 h-2 rounded-full', color)} />
                    <span className="text-xs font-semibold text-slate-700">{role}</span>
                  </div>
                  <p className="text-[11px] font-mono-data text-slate-400">{u} / {pass}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import clsx from 'clsx';
