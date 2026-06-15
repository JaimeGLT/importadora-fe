// ─── Overlay ─────────────────────────────────────────────────────────────────
// Envoltorio fullscreen con backdrop. A diferencia del flujo de Inventario
// (donde el progreso va DENTRO del modal del wizard), aquí se muestra como
// overlay encima de la página porque la importación de Importaciones se hace
// en lotes de 100 y el modal del formulario ya se cerró.
//
// Diseño minimalista: icono animado + mensaje + contador discreto en el
// footer. La barra de progreso se omite a propósito: el contador sube de
// 100 en 100 (gracias al batching del backend) y el usuario lo ve crecer,
// sin la barra tradicional que daría una falsa sensación de "fill suave".

interface ImportProgressOverlayProps {
  /** Productos ya enviados al backend (post-POST del lote). 0 al arrancar. */
  current: number
  /** Total de productos a importar. */
  total: number
}

export function ImportProgressOverlay({ current, total }: ImportProgressOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-[#2D2B2A]/40 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <style>{`
          @keyframes importPulse {
            0%, 100% { transform: scale(1);   opacity: 1;   }
            50%      { transform: scale(1.08); opacity: 0.85; }
          }
          @keyframes importSpin {
            to { transform: rotate(360deg); }
          }
          @keyframes importOrbit {
            0%   { transform: translate(0, 0)    scale(1);   opacity: 0.6; }
            50%  { transform: translate(6px, -6px) scale(1.4); opacity: 1;   }
            100% { transform: translate(0, 0)    scale(1);   opacity: 0.6; }
          }
        `}</style>

        <div className="flex flex-col items-center justify-center py-10 px-6">
          {/* ── Icono animado ── */}
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            {/* Halo difuminado que pulsa */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(212,163,51,0.35) 0%, rgba(212,163,51,0) 70%)',
                animation: 'importPulse 2s ease-in-out infinite',
              }}
            />
            {/* Círculo principal con gradiente de marca */}
            <div
              className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #780e18 0%, #D4A333 100%)' }}
            >
              {/* Spinner (anillo) */}
              <div
                className="absolute inset-1 rounded-full border-2 border-transparent border-t-white/80 border-r-white/50"
                style={{ animation: 'importSpin 1s linear infinite' }}
              />
              {/* Ícono de caja/importación */}
              <i className="ti ti-package-import text-white text-2xl relative z-10" />
            </div>
            {/* 3 puntitos orbitando */}
            {[0, 120, 240].map((deg) => (
              <div
                key={deg}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#D4A333]"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${deg}deg) translate(34px) rotate(-${deg}deg)`,
                  animation: `importOrbit 2.4s ease-in-out infinite`,
                  animationDelay: `${deg / 240}s`,
                }}
              />
            ))}
          </div>

          {/* ── Mensaje principal ── */}
          <h3
            className="text-[17px] font-semibold text-[#2D2B2A] mb-1 tracking-[-0.01em]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Esto está cargando
          </h3>
          <p className="text-[13px] text-[#7A7571] text-center max-w-[280px] leading-snug">
            Estamos registrando {total.toLocaleString('es-BO')} producto{total !== 1 ? 's' : ''} en la base de datos.
            No cierres esta ventana.
          </p>

          {/* ── Línea inferior sutil: hint + contador en vivo ── */}
          <div className="mt-7 pt-5 border-t border-[#EDE8E3] w-full flex items-center justify-between text-[11px] text-[#7A7571]">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#3F7A52] opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#3F7A52]" />
              </span>
              Conectado al servidor
            </span>
            <span className="tabular-nums font-mono text-[10.5px] text-[#7A7571]">
              {current.toLocaleString('es-BO')} / {total.toLocaleString('es-BO')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
