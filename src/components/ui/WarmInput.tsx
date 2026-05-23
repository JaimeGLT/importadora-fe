import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type BaseProps = {
  label?: string
  error?: string
  hint?: string
  multiline?: boolean
  rows?: number
}

type WarmInputProps =
  | (BaseProps & { multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
  | (BaseProps & { multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>)

const sharedClass = (error?: string, readOnly?: boolean, className?: string) =>
  clsx(
    'w-full px-3.5 rounded-xl border text-[13.5px] text-[#1e1b2e]',
    'focus:outline-none focus:border-[#1d4ed8] transition-colors duration-150',
    'placeholder:text-[#9996b0]',
    error
      ? 'border-[#dc2626]/40 bg-[#fee2e2]/20'
      : 'border-[#e2e8f0] bg-white',
    readOnly && 'opacity-55 cursor-not-allowed bg-[#f1f5f9]',
    className,
  )

export function WarmInput({ label, error, hint, multiline, rows, className, ...props }: WarmInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[10.5px] uppercase tracking-[0.1em] font-bold text-[#9996b0] leading-none">
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          rows={rows ?? 3}
          className={clsx(sharedClass(error, (props as TextareaHTMLAttributes<HTMLTextAreaElement>).readOnly as boolean | undefined, className), 'py-2.5 resize-none')}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={clsx(sharedClass(error, (props as InputHTMLAttributes<HTMLInputElement>).readOnly as boolean | undefined, className), 'h-[42px]')}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <p className="text-[11px] text-[#dc2626] leading-tight">{error}</p>}
      {hint && !error && <p className="text-[11px] text-[#9996b0] leading-tight">{hint}</p>}
    </div>
  )
}
