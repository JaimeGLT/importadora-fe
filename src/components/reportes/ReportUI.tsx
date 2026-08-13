import { forwardRef, type ReactNode } from 'react'

// ─── Card ───────────────────────────────────────────────────────────────────
// Mismo lenguaje visual que el Dashboard: blanco, borde cálido, sombra suave.

export const Card = forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>(
  function Card({ children, className = '' }, ref) {
    return (
      <div ref={ref} className={`bg-white rounded-xl border border-[#D0CBC4] shadow-sm ${className}`}>
        {children}
      </div>
    )
  }
)

// ─── KpiCard ────────────────────────────────────────────────────────────────

type KpiTone = 'neutral' | 'brand' | 'gold' | 'green' | 'red'

const TONE_STYLES: Record<KpiTone, { icon: string; iconBg: string; value: string }> = {
  neutral: { icon: 'text-[#7A7571]', iconBg: 'bg-[#F0EFEC]', value: 'text-[#2D2B2A]' },
  brand:   { icon: 'text-[#780e18]', iconBg: 'bg-[#F5F0EB]', value: 'text-[#780e18]' },
  gold:    { icon: 'text-[#7A5200]', iconBg: 'bg-[#F5E0A8]', value: 'text-[#2D2B2A]' },
  green:   { icon: 'text-[#1E5C38]', iconBg: 'bg-[#B8DCCA]', value: 'text-[#2D2B2A]' },
  red:     { icon: 'text-[#8A1E12]', iconBg: 'bg-[#F5C9C0]', value: 'text-[#8A1E12]' },
}

export function KpiCard({
  label, value, sub, icon, tone = 'neutral', badge, onClick,
}: {
  label: string
  value: string
  sub?: string
  icon?: string
  tone?: KpiTone
  badge?: ReactNode
  onClick?: () => void
}) {
  const t = TONE_STYLES[tone]
  return (
    <Card className={`p-5 h-full ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all' : ''}`}>
      {onClick ? (
        <button type="button" onClick={onClick} className="w-full text-left">
          <KpiCardBody icon={icon} tone={t} badge={badge} value={value} label={label} sub={sub} />
        </button>
      ) : (
        <KpiCardBody icon={icon} tone={t} badge={badge} value={value} label={label} sub={sub} />
      )}
    </Card>
  )
}

function KpiCardBody({
  icon, tone, badge, value, label, sub,
}: {
  icon?: string
  tone: { icon: string; iconBg: string; value: string }
  badge?: ReactNode
  value: string
  label: string
  sub?: string
}) {
  return (
    <>
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${tone.iconBg}`}>
            <i className={`ti ${icon} text-[16px] ${tone.icon}`} />
          </div>
        )}
        {badge}
      </div>
      <p className={`text-2xl font-black tabular-nums leading-tight ${tone.value}`}>{value}</p>
      <p className="text-xs text-[#7A7571] font-semibold mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#7A7571] mt-1.5">{sub}</p>}
    </>
  )
}

// ─── SectionTitle ───────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-4 rounded-full bg-[#D4A333]" />
      <h2 className="text-[11px] font-bold text-[#7A7571] uppercase tracking-widest">{children}</h2>
    </div>
  )
}

// ─── ReportHeader ───────────────────────────────────────────────────────────

export function ReportHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <p className="text-[11px] font-bold text-[#7A7571] uppercase tracking-widest mb-1">
          {new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="text-3xl font-black text-[#2D2B2A] tracking-tight">{title}</h1>
        {description && <p className="text-sm text-[#7A7571] mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  )
}

export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#D8D4D0] hover:border-[#780e18] hover:text-[#780e18] text-[#4A4744] text-xs font-bold rounded-xl transition-colors shadow-sm"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
      </svg>
      Exportar PDF
    </button>
  )
}

// ─── DateRangeFilter ────────────────────────────────────────────────────────

export interface RangoFechas {
  desde: string // 'YYYY-MM-DD'
  hasta: string // 'YYYY-MM-DD'
}

const toStr = (d: Date) => d.toISOString().slice(0, 10)

export function rangoHoy(): RangoFechas {
  const hoy = toStr(new Date())
  return { desde: hoy, hasta: hoy }
}

export function rangoUltimosDias(n: number): RangoFechas {
  const hoy = new Date()
  return { desde: toStr(new Date(hoy.getTime() - (n - 1) * 86400000)), hasta: toStr(hoy) }
}

export function rangoEsteMes(): RangoFechas {
  const hoy = new Date()
  return { desde: toStr(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: toStr(hoy) }
}

export function rangoMesAnterior(): RangoFechas {
  const hoy = new Date()
  const primerDiaMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const ultimoDiaMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
  return { desde: toStr(primerDiaMesAnt), hasta: toStr(ultimoDiaMesAnt) }
}

export function rangoEsteAnio(): RangoFechas {
  const hoy = new Date()
  return { desde: toStr(new Date(hoy.getFullYear(), 0, 1)), hasta: toStr(hoy) }
}

const PRESETS: { label: string; get: () => RangoFechas }[] = [
  { label: 'Hoy',            get: rangoHoy },
  { label: '7 días',         get: () => rangoUltimosDias(7) },
  { label: '30 días',        get: () => rangoUltimosDias(30) },
  { label: 'Este mes',       get: rangoEsteMes },
  { label: 'Mes anterior',   get: rangoMesAnterior },
  { label: 'Este año',       get: rangoEsteAnio },
]

export function DateRangeFilter({ value, onChange }: { value: RangoFechas; onChange: (r: RangoFechas) => void }) {
  const activePreset = PRESETS.find(p => {
    const r = p.get()
    return r.desde === value.desde && r.hasta === value.hasta
  })?.label

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6 bg-white rounded-xl border border-[#D0CBC4] shadow-sm p-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.get())}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activePreset === p.label
                ? 'bg-[#780e18] text-white shadow-sm'
                : 'bg-[#F5F0EB] text-[#7A7571] hover:bg-[#EDE4D8] hover:text-[#4A4744]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <label className="flex items-center gap-1.5 text-xs text-[#7A7571] font-semibold">
          Desde
          <input
            type="date"
            value={value.desde}
            max={value.hasta}
            onChange={e => onChange({ ...value, desde: e.target.value })}
            className="px-2.5 py-1.5 bg-[#FBFBFA] border border-[#E8E5E2] rounded-lg text-xs text-[#2D2B2A] focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[#7A7571] font-semibold">
          Hasta
          <input
            type="date"
            value={value.hasta}
            min={value.desde}
            max={toStr(new Date())}
            onChange={e => onChange({ ...value, hasta: e.target.value })}
            className="px-2.5 py-1.5 bg-[#FBFBFA] border border-[#E8E5E2] rounded-lg text-xs text-[#2D2B2A] focus:outline-none focus:border-[#780e18] focus:ring-2 focus:ring-[#780e18]/10"
          />
        </label>
      </div>
    </div>
  )
}
