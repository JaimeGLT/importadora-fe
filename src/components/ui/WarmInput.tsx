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
    'w-full px-3.5 rounded-[10px] border text-[13.5px] text-ink',
    'focus:outline-none focus:border-terra transition-colors duration-150',
    'placeholder:text-muted-2',
    error ? 'border-terra/50 bg-[#FEF0F2]' : 'border-hair bg-cream',
    readOnly && 'opacity-55 cursor-not-allowed bg-cream-2',
    className,
  )

export function WarmInput({ label, error, hint, multiline, rows, className, ...props }: WarmInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-muted leading-none">
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
      {error && <p className="text-[11px] text-terra leading-tight">{error}</p>}
      {hint && !error && <p className="text-[11px] text-muted-2 leading-tight">{hint}</p>}
    </div>
  )
}
