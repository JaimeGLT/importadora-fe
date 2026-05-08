import type { InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface WarmInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function WarmInput({ label, error, hint, className, readOnly, ...props }: WarmInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-muted leading-none">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full h-[42px] px-3.5 rounded-[10px] border text-[13.5px] text-ink',
          'focus:outline-none focus:border-terra transition-colors duration-150',
          'placeholder:text-muted-2',
          error ? 'border-terra/50 bg-[#FEF0F2]' : 'border-hair bg-cream',
          readOnly && 'opacity-55 cursor-not-allowed bg-cream-2',
          className,
        )}
        readOnly={readOnly}
        {...props}
      />
      {error && <p className="text-[11px] text-terra leading-tight">{error}</p>}
      {hint && !error && <p className="text-[11px] text-muted-2 leading-tight">{hint}</p>}
    </div>
  )
}
