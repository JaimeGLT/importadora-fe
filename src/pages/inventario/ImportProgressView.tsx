import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'

// ─── Hook: animated counter with cubic ease-out ──────────────────────────────
// Interpola el valor mostrado hacia `target` con requestAnimationFrame.
// Sirve para que el contador "fluya" suavemente entre actualizaciones reales
// (que llegan en saltos de 100 al importar por lotes), dando sensación de pulse.

function useAnimatedCounter(target: number, duration = 500): number {
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)
  const fromRef = useRef(target)

  useEffect(() => {
    // Nada que animar si el destino ya coincide con el valor actual
    if (target === valueRef.current) return

    // Cancelar cualquier animación en curso antes de empezar una nueva
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    fromRef.current = valueRef.current
    startTimeRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(1, elapsed / duration)
      // Cubic ease-out: 1 - (1-t)^3  → arranca rápido, desacelera al final
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = Math.round(fromRef.current + (target - fromRef.current) * eased)
      valueRef.current = next
      setValue(next)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

// ─── Componente ──────────────────────────────────────────────────────────────

interface ImportProgressViewProps {
  /** Productos ya enviados al backend (valor real, viene del padre). */
  current: number
  /** Total de productos a importar. */
  total: number
}

export function ImportProgressView({ current, total }: ImportProgressViewProps) {
  const animatedCurrent = useAnimatedCounter(current, 1500)
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
  const remaining = Math.max(0, total - current)
  const fmt = (n: number) => n.toLocaleString('es-BO')

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 sm:py-10">
      {/* Shimmer keyframe — defínelo acá para que el efecto de "ola" se mueva
          sobre el fill de la barra y dé sensación de actividad continua. */}
      <style>{`
        @keyframes shimmer-slide {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
      `}</style>

      {/* Pulse icon with glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-brand-500 opacity-25 blur-xl animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shadow-lg">
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h3
        className="text-xl font-semibold text-steel-900 mb-1"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Importando productos…
      </h3>
      <p className="text-sm text-steel-500 mb-8 text-center max-w-sm">
        Por favor no cierres esta ventana. Esto puede tardar unos minutos.
      </p>

      {/* Counter */}
      <div className="flex items-baseline gap-2 mb-1">
        <span
          className="text-5xl font-semibold text-steel-900 tabular-nums tracking-tight"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {fmt(animatedCurrent)}
        </span>
        <span className="text-2xl text-steel-300 font-normal px-0.5">/</span>
        <span
          className="text-2xl text-steel-400 font-normal tabular-nums"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {fmt(total)}
        </span>
      </div>

      {/* Subtitle + percentage */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-steel-500">productos importados</span>
        <span
          className={clsx(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
            pct >= 100
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-brand-50 text-brand-700',
          )}
        >
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="w-full h-2.5 bg-steel-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full relative overflow-hidden transition-all duration-[1500ms] ease-out"
            style={{ width: `${pct}%` }}
          >
            {/* Shimmer overlay: una ola clara que viaja de izquierda a derecha
                sobre el fill, simulando que algo "empuja" la barra hacia adelante. */}
            <div
              className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-white/45 to-transparent pointer-events-none"
              style={{ animation: 'shimmer-slide 1.4s linear infinite' }}
            />
          </div>
        </div>

        {/* Remaining hint */}
        {remaining > 0 && pct < 100 && (
          <p className="text-[11px] text-steel-400 text-center mt-2.5 tabular-nums">
            Faltan {fmt(remaining)} producto{remaining !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
