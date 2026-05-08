import { useEffect, type ReactNode } from 'react'

interface DrawerWrapperProps {
  open: boolean
  onClose: () => void
  subtitle: string
  title: string
  sku?: string
  children: ReactNode
  footer: ReactNode
}

export function DrawerWrapper({ open, onClose, subtitle, title, sku, children, footer }: DrawerWrapperProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-50 transition-opacity duration-200"
        style={{
          background: 'rgba(36,30,24,0.35)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[520px] border-l border-hair z-[60] flex flex-col"
        style={{
          background: '#FDFCFA',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.2, 1)',
          boxShadow: '-24px 0 40px -20px rgba(36,30,24,0.2)',
        }}
      >
        {/* Head */}
        <div
          className="px-5 sm:px-8 pt-7 pb-[22px] border-b border-hair flex items-start justify-between gap-3 shrink-0"
          style={{ background: 'linear-gradient(180deg, #F4EFE6 0%, #FDFCFA 100%)' }}
        >
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted font-semibold mb-1.5">{subtitle}</div>
            <h2 className="font-serif text-[30px] sm:text-[36px] leading-[1.05] tracking-[-0.02em] m-0 mb-1 text-ink">{title}</h2>
            {sku && (
              <div className="font-mono text-[13px] font-bold tracking-[0.06em] text-ink">{sku}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-muted hover:text-ink hover:bg-cream-2 transition-colors shrink-0 mt-1"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
          {children}
        </div>
        {/* Footer */}
        <div
          className="px-5 sm:px-8 py-[18px] border-t border-hair flex justify-end gap-2.5 shrink-0"
          style={{ background: '#F4EFE6' }}
        >
          {footer}
        </div>
      </aside>
    </>
  )
}
