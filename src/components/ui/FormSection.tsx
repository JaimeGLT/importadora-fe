import type { ReactNode } from 'react'
import { clsx } from 'clsx'

interface FormSectionProps {
  icon: ReactNode
  title: string
  description?: string
  extra?: ReactNode
  children: ReactNode
  collapsible?: boolean
  open?: boolean
  onToggle?: () => void
}

export function FormSection({ icon, title, description, extra, children, collapsible, open, onToggle }: FormSectionProps) {
  const isOpen = !collapsible || open
  return (
    <section className="rounded-[14px] border border-hair overflow-hidden">
      <div
        className={clsx(
          'flex items-center gap-3 px-5 py-3.5 border-b border-hair',
          'bg-gradient-to-b from-cream-2/90 to-cream/50',
          collapsible && 'cursor-pointer select-none hover:bg-cream-2 transition-colors',
          collapsible && !isOpen && 'border-b-0',
        )}
        onClick={collapsible ? onToggle : undefined}
      >
        <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[8px] bg-white border border-hair text-ink-2 shadow-sm flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-ink-2">{title}</p>
          {description && <p className="text-[11px] text-muted-2 leading-tight">{description}</p>}
        </div>
        {extra && <div className="flex-shrink-0">{extra}</div>}
        {collapsible && (
          <svg
            className={clsx('h-4 w-4 text-muted-2 transition-transform flex-shrink-0', isOpen && 'rotate-90')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      {isOpen && <div className="p-5 bg-white">{children}</div>}
    </section>
  )
}
